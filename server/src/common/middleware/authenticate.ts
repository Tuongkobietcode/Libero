import type { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors/AppError';
import { ERR } from '../errors/errorCodes';
import type { MemberStatus, Role } from '../types/enums';
import { buildMemberCacheKey } from '../utils/memberCache';
import { getRedisClient } from '../../config/redis';
import { AuthService } from '../../modules/member/auth.service';
import { assertCanAuthenticateWithMemberStatus } from '../../modules/member/authStatus';
import type { MemberAuthDocument } from '../../modules/member/auth.types';
import { memberRepository } from '../../modules/member/member.repository';

const MEMBER_CACHE_TTL_SECONDS = 300;
let authService: AuthService | null = null;

interface CachedMember {
  _id: string;
  role: Role;
  status: MemberStatus;
  isBlocked: boolean;
}

function toCachedMember(member: Pick<MemberAuthDocument, 'id' | 'role' | 'status' | 'isBlocked'>): CachedMember {
  return {
    _id: member.id,
    role: member.role,
    status: member.status,
    isBlocked: member.isBlocked,
  };
}

function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService(memberRepository, getRedisClient());
  }

  return authService;
}

function extractBearerToken(request: Request): string {
  const authorizationHeader = request.header('authorization');

  if (!authorizationHeader) {
    throw new AuthenticationError(ERR.AUTH_TOKEN_INVALID, 401, 'Access token is required');
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new AuthenticationError(ERR.AUTH_TOKEN_INVALID, 401, 'Authorization header must use Bearer token');
  }

  return token;
}

async function getCachedMember(memberId: string): Promise<CachedMember | null> {
  try {
    const cachedValue = await getRedisClient().get(buildMemberCacheKey(memberId));

    if (!cachedValue) {
      return null;
    }

    return JSON.parse(cachedValue) as CachedMember;
  } catch {
    return null;
  }
}

async function cacheMember(member: CachedMember): Promise<void> {
  try {
    await getRedisClient().set(
      buildMemberCacheKey(member._id),
      JSON.stringify(member),
      'EX',
      MEMBER_CACHE_TTL_SECONDS,
    );
  } catch {
    return;
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const accessToken = extractBearerToken(req);
    const payload = getAuthService().verifyAccessToken(accessToken);
    const cachedMember = await getCachedMember(payload.memberId);
    const dbMember = cachedMember ? null : await memberRepository.findMemberById(payload.memberId);
    const member = cachedMember ?? (dbMember ? toCachedMember(dbMember) : null);

    if (!member) {
      throw new AuthenticationError(ERR.AUTH_TOKEN_INVALID, 401, 'Authenticated member no longer exists');
    }

    assertCanAuthenticateWithMemberStatus(member.status);

    if (dbMember) {
      await cacheMember(toCachedMember(dbMember));
    }

    req.user = {
      _id: member._id,
      role: member.role,
      isBlocked: member.isBlocked,
    };

    next();
  } catch (error) {
    next(error);
  }
}
