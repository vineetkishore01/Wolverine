/**
 * Context Compaction System
 * 
 * Proactively compacts context to free up tokens before they run out.
 * Inspired by Claude Code's /compact command.
 * 
 * For small models, compacting BEFORE degradation is critical.
 */

import { getBrainDB } from '../db/brain';

export interface CompactionResult {
  originalTokens: number;
  compactedTokens: number;
  savings: number;
  summary: string;
}

/**
 * Analyze context for compaction candidates
 */
export function analyzeContextForCompaction(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 4000
): {
  shouldCompact: boolean;
  candidates: Array<{ index: number; role: string; content: string; tokens: number }>;
  reason: string;
} {
  const totalTokens = messages.reduce((sum, m) => sum + Math.ceil((m.content?.length || 0) / 4), 0);
  
  // Compact if at 60% capacity
  const threshold = maxTokens * 0.6;
  
  if (totalTokens < threshold) {
    return {
      shouldCompact: false,
      candidates: [],
      reason: 'Context below compaction threshold'
    };
  }
  
  // Find old tool results that can be compacted
  const candidates: Array<{ index: number; role: string; content: string; tokens: number }> = [];
  
  for (let i = 0; i < messages.length - 5; i++) {
    const msg = messages[i];
    
    // Skip recent messages (last 5)
    if (i >= messages.length - 5) continue;
    
    // Tool results are good compaction candidates
    if (msg.role === 'tool') {
      const tokens = Math.ceil((msg.content?.length || 0) / 4);
      if (tokens > 100) {
        candidates.push({
          index: i,
          role: msg.role,
          content: msg.content || '',
          tokens
        });
      }
    }
  }
  
  return {
    shouldCompact: candidates.length > 3,
    candidates: candidates.slice(0, 10), // Max 10 candidates
    reason: `Context at ${Math.round((totalTokens / maxTokens) * 100)}% capacity`
  };
}

/**
 * Generate summary for a message using simple extraction
 */
function generateSummary(content: string, maxLength: number = 200): string {
  const lines = content.split('\n');
  
  // For tool results, summarize the outcome
  if (content.includes('error') || content.includes('failed')) {
    return `[Tool failed: ${content.slice(0, 100)}...]`;
  }
  
  // For file operations, summarize
  if (content.includes('created') || content.includes('updated') || content.includes('edited')) {
    const match = content.match(/(?:file|File).*(?:created|updated|edited|modified).*/);
    if (match) return match[0].slice(0, maxLength);
  }
  
  // For reads, summarize what was read
  if (content.includes('lines:')) {
    const match = content.match(/^([^:]+)/);
    if (match) return `[Read: ${match[0].slice(0, maxLength)}]`;
  }
  
  // Default: first meaningful line
  for (const line of lines.slice(0, 5)) {
    if (line.length > 20 && !line.match(/^\d+:/)) {
      return line.slice(0, maxLength);
    }
  }
  
  return content.slice(0, maxLength);
}

/**
 * Compact messages by summarizing old tool results
 */
export function compactMessages(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 4000
): CompactionResult {
  const originalTokens = messages.reduce((sum, m) => sum + Math.ceil((m.content?.length || 0) / 4), 0);
  
  // Clone messages to avoid mutation
  const compacted = messages.map(m => ({ ...m }));
  
  // Find and summarize old tool results
  const summaryParts: string[] = [];
  let removedTokens = 0;
  
  for (let i = 0; i < compacted.length - 5; i++) {
    const msg = compacted[i];
    
    // Skip recent messages
    if (i >= compacted.length - 5) continue;
    
    if (msg.role === 'tool') {
      const tokens = Math.ceil((msg.content?.length || 0) / 4);
      
      if (tokens > 100) {
        const summary = generateSummary(msg.content || '');
        summaryParts.push(summary);
        removedTokens += tokens;
        compacted[i] = { role: msg.role, content: `[Compacted: ${summary}]` };
      }
    }
  }
  
  const compactedTokens = originalTokens - removedTokens;
  
  return {
    originalTokens,
    compactedTokens,
    savings: removedTokens,
    summary: summaryParts.slice(0, 5).join('; ')
  };
}

/**
 * Check if session needs compaction and get recommendation
 */
export function getCompactionRecommendation(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 4000
): {
  recommended: boolean;
  reason: string;
  estimatedSavings: number;
} {
  const { shouldCompact, reason } = analyzeContextForCompaction(messages, maxTokens);
  
  if (!shouldCompact) {
    return { recommended: false, reason, estimatedSavings: 0 };
  }
  
  const totalTokens = messages.reduce((sum, m) => sum + Math.ceil((m.content?.length || 0) / 4), 0);
  const estimatedSavings = Math.round(totalTokens * 0.2); // ~20% savings
  
  return {
    recommended: true,
    reason,
    estimatedSavings
  };
}
