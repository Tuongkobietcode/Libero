import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import path from 'node:path';
import request from 'supertest';

import { CopyStatus, FineStatus, LoanStatus, MemberStatus, Role } from '../../src/common/types/enums';

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

function binaryParser(
  response: any,
  callback: (error: Error | null, data: any) => void,
): void {
  const chunks: Buffer[] = [];

  response.on('data', (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'binary'));
  });
  response.on('error', (error: Error) => {
    callback(error, Buffer.alloc(0));
  });
  response.on('end', () => {
    callback(null, Buffer.concat(chunks));
  });
}

describe('Report Phase 7 integration', () => {
  let replSet: MongoMemoryReplSet;
  let mongoose: typeof import('mongoose').default;
  let app: express.Express;
  let MemberModel: typeof import('../../src/models/Member.model').MemberModel;
  let BookModel: typeof import('../../src/models/Book.model').BookModel;
  let BookCopyModel: typeof import('../../src/models/BookCopy.model').BookCopyModel;
  let LoanRecordModel: typeof import('../../src/models/LoanRecord.model').LoanRecordModel;
  let FineRecordModel: typeof import('../../src/models/FineRecord.model').FineRecordModel;
  let authRouter: typeof import('../../src/modules/member/auth.routes').authRouter;
  let reportRouter: typeof import('../../src/modules/report/report.routes').reportRouter;
  let errorHandler: typeof import('../../src/common/middleware/errorHandler').errorHandler;
  let requestId: typeof import('../../src/common/middleware/requestId').requestId;
  let requestLogger: typeof import('../../src/common/middleware/requestLogger').requestLogger;
  let redisStore: FakeRedisStore;
  let memberSequence = 1;
  let bookSequence = 1;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-report-test?replicaSet=rs0';
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
    ({ authRouter } = await import('../../src/modules/member/auth.routes'));
    ({ reportRouter } = await import('../../src/modules/report/report.routes'));
    ({ errorHandler } = await import('../../src/common/middleware/errorHandler'));
    ({ requestId } = await import('../../src/common/middleware/requestId'));
    ({ requestLogger } = await import('../../src/common/middleware/requestLogger'));

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(requestId);
    app.use(requestLogger);
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/reports', reportRouter);
    app.use(errorHandler);

    try {
      await mongoose.connect('mongodb://localhost:27017/libero-report-test?replicaSet=rs0');
    } catch {
      replSet = await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
        },
      });

      await mongoose.connect(replSet.getUri('libero-report-test'));
    }

    await Promise.all([
      MemberModel.init(),
      BookModel.init(),
      BookCopyModel.init(),
      LoanRecordModel.init(),
      FineRecordModel.init(),
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

  async function createBookFixture(titlePrefix: string) {
    const sequence = bookSequence.toString().padStart(4, '0');
    bookSequence += 1;

    const book = await BookModel.create({
      isbn: `9783333333${sequence}`,
      title: `${titlePrefix} ${sequence}`,
      authorIds: [],
      categoryIds: [],
      bookValue: 100000,
      isDeleted: false,
    });

    const copy = await BookCopyModel.create({
      bookId: book._id,
      barcode: `REPORT-BOOK-${sequence}`,
      status: CopyStatus.Available,
      shelfLocation: 'A1',
    });

    return { book, copy };
  }

  async function createLoanRecord(params: {
    memberId: string;
    bookId: string;
    copyId: string;
    checkoutDate: Date;
    dueDate: Date;
    status: LoanStatus;
    returnDate?: Date | null;
  }) {
    return LoanRecordModel.create({
      memberId: params.memberId,
      bookId: params.bookId,
      copyId: params.copyId,
      checkoutDate: params.checkoutDate,
      dueDate: params.dueDate,
      returnDate: params.returnDate ?? null,
      status: params.status,
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
    status: FineStatus;
    overdueDate: Date;
  }) {
    return FineRecordModel.create({
      memberId: params.memberId,
      loanId: params.loanId,
      amount: params.amount,
      status: params.status,
      overdueDate: params.overdueDate,
      paidAt: params.status === FineStatus.Paid ? new Date('2026-04-20T00:00:00.000Z') : null,
      waivedBy: null,
    });
  }

  it('returns loan summary buckets grouped by day', async () => {
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
    const book = await createBookFixture('Loan Summary');

    await createLoanRecord({
      memberId: borrower.id,
      bookId: book.book.id,
      copyId: book.copy.id,
      checkoutDate: new Date('2026-04-01T10:00:00.000Z'),
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-08T00:00:00.000Z'),
    });
    await createLoanRecord({
      memberId: borrower.id,
      bookId: book.book.id,
      copyId: book.copy.id,
      checkoutDate: new Date('2026-04-02T10:00:00.000Z'),
      dueDate: new Date('2026-04-11T00:00:00.000Z'),
      status: LoanStatus.Active,
    });
    const token = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .get('/api/v1/reports/loans/summary?from=2026-04-01&to=2026-04-03&groupBy=day')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].period).toBe('2026-04-01');
    expect(response.body.data[0].totalLoans).toBe(1);
  });

  it('returns only OVERDUE loans on GET /reports/overdue', async () => {
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
    const overdueBook = await createBookFixture('Overdue');
    const activeBook = await createBookFixture('Active');

    await createLoanRecord({
      memberId: borrower.id,
      bookId: overdueBook.book.id,
      copyId: overdueBook.copy.id,
      checkoutDate: new Date('2026-03-01T00:00:00.000Z'),
      dueDate: new Date('2026-03-10T00:00:00.000Z'),
      status: LoanStatus.Overdue,
    });
    await createLoanRecord({
      memberId: borrower.id,
      bookId: activeBook.book.id,
      copyId: activeBook.copy.id,
      checkoutDate: new Date('2026-04-01T00:00:00.000Z'),
      dueDate: new Date('2026-04-20T00:00:00.000Z'),
      status: LoanStatus.Active,
    });
    const token = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .get('/api/v1/reports/overdue')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].status).toBe(LoanStatus.Overdue);
    expect(response.body.data.items[0].book.title).toContain('Overdue');
  });

  it('returns popular books sorted by checkout count desc', async () => {
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
    const book1 = await createBookFixture('Popular A');
    const book2 = await createBookFixture('Popular B');

    await createLoanRecord({
      memberId: borrower.id,
      bookId: book1.book.id,
      copyId: book1.copy.id,
      checkoutDate: new Date('2026-04-01T00:00:00.000Z'),
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-08T00:00:00.000Z'),
    });
    await createLoanRecord({
      memberId: borrower.id,
      bookId: book1.book.id,
      copyId: book1.copy.id,
      checkoutDate: new Date('2026-04-02T00:00:00.000Z'),
      dueDate: new Date('2026-04-11T00:00:00.000Z'),
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-09T00:00:00.000Z'),
    });
    await createLoanRecord({
      memberId: borrower.id,
      bookId: book1.book.id,
      copyId: book1.copy.id,
      checkoutDate: new Date('2026-04-03T00:00:00.000Z'),
      dueDate: new Date('2026-04-12T00:00:00.000Z'),
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-10T00:00:00.000Z'),
    });
    await createLoanRecord({
      memberId: borrower.id,
      bookId: book2.book.id,
      copyId: book2.copy.id,
      checkoutDate: new Date('2026-04-04T00:00:00.000Z'),
      dueDate: new Date('2026-04-13T00:00:00.000Z'),
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-11T00:00:00.000Z'),
    });
    const token = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .get('/api/v1/reports/popular-books?limit=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].book.title).toContain('Popular A');
    expect(response.body.data[0].checkoutCount).toBe(3);
    expect(response.body.data[1].checkoutCount).toBe(1);
  });

  it('returns inventory grouped by copy status', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const book1 = await createBookFixture('Inventory');
    const book2 = await createBookFixture('Inventory');

    await BookCopyModel.findByIdAndUpdate(book1.copy._id, { status: CopyStatus.Borrowed }).exec();
    await BookCopyModel.create({
      bookId: book1.book._id,
      barcode: 'REPORT-INV-001',
      status: CopyStatus.Available,
      shelfLocation: 'A1',
    });
    await BookCopyModel.findByIdAndUpdate(book2.copy._id, { status: CopyStatus.Reserved }).exec();
    const token = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .get('/api/v1/reports/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThanOrEqual(3);

    const borrowedRow = response.body.data.find(
      (item: { book: { _id: string }; status: CopyStatus }) =>
        item.book._id === book1.book.id && item.status === CopyStatus.Borrowed,
    );

    expect(borrowedRow?.totalCopies).toBe(1);
  });

  it('returns fine summary, trend, and member debt list', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    const borrower = await createMember({
      email: 'borrower@example.com',
      password: 'Password1',
      role: Role.Student,
      isBlocked: true,
    });
    const book = await createBookFixture('Fine Stats');
    const loan = await createLoanRecord({
      memberId: borrower.id,
      bookId: book.book.id,
      copyId: book.copy.id,
      checkoutDate: new Date('2026-04-01T00:00:00.000Z'),
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-15T00:00:00.000Z'),
    });

    await createFineRecord({
      memberId: borrower.id,
      loanId: loan.id,
      amount: 10000,
      status: FineStatus.Unpaid,
      overdueDate: new Date('2026-04-16T00:00:00.000Z'),
    });
    await createFineRecord({
      memberId: borrower.id,
      loanId: loan.id,
      amount: 5000,
      status: FineStatus.Paid,
      overdueDate: new Date('2026-04-17T00:00:00.000Z'),
    });
    await createFineRecord({
      memberId: borrower.id,
      loanId: loan.id,
      amount: 7000,
      status: FineStatus.Waived,
      overdueDate: new Date('2026-05-01T00:00:00.000Z'),
    });
    const token = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .get('/api/v1/reports/fines/summary?from=2026-04-01&to=2026-05-31')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: FineStatus.Unpaid, totalAmount: 10000 }),
        expect.objectContaining({ status: FineStatus.Paid, totalAmount: 5000 }),
        expect.objectContaining({ status: FineStatus.Waived, totalAmount: 7000 }),
      ]),
    );
    expect(response.body.data.trend.length).toBeGreaterThan(0);
    expect(response.body.data.memberDebts[0].member._id).toBe(borrower.id);
  });

  it('exports loan summary as a valid xlsx file', async () => {
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
    const book = await createBookFixture('Export Loan');

    await createLoanRecord({
      memberId: borrower.id,
      bookId: book.book.id,
      copyId: book.copy.id,
      checkoutDate: new Date('2026-04-01T00:00:00.000Z'),
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-08T00:00:00.000Z'),
    });
    const token = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .get('/api/v1/reports/export?type=loans&format=xlsx')
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect((response.body as Buffer).subarray(0, 2).toString('utf8')).toBe('PK');
  });

  it('exports inventory report as a valid pdf file', async () => {
    const librarian = await createMember({
      email: 'librarian@example.com',
      password: 'Password1',
      role: Role.Librarian,
    });
    await createBookFixture('Export Inventory');
    const token = await loginAs(librarian.email, 'Password1');

    const response = await request(app)
      .get('/api/v1/reports/export?type=inventory&format=pdf')
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(response.headers['content-type']).toContain('application/pdf');
    expect((response.body as Buffer).subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
});
