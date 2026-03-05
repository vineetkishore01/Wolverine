import { ToolResult } from '../types.js';
import { shellTool } from './shell.js';
import {
  readTool, writeTool, editTool, listTool, deleteTool, renameTool, copyTool, mkdirTool, statTool, appendTool, applyPatchTool
} from './files.js';
import { webSearchTool, webFetchTool } from './web.js';
import { memorySearchTool, memoryWriteTool } from './memory.js';
import { skillListTool, skillSearchTool, skillInstallTool, skillRemoveTool, skillExecTool } from './skills.js';
import { timeNowTool } from './time.js';
import { selfUpdateTool } from './self-update.js';
import { readSourceTool, listSourceTool } from './source-access.js';
import { proposeRepairTool } from './self-repair.js';
import { personaReadTool, personaUpdateTool } from './persona.js';
import { readDocumentTool } from './documents.js';
import { configSaveTool } from './config-tool.js';
import { apiKeyConfigTool } from './api-key-config.js';
import { skillCreateTool, skillTestTool } from '../agent/skill-builder.js';
import { skillConnectorTool } from '../skills/connector-tool.js';
import { scratchpadWriteTool, scratchpadReadTool, scratchpadClearTool } from './scratchpad.js';
import { procedureSaveTool, procedureListTool, procedureGetTool, procedureRecordResultTool } from './procedures.js';
import {
  browserOpenTool, browserSnapshotTool, browserClickTool, browserFillTool,
  browserPressKeyTool, browserWaitTool, browserScrollTool, browserCloseTool,
  desktopScreenshotTool, desktopFindWindowTool, desktopFocusWindowTool, desktopClickTool,
  desktopDragTool, desktopWaitTool, desktopTypeTool, desktopPressKeyTool,
  desktopGetClipboardTool, desktopSetClipboardTool
} from './external-adapters.js';
import { systemStatusTool, ollamaPullTool } from './diagnostics.js';

export interface Tool {
  name: string;
  description: string;
  execute: (args: any, context?: { sessionId: string; workspacePath?: string }) => Promise<ToolResult>;
  schema: Record<string, string>;
  // Optional explicit OpenAPI-style JSON schema for native function-call parameters.
  // When provided, this is used instead of description-based type inference.
  jsonSchema?: Record<string, any>;
}

export type ToolProfile = 'minimal' | 'coding' | 'web' | 'full' | 'desktop' | 'browser';

const TOOL_PROFILE_TOOL_NAMES: Record<Exclude<ToolProfile, 'full'>, ReadonlySet<string>> = {
  minimal: new Set([
    'memory_search',
    'memory_write',
    'scratchpad_read',
    'scratchpad_write',
    'scratchpad_clear',
    'time_now',
    'system_status',
    'ollama_pull',
    'config_save',
  ]),
  coding: new Set([
    'run_command',
    'read',
    'write',
    'edit',
    'list',
    'delete',
    'rename',
    'copy',
    'mkdir',
    'stat',
    'append',
    'apply_patch',
    'read_document',
    'memory_search',
    'memory_write',
    'scratchpad_read',
    'scratchpad_write',
    'scratchpad_clear',
    'procedure_save',
    'procedure_list',
    'procedure_get',
    'procedure_record_result',
    'skill_connector',
    'skill_create',
    'skill_test',
    'system_status',
    'ollama_pull',
    'config_save',
  ]),
  web: new Set([
    'web_search',
    'web_fetch',
    'memory_search',
    'memory_write',
    'scratchpad_read',
    'scratchpad_write',
    'scratchpad_clear',
    'memory_write',
    'browser_open',
    'browser_snapshot',
    'browser_click',
    'browser_fill',
  ]),
  browser: new Set([
    'browser_open',
    'browser_snapshot',
    'browser_click',
    'browser_fill',
    'browser_press_key',
    'browser_wait',
    'browser_scroll',
    'browser_close',
  ]),
  desktop: new Set([
    'desktop_screenshot',
    'desktop_find_window',
    'desktop_focus_window',
    'desktop_click',
    'desktop_drag',
    'desktop_wait',
    'desktop_type',
    'desktop_press_key',
    'desktop_get_clipboard',
    'desktop_set_clipboard',
  ]),
};

