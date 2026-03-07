/**
 * Authentication Middleware
 * Validates API tokens for secure endpoints
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../../../config/config';

export interface AuthRequest extends Request {
  userId?: string;
  sessionId?: string;
}

/**
 * Optional authentication - adds user info if token present
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = authHeader.replace('Bearer ', '');
  const config = getConfig().getConfig();

  if (config.gateway.auth?.enabled && config.gateway.auth?.token) {
    if (token === config.gateway.auth.token) {
      req.userId = 'authenticated';
      req.sessionId = `session_${Date.now()}`;
    }
  }

  next();
}

/**
 * Required authentication - rejects if token invalid
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const config = getConfig().getConfig();

  // If auth is disabled, allow through
  if (!config.gateway.auth?.enabled) {
    return next();
  }

  // If auth is enabled but NO token is configured, we can't verify anything.
  // We'll allow through to prevent lockouts, but this is a config warning state.
  if (!config.gateway.auth?.token) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  if (token === config.gateway.auth.token) {
    req.userId = 'authenticated';
    req.sessionId = `session_${crypto.randomBytes(8).toString('hex')}`;
    return next();
  }

  res.status(401).json({ error: 'Invalid authentication token' });
}

/**
 * Legacy auth middleware for backward compatibility
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const config = getConfig().getConfig();

  if (!config.gateway.auth?.enabled) {
    return next();
  }

  requireAuth(req, res, next);
}
