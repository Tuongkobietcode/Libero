import { z } from 'zod';

import { FineStatus } from '../../common/types/enums';

const objectIdPattern = /^[a-f0-9]{24}$/i;

export const fineIdParamSchema = z.string().regex(objectIdPattern, 'Invalid fine id');

export const fineListQuerySchema = z.object({
  memberId: z.string().regex(objectIdPattern, 'Invalid member id').optional(),
  status: z.nativeEnum(FineStatus).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const myFineListQuerySchema = fineListQuerySchema.omit({ memberId: true });

export const payFinesSchema = z.object({
  fineIds: z
    .array(z.string().regex(objectIdPattern, 'Invalid fine id'))
    .min(1)
    .max(100)
    .refine((fineIds) => new Set(fineIds).size === fineIds.length, 'fineIds must be unique'),
});

export const waiveFineSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const createFineRateSchema = z.object({
  ratePerDay: z.coerce.number().min(0),
  effectiveFrom: z.coerce.date(),
  appliesTo: z.string().trim().min(1).max(100).optional(),
});
