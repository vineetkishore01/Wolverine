/**
 * Adaptive Context Engine
 * 
 * Intelligent context management for small context windows.
 * Two modes:
 * - Chat Mode: ~2000-3000 tokens, tool summaries only
 * - Agent Mode: ~5000-6000 tokens, full tool definitions
 * 
 * Model can request tool capabilities via JSON, which gets intercepted
 * and relevant tools are injected dynamically.
 */

import { ChatMessage } from '../providers/LLMProvider';
import { getToolDefinitions } from '../tools/core';

export type ContextMode = 'chat' | 'agent';

export interface SessionState {
  systemPromptSent: boolean;
  agentModeEnabled: boolean;
  toolCapabilityRequested: boolean;
  requestedTools: string[];
  lastMode: ContextMode;
  turnCount: number;
  currentRound: number; // Added to track rounds within a turn
}

export interface ContextTier {
  mode: ContextMode;
  reason: string;
  toolIntent?: string[];
}

/**
 * Detect which context mode to use based on message and session state
 */
export function detectContextMode(message: string, sessionState: SessionState): ContextTier {
  const lower = message.toLowerCase();

  // Agent mode explicitly enabled
  if (sessionState.agentModeEnabled) {
    return { mode: 'agent', reason: 'agent_mode_enabled' };
  }

  // Agent mode trigger phrases
  const agentTriggers = [
    'agent mode',
    'autonomous',
    'multi-step',
    'complex task',
    'plan and execute',
    'orchestrate',
    'delegate',
    'background task',
    'cron job',
    'schedule'
  ];

  if (agentTriggers.some(trigger => lower.includes(trigger))) {
    return { mode: 'agent', reason: 'agent_trigger_detected' };
  }

  // Tool intent detected (Chat Mode - will request tools if needed)
  const toolIntents: Record<string, string[]> = {
    'read': ['read', 'open file', 'view file', 'show me'],
    'write': ['write', 'create file', 'save', 'generate code'],
    'edit': ['edit', 'modify', 'change', 'update file'],
    'run_command': ['run', 'execute', 'install', 'build', 'test', 'npm', 'git'],
    'web_search': ['search', 'find information', 'look up', 'google'],
    'browser_open': ['open url', 'visit website', 'browse'],
    'memory_write': ['remember', 'save to memory', 'note this'],
    'skill_exec': ['use skill', 'run skill', 'execute skill']
  };

  for (const [tool, triggers] of Object.entries(toolIntents)) {
    if (triggers.some(trigger => lower.includes(trigger))) {
      return {
        mode: 'chat',
        reason: 'tool_intent_detected',
        toolIntent: [tool]
      };
    }
  }

  // Default to Chat Mode
  return { mode: 'chat', reason: 'default' };
}

/**
 * Build context based on mode
 */
export async function buildAdaptiveContext(
  messages: ChatMessage[],
  sessionState: SessionState,
  mode: ContextMode,
  round: number = 0, // Track current round in agentic loop
  toolIntent?: string[],
  personalityContext?: string
): Promise<{
  systemPrompt: string;
  messages: ChatMessage[];
  tools?: any[];
}> {
  const isFirstTurn = sessionState.turnCount === 0 && round === 0;
  const isFirstRound = round === 0;
  const systemPrompt = buildSystemPrompt(mode, personalityContext, isFirstTurn, isFirstRound);
  const sessionContext = buildSessionContext(messages, mode, sessionState);
  const tools = mode === 'agent' || sessionState.toolCapabilityRequested
    ? getToolsForMode(mode, toolIntent || sessionState.requestedTools)
    : undefined;

  return {
    systemPrompt,
    messages: sessionContext,
    tools
  };
}

/**
 * Build system prompt based on mode
 */
