/**
 * Memory Consolidator - REM Cycle Implementation
 * 
 * Wolverine's "Sleep Mode" - Consolidates raw conversation logs into dense,
 * durable knowledge during idle periods (heartbeat or user inactivity).
 * 
 * Inspired by human sleep cycles:
 * - NREM (Stage 1): De-noising - strip transient data
 * - Light REM (Stage 2): Fact extraction - identify durable entities
 * - Deep REM (Stage 3): File sync - write to permanent workspace files
 * 
 * @module agent/memory-consolidator
 */

import fs from 'fs';
import path from 'path';
import { getBrainDB } from '../db/brain';
import { getConfig } from '../config/config';
import { getProvider as getOllamaClient } from '../providers/factory';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ConsolidationResult {
  stage: 'nrem' | 'light_rem' | 'deep_rem';
  timestamp: number;
  input_chars: number;
  output_chars: number;
  compression_ratio: number;
  facts_extracted?: ExtractedFact[];
  files_updated?: string[];
  noise_removed?: NoiseSummary;
}

export interface NoiseSummary {
  tool_outputs_stripped: number;
  duplicate_lines_removed: number;
  temporary_errors_removed: number;
  reasoning_stripped: number;
  total_lines_before: number;
  total_lines_after: number;
}

export interface ExtractedFact {
  id: string;
  type: 'preference' | 'lesson' | 'project' | 'skill' | 'constraint' | 'workflow';
  content: string;
  confidence: number; // 0.0 - 1.0
  evidence_count: number; // How many times observed
  source_locations: string[]; // Which messages support this
  should_write: boolean; // Only if confidence > 0.7
  created_at: number;
}

export interface PersonaUpdate {
  file: 'USER.md' | 'SOUL.md' | 'SELF.md' | 'HEARTBEAT.md';
  additions: string[];
  modifications: Array<{ old: string; new: string; section?: string }>;
  deletions: string[];
  confidence: number;
  requires_approval: boolean;
  reason: string;
}

export interface REMCycleConfig {
  enabled: boolean;
  idle_threshold_minutes: number;
  heartbeat_trigger: boolean;
  auto_apply_confidence_threshold: number; // Auto-apply if confidence > this
  max_file_backup_age_days: number;
  notify_on_significant_discovery: boolean;
}

// ─── Noise Patterns ────────────────────────────────────────────────────────────

/**
 * Patterns that indicate "noise" - transient data that doesn't need long-term storage
 */
