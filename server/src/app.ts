import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { NotFoundError } from './common/errors/AppError';
import { ERR } from './common/errors/errorCodes';
import { errorHandler } from './common/middleware/errorHandler';
import { rateLimiter } from './common/middleware/rateLimiter';
import { requestId } from './common/middleware/requestId';
import { requestLogger } from './common/middleware/requestLogger';
import { getDatabaseStatus } from './config/database';
import { env } from './config/env';
import { getRedisStatus } from './config/redis';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { fineConfigRouter, fineRouter } from './modules/fine/fine.routes';
import { loanRouter } from './modules/loan/loan.routes';
import { authRouter } from './modules/member/auth.routes';
import { configRouter, memberRouter } from './modules/member/member.routes';
import { reportRouter } from './modules/report/report.routes';
import { reservationRouter } from './modules/reservation/reservation.routes';

export const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiter);
app.use(requestId);
app.use(requestLogger);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/books', catalogRouter);
app.use('/api/v1/fines', fineRouter);
app.use('/api/v1/loans', loanRouter);
app.use('/api/v1/members', memberRouter);
app.use('/api/v1/reservations', reservationRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/config', configRouter);
app.use('/api/v1/config', fineConfigRouter);

app.get('/api/v1/health', (_req, res) => {
  const db = getDatabaseStatus();
  const redis = getRedisStatus();
  const status = db === 'connected' && redis === 'connected' ? 'ok' : 'degraded';

  res.status(200).json({
    status,
    api: 'ok',
    db,
    redis,
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, _res, next) => {
  next(new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Route not found'));
});

app.use(errorHandler);
