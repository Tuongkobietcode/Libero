import mongoose from 'mongoose';

import { AuthenticationError, ConflictError, RateLimitError } from '../../src/common/errors/AppError';
import { ERR } from '../../src/common/errors/errorCodes';
import { MemberStatus, Role } from '../../src/common/types/enums';
import { invalidateMemberCache } from '../../src/common/utils/memberCache';
import { AuthService } from '../../src/modules/member/auth.service';
import type { AuthRepository, RedisAuthStore } from '../../src/modules/member/auth.types';

jest.mock('../../src/common/utils/memberCache', () => ({
  invalidateMemberCache: jest.fn().mockResolvedValue(undefined),
}));

const mockInvalidateMemberCache = jest.mocked(invalidateMemberCache);

function createRepositoryMock(): jest.Mocked<AuthRepository> {
  return {
    findMemberByEmail: jest.fn(),
    findMemberById: jest.fn(),
    emailExists: jest.fn(),
    studentIdExists: jest.fn(),
    createMember: jest.fn(),
    getNextMemberCardNo: jest.fn(),
    updateMemberById: jest.fn(),
    findRefreshTokenByHash: jest.fn(),
    createRefreshToken: jest.fn(),
    revokeRefreshTokenById: jest.fn(),
    revokeRefreshTokenFamily: jest.fn(),
    revokeAllRefreshTokensForMember: jest.fn(),
  };
}

function createRedisMock(): jest.Mocked<RedisAuthStore> {
  return {
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
  };
}

function createMemberDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: '507f1f77bcf86cd799439011',
    role: Role.Student,
    status: MemberStatus.Active,
    isBlocked: false,
    passwordHash: 'hashed',
    comparePassword: jest.fn().mockResolvedValue(true),
    isLocked: jest.fn().mockReturnValue(false),
    ...overrides,
  } as any;
}

