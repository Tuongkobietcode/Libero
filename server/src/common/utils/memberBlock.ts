import type { ClientSession, Types } from 'mongoose';

import { NotFoundError } from '../errors/AppError';
import { ERR } from '../errors/errorCodes';
import { invalidateMemberCache } from './memberCache';
import { env } from '../../config/env';

export interface MemberBlockRepository {
  findMemberById(
    memberId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<{ isBlocked: boolean } | null>;
  sumUnpaidFines(memberId: string | Types.ObjectId, session?: ClientSession): Promise<number>;
  updateMemberBlockedStatus(
    memberId: string | Types.ObjectId,
    isBlocked: boolean,
    session?: ClientSession,
  ): Promise<void>;
}

export interface BlockRecalculationResult {
  changed: boolean;
  wasBlocked: boolean;
  isBlocked: boolean;
  totalUnpaid: number;
}

export async function recalculateMemberBlock(
  memberId: string,
  repository: MemberBlockRepository,
  session?: ClientSession,
): Promise<BlockRecalculationResult> {
  const member = await repository.findMemberById(memberId, session);

  if (!member) {
    throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
  }

  const totalUnpaid = await repository.sumUnpaidFines(memberId, session);
  const shouldBeBlocked = totalUnpaid >= env.FINE_BLOCK_THRESHOLD;

  if (member.isBlocked !== shouldBeBlocked) {
    await repository.updateMemberBlockedStatus(memberId, shouldBeBlocked, session);
    await invalidateMemberCache(memberId);
  }

  return {
    changed: member.isBlocked !== shouldBeBlocked,
    wasBlocked: member.isBlocked,
    isBlocked: shouldBeBlocked,
    totalUnpaid,
  };
}
