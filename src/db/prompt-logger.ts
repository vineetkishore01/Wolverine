/**
 * Prompt Logger — Captures and stores all prompts sent to AI models
 * 
 * Features:
 * - Logs every prompt sent to Ollama/OpenRouter/etc.
 * - Stores with timestamps, model info, token usage
 * - Searchable/filterable history
 * - Export capability for optimization
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config';

export interface PromptLog {
  id: string;
  timestamp: number;
  sessionId: string;
  model: string;
  provider: string;
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  tokenUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  response?: string;
  duration?: number; // ms
  tags?: string[]; // e.g., ['browser_automation', 'file_edit']
}

class PromptLogger {
  private logs: Map<string, PromptLog[]> = new Map(); // sessionId -> logs
  private maxLogsPerSession = 100;
  private logFilePath: string;

  constructor() {
    const configDir = getConfig().getConfigDir();
    this.logFilePath = path.join(configDir, 'prompt_logs.json');
    this.loadFromDisk();
  }

  /**
   * Log a prompt sent to AI model
   */
  log(promptLog: Omit<PromptLog, 'id' | 'timestamp'>): PromptLog {
    const log: PromptLog = {
      ...promptLog,
      id: `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    // Store in memory
    const sessionLogs = this.logs.get(log.sessionId) || [];
    sessionLogs.unshift(log); // Add to beginning (newest first)

    // Limit logs per session
    if (sessionLogs.length > this.maxLogsPerSession) {
      sessionLogs.pop();
    }

    this.logs.set(log.sessionId, sessionLogs);

    // Save to disk periodically (every 10 logs)
    if (sessionLogs.length % 10 === 0) {
      this.saveToDisk();
    }

    return log;
  }

  /**
   * Get logs for a session
   */
  getSessionLogs(sessionId: string, limit = 50): PromptLog[] {
    const sessionLogs = this.logs.get(sessionId) || [];
    return sessionLogs.slice(0, limit);
  }

  /**
   * Get all logs across sessions
   */
  getAllLogs(limit = 100): PromptLog[] {
    const allLogs: PromptLog[] = [];
    for (const [sessionId, logs] of this.logs) {
      allLogs.push(...logs);
    }
    return allLogs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Search logs by content
   */
  searchLogs(query: string, sessionId?: string): PromptLog[] {
    const logs = sessionId ? this.getSessionLogs(sessionId) : this.getAllLogs(500);
    const lowerQuery = query.toLowerCase();

    return logs.filter(log => {
      // Search in messages
      const messageMatch = log.messages.some(m =>
        m.content.toLowerCase().includes(lowerQuery)
      );

      // Search in response
      const responseMatch = log.response?.toLowerCase().includes(lowerQuery);

      // Search in tags
      const tagMatch = log.tags?.some(t => t.toLowerCase().includes(lowerQuery));

      // Search in model/provider
      const modelMatch = log.model.toLowerCase().includes(lowerQuery) ||
                        log.provider.toLowerCase().includes(lowerQuery);

      return messageMatch || responseMatch || tagMatch || modelMatch;
    });
  }

  /**
   * Get logs by date range
   */
  getLogsByDateRange(start: number, end: number, sessionId?: string): PromptLog[] {
    const logs = sessionId ? this.getSessionLogs(sessionId) : this.getAllLogs(1000);
    return logs.filter(log => log.timestamp >= start && log.timestamp <= end);
  }

  /**
   * Get token usage stats
   */
  getTokenStats(sessionId?: string): {
    totalPrompts: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    avgTokensPerPrompt: number;
  } {
    const logs = sessionId ? this.getSessionLogs(sessionId) : this.getAllLogs(1000);
    
    const stats = {
      totalPrompts: logs.length,
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      avgTokensPerPrompt: 0,
    };

    for (const log of logs) {
      if (log.tokenUsage) {
        stats.totalTokens += log.tokenUsage.total_tokens;
        stats.totalPromptTokens += log.tokenUsage.prompt_tokens;
        stats.totalCompletionTokens += log.tokenUsage.completion_tokens;
      }
    }

    stats.avgTokensPerPrompt = stats.totalPrompts > 0
      ? Math.round(stats.totalTokens / stats.totalPrompts)
      : 0;

    return stats;
  }

  /**
   * Export logs for analysis
   */
  exportLogs(sessionId?: string): string {
    const logs = sessionId ? this.getSessionLogs(sessionId) : this.getAllLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clear logs for a session
   */
  clearSession(sessionId: string): void {
    this.logs.delete(sessionId);
    this.saveToDisk();
  }

  /**
   * Clear all logs
   */
  clearAll(): void {
    this.logs.clear();
    this.saveToDisk();
  }

  /**
   * Save to disk
   */
  private saveToDisk(): void {
    try {
      const allLogs: PromptLog[] = [];
      for (const [sessionId, logs] of this.logs) {
        allLogs.push(...logs);
      }

      fs.writeFileSync(
        this.logFilePath,
        JSON.stringify({ logs: allLogs, savedAt: new Date().toISOString() }, null, 2)
      );
    } catch (error) {
      console.error('[PromptLogger] Failed to save to disk:', error);
    }
  }

  /**
   * Load from disk
   */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.logFilePath, 'utf-8'));
        const logs: PromptLog[] = data.logs || [];

        // Group by session
        for (const log of logs) {
          const sessionLogs = this.logs.get(log.sessionId) || [];
          sessionLogs.push(log);
          this.logs.set(log.sessionId, sessionLogs);
        }

        console.log(`[PromptLogger] Loaded ${logs.length} logs from disk`);
      }
    } catch (error) {
      console.error('[PromptLogger] Failed to load from disk:', error);
    }
  }
}

// Singleton instance
let promptLogger: PromptLogger | null = null;

export function getPromptLogger(): PromptLogger {
  if (!promptLogger) {
    promptLogger = new PromptLogger();
  }
  return promptLogger;
}
