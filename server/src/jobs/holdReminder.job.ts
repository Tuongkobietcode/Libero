import { ReservationStatus } from '../common/types/enums';
import { addHours } from '../common/utils/dateHelpers';
import { logger } from '../common/middleware/requestLogger';
import { BookModel } from '../models/Book.model';
import { ReservationModel } from '../models/Reservation.model';
import { notificationService, type NotificationService } from '../modules/notification/notification.service';

export interface HoldReminderSummary {
  processedCount: number;
  queuedCount: number;
  skippedCount: number;
  failedCount: number;
  durationMs: number;
}

export async function runHoldReminderJob(
  options: {
    now?: Date;
    notifications?: NotificationService;
  } = {},
): Promise<HoldReminderSummary> {
  const now = options.now ?? new Date();
  const notifications = options.notifications ?? notificationService;
  const startedAt = Date.now();
  const reservations = await ReservationModel.find({
    status: ReservationStatus.Notified,
    holdExpiryAt: {
      $gt: now,
      $lte: addHours(now, 12),
    },
  })
    .sort({ holdExpiryAt: 1, createdAt: 1 })
    .exec();

  if (reservations.length === 0) {
    const emptySummary = {
      processedCount: 0,
      queuedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      durationMs: Date.now() - startedAt,
    };

    logger.info({ job: 'hold-reminder', ...emptySummary }, 'Hold reminder job completed');
    return emptySummary;
  }

  const books = await BookModel.find({
    _id: {
      $in: reservations.map((reservation) => reservation.bookId),
    },
  })
    .select('title')
    .exec();
  const bookMap = new Map<string, string>(books.map((book) => [book._id.toString(), book.title]));

  let queuedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const reservation of reservations) {
    if (!reservation.holdExpiryAt) {
      continue;
    }

    const title = bookMap.get(reservation.bookId.toString());

    if (!title) {
      continue;
    }

    const hoursLeft = Math.max(
      1,
      Math.ceil((reservation.holdExpiryAt.getTime() - now.getTime()) / (60 * 60 * 1000)),
    );
    try {
      const result = await notifications.enqueueHoldExpiring(
        reservation.memberId.toString(),
        reservation._id.toString(),
        title,
        reservation.holdExpiryAt,
        hoursLeft,
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
        { err: error, reservationId: reservation._id.toString(), job: 'hold-reminder' },
        'Hold reminder enqueue failed',
      );
    }
  }

  const summary = {
    processedCount: reservations.length,
    queuedCount,
    skippedCount,
    failedCount,
    durationMs: Date.now() - startedAt,
  };

  logger.info({ job: 'hold-reminder', ...summary }, 'Hold reminder job completed');

  return summary;
}
