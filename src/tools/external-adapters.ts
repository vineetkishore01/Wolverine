import { Tool } from './registry.js';
import { ToolResult } from '../types.js';
import {
    browserOpen, browserSnapshot, browserClick, browserFill,
    browserPressKey, browserWait, browserScroll, browserClose
} from '../gateway/pinchtab-bridge.js';
import {
    desktopScreenshot, desktopFindWindow, desktopFocusWindow,
    desktopClick, desktopDrag, desktopWait, desktopType,
    desktopPressKey, desktopGetClipboard, desktopSetClipboard
} from '../gateway/desktop-tools.js';

// --- Browser Tools ---

export const browserOpenTool: Tool = {
    name: 'browser_open',
    description: 'Open a URL in the browser. Returns a snapshot of interactive elements with [N] reference numbers.',
    execute: async (args, ctx) => {
        const res = await browserOpen(ctx?.sessionId || 'default', args.url || '');
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { url: 'string' }
};

export const browserSnapshotTool: Tool = {
    name: 'browser_snapshot',
    description: 'Refresh snapshot of visible elements.',
    execute: async (args, ctx) => {
        const res = await browserSnapshot(ctx?.sessionId || 'default');
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: {}
};

export const browserClickTool: Tool = {
    name: 'browser_click',
    description: 'Click an element using its [N] reference number.',
    execute: async (args, ctx) => {
        const sessionId = ctx?.sessionId || 'default';
        let res = await browserClick(sessionId, Number(args.ref || 0));

        // Handle stale node error with one auto-retry after refresh
        if (res.includes('-32000') || res.includes('No node found')) {
            console.log(`[browser_click] Stale node detected (ref: ${args.ref}). Refreshing snapshot and retrying...`);
            await browserSnapshot(sessionId);
            res = await browserClick(sessionId, Number(args.ref || 0));
        }

        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { ref: 'number' }
};

export const browserFillTool: Tool = {
    name: 'browser_fill',
    description: 'Fill an input field by reference N.',
    execute: async (args, ctx) => {
        const res = await browserFill(ctx?.sessionId || 'default', Number(args.ref || 0), String(args.text || ''));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { ref: 'number', text: 'string' }
};

export const browserPressKeyTool: Tool = {
    name: 'browser_press_key',
    description: 'Press Enter, Tab, etc. in the browser.',
    execute: async (args, ctx) => {
        const res = await browserPressKey(ctx?.sessionId || 'default', String(args.key || 'Enter'));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { key: 'string' }
};

export const browserWaitTool: Tool = {
    name: 'browser_wait',
    description: 'Wait for page load/settle, then returns snapshot.',
    execute: async (args, ctx) => {
        const res = await browserWait(ctx?.sessionId || 'default', Number(args.ms || 2000));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { ms: 'number' }
};

export const browserScrollTool: Tool = {
    name: 'browser_scroll',
    description: 'Scroll up/down in the browser.',
    execute: async (args, ctx) => {
        const dir = String(args.direction || 'down').toLowerCase() === 'up' ? 'up' : 'down';
        const res = await browserScroll(ctx?.sessionId || 'default', dir as 'up' | 'down', Number(args.multiplier || 1));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { direction: 'string', multiplier: 'number' }
};

export const browserCloseTool: Tool = {
    name: 'browser_close',
    description: 'Close browser session.',
    execute: async (args, ctx) => {
        const res = await browserClose(ctx?.sessionId || 'default');
        return { success: true, stdout: res };
    },
    schema: {}
};

// --- Desktop Tools ---

export const desktopScreenshotTool: Tool = {
    name: 'desktop_screenshot',
    description: 'Capture screenshot of the full desktop. Targets Windows.',
    execute: async (args, ctx) => {
        const res = await desktopScreenshot(ctx?.sessionId || 'default');
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: {}
};

export const desktopFindWindowTool: Tool = {
    name: 'desktop_find_window',
    description: 'Find open windows by title or process name.',
    execute: async (args) => {
        const res = await desktopFindWindow(String(args.name || ''));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { name: 'string' }
};

export const desktopFocusWindowTool: Tool = {
    name: 'desktop_focus_window',
    description: 'Bring a matching window to foreground/focus.',
    execute: async (args) => {
        const res = await desktopFocusWindow(String(args.name || ''));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { name: 'string' }
};

export const desktopClickTool: Tool = {
    name: 'desktop_click',
    description: 'Click at desktop coordinates (Windows only).',
    execute: async (args) => {
        const res = await desktopClick(
            Number(args.x),
            Number(args.y),
            String(args.button || 'left').toLowerCase() === 'right' ? 'right' : 'left',
            args.double_click === true
        );
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { x: 'number', y: 'number', button: 'string', double_click: 'boolean' }
};

export const desktopDragTool: Tool = {
    name: 'desktop_drag',
    description: 'Drag mouse from one coordinate to another.',
    execute: async (args) => {
        const res = await desktopDrag(
            Number(args.from_x),
            Number(args.from_y),
            Number(args.to_x),
            Number(args.to_y),
            Number(args.steps || 20)
        );
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { from_x: 'number', from_y: 'number', to_x: 'number', to_y: 'number', steps: 'number' }
};

export const desktopWaitTool: Tool = {
    name: 'desktop_wait',
    description: 'Pause execution for a number of milliseconds.',
    execute: async (args) => {
        const res = await desktopWait(Number(args.ms || 500));
        return { success: true, stdout: res };
    },
    schema: { ms: 'number' }
};

export const desktopTypeTool: Tool = {
    name: 'desktop_type',
    description: 'Type text into the currently focused desktop window.',
    execute: async (args) => {
        const res = await desktopType(String(args.text || ''));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { text: 'string' }
};

export const desktopPressKeyTool: Tool = {
    name: 'desktop_press_key',
    description: 'Press a key in the focused desktop window.',
    execute: async (args) => {
        const res = await desktopPressKey(String(args.key || 'Enter'));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { key: 'string' }
};

export const desktopGetClipboardTool: Tool = {
    name: 'desktop_get_clipboard',
    description: 'Read clipboard text.',
    execute: async () => {
        const res = await desktopGetClipboard();
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: {}
};

export const desktopSetClipboardTool: Tool = {
    name: 'desktop_set_clipboard',
    description: 'Write text to clipboard.',
    execute: async (args) => {
        const res = await desktopSetClipboard(String(args.text || ''));
        return { success: !res.startsWith('ERROR'), stdout: res };
    },
    schema: { text: 'string' }
};