const NOISE_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  description: string;
  keep_if_contains?: RegExp; // Exceptions to keep
}> = [
    {
      name: 'tool_output_duplicate',
      pattern: /^Tool output:.*\n(Tool output:|\[Tool)/m,
      description: 'Duplicate tool call outputs',
    },
    {
      name: 'self_corrected_error',
      pattern: /Error:.*?\n[\s\S]*?(Error fixed|resolved|Solution:)/m,
      description: 'Errors that were fixed in same session',
    },
    {
      name: 'thinking_tags',
      pattern: /<think>[\s\S]*?<\/think>/gi,
      description: 'Already-extracted reasoning (thinking tags)',
    },
    {
      name: 'archived_context',
      pattern: /\[Archived.*to save context\]|\[Omitted older turn|\[... turn archived/m,
      description: 'Already-compacted content markers',
    },
    {
      name: 'temporary_file_list',
      pattern: /^[- ]*\.(gitignore|DS_Store|env\.example|tmp|bak|swp)$/m,
      description: 'Temporary file listings from directory scans',
    },
    {
      name: 'stack_trace_detail',
      pattern: /at\s+[A-Za-z0-9_.<>]+\s+\([^)]+\):\d+:\d+/g,
      description: 'Detailed stack traces (keep error message only)',
    },
    {
      name: 'base64_data',
      pattern: /data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{100,}/g,
      description: 'Embedded base64 images (too large for memory)',
    },
    {
      name: 'repeated_greeting',
      pattern: /^(Hi|Hello|Hey|Greetings)[,!\s]*(How are you|what can you do)?$/gim,
      description: 'Generic greetings (keep first only)',
    },
  ];

/**
 * Patterns that indicate "signal" - durable knowledge worth preserving
 */
const SIGNAL_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  fact_type: ExtractedFact['type'];
  confidence_boost: number;
}> = [
    {
      name: 'explicit_preference',
      pattern: /\b(prefer|always|never|don't|do not|must|should|avoid|hate|like|best|worst)\b.*\b(way|style|method|approach|format|tone)\b/i,
      fact_type: 'preference',
      confidence_boost: 0.3,
    },
    {
      name: 'learned_lesson',
      pattern: /\b(learned|discovered|realized|found out|turns out|note to self)\b/i,
      fact_type: 'lesson',
      confidence_boost: 0.2,
    },
    {
      name: 'project_mention',
      pattern: /\b(working on|building|creating|project called|my app|the repo)\b.*["']([^"']{3,})["']/i,
      fact_type: 'project',
      confidence_boost: 0.2,
    },
    {
      name: 'workflow_rule',
      pattern: /\b(when.*then|after.*always|before.*never|every time|whenever)\b/i,
      fact_type: 'workflow',
      confidence_boost: 0.25,
    },
    {
      name: 'constraint',
      pattern: /\b(can't|cannot|unable to|doesn't work|fails|broken|limit|restriction)\b.*\b(because|due to|reason)\b/i,
      fact_type: 'constraint',
      confidence_boost: 0.2,
    },
  ];

// ─── Stage 1: NREM (De-noising) ────────────────────────────────────────────────

/**
 * Stage 1: NREM - Strip noise from raw conversation logs
 * 
 * Reads today's memory log and removes transient data while preserving
 * high-signal information (decisions, preferences, outcomes).
 */
export async function runNREMDeNoising(logContent: string): Promise<{
  cleaned: string;
  noise_summary: NoiseSummary;
}> {
  console.log('[REM Cycle] Stage 1: NREM De-noising started...');

  const startTime = Date.now();
  const lines = logContent.split('\n');
  const noise_summary: NoiseSummary = {
    tool_outputs_stripped: 0,
    duplicate_lines_removed: 0,
    temporary_errors_removed: 0,
    reasoning_stripped: 0,
    total_lines_before: lines.length,
    total_lines_after: 0,
  };

  let cleaned = logContent;

  // Apply each noise pattern
  for (const noise of NOISE_PATTERNS) {
    const matches = cleaned.match(noise.pattern);
    if (!matches || matches.length === 0) continue;

    // Check if this noise contains exceptions that should be kept
    let toRemove: string[] = matches;
    if (noise.keep_if_contains) {
      toRemove = matches.filter(m => !noise.keep_if_contains!.test(m));
    }

    // Remove noise
    for (const match of toRemove) {
      cleaned = cleaned.replace(match, () => {
        // Increment appropriate counter
        if (noise.name.includes('tool_output')) noise_summary.tool_outputs_stripped++;
        else if (noise.name.includes('error')) noise_summary.temporary_errors_removed++;
        else if (noise.name.includes('thinking')) noise_summary.reasoning_stripped++;
        else if (noise.name.includes('duplicate')) noise_summary.duplicate_lines_removed++;

        return '[NOISE_REMOVED]';
      });
    }
  }

  // Remove duplicate consecutive lines (common in tool outputs)
  const lineSet = new Set<string>();
  const uniqueLines: string[] = [];
  for (const line of cleaned.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('[NOISE_REMOVED]') && lineSet.has(trimmed)) {
      noise_summary.duplicate_lines_removed++;
      continue;
    }
    if (trimmed && !trimmed.startsWith('[NOISE_REMOVED]')) {
      lineSet.add(trimmed);
      uniqueLines.push(line);
    }
  }

  // Clean up noise markers
  cleaned = uniqueLines
    .join('\n')
    .replace(/\n\[NOISE_REMOVED\](\n|$)/g, '$1')
    .replace(/\[NOISE_REMOVED\]/g, '')
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();

  noise_summary.total_lines_after = cleaned.split('\n').length;

  const compression_ratio = noise_summary.total_lines_before > 0
    ? noise_summary.total_lines_after / noise_summary.total_lines_before
    : 0;

  console.log(`[REM Cycle] NREM complete: ${noise_summary.total_lines_before} → ${noise_summary.total_lines_after} lines (${(compression_ratio * 100).toFixed(0)}% of original)`);

  return { cleaned, noise_summary };
}

// ─── Stage 2: Light REM (Fact Extraction) ─────────────────────────────────────

/**
 * Stage 2: Light REM - Extract durable facts from cleaned logs
 * 
 * Uses the LLM to identify and extract high-confidence facts that should
 * be preserved in permanent workspace files.
 */
export async function runLightREMFactExtraction(
  cleanedLog: string,
  sessionId: string = 'rem_cycle'
): Promise<ExtractedFact[]> {
  console.log('[REM Cycle] Stage 2: Light REM Fact Extraction started...');

  const ollama = getOllamaClient();
  const model = 'qwen3:4b'; // Use primary model

  // Build extraction prompt optimized for 4B models
  const extractionPrompt = buildExtractionPrompt(cleanedLog);

  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: 'You are Wolverine\'s memory consolidation system. Extract ONLY high-confidence facts from conversation logs. Be conservative - if unsure, don\'t extract.',
      },
      {
        role: 'user',
        content: extractionPrompt,
      },
    ];

    const result = await ollama.chat(messages, model, {
      temperature: 0.1, // Low temp for consistent extraction
      num_ctx: 4096,
      max_tokens: 2048,
    });

    // Parse JSON response
    const content = result.message.content;
    if (!content) {
      console.warn('[REM Cycle] Light REM: Empty response');
      return [];
    }
    const jsonMatch = typeof content === 'string' ? content.match(/\{[\s\S]*\}/) : null;
    if (!jsonMatch) {
      console.warn('[REM Cycle] Light REM: Could not parse JSON response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const facts: ExtractedFact[] = (parsed.facts || []).map((f: any, i: number) => ({
      id: `fact_${Date.now()}_${i}`,
      type: f.type || 'lesson',
      content: f.content || '',
      confidence: Math.min(1.0, Math.max(0.0, f.confidence || 0.5)),
      evidence_count: f.evidence_count || 1,
      source_locations: f.source_locations || [],
      should_write: (f.confidence || 0.5) >= 0.7,
      created_at: Date.now(),
    }));

    // Filter to only high-confidence facts
    const highConfidenceFacts = facts.filter(f => f.confidence >= 0.6);

    console.log(`[REM Cycle] Light REM: Extracted ${highConfidenceFacts.length} high-confidence facts from ${facts.length} total`);

    // Log extracted facts to brain for review
    const brain = getBrainDB();
    for (const fact of highConfidenceFacts) {
      brain.upsertMemory({
        key: fact.id,
        content: fact.content,
        category: `rem_${fact.type}`,
        importance: fact.confidence,
        source: 'rem_cycle',
        scope: 'global',
      });
    }

    return highConfidenceFacts;
  } catch (error: any) {
    console.warn('[REM Cycle] Light REM failed:', error.message);
    return [];
  }
}

