/**
 * Prefix Caching System
 * 
 * Implements Claude Code's 92% prefix reuse optimization.
 * System prompts and tool definitions are cached as prefix -
 * only incremental context changes between requests.
 * 
 * This dramatically reduces token usage and latency for small models.
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config';
import { getBrainDB } from '../db/brain';

export interface PromptCache {
  sessionId: string;
  systemPrefix: string;
  toolDefinitions: string;
  userContext: string;
  cacheVersion: number;
  lastUpdated: number;
  invalidationTrigger: string | null;
}

export interface CachedContext {
  prefix: string;           // Cached system + tools
  incremental: string;     // Session-specific only
  totalTokens: number;
}

const MAX_PREFIX_TOKENS = 4000;    // ~16KB for system prompts
const MAX_SESSION_TOKENS = 2000;   // ~8KB for session context
const CACHE_VERSION = 1;

/**
 * Build the stable system prefix (cached)
 * This includes: SOUL.md, AGENTS.md, TOOLS.md, USER.md
 */
export async function buildSystemPrefix(): Promise<string> {
  const config = getConfig();
  const workspace = config.getWorkspacePath();
  
  const parts: string[] = [];
  
  // 1. SOUL.md - Agent identity
  const soulPath = path.join(workspace, 'SOUL.md');
  if (fs.existsSync(soulPath)) {
    const soul = fs.readFileSync(soulPath, 'utf-8');
    parts.push(`# SOUL\n${soul}`);
  }
  
  // 2. AGENTS.md - Agent instructions
  const agentsPath = path.join(workspace, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const agents = fs.readFileSync(agentsPath, 'utf-8');
    parts.push(`# AGENTS\n${agents}`);
  }
  
  // 3. TOOLS.md - Tool descriptions
  const toolsPath = path.join(workspace, 'TOOLS.md');
  if (fs.existsSync(toolsPath)) {
    const tools = fs.readFileSync(toolsPath, 'utf-8');
    parts.push(`# TOOLS\n${tools}`);
  }
  
  // 4. USER.md - User preferences
  const userPath = path.join(workspace, 'USER.md');
  if (fs.existsSync(userPath)) {
    const user = fs.readFileSync(userPath, 'utf-8');
    parts.push(`# USER PREFERENCES\n${user}`);
  }
  
  // 5. IDENTITY.md - Agent identity (if exists)
  const identityPath = path.join(workspace, 'IDENTITY.md');
  if (fs.existsSync(identityPath)) {
    const identity = fs.readFileSync(identityPath, 'utf-8');
    parts.push(`# IDENTITY\n${identity}`);
  }
  
  return parts.join('\n\n');
}

/**
 * Build tool definitions string (cached)
 */
export function buildToolDefinitions(tools: Array<{name: string, description: string, schema: Record<string, string>}>): string {
  const toolLines: string[] = ['# Available Tools'];
  
  for (const tool of tools) {
    toolLines.push(`\n## ${tool.name}`);
    toolLines.push(tool.description);
    
    if (Object.keys(tool.schema).length > 0) {
      toolLines.push('Parameters:');
      for (const [param, desc] of Object.entries(tool.schema)) {
        toolLines.push(`  - ${param}: ${desc}`);
      }
    }
  }
  
  return toolLines.join('\n');
}

/**
 * Get session context with truncation
 * Only returns recent messages, not full history
 */
export function getSessionContext(
  sessionMessages: Array<{role: string, content: string}>,
  maxTokens: number = MAX_SESSION_TOKENS
): string {
  const maxChars = maxTokens * 4;
  let totalChars = 0;
  const selected: string[] = [];
  
  // Work backwards from most recent
  for (let i = sessionMessages.length - 1; i >= 0; i--) {
    const msg = sessionMessages[i];
    const msgStr = `[${msg.role}]: ${msg.content.slice(0, 500)}`;
    
    if (totalChars + msgStr.length > maxChars) {
      break;
    }
    
    selected.unshift(msgStr);
    totalChars += msgStr.length;
  }
  
  return selected.join('\n');
}

