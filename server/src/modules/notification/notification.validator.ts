import { z } from 'zod';

const objectIdPattern = /^[a-f0-9]{24}$/i;

export const notificationIdParamSchema = z.string().regex(objectIdPattern, 'Invalid notification id');

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
