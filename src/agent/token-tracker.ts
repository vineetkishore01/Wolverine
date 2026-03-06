/**
 * Token Usage Tracker
 * 
 * Tracks token usage across all LLM calls, similar to OpenRouter/API providers.
 * Provides per-session and cumulative stats with cost estimation.
 */

import { getBrainDB } from '../db/brain';

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface TokenStats {
  sessionId: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  request_count: number;
  first_request: number;
  last_request: number;
}

export interface TokenUsageRecord {
  id?: number;
  session_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd?: number;
  created_at?: string;
}

/**
 * Token price per 1M tokens (USD) - configurable
 */
const DEFAULT_PRICING: Record<string, { prompt: number; completion: number }> = {
  // Ollama local models (free)
  'ollama:local': { prompt: 0, completion: 0 },
  // Common models
  'qwen:4b': { prompt: 0.1, completion: 0.1 },
  'qwen:7b': { prompt: 0.2, completion: 0.2 },
  'llama3:8b': { prompt: 0.2, completion: 0.2 },
  'qwen3:4b': { prompt: 0.1, completion: 0.1 },
  'qwen3:8b': { prompt: 0.2, completion: 0.2 },
  // OpenAI
  'gpt-4o': { prompt: 2.5, completion: 10 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  'gpt-4-turbo': { prompt: 10, completion: 30 },
  'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 },
  // Anthropic
  'claude-3-5-sonnet': { prompt: 3, completion: 15 },
  'claude-3-opus': { prompt: 15, completion: 75 },
  'claude-3-haiku': { prompt: 0.25, completion: 1.25 },
  // OpenRouter
  'openrouter:default': { prompt: 0.5, completion: 1.5 },
};

/**
 * In-memory tracker for current session stats (fast)
 */
class InMemoryTracker {
  private sessions: Map<string, TokenStats> = new Map();

  track(sessionId: string, usage: TokenUsage): void {
    const existing = this.sessions.get(sessionId) || {
      sessionId,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      request_count: 0,
      first_request: Date.now(),
      last_request: Date.now(),
    };

    existing.prompt_tokens += usage.prompt_tokens;
    existing.completion_tokens += usage.completion_tokens;
    existing.total_tokens += usage.total_tokens;
    existing.request_count += 1;
    existing.last_request = Date.now();

    this.sessions.set(sessionId, existing);
  }

  getSessionStats(sessionId: string): TokenStats | null {
    return this.sessions.get(sessionId) || null;
  }

  getAllStats(): TokenStats[] {
    return Array.from(this.sessions.values());
  }

  clear(): void {
    this.sessions.clear();
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

const memoryTracker = new InMemoryTracker();

/**
 * Accurate token estimation (BPE-inspired)
 * Refined to match OpenRouter/OpenAI patterns.
 */
export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;

  // Regex to split similar to GPT-4o / Llama-3 tokenizers:
  // - apostrophes ('s, 't, etc.)
  // - words (letters)
  // - numbers
  // - sequences of characters (punctuation/code)
  // - whitespace
  const tokenRegex = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
  const matches = text.match(tokenRegex);
  if (!matches) return 0;

  let total = 0;
  for (const match of matches) {
    total++; // Base: each segment is at least 1 token

    // BPE Penalty for long segments:
    // Common in code or very long words
    const len = match.length;
    if (len > 4) {
      // Every additional 4 characters is roughly another token
      total += Math.floor((len - 1) / 4);
    }

    // Special penalty for non-alphanumeric code blocks
    if (/[^ \p{L}\p{N}]/.test(match) && len > 1) {
      // Punctuation clusters like "}});" or "=> {" are often multiple tokens
      total += 0.5;
    }
  }

  return Math.ceil(total);
}

/**
 * Record token usage to database for persistence
 */
async function recordUsageToDb(record: TokenUsageRecord): Promise<void> {
  try {
    const db = getBrainDB();
    // Store in brain.db token_usage table (create if not exists)
    const stmt = (db as any).db?.prepare(`
      INSERT INTO token_usage (session_id, model, prompt_tokens, completion_tokens, total_tokens, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    if (stmt) {
      stmt.run(
        record.session_id,
        record.model,
        record.prompt_tokens,
        record.completion_tokens,
        record.total_tokens,
        record.cost_usd || 0
      );
    }
  } catch (e) {
    // Ignore DB errors - in-memory tracking still works
  }
}

/**
 * Main token tracker
 */
export class TokenTracker {
  /**
   * Record token usage from an LLM call
   */
  static record(sessionId: string, model: string, usage: TokenUsage): void {
    // Track in memory (fast)
    memoryTracker.track(sessionId, usage);

    // Optionally record to DB for persistence
    const cost = TokenTracker.calculateCost(model, usage);
    const record: TokenUsageRecord = {
      session_id: sessionId,
      model,
      ...usage,
      cost_usd: cost,
    };

    // Fire-and-forget DB write
    recordUsageToDb(record).catch(() => { });
  }

  /**
   * Record usage with actual token counts from API response
   */
  static recordFromApi(
    sessionId: string,
    model: string,
    promptTokens: number,
    completionTokens: number
  ): void {
    const usage: TokenUsage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    };
    this.record(sessionId, model, usage);
  }

  /**
   * Estimate and record usage when API doesn't return token counts
   */
  static recordEstimated(
    sessionId: string,
    model: string,
    promptText: string,
    completionText: string
  ): void {
    const usage: TokenUsage = {
      prompt_tokens: estimateTokens(promptText),
      completion_tokens: estimateTokens(completionText),
      total_tokens: 0,
    };
    usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;

    this.record(sessionId, model, usage);
  }

  /**
   * Get stats for a specific session, including historical data from DB
   */
  static getSessionStats(sessionId: string): TokenStats | null {
    const mem = memoryTracker.getSessionStats(sessionId);

    try {
      const db = getBrainDB();
      const row = (db as any).db?.prepare(`
        SELECT 
          SUM(prompt_tokens) as prompt, 
          SUM(completion_tokens) as completion, 
          SUM(total_tokens) as total,
          COUNT(*) as requests,
          MIN(created_at) as first,
          MAX(created_at) as last
        FROM token_usage WHERE session_id = ?
      `).get(sessionId);

      if (row && row.total > 0) {
        // Merge memory and DB stats
        return {
          sessionId,
          prompt_tokens: Math.max(mem?.prompt_tokens || 0, row.prompt || 0),
          completion_tokens: Math.max(mem?.completion_tokens || 0, row.completion || 0),
          total_tokens: Math.max(mem?.total_tokens || 0, row.total || 0),
          request_count: Math.max(mem?.request_count || 0, row.requests || 0),
          first_request: mem?.first_request || (row.first ? new Date(row.first).getTime() : Date.now()),
          last_request: mem?.last_request || (row.last ? new Date(row.last).getTime() : Date.now()),
        };
      }
    } catch (e) {
      // Fallback to memory
    }

    return mem;
  }

  /**
   * Get all session stats from DB
   */
  static getAllStats(): TokenStats[] {
    try {
      const db = getBrainDB();
      const rows = (db as any).db?.prepare(`
        SELECT 
          session_id as sessionId,
          SUM(prompt_tokens) as prompt_tokens, 
          SUM(completion_tokens) as completion_tokens, 
          SUM(total_tokens) as total_tokens,
          COUNT(*) as request_count,
          MIN(created_at) as first,
          MAX(created_at) as last
        FROM token_usage
        GROUP BY session_id
        ORDER BY last DESC
      `).all() as any[];

      return rows.map(r => ({
        sessionId: r.sessionId,
        prompt_tokens: r.prompt_tokens,
        completion_tokens: r.completion_tokens,
        total_tokens: r.total_tokens,
        request_count: r.request_count,
        first_request: new Date(r.first).getTime(),
        last_request: new Date(r.last).getTime(),
      }));
    } catch (e) {
      return memoryTracker.getAllStats();
    }
  }

  /**
   * Get total usage across all sessions from DB
   */
  static getTotalStats(): { total_tokens: number; total_requests: number; estimated_cost: number } {
    try {
      const db = getBrainDB();
      const row = (db as any).db?.prepare(`
        SELECT 
          SUM(total_tokens) as total, 
          COUNT(*) as requests,
          SUM(cost_usd) as cost
        FROM token_usage
      `).get();

      return {
        total_tokens: row?.total || 0,
        total_requests: row?.requests || 0,
        estimated_cost: row?.cost || 0,
      };
    } catch (e) {
      return { total_tokens: 0, total_requests: 0, estimated_cost: 0 };
    }
  }

  /**
   * Calculate cost based on model pricing (Enhanced for OpenRouter)
   */
  static calculateCost(model: string, usage: TokenUsage): number {
    const modelKey = model.toLowerCase();

    // Check for OpenRouter prefixes and find best match
    let pricing = DEFAULT_PRICING['ollama:local'];

    // Priority 1: Exact match
    if (DEFAULT_PRICING[modelKey]) {
      pricing = DEFAULT_PRICING[modelKey];
    } else {
      // Priority 2: Substring match
      for (const [key, value] of Object.entries(DEFAULT_PRICING)) {
        const cleanKey = key.replace('ollama:', '').replace('openrouter:', '');
        if (modelKey.includes(cleanKey)) {
          pricing = value;
          break;
        }
      }
    }

    const promptCost = (usage.prompt_tokens / 1_000_000) * pricing.prompt;
    const completionCost = (usage.completion_tokens / 1_000_000) * pricing.completion;

    return promptCost + completionCost;
  }

  /**
   * Clear stats for a session
   */
  static clearSession(sessionId: string): void {
    memoryTracker.clearSession(sessionId);
  }

  /**
   * Clear all stats
   */
  static clearAll(): void {
    memoryTracker.clear();
  }
}

/**
 * Format tokens for display (like OpenRouter)
 */
export function formatTokenUsage(stats: TokenStats): string {
  const { prompt_tokens, completion_tokens, total_tokens, request_count } = stats;

  return `📊 Token Usage:
  ├─ Prompt: ${formatNumber(prompt_tokens)} tokens
  ├─ Completion: ${formatNumber(completion_tokens)} tokens
  ├─ Total: ${formatNumber(total_tokens)} tokens
  └─ Requests: ${request_count}`;
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}
