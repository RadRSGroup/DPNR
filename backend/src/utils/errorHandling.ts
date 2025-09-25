/**
 * Standardized Error Handling Utilities
 * Provides scalable, consistent error handling patterns across the application
 */

import { Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { APIResponse, APIError, BaseRequest } from '../types/express';

// Standard Error Codes
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Database
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Business Logic
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// Custom Application Errors
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: any,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Factory functions for common errors
export const createError = {
  unauthorized: (message = 'Authentication required', details?: any) =>
    new AppError(message, 401, ErrorCode.UNAUTHORIZED, details),

  forbidden: (message = 'Insufficient permissions', details?: any) =>
    new AppError(message, 403, ErrorCode.FORBIDDEN, details),

  notFound: (resource = 'Resource', details?: any) =>
    new AppError(`${resource} not found`, 404, ErrorCode.RESOURCE_NOT_FOUND, details),

  validation: (message = 'Invalid input provided', details?: any) =>
    new AppError(message, 400, ErrorCode.VALIDATION_ERROR, details),

  conflict: (message = 'Resource conflict', details?: any) =>
    new AppError(message, 409, ErrorCode.DUPLICATE_RESOURCE, details),

  internal: (message = 'Internal server error', details?: any) =>
    new AppError(message, 500, ErrorCode.INTERNAL_SERVER_ERROR, details, false)
};

// Response helpers that properly handle TypeScript void returns
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: any
): void => {
  const errorResponse: APIResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(errorResponse);
};

export const sendSuccessResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): void => {
  const successResponse: APIResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(successResponse);
};

// Async wrapper to handle Promise rejections properly
export const asyncHandler = <TReq = BaseRequest, TRes = any>(
  fn: (req: TReq, res: Response<APIResponse<TRes>>, next: NextFunction) => Promise<void>
) => {
  return (req: TReq, res: Response<APIResponse<TRes>>, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error classification utilities
export const isZodError = (error: any): error is ZodError => {
  return error instanceof ZodError;
};

export const isPrismaError = (error: any): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

// Error transformation utilities
export const transformZodError = (error: ZodError): AppError => {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));

  return new AppError(
    'Validation failed',
    400,
    ErrorCode.VALIDATION_ERROR,
    details
  );
};

export const transformPrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      return new AppError(
        'A record with this data already exists',
        409,
        ErrorCode.DUPLICATE_RESOURCE,
        { constraint: error.meta?.target }
      );
    case 'P2025':
      return new AppError(
        'Record not found',
        404,
        ErrorCode.RESOURCE_NOT_FOUND,
        { cause: error.meta?.cause }
      );
    default:
      return new AppError(
        'Database operation failed',
        500,
        ErrorCode.DATABASE_ERROR,
        { code: error.code, meta: error.meta }
      );
  }
};

// Global error handler
export const globalErrorHandler = (
  error: any,
  req: BaseRequest,
  res: Response,
  next: NextFunction
): void => {
  // Log error details for monitoring
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Handle different error types
  if (isZodError(error)) {
    const appError = transformZodError(error);
    sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
    return;
  }

  if (isPrismaError(error)) {
    const appError = transformPrismaError(error);
    sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
    return;
  }

  if (isAppError(error)) {
    sendErrorResponse(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  // Handle unknown errors
  const statusCode = error.statusCode || error.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message || 'Something went wrong';

  sendErrorResponse(
    res,
    statusCode,
    ErrorCode.INTERNAL_SERVER_ERROR,
    message,
    process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
  );
};

// 404 Handler
export const notFoundHandler = (req: BaseRequest, res: Response): void => {
  sendErrorResponse(
    res,
    404,
    ErrorCode.RESOURCE_NOT_FOUND,
    `Route ${req.originalUrl} not found`
  );
};