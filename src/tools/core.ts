/**
 * Wolverine Core - Tool Registration System
 * 
 * Decorator-based tool registration for modular, extensible tool ecosystem.
 * 
 * @module @wolverine/core/tools
 */

import 'reflect-metadata';
import { z } from 'zod';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ToolCategory = 
  | 'file' 
  | 'shell' 
  | 'web' 
  | 'memory' 
  | 'system' 
  | 'skill' 
  | 'browser' 
  | 'desktop'
  | 'document'
  | 'persona';

export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ToolMetadata {
  /** Unique tool identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Tool category for organization */
  category: ToolCategory;
  /** Risk level for security policies */
  riskLevel: ToolRiskLevel;
  /** Whether tool requires user approval before execution */
  requiresApproval?: boolean;
  /** Whether tool produces same output for same input (idempotent) */
  idempotent?: boolean;
  /** Whether tool can be run in parallel */
  parallelizable?: boolean;
  /** Tags for search and discovery */
  tags?: string[];
}

export interface ToolContext {
  sessionId?: string;
  workspacePath?: string;
  userId?: string;
  channel?: 'web' | 'telegram' | 'discord' | 'whatsapp' | 'cli';
  [key: string]: any;
}

export interface ToolResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export type ToolConstructor = new () => {
  execute(params: any, context?: ToolContext): Promise<ToolResult>;
};

// ─── Global Registry ───────────────────────────────────────────────────────────

export const TOOL_REGISTRY = new Map<string, ToolConstructor>();

// ─── Decorator ─────────────────────────────────────────────────────────────────

/**
 * Register a tool class with the global registry.
 * 
 * @example
 * ```typescript
 * @registerTool({
 *   name: 'read',
 *   description: 'Read file contents',
 *   category: 'file',
 *   riskLevel: 'low',
 *   idempotent: true
 * })
 * export class ReadTool {
 *   static schema = z.object({
 *     path: z.string().describe('File path to read')
 *   });
 *   
 *   async execute(params: z.infer<typeof ReadTool.schema>) {
 *     // Implementation
 *   }
 * }
 * ```
 */
export function registerTool(metadata: ToolMetadata) {
  return function (target: Function) {
    // Validate tool has schema
    if (!('schema' in target)) {
      throw new Error(
        `Tool "${metadata.name}" must have a static "schema" property defined. ` +
        `Use Zod schema: static schema = z.object({ ... })`
      );
    }
    
    // Check for duplicate registration
    if (TOOL_REGISTRY.has(metadata.name)) {
      const existing = TOOL_REGISTRY.get(metadata.name);
      console.warn(
        `[ToolRegistry] Warning: Tool "${metadata.name}" is being re-registered. ` +
        `Previous registration: ${existing?.name || 'unknown'}`
      );
    }
    
    // Register in global registry
    TOOL_REGISTRY.set(metadata.name, target as unknown as ToolConstructor);
    
    // Store metadata for introspection
    Reflect.defineMetadata('tool:metadata', metadata, target);
    
    console.log(`[ToolRegistry] ✅ Registered: ${metadata.name} (${metadata.category}, ${metadata.riskLevel})`);
  };
}

// ─── Registry Utilities ────────────────────────────────────────────────────────

/**
 * Get tool class by name
 */
export function getTool(name: string): ToolConstructor | undefined {
  return TOOL_REGISTRY.get(name);
}

/**
 * Get all tools in a category
 */
export function getToolsByCategory(category: ToolCategory): ToolConstructor[] {
  const tools: ToolConstructor[] = [];
  for (const [name, toolClass] of TOOL_REGISTRY.entries()) {
    const metadata = Reflect.getMetadata('tool:metadata', toolClass) as ToolMetadata | undefined;
    if (metadata?.category === category) {
      tools.push(toolClass as unknown as ToolConstructor);
    }
  }
  return tools;
}

/**
 * Get tool metadata
 */
export function getToolMetadata(toolClass: Function): ToolMetadata | undefined {
  return Reflect.getMetadata('tool:metadata', toolClass);
}

/**
 * Get all registered tools
 */
export function getAllTools(): Array<{ name: string; metadata: ToolMetadata; schema: any }> {
  const tools: Array<{ name: string; metadata: ToolMetadata; schema: any }> = [];
  
  for (const [name, toolClass] of TOOL_REGISTRY.entries()) {
    const metadata = Reflect.getMetadata('tool:metadata', toolClass) as ToolMetadata | undefined;
    if (metadata) {
      tools.push({
        name,
        metadata,
        schema: (toolClass as any).schema
      });
    }
  }
  
  return tools;
}

