import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware to handle express-validator validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: errors.array(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Middleware to validate request body using Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request body',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };
};

/**
 * Middleware to validate request query parameters using Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };
};

/**
 * Middleware to validate request params using Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request parameters',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };
};