/**
 * Basic Planning Mode
 * 
 * Implements simple plan-then-execute workflow for small models.
 * Limited to 2-3 step plans due to model reasoning constraints.
 * 
 * Key insight: Small models excel at simple plans but struggle with
 * complex multi-step reasoning. This provides structure without overwhelming.
 */

export type ExecutionMode = 'interactive' | 'plan' | 'execute';

export interface PlanStep {
  order: number;
  action: string;
  tool?: string;
  args?: Record<string, any>;
  reason: string;
}

export interface Plan {
  id: string;
  task: string;
  steps: PlanStep[];
  estimatedSteps: number;
  createdAt: number;
  approved: boolean;
  completed: boolean;
}

export interface PlanResult {
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  results: string[];
  errors: string[];
}

/**
 * Create a new plan
 */
export function createPlan(task: string): Plan {
  return {
    id: `plan_${Date.now()}`,
    task,
    steps: [],
    estimatedSteps: 0,
    createdAt: Date.now(),
    approved: false,
    completed: false
  };
}

/**
 * Parse simple plan from model response
 */
export function parseSimplePlan(modelResponse: string): PlanStep[] {
  const steps: PlanStep[] = [];
  const lines = modelResponse.split('\n');
  
  let currentOrder = 1;
  
  for (const line of lines) {
    // Match numbered lists: "1. do something"
    const numberedMatch = line.match(/^(\d+)[.)]\s*(.+)/);
    // Match bullet points: "- do something" or "* do something"
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    // Match action verbs
    const actionMatch = line.match(/(read|write|edit|create|delete|run|execute|search|fetch|list|make|build|check|find|go|navigate|open|close|click|type|submit)/i);
    
    let action = '';
    
    if (numberedMatch) {
      action = numberedMatch[2].trim();
      currentOrder = parseInt(numberedMatch[1], 10);
    } else if (bulletMatch) {
      action = bulletMatch[1].trim();
    } else if (actionMatch) {
      action = line.trim();
    }
    
    if (action && action.length > 5 && action.length < 100) {
      steps.push({
        order: currentOrder++,
        action,
        reason: 'From plan'
      });
    }
  }
  
  return steps.slice(0, 5); // Limit to 5 steps max
}

/**
 * Validate plan feasibility
 */
