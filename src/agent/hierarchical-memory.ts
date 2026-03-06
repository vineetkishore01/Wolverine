/**
 * Hierarchical Memory System
 * 
 * Implements layered memory retrieval for small models:
 * - Layer 0: System (SOUL, AGENTS, TOOLS, USER)
 * - Layer 1: Session (recent conversation)
 * - Layer 2: Working (scratchpad, task state)
 * - Layer 3: Semantic (facts from BrainDB)
 * - Layer 4: Episodic (past session summaries)
 * 
 * Each layer has different retrieval characteristics and token costs.
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config';
import { getBrainDB } from '../db/brain';
import { estimateTokens } from '../db/brain';

export type MemoryLayer = 0 | 1 | 2 | 3 | 4;

export interface MemoryLayerConfig {
  layer: MemoryLayer;
  name: string;
  maxTokens: number;
  alwaysInclude: boolean;
  retrievalMethod: 'file' | 'search' | 'recent' | 'scratchpad';
}

export const MEMORY_LAYERS: MemoryLayerConfig[] = [
  {
    layer: 0,
    name: 'System',
    maxTokens: 2000,
    alwaysInclude: true,
    retrievalMethod: 'file'
  },
  {
    layer: 1,
    name: 'Session',
    maxTokens: 1500,
    alwaysInclude: true,
    retrievalMethod: 'recent'
  },
  {
    layer: 2,
    name: 'Working',
    maxTokens: 500,
    alwaysInclude: false,
    retrievalMethod: 'scratchpad'
  },
  {
    layer: 3,
    name: 'Semantic',
    maxTokens: 800,
    alwaysInclude: false,
    retrievalMethod: 'search'
  },
  {
    layer: 4,
    name: 'Episodic',
    maxTokens: 600,
    alwaysInclude: false,
    retrievalMethod: 'search'
  }
];

export interface HierarchicalMemoryResult {
  layers: Map<MemoryLayer, string>;
  totalTokens: number;
  breakdown: Record<MemoryLayer, { tokens: number; source: string }>;
}

/**
 * Get Layer 0: System memory (files)
 */
async function getLayer0System(workspace: string): Promise<string> {
  const files = ['SOUL.md', 'AGENTS.md', 'TOOLS.md', 'USER.md', 'IDENTITY.md'];
  const parts: string[] = [];
  
  for (const file of files) {
    const filepath = path.join(workspace, file);
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8');
      parts.push(`## ${file}\n${content}`);
    }
  }
  
  return parts.join('\n\n');
}

/**
 * Get Layer 1: Session memory (recent messages)
 */
function getLayer1Session(
  sessionMessages: Array<{role: string, content: string}>,
  maxTokens: number
): string {
  const maxChars = maxTokens * 4;
  const recent = sessionMessages.slice(-10); // Last 10 messages
  const parts: string[] = [];
  let totalChars = 0;
  
  for (const msg of recent) {
    const msgStr = `[${msg.role}]: ${msg.content.slice(0, 300)}`;
    if (totalChars + msgStr.length > maxChars) break;
    parts.push(msgStr);
    totalChars += msgStr.length;
  }
  
  return parts.join('\n');
}

/**
 * Get Layer 2: Working memory (scratchpad)
 */
async function getLayer2Working(sessionId: string): Promise<string> {
  const brain = getBrainDB();
  
  try {
    const scratchpad = brain.getScratchpad(sessionId);
    if (scratchpad) {
      return `## Scratchpad\n${scratchpad}`;
    }
  } catch {
    // DB not ready
  }
  
  // Try file-based scratchpad
  const config = getConfig();
  const workspace = config.getWorkspacePath();
  const scratchpadPath = path.join(workspace, '.scratchpad', `${sessionId}.md`);
  
  if (fs.existsSync(scratchpadPath)) {
    return `## Scratchpad\n${fs.readFileSync(scratchpadPath, 'utf-8').slice(0, 2000)}`;
  }
  
  return '';
}

/**
 * Get Layer 3: Semantic memory (facts from BrainDB)
 */
async function getLayer3Semantic(query: string): Promise<string> {
  const brain = getBrainDB();
  
  try {
    const memories = brain.searchMemories(query, { max: 5, scope: 'global' });
    
    if (memories.length === 0) return '';
    
    const facts = memories.map(m => `- ${m.content}`).join('\n');
    return `## Relevant Facts\n${facts}`;
  } catch {
    return '';
  }
}

/**
 * Get Layer 4: Episodic memory (past sessions)
 */
