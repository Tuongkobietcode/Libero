import { randomUUID } from 'node:crypto';

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { env } from '../../config/env';
import { RateLimitError } from '../errors/AppError';
import { ERR } from '../errors/errorCodes';
import { sendRedisCommand } from '../utils/redisCommand';

export const rateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  ...(env.NODE_ENV === 'production'
    ? {
        store: new RedisStore({
          sendCommand: (...args: string[]) => sendRedisCommand(...args),
          prefix: 'rl:global:',
        }),
      }
    : {}),
  handler: (req, res, next) => {
    if (!req.requestId) {
      req.requestId = req.header('x-request-id') || randomUUID();
      res.setHeader('X-Request-Id', req.requestId);
    }

    next(
      new RateLimitError(
        ERR.COMMON_RATE_LIMITED,
        429,
        'Too many requests. Please try again later.',
      ),
    );
  },
});
