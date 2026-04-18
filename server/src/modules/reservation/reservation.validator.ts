import { z } from 'zod';

import { ReservationStatus } from '../../common/types/enums';
import type { ReservationScope } from './reservation.types';

const objectIdPattern = /^[a-f0-9]{24}$/i;

const scopeSchema: z.ZodType<ReservationScope> = z.enum(['all', 'active', 'history']);

export const reservationIdParamSchema = z.string().regex(objectIdPattern, 'Invalid reservation id');

export const createReservationSchema = z.object({
  bookId: z.string().regex(objectIdPattern, 'Invalid book id'),
});

export const myReservationsQuerySchema = z.object({
  scope: scopeSchema.optional(),
  status: z.nativeEnum(ReservationStatus).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listReservationsQuerySchema = myReservationsQuerySchema.extend({
  bookId: z.string().regex(objectIdPattern, 'Invalid book id').optional(),
  memberId: z.string().regex(objectIdPattern, 'Invalid member id').optional(),
});
