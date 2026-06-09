import { LoanStatus } from '../common/types/enums';
import { startOfVietnamCalendarDay } from '../common/utils/dateHelpers';
import { logger } from '../common/middleware/requestLogger';
import { LoanRecordModel } from '../models/LoanRecord.model';

export interface OverdueMarkerSummary {
  processedCount: number;
  updatedCount: number;
  durationMs: number;
}

export async function runOverdueMarkerJob(now: Date = new Date()): Promise<OverdueMarkerSummary> {
  const startedAt = Date.now();
  const todayStart = startOfVietnamCalendarDay(now);
  const result = await LoanRecordModel.updateMany(
    {
      status: LoanStatus.Active,
      returnDate: null,
      dueDate: {
        $lt: todayStart,
      },
    },
    {
      $set: {
        status: LoanStatus.Overdue,
      },
    },
  ).exec();

  const summary = {
    processedCount: result.matchedCount,
    updatedCount: result.modifiedCount,
    durationMs: Date.now() - startedAt,
  };

  logger.info({ job: 'overdue-marker', ...summary }, 'Overdue marker job completed');

  return summary;
}