function isToolProfile(value: string): value is ToolProfile {
  return value === 'minimal' || value === 'coding' || value === 'web' || value === 'full' || value === 'desktop' || value === 'browser';
}

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  private registerSafe(tool: Tool): void {
    try {
      this.register(tool);
    } catch (err: any) {
      const label = tool?.name || 'unknown_tool';
      const message = String(err?.message || err || 'unknown error');
      console.warn(`[tools] Failed to register "${label}": ${message}`);
    }
  }

  constructor() {
    // Core filesystem + shell
    this.registerSafe(shellTool);
    this.registerSafe(readTool);
    this.registerSafe(writeTool);
    this.registerSafe(editTool);
    this.registerSafe(listTool);
    this.registerSafe(deleteTool);
    // Additional filesystem utilities
    this.registerSafe(renameTool);
    this.registerSafe(copyTool);
    this.registerSafe(mkdirTool);
    this.registerSafe(statTool);
    this.registerSafe(appendTool);
    this.registerSafe(applyPatchTool);
    this.registerSafe(systemStatusTool);
    this.registerSafe(ollamaPullTool);
    // Web tools
    this.registerSafe(webSearchTool);
    this.registerSafe(webFetchTool);
    // Browser tools
    this.registerSafe(browserOpenTool);
    this.registerSafe(browserSnapshotTool);
    this.registerSafe(browserClickTool);
    this.registerSafe(browserFillTool);
    this.registerSafe(browserPressKeyTool);
    this.registerSafe(browserWaitTool);
    this.registerSafe(browserScrollTool);
    this.registerSafe(browserCloseTool);
    // Desktop tools
    this.registerSafe(desktopScreenshotTool);
    this.registerSafe(desktopFindWindowTool);
    this.registerSafe(desktopFocusWindowTool);
    this.registerSafe(desktopClickTool);
    this.registerSafe(desktopDragTool);
    this.registerSafe(desktopWaitTool);
    this.registerSafe(desktopTypeTool);
    this.registerSafe(desktopPressKeyTool);
    this.registerSafe(desktopGetClipboardTool);
    this.registerSafe(desktopSetClipboardTool);
    // Memory tools
    this.registerSafe(memoryWriteTool);
    this.registerSafe(memorySearchTool);
    // Time tool (system clock — no network)
    this.registerSafe(timeNowTool);
    // ClawHub skills tools
    this.registerSafe(skillListTool);
    this.registerSafe(skillSearchTool);
    this.registerSafe(skillInstallTool);
    this.registerSafe(skillRemoveTool);
    this.registerSafe(skillExecTool);
    // Self-update tool
    this.registerSafe(selfUpdateTool);
    // Self-repair tools (source read + repair proposal)
    this.registerSafe(readSourceTool);
    this.registerSafe(listSourceTool);
    this.registerSafe(proposeRepairTool);
    // Persona / memory growth tools
    this.registerSafe(personaReadTool);
    this.registerSafe(personaUpdateTool);
    // Document intelligence
    this.registerSafe(readDocumentTool);
    // Configuration management
    this.registerSafe(configSaveTool);
    this.registerSafe(apiKeyConfigTool);
    // Scratchpad tools
    this.registerSafe(scratchpadWriteTool);
    this.registerSafe(scratchpadReadTool);
    this.registerSafe(scratchpadClearTool);
    // Skill tools
    this.registerSafe(skillConnectorTool);
    this.registerSafe(skillCreateTool);
    this.registerSafe(skillTestTool);
    // Procedure tools
    this.registerSafe(procedureSaveTool);
    this.registerSafe(procedureListTool);
    this.registerSafe(procedureGetTool);
    this.registerSafe(procedureRecordResultTool);
  }


  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  private listByProfile(profile: ToolProfile = 'full'): Tool[] {
    if (profile === 'full') return this.list();
    const toolNames = TOOL_PROFILE_TOOL_NAMES[profile];
    return this.list().filter((tool) => toolNames.has(tool.name));
  }

  resolveToolProfile(profile?: string | null): ToolProfile {
    const normalized = String(profile || '').trim().toLowerCase();
    return isToolProfile(normalized) ? normalized : 'full';
  }

  public async execute(name: string, args: any, context?: { sessionId: string; workspacePath?: string }): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    try {
      return await tool.execute(args, context);
    } catch (err: any) {
      return { success: false, error: `Execution failed: ${err.message}` };
    }
  }


  getToolSchemas(profile: ToolProfile = 'full'): string {
    const tools = this.listByProfile(profile);
    return tools.map(tool => {
      const schemaStr = Object.entries(tool.schema)
        .map(([key, desc]) => `  - ${key}: ${desc}`)
        .join('\n');

      return `${tool.name}: ${tool.description}\n${schemaStr}`;
    }).join('\n\n');
  }

  getToolDefinitionsForChat(profile: ToolProfile = 'full'): any[] {
    const tools = this.listByProfile(profile);
    const inferParamSchema = (key: string, desc: string): any => {
      const k = String(key || '').toLowerCase();
      const d = String(desc || '').toLowerCase();
      if (/\b(true|false|boolean)\b/.test(d) || /\b(force|strict|recursive|enabled|disabled|stream|dry_run|dry run)\b/.test(k)) {
        return { type: 'boolean', description: String(desc || '') };
      }
      if (
        /\b(integer|number|count|max|min|limit|timeout|ms|seconds?|minutes?|days?)\b/.test(d)
        || /(max|min|count|limit|timeout|num|days|hours|minutes|seconds|retries|offset|line|chars|size|port)$/.test(k)
      ) {
        return { type: 'number', description: String(desc || '') };
      }
      if (/\bjson\b/.test(d) || /(args|params|options|payload|values)_?json$/.test(k)) {
        return {
          anyOf: [
            { type: 'object' },
            { type: 'array' },
            { type: 'string' },
          ],
          description: String(desc || ''),
        };
      }
      return { type: 'string', description: String(desc || '') };
    };
    const buildInferredParameters = (tool: Tool): Record<string, any> => {
      const properties: Record<string, any> = {};
      for (const [key, desc] of Object.entries(tool.schema || {})) {
        properties[key] = inferParamSchema(key, String(desc || ''));
      }
      return {
        type: 'object',
        properties,
        additionalProperties: true,
      };
    };
    const normalizeExplicitParameters = (tool: Tool): Record<string, any> | null => {
      const raw = tool.jsonSchema;
      if (!raw || typeof raw !== 'object') return null;
      const normalized: Record<string, any> = { ...raw };
      if (normalized.type == null) normalized.type = 'object';
      if (normalized.properties == null) normalized.properties = {};
      if (normalized.additionalProperties == null) normalized.additionalProperties = true;
      return normalized;
    };
    return tools.map((tool) => {
      const explicitParameters = normalizeExplicitParameters(tool);
      const inferredParameters = buildInferredParameters(tool);
      const parameters = explicitParameters || inferredParameters;
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters,
        },
      };
    });
  }

  isToolEnabled(toolName: string, enabledTools: string[]): boolean {
    return enabledTools.includes(toolName);
  }
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}
