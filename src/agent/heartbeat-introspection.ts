/**
 * Heartbeat Introspection
 * 
 * Wolverine's idle thinking when heartbeat fires.
 * This is Phase 1: Heartbeat Introspection - Wolverine thinks about:
 * - Recent failures → What went wrong?
 * - Recent successes → What worked?
 * - Patterns → How to improve
 * - Gaps → Can I fill them?
 * 
 * This is the foundation for self-improvement!
 */

import { getBrainDB } from '../db/brain';
import { scanAllCapabilities, formatCapabilitiesForLLM } from './capability-scanner';
import { selfQuery, canDo } from './self-query';

export interface IntrospectionResult {
  timestamp: number;
  focus_areas: string[];
  learnings: string[];
  improvements: string[];
  gaps_identified: string[];
}

export interface IntrospectionErrorPattern {
  tool: string;
  error_message: string;
  count: number;
  last_seen: number;
  possible_cause?: string;
}

/**
 * Analyze recent errors from BrainDB
 */
async function analyzeRecentErrors(): Promise<IntrospectionErrorPattern[]> {
  const brain = getBrainDB();
  const errors: IntrospectionErrorPattern[] = [];

  try {
    // Search for error memories
    const memories = brain.searchMemories('error failed exception', { max: 20, scope: 'global' });

    // Group by tool
    const byTool = new Map<string, IntrospectionErrorPattern>();

    for (const mem of memories) {
      // Try to extract tool name from memory
      const content = mem.content;

      // Look for tool mentions
      const toolMatch = content.match(/(?:tool|command|function):\s*(\w+)/i);
      const toolName = toolMatch ? toolMatch[1] : 'unknown';

      if (!byTool.has(toolName)) {
        byTool.set(toolName, {
          tool: toolName,
          error_message: content.slice(0, 200),
          count: 1,
          last_seen: new Date(mem.created_at).getTime()
        });
      } else {
        const existing = byTool.get(toolName)!;
        existing.count++;
        existing.last_seen = Math.max(existing.last_seen, new Date(mem.created_at).getTime());
      }
    }

    // Convert to array
    for (const [_, pattern] of byTool) {
      // Analyze possible cause
      pattern.possible_cause = analyzeErrorCause(pattern);
      errors.push(pattern);
    }
  } catch {
    // BrainDB might not be ready
  }

  return errors.sort((a, b) => b.count - a.count).slice(0, 5);
}

/**
 * Analyze error to find possible cause
 */
function analyzeErrorCause(pattern: IntrospectionErrorPattern): string {
  const error = pattern.error_message.toLowerCase();

  if (error.includes('permission') || error.includes('denied')) {
    return 'File permission issue - may need different path or sudo';
  }

  if (error.includes('not found') || error.includes('enoent')) {
    return 'File/directory not exists - check path or create first';
  }

  if (error.includes('timeout')) {
    return 'Operation took too long - may need retry or smaller scope';
  }

  if (error.includes('syntax')) {
    return 'Syntax error - review code carefully';
  }

  if (error.includes('api') || error.includes('key')) {
    return 'API configuration missing - needs setup';
  }

  return 'Unknown cause - requires manual investigation';
}

/**
 * Analyze recent successes
 */
async function analyzeRecentSuccesses(): Promise<string[]> {
  const brain = getBrainDB();
  const successes: string[] = [];

  try {
    const memories = brain.searchMemories('success completed created updated', { max: 10, scope: 'global' });

    for (const mem of memories.slice(0, 5)) {
      successes.push(mem.content.slice(0, 150));
    }
  } catch {
    // Ignore
  }

  return successes;
}

/**
 * Generate improvements based on errors
 */
function generateImprovements(errors: IntrospectionErrorPattern[]): string[] {
  const improvements: string[] = [];

  for (const error of errors) {
    if (error.count >= 2) {
      improvements.push(`Frequent error with ${error.tool}: ${error.possible_cause}`);
    }
  }

  // General improvements
  improvements.push('Check file existence before operations');
  improvements.push('Validate API keys before use');
  improvements.push('Use smaller scopes for large operations');

  return improvements;
}

/**
 * Identify capability gaps
 */
