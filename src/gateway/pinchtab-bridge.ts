/**
 * pinchtab-bridge.ts
 * The core adapter between Wolverine's tool system and the Pinchtab HTTP API.
 * 
 * This file replaces browser-tools.ts and implements the exact same 
 * signature for all 8 browser tools, ensuring zero changes to the LLM.
 * 
 * Key reliability features:
 *  - Auto-restart on "context canceled" / "target closed" errors
 *  - Retry-once after restart for navigation calls
 *  - Small settle delay after fill/press to let JS frameworks react
 *  - Full snapshot always returned (never truncated)
 */

import { ensureRunning, getBaseUrl, restartBrowser } from './pinchtab-lifecycle';
import { EXTRACTOR_JS, dedupeFeedItems } from './feed-extractor';

// --- Session Mapping ---
// Maps Wolverine sessionId to Pinchtab tabId
const sessionToTab = new Map<string, string>();

// Track current URL and Title for each session to help the LLM know where it is
const sessionState = new Map<string, { url: string; title: string }>();

// Maps sessionId to last seen snapshot text for diffing
const lastSnapshotCache = new Map<string, string>();

/** Small helper to sleep for N ms */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Low-level HTTP request to the Pinchtab bridge server.
 * Auto-detects connection loss ("context canceled") and triggers browser restart.
 */
async function ptRequest(path: string, body?: any): Promise<any> {
    await ensureRunning();
    const url = `${getBaseUrl()}${path}`;
    const method = body ? 'POST' : 'GET';
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Pinchtab] Error ${res.status}: ${errorText}`);
        const err = new Error(`HTTP ${res.status}: ${errorText}`);
        // Auto-detect Chrome connection death and queue a restart
        if (errorText.includes('context canceled') || errorText.includes('target closed') || errorText.includes('no targets') || res.status === 502) {
            console.log('[Pinchtab] Chrome connection lost. Triggering restart...');
            restartBrowser();
        }
        throw err;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return await res.json();
    }

    // Fallback for text/markdown responses (like snapshots in some modes)
    const text = await res.text();
    return { text };
}

/**
 * ptRequest with one automatic retry after browser restart.
 * Used for navigation calls which are likely to be the first call after a crash.
 */
async function ptRequestWithRetry(path: string, body?: any): Promise<any> {
    try {
        return await ptRequest(path, body);
    } catch (err: any) {
        if (err.message.includes('context canceled') || err.message.includes('target closed') || err.message.includes('no targets')) {
            console.log('[Pinchtab] Retrying after restart...');
            await sleep(2000); // Give Chrome time to restart
            await ensureRunning();
            return await ptRequest(path, body);
        }
        throw err;
    }
}

/**
 * Robustly discovers the current active tab.
 * If multiple tabs exist, it tries to find the most recently created or just the first one.
 */
async function findActiveTabId(): Promise<string | null> {
    try {
        const res = await ptRequest('/tabs');
        // Handle both: [ {id...} ] OR { tabs: [ {id...} ] }
        const tabs = Array.isArray(res) ? res : (res.tabs || []);

        if (tabs.length > 0) {
            // Pick most recently updated tab, or the latest one
            return tabs[tabs.length - 1].id || tabs[tabs.length - 1].tabId || null;
        }
    } catch (err) {
        console.warn('[Pinchtab] Failed to list tabs for discovery:', err);
    }
    return null;
}

export async function browserOpen(sessionId: string, url: string): Promise<string> {
    try {
        const body: any = { url };
        // We always try to reuse a tab if session exists. 
        // Pinchtab /navigate will create a new one if tabId is omitted.
        if (sessionToTab.has(sessionId)) {
            body.tabId = sessionToTab.get(sessionId);
        }

        console.log(`[Pinchtab] Navigating to ${url}...`);
        // Use retry-enabled request for navigation (first call most likely to hit a dead Chrome)
        const res = await ptRequestWithRetry('/navigate', body);

        // Extract ID. Be very permissive with field names.
        let tabId = res.id || res.tabId;

        // --- ⚡ CRITICAL FIX: TAB DISCOVERY FALLBACK ---
        // Sometimes the proxy/handler response is stripped, but the tab IS created/navigated.
        if (!tabId) {
            console.log('[Pinchtab] Nav response lacked tabId, performing discovery...');
            tabId = await findActiveTabId();
        }

        if (!tabId) {
            console.error('[Pinchtab] Navigation failed to produce a Tab ID.');
            return `ERROR: Navigation failed - No Tab ID discovered.`;
        }

        sessionToTab.set(sessionId, tabId);
        lastSnapshotCache.delete(sessionId); // Reset cache for new page

        // Wait a beat for the page to settle before snapping
        await sleep(500);

        return await browserSnapshot(sessionId);
    } catch (err: any) {
        return `ERROR: Navigation failed: ${err.message}`;
    }
}

export async function browserSnapshot(sessionId: string): Promise<string> {
    let tabId = sessionToTab.get(sessionId);
    if (!tabId) {
        // Opportunistic discovery if we lost our handle but an instance exists
        const discovered = await findActiveTabId();
        if (discovered) {
            tabId = discovered;
            sessionToTab.set(sessionId, tabId);
        }
    }

    if (!tabId) return 'ERROR: No browser session found. Use browser_open first.';

    try {
        const res = await ptRequest(`/snapshot?tabId=${tabId}&format=compact&filter=interactive`);
        const text = res.text || JSON.stringify(res, null, 2);

        // Update session state from the snapshot (Pinchtab compact format starts with `# Title | URL`)
        const firstLine = text.split('\n')[0].trim();
        if (firstLine.startsWith('# ')) {
            const parts = firstLine.slice(2).split(' | ');
            if (parts.length >= 2) {
                sessionState.set(sessionId, { title: parts[0], url: parts[1].replace('URL: ', '') });
            }
        }

        // --- PERFORMANCE: Snapshot Memoization ---
        // Return full text always (never truncate) but add a header if unchanged
        if (lastSnapshotCache.get(sessionId) === text) {
            const state = sessionState.get(sessionId);
            const header = state ? `(Status: Snapshot unchanged since last call. Still on "${state.title}" at ${state.url})\n\n` : `(Status: Snapshot unchanged since last call.)\n\n`;
            return `${header}${text}`;
        }
        lastSnapshotCache.set(sessionId, text);
        return text;
    } catch (err: any) {
        return `ERROR: Snapshot failed: ${err.message}`;
    }
}

