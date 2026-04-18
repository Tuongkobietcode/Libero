import { ReservationStatus } from '../common/types/enums';
import { logger } from '../common/middleware/requestLogger';
import { ReservationModel } from '../models/Reservation.model';
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
  } = {},
): Promise<HoldExpirySummary> {
  const now = options.now ?? new Date();
  const service = options.service ?? reservationService;
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

  const summary = {
    processedCount: reservations.length,
    expiredCount,
    failedCount,
    durationMs: Date.now() - startedAt,
  };

  logger.info({ job: 'hold-expiry', ...summary }, 'Hold expiry job completed');

  return summary;
}
