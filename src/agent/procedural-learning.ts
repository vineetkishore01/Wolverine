/**
 * Procedural Learning System
 * 
 * Automatically learns from successful AND failed tool sequences and saves
 * them as reusable procedures in BrainDB.
 * 
 * Key insight: Small models benefit from remembering successful
 * patterns rather than figuring out everything from scratch.
 * 
 * ENHANCEMENT: Now learns from FAILURES too - tracks what NOT to do
 */

import { getBrainDB } from '../db/brain';

export interface ProcedureStep {
  order: number;
  tool: string;
  args: Record<string, any>;
  description: string;
}

export interface LearnedProcedure {
  id: string;
  name: string;
  trigger: string;
  steps: ProcedureStep[];
  successCount: number;
  failCount: number;
  lastUsed: number;
  createdAt: number;
}

export interface ToolSequence {
  toolCalls: Array<{
    tool: string;
    args: Record<string, any>;
    success: boolean;
  }>;
  task: string;
  timestamp: number;
}

/**
 * Track tool sequence for learning
 */
class SequenceTracker {
  private sequences: Map<string, ToolSequence> = new Map();
  private minSequenceLength = 2;
  private maxSequenceAge = 300000; // 5 minutes

  /**
   * Start tracking a new sequence for a session
   */
  startSequence(sessionId: string, task: string): void {
    this.sequences.set(sessionId, {
      toolCalls: [],
      task,
      timestamp: Date.now()
    });
  }

  /**
   * Record a tool call for a session
   */
  recordCall(sessionId: string, tool: string, args: Record<string, any>, success: boolean): void {
    let sequence = this.sequences.get(sessionId);
    if (!sequence) {
      this.startSequence(sessionId, '');
      sequence = this.sequences.get(sessionId)!;
    }

    sequence.toolCalls.push({
      tool,
      args,
      success
    });
  }

  /**
   * Get current sequence for a session (if valid)
   */
  getCurrentSequence(sessionId: string): ToolSequence | null {
    const sequence = this.sequences.get(sessionId);
    if (!sequence) return null;

    if (Date.now() - sequence.timestamp > this.maxSequenceAge) {
      this.sequences.delete(sessionId);
      return null;
    }

    return sequence;
  }

  /**
   * End and evaluate sequence for a session
   */
  endSequence(sessionId: string): ToolSequence | null {
    const sequence = this.sequences.get(sessionId);
    this.sequences.delete(sessionId);

    if (!sequence) return null;
    if (sequence.toolCalls.length < this.minSequenceLength) return null;

    return sequence;
  }

  /**
   * Clear current sequence for a session
   */
  clear(sessionId: string): void {
    this.sequences.delete(sessionId);
  }
}

/**
 * Analyze sequence for learning potential
 */
function analyzeForLearning(sequence: ToolSequence): {
  learnable: boolean;
  name: string;
  trigger: string;
  steps: ProcedureStep[];
  reason: string;
} {
  // All calls must be successful
  const allSuccess = sequence.toolCalls.every(c => c.success);
  const successRate = sequence.toolCalls.filter(c => c.success).length / sequence.toolCalls.length;

  if (!allSuccess && successRate < 0.7) {
    return {
      learnable: false,
      name: '',
      trigger: '',
      steps: [],
      reason: 'Low success rate'
    };
  }

  // Check for reusable patterns
  const hasFileOps = sequence.toolCalls.some(c =>
    ['create_file', 'write_file', 'edit_file', 'read_file'].includes(c.tool)
  );

  const hasShell = sequence.toolCalls.some(c =>
    ['run_command', 'shell'].includes(c.tool)
  );

  const hasWeb = sequence.toolCalls.some(c =>
    ['web_search', 'web_fetch'].includes(c.tool)
  );

  // Generate name from pattern
  let name = '';
  let trigger = '';

  if (hasFileOps && hasShell) {
    name = 'file_build_sequence';
    trigger = 'build|create file and run';
  } else if (hasFileOps) {
    name = 'file_operation_sequence';
    trigger = 'create|edit|write file';
  } else if (hasWeb) {
    name = 'research_sequence';
    trigger = 'search|research|find information';
  } else if (sequence.toolCalls.length >= 3) {
    name = `sequence_${sequence.toolCalls[0].tool}_${sequence.toolCalls.length}steps`;
    trigger = sequence.task.toLowerCase().slice(0, 50);
  } else {
    return {
      learnable: false,
      name: '',
      trigger: '',
      steps: [],
      reason: 'Not enough pattern to learn'
    };
  }

  // Convert to steps
  const steps: ProcedureStep[] = sequence.toolCalls.map((call, i) => ({
    order: i + 1,
    tool: call.tool,
    args: call.args,
    description: `Step ${i + 1}: Use ${call.tool}`
  }));

  return {
    learnable: true,
    name,
    trigger,
    steps,
    reason: 'Successful pattern detected'
  };
}

