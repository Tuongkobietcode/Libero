import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import path from 'node:path';
import request from 'supertest';

import { ERR } from '../../src/common/errors/errorCodes';
import { FineStatus, LoanStatus, MemberStatus, Role } from '../../src/common/types/enums';

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

describe('Fine Phase 7 integration', () => {
  let replSet: MongoMemoryReplSet;
  let mongoose: typeof import('mongoose').default;
  let app: express.Express;
  let MemberModel: typeof import('../../src/models/Member.model').MemberModel;
  let BookModel: typeof import('../../src/models/Book.model').BookModel;
  let BookCopyModel: typeof import('../../src/models/BookCopy.model').BookCopyModel;
  let LoanRecordModel: typeof import('../../src/models/LoanRecord.model').LoanRecordModel;
  let FineRecordModel: typeof import('../../src/models/FineRecord.model').FineRecordModel;
  let FineRateModel: typeof import('../../src/models/FineRate.model').FineRateModel;
  let authRouter: typeof import('../../src/modules/member/auth.routes').authRouter;
  let fineRouter: typeof import('../../src/modules/fine/fine.routes').fineRouter;
  let fineConfigRouter: typeof import('../../src/modules/fine/fine.routes').fineConfigRouter;
  let errorHandler: typeof import('../../src/common/middleware/errorHandler').errorHandler;
  let requestId: typeof import('../../src/common/middleware/requestId').requestId;
  let requestLogger: typeof import('../../src/common/middleware/requestLogger').requestLogger;
  let redisStore: FakeRedisStore;
  let memberSequence = 1;
  let bookSequence = 1;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-fine-test?replicaSet=rs0';
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
    ({ LoanRecordModel } = await import('../../src/models/LoanRecord.model'));
    ({ FineRecordModel } = await import('../../src/models/FineRecord.model'));
    ({ FineRateModel } = await import('../../src/models/FineRate.model'));
    ({ authRouter } = await import('../../src/modules/member/auth.routes'));
    ({ fineRouter, fineConfigRouter } = await import('../../src/modules/fine/fine.routes'));
    ({ errorHandler } = await import('../../src/common/middleware/errorHandler'));
    ({ requestId } = await import('../../src/common/middleware/requestId'));
    ({ requestLogger } = await import('../../src/common/middleware/requestLogger'));

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(requestId);
    app.use(requestLogger);
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/fines', fineRouter);
    app.use('/api/v1/config', fineConfigRouter);
    app.use(errorHandler);

    try {
      await mongoose.connect('mongodb://localhost:27017/libero-fine-test?replicaSet=rs0', {
        serverSelectionTimeoutMS: 1_000,
      });
    } catch {
      await mongoose.disconnect();
      replSet = await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
        },
      });

      await mongoose.connect(replSet.getUri('libero-fine-test'));
    }

    await Promise.all([
      MemberModel.init(),
      BookModel.init(),
      BookCopyModel.init(),
      LoanRecordModel.init(),
      FineRecordModel.init(),
      FineRateModel.init(),
    ]);
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

    await FineRateModel.create({
      ratePerDay: 5000,
      appliesTo: 'all',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    });
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

  async function createBookFixture() {
    const sequence = bookSequence.toString().padStart(4, '0');
    bookSequence += 1;

    const book = await BookModel.create({
      isbn: `9782222222${sequence}`,
      title: `Fine Book ${sequence}`,
      authorIds: [],
      categoryIds: [],
      bookValue: 100000,
      isDeleted: false,
    });

    const copy = await BookCopyModel.create({
      bookId: book._id,
      barcode: `FINE-BOOK-${sequence}`,
      status: 'available',
      shelfLocation: 'A1',
    });

    return { book, copy };
  }

  async function createLoanRecord(memberId: string, bookId: string, copyId: string) {
    return LoanRecordModel.create({
      memberId,
      copyId,
      bookId,
      checkoutDate: new Date('2026-04-01T00:00:00.000Z'),
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
      returnDate: new Date('2026-04-12T00:00:00.000Z'),
      status: LoanStatus.Returned,
      renewCount: 0,
      policyLoanDays: 14,
      policyMaxRenewals: 1,
      policyRenewDays: 7,
    });
  }

  async function createFineRecord(params: {
    memberId: string;
    loanId: string;
    amount: number;
    status?: FineStatus;
    overdueDate?: Date;
    paidAt?: Date | null;
    waivedBy?: string | null;
    note?: string;
  }) {
    return FineRecordModel.create({
      memberId: params.memberId,
      loanId: params.loanId,
      overdueDate: params.overdueDate ?? new Date('2026-04-16T00:00:00.000Z'),
      amount: params.amount,
      status: params.status ?? FineStatus.Unpaid,
      paidAt: params.paidAt ?? null,
      waivedBy: params.waivedBy ?? null,
      note: params.note,
    });
  }

  it('pays selected fines successfully and unblocks the member when unpaid total drops below threshold', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
      isBlocked: true,
    });
    const { book, copy } = await createBookFixture();
    const loan = await createLoanRecord(student.id, book.id, copy.id);
    const fine1 = await createFineRecord({
      memberId: student.id,
      loanId: loan.id,
      amount: 30000,
      overdueDate: new Date('2026-04-16T00:00:00.000Z'),
    });
    const fine2 = await createFineRecord({
      memberId: student.id,
      loanId: loan.id,
      amount: 25000,
      overdueDate: new Date('2026-04-17T00:00:00.000Z'),
    });
    const librarianToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post('/api/v1/fines/pay')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ fineIds: [fine1.id, fine2.id] })
      .expect(200);

    expect(response.body.data.updatedCount).toBe(2);

    const paidFines = await FineRecordModel.find({ memberId: student._id }).sort({ amount: 1 }).exec();
    const updatedStudent = await MemberModel.findById(student._id).exec();

    expect(paidFines.every((fine) => fine.status === FineStatus.Paid)).toBe(true);
    expect(paidFines.every((fine) => fine.paidAt instanceof Date)).toBe(true);
    expect(updatedStudent?.isBlocked).toBe(false);
  });

  it('rejects payFines when a selected fine is already paid', async () => {
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
    const { book, copy } = await createBookFixture();
    const loan = await createLoanRecord(student.id, book.id, copy.id);
    const fine = await createFineRecord({
      memberId: student.id,
      loanId: loan.id,
      amount: 20000,
      status: FineStatus.Paid,
      paidAt: new Date('2026-04-20T00:00:00.000Z'),
    });
    const librarianToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post('/api/v1/fines/pay')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ fineIds: [fine.id] })
      .expect(422);

    expect(response.body.error.code).toBe(ERR.FINE_ALREADY_PAID);
  });

  it('rejects payFines when a selected fine is already waived', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const admin = await createMember({
      email: 'admin@example.com',
      password: 'Password1',
      role: Role.Admin,
    });
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const { book, copy } = await createBookFixture();
    const loan = await createLoanRecord(student.id, book.id, copy.id);
    const fine = await createFineRecord({
      memberId: student.id,
      loanId: loan.id,
      amount: 20000,
      status: FineStatus.Waived,
      waivedBy: admin.id,
      note: 'Approved waiver reason',
    });
    const librarianToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post('/api/v1/fines/pay')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ fineIds: [fine.id] })
      .expect(422);

    expect(response.body.error.code).toBe(ERR.FINE_ALREADY_WAIVED);
  });

  it('rejects waiveFine when the reason is shorter than the rule', async () => {
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
    const { book, copy } = await createBookFixture();
    const loan = await createLoanRecord(student.id, book.id, copy.id);
    const fine = await createFineRecord({ memberId: student.id, loanId: loan.id, amount: 20000 });
    const librarianToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post(`/api/v1/fines/${fine.id}/waive`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ reason: 'short' })
      .expect(400);

    expect(response.body.error.code).toBe(ERR.FINE_WAIVE_NO_REASON);
  });

  it('waives a fine successfully and unblocks the member when unpaid total drops below threshold', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
      isBlocked: true,
    });
    const { book, copy } = await createBookFixture();
    const loan = await createLoanRecord(student.id, book.id, copy.id);
    const fine = await createFineRecord({ memberId: student.id, loanId: loan.id, amount: 60000 });
    const librarianToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .post(`/api/v1/fines/${fine.id}/waive`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ reason: 'Waived because the return desk made an error.' })
      .expect(200);

    expect(response.body.data.status).toBe(FineStatus.Waived);
    expect(response.body.data.note).toContain('return desk');

    const waivedFine = await FineRecordModel.findById(fine._id).exec();
    const updatedStudent = await MemberModel.findById(student._id).exec();

    expect(waivedFine?.status).toBe(FineStatus.Waived);
    expect(waivedFine?.waivedBy?.toString()).toBe(librarian.id);
    expect(updatedStudent?.isBlocked).toBe(false);
  });

  it('returns fine summary and detail only for the current member on GET /fines/me', async () => {
    const student = await createMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const other = await createMember({
      email: 'other@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const { book, copy } = await createBookFixture();
    const otherBook = await createBookFixture();
    const loan1 = await createLoanRecord(student.id, book.id, copy.id);
    const loan2 = await createLoanRecord(other.id, otherBook.book.id, otherBook.copy.id);

    await createFineRecord({
      memberId: student.id,
      loanId: loan1.id,
      amount: 10000,
      status: FineStatus.Unpaid,
      overdueDate: new Date('2026-04-16T00:00:00.000Z'),
    });
    await createFineRecord({
      memberId: student.id,
      loanId: loan1.id,
      amount: 5000,
      status: FineStatus.Paid,
      paidAt: new Date('2026-04-20T00:00:00.000Z'),
      overdueDate: new Date('2026-04-17T00:00:00.000Z'),
    });
    await createFineRecord({ memberId: other.id, loanId: loan2.id, amount: 9000, status: FineStatus.Unpaid });
    const studentToken = await loginAs(student.email, 'Password1');

    const response = await request(app)
      .get('/api/v1/fines/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(response.body.data.summary.unpaidTotal).toBe(10000);
    expect(response.body.data.summary.paidTotal).toBe(5000);
    expect(response.body.data.summary.waivedTotal).toBe(0);
    expect(response.body.data.items).toHaveLength(2);
    expect(
      response.body.data.items.every((item: { member: { _id: string } }) => item.member._id === student.id),
    ).toBe(true);
  });

  it('allows librarian/admin to filter GET /fines by member and status', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const student1 = await createMember({
      email: 'student1@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const student2 = await createMember({
      email: 'student2@example.com',
      password: 'Password1',
      role: Role.Student,
    });
    const book1 = await createBookFixture();
    const book2 = await createBookFixture();
    const loan1 = await createLoanRecord(student1.id, book1.book.id, book1.copy.id);
    const loan2 = await createLoanRecord(student2.id, book2.book.id, book2.copy.id);

    await createFineRecord({ memberId: student1.id, loanId: loan1.id, amount: 10000, status: FineStatus.Unpaid });
    await createFineRecord({ memberId: student2.id, loanId: loan2.id, amount: 12000, status: FineStatus.Paid, paidAt: new Date() });
    const librarianToken = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .get(`/api/v1/fines?memberId=${student1.id}&status=${FineStatus.Unpaid}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].member._id).toBe(student1.id);
    expect(response.body.data.items[0].status).toBe(FineStatus.Unpaid);
  });

  it('lets admin create and list fine rates', async () => {
    const admin = await createMember({
      email: 'admin@example.com',
      password: 'Password1',
      role: Role.Admin,
    });
    const adminToken = await loginAs(admin.email, 'Password1');

    const createResponse = await request(app)
      .post('/api/v1/config/fine-rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ratePerDay: 7000,
        effectiveFrom: '2026-05-01T00:00:00.000Z',
      })
      .expect(201);

    expect(createResponse.body.data.ratePerDay).toBe(7000);

    const listResponse = await request(app)
      .get('/api/v1/config/fine-rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listResponse.body.data).toHaveLength(2);
    expect(listResponse.body.data[0].ratePerDay).toBe(7000);
  });
});
