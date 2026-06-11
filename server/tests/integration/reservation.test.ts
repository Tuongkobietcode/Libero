import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import path from 'node:path';
import request from 'supertest';

import { ERR } from '../../src/common/errors/errorCodes';
import {
  CopyStatus,
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

describe('Reservation Phase 6 integration', () => {
  let replSet: MongoMemoryReplSet;
  let mongoose: typeof import('mongoose').default;
  let app: express.Express;
  let MemberModel: typeof import('../../src/models/Member.model').MemberModel;
  let BookModel: typeof import('../../src/models/Book.model').BookModel;
  let BookCopyModel: typeof import('../../src/models/BookCopy.model').BookCopyModel;
  let ReservationModel: typeof import('../../src/models/Reservation.model').ReservationModel;
  let authRouter: typeof import('../../src/modules/member/auth.routes').authRouter;
  let reservationRouter: typeof import('../../src/modules/reservation/reservation.routes').reservationRouter;
  let reservationService: typeof import('../../src/modules/reservation/reservation.service').reservationService;
  let errorHandler: typeof import('../../src/common/middleware/errorHandler').errorHandler;
  let requestId: typeof import('../../src/common/middleware/requestId').requestId;
  let requestLogger: typeof import('../../src/common/middleware/requestLogger').requestLogger;
  let redisStore: FakeRedisStore;
  let memberSequence = 1;
  let bookSequence = 1;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-reservation-test?replicaSet=rs0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
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
    ({ ReservationModel } = await import('../../src/models/Reservation.model'));
    ({ authRouter } = await import('../../src/modules/member/auth.routes'));
    ({ reservationRouter } = await import('../../src/modules/reservation/reservation.routes'));
    ({ reservationService } = await import('../../src/modules/reservation/reservation.service'));
    ({ errorHandler } = await import('../../src/common/middleware/errorHandler'));
    ({ requestId } = await import('../../src/common/middleware/requestId'));
    ({ requestLogger } = await import('../../src/common/middleware/requestLogger'));

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(requestId);
    app.use(requestLogger);
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/reservations', reservationRouter);
    app.use(errorHandler);

    try {
      await mongoose.connect('mongodb://localhost:27017/libero-reservation-test?replicaSet=rs0', {
        serverSelectionTimeoutMS: 1_000,
      });
    } catch {
      await mongoose.disconnect();
      replSet = await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
        },
      });

      await mongoose.connect(replSet.getUri('libero-reservation-test'));
    }

    await Promise.all([MemberModel.init(), BookModel.init(), BookCopyModel.init(), ReservationModel.init()]);
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

  async function createBookFixture(copyStatus: CopyStatus = CopyStatus.Borrowed) {
    const sequence = bookSequence.toString().padStart(4, '0');
    bookSequence += 1;

    const book = await BookModel.create({
      isbn: `9781111111${sequence}`,
      title: `Reservation Book ${sequence}`,
      authorIds: [],
      categoryIds: [],
      isDeleted: false,
    });

    const copy = await BookCopyModel.create({
      bookId: book._id,
      barcode: `RES-BOOK-${sequence}`,
      status: copyStatus,
      shelfLocation: 'A1',
    });

    return { book, copy };
  }

  function createReservationByApi(accessToken: string, bookId: string) {
    return request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bookId });
  }

  it('creates a reservation successfully when no copies are available', async () => {
    const student = await createMember({ email: 'student@example.com', password: 'Password1', role: Role.Student });
    const { book } = await createBookFixture(CopyStatus.Borrowed);
    const accessToken = await loginAs(student.email, 'Password1');

    const response = await createReservationByApi(accessToken, book.id).expect(201);

    expect(response.body.data.status).toBe(ReservationStatus.Waiting);
    expect(response.body.data.queuePosition).toBe(1);
  });

  it('allows a lecturer to create a reservation when no copies are available', async () => {
    const lecturer = await createMember({ email: 'lecturer@example.com', password: 'Password1', role: Role.Lecturer });
    const { book } = await createBookFixture(CopyStatus.Borrowed);
    const accessToken = await loginAs(lecturer.email, 'Password1');

    const response = await createReservationByApi(accessToken, book.id).expect(201);

    expect(response.body.data.status).toBe(ReservationStatus.Waiting);
    expect(response.body.data.member._id).toBe(lecturer.id);
  });

  it('blocks a librarian from creating a reservation', async () => {
    const librarian = await createMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const { book } = await createBookFixture(CopyStatus.Borrowed);
    const accessToken = await loginAs(librarian.email, 'Password1');

    const response = await createReservationByApi(accessToken, book.id).expect(403);

    expect(response.body.error.code).toBe(ERR.AUTH_FORBIDDEN);
  });

  it('blocks an admin from creating a reservation', async () => {
    const admin = await createMember({ email: 'admin@example.com', password: 'Password1', role: Role.Admin });
    const { book } = await createBookFixture(CopyStatus.Borrowed);
    const accessToken = await loginAs(admin.email, 'Password1');

    const response = await createReservationByApi(accessToken, book.id).expect(403);

    expect(response.body.error.code).toBe(ERR.AUTH_FORBIDDEN);
  });

  it('blocks unauthenticated reservation creation requests', async () => {
    const { book } = await createBookFixture(CopyStatus.Borrowed);

    const response = await request(app)
      .post('/api/v1/reservations')
      .send({ bookId: book.id })
      .expect(401);

    expect(response.body.error.code).toBe(ERR.AUTH_TOKEN_INVALID);
  });

  it('rejects reservation creation when a copy is still available', async () => {
    const student = await createMember({ email: 'student@example.com', password: 'Password1', role: Role.Student });
    const { book } = await createBookFixture(CopyStatus.Available);
    const accessToken = await loginAs(student.email, 'Password1');

    const response = await createReservationByApi(accessToken, book.id).expect(422);

    expect(response.body.error.code).toBe(ERR.RES_COPY_AVAILABLE);
  });

  it('rejects duplicate active reservation for the same member and book', async () => {
    const student = await createMember({ email: 'student@example.com', password: 'Password1', role: Role.Student });
    const { book } = await createBookFixture(CopyStatus.Borrowed);
    const accessToken = await loginAs(student.email, 'Password1');

    await createReservationByApi(accessToken, book.id).expect(201);
    const response = await createReservationByApi(accessToken, book.id).expect(409);

    expect(response.body.error.code).toBe(ERR.RES_ALREADY_RESERVED);
  });

  it('assigns FIFO queue positions for three members reserving the same book', async () => {
    const student1 = await createMember({ email: 'student1@example.com', password: 'Password1', role: Role.Student });
    const student2 = await createMember({ email: 'student2@example.com', password: 'Password1', role: Role.Student });
    const student3 = await createMember({ email: 'student3@example.com', password: 'Password1', role: Role.Student });
    const { book } = await createBookFixture(CopyStatus.Borrowed);

    const token1 = await loginAs(student1.email, 'Password1');
    const token2 = await loginAs(student2.email, 'Password1');
    const token3 = await loginAs(student3.email, 'Password1');

    const response1 = await createReservationByApi(token1, book.id).expect(201);
    const response2 = await createReservationByApi(token2, book.id).expect(201);
    const response3 = await createReservationByApi(token3, book.id).expect(201);

    expect(response1.body.data.queuePosition).toBe(1);
    expect(response2.body.data.queuePosition).toBe(2);
    expect(response3.body.data.queuePosition).toBe(3);
  });

  it('reorders waiting queue positions after cancelling a middle waiting reservation', async () => {
    const student1 = await createMember({ email: 'student1@example.com', password: 'Password1', role: Role.Student });
    const student2 = await createMember({ email: 'student2@example.com', password: 'Password1', role: Role.Student });
    const student3 = await createMember({ email: 'student3@example.com', password: 'Password1', role: Role.Student });
    const { book } = await createBookFixture(CopyStatus.Borrowed);

    const token1 = await loginAs(student1.email, 'Password1');
    const token2 = await loginAs(student2.email, 'Password1');
    const token3 = await loginAs(student3.email, 'Password1');

    await createReservationByApi(token1, book.id).expect(201);
    const second = await createReservationByApi(token2, book.id).expect(201);
    await createReservationByApi(token3, book.id).expect(201);

    await request(app)
      .delete(`/api/v1/reservations/${second.body.data._id as string}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);

    const reservations = await ReservationModel.find({ bookId: book._id }).sort({ requestDate: 1 }).exec();
    const waitingReservations = reservations.filter((item) => item.status === ReservationStatus.Waiting);

    expect(waitingReservations).toHaveLength(2);
    expect(waitingReservations[0]?.queuePosition).toBe(1);
    expect(waitingReservations[1]?.queuePosition).toBe(2);
  });

  it('cancels a notified reservation and moves the hold to the next waiting member', async () => {
    const librarian = await createMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const student1 = await createMember({ email: 'student1@example.com', password: 'Password1', role: Role.Student });
    const student2 = await createMember({ email: 'student2@example.com', password: 'Password1', role: Role.Student });
    const { book, copy } = await createBookFixture(CopyStatus.Borrowed);

    const librarianToken = await loginAs(librarian.email, 'Password1');
    const token1 = await loginAs(student1.email, 'Password1');
    const token2 = await loginAs(student2.email, 'Password1');

    const first = await createReservationByApi(token1, book.id).expect(201);
    await createReservationByApi(token2, book.id).expect(201);

    await BookCopyModel.findByIdAndUpdate(copy._id, { status: CopyStatus.Available }).exec();
    await reservationService.notifyNext(book.id, copy.id);

    await request(app)
      .delete(`/api/v1/reservations/${first.body.data._id as string}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .expect(200);

    const reservations = await ReservationModel.find({ bookId: book._id }).sort({ requestDate: 1 }).exec();
    const updatedCopy = await BookCopyModel.findById(copy._id).exec();

    expect(reservations[0]?.status).toBe(ReservationStatus.Cancelled);
    expect(reservations[1]?.status).toBe(ReservationStatus.Notified);
    expect(reservations[1]?.holdExpiryAt).toBeTruthy();
    expect(updatedCopy?.status).toBe(CopyStatus.Reserved);
  });

  it('expires a notified hold and notifies the next waiting reservation', async () => {
    const student1 = await createMember({ email: 'student1@example.com', password: 'Password1', role: Role.Student });
    const student2 = await createMember({ email: 'student2@example.com', password: 'Password1', role: Role.Student });
    const student3 = await createMember({ email: 'student3@example.com', password: 'Password1', role: Role.Student });
    const { book, copy } = await createBookFixture(CopyStatus.Borrowed);

    const token1 = await loginAs(student1.email, 'Password1');
    const token2 = await loginAs(student2.email, 'Password1');
    const token3 = await loginAs(student3.email, 'Password1');

    const first = await createReservationByApi(token1, book.id).expect(201);
    await createReservationByApi(token2, book.id).expect(201);
    await createReservationByApi(token3, book.id).expect(201);

    await BookCopyModel.findByIdAndUpdate(copy._id, { status: CopyStatus.Available }).exec();
    await reservationService.notifyNext(book.id, copy.id);
    await ReservationModel.findByIdAndUpdate(first.body.data._id as string, {
      holdExpiryAt: new Date('2026-04-01T00:00:00.000Z'),
    }).exec();

    await reservationService.expireHold(first.body.data._id as string);

    const reservations = await ReservationModel.find({ bookId: book._id }).sort({ requestDate: 1 }).exec();
    const updatedCopy = await BookCopyModel.findById(copy._id).exec();

    expect(reservations[0]?.status).toBe(ReservationStatus.Expired);
    expect(reservations[1]?.status).toBe(ReservationStatus.Notified);
    expect(reservations[1]?.queuePosition).toBe(1);
    expect(reservations[2]?.queuePosition).toBe(2);
    expect(updatedCopy?.status).toBe(CopyStatus.Reserved);
  });

  it('releases the copy when an expired hold has no waiting reservation behind it', async () => {
    const student = await createMember({ email: 'student@example.com', password: 'Password1', role: Role.Student });
    const { book, copy } = await createBookFixture(CopyStatus.Borrowed);
    const token = await loginAs(student.email, 'Password1');

    const first = await createReservationByApi(token, book.id).expect(201);

    await BookCopyModel.findByIdAndUpdate(copy._id, { status: CopyStatus.Available }).exec();
    await reservationService.notifyNext(book.id, copy.id);
    await ReservationModel.findByIdAndUpdate(first.body.data._id as string, {
      holdExpiryAt: new Date('2026-04-01T00:00:00.000Z'),
    }).exec();

    await reservationService.expireHold(first.body.data._id as string);

    const expiredReservation = await ReservationModel.findById(first.body.data._id as string).exec();
    const updatedCopy = await BookCopyModel.findById(copy._id).exec();

    expect(expiredReservation?.status).toBe(ReservationStatus.Expired);
    expect(updatedCopy?.status).toBe(CopyStatus.Available);
  });

  it('returns only current member reservations for GET /reservations/me', async () => {
    const student1 = await createMember({ email: 'student1@example.com', password: 'Password1', role: Role.Student });
    const student2 = await createMember({ email: 'student2@example.com', password: 'Password1', role: Role.Student });
    const { book: book1 } = await createBookFixture(CopyStatus.Borrowed);
    const { book: book2 } = await createBookFixture(CopyStatus.Borrowed);

    const token1 = await loginAs(student1.email, 'Password1');
    const token2 = await loginAs(student2.email, 'Password1');

    await createReservationByApi(token1, book1.id).expect(201);
    await createReservationByApi(token2, book2.id).expect(201);

    const response = await request(app)
      .get('/api/v1/reservations/me')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].member._id).toBe(student1.id);
  });

  it('blocks DELETE /reservations/:id for a non-owner borrower', async () => {
    const owner = await createMember({ email: 'owner@example.com', password: 'Password1', role: Role.Student });
    const other = await createMember({ email: 'other@example.com', password: 'Password1', role: Role.Student });
    const { book } = await createBookFixture(CopyStatus.Borrowed);

    const ownerToken = await loginAs(owner.email, 'Password1');
    const otherToken = await loginAs(other.email, 'Password1');
    const created = await createReservationByApi(ownerToken, book.id).expect(201);

    const response = await request(app)
      .delete(`/api/v1/reservations/${created.body.data._id as string}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    expect(response.body.error.code).toBe(ERR.AUTH_FORBIDDEN);
  });

  it('allows librarian to list reservations with basic filters', async () => {
    const librarian = await createMember({ email: 'librarian@example.com', password: 'Password1', role: Role.Librarian });
    const student1 = await createMember({ email: 'student1@example.com', password: 'Password1', role: Role.Student });
    const student2 = await createMember({ email: 'student2@example.com', password: 'Password1', role: Role.Student });
    const { book: book1 } = await createBookFixture(CopyStatus.Borrowed);
    const { book: book2 } = await createBookFixture(CopyStatus.Borrowed);

    const librarianToken = await loginAs(librarian.email, 'Password1');
    const token1 = await loginAs(student1.email, 'Password1');
    const token2 = await loginAs(student2.email, 'Password1');

    await createReservationByApi(token1, book1.id).expect(201);
    await createReservationByApi(token2, book2.id).expect(201);

    const response = await request(app)
      .get(`/api/v1/reservations?memberId=${student1.id}&status=${ReservationStatus.Waiting}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].member._id).toBe(student1.id);
  });
});
