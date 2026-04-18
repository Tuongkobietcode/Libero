import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import path from 'node:path';
import request from 'supertest';

import { ERR } from '../../src/common/errors/errorCodes';
import { MemberStatus, Role } from '../../src/common/types/enums';

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

describe('Catalog Phase 4 integration', () => {
  let replSet: MongoMemoryReplSet;
  let app: express.Express;
  let mongoose: typeof import('mongoose').default;
  let MemberModel: typeof import('../../src/models/Member.model').MemberModel;
  let BookModel: typeof import('../../src/models/Book.model').BookModel;
  let BookCopyModel: typeof import('../../src/models/BookCopy.model').BookCopyModel;
  let RefreshTokenModel: typeof import('../../src/models/RefreshToken.model').RefreshTokenModel;
  let LoanPolicyModel: typeof import('../../src/models/LoanPolicy.model').LoanPolicyModel;
  let authRouter: typeof import('../../src/modules/member/auth.routes').authRouter;
  let catalogRouter: typeof import('../../src/modules/catalog/catalog.routes').catalogRouter;
  let memberRouter: typeof import('../../src/modules/member/member.routes').memberRouter;
  let configRouter: typeof import('../../src/modules/member/member.routes').configRouter;
  let errorHandler: typeof import('../../src/common/middleware/errorHandler').errorHandler;
  let requestId: typeof import('../../src/common/middleware/requestId').requestId;
  let requestLogger: typeof import('../../src/common/middleware/requestLogger').requestLogger;
  let redisStore: FakeRedisStore;
  let memberSequence = 1;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-catalog-test?replicaSet=rs0';
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
    ({ RefreshTokenModel } = await import('../../src/models/RefreshToken.model'));
    ({ LoanPolicyModel } = await import('../../src/models/LoanPolicy.model'));
    ({ authRouter } = await import('../../src/modules/member/auth.routes'));
    ({ catalogRouter } = await import('../../src/modules/catalog/catalog.routes'));
    ({ memberRouter, configRouter } = await import('../../src/modules/member/member.routes'));
    ({ errorHandler } = await import('../../src/common/middleware/errorHandler'));
    ({ requestId } = await import('../../src/common/middleware/requestId'));
    ({ requestLogger } = await import('../../src/common/middleware/requestLogger'));

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(requestId);
    app.use(requestLogger);
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/books', catalogRouter);
    app.use('/api/v1/members', memberRouter);
    app.use('/api/v1/config', configRouter);
    app.use(errorHandler);

    try {
      await mongoose.connect('mongodb://localhost:27017/libero-catalog-test?replicaSet=rs0');
    } catch {
      replSet = await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
        },
      });

      await mongoose.connect(replSet.getUri('libero-catalog-test'));
    }

    await LoanPolicyModel.updateOne(
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
    );

    await LoanPolicyModel.updateOne(
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
    );

    await LoanPolicyModel.updateOne(
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
    );
  });

  afterAll(async () => {
    redisStore.clear();

    if (mongoose?.connection?.db) {
      await mongoose.connection.db.dropDatabase();
    }

    if (mongoose) {
      await mongoose.disconnect();
    }

    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    redisStore.clear();
    memberSequence = 1;

    const collections = mongoose?.connection?.collections ?? {};
    await Promise.all(Object.values(collections).map(async (collection) => collection.deleteMany({})));

    await LoanPolicyModel.updateOne(
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
    );

    await LoanPolicyModel.updateOne(
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
    );

    await LoanPolicyModel.updateOne(
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
    );
  });

  async function createActiveMember(params: {
    email: string;
    password: string;
    role: Role;
    status?: MemberStatus;
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
      isBlocked: false,
      failedLoginCount: 0,
    });
  }

  async function loginAs(email: string, password: string): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  it('creates a book successfully', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const accessToken = await loginAs('librarian@example.com', 'Password1');

    const response = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isbn: '9781234567890',
        title: 'Harry Potter',
        authors: ['J.K. Rowling'],
        categories: ['Fantasy'],
        quantity: 2,
        shelfLocation: 'A1',
      })
      .expect(201);

    expect(response.body.data.title).toBe('Harry Potter');
    expect(response.body.data.copies).toHaveLength(2);

    const books = await BookModel.find().exec();
    const copies = await BookCopyModel.find().exec();
    expect(books).toHaveLength(1);
    expect(copies).toHaveLength(2);
  });

  it('rejects duplicate ISBN on create book', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const accessToken = await loginAs('librarian@example.com', 'Password1');

    const payload = {
      isbn: '9781234567890',
      title: 'Harry Potter',
      authors: ['J.K. Rowling'],
      categories: ['Fantasy'],
      quantity: 1,
    };

    await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    const response = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(409);

    expect(response.body.error.code).toBe(ERR.CAT_ISBN_EXISTS);
  });

  it('searches books and filters available books', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const accessToken = await loginAs('librarian@example.com', 'Password1');

    const harryBook = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isbn: '9781234567890',
        title: 'Harry Potter',
        authors: ['J.K. Rowling'],
        categories: ['Fantasy'],
        quantity: 1,
      })
      .expect(201);

    const dataBook = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isbn: '9781234567891',
        title: 'Data Structures',
        authors: ['Mark Allen'],
        categories: ['Technology'],
        quantity: 1,
      })
      .expect(201);

    const secondCopyId = dataBook.body.data.copies[0]._id as string;

    await request(app)
      .patch(`/api/v1/books/copies/${secondCopyId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'lost' })
      .expect(200);

    const searchResponse = await request(app)
      .get('/api/v1/books?q=harry')
      .expect(200);

    expect(searchResponse.body.data.items).toHaveLength(1);
    expect(searchResponse.body.data.items[0].title).toBe('Harry Potter');

    const availableResponse = await request(app)
      .get('/api/v1/books?available=true')
      .expect(200);

    expect(availableResponse.body.data.items).toHaveLength(1);
    expect(availableResponse.body.data.items[0]._id).toBe(harryBook.body.data._id);
  });

  it('soft deletes a book', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const accessToken = await loginAs('librarian@example.com', 'Password1');

    const createResponse = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isbn: '9781234567890',
        title: 'Delete Me',
        authors: ['Author'],
        categories: ['Category'],
        quantity: 1,
      })
      .expect(201);

    await request(app)
      .delete(`/api/v1/books/${createResponse.body.data._id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const searchResponse = await request(app)
      .get('/api/v1/books?q=Delete')
      .expect(200);

    expect(searchResponse.body.data.items).toHaveLength(0);
  });

  it('adds copies to an existing book', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const accessToken = await loginAs('librarian@example.com', 'Password1');

    const createResponse = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isbn: '9781234567890',
        title: 'Copy Book',
        authors: ['Author'],
        categories: ['Category'],
        quantity: 1,
      })
      .expect(201);

    const bookId = createResponse.body.data._id as string;

    const addCopiesResponse = await request(app)
      .post(`/api/v1/books/${bookId}/copies`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ count: 2, shelfLocation: 'B2' })
      .expect(201);

    expect(addCopiesResponse.body.data.copies).toHaveLength(2);

    const totalCopies = await BookCopyModel.countDocuments({ bookId }).exec();
    expect(totalCopies).toBe(3);
  });

  it('imports CSV with per-row errors', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const accessToken = await loginAs('librarian@example.com', 'Password1');

    const csv = [
      'isbn,title,author,category,quantity,shelfLocation,publisher',
      '9781234567890,Harry Potter,J.K. Rowling,Fantasy,2,A1,Bloomsbury',
      '9781234567891,Domain-Driven Design,Eric Evans,Technology,1,B2,Addison-Wesley',
      '9781234567890,Duplicate Book,Another Author,Fantasy,1,C3,Test',
    ].join('\n');

    const response = await request(app)
      .post('/api/v1/books/import')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from(csv, 'utf-8'), 'books.csv')
      .expect(200);

    expect(response.body.data.successCount).toBe(2);
    expect(response.body.data.failedCount).toBe(1);
    expect(response.body.data.errors).toHaveLength(1);

    const books = await BookModel.find().exec();
    expect(books).toHaveLength(2);
  });

  it('creates a member as librarian', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const accessToken = await loginAs('librarian@example.com', 'Password1');

    const response = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Student User',
        email: 'student@example.com',
        password: 'Password1',
        role: Role.Student,
      })
      .expect(201);

    expect(response.body.data.status).toBe(MemberStatus.Active);
    expect(response.body.data.memberCardNo).toMatch(/^MEM-\d{4}-\d{5}$/);
  });

  it('suspends a member and revokes refresh tokens', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const student = await createActiveMember({ email: 'student@example.com', password: 'Password1', role: Role.Student });
    const librarianAccessToken = await loginAs('librarian@example.com', 'Password1');
    await loginAs('student@example.com', 'Password1');

    const response = await request(app)
      .patch(`/api/v1/members/${student.id}/suspend`)
      .set('Authorization', `Bearer ${librarianAccessToken}`)
      .send({ reason: 'Violation' })
      .expect(200);

    expect(response.body.data.status).toBe(MemberStatus.Suspended);

    const refreshTokens = await RefreshTokenModel.find({ memberId: student._id }).exec();
    expect(refreshTokens).toHaveLength(1);
    expect(refreshTokens[0]?.revokedAt).not.toBeNull();
  });

  it('activates a suspended member', async () => {
    await createActiveMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const student = await createActiveMember({
      email: 'student@example.com',
      password: 'Password1',
      role: Role.Student,
      status: MemberStatus.Suspended,
    });
    const librarianAccessToken = await loginAs('librarian@example.com', 'Password1');

    const response = await request(app)
      .patch(`/api/v1/members/${student.id}/activate`)
      .set('Authorization', `Bearer ${librarianAccessToken}`)
      .send({})
      .expect(200);

    expect(response.body.data.status).toBe(MemberStatus.Active);
  });

  it('updates a loan policy as admin', async () => {
    await createActiveMember({ email: 'admin@example.com', password: 'Password1', role: Role.Admin });
    const adminAccessToken = await loginAs('admin@example.com', 'Password1');

    const response = await request(app)
      .patch('/api/v1/config/loan-policies/student')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        maxBooks: 4,
        loanDays: 21,
        maxRenewals: 2,
        renewDays: 7,
      })
      .expect(200);

    expect(response.body.data.maxBooks).toBe(4);

    const policy = await LoanPolicyModel.findOne({ role: Role.Student }).exec();
    expect(policy?.maxBooks).toBe(4);
  });
});