/**
 * Build extraction prompt optimized for 4B models
 */
function buildExtractionPrompt(logContent: string): string {
  return `
Extract durable facts from this conversation log.

RULES:
1. Extract ONLY if mentioned 2+ times OR user explicitly stated with "prefer/always/never"
2. Confidence scoring:
   - 0.9: User said "always", "never", "prefer", "must"
   - 0.7: Observed 3+ times in conversation
   - 0.6: Observed 2 times
   - 0.5 or lower: Inferred or mentioned once (DO NOT extract)
3. DO NOT extract if confidence < 0.6
4. Be conservative - better to miss a fact than extract wrong one

FACT TYPES:
- preference: User's stated preferences (tone, style, workflow)
- lesson: Something learned from failure/success
- project: Active projects user is working on
- skill: Capabilities created or used successfully
- constraint: Limitations discovered (can't do X because Y)
- workflow: Repeated patterns (when X, always do Y)

OUTPUT FORMAT (JSON ONLY):
{
  "facts": [
    {
      "type": "preference",
      "content": "User prefers concise responses without filler phrases",
      "confidence": 0.9,
      "evidence_count": 2,
      "source_locations": ["turn_5", "turn_12"]
    }
  ]
}

CONVERSATION LOG:
${logContent.slice(0, 6000)}

EXTRACT FACTS:
`.trim();
}

// ─── Stage 3: Deep REM (File Sync) ────────────────────────────────────────────

/**
 * Stage 3: Deep REM - Sync extracted facts to workspace files
 * 
 * Updates USER.md, SOUL.md, SELF.md with high-confidence facts.
 * Low-confidence changes are queued for human review.
 */