/**
 * Get tool definitions for LLM function calling
 */
export function getToolDefinitions(toolNames?: string[]): Array<{
  name: string;
  description: string;
  parameters: any;
}> {
  const tools = toolNames 
    ? toolNames.map(name => getTool(name)).filter(Boolean) as ToolConstructor[]
    : Array.from(TOOL_REGISTRY.values());
  
  return tools.map(toolClass => {
    const metadata = getToolMetadata(toolClass) as ToolMetadata;
    const schema = (toolClass as any).schema as z.ZodSchema;
    
    // Convert Zod schema to JSON Schema for LLM
    const parameters = zodToJsonSchema(schema);
    
    return {
      name: metadata.name,
      description: metadata.description,
      parameters
    };
  });
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  params: any,
  context?: ToolContext
): Promise<ToolResult> {
  const toolClass = getTool(name);
  
  if (!toolClass) {
    return {
      success: false,
      error: `Tool "${name}" not found. Available tools: ${Array.from(TOOL_REGISTRY.keys()).join(', ')}`
    };
  }
  
  try {
    const tool = new toolClass();
    const schema = (toolClass as any).schema as z.ZodSchema | undefined;
    
    // Validate parameters if schema exists
    if (schema) {
      try {
        params = schema.parse(params);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            success: false,
            error: `Invalid parameters for tool "${name}": ${error.errors.map(e => e.message).join(', ')}`
          };
        }
      }
    }
    
    // Execute tool
    return await tool.execute(params, context);
  } catch (error: any) {
    return {
      success: false,
      error: `Tool execution failed: ${error.message}`
    };
  }
}

// ─── Zod to JSON Schema Converter ──────────────────────────────────────────────

/**
 * Convert Zod schema to JSON Schema for LLM function calling
 */
function zodToJsonSchema(schema: z.ZodSchema): any {
  if (schema instanceof z.ZodString) {
    return { type: 'string', description: schema.description || '' };
  }
  
  if (schema instanceof z.ZodNumber) {
    return { type: 'number', description: schema.description || '' };
  }
  
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean', description: schema.description || '' };
  }
  
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      description: schema.description || '',
      items: zodToJsonSchema(schema.element)
    };
  }
  
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodSchema);
      if (!(value as z.ZodSchema).isOptional()) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      description: schema.description || '',
      properties,
      required,
      additionalProperties: false
    };
  }
  
  if (schema instanceof z.ZodOptional) {
    return {
      ...zodToJsonSchema(schema.unwrap()),
      optional: true
    };
  }
  
  if (schema instanceof z.ZodDefault) {
    return {
      ...zodToJsonSchema(schema.removeDefault()),
      default: schema._def.defaultValue()
    };
  }
  
  // Fallback for other types
  return {
    type: 'string',
    description: schema.description || ''
  };
}

// ─── Backward Compatibility ────────────────────────────────────────────────────

/**
 * Legacy tool interface for backward compatibility
 */
export interface LegacyTool {
  name: string;
  description: string;
  execute: (args: any, context?: { sessionId: string; workspacePath?: string }) => Promise<ToolResult>;
  schema: Record<string, string>;
  jsonSchema?: Record<string, any>;
}

/**
 * Convert legacy tool to new registry format
 */
export function registerLegacyTool(legacyTool: LegacyTool): void {
  // Create a wrapper class
  class LegacyToolWrapper {
    static schema = z.any(); // No validation for legacy tools
    
    async execute(params: any, context?: ToolContext): Promise<ToolResult> {
      return await legacyTool.execute(params, {
        sessionId: context?.sessionId ?? '',
        workspacePath: context?.workspacePath ?? ''
      });
    }
  }
  
  // Register with decorator metadata
  const metadata: ToolMetadata = {
    name: legacyTool.name ?? 'unknown',
    description: legacyTool.description ?? 'No description',
    category: 'system',
    riskLevel: 'medium',
  };

  Reflect.defineMetadata('tool:metadata', metadata, LegacyToolWrapper);
  TOOL_REGISTRY.set(legacyTool.name, LegacyToolWrapper as unknown as ToolConstructor);
  
  console.log(`[ToolRegistry] 📦 Registered legacy tool: ${legacyTool.name}`);
}
