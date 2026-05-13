import { createHash, randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import mongoose from 'mongoose';

import { AuthenticationError, BusinessRuleError, ConflictError, RateLimitError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { MemberStatus, Role } from '../../common/types/enums';
import { invalidateMemberCache } from '../../common/utils/memberCache';
import { env } from '../../config/env';
import { assertCanAuthenticateWithMemberStatus } from './authStatus';
import type {
  AuthRepository,
  AuthTokenPayload,
  AuthenticatedUser,
  AuthTokens,
  LoginDto,
  LoginResult,
  MemberAuthDocument,
  RedisAuthStore,
  RefreshResult,
  RegisterDto,
  RegisterResult,
} from './auth.types';

const FAILED_LOGIN_TTL_SECONDS = 15 * 60;
const MAX_FAILED_LOGINS = 5;
const ACCOUNT_LOCK_MINUTES = 30;
const PASSWORD_BCRYPT_COST = 12;

function buildFailedLoginKey(email: string): string {
  return `login_fail:${email.toLowerCase()}`;
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildAuthenticatedUser(member: MemberAuthDocument): AuthenticatedUser {
  return {
    _id: member.id,
    role: member.role,
    isBlocked: member.isBlocked,
  };
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly redisStore: RedisAuthStore,
  ) {}

  async register(input: RegisterDto): Promise<RegisterResult> {
    const normalizedEmail = input.email.toLowerCase();

    if (await this.repository.emailExists(normalizedEmail)) {
      throw new ConflictError(ERR.MEM_EMAIL_EXISTS, 409, 'Email already exists');
    }

    if (input.studentId && (await this.repository.studentIdExists(input.studentId))) {
      throw new ConflictError(ERR.MEM_STUDENT_ID_EXISTS, 409, 'Student ID already exists');
    }

    const memberCardNo = await this.repository.getNextMemberCardNo();
    const passwordHash = await bcrypt.hash(input.password, PASSWORD_BCRYPT_COST);

    const member = await this.repository.createMember({
      fullName: input.fullName,
      email: normalizedEmail,
      passwordHash,
      studentId: input.studentId,
      role: Role.Student,
      memberCardNo,
      status: MemberStatus.Pending,
      passwordUpdatedAt: new Date(),
    });

    return {
      memberId: member.id,
      status: member.status,
    };
  }

  async login(input: LoginDto): Promise<LoginResult> {
    const normalizedEmail = input.email.toLowerCase();
    const member = await this.repository.findMemberByEmail(normalizedEmail);

    if (member?.isLocked()) {
      throw new RateLimitError(ERR.AUTH_TOO_MANY_ATTEMPTS, 429, 'Account is temporarily locked');
    }

    if (!member || !(await member.comparePassword(input.password))) {
      const thresholdReached = await this.handleFailedLogin(normalizedEmail, member?.id);

      if (thresholdReached) {
        throw new RateLimitError(ERR.AUTH_TOO_MANY_ATTEMPTS, 429, 'Too many failed login attempts');
      }

      throw new AuthenticationError(ERR.AUTH_INVALID_CREDENTIALS, 401, 'Invalid email or password');
    }

    assertCanAuthenticateWithMemberStatus(member.status);

    await this.resetFailedLogin(member.id, normalizedEmail);

    await this.repository.updateMemberById(member.id, { $set: { lastLoginAt: new Date() } });

    const tokens = await this.issueTokenPair(member.id, member.role);

    return {
      ...tokens,
      user: buildAuthenticatedUser(member),
    };
  }

  async refreshTokens(rawToken: string): Promise<RefreshResult> {
    const tokenHash = hashRefreshToken(rawToken);
    const refreshToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (!refreshToken) {
      throw new AuthenticationError(ERR.AUTH_REFRESH_INVALID, 401, 'Refresh token is invalid');
    }

    if (refreshToken.revokedAt) {
      await this.repository.revokeRefreshTokenFamily(refreshToken.memberId.toString(), refreshToken.familyId, new Date());
      throw new AuthenticationError(ERR.AUTH_REFRESH_REUSE, 401, 'Refresh token reuse detected');
    }

    if (refreshToken.expiresAt.getTime() <= Date.now()) {
      await this.repository.revokeRefreshTokenById(refreshToken.id, new Date());
      throw new AuthenticationError(ERR.AUTH_REFRESH_INVALID, 401, 'Refresh token has expired');
    }

    const member = await this.repository.findMemberById(refreshToken.memberId.toString());

    if (!member) {
      await this.repository.revokeRefreshTokenFamily(refreshToken.memberId.toString(), refreshToken.familyId, new Date());
      throw new AuthenticationError(ERR.AUTH_REFRESH_INVALID, 401, 'Refresh token is invalid');
    }

    try {
      assertCanAuthenticateWithMemberStatus(member.status);
    } catch (error) {
      await this.repository.revokeAllRefreshTokensForMember(member.id, new Date());
      await invalidateMemberCache(member.id);
      throw error;
    }

    const tokens = await this.rotateRefreshToken(refreshToken.id, member.id, member.role, refreshToken.familyId);

    return {
      ...tokens,
      user: buildAuthenticatedUser(member),
    };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawToken);
    const refreshToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (!refreshToken || refreshToken.revokedAt) {
      return;
    }

    await this.repository.revokeRefreshTokenById(refreshToken.id, new Date());
  }

  signAccessToken(memberId: string, role: Role): string {
    return jwt.sign(
      { memberId, role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL },
    );
  }

  verifyAccessToken(accessToken: string): AuthTokenPayload {
    try {
      const payload = jwt.verify(accessToken, env.JWT_SECRET) as Partial<AuthTokenPayload>;

      if (!payload.memberId || !payload.role) {
        throw new AuthenticationError(ERR.AUTH_TOKEN_INVALID, 401, 'Access token payload is invalid');
      }

      return {
        memberId: payload.memberId,
        role: payload.role,
      };
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AuthenticationError(ERR.AUTH_TOKEN_EXPIRED, 401, 'Access token has expired');
      }

      if (error instanceof JsonWebTokenError) {
        throw new AuthenticationError(ERR.AUTH_TOKEN_INVALID, 401, 'Access token is invalid');
      }

      throw error;
    }
  }

  private async issueTokenPair(memberId: string, role: Role, familyId: string = randomUUID()): Promise<AuthTokens> {
    const refreshToken = randomUUID();
    const accessToken = this.signAccessToken(memberId, role);

    await this.repository.createRefreshToken({
      memberId: new mongoose.Types.ObjectId(memberId),
      tokenHash: hashRefreshToken(refreshToken),
      familyId,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async rotateRefreshToken(
    refreshTokenId: string,
    memberId: string,
    role: Role,
    familyId: string,
  ): Promise<AuthTokens> {
    const session = await mongoose.startSession();

    try {
      let issuedTokens: AuthTokens | null = null;

      await session.withTransaction(async () => {
        await this.repository.revokeRefreshTokenById(refreshTokenId, new Date(), session);

        const nextRefreshToken = randomUUID();
        const nextAccessToken = this.signAccessToken(memberId, role);

        await this.repository.createRefreshToken(
          {
            memberId: new mongoose.Types.ObjectId(memberId),
            tokenHash: hashRefreshToken(nextRefreshToken),
            familyId,
            expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000),
          },
          session,
        );

        issuedTokens = {
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
        };
      });

      if (!issuedTokens) {
        throw new BusinessRuleError(ERR.AUTH_REFRESH_INVALID, 401, 'Refresh token rotation failed');
      }

      return issuedTokens;
    } finally {
      await session.endSession();
    }
  }

  private async handleFailedLogin(email: string, memberId?: string): Promise<boolean> {
    const failedLoginKey = buildFailedLoginKey(email);
    const attempts = await this.redisStore.incr(failedLoginKey);

    if (attempts === 1) {
      await this.redisStore.expire(failedLoginKey, FAILED_LOGIN_TTL_SECONDS);
    }

    if (memberId) {
      const update: Record<string, unknown> = {
        $inc: { failedLoginCount: 1 },
      };

      if (attempts >= MAX_FAILED_LOGINS) {
        update.$set = {
          lockedUntil: new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000),
        };
      }

      await this.repository.updateMemberById(memberId, update);

      if (attempts >= MAX_FAILED_LOGINS) {
        await invalidateMemberCache(memberId);
      }
    }

    return attempts >= MAX_FAILED_LOGINS;
  }

  private async resetFailedLogin(memberId: string, email: string): Promise<void> {
    await this.redisStore.del(buildFailedLoginKey(email));
    await this.repository.updateMemberById(memberId, {
      $set: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }
}
