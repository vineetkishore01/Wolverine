import { getBrainDB } from '../db/brain';
import { estimateTokens } from '../db/brain';
import { detectServices, isConfigurationRequest, generateConfigRequest, formatKnownServices } from '../agent/service-autoconfig';
import { formatCapabilitiesForLLM, scanAllCapabilities } from '../agent/capability-scanner';

export interface ContextPackage {
    relevantMemories: string;
    matchedProcedure: string | null;
    activeSkillContext: string | null;
    activeScratchpad: string | null;
    tokenEstimate: number;
    agentEnhancements?: string;
    serviceRequests?: Array<{
        service: string;
        needs_config: string[];
        response: string;
    }>;
}

/**
 * Build context package for a user message.
 * Called BEFORE each LLM call in handleChat().
 * This is the core of Wolverine's Context Engineer, enabling small models
 * to seem smart without blowing up their context window.
 */
export async function buildContextForMessage(
    userMessage: string,
    sessionId: string,
    opts?: {
        maxMemoryTokens?: number;   // default 300 (≈75 tokens worth of chars)
        maxProcedureTokens?: number; // default 400
    }
): Promise<ContextPackage> {
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
        const procedure = await brain.findProcedure(userMessage);
        if (procedure) {
            matchedProcedure = `## Matched Procedure\n${procedure}`;
            if (matchedProcedure.length > maxProcChars) {
                matchedProcedure = matchedProcedure.slice(0, maxProcChars) + '\n...[truncated]';
            }
        }
    } catch {
        // Safe fail
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

    // 5. Estimate tokens (using improved estimation)
    const totalChars = (relevantMemories?.length || 0) + (matchedProcedure?.length || 0) + (activeScratchpad?.length || 0);
    const tokenEstimate = estimateTokens(relevantMemories) + estimateTokens(matchedProcedure || '') + estimateTokens(activeScratchpad || '');

    // 6. Phase 1: Add agent enhancement prompts for small models
    const agentEnhancements = `
# Agent Capabilities

You have access to ENHANCED AGENT CAPABILITIES designed for efficient operation:

## Agentic Search Strategy
Use search tools in order from cheapest to most expensive:
1. GLOB (50 tokens) - Fast pattern matching for file paths
2. GREP (200 tokens) - Content search in files  
3. READ (500 tokens) - Full file content (use sparingly)

Start with glob to find files, use grep to narrow down, read only specific sections.

## Procedural Memory
The system learns from successful tool sequences. When a procedure is triggered:
- Follow the steps exactly
- Adapt arguments to current task
- Report success/failure when complete

## Memory Layers
- SCRATCHPAD: Use for task decomposition and tracking progress
- MEMORY SEARCH: Search for relevant facts before acting
- Always check scratchpad at the start of complex tasks
`.trim();

    // AGI Phase 3: Service Auto-Config detection
    let serviceRequests: ContextPackage['serviceRequests'] = undefined;
    try {
        if (isConfigurationRequest(userMessage)) {
            const detected = detectServices(userMessage);
            if (detected.length > 0) {
                const requests = generateConfigRequest(detected);
                if (requests.length > 0) {
                    serviceRequests = requests.map(r => ({
                        service: r.service,
                        needs_config: r.needed,
                        response: r.user_message
                    }));
                }
            }
        }
    } catch {
        // Ignore service detection errors
    }

    return {
        relevantMemories,
        matchedProcedure,
        activeSkillContext: null,
        activeScratchpad,
        tokenEstimate,
        agentEnhancements,
        serviceRequests
    };
}

