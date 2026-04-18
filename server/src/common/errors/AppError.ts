import { ErrorCode } from './errorCodes';


export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    message: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError { }
export class ValidationError extends AppError { }
export class AuthenticationError extends AppError { }
export class ForbiddenError extends AppError { }
export class NotFoundError extends AppError { }
export class ConflictError extends AppError { }
export class BusinessRuleError extends AppError { }
export class RateLimitError extends AppError { }