async function getLayer4Episodic(workspace: string, limit: number = 3): Promise<string> {
  const sessionsDir = path.join(workspace, 'sessions');
  
  if (!fs.existsSync(sessionsDir)) return '';
  
  try {
    const files = fs.readdirSync(sessionsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .slice(-limit);
    
    const episodes: string[] = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8');
        const session = JSON.parse(content);
        
        if (session.summary || session.lastMessage) {
          episodes.push(`- ${file.replace('.json', '')}: ${session.summary || session.lastMessage?.slice(0, 100)}`);
        }
      } catch {
        // Skip invalid files
      }
    }
    
    if (episodes.length === 0) return '';
    return `## Past Sessions\n${episodes.join('\n')}`;
  } catch {
    return '';
  }
}

/**
 * Main function: Get hierarchical memory for a query
 */
export async function getHierarchicalMemory(
  query: string,
  sessionId: string,
  sessionMessages: Array<{role: string, content: string}>,
  options?: {
    maxTotalTokens?: number;
    includeLayers?: MemoryLayer[];
  }
): Promise<HierarchicalMemoryResult> {
  const config = getConfig();
  const workspace = config.getWorkspacePath();
  const maxTotal = options?.maxTotalTokens || 5000;
  const includeLayers = options?.includeLayers || [0, 1, 2, 3, 4];
  
  const layers = new Map<MemoryLayer, string>();
  const breakdown: Record<MemoryLayer, { tokens: number; source: string }> = {} as any;
  let usedTokens = 0;
  
  for (const layerConfig of MEMORY_LAYERS) {
    if (!includeLayers.includes(layerConfig.layer)) continue;
    if (usedTokens >= maxTotal) break;
    
    const remainingTokens = maxTotal - usedTokens;
    const layerMax = Math.min(layerConfig.maxTokens, remainingTokens);
    
    let content = '';
    let source = '';
    
    switch (layerConfig.layer) {
      case 0:
        content = await getLayer0System(workspace);
        source = 'workspace files';
        break;
        
      case 1:
        content = getLayer1Session(sessionMessages, layerMax);
        source = 'current session';
        break;
        
      case 2:
        content = await getLayer2Working(sessionId);
        source = 'scratchpad';
        break;
        
      case 3:
        content = await getLayer3Semantic(query);
        source = 'BrainDB search';
        break;
        
      case 4:
        content = await getLayer4Episodic(workspace);
        source = 'past sessions';
        break;
    }
    
    if (content) {
      const tokens = estimateTokens(content);
      layers.set(layerConfig.layer, content);
      breakdown[layerConfig.layer] = { tokens, source };
      usedTokens += tokens;
    }
  }
  
  return {
    layers,
    totalTokens: usedTokens,
    breakdown
  };
}

/**
 * Write to scratchpad (Layer 2)
 */
export async function writeScratchpad(
  sessionId: string,
  content: string
): Promise<void> {
  const brain = getBrainDB();
  
  try {
    brain.writeScratchpad(sessionId, content);
  } catch {
    // Fallback to file
    const config = getConfig();
    const workspace = config.getWorkspacePath();
    const scratchpadDir = path.join(workspace, '.scratchpad');
    
    fs.mkdirSync(scratchpadDir, { recursive: true });
    fs.writeFileSync(
      path.join(scratchpadDir, `${sessionId}.md`),
      content,
      'utf-8'
    );
  }
}

/**
 * Format hierarchical memory for LLM context
 */
export function formatHierarchicalMemory(result: HierarchicalMemoryResult): string {
  const parts: string[] = ['# Context from Memory Layers'];
  
  const layerNames: Record<MemoryLayer, string> = {
    0: 'System',
    1: 'Session',
    2: 'Working',
    3: 'Semantic',
    4: 'Episodic'
  };
  
  for (const [layer, content] of result.layers) {
    if (!content) continue;
    parts.push(`\n## ${layerNames[layer]} (${result.breakdown[layer]?.tokens || 0} tokens)`);
    parts.push(content);
  }
  
  parts.push(`\n---\n**Total: ${result.totalTokens} tokens**`);
  
  return parts.join('\n');
}

/**
 * Quick memory retrieval for simple queries
 */
export async function quickMemoryRetrieve(
  query: string,
  sessionId: string
): Promise<{ facts: string; scratchpad: string; totalTokens: number }> {
  const brain = getBrainDB();
  
  // Get semantic facts
  let facts = '';
  let factTokens = 0;
  try {
    const memories = brain.searchMemories(query, { max: 3, scope: 'global' });
    if (memories.length > 0) {
      facts = memories.map(m => `- ${m.content}`).join('\n');
      factTokens = estimateTokens(facts);
    }
  } catch {
    // Ignore
  }
  
  // Get scratchpad
  let scratchpad = '';
  let scratchpadTokens = 0;
  try {
    scratchpad = brain.getScratchpad(sessionId) || '';
    scratchpadTokens = estimateTokens(scratchpad);
  } catch {
    // Ignore
  }
  
  return {
    facts,
    scratchpad,
    totalTokens: factTokens + scratchpadTokens
  };
}
