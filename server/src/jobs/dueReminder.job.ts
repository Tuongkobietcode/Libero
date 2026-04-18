import { LoanStatus } from '../common/types/enums';
import { uniqueObjectIds } from '../common/utils/collectionHelpers';
import { addDays, endOfUtcDay, startOfUtcDay } from '../common/utils/dateHelpers';
import { logger } from '../common/middleware/requestLogger';
import { env } from '../config/env';
import { BookModel } from '../models/Book.model';
import { LoanRecordModel } from '../models/LoanRecord.model';
import { notificationService, type NotificationService } from '../modules/notification/notification.service';

export interface DueReminderSummary {
  processedCount: number;
  queuedCount: number;
  skippedCount: number;
  failedCount: number;
  durationMs: number;
}

export async function runDueReminderJob(
  options: {
    now?: Date;
    notifications?: NotificationService;
  } = {},
): Promise<DueReminderSummary> {
  const now = options.now ?? new Date();
  const notifications = options.notifications ?? notificationService;
  const startedAt = Date.now();
  const todayStart = startOfUtcDay(now);
  const dueWindowEnd = endOfUtcDay(addDays(todayStart, 3));
  const loans = await LoanRecordModel.find({
    status: LoanStatus.Active,
    returnDate: null,
    dueDate: {
      $gte: todayStart,
      $lte: dueWindowEnd,
    },
  })
    .sort({ dueDate: 1, createdAt: 1 })
    .exec();

  if (loans.length === 0) {
    const emptySummary = {
      processedCount: 0,
      queuedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      durationMs: Date.now() - startedAt,
    };

    logger.info({ job: 'due-reminder', ...emptySummary }, 'Due reminder job completed');
    return emptySummary;
  }

  const bookIds = uniqueObjectIds(loans.map((loan) => loan.bookId));
  const books = await BookModel.find({
    _id: {
      $in: bookIds,
    },
  })
    .select('title')
    .exec();
  const bookMap = new Map<string, string>(books.map((book) => [book._id.toString(), book.title]));

  let queuedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const loan of loans) {
    const title = bookMap.get(loan.bookId.toString());

    if (!title) {
      continue;
    }

    try {
      const result = await notifications.enqueueDueReminder(
        loan.memberId.toString(),
        loan._id.toString(),
        [
          {
            title,
            dueDate: loan.dueDate,
            renewLink: `${env.FRONTEND_URL.replace(/\/$/, '')}/my-loans`,
          },
        ],
        now,
      );

      if (result.skipped) {
        skippedCount += 1;
      } else {
        queuedCount += 1;
      }
    } catch (error) {
      failedCount += 1;
      logger.error({ err: error, loanId: loan._id.toString(), job: 'due-reminder' }, 'Due reminder enqueue failed');
    }
  }

  const summary = {
    processedCount: loans.length,
    queuedCount,
    skippedCount,
    failedCount,
    durationMs: Date.now() - startedAt,
  };

  logger.info({ job: 'due-reminder', ...summary }, 'Due reminder job completed');

  return summary;
}
