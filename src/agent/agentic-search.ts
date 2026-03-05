/**
 * Agentic Search System
 * 
 * Implements Claude Code's approach: runtime search > pre-indexing
 * Tool hierarchy: glob → grep → read (cheapest to most expensive)
 * 
 * Key insight: Small models benefit from explicit search strategy
 * rather than trying to maintain vector embeddings.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getConfig } from '../config/config';

export interface SearchResult {
  type: 'glob' | 'grep' | 'read';
  query: string;
  results: string[];
  tokenCost: number;
  latency: number;
}

export interface SearchStrategy {
  approach: 'glob_first' | 'grep_first' | 'read_first' | 'hybrid';
  estimatedTokens: number;
  steps: SearchStep[];
}

export interface SearchStep {
  tool: 'glob' | 'grep' | 'read';
  args: Record<string, any>;
  reason: string;
}

export interface SearchContext {
  task: string;
  workspace: string;
  exploredFiles: Set<string>;
  findings: Map<string, string>;
}

/**
 * Analyze the search task and determine optimal strategy
 */
export function analyzeSearchStrategy(
  task: string,
  currentContext?: SearchContext
): SearchStrategy {
  const taskLower = task.toLowerCase();
  
  // Pattern: looking for files by extension/name
  if (/\b(find|locate|where).*\b(file|directory|folder|\*.|test|spec|src|lib)\b/i.test(task)) {
    return {
      approach: 'glob_first',
      estimatedTokens: 200,
      steps: [
        { tool: 'glob', args: { pattern: extractGlobPattern(task) }, reason: 'Find files by pattern' }
      ]
    };
  }
  
  // Pattern: looking for specific content (function, class, variable)
  if (/\b(find|search|look).*(for|where).*(function|class|variable|const|let|import|export|api|handler)\b/i.test(task)) {
    return {
      approach: 'grep_first',
      estimatedTokens: 400,
      steps: [
        { tool: 'grep', args: { pattern: extractGrepPattern(task) }, reason: 'Search for content' }
      ]
    };
  }
  
  // Pattern: understanding specific file
  if (/\b(read|look at|show|understand|explain).*\.(js|ts|py|md|json|yml|yaml)\b/i.test(task)) {
    return {
      approach: 'read_first',
      estimatedTokens: 600,
      steps: [
        { tool: 'read', args: { filename: extractFilePath(task) }, reason: 'Read specific file' }
      ]
    };
  }
  
  // Default: hybrid approach
  return {
    approach: 'hybrid',
    estimatedTokens: 500,
    steps: [
      { tool: 'glob', args: { pattern: '**/*' }, reason: 'Explore workspace structure' },
      { tool: 'grep', args: { pattern: extractGrepPattern(task) }, reason: 'Search content' }
    ]
  };
}

function extractGlobPattern(task: string): string {
  const match = task.match(/\*\.(\w+)|(\*\*\/)?[\w.-]+/);
  return match ? match[0] : '**/*';
}

function extractGrepPattern(task: string): string {
  const words = task.split(/\s+/).filter(w => w.length > 3);
  return words[0] || 'function|class|const';
}

function extractFilePath(task: string): string {
  const match = task.match(/[\w.-]+\.(js|ts|py|md|json|yml|yaml|tsx|jsx)/);
  return match ? match[0] : '';
}

/**
 * Execute search strategy with cost tracking
 */
export async function executeSearchStrategy(
  strategy: SearchStrategy,
  workspace: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  for (const step of strategy.steps) {
    const startTime = Date.now();
    
    try {
      let searchResults: string[] = [];
      
      switch (step.tool) {
        case 'glob':
          searchResults = await executeGlob(step.args.pattern, workspace);
          break;
        case 'grep':
          searchResults = await executeGrep(step.args.pattern, workspace, step.args.fileFilter);
          break;
        case 'read':
          searchResults = await executeRead(step.args.filename, workspace);
          break;
      }
      
      results.push({
        type: step.tool,
        query: JSON.stringify(step.args),
        results: searchResults,
        tokenCost: estimateTokenCost(step.tool, searchResults),
        latency: Date.now() - startTime
      });
    } catch (error) {
      results.push({
        type: step.tool,
        query: JSON.stringify(step.args),
        results: [`Error: ${error}`],
        tokenCost: 0,
        latency: Date.now() - startTime
      });
    }
  }
  
  return results;
}

