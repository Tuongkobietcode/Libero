import type { NextFunction, Request, Response } from 'express';

import { AuthenticationError, ForbiddenError } from '../errors/AppError';
import { ERR } from '../errors/errorCodes';
import type { Role } from '../types/enums';

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError(ERR.AUTH_TOKEN_INVALID, 401, 'Authentication is required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      next(new ForbiddenError(ERR.AUTH_FORBIDDEN, 403, 'Insufficient permissions'));
      return;
    }

    next();
  };
}
