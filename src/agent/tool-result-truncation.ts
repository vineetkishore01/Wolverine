/**
 * Tool Result Truncation
 * 
 * Intelligently truncates long tool results to preserve context
 * while keeping the most important information.
 */

export interface TruncationOptions {
  maxLength?: number;
  preserveErrors?: boolean;
  preserveSuccess?: boolean;
  summaryMode?: boolean;
}

const DEFAULT_OPTIONS: TruncationOptions = {
  maxLength: 2000,
  preserveErrors: true,
  preserveSuccess: true,
  summaryMode: false
};

/**
 * Detect the type of tool result
 */
function detectResultType(content: string): 'error' | 'success' | 'info' {
  const lower = content.toLowerCase();
  
  if (lower.includes('error') || lower.includes('failed') || lower.includes('exception')) {
    return 'error';
  }
  
  if (lower.includes('created') || lower.includes('updated') || lower.includes('done') || lower.includes('success')) {
    return 'success';
  }
  
  return 'info';
}

/**
 * Extract key information from tool result
 */
function extractKeyInfo(content: string, type: string): string {
  const lines = content.split('\n');
  const keyLines: string[] = [];
  
  // First line is usually important
  if (lines[0]) {
    keyLines.push(lines[0]);
  }
  
  // For errors, keep error details
  if (type === 'error') {
    for (const line of lines.slice(1, 10)) {
      if (line.includes('error') || line.includes('Error') || line.includes('at ')) {
        keyLines.push(line);
      }
    }
  }
  
  // For file operations, keep file paths
  if (content.includes('.ts') || content.includes('.js') || content.includes('.json')) {
    for (const line of lines) {
      if (line.includes('.ts') || line.includes('.js') || line.includes('.json')) {
        if (!keyLines.includes(line)) {
          keyLines.push(line);
        }
      }
    }
  }
  
  return keyLines.slice(0, 5).join('\n');
}

/**
 * Generate summary for long content
 */
function generateSummary(content: string, maxLength: number): string {
  const type = detectResultType(content);
  
  // Extract key info
  const keyInfo = extractKeyInfo(content, type);
  
  // If key info is short enough, use it
  if (keyInfo.length < maxLength * 0.5) {
    return `[Summary] ${keyInfo}\n[Truncated ${content.length} → ${maxLength} chars]`;
  }
  
  // Otherwise, truncate with key start/end
  const start = content.slice(0, maxLength / 2);
  const end = content.slice(-maxLength / 2);
  
  return `${start}\n...\n[${content.length - maxLength} chars truncated]...\n${end}`;
}

/**
 * Truncate tool result intelligently
 */
export function truncateToolResult(
  content: string,
  options: TruncationOptions = DEFAULT_OPTIONS
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // If under limit, return as-is
  if (content.length <= (opts.maxLength || 2000)) {
    return content;
  }
  
  const type = detectResultType(content);
  
  // Preserve errors by default
  if (type === 'error' && opts.preserveErrors) {
    return generateSummary(content, opts.maxLength || 2000);
  }
  
  // Preserve success messages
  if (type === 'success' && opts.preserveSuccess) {
    const successLine = content.split('\n')[0];
    return `${successLine}\n[Output truncated: ${content.length} → ${opts.maxLength} chars]`;
  }
  
  // Summary mode for large content
  if (opts.summaryMode) {
    return generateSummary(content, opts.maxLength || 2000);
  }
  
  // Default: truncate with indicator
  return content.slice(0, opts.maxLength) + `\n\n[... ${content.length - (opts.maxLength || 2000)} chars truncated ...]`;
}

/**
 * Check if content needs truncation
 */
export function needsTruncation(
  content: string,
  maxLength: number = 2000
): boolean {
  return content.length > maxLength;
}

/**
 * Estimate token savings from truncation
 */
export function estimateTruncationSavings(
  results: Array<{ content: string }>,
  maxLength: number = 2000
): {
  originalTokens: number;
  truncatedTokens: number;
  savings: number;
  savingsPercent: number;
} {
  let originalChars = 0;
  let truncatedChars = 0;
  
  for (const result of results) {
    const content = result.content || '';
    originalChars += content.length;
    truncatedChars += Math.min(content.length, maxLength);
  }
  
  const originalTokens = Math.ceil(originalChars / 4);
  const truncatedTokens = Math.ceil(truncatedChars / 4);
  const savings = originalTokens - truncatedTokens;
  const savingsPercent = originalTokens > 0 ? Math.round((savings / originalTokens) * 100) : 0;
  
  return {
    originalTokens,
    truncatedTokens,
    savings,
    savingsPercent
  };
}
