import type { FineRateDocument } from '../../models/FineRate.model';
import { NotFoundError } from '../errors/AppError';
import { ERR } from '../errors/errorCodes';
import { addDays, startOfUtcDay } from './dateHelpers';

export function buildOverdueDates(dueDate: Date, endDate: Date): Date[] {
  const overdueStart = startOfUtcDay(addDays(dueDate, 1));
  const overdueEnd = startOfUtcDay(endDate);

  if (overdueStart.getTime() > overdueEnd.getTime()) {
    return [];
  }

  const dates: Date[] = [];

  for (let cursor = overdueStart; cursor.getTime() <= overdueEnd.getTime(); cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }

  return dates;
}

export function getApplicableFineRate(fineRates: FineRateDocument[], overdueDate: Date): FineRateDocument {
  const fineRate = fineRates.find((entry) => entry.effectiveFrom.getTime() <= overdueDate.getTime());

  if (!fineRate) {
    throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Fine rate not found');
  }

  return fineRate;
}
