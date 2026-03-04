/**
 * pinchtab-lifecycle.ts
 * Manages the Pinchtab binary as a child process.
 *
 * This implementation is "lazy": it only spawns the process when ensureRunning()
 * is called by a tool. It also handles auto-cleanup on process exit and 
 * resource-freeing when idle.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const PINCHTAB_PORT = 9867;
const PINCHTAB_URL = `http://localhost:${PINCHTAB_PORT}`;
const IDLE_TIMEOUT_MS = 300_000; // 5 minutes

let pinchtabProcess: ChildProcess | null = null;
let isStarting = false;
let idleTimer: NodeJS.Timeout | null = null;

/**
 * Resets the idle timer. If no browser activity occurs for 5 minutes,
 * the Pinchtab sidecar process will be killed to save resources.
 */
function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (pinchtabProcess) {
            console.log(`[Pinchtab] Idle for ${IDLE_TIMEOUT_MS / 60000}m. Freeing resources...`);
            pinchtabProcess.kill();
            pinchtabProcess = null;
        }
    }, IDLE_TIMEOUT_MS);
}

/**
 * Ensures the Pinchtab server is running. 
 * Spawns it lazily if not already active.
 */
export async function ensureRunning(): Promise<void> {
    resetIdleTimer();
    if (await checkHealth()) return;
    if (isStarting) {
        await waitForReady();
        return;
    }

    isStarting = true;
    try {
        const binaryPath = path.join(process.cwd(), 'node_modules', '.bin', 'pinchtab');

        // Check if binary exists
        if (!fs.existsSync(binaryPath)) {
            throw new Error(`Pinchtab binary not found at ${binaryPath}. Please run npm install.`);
        }

        const isDocker = fs.existsSync('/.dockerenv');
        const isDesktop = process.platform === 'darwin' || process.platform === 'win32';
        const useHeadless = isDocker || !isDesktop;

        console.log(`[Pinchtab] Lazy-starting Bridge Server (Env: ${isDocker ? 'Docker' : 'Desktop'}, Headless: ${useHeadless})...`);

        // Use environment variables for server configuration as Pinchtab server 
        // doesn't support CLI flags like --headless or --port in main mode.
        const env = {
            ...process.env,
            'BRIDGE_ONLY': '1',             // Run as dedicated Bridge Server (no dashboard bloat)
            'BRIDGE_HEADLESS': String(useHeadless),
            'BRIDGE_PORT': String(PINCHTAB_PORT),
            'BRIDGE_STEALTH': 'ultra',      // High stealth level
            'BRIDGE_BLOCK_ADS': 'true',
            'BRIDGE_NO_RESTORE': 'true'     // Clean startup every time
        };

        pinchtabProcess = spawn(binaryPath, [], {
            stdio: 'inherit',
            detached: false,
            env
        });

        pinchtabProcess.on('error', (err) => {
            console.error('[Pinchtab] Failed to start:', err);
            pinchtabProcess = null;
            isStarting = false;
        });

        pinchtabProcess.on('exit', (code) => {
            if (!isStarting && pinchtabProcess) {
                console.log(`[Pinchtab] Process exited with code ${code}`);
            }
            pinchtabProcess = null;
            isStarting = false;
        });

        await waitForReady();
        console.log('[Pinchtab] Server is ready.');
    } finally {
        isStarting = false;
    }
}

async function checkHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${PINCHTAB_URL}/health`);
        return res.ok;
    } catch {
        return false;
    }
}

async function waitForReady(timeoutMs = 15000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await checkHealth()) return;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Pinchtab failed to become healthy after ${timeoutMs}ms`);
}

/**
 * Returns the base URL for Pinchtab API calls.
 */
export function getBaseUrl(): string {
    return PINCHTAB_URL;
}

// Ensure cleanup on exit
process.on('exit', () => {
    if (pinchtabProcess) {
        pinchtabProcess.kill();
    }
});

export function restartBrowser(): void {
    if (pinchtabProcess) {
        console.log('[Pinchtab] Force restarting browser bridge...');
        pinchtabProcess.kill();
        pinchtabProcess = null;
    }
}

process.on('SIGINT', () => {
    if (pinchtabProcess) pinchtabProcess.kill();
    process.exit();
});
