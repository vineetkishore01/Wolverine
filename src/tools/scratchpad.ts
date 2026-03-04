import { getBrainDB } from '../db/brain.js';
import { ToolResult } from '../types.js';

export async function executeScratchpadWrite(args: { content: string; session_id?: string }): Promise<ToolResult> {
    const sessionId = args.session_id || 'default';
    if (!args.content) return { success: false, error: 'content is required' };

    const brain = getBrainDB();
    brain.writeScratchpad(sessionId, args.content);

    return { success: true, stdout: 'Scratchpad updated successfully. (Note: The scratchpad will automatically be injected into your context for future turns).' };
}

export async function executeScratchpadRead(args: { session_id?: string }): Promise<ToolResult> {
    const sessionId = args.session_id || 'default';

    const brain = getBrainDB();
    const content = brain.getScratchpad(sessionId);

    if (!content) {
        return { success: true, stdout: 'Scratchpad is currently empty.' };
    }

    return { success: true, stdout: content };
}

export async function executeScratchpadClear(args: { session_id?: string }): Promise<ToolResult> {
    const sessionId = args.session_id || 'default';

    const brain = getBrainDB();
    brain.clearScratchpad(sessionId);

    return { success: true, stdout: 'Scratchpad cleared successfully.' };
}
