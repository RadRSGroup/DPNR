import { ParsedQs } from 'qs';
import { AuthenticatedUser, UserSession } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: UserSession;
    }

    interface Response {
      success: (data: any, message?: string) => Response;
      created: (data: any, message?: string) => Response;
      error: (statusCode: number, message: string, details?: any) => Response;
    }
  }
}

// Type helpers for better Express typing
export interface TypedRequest<T = {}, U = {}, V = {}> extends Express.Request {
  body: T;
  query: U;
  params: V;
}

export interface TypedResponse<T = any> extends Express.Response {
  json: (obj: T) => this;
}

export {};