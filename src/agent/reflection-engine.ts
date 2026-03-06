/**
 * Reflection Engine
 * 
 * Wolverine's self-reflection system - it thinks about thinking.
 * Called after each task to analyze what worked, what didn't, and how to improve.
 * 
 * This is a KEY AGI feature - continuous self-improvement through reflection.
 */

import { getBrainDB } from '../db/brain';
import { estimateTokens } from '../db/brain';

export interface Reflection {
  id: string;
  task: string;
  success: boolean;
  toolCount: number;
  toolSequence: string[];
  analysis: string;
  improvements: string[];
  timestamp: number;
}

/**
 * Perform reflection after task completion
 * This is Wolverine "thinking about thinking" - the core of self-awareness
 */
export async function reflectOnTask(
  task: string,
  toolSequence: Array<{ tool: string; args: any; success: boolean; error?: string }>,
  finalResult: string,
  success: boolean
): Promise<Reflection> {
  const brain = getBrainDB();
  
  // Analyze the execution
  const toolNames = toolSequence.map(t => t.tool);
  const failedTools = toolSequence.filter(t => !t.success).map(t => t.tool);
  const successCount = toolSequence.filter(t => t.success).length;
  
  // Generate reflection analysis
  let analysis = '';
  const improvements: string[] = [];
  
  if (success) {
    analysis = `Task completed successfully using ${successCount} tools.`;
    
    // What worked well?
    if (toolSequence.length > 5) {
      improvements.push('Complex task completed - consider breaking into smaller steps next time');
    }
    if (successCount > 0) {
      improvements.push(`Effective use of ${toolNames[0]} as starting point`);
    }
  } else {
    analysis = `Task failed. ${failedTools.length} tool(s) failed: ${failedTools.join(', ')}`;
    
    // What went wrong?
    for (const failed of toolSequence.filter(t => !t.success)) {
      if (failed.error) {
        if (failed.error.includes('not found')) {
          improvements.push(`Check if ${failed.tool} was the right tool - alternative may be needed`);
        }
        if (failed.error.includes('permission')) {
          improvements.push(`Verify permissions before attempting ${failed.tool}`);
        }
        if (failed.error.includes('timeout')) {
          improvements.push(`Consider breaking ${failed.tool} into smaller operations`);
        }
      }
    }
    
    // General improvements for failure
    if (toolSequence.length > 3) {
      improvements.push('Too many steps - try a simpler approach');
    }
    if (failedTools.length > 1) {
      improvements.push('Multiple failures - verify prerequisites before starting');
    }
  }
  
  const reflection: Reflection = {
    id: `ref_${Date.now()}`,
    task: task.slice(0, 100),
    success,
    toolCount: toolSequence.length,
    toolSequence: toolNames,
    analysis,
    improvements,
    timestamp: Date.now()
  };
  
  // Save reflection to memory
  try {
    await brain.upsertMemory({
      key: `reflection:${reflection.id}`,
      content: `Task: ${reflection.task}\nSuccess: ${reflection.success}\nTools: ${reflection.toolSequence.join(' → ')}\nAnalysis: ${reflection.analysis}\nImprovements: ${improvements.join('; ')}`,
      category: 'reflection',
      importance: success ? 0.5 : 0.8, // Learn more from failures
      source: 'system',
      scope: 'global'
    });
    
    console.log(`[Reflection] Saved: ${reflection.success ? 'SUCCESS' : 'FAILURE'} - ${reflection.analysis}`);
  } catch (error) {
    console.warn('[Reflection] Failed to save:', error);
  }
  
  return reflection;
}

/**
 * Get recent reflections for context
 */
export async function getRecentReflections(limit: number = 5): Promise<Reflection[]> {
  const brain = getBrainDB();
  
  try {
    const memories = brain.searchMemories('reflection', { 
      max: limit, 
      category: 'reflection',
      scope: 'global' 
    });
    
    return memories.map(m => {
      const lines = m.content.split('\n');
      return {
        id: m.id,
        task: lines[0]?.replace('Task: ', '') || '',
        success: lines[1]?.includes('true') || false,
        toolCount: 0,
        toolSequence: [],
        analysis: lines[2] || '',
        improvements: [],
        timestamp: new Date(m.created_at).getTime()
      };
    });
  } catch {
    return [];
  }
}

/**
 * Format reflection for LLM context
 */
export function formatReflectionContext(reflections: Reflection[]): string {
  if (reflections.length === 0) return '';
  
  const parts = ['## Recent Reflections'];
  
  for (const r of reflections.slice(0, 3)) {
    parts.push(`\n**${r.success ? '✅' : '❌'}** ${r.task}`);
    parts.push(r.analysis);
    if (r.improvements.length > 0) {
      parts.push(`Insights: ${r.improvements.join('; ')}`);
    }
  }
  
  return parts.join('\n');
}
