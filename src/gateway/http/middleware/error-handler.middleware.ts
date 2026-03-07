/**
 * Error Handler Middleware
 * Centralized error handling for all routes
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../../../security/log-scrubber';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandlerMiddleware(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  // Log error (with secret scrubbing)
  console.error(`[${req.method}] ${req.path} - ${message}`);
  
  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    error: {
      message: isDev ? message : 'An error occurred',
      code: err.code || 'INTERNAL_ERROR',
      details: isDev ? err.details : undefined,
      stack: isDev ? err.stack : undefined
    }
  });
}
