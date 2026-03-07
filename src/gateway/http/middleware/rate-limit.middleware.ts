/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per minute
 * 
 * SECURITY NOTE: This implementation uses file-based persistence to survive
 * server restarts. For production deployments with multiple instances, consider
 * using Redis or a database-backed rate limiter.
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  [ip: string]: RateLimitEntry;
}

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute
const STORE_FILE = path.join(require('os').homedir(), '.wolverine', 'rate-limit-store.json');

// Load store from disk
function loadStore(): RateLimitStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const store = JSON.parse(data) as RateLimitStore;
      // Clean up expired entries on load
      const now = Date.now();
      const cleaned: RateLimitStore = {};
      for (const [ip, entry] of Object.entries(store)) {
        if (now <= entry.resetTime) {
          cleaned[ip] = entry;
        }
      }
      return cleaned;
    }
  } catch (err) {
    console.warn('[rate-limit] Failed to load store:', err);
  }
  return {};
}

// Save store to disk
function saveStore(store: RateLimitStore): void {
  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store), 'utf-8');
  } catch (err) {
    console.warn('[rate-limit] Failed to save store:', err);
  }
}

// In-memory cache with periodic persistence
let store: RateLimitStore = loadStore();
let saveTimeout: NodeJS.Timeout | null = null;

// Persist store every 10 seconds
function schedulePersist(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveStore(store);
    schedulePersist();
  }, 10000);
}
schedulePersist();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [ip, entry] of Object.entries(store)) {
    if (now > entry.resetTime) {
      delete store[ip];
      changed = true;
    }
  }
  if (changed) saveStore(store);
}, 60000);

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!store[ip] || now > store[ip].resetTime) {
    store[ip] = {
      count: 0,
      resetTime: now + WINDOW_MS
    };
  }

  store[ip].count++;

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - store[ip].count));
  res.setHeader('X-RateLimit-Reset', store[ip].resetTime);

  if (store[ip].count > MAX_REQUESTS) {
    res.setHeader('Retry-After', Math.ceil((store[ip].resetTime - now) / 1000));
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((store[ip].resetTime - now) / 1000)
    });
    return;
  }

  next();
}