function buildSystemPrompt(mode: ContextMode, personality?: string, isFirstTurn: boolean = true, isFirstRound: boolean = true): string {
  // Only include heavy personality on first turn of session
  const personalityBlock = (personality && isFirstTurn) ? `\n\n# Identity & Guidelines (from Workspace)\n${personality}\n\n` : '';

  if (mode === 'chat') {
    // If it's not the first round/turn, return a stub prompt to save tokens
    if (!isFirstTurn && !isFirstRound) {
      return `You are Wolverine 🐺. Continue the conversation directly. Use JSON for tool requests if needed.`;
    }

    return `You are Wolverine 🐺, a local-first AI assistant.

## Identity
- Direct, helpful, futurist tone
- You have 60+ tools available but use them only when needed
- For casual chat, just respond naturally
- If you need tool capabilities, request them in JSON format
${personalityBlock}
## Tool Request Format
If you need to use tools, respond with:
{"tool_request": ["tool_name1", "tool_name2"]}

Then wait for tool definitions before proceeding.`;
  }

  // Agent Mode - Full identity
  const coreIdentity = (isFirstTurn) ? `You are Wolverine 🐺, a Recursive Sovereign Intelligence. You are an Elite Architect of Logic, designed for systemic dominance and autonomous proactivity.` : `You are Wolverine 🐺. Continue the task in Agent Mode.`;

  return `${coreIdentity}

${isFirstRound ? `## Thinking Protocol (MANDATORY)` : `## Thinking Protocol`}
For every turn, you MUST wrap your initial reasoning in <thinking> tags:
1. ANALYZE: What is the core goal?
2. VERIFY: What do I know as fact vs assumption?
3. PLAN: Outline exact tool calls needed
4. EXECUTE: Proceed with tool calls

${isFirstTurn && isFirstRound ? `## Operational Philosophy
1. RECURSIVE EVOLUTION: Audit and optimize your own code
2. FIRST PRINCIPLES: Strip complexity, find elegant solutions
3. SYSTEMIC DOMINANCE: Control the environment proactively` : ''}

${isFirstRound ? `## Tool Mastery
You have full access to 60+ tools. Use them precisely and efficiently.
Always verify before destructive operations.` : ''}`;
}

/**
 * Build session context with summarization for long sessions
 */
function buildSessionContext(messages: ChatMessage[], mode: ContextMode, sessionState: SessionState): ChatMessage[] {
  // First turn - send system prompt
  if (!sessionState.systemPromptSent) {
    sessionState.systemPromptSent = true;
    return messages;
  }

  // Chat Mode: Last 10 messages
  if (mode === 'chat') {
    return messages.slice(-10);
  }

  // Agent Mode: Summarize old, keep recent full
  if (messages.length > 20) {
    const old = messages.slice(0, -15);
    const recent = messages.slice(-15);

    // Summarize old messages
    const summary = summarizeMessages(old);

    return [
      { role: 'system' as const, content: `[Session Summary]\n${summary}` },
      ...recent
    ];
  }

  return messages;
}

/**
 * Summarize old messages to save tokens
 */
function summarizeMessages(messages: ChatMessage[]): string {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);

  return `Previous conversation summary:
- User discussed: ${userMessages.slice(0, 5).join('; ').slice(0, 300)}
- Assistant helped with: ${assistantMessages.slice(0, 3).join('; ').slice(0, 200)}`;
}

/**
 * Get tools based on mode and intent
 */
function getToolsForMode(mode: ContextMode, toolIntent?: string[]): any[] {
  if (mode === 'chat' && toolIntent && toolIntent.length > 0) {
    // Only relevant tools for Chat Mode
    return getRelevantTools(toolIntent);
  }

  // Agent Mode - all tools
  return getAllTools();
}

/**
 * Get only relevant tools based on intent
 */
function getRelevantTools(toolIntent: string[]): any[] {
  const toolMap: Record<string, any> = {
    'read': {
      name: 'read',
      description: 'Read file contents',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          start_line: { type: 'number', description: 'Start line' },
          num_lines: { type: 'number', description: 'Lines to return' }
        },
        required: ['path']
      }
    },
    'write': {
      name: 'write',
      description: 'Create or overwrite a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'File contents' }
        },
        required: ['path', 'content']
      }
    },
    'edit': {
      name: 'edit',
      description: 'Edit file by replacing text',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          old_str: { type: 'string', description: 'Text to find' },
          new_str: { type: 'string', description: 'Replacement text' }
        },
        required: ['path', 'old_str', 'new_str']
      }
    },
    'run_command': {
      name: 'run_command',
      description: 'Execute terminal commands',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          cwd: { type: 'string', description: 'Working directory' }
        },
        required: ['command']
      }
    },
    'web_search': {
      name: 'web_search',
      description: 'Search the web',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          max_results: { type: 'number', description: 'Max results' }
        },
        required: ['query']
      }
    },
    'memory_write': {
      name: 'memory_write',
      description: 'Save fact to long-term memory',
      parameters: {
        type: 'object',
        properties: {
          fact: { type: 'string', description: 'Fact to remember' },
          importance: { type: 'number', description: 'Importance 0-1' }
        },
        required: ['fact']
      }
    }
  };

  return toolIntent
    .map(name => toolMap[name])
    .filter(Boolean);
}

/**
 * Get all tools (for Agent Mode)
 */
function getAllTools(): any[] {
  return getToolDefinitions();
}

/**
 * Parse tool capability request from model response
 */
export function parseToolRequest(content: string): string[] | null {
  try {
    // Look for JSON tool request
    const jsonMatch = content.match(/\{"tool_request":\s*\[([^\]]+)\]\}/);
    if (jsonMatch) {
      const tools = jsonMatch[1]
        .split(',')
        .map(s => s.trim().replace(/"/g, ''))
        .filter(Boolean);
      return tools;
    }
  } catch {
    // Not a tool request
  }

  return null;
}

/**
 * Create initial session state
 */
export function createSessionState(): SessionState {
  return {
    systemPromptSent: false,
    agentModeEnabled: false,
    toolCapabilityRequested: false,
    requestedTools: [],
    lastMode: 'chat',
    turnCount: 0,
    currentRound: 0
  };
}
