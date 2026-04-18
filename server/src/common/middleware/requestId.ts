import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const headerRequestId = req.header('x-request-id');
  const resolvedRequestId = headerRequestId && headerRequestId.trim() ? headerRequestId : randomUUID();

  req.requestId = resolvedRequestId;
  res.setHeader('X-Request-Id', resolvedRequestId);

  next();
}
