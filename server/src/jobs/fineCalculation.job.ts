import { Types } from 'mongoose';

import { LoanStatus, FineStatus } from '../common/types/enums';
import { startOfUtcDay } from '../common/utils/dateHelpers';
import { buildOverdueDates, getApplicableFineRate } from '../common/utils/loanFine';
import { recalculateMemberBlock } from '../common/utils/memberBlock';
import { logger } from '../common/middleware/requestLogger';
import { FineRecordModel } from '../models/FineRecord.model';
import { LoanRecordModel } from '../models/LoanRecord.model';
import { fineRepository, type FineRepository } from '../modules/fine/fine.repository';
import { notificationService, type NotificationService } from '../modules/notification/notification.service';

interface ExistingFineRecordKey {
  loanId: string;
  overdueDate: string;
}

export interface FineCalculationSummary {
  processedLoans: number;
  fineCandidates: number;
  finesCreated: number;
  blockChanges: number;
  failedNotifications: number;
  durationMs: number;
}

function buildFineRecordKey(loanId: string, overdueDate: Date): ExistingFineRecordKey {
  return {
    loanId,
    overdueDate: startOfUtcDay(overdueDate).toISOString(),
  };
}

export async function runFineCalculationJob(
  options: {
    now?: Date;
    repository?: FineRepository;
    notifications?: NotificationService;
  } = {},
): Promise<FineCalculationSummary> {
  const now = options.now ?? new Date();
  const repository = options.repository ?? fineRepository;
  const notifications = options.notifications ?? notificationService;
  const startedAt = Date.now();
  const todayStart = startOfUtcDay(now);
  const overdueLoans = await LoanRecordModel.find({
    status: LoanStatus.Overdue,
    returnDate: null,
    dueDate: {
      $lt: todayStart,
    },
  })
    .sort({ dueDate: 1, createdAt: 1 })
    .exec();

  if (overdueLoans.length === 0) {
    const emptySummary = {
      processedLoans: 0,
      fineCandidates: 0,
      finesCreated: 0,
      blockChanges: 0,
      failedNotifications: 0,
      durationMs: Date.now() - startedAt,
    };

    logger.info({ job: 'fine-calculation', ...emptySummary }, 'Fine calculation job completed');
    return emptySummary;
  }

  const fineRates = (await repository.listFineRates()).filter(
    (fineRate) => fineRate.effectiveFrom.getTime() <= todayStart.getTime(),
  );

  if (fineRates.length === 0) {
    throw new Error('Fine calculation job cannot run without an effective fine rate');
  }

  const loanIds = overdueLoans.map((loan) => loan._id);
  const existingFineRecords = await FineRecordModel.find({
    loanId: {
      $in: loanIds,
    },
  })
    .select('loanId overdueDate')
    .exec();

  const existingFineKeySet = new Set(
    existingFineRecords.map((fineRecord) => {
      const key = buildFineRecordKey(
        fineRecord.loanId.toString(),
        fineRecord.overdueDate,
      );

      return `${key.loanId}:${key.overdueDate}`;
    }),
  );

  const pendingFineRecords: Array<{
    loanId: Types.ObjectId;
    memberId: Types.ObjectId;
    overdueDate: Date;
    amount: number;
    status: FineStatus;
    note: string;
  }> = [];
  const affectedMemberIds = new Set<string>();

  for (const loan of overdueLoans) {
    const overdueDates = buildOverdueDates(loan.dueDate, todayStart);

    for (const overdueDate of overdueDates) {
      const key = buildFineRecordKey(loan._id.toString(), overdueDate);
      const serializedKey = `${key.loanId}:${key.overdueDate}`;

      if (existingFineKeySet.has(serializedKey)) {
        continue;
      }

      const fineRate = getApplicableFineRate(fineRates, overdueDate);

      pendingFineRecords.push({
        loanId: loan._id,
        memberId: loan.memberId,
        overdueDate,
        amount: fineRate.ratePerDay,
        status: FineStatus.Unpaid,
        note: 'Overdue fine',
      });
      existingFineKeySet.add(serializedKey);
      affectedMemberIds.add(loan.memberId.toString());
    }
  }

  let finesCreated = 0;

  if (pendingFineRecords.length > 0) {
    try {
      const insertedRecords = await FineRecordModel.insertMany(pendingFineRecords, {
        ordered: false,
      });
      finesCreated = insertedRecords.length;
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) {
        throw error;
      }
    }
  }

  let blockChanges = 0;
  let failedNotifications = 0;

  for (const memberId of affectedMemberIds) {
    const blockChange = await recalculateMemberBlock(memberId, repository);

    if (!blockChange.changed) {
      continue;
    }

    blockChanges += 1;

    try {
      if (blockChange.isBlocked) {
        await notifications.enqueueAccountBlocked(
          memberId,
          memberId,
          'Outstanding unpaid fines exceeded the allowed threshold.',
          blockChange.totalUnpaid,
          now,
        );
      } else {
        await notifications.enqueueAccountActivated(memberId, memberId, now);
      }
    } catch (error) {
      failedNotifications += 1;
      logger.error(
        { err: error, memberId, job: 'fine-calculation' },
        'Fine calculation job failed to enqueue block status notification',
      );
    }
  }

  const summary = {
    processedLoans: overdueLoans.length,
    fineCandidates: pendingFineRecords.length,
    finesCreated,
    blockChanges,
    failedNotifications,
    durationMs: Date.now() - startedAt,
  };

  logger.info({ job: 'fine-calculation', ...summary }, 'Fine calculation job completed');

  return summary;
}
