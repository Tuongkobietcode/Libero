import { z } from 'zod';

import { LoanStatus } from '../../common/types/enums';

const objectIdPattern = /^[a-f0-9]{24}$/i;

function trimToUndefined(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

const optionalTrimmedStringSchema = z
  .string()
  .transform((value) => trimToUndefined(value))
  .optional();

export const loanIdParamSchema = z.string().regex(objectIdPattern, 'Invalid loan id');

export const checkoutLoanSchema = z.object({
  memberId: z.string().regex(objectIdPattern, 'Invalid member id'),
  barcode: z.string().trim().min(1).max(100),
});

export const returnByBarcodeSchema = z.object({
  barcode: z.string().trim().min(1).max(100),
});

export const markLostSchema = z.object({
  notes: optionalTrimmedStringSchema,
  bookValue: z.coerce.number().min(0).optional(),
});

export const loanHistoryQuerySchema = z.object({
  status: z.nativeEnum(LoanStatus).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listLoansQuerySchema = loanHistoryQuerySchema.extend({
  memberId: z.string().regex(objectIdPattern, 'Invalid member id').optional(),
});
