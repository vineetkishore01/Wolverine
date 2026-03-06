// src/config/bootstrap.ts — First-run data home setup.
//
// On first launch, copies template files from skel/ into ~/.wolverine/workspace/
// so the agent has default SOUL.md, USER.md, etc. to work with.
// Runs once (idempotent — checks for .initialized marker).

import fs from 'fs';
import path from 'path';
import { PATHS } from './paths.js';

/**
 * Resolve the skel directory relative to the compiled dist output.
 * In dev: src/config/bootstrap.ts → ../../.wolverine/skel
 * In dist: dist/config/bootstrap.js → ../../.wolverine/skel
 * Both resolve to <project-root>/.wolverine/skel
 */
function getSkelDir(): string {
    // Look for skel files exactly where the bootstrap script lives
    return path.join(__dirname, 'skel');
}

export function bootstrapDataHome(): void {
    const workspace = PATHS.workspace();
    const marker = path.join(PATHS.dataHome(), '.initialized');

    if (fs.existsSync(marker)) return; // already bootstrapped

    console.log(`[bootstrap] Setting up data home: ${PATHS.dataHome()}`);

    // Ensure directories exist FIRST
    fs.mkdirSync(workspace, { recursive: true });
    for (const dir of ['downloads', 'memory']) {
        fs.mkdirSync(path.join(workspace, dir), { recursive: true });
    }

    // Copy skel/ templates → workspace/
    const skelDir = getSkelDir();
    if (fs.existsSync(skelDir)) {
        // Copy files
        const entries = fs.readdirSync(skelDir, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(skelDir, entry.name);
            const destPath = path.join(workspace, entry.name);
            if (entry.isDirectory()) {
                // Recursively copy subdirectories (e.g. skel/skills/)
                copyDirRecursive(srcPath, destPath);
            } else if (!fs.existsSync(destPath)) {
                // Copy file, removing .template extension if present
                const finalDestPath = destPath.replace('.template', '');
                fs.copyFileSync(srcPath, finalDestPath);
                console.log(`[bootstrap] Created: ${path.basename(finalDestPath)}`);
            }
        }
        console.log(`[bootstrap] Copied ${entries.length} template(s) from skel/`);
    } else {
        console.warn(`[bootstrap] skel/ not found at ${skelDir} — skipping template copy`);
    }

    // Write marker so we don't re-bootstrap
    if (!fs.existsSync(marker)) {
        fs.writeFileSync(marker, new Date().toISOString());
    }

    // CRITICAL: Ensure identity files exist even if marker was created previously
    // This fixes "acting dumb" if bootstrap was interrupted
    const criticalFiles = ['SOUL.md', 'USER.md', 'SELF.md', 'HEARTBEAT.md', 'AGENTS.md', 'TOOLS.md', 'SELF_IMPROVE.md', 'SELF_REFLECT.md', 'BOOT.md'];
    if (fs.existsSync(skelDir)) {
        for (const f of criticalFiles) {
            const dest = path.join(workspace, f);
            if (!fs.existsSync(dest)) {
                const src = path.join(skelDir, f + '.template');
                if (fs.existsSync(src)) {
                    fs.copyFileSync(src, dest);
                    console.log(`[bootstrap] Restored missing critical file: ${f}`);
                }
            }
        }
    }

    console.log(`[bootstrap] Data home ready: ${PATHS.dataHome()}`);
}

function copyDirRecursive(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else if (!fs.existsSync(destPath)) {
            // Remove .template extension if present
            const finalDestPath = destPath.replace('.template', '');
            fs.copyFileSync(srcPath, finalDestPath);
        }
    }
}
