import { z } from 'zod';

import { CopyStatus } from '../../common/types/enums';
import type { ExportReportFormat, ExportReportType, OverdueSort, ReportGroupBy } from './report.types';

const objectIdPattern = /^[a-f0-9]{24}$/i;

const groupBySchema: z.ZodType<ReportGroupBy> = z.enum(['day', 'week', 'month']);
const overdueSortSchema: z.ZodType<OverdueSort> = z.enum([
  'overdueDays_desc',
  'overdueDays_asc',
  'dueDate_desc',
  'dueDate_asc',
]);
const exportTypeSchema: z.ZodType<ExportReportType> = z.enum(['loans', 'overdue', 'inventory', 'fines']);
const exportFormatSchema: z.ZodType<ExportReportFormat> = z.enum(['xlsx', 'pdf']);

const dateRangeShape = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

function withValidDateRange<T extends z.ZodRawShape>(shape: T) {
  return z
    .object(shape)
    .refine((value) => {
      const from = value.from as Date | undefined;
      const to = value.to as Date | undefined;

      return from === undefined || to === undefined || from.getTime() <= to.getTime();
    }, 'from must be before or equal to to');
}

export const loanSummaryQuerySchema = withValidDateRange({
  ...dateRangeShape,
  groupBy: groupBySchema.optional(),
});

export const overdueReportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: overdueSortSchema.optional(),
});

export const popularBooksQuerySchema = withValidDateRange({
  ...dateRangeShape,
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const inventoryReportQuerySchema = z.object({
  categoryId: z.string().regex(objectIdPattern, 'Invalid category id').optional(),
  status: z.nativeEnum(CopyStatus).optional(),
});

export const fineSummaryQuerySchema = withValidDateRange({
  ...dateRangeShape,
});

export const exportReportQuerySchema = withValidDateRange({
  ...dateRangeShape,
  type: exportTypeSchema,
  format: exportFormatSchema,
  groupBy: groupBySchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: overdueSortSchema.optional(),
  categoryId: z.string().regex(objectIdPattern, 'Invalid category id').optional(),
  status: z.nativeEnum(CopyStatus).optional(),
});
