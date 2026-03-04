import { getBrainDB } from '../db/brain';

export interface ContextPackage {
    relevantMemories: string;
    matchedProcedure: string | null;
    activeSkillContext: string | null;
    activeScratchpad: string | null;
    tokenEstimate: number;
}

/**
 * Build context package for a user message.
 * Called BEFORE each LLM call in handleChat().
 * This is the core of Wolverine's Context Engineer, enabling small models
 * to seem smart without blowing up their context window.
 */
export function buildContextForMessage(
    userMessage: string,
    sessionId: string,
    opts?: {
        maxMemoryTokens?: number;   // default 300 (≈75 tokens worth of chars)
        maxProcedureTokens?: number; // default 400
    }
): ContextPackage {
    const brain = getBrainDB();
    const maxMemChars = (opts?.maxMemoryTokens ?? 300) * 4;
    const maxProcChars = (opts?.maxProcedureTokens ?? 400) * 4;

    // 1. Search relevant memories using SQLite FTS5
    const memories = brain.searchMemories(userMessage, { max: 5, scope: 'global' });

    // Track access for long-term intelligence rating
    for (const m of memories) {
        try { brain.bumpAccessCount(m.id); } catch { /* ignore if DB is busy */ }
    }

    let relevantMemories = '';
    if (memories.length > 0) {
        const bullets = memories.map(m => `- [${m.category}] ${m.content}`);
        relevantMemories = `## Relevant Memories (Context Engineer)\n${bullets.join('\n')}`;
        if (relevantMemories.length > maxMemChars) {
            relevantMemories = relevantMemories.slice(0, maxMemChars) + '\n...[truncated]';
        }
    }

    // 3. Match procedure by trigger keywords
    let matchedProcedure: string | null = null;
    try {
        const procedure = brain.findProcedure(userMessage);
        if (procedure) {
            let steps = [];
            try {
                steps = JSON.parse(procedure.steps);
            } catch {
                // Ignore unparseable steps
            }
            if (Array.isArray(steps) && steps.length > 0) {
                const stepsText = steps.map((s: any) =>
                    `${s.order}. ${s.description} → use tool: ${s.tool}`
                ).join('\n');
                matchedProcedure = [
                    `## Saved Procedure Triggered: ${procedure.name} (ID: ${procedure.id})`,
                    procedure.description || '',
                    'Follow these steps exactly (stop and ask if something breaks):',
                    stepsText,
                    `IMPORTANT: After completing or failing this procedure, you MUST call procedure_record_result with id: "${procedure.id}" and success: true/false.`,
                ].filter(Boolean).join('\n');

                if (matchedProcedure.length > maxProcChars) {
                    matchedProcedure = matchedProcedure.slice(0, maxProcChars) + '\n...[truncated]';
                }
            }
        }
    } catch {
        // Safe fail if DB schema isn't fully updated yet
    }

    // 4. Active Scratchpad
    let activeScratchpad: string | null = null;
    try {
        const scratchpadContent = brain.getScratchpad(sessionId);
        if (scratchpadContent) {
            activeScratchpad = `## Active Scratchpad\n${scratchpadContent}`;
        }
    } catch {
        // Safe fail
    }

    // 5. Estimate tokens (rough heuristic: 4 chars per token)
    const totalChars = (relevantMemories?.length || 0) + (matchedProcedure?.length || 0) + (activeScratchpad?.length || 0);
    const tokenEstimate = Math.ceil(totalChars / 4);

    return { relevantMemories, matchedProcedure, activeSkillContext: null, activeScratchpad, tokenEstimate };
}