export function validatePlan(plan: Plan): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (plan.steps.length === 0) {
    issues.push('Plan has no steps');
  }
  
  if (plan.steps.length > 5) {
    issues.push('Plan has too many steps (max 5 for small models)');
  }
  
  // Check for vague steps
  for (const step of plan.steps) {
    const vaguePatterns = [
      /^(do|make|get|have|try)\s+/i,
      /^(something|anything|everything)/i,
      /^figure out$/i,
      /^work on$/i
    ];
    
    if (vaguePatterns.some(p => p.test(step.action))) {
      issues.push(`Step "${step.order}" is too vague: "${step.action}"`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Planning mode system prompt
 */
export const PLANNING_MODE_PROMPT = `
# Planning Mode

You are in PLANNING MODE. Your goal is to create a simple, actionable plan.

## Guidelines

1. **Keep it Simple**: Maximum 3-5 steps
2. **Be Specific**: Each step should be a concrete action
3. **Think in Order**: Steps should execute sequentially
4. **Tool-Focused**: Reference tools when relevant

## Good Plan Examples

Example 1:
1. Read the main.py file to understand current structure
2. Create a new utils.py with helper functions
3. Run the tests to verify it works

Example 2:
1. Search for authentication functions
2. Read the auth.py file
3. Add JWT validation to the login endpoint
4. Test with a sample request

## Bad Plan Examples

- "Do something with the code" (too vague)
- "Figure out what to do" (no plan)
- 10+ steps (too complex for small model)

## Output Format

Return your plan as a numbered list, one step per line.
Keep each step under 15 words.
Start with action verbs: Read, Create, Write, Edit, Run, Search, etc.
`;

/**
 * Execution mode system prompt
 */
export const EXECUTE_MODE_PROMPT = `
# Execute Mode

You have an APPROVED PLAN. Execute it step by step.

## Rules

1. Follow the plan exactly, in order
2. Complete one step before starting the next
3. Report progress after each step
4. If a step fails, stop and explain the issue
5. When complete, summarize what was done

## Plan Format

You should see:
## Plan
1. Step one
2. Step two
3. Step three

Execute in order, reporting results.
`;

/**
 * Format plan for display
 */
export function formatPlan(plan: Plan): string {
  const header = `## Plan: ${plan.task}\n`;
  
  const steps = plan.steps.map(s => 
    `${s.order}. ${s.action}${s.tool ? ` [\`${s.tool}\`]` : ''}`
  ).join('\n');
  
  const status = plan.approved ? '✅ Approved' : '⏳ Awaiting Approval';
  const footer = `\n---\n**Status**: ${status} | **Progress**: ${plan.steps.filter(s => s.order <= (plan as any).completedSteps || 0).length}/${plan.steps.length}`;
  
  return header + steps + footer;
}

/**
 * Plan execution state machine
 */
export class PlanExecutor {
  private currentPlan: Plan | null = null;
  private currentStepIndex = 0;
  
  /**
   * Start new plan
   */
  startPlan(task: string): Plan {
    this.currentPlan = createPlan(task);
    this.currentStepIndex = 0;
    return this.currentPlan;
  }
  
  /**
   * Set plan steps
   */
  setSteps(steps: PlanStep[]): void {
    if (!this.currentPlan) return;
    this.currentPlan.steps = steps;
    this.currentPlan.estimatedSteps = steps.length;
  }
  
  /**
   * Approve plan
   */
  approve(): void {
    if (!this.currentPlan) return;
    this.currentPlan.approved = true;
  }
  
  /**
   * Get current step
   */
  getCurrentStep(): PlanStep | null {
    if (!this.currentPlan) return null;
    if (this.currentStepIndex >= this.currentPlan.steps.length) return null;
    return this.currentPlan.steps[this.currentStepIndex];
  }
  
  /**
   * Advance to next step
   */
  nextStep(): PlanStep | null {
    if (!this.currentPlan) return null;
    this.currentStepIndex++;
    
    if (this.currentStepIndex >= this.currentPlan.steps.length) {
      this.currentPlan.completed = true;
    }
    
    return this.getCurrentStep();
  }
  
  /**
   * Check if plan is complete
   */
  isComplete(): boolean {
    return this.currentPlan?.completed || false;
  }
  
  /**
   * Get progress
   */
  getProgress(): { current: number; total: number; percent: number } {
    if (!this.currentPlan) {
      return { current: 0, total: 0, percent: 0 };
    }
    
    return {
      current: this.currentStepIndex,
      total: this.currentPlan.steps.length,
      percent: Math.round((this.currentStepIndex / this.currentPlan.steps.length) * 100)
    };
  }
  
  /**
   * Get current plan
   */
  getPlan(): Plan | null {
    return this.currentPlan;
  }
  
  /**
   * Cancel plan
   */
  cancel(): void {
    this.currentPlan = null;
    this.currentStepIndex = 0;
  }
}

/**
 * Quick check if task needs planning
 */
export function needsPlanning(task: string): {
  needed: boolean;
  reason: string;
} {
  const taskLower = task.toLowerCase();
  
  // Simple heuristics
  const complexIndicators = [
    /refactor/i,
    /migrate/i,
    /implement.*feature/i,
    /build.*system/i,
    /create.*app/i,
    /multiple.*file/i,
    /research.*and.*then/i,
    /plan.*first/i
  ];
  
  const simpleIndicators = [
    /what is/i,
    /how do/i,
    /show me/i,
    /read.*file/i,
    /simple/i,
    /quick/i,
    /just/i
  ];
  
  for (const pattern of complexIndicators) {
    if (pattern.test(task)) {
      return { needed: true, reason: 'Complex task detected' };
    }
  }
  
  for (const pattern of simpleIndicators) {
    if (pattern.test(task)) {
      return { needed: false, reason: 'Simple task - direct execution' };
    }
  }
  
  // Default: no planning for unknown
  return { needed: false, reason: 'Task unclear - use judgment' };
}
