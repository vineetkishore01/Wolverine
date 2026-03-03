import { ToolResult } from '../types.js';
import { getBrainDB } from '../db/brain';
import { sanitizeMemoryText } from './memory-utils.js';

// MEMORY_WRITE: model saves a fact to brain.db
export async function executeMemoryWrite(args: {
  fact: string;
  action?: 'append' | 'replace_all' | 'upsert';
  key?: string;
  reference?: string;
  source_tool?: string;
  source_output?: string;
  actor?: 'agent' | 'user' | 'system';
  category?: string;
  importance?: number;
}): Promise<ToolResult> {
  if (!args.fact?.trim()) return { success: false, error: 'fact is required' };

  try {
    const brain = getBrainDB();
    const fact = sanitizeMemoryText(args.fact.trim());
    const actor = args.actor || 'agent';
    const reference = args.reference ? sanitizeMemoryText(args.reference) : undefined;
    const source_tool = args.source_tool ? sanitizeMemoryText(args.source_tool) : undefined;
    const key = args.key ? sanitizeMemoryText(args.key) : fact.slice(0, 80);

    const memory = brain.upsertMemory({
      key,
      content: fact,
      category: args.category || 'fact',
      importance: args.importance ?? 0.5,
      source: actor,
      source_tool: source_tool || null,
      source_ref: reference || null,
      actor: actor
    });

    return {
      success: true,
      stdout: `Memory saved: ${fact}`,
      data: memory
    };
  } catch (err: any) {
    return { success: false, error: `Memory write failed: ${err.message}` };
  }
}

export const memoryWriteTool = {
  name: 'memory_write',
  description: 'Persist a fact to long-term memory (brain.db)',
  execute: executeMemoryWrite,
  schema: {
    fact: 'string (required) - The fact to remember',
    action: 'string (optional) - "append" (default), "upsert" (replace by key), "replace_all"',
    key: 'string (optional) - unique key for upsert',
    category: 'string (optional) - preference, rule, fact, experience, skill_learned',
    importance: 'number (optional, 0.0-1.0) - how important this memory is (default 0.5)',
    reference: 'string (optional) - job/session reference',
    source_tool: 'string (optional) - tool that produced this fact',
    actor: 'string (optional) - agent|user|system'
  },
};

// MEMORY_SEARCH: semantic lookup over memories using SQLite FTS5
export async function executeMemorySearch(args: {
  query: string;
  session_id?: string;
  max?: number;
  category?: string;
}): Promise<ToolResult> {
  const query = String(args?.query || '').trim();
  if (!query) return { success: false, error: 'query is required' };

  try {
    const brain = getBrainDB();
    const sessionId = String(args?.session_id || '').trim() || undefined;
    const max = Math.min(Math.max(Number(args?.max ?? 5), 1), 25);

    const matches = brain.searchMemories(query, {
      session_id: sessionId,
      category: args.category,
      max
    });

    // Bump access counts
    for (const m of matches) brain.bumpAccessCount(m.id);

    const stdout = matches.length
      ? matches.map((m, i) => `${i + 1}. [${m.category}] ${m.key}: ${m.content}`).join('\n')
      : 'No memory matches found.';

    return {
      success: true,
      stdout,
      data: {
        query,
        count: matches.length,
        results: matches,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Memory search failed: ${err.message}` };
  }
}

export const memorySearchTool = {
  name: 'memory_search',
  description: 'Search long-term memory (brain.db) for relevant facts',
  execute: executeMemorySearch,
  schema: {
    query: 'string (required) - what to look for',
    category: 'string (optional) - filter by category',
    session_id: 'string (optional) - narrow to session context',
    max: 'number (optional, default 5) - max results',
  },
};

// MEMORY_HEALTH_CHECK: Diagnostic tool to verify brain.db status
export async function executeMemoryHealthCheck(args: {}): Promise<ToolResult> {
  try {
    const brain = getBrainDB();
    const db = (brain as any).db;

    const stats: any = {};

    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t: any) => t.name);
    stats.tables = tables;

    // Row counts
    if (tables.includes('memories')) {
      stats.memoryCount = db.prepare("SELECT COUNT(*) as count FROM memories").get().count;
    }
    if (tables.includes('procedures')) {
      stats.procedureCount = db.prepare("SELECT COUNT(*) as count FROM procedures").get().count;
    }
    if (tables.includes('credentials')) {
      stats.credentialCount = db.prepare("SELECT COUNT(*) as count FROM credentials").get().count;
    }

    // FTS Check
    if (tables.includes('memories_fts')) {
      const ftsCnt = db.prepare("SELECT COUNT(*) as count FROM memories_fts").get().count;
      stats.ftsCount = ftsCnt;
      stats.ftsHealthy = ftsCnt === stats.memoryCount;
    }

    const stdout = [
      '🐺 Brain Health Report',
      '====================',
      `Memories: ${stats.memoryCount || 0}`,
      `Procedures: ${stats.procedureCount || 0}`,
      `Connections: ${stats.credentialCount || 0}`,
      `Search Index: ${stats.ftsHealthy ? '✅ Healthy' : '⚠️ Desynced (' + stats.ftsCount + '/' + stats.memoryCount + ')'}`,
      '',
      `Tables: ${tables.join(', ')}`
    ].join('\n');

    return {
      success: true,
      stdout,
      data: stats
    };
  } catch (err: any) {
    return { success: false, error: `Health check failed: ${err.message}` };
  }
}

export const memoryHealthCheckTool = {
  name: 'memory_health_check',
  description: 'Perform a diagnostic check on Wolverine\'s brain database logic',
  execute: executeMemoryHealthCheck,
  schema: {},
};
