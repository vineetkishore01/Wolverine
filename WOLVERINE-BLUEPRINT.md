# Wolverine Implementation Blueprint 🐺

> **Purpose:** Step-by-step instructions for any coding agent to implement Wolverine's self-teaching architecture.
> **Last updated:** 2026-03-05 (v1.0.2)
> **Project Root:** `/Users/vineetkishore/FolderX/Wolverine/`

---

## Table of Contents

1. [Project USP & Philosophy](#1-project-usp--philosophy)
2. [Current Architecture Map](#2-current-architecture-map)
- [x] Phase 0: Program vs Workspace Separation (Foolproof)
- [x] Phase 1: Brain Database (SQLite Memory Engine) - **COMPLETE**
- [x] Phase 2: Context Engineer (Dynamic Context Assembly) - **COMPLETE**
- [ ] Phase 3: The Teacher (Procedure Learning & Self-Correction)
- [ ] Phase 4: Reflection & Learning Loop
- [ ] Phase 5: SHIELD.md Sandbox Enforcement (Highest Priority Security)
- [ ] Phase 6: The "Infinite" Scratchpad (Reasoning Aid)
- [ ] Phase 7: Comprehensive Telemetry & Logging (Diagnostics)
- [ ] Phase 8: Context Compactor & Temporal Decay (Adaptive Memory)
- [x] Phase 9: Pinchtab Browser Integration (Token Efficiency & Stealth) - **COMPLETE**
- [x] Phase 10: Industrial CI/CD & Infrastructure (Docker/SemVer/LLM Params) - **COMPLETE**
- [ ] Far Future: Smart Routing & Inter-Agent Event Bus (Multi-GPU/Swarm)
3. [Phase 1: Brain Database](#3-phase-1-brain-database)
4. [Phase 2: Context Engineer](#4-phase-2-context-engineer)
5. [Phase 3: Skill Framework v2](#5-phase-3-skill-framework-v2)
6. [Phase 4: Reflection & Learning Loop](#6-phase-4-reflection--learning-loop)
7. [Phase 5: SHIELD.md Enforcement Engine](#7-phase-5-shieldmd-enforcement-engine)
8. [Phase 6: The Infinite Scratchpad](#8-phase-6-the-infinite-scratchpad)
9. [Phase 7: Telemetry & Logging](#9-phase-7-telemetry--logging)
10. [Phase 8: Context Compactor](#10-phase-8-context-compactor)
11. [Phase 9: Pinchtab Integration](#11-phase-9-pinchtab-integration)
12. [Phase 10: Industrial CI/CD & Infrastructure](#12-phase-10-industrial-ci/cd--infrastructure)
13. [Far Future: Swarm Event Bus](#13-far-future-swarm-event-bus)
14. [Verification Plan](#14-verification-plan)
15. [Migration Guide](#15-migration-guide)
16. [Reference: Competitor Study Files](#16-reference-competitor-study-files)

---

## 1. Project USP & Philosophy

**Wolverine targets ultralight hardware (e.g., a single 1050ti 4GB GPU) running small, dumb, local models (qwen3.5:4b).** This is the USP. 

- **Single Model Constraint:** We run *one* model sequentially. Multi-agent "Swarm" protocols are pushed to the far future because a 4GB GPU cannot handle multiple simultaneous sub-agents. We are a unified, hyperfast sequential system.
- **Multi-Provider Support:** While local-first, Wolverine supports Ollama, llama.cpp, LM Studio, and OpenAI (Key/OAuth) for maximum flexibility.
- **The model is forgetful** — limited context window (4K-8K usable tokens).
- **The SYSTEM compensates** — the architecture makes the model appear smart by intelligently paging data in and out of the prompt.
- **Configurable Control:** Users can now tune `num_ctx` and `num_predict` per provider from the dashboard to optimize performance for their hardware.

### Core Innovations

| Innovation | What It Does | Why It Matters |
|---|---|---|
| **Persistent Brain (brain.db)** | SQLite with FTS5 replaces flat MEMORY.md | Searchable, categorized memory with zero external deps |
| **Context Engineer** | Smart per-turn prompt assembly | Only relevant memories injected → saves context tokens |
| **Procedure Storage** | Learned multi-step workflows in SQLite | Cron jobs work because steps are in DB, not in model's head |
| **Skill Framework v2** | Agent creates its own SKILL.md files | Self-teaching: learn from browser, ask for creds, create tools |
| **Shifting Context Trick** | Pre-compaction memory flush (already exists) | Nothing is truly forgotten — flushed to brain.db before eviction |

---

## 2. Current Architecture Map

### Critical Files & Their Roles

```
src/
├── config/
│   └── soul-loader.ts          ← SYSTEM PROMPT ASSEMBLY
│       ├── buildSystemPrompt()    (L274+) — builds the prompt with SQLite context
│       ├── loadWorkspaceBootstrap() (L215+) — injects SOUL/IDENTITY/USER
│       ├── selectSkillSlugsForMessage() (L162+) — keyword-matches skills per message
│       ├── loadSoul()             — reads soul.md
│       └── loadSkills()           — reads SKILL.md from each skill directory
│
├── gateway/
│   ├── server-v2.ts             ← MAIN SERVER (7807 lines — monolith)
│   │   ├── buildTools() (L806)  — hardcoded array of 25+ tool definitions
│   │   ├── handleChat() (L2474) — main chat loop, calls Ollama, processes tool calls
│   │   └── Uses: getHistoryForApiCall(sessionId, 5) for conversation history
│   │
│   ├── session.ts               ← CONVERSATION HISTORY + SHIFTING CONTEXT
│   │   ├── addMessage() (L238)  — adds message, checks context thresholds
│   │   ├── Memory flush trigger: L276-297 (thresholdTokens check)
│   │   ├── Compaction trigger: L254-273 (compactionThresholdTokens check)
│   │   ├── PRE_COMPACTION_MEMORY_FLUSH_PROMPT (L31-39) — the shifting context trick
│   │   └── Token estimation: estimateHistoryTokens() used for threshold checks
│   │
│   ├── memory-manager.ts        ← MEMORY WRITE ROUTING (SQLite Powered)
│       ├── addMemoryFact() (L170)  — routes facts to BrainDB
│       ├── decideMemoryWrite() (L64) — classifies by confidence/scope/type
│       └── DECOMMISSIONED: appendDailyMemoryNote, upsertTypedMemoryFact
│   │
│   ├── brain.ts                 ← BRAIN DATABASE (SQLite + FTS5)
│       ├── stores to: ~/.wolverine/brain.db
│       ├── upsertMemory() — atomic persistence with category/importance
│       ├── searchMemories() — high-performance full-text search
│       └── DECOMMISSIONED: fact-store.ts, facts.json
│   │
│   └── fact-store.ts            ← CURRENT FACT STORAGE (JSON file)
│   │   ├── stores to: .smallclaw/facts.json
│   │   ├── queryFactRecords() (L225) — string matching + temporal decay scoring
│   │   ├── upsertFactRecord() (L155) — insert/update with deduplication
│   │   ├── Uses: mmrRerank() from memory-mmr.ts for diversity
│   │   └── KEY LIMITATION: No full-text search, pure substring matching on tokens
│   │
│   └── task-runner.ts           ← MULTI-STEP TASK EXECUTION
│       ├── TaskRunner class (L68-349) — sliding context window architecture
│       ├── Journal entries (compressed step summaries)
│       └── buildTaskPrompt() (L264) — builds per-step prompts with journal context
│
├── tools/
│   ├── memory.ts                ← MEMORY TOOLS (agent-facing)
│   │   ├── executeMemoryWrite() — writes to flat MEMORY.md file
│   │   ├── executeMemorySearch() — queries fact-store.ts JSON
│   │   └── IMPORTANT: These tool interfaces stay the same, only backend changes
│   │
│   ├── registry.ts              ← TOOL REGISTRY (exists but UNUSED by server-v2)
│   │   ├── Tool interface defined
│   │   └── ToolRegistry class with register/list/execute
│   │
│   ├── skills.ts                ← SKILL TOOLS
│   │   ├── executeSkillList/Search/Install/Upload/Exec
│   │   └── Skill execution uses shell templates with placeholder rendering
│   │
│   └── shell.ts                 ← SHELL EXECUTION (used by skill exec)
│
├── skills/
│   ├── connector.ts             ← SKILL CREDENTIAL MANAGEMENT
│   │   ├── SkillConnector interface — { id, name, requirements[] }
│   │   ├── 15 pre-defined connectors (email, github, notion, mcp, etc.)
│   │   ├── SkillConnectorManager.connect() — saves to skill-connectors.json
│   │   └── LIMITATION: Connectors are hardcoded, agent can't create new ones
│   │
│   ├── processor.ts             ← SKILL MANIFEST PARSING
│   │   └── Parses SKILL.md → SkillManifest with templates, requirements, risk levels
│   │
│   └── store.ts                 ← SKILL DIRECTORY MANAGEMENT
│       └── resolveSkillsRoot() — locates .smallclaw/skills/
│
├── db/
│   └── database.ts              ← EXISTING SQLite DB (jobs/tasks/steps)
│       ├── Uses: better-sqlite3 (ALREADY A DEPENDENCY)
│       ├── Path: ~/.smallclaw/jobs.db
│       └── Tables: jobs, tasks, steps, artifacts, approvals, synthesis_logs, memory_logs, agent_sessions, agent_failures
│
└── types.ts                     ← CORE TYPE DEFINITIONS
```

### Token Budget System (soul-loader.ts L25-31)
```
PROMPT_BUDGET_FULL:
  totalChars:      3600   (≈900 tokens at 4 chars/token)
  soulChars:       1400   (personality)
  memoryChars:      700   (curated profile memories)
  skillsTotalChars: 1400  (active skill documentation)
  skillEachChars:   900   (cap per individual skill)
  extraChars:      1000   (injected instructions)
```

### Key Dependencies Already Installed
- `better-sqlite3` — SQLite bindings (used by database.ts)
- No vector/embedding libraries — and we don't need them (FTS5 is built into SQLite)

---

## 3. Phase 1: Brain Database (SQLite Memory Engine) - COMPLETE ✅

### Goal
Replace flat MEMORY.md + facts.json with a single SQLite database that supports full-text search, categorized memories, and stored procedures.

### Step 1.1: Create `src/db/brain.ts`

**File:** `src/db/brain.ts` (NEW)

**What it does:** Initializes and manages `brain.db` — the agent's persistent memory.

**Schema to create:**

```sql
-- Table 1: memories (replaces MEMORY.md + facts.json)
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'fact',
    -- Categories: 'preference', 'rule', 'fact', 'experience', 'skill_learned', 'daily'
    key TEXT NOT NULL,
    content TEXT NOT NULL,
    importance REAL DEFAULT 0.5,
    -- 0.0 = trivial, 1.0 = critical. User-stated facts start at 0.9
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    source TEXT DEFAULT 'agent',
    -- 'user', 'agent', 'tool_output', 'reflection', 'system'
    source_tool TEXT,
    source_ref TEXT,
    session_id TEXT,
    scope TEXT DEFAULT 'global',
    -- 'global' or 'session'
    expires_at TEXT,
    -- NULL = permanent
    actor TEXT DEFAULT 'agent'
    -- 'agent', 'user', 'system'
);

-- FTS5 virtual table for full-text search (built into SQLite, zero dependencies)
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    key,
    content,
    content=memories,
    content_rowid=rowid
);

-- Triggers to keep FTS5 in sync
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, key, content) VALUES (new.rowid, new.key, new.content);
END;
CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, key, content) VALUES('delete', old.rowid, old.key, old.content);
END;
CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, key, content) VALUES('delete', old.rowid, old.key, old.content);
    INSERT INTO memories_fts(rowid, key, content) VALUES (new.rowid, new.key, new.content);
END;

-- Table 2: procedures (learned multi-step workflows / SOPs)
CREATE TABLE IF NOT EXISTS procedures (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    -- e.g., "fetch_upsc_news", "obsidian_daily_note"
    description TEXT,
    trigger_keywords TEXT,
    -- comma-separated keywords that activate this procedure
    -- e.g., "upsc,current affairs,news" or "obsidian,daily note"
    steps TEXT NOT NULL,
    -- JSON array of step objects:
    -- [{ "order": 1, "tool": "web_search", "args_template": {"query": "UPSC current affairs {{date}}"}, "description": "Search for latest news" }]
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    last_used TEXT,
    last_result TEXT,
    -- 'success' or 'failed' or null
    created_by TEXT DEFAULT 'agent',
    -- 'agent' (learned) or 'user' (manual) or 'builtin'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memories_last_accessed ON memories(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_procedures_last_used ON procedures(last_used DESC);

-- Table 3: credentials (replaces skill-connectors.json)
CREATE TABLE IF NOT EXISTS credentials (
    skill_id TEXT PRIMARY KEY,
    config TEXT NOT NULL,
    -- JSON string of credential key-value pairs
    connected_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

**DB file location:** `~/.smallclaw/brain.db` (same directory as existing `jobs.db`)

**Class to export:**

```typescript
// src/db/brain.ts
import Database from 'better-sqlite3';  // already a dependency
import { randomUUID } from 'crypto';
import { PATHS } from '../config/paths.js';

const BRAIN_DB_PATH = PATHS.brainDb();  // resolves to ~/.wolverine/brain.db

export interface Memory {
    id: string;
    category: string;
    key: string;
    content: string;
    importance: number;
    access_count: number;
    last_accessed: string | null;
    created_at: string;
    updated_at: string;
    source: string;
    source_tool: string | null;
    source_ref: string | null;
    session_id: string | null;
    scope: string;
    expires_at: string | null;
    actor: string;
}

export interface Procedure {
    id: string;
    name: string;
    description: string | null;
    trigger_keywords: string | null;
    steps: string;          // JSON string
    success_count: number;
    fail_count: number;
    last_used: string | null;
    last_result: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export class BrainDB {
    private db: Database.Database;

    constructor(dbPath?: string) {
        const resolvedPath = dbPath || BRAIN_DB_PATH;
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        this.db = new Database(resolvedPath);
        // CRITICAL: WAL mode for concurrent read/write (Telegram + Web UI sessions)
        this.db.pragma('journal_mode = WAL');
        // Wait up to 5s if another session holds a write lock
        this.db.pragma('busy_timeout = 5000');
        this.initialize();
    }
    initialize(): void { /* CREATE TABLES + FTS5 + triggers + indexes */ }
    
    // ── Memory Operations ──
    upsertMemory(input: Omit<Memory, 'id' | 'created_at' | 'updated_at' | 'access_count' | 'last_accessed'>): Memory;
    searchMemories(query: string, opts?: { category?: string; scope?: string; session_id?: string; max?: number }): Memory[];
    // Uses FTS5 with weighted ranking:
    // SELECT m.*, (fts.rank * -1.0 + m.importance * 0.3 + m.access_count * 0.05
    //   + CASE WHEN m.last_accessed > datetime('now','-7 days') THEN 0.2 ELSE 0 END) AS score
    // FROM memories m JOIN memories_fts fts ON m.rowid = fts.rowid
    // WHERE memories_fts MATCH ? ORDER BY score DESC LIMIT ?
    getMemory(id: string): Memory | null;
    deleteMemory(id: string): boolean;
    pruneExpired(): number;  // delete where expires_at < now
    pruneByImportance(keepTop: number): number;  // keep top N by importance
    bumpAccessCount(id: string): void;  // increment access_count, update last_accessed
    listMemories(opts?: { category?: string; scope?: string; limit?: number }): Memory[];
    
    // ── Procedure Operations ──
    saveProcedure(input: Omit<Procedure, 'id' | 'created_at' | 'updated_at' | 'success_count' | 'fail_count'>): Procedure;
    findProcedure(query: string): Procedure | null;
    // Searches trigger_keywords for matching terms
    getProcedure(nameOrId: string): Procedure | null;
    listProcedures(): Procedure[];
    recordProcedureResult(id: string, success: boolean): void;
    updateProcedureSteps(id: string, steps: string): void;
    deleteProcedure(id: string): boolean;
    
    // ── Credential Operations ──
    saveCredentials(skillId: string, config: Record<string, string>): void;
    getCredentials(skillId: string): Record<string, string> | null;
    listConnectedSkills(): Array<{ skill_id: string; connected_at: string }>;
    deleteCredentials(skillId: string): boolean;
    
    close(): void;
}

// Singleton
let brainInstance: BrainDB | null = null;
export function getBrainDB(): BrainDB { ... }
```

### Step 1.2: Rewire `memory_write` tool backend

**File to modify:** `src/tools/memory.ts`

**What changes:**
- `executeMemoryWrite()` (L7-62): Instead of writing bullets to MEMORY.md via `updateMemory()`, call `getBrainDB().upsertMemory()`
- Keep the same tool interface (name, schema, description) — the agent doesn't need to know the backend changed
- The `action` parameter maps to: `append` → new insert, `upsert` → upsert by key, `replace_all` → delete all + insert

**Exact change at L7:**
```typescript
// BEFORE:
import { loadMemory, updateMemory } from '../config/soul-loader.js';
// AFTER:
import { getBrainDB } from '../db/brain.js';
```

**Rewrite `executeMemoryWrite()` body:**
```typescript
export async function executeMemoryWrite(args: {
    fact: string;
    action?: 'append' | 'replace_all' | 'upsert';
    key?: string;
    reference?: string;
    source_tool?: string;
    source_output?: string;
    actor?: 'agent' | 'user' | 'system';
    category?: string;  // NEW parameter
    importance?: number; // NEW parameter
}): Promise<ToolResult> {
    if (!args.fact?.trim()) return { success: false, error: 'fact is required' };
    const brain = getBrainDB();
    const fact = sanitizeMemoryText(args.fact.trim());
    const key = args.key ? sanitizeMemoryText(args.key) : fact.slice(0, 80);
    
    if (args.action === 'replace_all') {
        // Delete all memories (rare, destructive)
        // Implementation: DELETE FROM memories WHERE scope = 'global'
        // Then insert the new one
    }
    
    brain.upsertMemory({
        category: args.category || 'fact',
        key: key,
        content: fact,
        importance: args.importance ?? 0.5,
        source: args.actor || 'agent',
        source_tool: args.source_tool || null,
        source_ref: args.reference || null,
        session_id: null,
        scope: 'global',
        expires_at: null,
        actor: args.actor || 'agent',
    });
    return { success: true, stdout: `Memory saved: ${fact}` };
}
```

**Tool schema update (add optional fields):**
```typescript
export const memoryWriteTool = {
    name: 'memory_write',
    description: 'Persist a fact to long-term memory (survives restarts)',
    execute: executeMemoryWrite,
    schema: {
        fact: 'string (required) - The fact to remember',
        action: 'string (optional) - "append" (default), "upsert" (replace by key), "replace_all"',
        key: 'string (optional) - unique key for upsert',
        category: 'string (optional) - preference, rule, fact, experience, skill_learned',
        importance: 'number (optional, 0.0-1.0) - how important this memory is (default 0.5)',
        reference: 'string (optional) - job/session reference',
        source_tool: 'string (optional) - tool that produced this fact',
        actor: 'string (optional) - agent|user|system',
    },
};
```

### Step 1.3: Rewire `memory_search` tool backend

**File to modify:** `src/tools/memory.ts`

**What changes:**
- `executeMemorySearch()` (L80-129): Replace `queryFactRecords()` call with `getBrainDB().searchMemories()`
- FTS5 search replaces substring matching → much better recall

**Rewrite `executeMemorySearch()` body:**
```typescript
export async function executeMemorySearch(args: { query: string; session_id?: string; max?: number; category?: string }): Promise<ToolResult> {
    const query = String(args?.query || '').trim();
    if (!query) return { success: false, error: 'query is required' };
    const brain = getBrainDB();
    const max = Math.min(Math.max(Number(args?.max ?? 5), 1), 25);
    
    const matches = brain.searchMemories(query, {
        session_id: args.session_id,
        max,
        category: args.category,
    });
    
    // Bump access counts for returned memories
    for (const m of matches) brain.bumpAccessCount(m.id);
    
    const stdout = matches.length
        ? matches.map((m, i) => `${i + 1}. [${m.category}] ${m.key}: ${m.content}`).join('\n')
        : 'No memory matches found.';
    
    return { success: true, stdout, data: { query, count: matches.length, results: matches } };
}
```

### Step 1.4: Rewire `memory-manager.ts` routing

**File to modify:** `src/gateway/memory-manager.ts`

**What changes at `addMemoryFact()` (L170):**
- Currently routes to: `upsertTypedMemoryFact()` → `fact-store.ts` → `facts.json`
- Change to: `getBrainDB().upsertMemory()` → `brain.db`
- The `decideMemoryWrite()` logic (L64-72) stays — it classifies facts but now writes to SQLite
- `appendDailyMemoryNote()` (L79) can optionally also write to brain.db with `category='daily'`

**Exact changes needed:**
1. Add import: `import { getBrainDB } from '../db/brain.js';`
2. In `upsertTypedMemoryFact()` (L127-168): replace the `upsertFactRecord()` call with `getBrainDB().upsertMemory()`
3. In `appendDailyMemoryNote()` (L79-84): keep writing to filesystem AND also write to brain.db for searchability

### Step 1.5: Add `procedure_save` and `procedure_list` tools

**File:** `src/tools/procedures.ts` (NEW)

**What it provides:**
```typescript
// Tool: procedure_save — agent saves a learned workflow
export async function executeProcedureSave(args: {
    name: string;         // "fetch_upsc_news"
    description?: string; // "Fetch UPSC current affairs and send PDF on Telegram"
    trigger_keywords: string; // "upsc,current affairs,news fetch"
    steps: Array<{
        order: number;
        tool: string;
        args_template: Record<string, any>;
        description: string;
    }>;
}): Promise<ToolResult> { ... }

// Tool: procedure_list — agent lists saved procedures
export async function executeProcedureList(args: {}): Promise<ToolResult> { ... }

// Tool: procedure_get — get steps for a specific procedure
export async function executeProcedureGet(args: { name: string }): Promise<ToolResult> { ... }
```

### Step 1.6: Register new tools in `server-v2.ts`

**File to modify:** `src/gateway/server-v2.ts`

**Where:** Inside `buildTools()` function at L806

**Add these tool definitions to the returned array:**
```typescript
// After existing memory tools, add:
{
    type: 'function',
    function: {
        name: 'procedure_save',
        description: 'Save a learned multi-step workflow that can be reused later. Use after successfully completing a complex task.',
        parameters: {
            type: 'object',
            required: ['name', 'trigger_keywords', 'steps'],
            properties: {
                name: { type: 'string', description: 'Short snake_case name (e.g., "fetch_upsc_news")' },
                description: { type: 'string', description: 'What this procedure does' },
                trigger_keywords: { type: 'string', description: 'Comma-separated keywords that should trigger this procedure' },
                steps: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            order: { type: 'number' },
                            tool: { type: 'string' },
                            args_template: { type: 'object' },
                            description: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
},
{
    type: 'function',
    function: {
        name: 'procedure_list',
        description: 'List all saved procedures/workflows',
        parameters: { type: 'object', properties: {}, required: [] },
    },
},
{
    type: 'function',
    function: {
        name: 'procedure_get',
        description: 'Get the steps of a specific saved procedure by name',
        parameters: {
            type: 'object',
            required: ['name'],
            properties: {
                name: { type: 'string', description: 'Name of the procedure' },
            },
        },
    },
},
```

**Also add tool execution routing** in the tool call handler inside `handleChat()`. Search for the existing tool call switch/if-else chain (grep for `case 'memory_write'` or `if (toolName === 'memory_write'`). Add:
```typescript
case 'procedure_save':
    result = await executeProcedureSave(toolArgs);
    break;
case 'procedure_list':
    result = await executeProcedureList(toolArgs);
    break;
case 'procedure_get':
    result = await executeProcedureGet(toolArgs);
    break;
```

### Step 1.7: Migration script

**File:** `src/db/migrate-to-brain.ts` (NEW)

**What it does:** One-time migration of existing data into brain.db

```typescript
// 1. Read ~/.smallclaw/facts.json → insert each FactRecord into brain.db memories table
// 2. Read workspace/MEMORY.md → parse each bullet line → insert as memory
// 3. Read ~/.smallclaw/skill-connectors.json → insert into brain.db credentials table
// 4. Read workspace/memory/<date>.md files → insert as daily memories
// Run with: npx tsx src/db/migrate-to-brain.ts
```

---

## 4. Phase 2: Context Engineer - COMPLETE ✅

### Goal
Build a module that assembles the optimal prompt for each turn by querying brain.db, matching procedures, and respecting token budgets.

### Step 2.1: Create `src/gateway/context-engineer.ts`

**File:** `src/gateway/context-engineer.ts` (NEW)

**What it does:** Before each chat turn, assembles the most useful context for the small model.

```typescript
// src/gateway/context-engineer.ts
import { getBrainDB } from '../db/brain.js';

export interface ContextPackage {
    relevantMemories: string;      // formatted memory bullets to inject
    matchedProcedure: string | null; // procedure steps if trigger matched
    activeSkillContext: string | null; // skill tools if skill triggered
    tokenEstimate: number;          // estimated tokens used by this context
}

/**
 * Build context package for a user message.
 * Called BEFORE each LLM call in handleChat().
 */
export function buildContextForMessage(
    userMessage: string,
    sessionId: string,
    opts?: {
        maxMemoryTokens?: number;   // default 300 (≈75 tokens worth of chars)
        maxProcedureTokens?: number; // default 400
        maxTotal?: number;           // default 800 chars
    }
): ContextPackage {
    const brain = getBrainDB();
    const maxMem = opts?.maxMemoryTokens ?? 300;
    const maxProc = opts?.maxProcedureTokens ?? 400;
    
    // 1. Search relevant memories
    const memories = brain.searchMemories(userMessage, { max: 5, scope: 'global' });
    for (const m of memories) brain.bumpAccessCount(m.id);
    
    let relevantMemories = '';
    if (memories.length > 0) {
        const bullets = memories.map(m => `- [${m.category}] ${m.content}`);
        relevantMemories = `## Relevant Memories\n${bullets.join('\n')}`;
        if (relevantMemories.length > maxMem * 4) {
            relevantMemories = relevantMemories.slice(0, maxMem * 4) + '\n...[truncated]';
        }
    }
    
    // 2. Match procedure by trigger keywords
    let matchedProcedure: string | null = null;
    const procedure = brain.findProcedure(userMessage);
    if (procedure) {
        const steps = JSON.parse(procedure.steps);
        const stepsText = steps.map((s: any) => 
            `${s.order}. ${s.description} → use tool: ${s.tool}`
        ).join('\n');
        matchedProcedure = [
            `## Saved Procedure: ${procedure.name}`,
            procedure.description || '',
            'Follow these steps (adjust if needed based on results):',
            stepsText,
        ].join('\n');
        if (matchedProcedure.length > maxProc * 4) {
            matchedProcedure = matchedProcedure.slice(0, maxProc * 4) + '\n...[truncated]';
        }
    }
    
    // 3. Estimate tokens
    const totalChars = (relevantMemories?.length || 0) + (matchedProcedure?.length || 0);
    const tokenEstimate = Math.ceil(totalChars / 4);
    
    return { relevantMemories, matchedProcedure, activeSkillContext: null, tokenEstimate };
}
```

### Step 2.2: Integrate into `buildSystemPrompt()`

**File to modify:** `src/config/soul-loader.ts`

**What changes at `buildSystemPrompt()` (L274-336):**

Currently the function builds the prompt by concatenating:
1. Soul (personality) — L300-301
2. Curated memory profile (loads from MEMORY.md, filters for profile/rule/preference tags) — L303-309
3. Workspace bootstrap files (SOUL.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, daily memory) — L311-316
4. Skills — L318-329
5. Extra instructions — L331-333

**The change:** Add a new parameter for injected context and insert it between step 2 and step 3.

```typescript
export interface BuildSystemPromptOptions {
    // ... existing fields ...
    injectedContext?: string;  // NEW: from Context Engineer
}

export function buildSystemPrompt(options?: BuildSystemPromptOptions): string {
    // ... existing soul and memory logic ...
    
    // NEW: Inject context engineer output (relevant memories + matched procedures)
    if (options?.injectedContext) {
        pushPart(options.injectedContext);
    }
    
    // ... rest of existing logic ...
}
```

### Step 2.3: Call Context Engineer from `handleChat()`

**File to modify:** `src/gateway/server-v2.ts`

**Where:** Inside `handleChat()` at L2494 (after getting history, before LLM call)

**Add this code:**
```typescript
// After line 2494: const history = getHistoryForApiCall(sessionId, 5);
// Add:
import { buildContextForMessage } from './context-engineer.js';

const contextPackage = buildContextForMessage(message, sessionId);
const injectedContext = [
    contextPackage.relevantMemories,
    contextPackage.matchedProcedure,
].filter(Boolean).join('\n\n');
```

Then pass `injectedContext` into the system prompt builder wherever `buildSystemPrompt()` is called within `handleChat()`. Search for `buildSystemPrompt` usage in server-v2.ts and add `injectedContext` to the options.

### Step 2.4: Adjust token budget

**File to modify:** `src/config/soul-loader.ts`

**What changes at L25-32:**
```typescript
// Increase total budget to accommodate brain context
const PROMPT_BUDGET_FULL = {
    totalChars: intEnv('SMALLCLAW_PROMPT_TOTAL_CHARS', 4800),  // was 3600
    soulChars: 1400,        // keep
    memoryChars: 200,       // REDUCE from 700 — brain.db handles bulk memory now
    brainContextChars: 1200, // NEW — for context engineer output
    skillsTotalChars: 1400,  // keep
    skillEachChars: 900,     // keep
    extraChars: 1000,        // keep
};
```

**Why reduce memoryChars:** The curated profile memory (`loadCuratedMemoryProfile()`) currently loads tagged bullets from MEMORY.md. With brain.db, we no longer need this broad dump — the Context Engineer provides only relevant memories per-turn. We keep a small budget for a few essential user profile facts.

---

## 5. Phase 3: Skill Framework v2

### Goal
Enable the agent to create new skills by learning from documentation, asking for credentials, and generating SKILL.md files that register real tools.

### Step 3.1: Design SKILL.md v2 format

The existing skill format (parsed by `src/skills/processor.ts`) uses markdown with YAML frontmatter. Extend it:

```markdown
---
name: obsidian
version: 1.0.0
description: Read and write Obsidian vault notes via Local REST API
emoji: 🗃️
category: productivity
author: agent_learned
created: 2026-03-04
---

# Requirements
| key | label | type | required | description |
|-----|-------|------|----------|-------------|
| vault_path | Vault Path | string | yes | Path to Obsidian vault |
| rest_port | REST API Port | number | yes | Local REST API port (default 27124) |

# Tools

## obsidian_search
Search notes in the vault by keyword.
```shell
curl -s "http://localhost:{{rest_port}}/search/simple/?query={{query}}" -H "Authorization: Bearer {{api_key}}"
```

## obsidian_read
Read a specific note's content.
```shell
curl -s "http://localhost:{{rest_port}}/vault/{{note_path}}" -H "Authorization: Bearer {{api_key}}"
```

# Procedures

## daily_note
Trigger: obsidian daily note, write daily note
1. Check if today's note exists → obsidian_search with query "daily/{{today}}"
2. If not found, create it → POST to vault endpoint with template
3. Append today's summary from recent memories
```

### Step 3.2: Create `skill_create` tool

**File:** `src/tools/skill-create.ts` (NEW)

**What it does:** Agent calls this after learning how a service works.

```typescript
export async function executeSkillCreate(args: {
    name: string;
    description: string;
    emoji?: string;
    category?: string;
    requirements?: Array<{
        key: string;
        label: string;
        type: 'string' | 'password' | 'url' | 'number';
        required: boolean;
        description: string;
    }>;
    tools?: Array<{
        name: string;
        description: string;
        command: string;  // shell command with {{placeholders}}
    }>;
    procedures?: Array<{
        name: string;
        trigger: string;
        steps: string[];
    }>;
}): Promise<ToolResult> {
    // 1. Validate inputs
    // 2. Generate SKILL.md content from the structured input
    // 3. Write to .smallclaw/skills/<name>/SKILL.md
    // 4. Write skill.json manifest
    // 5. If the skill includes requirements, add them to connector.ts dynamically
    //    (or write to a connectors registry in brain.db)
    // 6. If tools are defined, register them in the skill manifest
    //    so processor.ts picks them up as executable templates
    // 7. Save any procedures to brain.db procedures table
    // 8. Return success with skill summary
}
```

**Register in `buildTools()` (server-v2.ts L806):**
```typescript
{
    type: 'function',
    function: {
        name: 'skill_create',
        description: 'Create a new skill after learning how a service works. Use this after browsing documentation to create a reusable skill with tools and procedures.',
        parameters: {
            type: 'object',
            required: ['name', 'description'],
            properties: {
                name: { type: 'string', description: 'Short name (e.g., "obsidian", "youtube")' },
                description: { type: 'string', description: 'What this skill does' },
                emoji: { type: 'string' },
                category: { type: 'string', description: 'productivity, communication, development, automation, data' },
                requirements: { type: 'array', description: 'Credentials/config needed', items: { type: 'object' } },
                tools: { type: 'array', description: 'Shell-based tools this skill provides', items: { type: 'object' } },
                procedures: { type: 'array', description: 'Multi-step workflows', items: { type: 'object' } },
            },
        },
    },
},
```

### Step 3.3: Create `skill_test` tool

**File:** `src/tools/skill-test.ts` (NEW)

**What it does:** Agent tests a newly created skill by running one of its tools.

```typescript
export async function executeSkillTest(args: {
    skill_name: string;
    tool_name: string;
    test_args?: Record<string, any>;
}): Promise<ToolResult> {
    // 1. Load skill from .smallclaw/skills/<skill_name>/
    // 2. Find the specified tool
    // 3. Load credentials from brain.db
    // 4. Render template with credentials + test_args
    // 5. Execute the command
    // 6. Return result (success/fail + output)
}
```

### Step 3.4: Dynamic connector registration

**File to modify:** `src/skills/connector.ts`

**What changes:**
Currently `SKILL_CONNECTORS` is a hardcoded array (L32-197). When the agent creates a skill with requirements, those requirements need to be available as a connector.

**Add these methods to `SkillConnectorManager`:**
```typescript
// Load dynamically created connectors from brain.db or skill manifests
loadDynamicConnectors(): SkillConnector[] {
    // Read all skill.json files from .smallclaw/skills/*/
    // Parse requirements section → create SkillConnector objects
    // Merge with static SKILL_CONNECTORS array
}

// Override getAvailableConnectors to include dynamic ones
getAvailableConnectors(): SkillConnector[] {
    return [...SKILL_CONNECTORS, ...this.loadDynamicConnectors()];
}
```

### Step 3.5: Runtime tool registration from skills

**File:** `src/skills/runtime.ts` (NEW)

**What it does:** When a skill with tools is loaded, register those tools so the agent can call them.

```typescript
// Called during server startup and after skill_create
export function registerSkillTools(): Array<{type: 'function', function: {...}}> {
    const skills = loadSkills();  // from soul-loader.ts
    const dynamicTools: any[] = [];
    
    for (const skill of skills) {
        // Parse SKILL.md for ## Tools sections
        // Each tool section becomes a callable tool
        // The tool execution renders the shell template with credentials from brain.db
        // and executes via executeShell()
    }
    
    return dynamicTools;
}
```

**Integrate into `buildTools()` (server-v2.ts L806):**
```typescript
function buildTools() {
    const staticTools = [ /* existing 25+ tool definitions */ ];
    const skillTools = registerSkillTools();  // NEW
    return [...staticTools, ...skillTools];
}
```

---

## 6. Phase 3.5: Pre-generation Research Phase

### Goal
Before Wolverine generates code for a complex new task (like using a new library or connecting to an unknown MCP server), force it into an information-gathering loop to reduce hallucinations.

### Step 3.5.1: Research Trigger Heuristic
Update `server-v2.ts` to detect when a user asks for something outside the agent's pre-loaded skills or brain.db context. If confidence is low, the agent injects a prompt: *"I need to verify the docs for this first."*

### Step 3.5.2: The Grounding Loop
The agent is restricted to read-only tools (`browser_search`, `browser_read`, `read_file`) for the next 2-3 iterations. It is explicitly instructed NOT to output any code or run `executeShell` until the loop completes.

### Step 3.5.3: Research Handoff
Once the research loop satisfies the agent's uncertainty, it summarizes its findings strictly into the current task context (or the Infinite Scratchpad, once implemented) before proceeding to execution.

---

## 6. Phase 4: Reflection & Learning Loop

### Goal
After completing multi-step tasks, the agent reflects on what it did and saves successful patterns as procedures.

### Step 4.1: Create `src/gateway/reflection.ts`

**File:** `src/gateway/reflection.ts` (NEW)

**What it does:** After a multi-step task completes, prompts the agent to reflect and learn.

```typescript
export const POST_TASK_REFLECTION_PROMPT = `
SYSTEM: You just completed a multi-step task. Before continuing, reflect:

1. What steps did you take to complete this task?
2. Was it successful? If not, what went wrong?
3. Should you save this as a reusable procedure? If yes, call procedure_save with:
   - name: short_snake_case_name
   - trigger_keywords: words that should trigger this procedure in future
   - steps: the ordered tool calls you made
4. Did you learn anything new about the user's preferences? If yes, call memory_write.

Reply with REFLECTION_COMPLETE when done.
`;

export function shouldTriggerReflection(
    toolCallCount: number,
    wasSuccessful: boolean
): boolean {
    // Trigger reflection if:
    // - Task used 3+ tool calls (meaningful multi-step work)
    // - AND the task was completed successfully
    return toolCallCount >= 3 && wasSuccessful;
}
```

### Step 4.2: Integrate reflection into task completion

**File to modify:** `src/gateway/server-v2.ts`

**Where:** After the tool execution loop in `handleChat()` completes

**Logic:**
1. Count how many tool calls were made this turn
2. If `shouldTriggerReflection()` returns true, inject `POST_TASK_REFLECTION_PROMPT` as a follow-up message
3. The model then calls `procedure_save` and `memory_write` based on its reflection
4. Filter `REFLECTION_COMPLETE` from the response so user doesn't see it

### Step 4.3: Integrate reflection into `task-runner.ts`

**File to modify:** `src/gateway/task-runner.ts`

**Where:** After `run()` completes (L104-233)

**Add:**
```typescript
// After task completes successfully, save the journal as a procedure
if (this.state.status === 'complete' && this.state.journal.length >= 3) {
    const brain = getBrainDB();
    const steps = this.state.journal.map((entry, i) => ({
        order: i + 1,
        tool: entry.action,
        args_template: {},
        description: entry.result.slice(0, 200),
    }));
    
    // Only save if a similar procedure doesn't already exist
    const existing = brain.findProcedure(this.state.goal);
    if (!existing) {
        brain.saveProcedure({
            name: this.state.goal.replace(/[^a-z0-9]+/gi, '_').toLowerCase().slice(0, 50),
            description: this.state.goal,
            trigger_keywords: extractKeywords(this.state.goal).join(','),
            steps: JSON.stringify(steps),
            last_used: new Date().toISOString(),
            last_result: 'success',
            created_by: 'agent',
        });
    }
}
```

---

## 7. Verification Plan

### Automated Tests

There are no existing test files in `src/` (all test files are in `node_modules/`). 

**Create test file:** `src/db/brain.test.ts`

```bash
# Run with:
npx tsx src/db/brain.test.ts
```

**Test cases to write:**
1. `brain.db` initializes and creates all tables
2. `upsertMemory()` inserts and retrieves a memory
3. `upsertMemory()` with same key updates existing memory
4. `searchMemories()` returns FTS5 matches ranked by relevance
5. `searchMemories()` respects category and scope filters
6. `pruneExpired()` removes expired memories
7. `bumpAccessCount()` increments counter
8. `saveProcedure()` creates and retrieves a procedure  
9. `findProcedure()` matches by trigger keywords
10. `saveCredentials()` / `getCredentials()` round-trips correctly
11. Migration script correctly imports from facts.json and MEMORY.md

### Manual Verification

**After Phase 1 (Brain DB):**
1. Start the server: `npm run dev`
2. Send a message via Telegram or Web UI: "Remember that I prefer dark mode"
3. Send another message: "What do you remember about me?"
4. Expected: Agent should recall "dark mode" preference from brain.db
5. Verify brain.db exists: `ls ~/.smallclaw/brain.db`
6. Verify data: `sqlite3 ~/.smallclaw/brain.db "SELECT * FROM memories;"`

**After Phase 2 (Context Engineer):**
1. Populate a few memories: "My name is Vineet", "I am studying for UPSC", "I prefer PDF format"
2. Ask: "Fetch UPSC news" 
3. Check server logs — should show "Injecting relevant memories: [fact] studying for UPSC, [preference] prefers PDF format"
4. The agent should NOT inject "My name is Vineet" (irrelevant to this request)

**After Phase 3 (Skill Framework):**
1. Tell the agent: "Learn how to connect to my Obsidian vault. I have the Local REST API plugin running on port 27124."
2. Expected: Agent should use browser to read docs, then call `skill_create` with obsidian tools
3. Verify: `ls ~/.smallclaw/skills/obsidian/SKILL.md`
4. Test: "Search my obsidian notes for react hooks"
5. Expected: Agent calls obsidian_search tool

**After Phase 4 (Reflection):**
1. Ask: "Search for UPSC current affairs and create a summary for me"
2. After agent completes (3+ tool calls), it should auto-save a procedure
3. Verify: `sqlite3 ~/.smallclaw/brain.db "SELECT * FROM procedures;"`
4. Ask the same thing again tomorrow
5. Expected: Context Engineer injects the saved procedure steps → agent follows them

---

## 8. Migration Guide

### Running the Migration

```bash
# 1. Backup existing data
cp ~/.smallclaw/facts.json ~/.smallclaw/facts.json.backup
cp workspace/MEMORY.md workspace/MEMORY.md.backup

# 2. Run migration
npx tsx src/db/migrate-to-brain.ts

# 3. Verify migration
sqlite3 ~/.smallclaw/brain.db "SELECT COUNT(*) FROM memories;"
sqlite3 ~/.smallclaw/brain.db "SELECT COUNT(*) FROM credentials;"

# 4. Start server normally
npm run dev
```

### Backward Compatibility

- `MEMORY.md` continues to exist as a human-readable backup (exported from brain.db periodically)
- `facts.json` is deprecated but not deleted — the system reads from brain.db first, falls back to JSON
- All existing tool names (`memory_write`, `memory_search`, etc.) are unchanged — agent prompts don't break
- `skill-connectors.json` data migrates to brain.db but the file stays as backup

### Rollback Plan

If brain.db has issues:
1. Delete `~/.smallclaw/brain.db`
2. The system falls back to MEMORY.md + facts.json (unchanged code paths kept as fallback during Phase 1)
3. Restore from backups if needed

---

## 9. Reference: Competitor Study Files

The following repos were studied and are available in the project for reference:

```
.tmp-study/
├── zeroclaw/                 ← ZeroClaw (Rust)
│   ├── src/memory/           ← Memory system: 8 backends, FTS5, decay, hygiene
│   │   ├── mod.rs            ← Factory pattern for memory backends
│   │   ├── traits.rs         ← Memory trait interface
│   │   ├── sqlite.rs         ← SQLite + FTS5 implementation (REFERENCE FOR brain.ts)
│   │   └── hygiene.rs        ← Memory cleanup/pruning logic
│   ├── src/skills/mod.rs     ← Skill management with lifecycle
│   ├── src/skillforge/       ← Auto-discovery pipeline (Scout→Evaluate→Integrate)
│   ├── src/sop/              ← SOP engine (procedures reference)
│   │   ├── engine.rs         ← Execution engine
│   │   ├── types.rs          ← Data structures
│   │   └── gates.rs          ← Approval/condition gates
│   └── src/tools/traits.rs   ← Tool trait (reference for tool interface)
│
└── tinyclaw/                 ← TinyClaw (TypeScript)
    ├── src/lib/db.ts         ← SQLite WAL queue (reference for message queue)
    ├── src/lib/plugins.ts    ← Plugin system with hooks
    ├── src/lib/routing.ts    ← Agent/team message routing
    ├── src/queue-processor.ts ← Message processing with retry/dead-letter
    ├── src/lib/agent.ts      ← Agent workspace management
    └── SOUL.md               ← Personality template (reference for SOUL.md improvements)
```

**Key reference for Phase 1:** ZeroClaw's `src/memory/sqlite.rs` shows how to implement FTS5 with SQLite, including the trigger-based sync pattern and hybrid keyword+vector search.

**Key reference for Phase 3:** ZeroClaw's `src/skillforge/` shows the Scout→Evaluate→Integrate pipeline for auto-discovering skills.

---

## 7. Phase 5: SHIELD.md Enforcement Engine

### Goal
Implement 5-layer security through a runtime `SHIELD.md` file that defines unbreakable behavioral boundaries, malware protection, and rate limiting. Since Wolverine aims to self-learn and execute procedures on a local machine, absolute security is the highest priority.

### Step 5.1: `SHIELD.md` Engine Parser
Create `src/gateway/shield.ts` to parse a user-defined `SHIELD.md` file that uses regex and abstract rules to ban specific command vectors (e.g., `-rf /`, `curl \| bash`, disk formatting).

### Step 5.2: Sandbox Interceptor
Hook the `SHIELD` engine directly into the shell execution modules. Before executing ANY terminal command, analyze the prompt AST against the `SHIELD.md` rules. Throw a fatal hard block and alert the UI if a threat is detected.

---

## 8. Phase 6: The Infinite Scratchpad

### Goal
Provide Wolverine with a "Live Canvas" or persistent scratchpad. Small local models struggle to reason through complex problems entirely within their constrained context window. The scratchpad allows them to "show their work" and dump intermediate state.

### Step 6.1: Scratchpad Database Table
Extend `src/db/brain.ts` to include a `scratchpad` key-value store. This acts as the agent's active whiteboard for the current task.

### Step 6.2: Agent Tools
Implement `scratchpad_write`, `scratchpad_read`, and `scratchpad_clear`. When tackling complex tasks (like learning an API), the agent can write down its progress exactly like a human taking notes. 

### Step 6.3: Context Engineer Integration
Update `src/gateway/context-engineer.ts` to automatically inject the contents of the active scratchpad into every system prompt.

---

## 9. Phase 7: Telemetry & Logging

### Goal
Implement a structured JSON logging system that records granular details of agent execution—such as tool inputs/outputs, model latency, context token utilization, and specific error stack traces—and visualize them on a new "Diagnostics" tracking tab on the website.

### Step 7.1: Create `system_logs` table in `brain.db`
Extend `src/db/brain.ts` to include a dedicated logging table designed for fast time-series queries.

### Step 7.2: Build the Diagnostics Web API
Implement a new REST endpoint `GET /api/logs/diagnostics` that queries `system_logs` with pagination and filtering.

---

## 10. Phase 8: Context Compactor

### Goal
Implement a 4-layer context compaction pipeline to keep the small context window hyper-efficient. Transform the Brain Database into a 3-layer system: episodic (history logs), semantic (FTS5 facts), and temporal decay (older/unused facts lose importance automatically).

### Step 8.1: Temporal Decay Engine
Update `brain.ts` to include a background decay algorithm. As memories idle without access, their `importance` metric slowly degrades.

### Step 8.2: LLM Background Summarization
When the session approaches the 4k context window limit, spin up a background task that passes the oldest messages to the local model exclusively for summarization, creating a dense "tiered summary".

---

## 11. Phase 9: Pinchtab Integration

**Goal**: Replace Playwright (200MB SDK) with Pinchtab (12MB Go Binary) to optimize token usage for 4B models and enable stealth automation.

### Core Components
- **Lifecycle Manager**: `pinchtab-lifecycle.ts`. Auto-spawns the Pinchtab server ONLY when browser tools are called. Kills it on gateway exit.
- **HTTP Bridge**: `pinchtab-bridge.ts`. Translates tool calls (`browser_open`, etc.) to HTTP requests. No local SDK needed.
- **Token Optimization**: 
  - Accessibility Tree snapshots (80% fewer tokens than DOM scraping).
  - Snapshot diffing: Only the "delta" of the UI is sent to the LLM.
- **Stealth Module**: Human-like mouse movements and randomized typing to bypass bot detection.

### Installation Strategy
- **Npm Local**: `npm install pinchtab`. Binary resides in `node_modules/.bin/`.
- **Zero-Fusion**: No Pinchtab code is merged into Wolverine; it is treated as a modular sidecar service.

---

## 12. Far Future: Swarm Event Bus

### Goal
Distribute cognitive load efficiently using an Inter-Agent Event Bus.
*Note: This is strictly reserved for the far future when hardware can accommodate multiple models simultaneously (beyond a 4GB 1050ti constraint).*

### Step FF.1: Inter-Agent Pub/Sub Bus
Refactor `orchestration/multi-agent.ts` to use a lightweight `EventEmitter` pub/sub layout. Allow the primary agent to spawn autonomous sub-agents (`sessions_spawn`) on a blackboard architecture where they can collaborate asynchronously.

---

## Summary Checklist

- [ ] **Phase 0.1:** Create `src/config/paths.ts` with `resolveDataPath()` and `PATHS` constants
- [ ] **Phase 0.2:** Create `src/config/bootstrap.ts` for first-run data home setup
- [ ] **Phase 0.3:** Rewire all ~20 scattered `os.homedir(), '.smallclaw'` references to use `PATHS`
- [ ] **Phase 0.4:** Add legacy migration from `~/.smallclaw/` → `~/.wolverine/`
- [ ] **Phase 0.5:** Update `.gitignore` and Docker config
- [x] **Phase 1.1:** Create `src/db/brain.ts` with BrainDB class and schema
- [x] **Phase 1.2:** Rewire `src/tools/memory.ts` executeMemoryWrite to use brain.db
- [x] **Phase 1.3:** Rewire `src/tools/memory.ts` executeMemorySearch to use FTS5
- [x] **Phase 1.4:** Rewire `src/gateway/memory-manager.ts` to route through brain.db
- [x] **Phase 1.5:** Create `src/tools/procedures.ts` with procedure_save/list/get tools
- [x] **Phase 1.6:** Register new tools in `server-v2.ts` buildTools() + execution routing
- [x] **Phase 1.7:** Create `src/db/migrate-to-brain.ts` migration script
- [x] **Phase 2.1:** Create `src/gateway/context-engineer.ts`
- [x] **Phase 2.2:** Integrate context injection into `buildSystemPrompt()` in soul-loader.ts
- [x] **Phase 2.3:** Call context engineer from `handleChat()` in server-v2.ts
- [x] **Phase 2.4:** Adjust token budget in soul-loader.ts
- [ ] **Phase 3.1:** Design and document SKILL.md v2 format
- [ ] **Phase 3.2:** Create `src/tools/skill-create.ts`
- [ ] **Phase 3.3:** Create `src/tools/skill-test.ts`
- [ ] **Phase 3.4:** Add dynamic connector loading to `src/skills/connector.ts`
- [ ] **Phase 3.5:** Create `src/skills/runtime.ts` for skill→tool registration
- [ ] **Phase 4.1:** Create `src/gateway/reflection.ts`
- [ ] **Phase 4.2:** Integrate reflection into server-v2.ts handleChat()
- [ ] **Phase 4.3:** Auto-save task journal as procedures in task-runner.ts

---

## Appendix A: Code Audit Findings (2026-03-04)

### Critical Bugs Found

#### A.1 Memory Access Race Condition (CRITICAL)
**Location:** `src/db/brain.ts:202-243`

The `upsertMemory` method has a race condition between SELECT and INSERT:
```typescript
const existing = this.db.prepare('SELECT id, created_at FROM memories WHERE key = ? OR content = ?')
    .get(input.key, input.content);
// ... subsequent INSERT is not atomic
```
**Fix:** Use `INSERT OR REPLACE` with proper transaction or UPSERT pattern.

#### A.2 FTS5 Query Sanitization Bypass (HIGH)
**Location:** `src/db/brain.ts:249`

```typescript
const safeQuery = query.replace(/[^\w\s]/gi, ' ').trim();
```
Strips quotes, AND/OR operators, parentheses - breaks advanced FTS5 queries.
**Fix:** Use parameterized FTS5 syntax with proper escaping.

#### A.3 Procedure Finding is O(n) Linear Scan (MEDIUM)
**Location:** `src/db/brain.ts:354-372`

```typescript
const all = this.listProcedures(); // Loads ALL procedures
// ... linear substring matching
```
**Fix:** Add FTS5 index to procedures table or use trigger_keywords column.

#### A.4 Unused Archived Code (LOW)
**Locations:**
- `src/agents/manager.ts` - Empty stub (superseded)
- `src/gateway/orchestrator.ts` - Empty stub (superseded)

**Fix:** Remove dead code files.

---

## Appendix B: Roadmap to True AGI with 4GB Models

### Current Architecture Limitations

| Component | Current Limitation | AGI Gap |
|-----------|------------------|----------|
| **Orchestration** | Fixed advisor/executor split | Inflexible for new task types |
| **Skills** | Static SKILL.md definitions | Cannot learn autonomously |
| **Memory** | Keyword-based FTS5 retrieval | No semantic understanding |
| **Procedures** | Manual definition only | No auto-generation |
| **Planning** | Reactive (secondary advisor) | No proactive reasoning |

### Proposed AGI Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    HIERARCHICAL MEMORY                         │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │ Working      │ │ Episodic     │ │ Semantic              │ │
│  │ Memory       │ │ Memory       │ │ Knowledge Graph       │ │
│  │ (Context)    │ │ (Sessions)   │ │ (Learned Facts)      │ │
│  └──────────────┘ └──────────────┘ └───────────────────────┘ │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│                    META-LEARNING LAYER                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Procedure Synthesizer                                     │ │
│  │ - Observes successful tool sequences                      │ │
│  │ - Identifies patterns                                    │ │
│  │ - Auto-generates reusable procedures                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Skill Inventor                                            │ │
│  │ - Creates new SKILL.md from learned workflows             │ │
│  │ - Generates tool definitions for new capabilities         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Tool Discovery Engine                                      │ │
│  │ - Composes existing tools into new capabilities           │ │
│  │ - Validates tool combinations                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│                  ADAPTIVE ORCHESTRATOR                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Dynamic Role Allocation                                    │ │
│  │ - Instead of fixed Manager/Executor/Verifier               │ │
│  │ - Spawns specialized sub-agents based on task analysis    │ │
│  │ - Agents can create sub-agents dynamically                │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Small Local  │   │   External    │   │   Tool       │
│ Model Pool   │   │   Reasoning   │   │   Execution  │
│ (4B models)  │   │   (Cloud LLM) │   │   Engine     │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Implementation Phases for AGI

#### Phase AGI-1: Semantic Memory (Vector Embeddings)
**Add to brain.ts:**
```typescript
interface Memory {
  // ... existing fields
  embedding?: number[]; // 768-dim vector from local embeddings model
}
```
- Use `nomic-embed-text` for local embeddings
- Cosine similarity search for semantic recall
- Hybrid: FTS5 keyword + embedding similarity

#### Phase AGI-2: Auto-Procedure Synthesizer
- Track tool sequences that achieve goals
- On success: prompt model to generalize the pattern
- Save as reusable procedure automatically

#### Phase AGI-3: Self-Modifying Skill System
- Model creates new SKILL.md by writing to disk
- Register new tools dynamically
- Test and validate new skills autonomously

#### Phase AGI-4: Hierarchical Task Decomposition
Instead of flat executor:
- **Root:** Goal understanding
- **Branch 1:** Information gathering
- **Branch 2:** Solution planning
- **Branch 3:** Execution
- **Branch 4:** Verification
- **Leaves:** Specific tool calls

#### Phase AGI-5: Continuous Learning Loop
```typescript
interface LearningCycle {
  task: string;
  plan: string[];
  tools_used: string[];
  outcome: 'success' | 'failure';
  duration_ms: number;
  patterns_identified?: string[];
  new_procedures?: string[];
  skill_refinements?: string[];
}
```

### Resource Optimization for 4GB Models

| Technique | Current | Recommended |
|-----------|---------|-------------|
| Context | 4096 tokens | Sliding window + key fact extraction |
| Tools | All loaded | Lazy-load per task type |
| Memory | Full FTS5 search | Index + cache hot facts |
| Planning | Always secondary | Only for complex tasks |

### Priority Implementation Order

1. **Immediate (This Week):** Fix race condition in brain.ts
2. **Immediate (This Week):** Add semantic embeddings for memory
3. **Short-term (This Month):** Implement auto-procedure synthesizer
4. **Medium-term (This Quarter):** Build skill auto-inventor
5. **Long-term (This Year):** Full hierarchical planning with dynamic agents

---

## Appendix C: Features to Adopt from ZeroClaw & PicoClaw

Based on analysis of `tmp-study/zeroclaw/` and `tmp-study/picoclaw.md`, here are X, Y, Z features Wolverine should adopt:

### C.1 Security Features (From ZeroClaw)

#### Feature X: Workspace Sandboxing (CRITICAL)
**Source:** PicoClaw `restrict_to_workspace` + ZeroClaw Agnostic Security

**What it does:**
- Restricts file/command access to configured workspace only
- Blocks dangerous commands even outside workspace: `rm -rf`, `format`, `dd if=`, `shutdown`, etc.
- Consistent security across all execution paths (main agent, subagents, heartbeat tasks)

**Wolverine Status:** Partial - has some BLOCKED_PATTERNS but inconsistent
**Implementation:**
```typescript
// Add to config
restrict_to_workspace: boolean = true;

// Add protected commands list
const PROTECTED_COMMANDS = [
  'rm -rf', 'del /f', 'rmdir /s',  // Bulk deletion
  'format', 'mkfs', 'diskpart',      // Disk formatting
  'dd if=',                          // Disk imaging
  '/dev/sd',                         // Direct disk writes
  'shutdown', 'reboot', 'poweroff',  // System shutdown
];
```

#### Feature Y: Pluggable Security Backends
**Source:** ZeroClaw's `Sandbox` trait pattern

**What it does:**
- Security as a swappable trait (like providers, channels)
- Runtime detection of available sandboxing (Landlock, Bubblewrap, None)
- Feature-gated for binary size optimization

**Wolverine Status:** Not implemented
**Implementation:**
- Create `src/security/sandbox.ts` with trait pattern
- Add feature flags for different sandbox levels

#### Feature Z: Audit Logging
**Source:** ZeroClaw `audit-logging.md`

**What it does:**
- Structured JSON logging of all tool executions
- Event schema: timestamp, actor, tool, args, result, success/failure
- Audit trail for compliance and troubleshooting

**Wolverine Status:** Partial - has session logs but not structured audit
**Implementation:**
```typescript
interface AuditEvent {
  timestamp: string;
  session_id: string;
  actor: 'agent' | 'user' | 'system';
  tool: string;
  args: Record<string, any>;
  result?: string;
  success: boolean;
  duration_ms: number;
}
```

---

### C.2 Memory & Learning Features (From ZeroClaw)

#### Feature X: Multi-Backend Memory
**Source:** ZeroClaw memory system with trait pattern

**What it does:**
- Pluggable memory backends (Markdown, SQLite, Vector/Embeddings)
- Hybrid search: FTS5 + embeddings
- Memory hygiene with automatic cleanup

**Wolverine Status:** SQLite only - needs embeddings
**Implementation:**
```typescript
// Add embedding support to brain.ts
interface Memory {
  // ... existing fields
  embedding?: number[]; // 768-dim vector
}

// Add hybrid search
async function semanticSearch(query: string, options: {
  maxResults?: number;
  semanticWeight?: number; // 0-1 blend with FTS5
}): Promise<Memory[]>
```

#### Feature Y: Memory Importance Decay
**Source:** ZeroClaw hygiene system

**What it does:**
- Automatic importance degradation over time
- Background pruning of low-value memories
- Keeps brain.db lean

**Wolverine Status:** Not implemented
**Implementation:**
```typescript
// Cron job in brain.ts
function applyTemporalDecay(): void {
  // Decrease importance by 5% every 30 days of no access
  this.db.prepare(`
    UPDATE memories 
    SET importance = importance * 0.95 
    WHERE last_accessed < datetime('now', '-30 days')
    AND importance > 0.1
  `).run();
}
```

---

### C.3 Agent Features (From PicoClaw)

#### Feature X: Spawn/Subagent Tool
**Source:** PicoClaw `spawn` tool for async subagents

**What it does:**
- Create independent subagent sessions
- Non-blocking heartbeat tasks
- Subagent communicates via `message` tool

**Wolverine Status:** Partial - has `delegate_to_specialist` but not full spawn
**Current Gap:** Wolverine's subagent is synchronous/blocking
**Implementation:**
```typescript
// Add to tools
const spawnTool = {
  name: 'spawn',
  description: 'Create an async subagent for long-running tasks',
  parameters: {
    type: 'object',
    properties: {
      task: { type: 'string' },
      context: { type: 'string' },
      tools: { type: 'array', items: { type: 'string' } },
    },
  },
};
```

#### Feature Y: Natural Reminder Syntax
**Source:** PicoClaw cron with natural language

**What it does:**
- "Remind me in 10 minutes"
- "Remind me every 2 hours"
- "Remind me at 9am daily"
- Parsed to cron expressions automatically

**Wolverine Status:** Partial - has cron but requires manual cron syntax
**Implementation:**
```typescript
function parseNaturalReminder(input: string): { type: 'once' | 'recurring', schedule: string } {
  // "in X minutes" → one-shot at now + X minutes
  // "every X hours" → recurring cron
  // "at 9am" → daily cron
}
```

#### Feature Z: Multi-Channel Quick Setup
**Source:** PicoClaw channels (Telegram, Discord, WhatsApp, QQ, DingTalk, LINE, WeCom)

**What it does:**
- One-line channel setup per platform
- Unified webhook server (single port for all channels)
- Auto-detection of platform from message

**Wolverine Status:** Telegram + limited Discord/WhatsApp
**Implementation:**
- Add QQ, DingTalk, LINE, WeCom support
- Unify webhook server at single port

---

### C.4 Provider & Model Features (From PicoClaw)

#### Feature X: Model List Configuration
**Source:** PicoClaw `model_list` with vendor prefix

**What it does:**
```json
{
  "model_list": [
    { "model_name": "gpt-5.2", "model": "openai/gpt-5.2", "api_key": "..." },
    { "model_name": "glm-4.7", "model": "zhipu/glm-4.7", "api_key": "..." }
  ]
}
```
- Zero-code provider addition
- Model fallbacks
- Load balancing across endpoints

**Wolverine Status:** Has multi-provider but complex setup
**Implementation:**
```typescript
// Simplify to model_list format
interface ModelConfig {
  model_name: string;
  model: string;  // vendor/model format
  api_key?: string;
  api_base?: string;
  request_timeout?: number;
}
```

#### Feature Y: Built-in Free Providers
**Source:** PicoClaw default providers

**What it does:**
- Groq (free tier) - fast inference
- Cerebras (free tier) - fastest inference
- Ollama (local, no key)

**Wolverine Status:** Ollama only by default
**Implementation:**
- Add Groq adapter
- Add Cerebras adapter  
- Pre-configure free tier API keys as optional

---

### C.5 Tool Features (From PicoClaw)

#### Feature X: Enhanced Exec Safety
**Source:** PicoClaw protected tools list

**What it does:**
- `restrict_to_workspace: true` by default
- Path validation before every file operation
- Command pattern blocking

**Wolverine Status:** Has partial blocking, not comprehensive

#### Feature Y: Tool Execution Timeout
**Source:** PicoClaw `exec_timeout_minutes`

**What it does:**
- Configurable timeout per tool
- Auto-kill long-running commands
- Prevents agent hanging

**Wolverine Status:** Not implemented
**Implementation:**
```typescript
const DEFAULT_TIMEOUTS = {
  shell: 120000,    // 2 minutes
  web_fetch: 15000, // 15 seconds
  browser: 60000,   // 1 minute
};
```

---

### C.6 Operational Features (From ZeroClaw)

#### Feature X: One-Click Bootstrap
**Source:** ZeroClaw `./bootstrap.sh`

**What it does:**
- Auto-installs dependencies
- Generates initial config
- Sets up workspace structure

**Wolverine Status:** Manual setup required

#### Feature Y: Cross-Platform Build Scripts
**Source:** ZeroClaw + PicoClaw

**What it does:**
- `make build` for all platforms
- Pre-built binaries for ARM, x86, RISC-V
- Docker support

**Wolverine Status:** Node.js - platform independent

---

### C.7 Priority Adoption Order

| Priority | Feature | Source | Impact |
|----------|---------|--------|--------|
| **P0** | Workspace Sandboxing | PicoClaw | Security |
| **P0** | Command Blocking Expansion | PicoClaw | Security |
| **P1** | Spawn/Subagent Async | PicoClaw | Functionality |
| **P1** | Vector Embeddings | ZeroClaw | Memory Quality |
| **P1** | Natural Reminders | PicoClaw | UX |
| **P2** | Audit Logging | ZeroClaw | Observability |
| **P2** | Memory Decay | ZeroClaw | Performance |
| **P2** | Model List Config | PicoClaw | Flexibility |
| **P3** | More Channels | PicoClaw | Reach |
| **P3** | Free Providers | PicoClaw | Accessibility |

---

### C.8 Comparison Matrix

| Feature | Wolverine | ZeroClaw | PicoClaw | Adopt? |
|---------|-----------|----------|----------|--------|
| RAM Usage | ~500MB+ | <5MB | <10MB | - |
| Startup | ~10s | <10ms | <1s | - |
| Workspace Sandbox | Partial | Full | Full | **P0** |
| Command Blocking | Basic | Advanced | Advanced | **P0** |
| Async Subagents | No | Yes | Yes | **P1** |
| Vector Memory | No | Yes | No | **P1** |
| Natural Reminders | No | No | Yes | **P1** |
| Audit Logging | Partial | Full | Partial | **P2** |
| Memory Decay | No | Yes | No | **P2** |
| Model List Config | Complex | Yes | Simple | **P2** |
| Channels | 3 | Many | 7+ | **P3** |
| Free Providers | Ollama | Some | Groq, Cerebras | **P3** |

---

> **For any future coding agent picking this up:** Prioritize P0 security features first, then P1 functionality. Security must not be compromised for features.

---

> **For any future coding agent picking this up:** Start with Phase 0 (path separation). It takes ~30 minutes and ensures every subsequent phase writes data to the correct location. Then Phase 1 (brain.db), Phase 2 (context engineer), etc. Each phase builds on the previous one.

---


## 13. Phase 11: Proactive AGI Features

### Goal
Moving from a reactive to a proactive agent that takes initiative, evolves its own capabilities, and provides a "living" sense of presence.

### Step 11.1: Asynchronous Step-Reflected Hooks (The Pulse)
Implement a hidden background reflection loop that triggers every 2-3 tool calls. A secondary small model generates a one-sentence "Mission Update" broadcasted via SSE to the UI.
- **Outcome:** Transparent execution progress without waiting for final turn completion.

### Step 11.2: Scout Protocol (Autonomous Skill Discovery)
Update `HeartbeatRunner` to include a "Discovery Mode". Every 12-24 hours, the agent searches for one new technical capability (API/tool) relevant to the user's workspace history and attempts to implement it via `skill_create`.
- **Outcome:** Self-evolving agent that gains new tools while the user is away.

### Step 11.3: The Global Pulse (Live Activity Feed)
Implement a "Ticker" or "Activity Feed" component in the Web UI that streams background events like CronJob results, memory prunings, and Scout Protocol discoveries.
- **Outcome:** A persistent record of the agent's life and automated chores.

---

## Summary Checklist

- [ ] **Phase 0.1:** Create `src/config/paths.ts` with `resolveDataPath()` and `PATHS` constants
- [ ] **Phase 0.2:** Create `src/config/bootstrap.ts` for first-run data home setup
- [ ] **Phase 0.3:** Rewire all ~20 scattered `os.homedir(), '.smallclaw'` references to use `PATHS`
- [ ] **Phase 0.4:** Add legacy migration from `~/.smallclaw/` → `~/.wolverine/`
- [ ] **Phase 0.5:** Update `.gitignore` and Docker config
- [x] **Phase 1.1:** Create `src/db/brain.ts` with BrainDB class and schema
- [x] **Phase 1.2:** Rewire `src/tools/memory.ts` executeMemoryWrite to use brain.db
- [x] **Phase 1.3:** Rewire `src/tools/memory.ts` executeMemorySearch to use FTS5
- [x] **Phase 1.4:** Rewire `src/gateway/memory-manager.ts` to route through brain.db
- [x] **Phase 1.5:** Create `src/tools/procedures.ts` with procedure_save/list/get tools
- [x] **Phase 1.6:** Register new tools in `server-v2.ts` buildTools() + execution routing
- [x] **Phase 1.7:** Create `src/db/migrate-to-brain.ts` migration script
- [x] **Phase 2.1:** Create `src/gateway/context-engineer.ts`
- [x] **Phase 2.2:** Integrate context injection into `buildSystemPrompt()` in soul-loader.ts
- [x] **Phase 2.3:** Call context engineer from `handleChat()` in server-v2.ts
- [x] **Phase 2.4:** Adjust token budget in soul-loader.ts
- [ ] **Phase 3.1:** Design and document SKILL.md v2 format
- [ ] **Phase 3.2:** Create `src/tools/skill-create.ts`
- [ ] **Phase 3.3:** Create `src/tools/skill-test.ts`
- [ ] **Phase 3.4:** Add dynamic connector loading to `src/skills/connector.ts`
- [ ] **Phase 3.5:** Create `src/skills/runtime.ts` for skill→tool registration
- [ ] **Phase 4.1:** Create `src/gateway/reflection.ts`
- [ ] **Phase 4.2:** Integrate reflection into server-v2.ts handleChat()
- [ ] **Phase 4.3:** Auto-save task journal as procedures in task-runner.ts
- [ ] **Phase 11.1:** Implement "Step-Reflector" Pulse SSE events
- [ ] **Phase 11.2:** Implement "Scout Protocol" Discovery Heartbeats
- [ ] **Phase 11.3:** Build "Global Pulse" UI Ticker