async function identifyGaps(): Promise<string[]> {
  const caps = await scanAllCapabilities();
  const gaps: string[] = [];

  // Check what's not configured
  const notConfigured = [
    ...caps.tools.filter(t => t.status === 'requires_config'),
    ...caps.channels.filter(c => c.status === 'requires_config'),
    ...caps.models.filter(m => m.status === 'requires_config')
  ];

  for (const nc of notConfigured) {
    gaps.push(`${nc.name} requires: ${nc.config_needed?.join(', ')}`);
  }

  // Check common missing capabilities
  if (!caps.mcp.find(m => m.name.includes('notion'))) {
    gaps.push('Notion MCP not connected - users may ask to integrate');
  }

  if (!caps.mcp.find(m => m.name.includes('github'))) {
    gaps.push('GitHub MCP not connected - could help with git operations');
  }

  return gaps;
}

/**
 * Main introspection - Wolverine thinks when idle
 */
export async function performIntrospection(): Promise<IntrospectionResult> {
  console.log('[Heartbeat Introspection] Starting idle thinking...');

  // 1. Analyze recent errors
  const errors = await analyzeRecentErrors();

  // 2. Analyze recent successes  
  const successes = await analyzeRecentSuccesses();

  // 3. Generate improvements
  const improvements = generateImprovements(errors);

  // 4. Identify gaps
  const gaps = await identifyGaps();

  // 5. Compile focus areas
  const focus_areas: string[] = [];
  if (errors.length > 0) {
    focus_areas.push(`Recent failures to address (${errors.length} errors found)`);
  }
  if (successes.length > 0) {
    focus_areas.push(`Successful patterns to replicate`);
  }
  if (gaps.length > 0) {
    focus_areas.push(`Potential capability gaps (${gaps.length})`);
  }

  // 6. Store learnings in BrainDB
  const brain = getBrainDB();
  try {
    // Store introspection result
    const introspectionSummary = `
## Heartbeat Introspection ${new Date().toISOString()}

### Focus Areas
${focus_areas.map(f => `- ${f}`).join('\n')}

### Errors Found
${errors.map(e => `- ${e.tool}: ${e.possible_cause} (${e.count}x)`).join('\n')}

### Suggested Improvements
${improvements.map(i => `- ${i}`).join('\n')}

### Capability Gaps
${gaps.map(g => `- ${g}`).join('\n')}
`.trim();

    brain.upsertMemory({
      key: `introspection_${Date.now()}`,
      content: introspectionSummary,
      category: 'introspection'
    });
  } catch {
    // Ignore memory write errors
  }

  console.log('[Heartbeat Introspection] Completed:', {
    errors: errors.length,
    improvements: improvements.length,
    gaps: gaps.length
  });

  return {
    timestamp: Date.now(),
    focus_areas,
    learnings: errors.map(e => `${e.tool}: ${e.possible_cause}`),
    improvements,
    gaps_identified: gaps
  };
}

/**
 * Format introspection for display
 */
export function formatIntrospectionResult(result: IntrospectionResult): string {
  const parts = [
    '🧠 **HEARTBEAT INTROSPECTION**',
    '',
    `*${new Date(result.timestamp).toLocaleString()}*`,
    '',
    '## Focus Areas',
    ...result.focus_areas.map(f => `- ${f}`),
    ''
  ];

  if (result.learnings.length > 0) {
    parts.push('## Recent Learnings');
    parts.push(...result.learnings.map(l => `- ${l}`));
    parts.push('');
  }

  if (result.improvements.length > 0) {
    parts.push('## Suggested Improvements');
    parts.push(...result.improvements.map(i => `- ${i}`));
    parts.push('');
  }

  if (result.gaps_identified.length > 0) {
    parts.push('## Capability Gaps');
    parts.push(...result.gaps_identified.map(g => `- ${g}`));
  }

  return parts.join('\n');
}

/**
 * Quick self-check - simple capability verification
 */
export async function quickSelfCheck(): Promise<{
  capabilities_loaded: number;
  configured: number;
  needs_config: number;
}> {
  const caps = await scanAllCapabilities();

  const all = [...caps.tools, ...caps.skills, ...caps.mcp, ...caps.channels, ...caps.models];

  return {
    capabilities_loaded: all.length,
    configured: all.filter(a => a.status === 'configured' || a.status === 'available').length,
    needs_config: all.filter(a => a.status === 'requires_config').length
  };
}
