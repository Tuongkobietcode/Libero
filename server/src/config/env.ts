import path from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: serverEnvPath });
dotenv.config({ path: rootEnvPath, override: false });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  MONGODB_URI: z
    .string()
    .min(1)
    .regex(/^mongodb(\+srv)?:\/\/.+$/, 'MONGODB_URI must be a valid MongoDB connection string'),
  REDIS_URL: z
    .string()
    .min(1)
    .regex(/^rediss?:\/\/.+$/, 'REDIS_URL must be a valid Redis connection string'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive(),
  JWT_REFRESH_TTL: z.coerce.number().int().positive(),
  FINE_BLOCK_THRESHOLD: z.coerce.number().int().nonnegative(),
  OVERDUE_BLOCK_LOAN_COUNT_THRESHOLD: z.coerce.number().int().positive().default(3),
  OVERDUE_BLOCK_DAYS_THRESHOLD: z.coerce.number().int().positive().default(30),
  HOLD_EXPIRY_HOURS: z.coerce.number().int().positive(),
  FRONTEND_URL: z.string().url(),
  CORS_ORIGINS: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) {
          return true;
        }

        return value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
          .every((origin) => z.string().url().safeParse(origin).success);
      },
      { message: 'CORS_ORIGINS must be a comma-separated list of valid URLs' },
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