/**
 * Build incremental context (changes each turn)
 */
export function buildIncrementalContext(
  userMessage: string,
  toolResults: string[],
  scratchpad?: string
): string {
  const parts: string[] = [];
  
  // Current user message
  parts.push(`## Current Request\n${userMessage}`);
  
  // Recent tool results (last 3 only to save tokens)
  if (toolResults.length > 0) {
    parts.push('\n## Recent Tool Results');
    for (const result of toolResults.slice(-3)) {
      const truncated = result.slice(0, 800);
      parts.push(truncated.length < result.length ? `${truncated}...[truncated]` : truncated);
    }
  }
  
  // Scratchpad if present
  if (scratchpad) {
    parts.push(`\n## Working Memory\n${scratchpad.slice(0, 500)}`);
  }
  
  return parts.join('\n');
}

/**
 * Cache manager for prefix caching
 */
class PrefixCacheManager {
  private cache: Map<string, PromptCache> = new Map();
  
  /**
   * Get or create cache for a session
   */
  async getOrCreate(sessionId: string): Promise<PromptCache> {
    let cache = this.cache.get(sessionId);
    
    if (!cache || this.shouldInvalidate(cache)) {
      cache = await this.buildCache(sessionId);
      this.cache.set(sessionId, cache);
    }
    
    return cache;
  }
  
  /**
   * Check if cache should be invalidated
   */
  private shouldInvalidate(cache: PromptCache): boolean {
    // Version mismatch
    if (cache.cacheVersion !== CACHE_VERSION) return true;
    
    // Stale cache (>1 hour)
    if (Date.now() - cache.lastUpdated > 3600000) return true;
    
    // Manual invalidation trigger
    if (cache.invalidationTrigger) return true;
    
    return false;
  }
  
  /**
   * Build new cache for session
   */
  private async buildCache(sessionId: string): Promise<PromptCache> {
    const systemPrefix = await buildSystemPrefix();
    
    return {
      sessionId,
      systemPrefix,
      toolDefinitions: '',  // Will be set by registry
      userContext: '',     // Loaded from files
      cacheVersion: CACHE_VERSION,
      lastUpdated: Date.now(),
      invalidationTrigger: null
    };
  }
  
  /**
   * Update cache after tool execution
   */
  invalidate(sessionId: string, trigger: string): void {
    const cache = this.cache.get(sessionId);
    if (cache) {
      cache.invalidationTrigger = trigger;
    }
  }
  
  /**
   * Clear session cache
   */
  clear(sessionId: string): void {
    this.cache.delete(sessionId);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { sessions: number, avgPrefixSize: number } {
    const sizes = Array.from(this.cache.values()).map(c => c.systemPrefix.length);
    return {
      sessions: this.cache.size,
      avgPrefixSize: sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0
    };
  }
}

// Singleton instance
let cacheManager: PrefixCacheManager | null = null;

export function getPrefixCacheManager(): PrefixCacheManager {
  if (!cacheManager) {
    cacheManager = new PrefixCacheManager();
  }
  return cacheManager;
}

/**
 * Estimate token count (rough heuristic)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format context with cache info for debugging
 */
export function formatContextWithCache(
  prefix: string,
  incremental: string
): { formatted: string, stats: { prefixTokens: number, incrementalTokens: number, totalTokens: number, savings: number } } {
  const prefixTokens = estimateTokens(prefix);
  const incrementalTokens = estimateTokens(incremental);
  const totalTokens = prefixTokens + incrementalTokens;
  
  // Estimate savings vs rebuilding each time (assume 2x for rebuild)
  const rebuildTokens = totalTokens * 2;
  const savings = Math.round((1 - totalTokens / rebuildTokens) * 100);
  
  return {
    formatted: `## Cached Context\n\n${prefix}\n\n---\n\n## Turn-Specific\n\n${incremental}`,
    stats: {
      prefixTokens,
      incrementalTokens,
      totalTokens,
      savings
    }
  };
}
