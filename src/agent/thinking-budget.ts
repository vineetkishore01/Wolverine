/**
 * Thinking Budget System
 * 
 * Controls how much "thinking" the model does based on task complexity.
 * For small models, limiting thinking can improve performance.
 */

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface ThinkingBudget {
  level: ThinkingLevel;
  maxTokens: number;
  enabled: boolean;
}

export const THINKING_BUDGETS: Record<ThinkingLevel, ThinkingBudget> = {
  minimal: {
    level: 'minimal',
    maxTokens: 100,
    enabled: false
  },
  low: {
    level: 'low',
    maxTokens: 500,
    enabled: true
  },
  medium: {
    level: 'medium',
    maxTokens: 1500,
    enabled: true
  },
  high: {
    level: 'high',
    maxTokens: 4000,
    enabled: true
  }
};

/**
 * Determine appropriate thinking level based on task
 */
export function determineThinkingLevel(task: string): ThinkingLevel {
  const lower = task.toLowerCase();
  
  // Simple questions need minimal thinking
  if (lower.includes('what is') || lower.includes('how do') || lower.includes('show me')) {
    return 'minimal';
  }
  
  // Code tasks need more thinking
  if (lower.includes('create') || lower.includes('build') || lower.includes('implement')) {
    return 'medium';
  }
  
  // Complex refactoring needs high thinking
  if (lower.includes('refactor') || lower.includes('migrate') || lower.includes('architect')) {
    return 'high';
  }
  
  // Default to low for small models
  return 'low';
}

/**
 * Get thinking budget for a level
 */
export function getThinkingBudget(level?: ThinkingLevel): ThinkingBudget {
  return THINKING_BUDGETS[level || 'low'];
}

/**
 * Check if thinking should be enabled
 */
export function shouldEnableThinking(task: string, modelSize: 'small' | 'medium' | 'large' = 'small'): boolean {
  // Small models benefit from less thinking
  if (modelSize === 'small') {
    return false;  // Disable for small models
  }
  
  const level = determineThinkingLevel(task);
  return level !== 'minimal';
}

/**
 * Format thinking instruction for prompt
 */
export function formatThinkingInstruction(level: ThinkingLevel): string {
  const budget = THINKING_BUDGETS[level];
  
  if (!budget.enabled) {
    return '';
  }
  
  return `
Think step-by-step but be concise. Limit your reasoning to ${budget.maxTokens} tokens.
`.trim();
}
