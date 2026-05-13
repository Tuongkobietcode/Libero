import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import path from 'node:path';
import request from 'supertest';

import { ERR } from '../../src/common/errors/errorCodes';
import { Role, MemberStatus } from '../../src/common/types/enums';

jest.setTimeout(20_000);

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

describe('Auth integration', () => {
  let replSet: MongoMemoryReplSet;
  let app: express.Express;
  let mongoose: typeof import('mongoose');
  let MemberModel: typeof import('../../src/models/Member.model').MemberModel;
  let RefreshTokenModel: typeof import('../../src/models/RefreshToken.model').RefreshTokenModel;
  let authRouter: typeof import('../../src/modules/member/auth.routes').authRouter;
  let authenticate: typeof import('../../src/common/middleware/authenticate').authenticate;
  let authorize: typeof import('../../src/common/middleware/authorize').authorize;
  let errorHandler: typeof import('../../src/common/middleware/errorHandler').errorHandler;
  let requestId: typeof import('../../src/common/middleware/requestId').requestId;
  let requestLogger: typeof import('../../src/common/middleware/requestLogger').requestLogger;
  let redisStore: FakeRedisStore;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/libero-test?replicaSet=rs0';
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
      mongoose = mongooseModule.default ?? mongooseModule;
    }
    ({ MemberModel } = await import('../../src/models/Member.model'));
    ({ RefreshTokenModel } = await import('../../src/models/RefreshToken.model'));
    ({ authRouter } = await import('../../src/modules/member/auth.routes'));
    ({ authenticate } = await import('../../src/common/middleware/authenticate'));
    ({ authorize } = await import('../../src/common/middleware/authorize'));
    ({ errorHandler } = await import('../../src/common/middleware/errorHandler'));
    ({ requestId } = await import('../../src/common/middleware/requestId'));
    ({ requestLogger } = await import('../../src/common/middleware/requestLogger'));

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(requestId);
    app.use(requestLogger);
    app.use('/api/v1/auth', authRouter);
    app.get('/api/v1/test/protected', authenticate, (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    });
    app.get('/api/v1/test/librarian', authenticate, authorize(Role.Librarian, Role.Admin), (_req, res) => {
      res.status(200).json({
        success: true,
        data: {
          ok: true,
        },
      });
    });
    app.use(errorHandler);

    try {
      await mongoose.connect('mongodb://localhost:27017/libero-auth-test?replicaSet=rs0', {
        serverSelectionTimeoutMS: 1_000,
      });
    } catch {
      await mongoose.disconnect();
      replSet = await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
        },
      });

      await mongoose.connect(replSet.getUri('libero-auth-test'));
    }
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
    const collections = mongoose?.connection?.collections ?? {};

    await Promise.all(Object.values(collections).map(async (collection) => collection.deleteMany({})));
  });

  async function createActiveMember(overrides: Record<string, unknown> = {}) {
    return MemberModel.create({
      fullName: 'Reader User',
      email: 'reader@example.com',
      passwordHash: await bcrypt.hash('Password1', 12),
      role: Role.Student,
      memberCardNo: 'MEM-2026-00010',
      status: MemberStatus.Active,
      isBlocked: false,
      failedLoginCount: 0,
      ...overrides,
    });
  }

  it('logs in successfully', async () => {
    await createActiveMember();

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reader@example.com', password: 'Password1' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.headers['set-cookie'][0]).toContain('refreshToken=');
  });

  it('uses app-specific refresh cookies when a client app is declared', async () => {
    await createActiveMember();

    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Client-App', 'reader')
      .send({ email: 'reader@example.com', password: 'Password1' })
      .expect(200);

    expect(response.headers['set-cookie'][0]).toContain('reader_refreshToken=');
  });

  it('does not use the legacy refresh cookie for declared client apps', async () => {
    await createActiveMember();

    const legacyLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reader@example.com', password: 'Password1' })
      .expect(200);

    const legacyCookie = legacyLoginResponse.headers['set-cookie'][0];

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('X-Client-App', 'reader')
      .set('Cookie', legacyCookie)
      .expect(401);

    expect(response.body.error.code).toBe(ERR.AUTH_REFRESH_INVALID);
  });

  it('returns 401 for wrong password', async () => {
    await createActiveMember();

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reader@example.com', password: 'WrongPassword1' })
      .expect(401);

    expect(response.body.error.code).toBe(ERR.AUTH_INVALID_CREDENTIALS);
  });

  it('locks user after repeated wrong passwords', async () => {
    await createActiveMember();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'reader@example.com', password: 'WrongPassword1' })
        .expect(401);
    }

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reader@example.com', password: 'WrongPassword1' })
      .expect(429);

    expect(response.body.error.code).toBe(ERR.AUTH_TOO_MANY_ATTEMPTS);
  });

  it('refreshes tokens successfully', async () => {
    await createActiveMember();

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reader@example.com', password: 'Password1' })
      .expect(200);

    const refreshCookie = loginResponse.headers['set-cookie'][0];

    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.accessToken).toBeTruthy();
    expect(refreshResponse.headers['set-cookie'][0]).not.toEqual(refreshCookie);
  });

  it('detects reuse of an old refresh token', async () => {
    await createActiveMember();

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reader@example.com', password: 'Password1' })
      .expect(200);

    const oldCookie = loginResponse.headers['set-cookie'][0];

    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldCookie)
      .expect(200);

    const newCookie = refreshResponse.headers['set-cookie'][0];

    const reusedResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldCookie)
      .expect(401);

    expect(reusedResponse.body.error.code).toBe(ERR.AUTH_REFRESH_REUSE);

    await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', newCookie)
      .expect(401);

    const refreshTokens = await RefreshTokenModel.find().exec();
    expect(refreshTokens.every((token) => token.revokedAt !== null)).toBe(true);
  });

  it('returns 401 for protected endpoint without token', async () => {
    const response = await request(app).get('/api/v1/test/protected').expect(401);

    expect(response.body.error.code).toBe(ERR.AUTH_TOKEN_INVALID);
  });

  it('returns 403 for protected endpoint with wrong role', async () => {
    await createActiveMember();

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reader@example.com', password: 'Password1' })
      .expect(200);

    const accessToken = loginResponse.body.data.accessToken as string;

    const response = await request(app)
      .get('/api/v1/test/librarian')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(response.body.error.code).toBe(ERR.AUTH_FORBIDDEN);
  });

  it('allows suspended members to login for limited self-service access', async () => {
    await createActiveMember({
      email: 'suspended@example.com',
      memberCardNo: 'MEM-2026-00011',
      status: MemberStatus.Suspended,
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'suspended@example.com', password: 'Password1' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
  });

  it('registers a member in pending status', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'New Reader',
        email: 'new-reader@example.com',
        studentId: 'S1001',
        password: 'Password1',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe(MemberStatus.Pending);

    const member = await MemberModel.findOne({ email: 'new-reader@example.com' }).exec();
    expect(member?.status).toBe(MemberStatus.Pending);
  });

  it('rate limits register requests after five attempts from the same IP', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'A',
          email: 'not-an-email',
          password: 'short',
        })
        .expect(400);
    }

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'A',
        email: 'not-an-email',
        password: 'short',
      })
      .expect(429);

    expect(response.body.error.code).toBe(ERR.COMMON_RATE_LIMITED);
  });
});
