/**
 * Function Calling Abstraction Layer - Wolverine Protocol
 */

import { ChatMessage, ToolCall } from '../providers/LLMProvider';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, any>; required?: string[] };
}

export interface FnCallConfig {
  format: string;
  parallelCalls?: boolean;
  functionChoice?: 'auto' | 'none' | string;
  thoughtInContent?: boolean;
  tier?: 'low' | 'medium' | 'high';
}

export interface FnCallResult {
  toolCalls: ToolCall[];
  content: string;
  thinking?: string;
  tier?: 'low' | 'medium' | 'high';
}

export interface FnCallPromptTemplate {
  name: string;
  preprocess(messages: ChatMessage[], tools: ToolDefinition[], config: FnCallConfig): ChatMessage[];
  postprocess(response: string, config: FnCallConfig): FnCallResult;
}

const NL = '\n';

export class StandardFnCallPrompt implements FnCallPromptTemplate {
  name = 'standard';

  preprocess(messages: ChatMessage[], tools: ToolDefinition[], config: FnCallConfig): ChatMessage[] {
    const toolPrompt = tools.map(t => t.name + ': ' + t.description).join(NL);
    const systemMessage = 'You have these tools:' + NL + NL + toolPrompt + NL + NL + 'Respond with JSON:' + NL + '```json' + NL + '{"name": "tool", "arguments": {}}' + NL + '```';
    const existing = messages.find(m => m.role === 'system');
    if (existing) {
      existing.content = systemMessage + NL + NL + existing.content;
      return messages;
    }
    return [{ role: 'system', content: systemMessage }, ...messages];
  }

  postprocess(response: string, config: FnCallConfig): FnCallResult {
    const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) return { toolCalls: [], content: response.trim() };
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      const toolCalls: ToolCall[] = [];
      const ts = Date.now();
      if (Array.isArray(parsed)) {
        parsed.forEach((c, i) => {
          toolCalls.push({ id: 'call_' + ts + '_' + i, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.arguments || {}) } });
        });
      } else {
        toolCalls.push({ id: 'call_' + ts, type: 'function', function: { name: parsed.name, arguments: JSON.stringify(parsed.arguments || {}) } });
      }
      return { toolCalls, content: response.replace(jsonMatch[0], '').trim() };
    } catch {
      return { toolCalls: [], content: response.trim() };
    }
  }
}

export class WolverineFnCallPrompt implements FnCallPromptTemplate {
  name = 'wolverine';

  preprocess(messages: ChatMessage[], tools: ToolDefinition[], config: FnCallConfig): ChatMessage[] {
    const isLowTier = config.tier === 'low';

    // For low tier, we use an extremely compressed tool list to save tokens and reduce reasoning pressure.
    const toolPrompt = isLowTier
      ? tools.map(t => `- ${t.name}`).join(', ')
      : tools.map(t => '{"name":"' + t.name + '","description":"' + t.description + '","parameters":' + JSON.stringify(t.parameters) + '}').join(',');

    const rules = isLowTier
      ? `1. Use: <tool_code>{"name":"x","arguments":{}}</tool_code>\n2. No narration.`
      : `1. Use EXACT format: <tool_code>{"name":"x","arguments":{}}</tool_code>\n2. Do NOT narrate or explain. Write the tool call IMMEDIATELY.\n3. Send multiple <tool_code> blocks if needed.\n4. Call list_dir if uncertain.`;

    const instructions = isLowTier
      ? `## TOOLS\nAvailable: ${toolPrompt}\n\n${rules}`
      : `## TOOLS\nDefinitions: [${toolPrompt}]\n\n━━━ WOLVERINE PROTOCOL: PATTERNS ━━━\nList: <tool_code>{"name":"list_dir","arguments":{"DirectoryPath":"."}}</tool_code>\nRead: <tool_code>{"name":"view_file","arguments":{"AbsolutePath":"..."}}</tool_code>\n\n━━━ RULES ━━━\n${rules}`;

    const systemMessage = instructions;
    const existing = messages.find(m => m.role === 'system');
    if (existing) {
      existing.content = systemMessage + NL + NL + existing.content;
      return messages;
    }
    return [{ role: 'system', content: systemMessage }, ...messages];
  }

  postprocess(response: string, config: FnCallConfig): FnCallResult {
    // Try native <tool_code> format first (Wolverine's preferred format)
    const nativeToolRegex = /<tool_code>([\s\S]*?)<\/tool_code>/g;
    // Fallback to legacy [TOOL] format
    const legacyToolRegex = /\[TOOL\]([\s\S]*?)\[\/TOOL\]/g;

    let matches = [...response.matchAll(nativeToolRegex)];

    if (matches.length === 0) {
      matches = [...response.matchAll(legacyToolRegex)];
    }

    if (!matches.length) return { toolCalls: [], content: response.trim() };

    const toolCalls: ToolCall[] = [];
    const ts = Date.now();
    matches.forEach((m, i) => {
      const content = m[1].trim();
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(content);
        toolCalls.push({ id: 'call_' + ts + '_' + i, type: 'function', function: { name: parsed.name, arguments: JSON.stringify(parsed.arguments || {}) } });
      } catch (e: any) {
        // Fallback for small models that might just output the tool name
        // If it's a simple alphanumeric string, treat it as a tool name with no args
        if (/^[a-z0-9_]+$/i.test(content)) {
          console.warn('[WolverineFnCallPrompt] Model output bare tool name, attempting auto-wrap:', content);
          toolCalls.push({ id: 'call_' + ts + '_' + i, type: 'function', function: { name: content, arguments: '{}' } });
        } else {
          console.error('[WolverineFnCallPrompt] Failed to parse tool call:', e.message, 'Content:', content.slice(0, 100));
        }
      }
    });

    // Remove both formats from content
    const cleanedContent = response.replace(nativeToolRegex, '').replace(legacyToolRegex, '').trim();
    return { toolCalls, content: cleanedContent };
  }
}

export function getFnCallPrompt(format: string): FnCallPromptTemplate {
  switch (format.toLowerCase()) {
    case 'standard':
    case 'nous': return new StandardFnCallPrompt();
    case 'wolverine':
    case 'qwen': return new WolverineFnCallPrompt();
    default: return new StandardFnCallPrompt();
  }
}
