import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { RateLimitError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { sendRedisCommand } from '../../common/utils/redisCommand';
import { authController } from './auth.controller';

const authRouter = Router();

function createAuthRateLimiter(limit: number, code: typeof ERR[keyof typeof ERR], message: string) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => sendRedisCommand(...args),
      prefix: `auth:${code.toLowerCase()}:`,
    }),
    handler: (req, res, next) => {
      if (!req.requestId) {
        req.requestId = req.header('x-request-id') || randomUUID();
        res.setHeader('X-Request-Id', req.requestId);
      }

      next(new RateLimitError(code, 429, message));
    },
  });
}

const loginLimiter = createAuthRateLimiter(10, ERR.AUTH_TOO_MANY_ATTEMPTS, 'Too many login attempts. Please try again later.');
const refreshLimiter = createAuthRateLimiter(5, ERR.COMMON_RATE_LIMITED, 'Too many refresh attempts. Please try again later.');

authRouter.post('/login', loginLimiter, (req, res, next) => {
  void authController.login(req, res).catch(next);
});

authRouter.post('/refresh', refreshLimiter, (req, res, next) => {
  void authController.refresh(req, res).catch(next);
});

authRouter.post('/logout', (req, res, next) => {
  void authController.logout(req, res).catch(next);
});

authRouter.post('/register', (req, res, next) => {
  void authController.register(req, res).catch(next);
});

export { authRouter };
