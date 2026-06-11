import { z } from 'zod';

import { BookHoldStatus } from '../../common/types/enums';

const objectIdPattern = /^[a-f0-9]{24}$/i;

export const bookHoldIdParamSchema = z.string().regex(objectIdPattern, 'Invalid book hold id');

export const createBookHoldSchema = z.object({
  bookId: z.string().regex(objectIdPattern, 'Invalid book id'),
});

export const listBookHoldsQuerySchema = z.object({
  status: z.nativeEnum(BookHoldStatus).optional(),
  memberId: z.string().regex(objectIdPattern, 'Invalid member id').optional(),
  bookId: z.string().regex(objectIdPattern, 'Invalid book id').optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
