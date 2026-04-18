import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import pino from 'pino';
import pinoHttp from 'pino-http';

import { env } from '../../config/env';

type RequestWithRequestId = IncomingMessage & {
  requestId?: string;
};

function getRequestId(request: IncomingMessage): string | undefined {
  return (request as RequestWithRequestId).requestId;
}

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export const requestLogger = pinoHttp({
  logger,
  quietReqLogger: true,
  genReqId: (req) => getRequestId(req) ?? randomUUID(),
  customProps: (req) => ({
    requestId: getRequestId(req),
  }),
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) {
      return 'error';
    }

    if (res.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  },
});