async function executeGlob(pattern: string, workspace: string): Promise<string[]> {
  // Always use find command - more portable and no dependency
  try {
    const findPattern = pattern.replace(/\*\*/g, '*').replace(/\*/g, '*');
    // Build find command with exclusions
    let findCmd = `find . -name "${findPattern}" -type f`;
    // Exclude common directories
    const exclusions = ['node_modules', '.git', 'dist', 'build', '__pycache__'];
    for (const ex of exclusions) {
      findCmd += ` -not -path "*/${ex}/*" -not -path "./${ex}"`;
    }
    findCmd += ' 2>/dev/null';
    
    const output = execSync(findCmd, {
      cwd: workspace,
      encoding: 'utf-8',
      timeout: 5000
    });
    return output.split('\n').filter(Boolean).slice(0, 50);
  } catch {
    return [];
  }
}

async function executeGrep(pattern: string, workspace: string, fileFilter?: string): Promise<string[]> {
  try {
    const ext = fileFilter || '*';
    const output = execSync(
      `grep -r --include="${ext}" -l "${pattern}" . 2>/dev/null | head -30`,
      {
        cwd: workspace,
        encoding: 'utf-8',
        timeout: 5000
      }
    );
    return output.split('\n').filter(Boolean).slice(0, 30);
  } catch {
    return [];
  }
}

async function executeRead(filename: string, workspace: string): Promise<string[]> {
  const filepath = path.join(workspace, filename);
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n').slice(0, 100); // First 100 lines
    return [`${filename} (first 100 lines):`, ...lines];
  } catch {
    return [`Error: Cannot read ${filename}`];
  }
}

function estimateTokenCost(tool: string, results: string[]): number {
  const contentLength = results.join('\n').length;
  switch (tool) {
    case 'glob': return Math.ceil(contentLength / 4) * 0.1; // Cheap
    case 'grep': return Math.ceil(contentLength / 4) * 0.3; // Medium
    case 'read': return Math.ceil(contentLength / 4);        // Full cost
    default: return Math.ceil(contentLength / 4);
  }
}

/**
 * Format search results for LLM context
 */
export function formatSearchResults(results: SearchResult[]): string {
  const formatted: string[] = ['## Search Results'];
  
  for (const result of results) {
    formatted.push(`\n### ${result.type.toUpperCase()} (${result.tokenCost} tokens, ${result.latency}ms)`);
    formatted.push(`Query: ${result.query}`);
    
    if (result.results.length === 0) {
      formatted.push('No results found.');
    } else {
      formatted.push('---');
      formatted.push(result.results.slice(0, 20).join('\n'));
      if (result.results.length > 20) {
        formatted.push(`... and ${result.results.length - 20} more`);
      }
    }
  }
  
  const totalTokens = results.reduce((sum, r) => sum + r.tokenCost, 0);
  const totalLatency = results.reduce((sum, r) => sum + r.latency, 0);
  formatted.push(`\n**Total: ${totalTokens} tokens, ${totalLatency}ms**`);
  
  return formatted.join('\n');
}

/**
 * Agentic search system prompt for small models
 */
export const AGENTIC_SEARCH_PROMPT = `
# Agentic Search Strategy

You have access to a HIERARCHY of search tools. Use them in order from cheapest to most expensive:

## Tool Hierarchy

1. **GLOB** (50 tokens) - Fast pattern matching
   - Use for: file paths, extensions, directory structure
   - Example: "Find all TypeScript files" → glob("**/*.ts")
   
2. **GREP** (200 tokens) - Content search  
   - Use for: function names, variable usage, imports
   - Example: "Where is auth implemented?" → grep("authenticate|login")
   
3. **READ** (500 tokens) - Full file content
   - Use for: understanding specific files, reading implementations
   - Example: "Show me the main function" → read("src/main.ts")

## Strategy Rules

1. START with glob to find relevant files
2. USE grep to narrow down locations
3. READ only specific sections, never entire large files
4. ITERATE: search → observe → decide → repeat

## Bad Patterns (Avoid)

- Reading entire large files upfront
- Running multiple grep calls without analyzing results
- Not tracking what you've already explored

## Good Patterns

- Glob first to find file candidates
- Grep in specific files only
- Read with line limits (first 100 lines)
- Build understanding incrementally
`;

/**
 * Create initial search context for a task
 */
export function createSearchContext(task: string, workspace: string): SearchContext {
  return {
    task,
    workspace,
    exploredFiles: new Set(),
    findings: new Map()
  };
}
