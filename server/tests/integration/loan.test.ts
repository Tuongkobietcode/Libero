import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Types } from 'mongoose';
import path from 'node:path';
import request from 'supertest';

import { addDays, startOfUtcDay } from '../../src/common/utils/dateHelpers';
import { ERR } from '../../src/common/errors/errorCodes';
import {
  CopyStatus,
  LoanStatus,
  MemberStatus,
  ReservationStatus,
  Role,
} from '../../src/common/types/enums';

jest.setTimeout(30_000);

class FakeRedisStore {
  private readonly values = new Map<string, string>();
  private readonly expirations = new Map<string, number>();
  private readonly scripts = new Map<string, 'increment' | 'get'>();

  private getNow(): number {
    return Date.now();
  }

  private isExpired(key: string): boolean {
    const expiresAt = this.expirations.get(key);

    if (!expiresAt) {
      return false;
    }

    if (expiresAt > this.getNow()) {
      return false;
    }

    this.values.delete(key);
    this.expirations.delete(key);
    return true;
  }

  private getPttl(key: string): number {
    if (!this.values.has(key) || this.isExpired(key)) {
      return -2;
    }

    const expiresAt = this.expirations.get(key);

    if (!expiresAt) {
      return -1;
    }

    return Math.max(0, expiresAt - this.getNow());
  }

  async incr(key: string): Promise<number> {
    this.isExpired(key);
    const current = Number(this.values.get(key) ?? '0');
    const next = current + 1;
    this.values.set(key, next.toString());
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.values.has(key) || this.isExpired(key)) {
      return 0;
    }

    this.expirations.set(key, this.getNow() + seconds * 1000);
    return 1;
  }

  async del(key: string): Promise<number> {
    const existed = this.values.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) {
      return null;
    }

    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<'OK'> {
    this.values.set(key, value);

    if (mode === 'EX' && typeof ttlSeconds === 'number') {
      this.expirations.set(key, this.getNow() + ttlSeconds * 1000);
    } else {
      this.expirations.delete(key);
    }

    return 'OK';
  }

  async call(command: string, ...args: string[]): Promise<unknown> {
    const normalizedCommand = command.toUpperCase();

    if (normalizedCommand === 'SCRIPT' && args[0]?.toUpperCase() === 'LOAD') {
      const script = args[1] ?? '';
      const sha = script.includes('INCR') ? 'increment-sha' : 'get-sha';
      this.scripts.set(sha, script.includes('INCR') ? 'increment' : 'get');
      return sha;
    }

    if (normalizedCommand === 'EVALSHA') {
      const scriptType = this.scripts.get(args[0] ?? '');
      const key = args[2] ?? '';

      if (scriptType === 'increment') {
        const windowMs = Number(args[4] ?? '0');
        let timeToExpire = this.getPttl(key);

        if (timeToExpire <= 0) {
          this.values.set(key, '1');
          this.expirations.set(key, this.getNow() + windowMs);
          return [1, windowMs];
        }

        const totalHits = await this.incr(key);
        const resetOnChange = args[3] === '1';

        if (resetOnChange) {
          this.expirations.set(key, this.getNow() + windowMs);
          timeToExpire = windowMs;
        }

        return [totalHits, timeToExpire];
      }

      if (scriptType === 'get') {
        const totalHits = await this.get(key);
        return [totalHits === null ? false : totalHits, this.getPttl(key)];
      }
    }

    if (normalizedCommand === 'DEL') {
      return this.del(args[0] ?? '');
    }

    throw new Error(`Unsupported Redis command: ${command} ${args.join(' ')}`);
  }

  clear(): void {
    this.expirations.clear();
    this.scripts.clear();
    this.values.clear();
  }
}

