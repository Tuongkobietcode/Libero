import { FineStatus, LoanStatus } from '../common/types/enums';
import { startOfUtcDay } from '../common/utils/dateHelpers';
import { logger } from '../common/middleware/requestLogger';
import { BookModel } from '../models/Book.model';
import { FineRecordModel } from '../models/FineRecord.model';
import { LoanRecordModel } from '../models/LoanRecord.model';
import { notificationService, type NotificationService } from '../modules/notification/notification.service';

export interface OverdueReminderSummary {
  processedMembers: number;
  queuedCount: number;
  skippedCount: number;
  failedCount: number;
  durationMs: number;
}

export async function runOverdueReminderJob(
  options: {
    now?: Date;
    notifications?: NotificationService;
  } = {},
): Promise<OverdueReminderSummary> {
  const now = options.now ?? new Date();
  const notifications = options.notifications ?? notificationService;
  const startedAt = Date.now();
  const overdueLoans = await LoanRecordModel.find({
    status: LoanStatus.Overdue,
    returnDate: null,
  })
    .sort({ memberId: 1, dueDate: 1, createdAt: 1 })
    .exec();

  if (overdueLoans.length === 0) {
    const emptySummary = {
      processedMembers: 0,
      queuedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      durationMs: Date.now() - startedAt,
    };

    logger.info({ job: 'overdue-reminder', ...emptySummary }, 'Overdue reminder job completed');
    return emptySummary;
  }

  const books = await BookModel.find({
    _id: {
      $in: overdueLoans.map((loan) => loan.bookId),
    },
  })
    .select('title')
    .exec();
  const bookMap = new Map<string, string>(books.map((book) => [book._id.toString(), book.title]));
  const fineRecords = await FineRecordModel.find({
    loanId: {
      $in: overdueLoans.map((loan) => loan._id),
    },
    status: FineStatus.Unpaid,
  })
    .select('loanId amount')
    .exec();
  const fineTotalByLoanId = new Map<string, number>();

  for (const fineRecord of fineRecords) {
    const loanId = fineRecord.loanId.toString();
    fineTotalByLoanId.set(loanId, (fineTotalByLoanId.get(loanId) ?? 0) + fineRecord.amount);
  }

  const overdueByMember = new Map<string, Array<{
    referenceId: string;
    title: string;
    overdueDays: number;
    fineAmount: number;
  }>>();
  const todayStart = startOfUtcDay(now);

  for (const loan of overdueLoans) {
    const title = bookMap.get(loan.bookId.toString());

    if (!title) {
      continue;
    }

    const booksForMember = overdueByMember.get(loan.memberId.toString()) ?? [];
    booksForMember.push({
      referenceId: loan._id.toString(),
      title,
      overdueDays: Math.max(
        1,
        Math.floor((todayStart.getTime() - startOfUtcDay(loan.dueDate).getTime()) / (24 * 60 * 60 * 1000)),
      ),
      fineAmount: fineTotalByLoanId.get(loan._id.toString()) ?? 0,
    });
    overdueByMember.set(loan.memberId.toString(), booksForMember);
  }

  let queuedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const [memberId, booksForMember] of overdueByMember.entries()) {
    const totalFine = booksForMember.reduce((total, book) => total + book.fineAmount, 0);
    try {
      const result = await notifications.enqueueOverdueNotice(
        memberId,
        memberId,
        booksForMember.map(({ title, overdueDays, fineAmount }) => ({
          title,
          overdueDays,
          fineAmount,
        })),
        totalFine,
        now,
      );

      if (result.skipped) {
        skippedCount += 1;
      } else {
        queuedCount += 1;
      }
    } catch (error) {
      failedCount += 1;
      logger.error(
        { err: error, memberId, job: 'overdue-reminder' },
        'Overdue reminder enqueue failed',
      );
    }
  }

  const summary = {
    processedMembers: overdueByMember.size,
    queuedCount,
    skippedCount,
    failedCount,
    durationMs: Date.now() - startedAt,
  };

  logger.info({ job: 'overdue-reminder', ...summary }, 'Overdue reminder job completed');

  return summary;
}