/**
 * NEW: Analyze failure sequence and extract what NOT to do
 * This is the "negative learning" - Wolverine learns from mistakes
 */
function analyzeForFailureLearning(sequence: ToolSequence): {
  learnable: boolean;
  name: string;
  trigger: string;
  steps: ProcedureStep[];
  errorPattern: string;
  alternativeApproach?: string;
} | null {
  // Must have at least one failure
  const hasFailure = sequence.toolCalls.some(c => !c.success);
  if (!hasFailure) return null;

  // Find the failing step
  const failedStepIndex = sequence.toolCalls.findIndex(c => !c.success);
  const failedStep = sequence.toolCalls[failedStepIndex];

  // Extract error type from the failure
  const errorContext = sequence.toolCalls
    .slice(Math.max(0, failedStepIndex - 1), failedStepIndex + 2)
    .map(c => c.success ? `OK: ${c.tool}` : `FAIL: ${c.tool}`)
    .join(' → ');

  // Generate what NOT to do name
  const name = `avoid_${failedStep.tool}_${sequence.toolCalls.length}steps`;
  const trigger = sequence.task.toLowerCase().slice(0, 50);

  // Steps showing the failure path
  const steps: ProcedureStep[] = sequence.toolCalls.map((call, i) => ({
    order: i + 1,
    tool: call.tool,
    args: call.args,
    description: `Step ${i + 1}: ${call.tool}${call.success ? ' (success)' : ' (FAILED)'}`
  }));

  return {
    learnable: true,
    name,
    trigger,
    steps,
    errorPattern: errorContext,
    alternativeApproach: `Avoid ${failedStep.tool} in this context. Consider alternative tools or check prerequisites first.`
  };
}

/**
 * NEW: Save failure pattern to memory (not procedures - failures aren't reusable procedures)
 */
async function saveFailureToMemory(sequence: ToolSequence, analysis: ReturnType<typeof analyzeForFailureLearning>): Promise<void> {
  if (!analysis) return;

  try {
    const brain = getBrainDB();

    const failedTools = sequence.toolCalls
      .filter(c => !c.success)
      .map(c => c.tool)
      .join(', ');

    const context = sequence.task.slice(0, 100);

    // Store as a memory with category "failure_pattern"
    await brain.upsertMemory({
      key: `failure:${analysis.name}:${Date.now()}`,
      content: `When trying to "${context}", avoid: ${analysis.errorPattern}. Alternative: ${analysis.alternativeApproach || 'Try different approach'}`,
      category: 'failure_pattern',
      importance: 0.8,
      source: 'system',
      scope: 'global'
    });

    console.log(`[ProceduralLearning] Saved failure pattern: ${analysis.name}`);
  } catch (error) {
    console.warn('[ProceduralLearning] Failed to save failure pattern:', error);
  }
}

/**
 * Procedural Learning Engine
 */
class ProceduralLearner {
  private tracker = new SequenceTracker();
  private brain = getBrainDB();
  private maxProcedures = 20;
  private learningEnabled = true;

  /**
   * Enable/disable learning
   */
  setEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  /**
   * Start tracking for a task in a session
   */
  startTracking(sessionId: string, task: string): void {
    if (!this.learningEnabled) return;
    this.tracker.startSequence(sessionId, task);
  }

  /**
   * Record tool execution for a session
   */
  recordTool(sessionId: string, tool: string, args: Record<string, any>, success: boolean): void {
    if (!this.learningEnabled) return;
    this.tracker.recordCall(sessionId, tool, args, success);
  }

  /**
   * End tracking and potentially learn for a session
   */
  async completeTask(sessionId: string, success: boolean): Promise<void> {
    if (!this.learningEnabled) return;

    const sequence = this.tracker.endSequence(sessionId);
    if (!sequence) return;

    // Evaluate and potentially save
    const analysis = analyzeForLearning(sequence);

    if (analysis.learnable) {
      await this.saveProcedure({
        name: analysis.name,
        trigger: analysis.trigger,
        steps: analysis.steps,
        success: success && sequence.toolCalls.every(c => c.success)
      });
    }

    // NEW: Also learn from failures
    if (!success) {
      const failureAnalysis = analyzeForFailureLearning(sequence);
      if (failureAnalysis) {
        await saveFailureToMemory(sequence, failureAnalysis);
      }
    }
  }