export async function runDeepREMFileSync(
  facts: ExtractedFact[],
  config: REMCycleConfig
): Promise<{
  updates_applied: number;
  updates_pending_review: number;
  files_modified: string[];
}> {
  console.log('[REM Cycle] Stage 3: Deep REM File Sync started...');

  const workspacePath = getConfig().getWorkspacePath();
  const updates_applied = 0;
  const updates_pending_review = 0;
  const files_modified: string[] = [];

  // Group facts by target file
  const factsByFile = groupFactsByTargetFile(facts);

  for (const [file, fileFacts] of Object.entries(factsByFile)) {
    const filePath = path.join(workspacePath, file);

    // Create backup before modifying
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.rem_backup_${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(`[REM Cycle] Created backup: ${path.basename(backupPath)}`);
    }

    // Generate update proposal
    const update = generatePersonaUpdate(file as any, fileFacts, config);

    if (update.requires_approval) {
      // Queue for human review
      await queuePendingUpdate(update);
      console.log(`[REM Cycle] Queued ${file} update for review (${update.additions.length} additions, ${update.deletions.length} deletions)`);
    } else {
      // Apply update automatically
      await applyPersonaUpdate(filePath, update);
      files_modified.push(file);
      console.log(`[REM Cycle] Applied ${file} update (confidence: ${update.confidence})`);
    }
  }

  return {
    updates_applied,
    updates_pending_review,
    files_modified,
  };
}

/**
 * Group facts by which workspace file they should update
 */
function groupFactsByTargetFile(facts: ExtractedFact[]): Record<string, ExtractedFact[]> {
  const grouped: Record<string, ExtractedFact[]> = {
    'USER.md': [],
    'SOUL.md': [],
    'SELF.md': [],
    'HEARTBEAT.md': [],
  };

  for (const fact of facts) {
    if (!fact.should_write) continue;

    switch (fact.type) {
      case 'preference':
        grouped['USER.md'].push(fact);
        break;
      case 'lesson':
      case 'skill':
        grouped['SOUL.md'].push(fact);
        break;
      case 'project':
      case 'workflow':
        grouped['SELF.md'].push(fact);
        break;
      case 'constraint':
        grouped['HEARTBEAT.md'].push(fact);
        break;
    }
  }

  // Remove empty files
  for (const file of Object.keys(grouped)) {
    if (grouped[file].length === 0) delete grouped[file];
  }

  return grouped;
}

/**
 * Generate persona update proposal
 */
function generatePersonaUpdate(
  file: 'USER.md' | 'SOUL.md' | 'SELF.md' | 'HEARTBEAT.md',
  facts: ExtractedFact[],
  config: REMCycleConfig
): PersonaUpdate {
  const avgConfidence = facts.reduce((sum, f) => sum + f.confidence, 0) / facts.length;
  const requiresApproval = avgConfidence < config.auto_apply_confidence_threshold;

  const additions = facts.map(f => `## ${f.type.charAt(0).toUpperCase() + f.type.slice(1)}\n${f.content}`);

  return {
    file,
    additions,
    modifications: [],
    deletions: [],
    confidence: avgConfidence,
    requires_approval: requiresApproval,
    reason: requiresApproval
      ? `Average confidence (${(avgConfidence * 100).toFixed(0)}%) below threshold (${config.auto_apply_confidence_threshold * 100}%)`
      : `High confidence facts (${facts.length} items, ${(avgConfidence * 100).toFixed(0)}% avg)`,
  };
}

/**
 * Queue update for human review
 */
async function queuePendingUpdate(update: PersonaUpdate): Promise<void> {
  const brain = getBrainDB();

  brain.upsertMemory({
    key: `pending_update_${Date.now()}`,
    content: JSON.stringify(update, null, 2),
    category: 'pending_review',
    importance: update.confidence,
    source: 'rem_cycle',
    scope: 'global',
  });
}

/**
 * Apply persona update to file
 */
async function applyPersonaUpdate(filePath: string, update: PersonaUpdate): Promise<void> {
  let content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8')
    : `# ${path.basename(filePath)}\n\n`;

  // Add new facts to appropriate section
  const sectionHeader = `## REM Cycle Updates - ${new Date().toLocaleDateString()}`;
  const additionsText = update.additions.join('\n\n');

  content += `\n\n${sectionHeader}\n\n${additionsText}\n`;

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`[REM Cycle] Updated ${path.basename(filePath)}`);
}

