/**
 * Express.js Type Extensions and Standardized Handlers
 * Provides scalable, type-safe patterns for Express route handlers
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser, UserSession } from './auth';

// Standardized Request Types
export interface BaseRequest extends Request {
  user?: AuthenticatedUser;
  session?: UserSession;
}

export interface AuthenticatedRequest extends BaseRequest {
  user: AuthenticatedUser;
  session: UserSession;
}

// Standardized Response Types
export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: APIError;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// Route Handler Types - Scalable Patterns
export type RouteHandler<TReq = BaseRequest, TRes = any> = (
  req: TReq,
  res: Response<APIResponse<TRes>>,
  next: NextFunction
) => Promise<void> | void;

export type AuthenticatedRouteHandler<TRes = any> = RouteHandler<AuthenticatedRequest, TRes>;

export type MiddlewareHandler<TReq = BaseRequest> = (
  req: TReq,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type ErrorHandler = (
  error: any,
  req: BaseRequest,
  res: Response,
  next: NextFunction
) => void;

// Response Helper Types
export interface ResponseHelpers {
  success: <T>(data: T, message?: string) => Response<APIResponse<T>>;
  created: <T>(data: T, message?: string) => Response<APIResponse<T>>;
  error: (statusCode: number, message: string, details?: any) => Response<APIResponse<never>>;
}

// Extend Express Response to include helpers
// Extend Express Request to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: UserSession;
    }

    interface Response {
      success: <T>(data: T, message?: string) => Response;
      created: <T>(data: T, message?: string) => Response;
      error: (statusCode: number, message: string, details?: any) => Response;
    }
  }
}

// Query Parameter Types
export interface PaginationQuery {
  page?: string;
  limit?: string;
  offset?: string;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterQuery {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface StandardQuery extends PaginationQuery, SortQuery, FilterQuery {}

// Route Parameter Types
export interface IdParams {
  id: string;
}

export interface UserParams {
  userId: string;
}

export interface CohortParams {
  cohortId: string;
}

// Request Body Types for common operations
export interface CreateRequest<T> {
  body: T;
}

export interface UpdateRequest<T> {
  params: IdParams;
  body: Partial<T>;
}

export interface DeleteRequest {
  params: IdParams;
}