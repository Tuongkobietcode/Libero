import type { Request } from 'express';
import type { ClientSession, HydratedDocument, Types, UpdateQuery } from 'mongoose';

import type { MemberStatus } from '../../common/types/enums';
import type { Member, MemberMethods } from '../../models/Member.model';
import type { RefreshToken } from '../../models/RefreshToken.model';
import type { Role } from '../../common/types/enums';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  fullName: string;
  email: string;
  phone: string;
  studentId: string;
  faculty: string;
  className: string;
  password: string;
}

export interface AuthTokenPayload {
  memberId: string;
  role: Role;
}

export interface AuthenticatedUser {
  _id: string;
  role: Role;
  isBlocked: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends AuthTokens {
  user: AuthenticatedUser;
}

export interface RefreshResult extends AuthTokens {
  user: AuthenticatedUser;
}

export interface RegisterResult {
  memberId: string;
  status: string;
}

export interface CreateMemberInput {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  studentId?: string;
  role: Role;
  memberCardNo: string;
  status: MemberStatus | string;
  joinDate?: Date;
  expiryDate?: Date;
  faculty?: string;
  className?: string;
  membershipTier?: string;
  lastLoginAt?: Date | null;
  passwordUpdatedAt?: Date | null;
  isBlocked?: boolean;
  failedLoginCount?: number;
  lockedUntil?: Date | null;
}

export interface CreateRefreshTokenInput {
  memberId: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

export type MemberAuthDocument = HydratedDocument<Member, MemberMethods>;
export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

export interface AuthRepository {
  findMemberByEmail(email: string): Promise<MemberAuthDocument | null>;
  findMemberById(memberId: string): Promise<MemberAuthDocument | null>;
  emailExists(email: string): Promise<boolean>;
  studentIdExists(studentId: string): Promise<boolean>;
  phoneExists(phone: string): Promise<boolean>;
  createMember(input: CreateMemberInput, session?: ClientSession): Promise<MemberAuthDocument>;
  getNextMemberCardNo(date?: Date): Promise<string>;
  updateMemberById(memberId: string, update: UpdateQuery<Member>, session?: ClientSession): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenDocument | null>;
  createRefreshToken(input: CreateRefreshTokenInput, session?: ClientSession): Promise<RefreshTokenDocument>;
  revokeRefreshTokenById(refreshTokenId: string, revokedAt: Date, session?: ClientSession): Promise<void>;
  revokeRefreshTokenFamily(memberId: string, familyId: string, revokedAt: Date): Promise<void>;
  revokeAllRefreshTokensForMember(memberId: string, revokedAt: Date, session?: ClientSession): Promise<void>;
}

export interface RedisAuthStore {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
