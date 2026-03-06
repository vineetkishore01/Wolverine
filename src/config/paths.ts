// src/config/paths.ts — Single source of truth for all data paths.
//
// EVERYTHING lives in ~/WolverineData/ for simplicity:
// - Config, sessions, skills, memory, brain.db
// - Workspace files (USER.md, SOUL.md, etc.)
// - Logs, tasks, cron runs
//
// Delete ~/WolverineData/ = Complete virgin reset
// The git repo is NEVER written to at runtime.

import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * WOLVERINE_HOME env var overrides the default for Docker / multi-instance.
 * Default: ~/WolverineData/ (single unified folder)
 */
const DATA_HOME = process.env.WOLVERINE_HOME
    || process.env.WOLVERINE_DATA_DIR
    || process.env.Wolverine_DATA_DIR
    || path.join(os.homedir(), 'WolverineData');

/** Resolve any sub-path under the data home. Creates parent dirs if needed. */
export function resolveDataPath(...subpath: string[]): string {
    const full = path.join(DATA_HOME, ...subpath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    return full;
}

// ── Common paths (for convenience + documentation) ──────────────────────────
export const PATHS = {
    dataHome: () => DATA_HOME,
    config: () => resolveDataPath('config.json'),
    brainDb: () => resolveDataPath('brain.db'),
    jobsDb: () => resolveDataPath('jobs.db'),
    workspace: () => resolveDataPath('workspace'),
    skills: () => resolveDataPath('skills'),
    sessions: () => resolveDataPath('sessions'),
    logs: () => resolveDataPath('logs'),
    vault: () => resolveDataPath('vault'),
    hooks: () => resolveDataPath('hooks'),
    tasks: () => resolveDataPath('tasks'),
    ocrCache: () => resolveDataPath('ocr-cache'),
    cronRuns: () => resolveDataPath('cron', 'runs'),
    mcpServers: () => resolveDataPath('mcp-servers.json'),
    memory: () => resolveDataPath('workspace', 'MEMORY.md'),
    soul: () => resolveDataPath('workspace', 'SOUL.md'),
    user: () => resolveDataPath('workspace', 'USER.md'),
} as const;

// ── Legacy migration (.Wolverine/ → WolverineData/) ────────────────────────────

/** One-time migration: copy data from ~/.Wolverine/ or ~/.wolverine/ to ~/WolverineData/ */
export function migrateLegacyDataHome(): void {
    // Disabled: User wants true virgin installs on wipe. 
    // Auto-rebuilding from .Wolverine or .wolverine ruins the reset test.
    return;

    const legacyPaths = [
        path.join(os.homedir(), '.Wolverine'),
        path.join(os.homedir(), '.wolverine'),
    ];
    const target = DATA_HOME;

    for (const legacy of legacyPaths) {
        if (!fs.existsSync(legacy) || legacy === target) continue;
        if (fs.existsSync(path.join(target, '.migrated'))) continue;

        console.log(`[migration] Copying ${legacy} → ${target}`);

        const copyRecursive = (src: string, dest: string) => {
            fs.mkdirSync(dest, { recursive: true });
            for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
                // Skip node_modules and .DS_Store
                if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue;
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);
                if (entry.isDirectory()) {
                    copyRecursive(srcPath, destPath);
                } else if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        };

        try {
            copyRecursive(legacy, target);
            fs.writeFileSync(
                path.join(target, '.migrated'),
                `Migrated from ${legacy} on ${new Date().toISOString()}\n`,
            );
            console.log(`[migration] Done. Legacy data preserved at ${target}`);
            break; // Only migrate from first found legacy path
        } catch (err: any) {
            console.warn(`[migration] Failed: ${err.message}. Continuing with fresh data home.`);
        }
    }
}
