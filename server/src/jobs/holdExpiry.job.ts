import { BookHoldStatus, ReservationStatus } from '../common/types/enums';
import { logger } from '../common/middleware/requestLogger';
import { BookHoldModel } from '../models/BookHold.model';
import { ReservationModel } from '../models/Reservation.model';
import { bookHoldService, type BookHoldService } from '../modules/bookHold/bookHold.service';
import { reservationService, type ReservationService } from '../modules/reservation/reservation.service';

export interface HoldExpirySummary {
  processedCount: number;
  expiredCount: number;
  failedCount: number;
  durationMs: number;
}

export async function runHoldExpiryJob(
  options: {
    now?: Date;
    service?: Pick<ReservationService, 'expireHold'>;
    bookHoldService?: Pick<BookHoldService, 'expireHold'>;
  } = {},
): Promise<HoldExpirySummary> {
  const now = options.now ?? new Date();
  const service = options.service ?? reservationService;
  const holdService = options.bookHoldService ?? bookHoldService;
  const startedAt = Date.now();
  const reservations = await ReservationModel.find({
    status: ReservationStatus.Notified,
    holdExpiryAt: {
      $lte: now,
    },
  })
    .select('_id')
    .sort({ holdExpiryAt: 1, createdAt: 1 })
    .exec();
  const bookHolds = await BookHoldModel.find({
    status: BookHoldStatus.Active,
    holdExpiryAt: {
      $lte: now,
    },
  })
    .select('_id')
    .sort({ holdExpiryAt: 1, createdAt: 1 })
    .exec();

  let expiredCount = 0;
  let failedCount = 0;

  for (const reservation of reservations) {
    try {
      await service.expireHold(reservation._id.toString());
      expiredCount += 1;
    } catch (error) {
      failedCount += 1;
      logger.error(
        { err: error, reservationId: reservation._id.toString(), job: 'hold-expiry' },
        'Hold expiry job failed for reservation',
      );
    }
  }

  for (const hold of bookHolds) {
    try {
      await holdService.expireHold(hold._id.toString());
      expiredCount += 1;
    } catch (error) {
      failedCount += 1;
      logger.error(
        { err: error, holdId: hold._id.toString(), job: 'hold-expiry' },
        'Hold expiry job failed for book hold',
      );
    }
  }

  const summary = {
    processedCount: reservations.length + bookHolds.length,
    expiredCount,
    failedCount,
    durationMs: Date.now() - startedAt,
  };

  logger.info({ job: 'hold-expiry', ...summary }, 'Hold expiry job completed');

  return summary;
}