describe('AuthService', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-test?replicaSet=rs0';
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
    jest.restoreAllMocks();
  });

  it('logs in successfully with valid credentials', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();
    const member = createMemberDocument();

    repository.findMemberByEmail.mockResolvedValue(member);
    repository.createRefreshToken.mockResolvedValue({} as any);
    redis.del.mockResolvedValue(1);
    repository.updateMemberById.mockResolvedValue();

    const authService = new AuthService(repository, redis);
    const result = await authService.login({ email: 'reader@example.com', password: 'Password1' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user).toEqual({
      _id: member.id,
      role: member.role,
      isBlocked: member.isBlocked,
    });
    expect(repository.createRefreshToken).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledWith('login_fail:reader@example.com');
  });

  it('throws invalid credentials when password is wrong', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();
    const member = createMemberDocument({
      comparePassword: jest.fn().mockResolvedValue(false),
    });

    repository.findMemberByEmail.mockResolvedValue(member);
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    repository.updateMemberById.mockResolvedValue();

    const authService = new AuthService(repository, redis);

    await expect(authService.login({ email: 'reader@example.com', password: 'wrong' })).rejects.toMatchObject<
      Partial<AuthenticationError>
    >({
      code: ERR.AUTH_INVALID_CREDENTIALS,
      statusCode: 401,
    });
  });

  it('locks account after brute-force threshold is exceeded', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();
    const member = createMemberDocument({
      comparePassword: jest.fn().mockResolvedValue(false),
    });

    repository.findMemberByEmail.mockResolvedValue(member);
    redis.incr.mockResolvedValue(5);
    redis.expire.mockResolvedValue(1);
    repository.updateMemberById.mockResolvedValue();

    const authService = new AuthService(repository, redis);

    await expect(authService.login({ email: 'reader@example.com', password: 'wrong' })).rejects.toBeInstanceOf(RateLimitError);
    expect(repository.updateMemberById).toHaveBeenCalledWith(
      member.id,
      expect.objectContaining({
        $inc: { failedLoginCount: 1 },
        $set: { lockedUntil: expect.any(Date) },
      }),
    );
    expect(mockInvalidateMemberCache).toHaveBeenCalledWith(member.id);
  });

  it('refreshes tokens successfully', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();
    const member = createMemberDocument();
    const future = new Date(Date.now() + 60_000);
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);

    repository.findRefreshTokenByHash.mockResolvedValue({
      id: 'refresh-id',
      memberId: { toString: () => member.id },
      familyId: 'family-id',
      revokedAt: null,
      expiresAt: future,
    } as any);
    repository.findMemberById.mockResolvedValue(member);
    repository.revokeRefreshTokenById.mockResolvedValue();
    repository.createRefreshToken.mockResolvedValue({} as any);

    const authService = new AuthService(repository, redis);
    const result = await authService.refreshTokens('seed-token');

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(repository.revokeRefreshTokenById).toHaveBeenCalled();
    expect(repository.createRefreshToken).toHaveBeenCalled();
    expect(fakeSession.withTransaction).toHaveBeenCalled();
  });

  it('detects reuse of an old refresh token', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();

    repository.findRefreshTokenByHash.mockResolvedValue({
      id: 'refresh-id',
      memberId: { toString: () => '507f1f77bcf86cd799439011' },
      familyId: 'family-id',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    } as any);
    repository.revokeRefreshTokenFamily.mockResolvedValue();

    const authService = new AuthService(repository, redis);

    await expect(authService.refreshTokens('stale-token')).rejects.toMatchObject<Partial<AuthenticationError>>({
      code: ERR.AUTH_REFRESH_REUSE,
      statusCode: 401,
    });
    expect(repository.revokeRefreshTokenFamily).toHaveBeenCalled();
  });

  it('registers an active student member', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();

    repository.emailExists.mockResolvedValue(false);
    repository.studentIdExists.mockResolvedValue(false);
    repository.getNextMemberCardNo.mockResolvedValue('MEM-2026-00002');
    repository.createMember.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      status: MemberStatus.Active,
    } as any);

    const authService = new AuthService(repository, redis);
    const result = await authService.register({
      fullName: 'Reader User',
      email: 'reader@example.com',
      phone: '0901234567',
      studentId: 'S001',
      password: 'Password1',
    });

    expect(result).toEqual({
      memberId: '507f1f77bcf86cd799439011',
      status: MemberStatus.Active,
    });
    expect(repository.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.Student,
        status: MemberStatus.Active,
        phone: '0901234567',
      }),
    );
  });

  it('rejects register when email already exists', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();

    repository.emailExists.mockResolvedValue(true);

    const authService = new AuthService(repository, redis);

    await expect(authService.register({
      fullName: 'Reader User',
      email: 'reader@example.com',
      password: 'Password1',
    })).rejects.toBeInstanceOf(ConflictError);
  });

  it('allows suspended members to login for read-only access flows', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();
    const member = createMemberDocument({
      status: MemberStatus.Suspended,
    });

    repository.findMemberByEmail.mockResolvedValue(member);
    repository.createRefreshToken.mockResolvedValue({} as any);
    redis.del.mockResolvedValue(1);
    repository.updateMemberById.mockResolvedValue();

    const authService = new AuthService(repository, redis);
    const result = await authService.login({ email: 'reader@example.com', password: 'Password1' });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user._id).toBe(member.id);
  });

  it('activates legacy pending members when they login successfully', async () => {
    const repository = createRepositoryMock();
    const redis = createRedisMock();
    const member = createMemberDocument({
      status: MemberStatus.Pending,
    });

    repository.findMemberByEmail.mockResolvedValue(member);
    repository.createRefreshToken.mockResolvedValue({} as any);
    redis.del.mockResolvedValue(1);
    repository.updateMemberById.mockResolvedValue();

    const authService = new AuthService(repository, redis);
    const result = await authService.login({ email: 'reader@example.com', password: 'Password1' });

    expect(result.accessToken).toBeTruthy();
    expect(repository.updateMemberById).toHaveBeenCalledWith(
      member.id,
      expect.objectContaining({
        $set: expect.objectContaining({
          status: MemberStatus.Active,
        }),
      }),
    );
  });
});