  /**
   * Save procedure to BrainDB
   */
  async saveProcedure(input: {
    name: string;
    trigger: string;
    steps: ProcedureStep[];
    success: boolean;
  }): Promise<void> {
    try {
      const brain = getBrainDB();

      // Check if procedure already exists
      const existing = brain.getProcedure(input.name);

      if (existing) {
        // Update existing
        const stepsJson = JSON.stringify(input.steps);
        await brain.saveProcedure({
          name: input.name,
          description: `Learned from ${input.steps.length} tool calls`,
          trigger_keywords: input.trigger,
          steps: stepsJson,
          created_by: 'system'
        });

        // Record result
        brain.recordProcedureResult(existing.id, input.success);
      } else {
        // Create new
        const stepsJson = JSON.stringify(input.steps);
        await brain.saveProcedure({
          name: input.name,
          description: `Auto-learned procedure with ${input.steps.length} steps`,
          trigger_keywords: input.trigger,
          steps: stepsJson,
          created_by: 'system'
        });
      }

      console.log(`[ProceduralLearning] Saved procedure: ${input.name}`);
    } catch (error) {
      console.warn('[ProceduralLearning] Failed to save procedure:', error);
    }
  }

  /**
   * Find matching procedure for task
   */
  async findProcedure(task: string): Promise<LearnedProcedure | null> {
    try {
      const brain = getBrainDB();
      const procedure = await brain.findProcedure(task);

      if (!procedure) return null;

      let steps: ProcedureStep[] = [];
      try {
        steps = JSON.parse(procedure.steps);
      } catch {
        // Ignore parse errors
      }

      return {
        id: procedure.id,
        name: procedure.name,
        trigger: procedure.trigger_keywords || '',
        steps,
        successCount: procedure.success_count,
        failCount: procedure.fail_count,
        lastUsed: procedure.last_used ? new Date(procedure.last_used).getTime() : 0,
        createdAt: new Date(procedure.created_at).getTime()
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all learned procedures
   */
  async getProcedures(): Promise<LearnedProcedure[]> {
    try {
      const brain = getBrainDB();
      const procedures = brain.listProcedures();

      return procedures.map(p => {
        let steps: ProcedureStep[] = [];
        try {
          steps = JSON.parse(p.steps);
        } catch {
          // Ignore
        }

        return {
          id: p.id,
          name: p.name,
          trigger: p.trigger_keywords || '',
          steps,
          successCount: p.success_count,
          failCount: p.fail_count,
          lastUsed: p.last_used ? new Date(p.last_used).getTime() : 0,
          createdAt: new Date(p.created_at).getTime()
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get procedure usage stats
   */
  async getStats(): Promise<{
    totalProcedures: number;
    successRate: number;
    mostUsed: LearnedProcedure | null;
  }> {
    const procedures = await this.getProcedures();

    if (procedures.length === 0) {
      return { totalProcedures: 0, successRate: 0, mostUsed: null };
    }

    let totalSuccess = 0;
    let totalUses = 0;
    let mostUsed = procedures[0];

    for (const p of procedures) {
      const uses = p.successCount + p.failCount;
      totalSuccess += p.successCount;
      totalUses += uses;

      if (uses > (mostUsed.successCount + mostUsed.failCount)) {
        mostUsed = p;
      }
    }

    return {
      totalProcedures: procedures.length,
      successRate: totalUses > 0 ? Math.round((totalSuccess / totalUses) * 100) : 0,
      mostUsed
    };
  }
}

// Singleton
let learner: ProceduralLearner | null = null;

export function getProceduralLearner(): ProceduralLearner {
  if (!learner) {
    learner = new ProceduralLearner();
  }
  return learner;
}

/**
 * Procedural learning system prompt
 */
export const PROCEDURAL_LEARNING_PROMPT = `
# Procedural Memory

You have access to a PROCEDURE SYSTEM that learns from successful tool sequences.

## How It Works

1. **Automatic Learning**: After successful task completion, the system may save your tool sequence as a reusable procedure.

2. **Trigger Matching**: When a new task matches a saved procedure trigger, you'll see it in context:
   ## Saved Procedure Triggered: file_build_sequence
   Steps:
   1. create_file → use tool: create_file
   2. shell → use tool: run_command

3. **Using Procedures**: When a procedure is triggered:
   - Follow the steps exactly
   - Adapt args to current task
   - Report success/failure at the end

## Important

- Procedures are OPTIONAL - you can ignore them and do tasks your way
- They're most useful for repeated patterns (creating components, running builds, etc.)
- The system learns from YOUR successful patterns, personalizing to your style
`;

/**
 * Format procedure for LLM context
 */
export function formatProcedure(procedure: LearnedProcedure): string {
  const stepsText = procedure.steps.map(s =>
    `${s.order}. ${s.description} → \`${s.tool}(${JSON.stringify(s.args).slice(0, 50)})\``
  ).join('\n');

  const successRate = procedure.successCount + procedure.failCount > 0
    ? Math.round((procedure.successCount / (procedure.successCount + procedure.failCount)) * 100)
    : 0;

  return `
## Learned Procedure: ${procedure.name}

**Trigger**: ${procedure.trigger}
**Success Rate**: ${successRate}% (${procedure.successCount}/${procedure.successCount + procedure.failCount})

### Steps
${stepsText}

*Follow this procedure for similar tasks. Report success/failure when complete.*
`.trim();
}