// ─── Main REM Cycle Orchestrator ──────────────────────────────────────────────

export interface REMCycleOptions {
  force?: boolean; // Run even if not idle
  stage?: 'nrem' | 'light_rem' | 'deep_rem' | 'full'; // Run specific stage only
  sessionId?: string;
}

/**
 * Run complete REM Cycle (all 3 stages)
 */
export async function runREMCycle(options: REMCycleOptions = {}): Promise<ConsolidationResult[]> {
  console.log('[REM Cycle] Starting consolidation cycle...');
  const results: ConsolidationResult[] = [];

  const config: REMCycleConfig = {
    enabled: true,
    idle_threshold_minutes: 10,
    heartbeat_trigger: true,
    auto_apply_confidence_threshold: 0.8,
    max_file_backup_age_days: 7,
    notify_on_significant_discovery: true,
  };

  // Load today's memory log
  const workspacePath = getConfig().getWorkspacePath();
  const today = new Date().toISOString().slice(0, 10);
  const logPath = path.join(workspacePath, 'memory', `${today}.md`);

  if (!fs.existsSync(logPath)) {
    console.log('[REM Cycle] No memory log found for today, skipping');
    return results;
  }

  const logContent = fs.readFileSync(logPath, 'utf-8');
  const sessionId = options.sessionId || `rem_${Date.now()}`;

  // Stage 1: NREM (De-noising) - always run first
  const nremResult = await runNREMDeNoising(logContent);
  results.push({
    stage: 'nrem',
    timestamp: Date.now(),
    input_chars: logContent.length,
    output_chars: nremResult.cleaned.length,
    compression_ratio: nremResult.cleaned.length / logContent.length,
    noise_removed: nremResult.noise_summary,
  });

  // Stage 2: Light REM (Fact Extraction)
  const facts = await runLightREMFactExtraction(nremResult.cleaned, sessionId);
  const lightRemResult: ConsolidationResult = {
    stage: 'light_rem',
    timestamp: Date.now(),
    input_chars: nremResult.cleaned.length,
    output_chars: JSON.stringify(facts).length,
    compression_ratio: facts.length > 0 ? JSON.stringify(facts).length / nremResult.cleaned.length : 0,
    facts_extracted: facts,
  };
  results.push(lightRemResult);

  // Stage 3: Deep REM (File Sync)
  const syncResult = await runDeepREMFileSync(facts, config);
  results.push({
    stage: 'deep_rem',
    timestamp: Date.now(),
    input_chars: JSON.stringify(facts).length,
    output_chars: 0, // File writes don't have simple char count
    compression_ratio: 0,
    files_updated: syncResult.files_modified,
  });

  console.log('[REM Cycle] Consolidation complete', {
    stages_completed: results.length,
    facts_extracted: results.find(r => r.stage === 'light_rem')?.facts_extracted?.length || 0,
    files_updated: results.find(r => r.stage === 'deep_rem')?.files_updated?.length || 0,
  });

  return results;
}

/**
 * Check if user is idle (no activity for threshold)
 */
export function isUserIdle(thresholdMinutes: number = 10): boolean {
  const brain = getBrainDB();

  try {
    // 🎯 Use explicit category filter for 100% precision
    const lastActivity = brain.searchMemories('', {
      category: 'activity',
      max: 1
    });

    if (lastActivity.length === 0) return true; // No activity recorded

    const lastTime = new Date(lastActivity[0].updated_at).getTime();
    const idleMinutes = (Date.now() - lastTime) / (1000 * 60);

    return idleMinutes >= thresholdMinutes;
  } catch {
    return false; // Assume not idle on error
  }
}

/**
 * Record user activity (call this on every user message)
 */
export function recordUserActivity(sessionId: string): void {
  const brain = getBrainDB();

  brain.upsertMemory({
    key: 'last_user_activity', // Constant key so it just updates the timestamp
    content: `User active in session ${sessionId}`,
    category: 'activity',
    importance: 0.1, // Low importance, auto-pruned
    source: 'activity_tracker',
    session_id: sessionId, // Explicitly bind to session
    scope: 'global',
  });
}