export async function browserClick(sessionId: string, ref: number): Promise<string> {
    const tabId = sessionToTab.get(sessionId);
    if (!tabId) return 'ERROR: No browser session found. Use browser_open first.';

    try {
        // Pinchtab handles 'waitNav' internally to settle the page
        await ptRequest('/action', { tabId, kind: 'click', ref: `e${ref}`, waitNav: true });
        // Small settle after click for JS frameworks
        await sleep(300);
        lastSnapshotCache.delete(sessionId); // Force fresh snapshot after click
        return await browserSnapshot(sessionId);
    } catch (err: any) {
        return `ERROR: Click failed: ${err.message}`;
    }
}

export async function browserFill(sessionId: string, ref: number, text: string): Promise<string> {
    const tabId = sessionToTab.get(sessionId);
    if (!tabId) return 'ERROR: No browser session found. Use browser_open first.';

    try {
        // Use 'slowly: true' so Pinchtab dispatches character-by-character input events
        // that modern JS frameworks (like Google's) can detect
        await ptRequest('/action', { tabId, kind: 'fill', ref: `e${ref}`, text, slowly: true });
        // Wait for autocomplete/suggestions to appear
        await sleep(500);
        lastSnapshotCache.delete(sessionId); // Force fresh snapshot after fill
        return await browserSnapshot(sessionId);
    } catch (err: any) {
        return `ERROR: Fill failed: ${err.message}`;
    }
}

export async function browserPressKey(sessionId: string, key: string): Promise<string> {
    const tabId = sessionToTab.get(sessionId);
    if (!tabId) return 'ERROR: No browser session found. Use browser_open first.';

    try {
        const isNav = key === 'Enter';
        await ptRequest('/action', { tabId, kind: 'press', key, waitNav: isNav });
        // Wait for page to settle after keypress (longer for Enter since it may navigate)
        await sleep(isNav ? 1500 : 300);
        lastSnapshotCache.delete(sessionId); // Force fresh snapshot after keypress
        return await browserSnapshot(sessionId);
    } catch (err: any) {
        return `ERROR: Press key failed: ${err.message}`;
    }
}

export async function browserWait(sessionId: string, ms: number): Promise<string> {
    // 2s default wait
    await new Promise(r => setTimeout(r, ms || 2000));
    return await browserSnapshot(sessionId);
}

