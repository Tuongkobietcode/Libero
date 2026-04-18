import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError, BadRequestError, ConflictError, ValidationError } from '../errors/AppError';
import { ERR } from '../errors/errorCodes';
import { logger } from './requestLogger';

function ensureRequestId(req: Request, res: Response): string {
  if (!req.requestId) {
    req.requestId = req.header('x-request-id') || randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
  }

  return req.requestId;
}

function toErrorResponse(error: AppError, requestId: string) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = ensureRequestId(req, res);

  if (error instanceof AppError) {
    res.status(error.statusCode).json(toErrorResponse(error, requestId));
    return;
  }

  if (error instanceof ZodError) {
    const validationError = new ValidationError(
      ERR.COMMON_VALIDATION,
      400,
      'Request validation failed',
      {
        issues: error.flatten(),
      },
    );

    res.status(validationError.statusCode).json(toErrorResponse(validationError, requestId));
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    const badRequestError = new BadRequestError(
      ERR.COMMON_INVALID_JSON,
      400,
      'Request body contains invalid JSON',
    );

    res.status(badRequestError.statusCode).json(toErrorResponse(badRequestError, requestId));
    return;
  }

  if (isMongooseValidationError(error)) {
    const validationError = new ValidationError(
      ERR.COMMON_VALIDATION,
      400,
      'Database validation failed',
      {
        errors: error.errors,
      },
    );

    res.status(validationError.statusCode).json(toErrorResponse(validationError, requestId));
    return;
  }

  if (isMongoDuplicateKeyError(error)) {
    const conflictError = new ConflictError(
      ERR.COMMON_BAD_REQUEST,
      409,
      'Duplicate key error',
      {
        keyValue: error.keyValue,
      },
    );

    res.status(conflictError.statusCode).json(toErrorResponse(conflictError, requestId));
    return;
  }

  logger.error({ err: error, requestId }, 'Unhandled application error');

  const internalError = new AppError(ERR.INTERNAL, 500, 'Internal server error');
  res.status(internalError.statusCode).json(toErrorResponse(internalError, requestId));
}

function isMongooseValidationError(
  error: unknown,
): error is { name: 'ValidationError'; errors: Record<string, unknown> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ValidationError' &&
    'errors' in error
  );
}

function isMongoDuplicateKeyError(
  error: unknown,
): error is { code: 11000; keyValue?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
