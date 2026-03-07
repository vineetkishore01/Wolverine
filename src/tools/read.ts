/**
 * Read Tool - Read file contents
 * 
 * @example
 * ```typescript
 * await executeTool('read', { path: './src/index.ts' });
 * await executeTool('read', { path: './config.json', startLine: 0, endLine: 50 });
 * ```
 */

import { registerTool, ToolContext, ToolResult } from './core';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

@registerTool({
  name: 'read',
  description: 'Read file contents with optional line range. Use for examining code, configs, documents, and text files.',
  category: 'file',
  riskLevel: 'low',
  idempotent: true,
  parallelizable: true,
  tags: ['file', 'read', 'view', 'examine']
})
export class ReadTool {
  static schema = z.object({
    path: z.string().describe('Absolute or relative path to file'),
    startLine: z.number().optional().describe('Start line (0-indexed, default: 0)'),
    endLine: z.number().optional().describe('End line (exclusive, default: end of file)'),
  });
  
  async execute(params: z.infer<typeof ReadTool.schema>, context?: ToolContext): Promise<ToolResult> {
    const { path: filePath, startLine, endLine } = params;
    
    try {
      // Resolve path
      const safePath = await this.resolvePath(filePath, context?.workspacePath);
      
      // Check file exists
      await fs.access(safePath);
      
      // Read file
      const content = await fs.readFile(safePath, 'utf-8');
      const lines = content.split('\n');
      
      // Apply line range
      const sliced = lines.slice(startLine ?? 0, endLine ?? lines.length);
      
      return {
        success: true,
        content: sliced.join('\n'),
        metadata: {
          totalLines: lines.length,
          returnedLines: sliced.length,
          filePath: safePath,
          encoding: 'utf-8'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read file: ${error.message}`
      };
    }
  }
  
  private async resolvePath(filePath: string, workspacePath?: string): Promise<string> {
    // If absolute path, use as-is
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // If workspace provided, resolve relative to workspace
    if (workspacePath) {
      return path.resolve(workspacePath, filePath);
    }
    
    // Fallback to current directory
    return path.resolve(filePath);
  }
}