export async function browserScroll(sessionId: string, direction: 'down' | 'up', multiplier?: number): Promise<string> {
    const tabId = sessionToTab.get(sessionId);
    if (!tabId) return 'ERROR: No browser session found. Use browser_open first.';

    try {
        const scrollY = (direction === 'up' ? -800 : 800) * (multiplier || 1);
        await ptRequest('/action', { tabId, kind: 'scroll', scrollY });
        await sleep(300);
        lastSnapshotCache.delete(sessionId); // Force fresh snapshot after scroll
        return await browserSnapshot(sessionId);
    } catch (err: any) {
        return `ERROR: Scroll failed: ${err.message}`;
    }
}

export async function browserClose(sessionId: string): Promise<string> {
    const tabId = sessionToTab.get(sessionId);
    if (!tabId) return 'No active tab to close.';

    try {
        await ptRequest('/tab', { action: 'close', tabId });
        sessionToTab.delete(sessionId);
        lastSnapshotCache.delete(sessionId);
        return 'Browser tab closed.';
    } catch (err) {
        sessionToTab.delete(sessionId);
        return `Tab closed/removed.`;
    }
}

// --- Advisor Packets & Helper Functions ---

export async function getBrowserAdvisorPacket(sessionId: string, _options?: any): Promise<any | null> {
    const tabId = sessionToTab.get(sessionId);
    if (!tabId) return null;

    try {
        // Multi-layered extraction: 1. Snapshot, 2. Evaluation
        const snapRes = await ptRequest(`/snapshot?tabId=${tabId}&format=compact`);
        const structured = await ptRequest('/evaluate', {
            tabId,
            expression: `(${EXTRACTOR_JS})(24)`
        });

        return {
            page: {
                title: "Browser Session",
                url: structured.url || "",
                pageType: structured.pageType || "article"
            },
            snapshot: snapRes.text,
            extractedFeed: dedupeFeedItems(structured.extractedFeed || []),
            textBlocks: structured.textBlocks || [],
            pageText: structured.pageText || "",
            isGenerating: !!structured.isGenerating
        };
    } catch (err) {
        console.warn('[Pinchtab] Advisor packet build failed:', err);
        return null;
    }
}

export function getBrowserSessionInfo(sessionId: string): { active: boolean; url?: string; title?: string } {
    const active = sessionToTab.has(sessionId);
    const state = sessionState.get(sessionId);
    return { active, ...state };
}

export function hasBrowserSession(sessionId: string): boolean {
    return sessionToTab.has(sessionId);
}

export function getBrowserToolDefinitions(): any[] {
    return [
        {
            type: 'function',
            function: {
                name: 'browser_open',
                description: 'Open a URL in the browser. Returns a snapshot of interactive elements with [N] reference numbers. For SEARCH ENGINES: pass the search URL directly (e.g. https://google.com/search?q=your+query) instead of navigating to google.com and filling the search box — this is faster and more reliable.',
                parameters: {
                    type: 'object', required: ['url'],
                    properties: { url: { type: 'string', description: 'URL to navigate to. For searches, use https://google.com/search?q=your+query format.' } },
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'browser_snapshot',
                description: 'Refresh snapshot of visible elements. Take this after clicking or filling.',
                parameters: { type: 'object', properties: {} },
            },
        },
        {
            type: 'function',
            function: {
                name: 'browser_click',
                description: 'Click an element using its [N] reference number.',
                parameters: {
                    type: 'object', required: ['ref'],
                    properties: { ref: { type: 'number', description: 'the [N] reference number from the snapshot' } },
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'browser_fill',
                description: 'Fill an input field by reference N. Use browser_click(ref) first to focus the field, then browser_fill.',
                parameters: {
                    type: 'object', required: ['ref', 'text'],
                    properties: {
                        ref: { type: 'number', description: 'the [N] reference number from the snapshot' },
                        text: { type: 'string', description: 'text to type into the field' },
                    },
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'browser_press_key',
                description: 'Press Enter, Tab, etc.',
                parameters: {
                    type: 'object', required: ['key'],
                    properties: { key: { type: 'string' } },
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'browser_wait',
                description: 'Wait for page load/settle, then returns snapshot.',
                parameters: {
                    type: 'object',
                    properties: { ms: { type: 'number' } },
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'browser_scroll',
                description: 'Scroll up/down.',
                parameters: {
                    type: 'object',
                    properties: {
                        direction: { type: 'string', enum: ['down', 'up'] },
                        multiplier: { type: 'number' },
                    },
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'browser_close',
                description: 'Close browser session.',
                parameters: { type: 'object', properties: {} },
            },
        },
    ];
}
