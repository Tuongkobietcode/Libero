import type { ClientSession, Types } from 'mongoose';

import { NotFoundError } from '../errors/AppError';
import { ERR } from '../errors/errorCodes';
import { invalidateMemberCache } from './memberCache';
import { buildOverdueDates } from './loanFine';
import { env } from '../../config/env';

export interface MemberBlockRepository {
  findMemberById(
    memberId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<{ isBlocked: boolean } | null>;
  sumUnpaidFines(memberId: string | Types.ObjectId, session?: ClientSession): Promise<number>;
  findActiveOverdueLoanDueDates?(
    memberId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<Date[]>;
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
  overdueLoanCount: number;
  maxOverdueDays: number;
  reasons: string[];
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
  const overdueDueDates = (repository.findActiveOverdueLoanDueDates
    ? await repository.findActiveOverdueLoanDueDates(memberId, session)
    : []) ?? [];
  const overdueDaysByLoan = overdueDueDates.map((dueDate) => buildOverdueDates(dueDate, new Date()).length);
  const overdueLoanCount = overdueDaysByLoan.filter((days) => days > 0).length;
  const maxOverdueDays = overdueDaysByLoan.length > 0 ? Math.max(...overdueDaysByLoan) : 0;
  const reasons = [
    totalUnpaid >= env.FINE_BLOCK_THRESHOLD ? 'fine threshold' : null,
    overdueLoanCount >= env.OVERDUE_BLOCK_LOAN_COUNT_THRESHOLD ? 'overdue loan count threshold' : null,
    maxOverdueDays >= env.OVERDUE_BLOCK_DAYS_THRESHOLD ? 'overdue days threshold' : null,
  ].filter((reason): reason is string => reason !== null);
  const shouldBeBlocked = reasons.length > 0;

  if (member.isBlocked !== shouldBeBlocked) {
    await repository.updateMemberBlockedStatus(memberId, shouldBeBlocked, session);
    await invalidateMemberCache(memberId);
  }

  return {
    changed: member.isBlocked !== shouldBeBlocked,
    wasBlocked: member.isBlocked,
    isBlocked: shouldBeBlocked,
    totalUnpaid,
    overdueLoanCount,
    maxOverdueDays,
    reasons,
  };
}
