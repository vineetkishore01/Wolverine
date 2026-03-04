import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';
import { PATHS } from '../config/paths.js';

const BRAIN_DB_PATH = PATHS.brainDb();

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
    steps: string; // JSON string
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
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new Database(resolvedPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('busy_timeout = 5000');
        this.initialize();
    }

    private initialize(): void {
        this.db.transaction(() => {
            // 1. Memories Table
            this.db.prepare(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL DEFAULT 'fact',
          key TEXT NOT NULL,
          content TEXT NOT NULL,
          importance REAL DEFAULT 0.5,
          access_count INTEGER DEFAULT 0,
          last_accessed TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          source TEXT DEFAULT 'agent',
          source_tool TEXT,
          source_ref TEXT,
          session_id TEXT,
          scope TEXT DEFAULT 'global',
          expires_at TEXT,
          actor TEXT DEFAULT 'agent'
        )
      `).run();

            // 2. FTS5 Virtual Table for Search
            // Note: We check if it exists first because FTS5 tables are special
            const ftsExists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memories_fts'").get();
            if (!ftsExists) {
                this.db.prepare(`
          CREATE VIRTUAL TABLE memories_fts USING fts5(
            key,
            content,
            content=memories,
            content_rowid=rowid
          )
        `).run();

                // 3. Sync Triggers
                this.db.prepare(`
          CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
            INSERT INTO memories_fts(rowid, key, content) VALUES (new.rowid, new.key, new.content);
          END
        `).run();
                this.db.prepare(`
          CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
            INSERT INTO memories_fts(memories_fts, rowid, key, content) VALUES('delete', old.rowid, old.key, old.content);
          END
        `).run();
                this.db.prepare(`
          CREATE TRIGGER memories_au AFTER UPDATE ON memories BEGIN
            INSERT INTO memories_fts(memories_fts, rowid, key, content) VALUES('delete', old.rowid, old.key, old.content);
            INSERT INTO memories_fts(rowid, key, content) VALUES (new.rowid, new.key, new.content);
          END
        `).run();
            }

            // 4. Procedures Table
            this.db.prepare(`
        CREATE TABLE IF NOT EXISTS procedures (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          trigger_keywords TEXT,
          steps TEXT NOT NULL,
          success_count INTEGER DEFAULT 0,
          fail_count INTEGER DEFAULT 0,
          last_used TEXT,
          last_result TEXT,
          created_by TEXT DEFAULT 'agent',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();

            // 5. Credentials Table
            this.db.prepare(`
        CREATE TABLE IF NOT EXISTS credentials (
          skill_id TEXT PRIMARY KEY,
          config TEXT NOT NULL,
          connected_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();

            // 6. Scratchpad Table
            this.db.prepare(`
        CREATE TABLE IF NOT EXISTS scratchpad (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          content TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();

            // 7. Indexes
            this.db.prepare("CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)").run();
            this.db.prepare("CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope)").run();
            this.db.prepare("CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC)").run();
            this.db.prepare("CREATE INDEX IF NOT EXISTS idx_memories_last_accessed ON memories(last_accessed DESC)").run();
            this.db.prepare("CREATE INDEX IF NOT EXISTS idx_procedures_name ON procedures(name)").run();
            this.db.prepare("CREATE INDEX IF NOT EXISTS idx_scratchpad_session ON scratchpad(session_id)").run();
        })();

        // this.migrateLegacyMemory();
    }

    private migrateLegacyMemory(): void {
        const workspaceDir = PATHS.workspace();
        const memoryMdPath = path.join(workspaceDir, 'MEMORY.md');

        if (fs.existsSync(memoryMdPath)) {
            try {
                const content = fs.readFileSync(memoryMdPath, 'utf-8');
                const lines = content.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('- ')) {
                        // Very basic parser for "- [agent][key=foo] fact"
                        const factMatch = trimmed.match(/^- (?:\[.*?\])*\s*(.*)$/);
                        const keyMatch = trimmed.match(/\[key=(.*?)\]/);
                        const actorMatch = trimmed.match(/\[(agent|user|system)\]/);

                        if (factMatch) {
                            this.upsertMemory({
                                key: keyMatch ? keyMatch[1] : factMatch[1].slice(0, 80),
                                content: factMatch[1],
                                category: 'migrated',
                                actor: actorMatch ? actorMatch[1] as any : 'agent'
                            });
                        }
                    }
                }
                // Rename migrated file to avoid re-migration
                fs.renameSync(memoryMdPath, memoryMdPath + '.migrated');
                console.log(`[BrainDB] Migrated legacy memory from ${memoryMdPath}`);
            } catch (err) {
                console.warn('[BrainDB] Migration failed:', err);
            }
        }
    }

    // --- Memory Operations ---

    public upsertMemory(input: Partial<Memory> & { key: string; content: string }): Memory {
        const now = new Date().toISOString();
        const existing = this.db.prepare('SELECT id, created_at FROM memories WHERE key = ? OR content = ?')
            .get(input.key, input.content) as { id: string; created_at: string } | undefined;

        const id = existing?.id || randomUUID();
        const created_at = existing?.created_at || now;

        const memory: Memory = {
            id,
            category: input.category || 'fact',
            key: input.key,
            content: input.content,
            importance: input.importance ?? 0.5,
            access_count: 0,
            last_accessed: null,
            created_at,
            updated_at: now,
            source: input.source || 'agent',
            source_tool: input.source_tool || null,
            source_ref: input.source_ref || null,
            session_id: input.session_id || null,
            scope: input.scope || 'global',
            expires_at: input.expires_at || null,
            actor: input.actor || 'agent'
        };

        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (
        id, category, key, content, importance, access_count, last_accessed, 
        created_at, updated_at, source, source_tool, source_ref, session_id, scope, expires_at, actor
      ) VALUES (
        @id, @category, @key, @content, @importance, 
        COALESCE((SELECT access_count FROM memories WHERE id = @id), 0),
        (SELECT last_accessed FROM memories WHERE id = @id),
        @created_at, @updated_at, @source, @source_tool, @source_ref, @session_id, @scope, @expires_at, @actor
      )
    `);

        stmt.run(memory);
        return memory;
    }

    public searchMemories(query: string, opts?: { category?: string; scope?: string; session_id?: string; max?: number }): Memory[] {
        const limit = opts?.max || 10;

        // Sanitize FTS query to prevent syntax errors (strip quotes, commas, etc)
        const safeQuery = query.replace(/[^\w\s]/gi, ' ').trim();

        // Weighted search using FTS5 rank + importance + freshness
        let sql = `
            SELECT m.*, 
            (CASE WHEN ? != '' THEN (fts.rank * -1.0) ELSE 0 END + (m.importance * 0.5)) as score
            FROM memories m
        `;

        const params: any[] = [safeQuery];

        if (safeQuery) {
            sql += ` JOIN memories_fts fts ON m.rowid = fts.rowid WHERE memories_fts MATCH ?`;
            params.push(safeQuery);
        } else {
            // fallback if query is empty => still join FTS but just scan
            sql += ` LEFT JOIN memories_fts fts ON m.rowid = fts.rowid WHERE 1=1`;
        }

        if (opts?.category) {
            sql += " AND m.category = ?";
            params.push(opts.category);
        }
        if (opts?.scope) {
            sql += " AND m.scope = ?";
            params.push(opts.scope);
        }
        if (opts?.session_id) {
            sql += " AND (m.session_id = ? OR m.scope = 'global')";
            params.push(opts.session_id);
        }

        sql += " ORDER BY score DESC LIMIT ?";
        params.push(limit);

        return this.db.prepare(sql).all(...params) as Memory[];
    }

    public bumpAccessCount(id: string): void {
        this.db.prepare(`
      UPDATE memories 
      SET access_count = access_count + 1, last_accessed = ? 
      WHERE id = ?
    `).run(new Date().toISOString(), id);
    }

    public deleteMemory(id: string): boolean {
        const result = this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // --- Procedure Operations ---

    public saveProcedure(input: Partial<Procedure> & { name: string; steps: string }): Procedure {
        const now = new Date().toISOString();
        const existing = this.db.prepare('SELECT id, created_at FROM procedures WHERE name = ?')
            .get(input.name) as { id: string; created_at: string } | undefined;

        const id = existing?.id || randomUUID();
        const created_at = existing?.created_at || now;

        const proc: Procedure = {
            id,
            name: input.name,
            description: input.description || null,
            trigger_keywords: input.trigger_keywords || null,
            steps: input.steps,
            success_count: 0,
            fail_count: 0,
            last_used: null,
            last_result: null,
            created_by: input.created_by || 'agent',
            created_at,
            updated_at: now
        };

        this.db.prepare(`
      INSERT OR REPLACE INTO procedures (
        id, name, description, trigger_keywords, steps, 
        success_count, fail_count, last_used, last_result, created_by, created_at, updated_at
      ) VALUES (
        @id, @name, @description, @trigger_keywords, @steps,
        COALESCE((SELECT success_count FROM procedures WHERE id = @id), 0),
        COALESCE((SELECT fail_count FROM procedures WHERE id = @id), 0),
        (SELECT last_used FROM procedures WHERE id = @id),
        (SELECT last_result FROM procedures WHERE id = @id),
        @created_by, @created_at, @updated_at
      )
    `).run(proc);

        return proc;
    }

    public getProcedure(name: string): Procedure | null {
        return this.db.prepare('SELECT * FROM procedures WHERE name = ?').get(name) as Procedure || null;
    }

    public deleteProcedure(id: string): void {
        this.db.prepare('DELETE FROM procedures WHERE id = ?').run(id);
    }

    public listProcedures(): Procedure[] {
        return this.db.prepare('SELECT * FROM procedures ORDER BY last_used DESC').all() as Procedure[];
    }

    public findProcedure(query: string): Procedure | null {
        // Basic implementation: fetch all and do a substring match on keywords
        // Could be optimized with FTS5 later if procedure count grows
        const all = this.listProcedures();
        const queryLower = query.toLowerCase();

        // Look for any procedure where query contains one of its keywords
        for (const proc of all) {
            if (proc.trigger_keywords) {
                const keywords = proc.trigger_keywords.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
                for (const kw of keywords) {
                    if (queryLower.includes(kw)) {
                        return proc;
                    }
                }
            }
        }
        return null;
    }

    public recordProcedureResult(id: string, success: boolean): void {
        const now = new Date().toISOString();
        const col = success ? 'success_count' : 'fail_count';
        const res = success ? 'success' : 'failed';
        this.db.prepare(`
      UPDATE procedures 
      SET ${col} = ${col} + 1, last_used = ?, last_result = ?, updated_at = ? 
      WHERE id = ?
    `).run(now, res, now, id);
    }

    // --- Credential Operations ---

    public saveCredentials(skillId: string, config: any): void {
        const now = new Date().toISOString();
        const configStr = typeof config === 'string' ? config : JSON.stringify(config);
        this.db.prepare(`
      INSERT OR REPLACE INTO credentials (skill_id, config, connected_at, updated_at)
      VALUES (?, ?, COALESCE((SELECT connected_at FROM credentials WHERE skill_id = ?), ?), ?)
    `).run(skillId, configStr, skillId, now, now);
    }

    public getCredentials(skillId: string): any | null {
        const row = this.db.prepare('SELECT config FROM credentials WHERE skill_id = ?').get(skillId) as { config: string } | undefined;
        if (!row) return null;
        try {
            return JSON.parse(row.config);
        } catch {
            return row.config;
        }
    }

    // --- Scratchpad Operations ---

    public getScratchpad(sessionId: string): string | null {
        const row = this.db.prepare('SELECT content FROM scratchpad WHERE session_id = ?').get(sessionId) as { content: string } | undefined;
        return row ? row.content : null;
    }

    public writeScratchpad(sessionId: string, content: string): void {
        const now = new Date().toISOString();
        const existing = this.db.prepare('SELECT id FROM scratchpad WHERE session_id = ?').get(sessionId) as { id: string } | undefined;
        const actualId = existing?.id || randomUUID();

        this.db.prepare(`
            INSERT OR REPLACE INTO scratchpad (id, session_id, content, updated_at)
            VALUES (?, ?, ?, ?)
        `).run(actualId, sessionId, content, now);
    }

    public clearScratchpad(sessionId: string): void {
        this.db.prepare('DELETE FROM scratchpad WHERE session_id = ?').run(sessionId);
    }

    public close(): void {
        this.db.close();
    }
}

let instance: BrainDB | null = null;
export function getBrainDB(): BrainDB {
    if (!instance) {
        instance = new BrainDB();
    }
    return instance;
}
