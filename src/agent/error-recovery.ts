/**
 * Error Self-Correction System
 * 
 * Automatically detects and recovers from common errors
 * without requiring the model to figure it out each time.
 * 
 * ENHANCEMENT: Now learns NEW error patterns dynamically!
 */

import { getBrainDB } from '../db/brain';

export interface ErrorPattern {
  pattern: RegExp;
  recovery: string;
  retry?: boolean;
  maxRetries?: number;
}

export interface ErrorRecoveryResult {
  recovered: boolean;
  message: string;
  shouldRetry: boolean;
  retryCount: number;
}

// Common error patterns and their recoveries
const ERROR_PATTERNS: ErrorPattern[] = [
  {
    // File not found - might need to create
    pattern: /file.*not found|not found.*file|enoent/i,
    recovery: 'File does not exist. Consider creating it with create_file tool.',
    retry: false
  },
  {
    // Permission denied
    pattern: /permission denied|eacces|denied/i,
    recovery: 'Permission denied. Check file permissions or try a different location.',
    retry: false
  },
  {
    // Syntax error in code
    pattern: /syntax error|parse error|unexpected token/i,
    recovery: 'Syntax error detected. Review the file and fix the syntax issue.',
    retry: true,
    maxRetries: 2
  },
  {
    // Command not found
    pattern: /command not found|not found.*command|ENOENT.*command/i,
    recovery: 'Command not found. Check if the command is installed or use an alternative.',
    retry: false
  },
  {
    // Network/connection errors
    pattern: /connection.*error|network.*error|timeout|ECONNREFUSED/i,
    retry: true,
    maxRetries: 3,
    recovery: 'Network error. Consider retrying the operation.'
  },
  {
    // Invalid arguments
    pattern: /invalid.*argument|missing.*argument|required.*argument/i,
    recovery: 'Invalid arguments. Check the tool documentation for correct usage.',
    retry: false
  },
  {
    // File already exists
    pattern: /already exists|file exists/i,
    recovery: 'File already exists. Use replace_lines or find_replace to edit instead.',
    retry: false
  },
  {
    // Directory not empty
    pattern: /directory.*not empty|not empty.*directory/i,
    recovery: 'Directory not empty. Delete files first or use a different directory.',
    retry: false
  },
  {
    // Out of memory
    pattern: /out of memory|oom|heap.*exceed/i,
    recovery: 'Out of memory. Try processing smaller files or batches.',
    retry: false
  },
  {
    // Rate limiting
    pattern: /rate limit|too many requests|429/i,
    recovery: 'Rate limited. Wait before retrying or reduce request frequency.',
    retry: true,
    maxRetries: 3
  }
];

/**
 * Detect error type from message - checks both static AND dynamic patterns
 * Now includes learning capability!
 */
export function detectError(errorMessage: string): ErrorPattern | null {
  // First check static patterns
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(errorMessage)) {
      return pattern;
    }
  }
  
  // Then check dynamic patterns (learned from past errors)
  for (const pattern of DYNAMIC_PATTERNS) {
    if (pattern.pattern.test(errorMessage)) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Generate recovery suggestion
 */
export function generateRecoverySuggestion(errorMessage: string): string {
  const detected = detectError(errorMessage);
  
  if (detected) {
    return detected.recovery;
  }
  
  // Generic recovery suggestions
  const lower = errorMessage.toLowerCase();
  
  if (lower.includes('fail')) {
    return 'Operation failed. Try a different approach or check the error details.';
  }
  
  if (lower.includes('error')) {
    return 'An error occurred. Review the error message and try again with corrected parameters.';
  }
  
  return 'Something went wrong. Try again with a different approach.';
}

/**
 * Check if error is retryable
 */
export function isRetryable(errorMessage: string): boolean {
  const detected = detectError(errorMessage);
  return detected?.retry || false;
}

/**
 * Get max retries for error
 */
export function getMaxRetries(errorMessage: string): number {
  const detected = detectError(errorMessage);
  return detected?.maxRetries || 0;
}

/**
 * Attempt error recovery
 */
export function attemptRecovery(
  errorMessage: string,
  retryCount: number
): ErrorRecoveryResult {
  const detected = detectError(errorMessage);
  
  if (!detected) {
    return {
      recovered: false,
      message: generateRecoverySuggestion(errorMessage),
      shouldRetry: false,
      retryCount
    };
  }
  
  const canRetry = (detected.retry || false) && retryCount < (detected.maxRetries || 0);
  
  return {
    recovered: true,
    message: detected.recovery,
    shouldRetry: canRetry,
    retryCount
  };
}

/**
 * Format error for model context
 */
export function formatErrorForContext(
  toolName: string,
  errorMessage: string,
  recovery?: ErrorRecoveryResult
): string {
  const parts: string[] = [
    `[Tool Error] ${toolName}:`,
    errorMessage.slice(0, 500)
  ];
  
  if (recovery) {
    parts.push(`\n[Recovery] ${recovery.message}`);
    
    if (recovery.shouldRetry) {
      parts.push(`[Retry ${recovery.retryCount + 1}/${getMaxRetries(errorMessage)}] Attempting recovery...`);
    }
  }
  
  return parts.join('\n');
}

/**
 * Error statistics tracking
 */
class ErrorStats {
  private errors: Map<string, { count: number; lastSeen: number }> = new Map();
  
  recordError(toolName: string): void {
    const current = this.errors.get(toolName) || { count: 0, lastSeen: 0 };
    this.errors.set(toolName, {
      count: current.count + 1,
      lastSeen: Date.now()
    });
  }
  
  getErrorCount(toolName: string): number {
    return this.errors.get(toolName)?.count || 0;
  }
  
  getMostFrequentErrors(limit: number = 5): Array<{ tool: string; count: number }> {
    return Array.from(this.errors.entries())
      .map(([tool, data]) => ({ tool, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  clear(): void {
    this.errors.clear();
  }
}

const errorStats = new ErrorStats();

export function getErrorStats(): ErrorStats {
  return errorStats;
}

/**
 * NEW: Learn new error patterns from failures
 * This allows Wolverine to expand its error recovery capabilities over time
 */
const DYNAMIC_PATTERNS: ErrorPattern[] = [];

export async function learnErrorPattern(
  errorMessage: string,
  toolName: string,
  recoveryThatWorked?: string
): Promise<void> {
  // Extract the key error phrase
  const match = errorMessage.match(/([a-zA-Z][a-zA-Z\s]{3,40})/);
  if (!match) return;
  
  const errorPhrase = match[1].trim();
  
  // Check if we already have this pattern
  if (DYNAMIC_PATTERNS.some(p => p.pattern.test(errorMessage))) {
    return;
  }
  
  // Create new pattern
  const newPattern: ErrorPattern = {
    pattern: new RegExp(errorPhrase, 'i'),
    recovery: recoveryThatWorked || `Encountered "${errorPhrase}" with ${toolName}. Check tool documentation and try alternative approach.`,
    retry: false,
    maxRetries: 1
  };
  
  DYNAMIC_PATTERNS.push(newPattern);
  
  // Save to brain for persistence
  try {
    const brain = getBrainDB();
    await brain.upsertMemory({
      key: `error_pattern:${errorPhrase.toLowerCase().replace(/\s+/g, '_')}`,
      content: `Error: "${errorPhrase}" when using ${toolName}. Recovery: ${newPattern.recovery}`,
      category: 'error_pattern',
      importance: 0.7,
      source: 'system',
      scope: 'global'
    });
    console.log(`[ErrorRecovery] Learned new pattern: "${errorPhrase}"`);
  } catch (e) {
    // Ignore
  }
}
