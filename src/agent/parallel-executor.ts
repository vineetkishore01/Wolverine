/**
 * Limited Parallel Execution
 * 
 * Implements constrained parallel tool execution for small models.
 * Limited to 2-3 parallel calls due to context window constraints.
 * 
 * Key insight: Even 2 parallel calls can significantly reduce latency
 * for exploration tasks, but context window limits prevent large batches.
 */

import { ToolResult } from '../types';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolCallResult {
  id: string;
  success: boolean;
  result: ToolResult;
  latency: number;
}

export interface ParallelBatch {
  id: string;
  calls: ToolCall[];
  maxParallel: number;
  contextBudget: number; // tokens
}

/**
 * Analyze tool calls for dependency detection
 */
export function analyzeDependencies(
  calls: ToolCall[]
): {
  independent: ToolCall[];
  dependent: ToolCall[];
  parallelizable: ToolCall[][];
} {
  // Simple heuristic: check if args share file paths
  const fileArgs = new Map<string, string[]>();
  
  for (const call of calls) {
    const fileValues = extractFileArgs(call.args);
    for (const file of fileValues) {
      if (!fileArgs.has(file)) {
        fileArgs.set(file, []);
      }
      fileArgs.get(file)!.push(call.id);
    }
  }
  
  // Build dependency graph
  const dependentIds = new Set<string>();
  for (const [, callIds] of fileArgs) {
    if (callIds.length > 1) {
      callIds.forEach(id => dependentIds.add(id));
    }
  }
  
  const independent = calls.filter(c => !dependentIds.has(c.id));
  const dependent = calls.filter(c => dependentIds.has(c.id));
  
  // Simple parallelization: independent first, then dependent in order
  const parallelizable: ToolCall[][] = [];
  
  if (independent.length > 0) {
    // Batch independent calls (limited by context)
    const batch = independent.slice(0, 2); // Max 2 parallel
    parallelizable.push(batch);
    
    // Remaining independent
    if (independent.length > 2) {
      parallelizable.push(independent.slice(2));
    }
  }
  
  // Add dependent sequentially
  if (dependent.length > 0) {
    parallelizable.push(dependent);
  }
  
  return { independent, dependent, parallelizable };
}

/**
 * Extract file arguments from tool args
 */
function extractFileArgs(args: Record<string, any>): string[] {
  const files: string[] = [];
  
  const search = (obj: any): void => {
    if (!obj) return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase().includes('file') || key.toLowerCase().includes('path')) {
        if (typeof value === 'string') {
          files.push(value);
        }
      } else if (typeof value === 'object') {
        search(value);
      }
    }
  };
  
  search(args);
  return files;
}

/**
 * Create parallel batch with constraints
 */
export function createParallelBatch(
  calls: ToolCall[],
  options?: {
    maxParallel?: number;
    contextBudget?: number;
  }
): ParallelBatch {
  const maxParallel = Math.min(options?.maxParallel || 2, 3); // Hard limit to 3
  const contextBudget = options?.contextBudget || 3000;
  
  // Analyze dependencies
  const { independent, dependent, parallelizable } = analyzeDependencies(calls);
  
  // Create batch with parallelizable groups
  const batchCalls: ToolCall[] = [];
  
  // Add independent in parallel (limited)
  const parallelCalls = independent.slice(0, maxParallel);
  for (const call of parallelCalls) {
    batchCalls.push(call);
  }
  
  // Add dependent sequentially (already in order)
  for (const call of dependent) {
    batchCalls.push(call);
  }
  
  return {
    id: `batch_${Date.now()}`,
    calls: batchCalls,
    maxParallel,
    contextBudget
  };
}

/**
 * Execute tool with timeout
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    fn()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Execute parallel batch
 */
export async function executeParallelBatch(
  batch: ParallelBatch,
  executeTool: (name: string, args: Record<string, any>) => Promise<ToolResult>,
  options?: {
    maxLatency?: number;
  }
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];
  const maxLatency = options?.maxLatency || 30000;
  
  // Execute first batch in parallel (max 2-3)
  const parallelCalls = batch.calls.slice(0, batch.maxParallel);
  const parallelPromises = parallelCalls.map(async (call) => {
    const startTime = Date.now();
    try {
      const result = await executeWithTimeout(
        () => executeTool(call.name, call.args),
        maxLatency
      );
      return {
        id: call.id,
        success: result.success,
        result,
        latency: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        id: call.id,
        success: false,
        result: { success: false, error: error.message },
        latency: Date.now() - startTime
      };
    }
  });
  
  const parallelResults = await Promise.all(parallelPromises);
  results.push(...parallelResults);
  
  // Execute remaining sequentially
  const remainingCalls = batch.calls.slice(batch.maxParallel);
  for (const call of remainingCalls) {
    const startTime = Date.now();
    try {
      const result = await executeTool(call.name, call.args);
      results.push({
        id: call.id,
        success: result.success,
        result,
        latency: Date.now() - startTime
      });
    } catch (error: any) {
      results.push({
        id: call.id,
        success: false,
        result: { success: false, error: error.message },
        latency: Date.now() - startTime
      });
    }
  }
  
  return results;
}

/**
 * Estimate parallelization savings
 */
export function estimateParallelSavings(
  sequentialLatency: number,
  parallelCalls: number
): {
  estimatedParallel: number;
  savings: number;
  savingsPercent: number;
} {
  // In parallel, latency ≈ max of all calls, not sum
  // Assume average latency per call = sequentialLatency / parallelCalls
  const avgLatency = sequentialLatency / parallelCalls;
  const overhead = 200; // ms overhead for parallel coordination
  
  const estimatedParallel = avgLatency + overhead;
  const savings = sequentialLatency - estimatedParallel;
  const savingsPercent = Math.round((savings / sequentialLatency) * 100);
  
  return {
    estimatedParallel,
    savings,
    savingsPercent
  };
}

/**
 * Check if task is suitable for parallel execution
 */
export function isParallelSuitable(
  calls: ToolCall[]
): {
  suitable: boolean;
  reason: string;
  maxParallel: number;
} {
  if (calls.length < 2) {
    return { suitable: false, reason: 'Need at least 2 calls', maxParallel: 1 };
  }
  
  // Check for dependencies
  const { independent, dependent } = analyzeDependencies(calls);
  
  if (independent.length === 0) {
    return { suitable: false, reason: 'All calls are dependent', maxParallel: 1 };
  }
  
  if (dependent.length > independent.length) {
    return { suitable: false, reason: 'Too many dependencies', maxParallel: 1 };
  }
  
  // Check for dangerous combinations
  const dangerousCombinations = [
    ['create_file', 'delete_file'],
    ['shell', 'delete_file'],
    ['write_file', 'delete_file']
  ];
  
  const toolNames = calls.map(c => c.name);
  for (const danger of dangerousCombinations) {
    if (danger.every(t => toolNames.includes(t))) {
      return { suitable: false, reason: 'Dangerous combination detected', maxParallel: 1 };
    }
  }
  
  // Limit parallel based on count
  const maxParallel = Math.min(independent.length, 3);
  
  return {
    suitable: true,
    reason: `Can run ${maxParallel} calls in parallel`,
    maxParallel
  };
}