describe('Loan Phase 5 integration', () => {
  let replSet: MongoMemoryReplSet;
  let mongoose: typeof import('mongoose').default;
  let app: express.Express;
  let MemberModel: typeof import('../../src/models/Member.model').MemberModel;
  let BookModel: typeof import('../../src/models/Book.model').BookModel;
  let BookCopyModel: typeof import('../../src/models/BookCopy.model').BookCopyModel;
  let LoanPolicyModel: typeof import('../../src/models/LoanPolicy.model').LoanPolicyModel;
  let LoanRecordModel: typeof import('../../src/models/LoanRecord.model').LoanRecordModel;
  let FineRateModel: typeof import('../../src/models/FineRate.model').FineRateModel;
  let FineRecordModel: typeof import('../../src/models/FineRecord.model').FineRecordModel;
  let ReservationModel: typeof import('../../src/models/Reservation.model').ReservationModel;
  let authRouter: typeof import('../../src/modules/member/auth.routes').authRouter;
  let loanRouter: typeof import('../../src/modules/loan/loan.routes').loanRouter;
  let errorHandler: typeof import('../../src/common/middleware/errorHandler').errorHandler;
  let requestId: typeof import('../../src/common/middleware/requestId').requestId;
  let requestLogger: typeof import('../../src/common/middleware/requestLogger').requestLogger;
  let redisStore: FakeRedisStore;
  let memberSequence = 1;
  let bookSequence = 1;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-loan-test?replicaSet=rs0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.FINE_BLOCK_THRESHOLD = '50000';
    process.env.HOLD_EXPIRY_HOURS = '48';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../.cache/mongodb-binaries');
    process.env.MONGOMS_PREFER_GLOBAL_PATH = 'false';

    redisStore = new FakeRedisStore();

    jest.resetModules();
    jest.doMock('../../src/config/redis', () => ({
      connectToRedis: jest.fn(),
      closeRedisConnection: jest.fn(),
      getRedisStatus: jest.fn(() => 'connected'),
      getRedisClient: jest.fn(() => redisStore),
    }));

    {
      const mongooseModule = await import('mongoose');
      mongoose = mongooseModule.default ?? (mongooseModule as unknown as typeof import('mongoose').default);
    }

    ({ MemberModel } = await import('../../src/models/Member.model'));
    ({ BookModel } = await import('../../src/models/Book.model'));
    ({ BookCopyModel } = await import('../../src/models/BookCopy.model'));
    ({ LoanPolicyModel } = await import('../../src/models/LoanPolicy.model'));
    ({ LoanRecordModel } = await import('../../src/models/LoanRecord.model'));
    ({ FineRateModel } = await import('../../src/models/FineRate.model'));
    ({ FineRecordModel } = await import('../../src/models/FineRecord.model'));
    ({ ReservationModel } = await import('../../src/models/Reservation.model'));
    ({ authRouter } = await import('../../src/modules/member/auth.routes'));
    ({ loanRouter } = await import('../../src/modules/loan/loan.routes'));
    ({ errorHandler } = await import('../../src/common/middleware/errorHandler'));
    ({ requestId } = await import('../../src/common/middleware/requestId'));
    ({ requestLogger } = await import('../../src/common/middleware/requestLogger'));

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(requestId);
    app.use(requestLogger);
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/loans', loanRouter);
    app.use(errorHandler);

    try {
      await mongoose.connect('mongodb://localhost:27017/libero-loan-test?replicaSet=rs0');
    } catch {
      replSet = await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
        },
      });

      await mongoose.connect(replSet.getUri('libero-loan-test'));
    }
  });

  afterAll(async () => {
    redisStore.clear();

    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }

    await mongoose.disconnect();

    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    redisStore.clear();
    memberSequence = 1;
    bookSequence = 1;

    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map(async (collection) => collection.deleteMany({})));

    await Promise.all([
      LoanPolicyModel.updateOne(
        { role: Role.Student },
        {
          $set: {
            maxBooks: 3,
            loanDays: 14,
            maxRenewals: 1,
            renewDays: 7,
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
        { upsert: true },
      ),
      LoanPolicyModel.updateOne(
        { role: Role.Lecturer },
        {
          $set: {
            maxBooks: 5,
            loanDays: 30,
            maxRenewals: 2,
            renewDays: 14,
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
        { upsert: true },
      ),
      LoanPolicyModel.updateOne(
        { role: Role.Librarian },
        {
          $set: {
            maxBooks: 10,
            loanDays: 60,
            maxRenewals: 0,
            renewDays: 14,
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
        { upsert: true },
      ),
      FineRateModel.updateOne(
        { appliesTo: 'all', effectiveFrom: new Date('2026-01-01T00:00:00.000Z') },
        {
          $set: {
            ratePerDay: 5000,
          },
        },
        { upsert: true },
      ),
    ]);
  });

  async function createMember(params: {
    email: string;
    password: string;
    role: Role;
    status?: MemberStatus;
    isBlocked?: boolean;
  }) {
    const sequence = memberSequence.toString().padStart(5, '0');
    memberSequence += 1;

    return MemberModel.create({
      fullName: `${params.role} User`,
      email: params.email,
      passwordHash: await bcrypt.hash(params.password, 12),
      role: params.role,
      memberCardNo: `MEM-2026-${sequence}`,
      status: params.status ?? MemberStatus.Active,
      isBlocked: params.isBlocked ?? false,
      failedLoginCount: 0,
      lockedUntil: null,
    });
  }

  async function loginAs(email: string, password: string): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  async function createBookFixture(overrides: { bookValue?: number; copyStatus?: CopyStatus } = {}) {
    const sequence = bookSequence.toString().padStart(4, '0');
    bookSequence += 1;

    const book = await BookModel.create({
      isbn: `9781234567${sequence}`,
      title: `Book ${sequence}`,
      authorIds: [],
      categoryIds: [],
      bookValue: overrides.bookValue ?? 100000,
      isDeleted: false,
    });

    const copy = await BookCopyModel.create({
      bookId: book._id,
      barcode: `LIB-BOOK-${sequence}`,
      status: overrides.copyStatus ?? CopyStatus.Available,
      shelfLocation: 'A1',
    });

    return { book, copy };
  }

  async function createLoanRecord(params: {
    memberId: Types.ObjectId;
    copyId: Types.ObjectId;
    bookId: Types.ObjectId;
    dueDate: Date;
    status?: LoanStatus;
    renewCount?: number;
    policyMaxRenewals?: number;
    policyRenewDays?: number;
  }) {
    return LoanRecordModel.create({
      memberId: params.memberId,
      copyId: params.copyId,
      bookId: params.bookId,
      checkoutDate: addDays(params.dueDate, -14),
      dueDate: params.dueDate,
      returnDate: null,
      status: params.status ?? LoanStatus.Active,
      renewCount: params.renewCount ?? 0,
      policyLoanDays: 14,
      policyMaxRenewals: params.policyMaxRenewals ?? 1,
      policyRenewDays: params.policyRenewDays ?? 7,
    });
  }

  it('checks out a book successfully', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const { copy } = await createBookFixture();
    const accessToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post('/api/v1/loans/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        memberId: student.id,
        barcode: copy.barcode,
      })
      .expect(201);

    expect(response.body.data.status).toBe(LoanStatus.Active);
    expect(response.body.data.copy.status).toBe(CopyStatus.Borrowed);

    const storedLoan = await LoanRecordModel.findById(response.body.data._id as string).exec();
    const storedCopy = await BookCopyModel.findById(copy.id).exec();

    expect(storedLoan).toBeTruthy();
    expect(storedLoan?.status).toBe(LoanStatus.Active);
    expect(storedLoan?.dueDate.toISOString()).toBe(addDays(storedLoan?.checkoutDate ?? new Date(), 14).toISOString());
    expect(storedCopy?.status).toBe(CopyStatus.Borrowed);
  });

  it('rejects checkout when the member reached maxBooks', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const accessToken = await loginAs(librarian.email, 'Password1');

    for (let index = 0; index < 3; index += 1) {
      const { book, copy } = await createBookFixture({ copyStatus: CopyStatus.Borrowed });
      await createLoanRecord({
        memberId: student._id,
        copyId: copy._id,
        bookId: book._id,
        dueDate: addDays(new Date(), 7),
      });
    }

    const { copy } = await createBookFixture();

    const response = await request(app)
      .post('/api/v1/loans/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        memberId: student.id,
        barcode: copy.barcode,
      })
      .expect(422);

    expect(response.body.error.code).toBe(ERR.LOAN_MAX_BOOKS);
  });

  it('returns an overdue book by barcode and creates daily fines', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const { book, copy } = await createBookFixture({ copyStatus: CopyStatus.Borrowed });
    const dueDate = startOfUtcDay(addDays(new Date(), -3));
    await createLoanRecord({
      memberId: student._id,
      copyId: copy._id,
      bookId: book._id,
      dueDate,
    });
    const accessToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post('/api/v1/loans/return-by-barcode')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ barcode: copy.barcode })
      .expect(200);

    expect(response.body.data.status).toBe(LoanStatus.Returned);
    expect(response.body.data.copy.status).toBe(CopyStatus.Available);

    const fineRecords = await FineRecordModel.find({ memberId: student._id }).sort({ overdueDate: 1 }).exec();
    const updatedCopy = await BookCopyModel.findById(copy._id).exec();

    expect(fineRecords).toHaveLength(3);
    expect(fineRecords.every((fine) => fine.amount === 5000)).toBe(true);
    expect(updatedCopy?.status).toBe(CopyStatus.Available);
  });

  it('moves the returned copy into reservation hold when a waiting reservation exists', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const borrower = await createMember({
      email: 'borrower@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const reserver = await createMember({
      email: 'reserver@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const { book, copy } = await createBookFixture({ copyStatus: CopyStatus.Borrowed });
    const loan = await createLoanRecord({
      memberId: borrower._id,
      copyId: copy._id,
      bookId: book._id,
      dueDate: addDays(new Date(), 7),
    });

    await ReservationModel.create({
      memberId: reserver._id,
      bookId: book._id,
      queuePosition: 1,
      status: ReservationStatus.Waiting,
    });

    const accessToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post(`/api/v1/loans/${loan.id}/return`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(200);

    expect(response.body.data.copy.status).toBe(CopyStatus.Reserved);

    const reservation = await ReservationModel.findOne({ memberId: reserver._id }).exec();
    const updatedCopy = await BookCopyModel.findById(copy._id).exec();

    expect(reservation?.status).toBe(ReservationStatus.Notified);
    expect(reservation?.holdExpiryAt).toBeTruthy();
    expect(updatedCopy?.status).toBe(CopyStatus.Reserved);
  });

  it('renews a loan successfully for its owner', async () => {
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const { book, copy } = await createBookFixture({ copyStatus: CopyStatus.Borrowed });
    const loan = await createLoanRecord({
      memberId: student._id,
      copyId: copy._id,
      bookId: book._id,
      dueDate: addDays(new Date(), 7),
    });
    const accessToken = await loginAs(student.email, 'Password1');

    const response = await request(app)
      .post(`/api/v1/loans/${loan.id}/renew`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(200);

    expect(response.body.data.renewCount).toBe(1);

    const renewedLoan = await LoanRecordModel.findById(loan._id).exec();
    expect(renewedLoan?.renewCount).toBe(1);
    expect(renewedLoan?.dueDate.toISOString()).toBe(addDays(loan.dueDate, 7).toISOString());
  });

  it('marks a loan as lost and creates a special fine', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const { book, copy } = await createBookFixture({ bookValue: 150000, copyStatus: CopyStatus.Borrowed });
    const loan = await createLoanRecord({
      memberId: student._id,
      copyId: copy._id,
      bookId: book._id,
      dueDate: addDays(new Date(), 7),
    });
    const accessToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post(`/api/v1/loans/${loan.id}/lost`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ notes: 'Lost during inventory' })
      .expect(200);

    expect(response.body.data.status).toBe(LoanStatus.Lost);
    expect(response.body.data.copy.status).toBe(CopyStatus.Lost);

    const updatedLoan = await LoanRecordModel.findById(loan._id).exec();
    const updatedCopy = await BookCopyModel.findById(copy._id).exec();
    const fineRecords = await FineRecordModel.find({ loanId: loan._id }).exec();

    expect(updatedLoan?.status).toBe(LoanStatus.Lost);
    expect(updatedCopy?.status).toBe(CopyStatus.Lost);
    expect(fineRecords).toHaveLength(1);
    expect(fineRecords[0]?.amount).toBe(150000);
  });

  it('allows suspended members to view /loans/me and librarians to query list/detail', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
      status: MemberStatus.Suspended,
    });
    const { book, copy } = await createBookFixture({ copyStatus: CopyStatus.Available });
    const loan = await LoanRecordModel.create({
      memberId: student._id,
      copyId: copy._id,
      bookId: book._id,
      checkoutDate: addDays(new Date(), -20),
      dueDate: addDays(new Date(), -6),
      returnDate: addDays(new Date(), -5),
      status: LoanStatus.Returned,
      renewCount: 0,
      policyLoanDays: 14,
      policyMaxRenewals: 1,
      policyRenewDays: 7,
    });

    const studentAccessToken = await loginAs(student.email, 'Password1');
    const librarianAccessToken = await loginAs(librarian.email, 'Password1');

    const myLoansResponse = await request(app)
      .get('/api/v1/loans/me')
      .set('Authorization', `Bearer ${studentAccessToken}`)
      .expect(200);

    expect(myLoansResponse.body.data.items).toHaveLength(1);
    expect(myLoansResponse.body.data.items[0].member._id).toBe(student.id);

    const listResponse = await request(app)
      .get(`/api/v1/loans?memberId=${student.id}`)
      .set('Authorization', `Bearer ${librarianAccessToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);

    const detailResponse = await request(app)
      .get(`/api/v1/loans/${loan.id}`)
      .set('Authorization', `Bearer ${librarianAccessToken}`)
      .expect(200);

    expect(detailResponse.body.data._id).toBe(loan.id);
    expect(detailResponse.body.data.member._id).toBe(student.id);
  });
});
