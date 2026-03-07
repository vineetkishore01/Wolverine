/**
 * Response Cache - Automatic LLM Response Caching
 * 
 * Provides automatic caching of LLM responses to reduce costs and improve latency.
 * Uses SQLite-backed storage for persistence across sessions.
 * 
 * @module @wolverine/core/cache
 */

import Keyv from 'keyv';
import KeyvSqlite from '@keyv/sqlite';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CacheConfig {
  /** Enable/disable caching */
  enabled: boolean;
  /** Time to live in seconds (0 = no expiry) */
  ttlSeconds?: number;
  /** Maximum cache size in MB (default: 100MB) */
  maxSizeMB?: number;
  /** Directory for cache storage */
  cacheDir: string;
}

export interface CacheParams {
  messages: any[];
  tools?: any[];
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  sizeBytes: number;
}

// ─── Response Cache ────────────────────────────────────────────────────────────

export class ResponseCache {
  private cache: Keyv;
  private config: CacheConfig;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: CacheConfig) {
    this.config = config;

    // Ensure cache directory exists
    this.ensureCacheDir();

    // Initialize SQLite-backed cache
    const cachePath = path.join(config.cacheDir, 'response-cache.db');
    this.cache = new Keyv({
      store: new KeyvSqlite(`sqlite://${cachePath}`),
      ttl: config.ttlSeconds && config.ttlSeconds > 0 ? config.ttlSeconds * 1000 : undefined
    });

    // Log cache initialization
    console.log(`[ResponseCache] Initialized at ${cachePath} (TTL: ${config.ttlSeconds || 'none'}s)`);
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
    } catch (error: any) {
      console.warn(`[ResponseCache] Failed to create cache directory: ${error.message}`);
    }
  }

  /**
   * Generate cache key from all inputs that affect output
   */
  private generateKey(params: CacheParams): string {
    // Normalize inputs for consistent hashing
    const keyData = {
      messages: this.normalizeMessages(params.messages),
      tools: params.tools?.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      })),
      model: params.model || 'default',
      temperature: params.temperature || 0.7,
      systemPrompt: params.systemPrompt || ''
    };

    // Generate SHA-256 hash
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Normalize messages for cache key generation
   * (Removes timestamps and other non-semantic differences)
   */
  private normalizeMessages(messages: any[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      name: msg.name,
      tool_call_id: msg.tool_call_id
    }));
  }

  /**
   * Get cached response
   */
  async get(params: CacheParams): Promise<any | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const key = this.generateKey(params);
      const cached = await this.cache.get(key);

      if (cached) {
        this.hits++;
        console.log(`[ResponseCache] ✅ HIT: ${key.slice(0, 16)}...`);
        return cached;
      }

      this.misses++;
      console.log(`[ResponseCache] ❌ MISS: ${key.slice(0, 16)}...`);
      return null;
    } catch (error: any) {
      console.warn(`[ResponseCache] Get error: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache a response
   */
  async set(params: CacheParams, result: any): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const key = this.generateKey(params);
      await this.cache.set(key, result);
      console.log(`[ResponseCache] 💾 Cached: ${key.slice(0, 16)}...`);
    } catch (error: any) {
      console.warn(`[ResponseCache] Set error: ${error.message}`);
    }
  }

  /**
   * Clear all cached responses
   */
  async clear(): Promise<void> {
    try {
      await this.cache.clear();
      this.hits = 0;
      this.misses = 0;
      console.log('[ResponseCache] 🗑️ Cache cleared');
    } catch (error: any) {
      console.warn(`[ResponseCache] Clear error: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<CacheStats> {
    try {
      const cachePath = path.join(this.config.cacheDir, 'response-cache.db');
      const stats = await fs.stat(cachePath).catch(() => ({ size: 0 }));

      return {
        hits: this.hits,
        misses: this.misses,
        size: this.hits + this.misses,
        sizeBytes: stats.size
      };
    } catch (error: any) {
      return {
        hits: this.hits,
        misses: this.misses,
        size: this.hits + this.misses,
        sizeBytes: 0
      };
    }
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return this.hits / total;
  }

  /**
   * Prune old cache entries (if size exceeds limit)
   */
  async prune(): Promise<void> {
    if (!this.config.maxSizeMB) return;

    try {
      const cachePath = path.join(this.config.cacheDir, 'response-cache.db');
      const stats = await fs.stat(cachePath).catch(() => ({ size: 0 }));
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB > this.config.maxSizeMB) {
        console.log(`[ResponseCache] Size (${sizeMB.toFixed(2)}MB) exceeds limit (${this.config.maxSizeMB}MB), clearing cache`);
        await this.clear();
      }
    } catch (error: any) {
      console.warn(`[ResponseCache] Prune error: ${error.message}`);
    }
  }
}

// ─── Cache Middleware ──────────────────────────────────────────────────────────

/**
 * Create cache middleware for LLM providers
 */
export function createCacheMiddleware(cache: ResponseCache) {
  return async function cacheMiddleware(
    params: CacheParams,
    next: () => Promise<any>
  ): Promise<any> {
    // Try cache first
    const cached = await cache.get(params);
    if (cached) {
      return cached;
    }

    // Call next (actual LLM)
    const result = await next();

    // Cache result
    await cache.set(params, result);

    return result;
  };
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

let globalCache: ResponseCache | null = null;

/**
 * Get or create global response cache
 */
export function getResponseCache(config?: CacheConfig): ResponseCache {
  if (globalCache) {
    return globalCache;
  }

  // Use default config if not provided
  const defaultConfig: CacheConfig = {
    enabled: true,
    ttlSeconds: 3600,
    maxSizeMB: 100,
    cacheDir: './.wolverine/cache'
  };

  globalCache = new ResponseCache(config || defaultConfig);
  return globalCache;
}

/**
 * Initialize global response cache
 */
export function initializeCache(config: CacheConfig): ResponseCache {
  globalCache = new ResponseCache(config);
  return globalCache;
}
