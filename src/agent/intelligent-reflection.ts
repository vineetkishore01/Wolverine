/**
 * intelligent-reflection.ts
 * 
 * Wolverine's 2070 Protocol Self-Reflection System
 * 
 * After each reflection cycle, Wolverine makes a BINARY DECISION:
 * SHOULD I NOTIFY MY HUMAN? YES / NO
 * 
 * Decision criteria:
 * 1. Failure Analysis → YES (with recovery proposal)
 * 2. Pattern Recognition (3+ occurrences) → YES (with automation proposal)
 * 3. Breakthrough Discovery → YES (with impact assessment)
 * 4. Skill Creation Opportunity → YES (with benefit analysis)
 * 5. Routine Success → NO (log only)
 * 6. Minor Self-Corrected Issues → NO (log only)
 */

import fs from 'fs';
import path from 'path';
import { getBrainDB } from '../db/brain';
import { getConfig } from '../config/config';

export interface ReflectionEvent {
  type: 'failure_analysis' | 'pattern_insight' | 'breakthrough' | 'skill_creation' | 'routine_success';
  timestamp: number;
  summary: string;
  description: string;
  analysis?: string;
  proposal?: ReflectionProposal;
  shouldNotify: boolean;
  notificationReason?: string;
}

export interface ReflectionProposal {
  type: 'retry_alternative' | 'create_automation' | 'investigate_further' | 'create_skill';
  title: string;
  description: string;
  options: ProposalOption[];
  recommendedOption?: number;
}

export interface ProposalOption {
  id: number;
  label: string;
  description: string;
  confidence?: number;
  estimatedTime?: string;
}

export interface NotificationDecision {
  shouldNotify: boolean;
  reason: string;
  channel: 'telegram' | 'web_ui' | 'both' | 'none';
  priority: 'critical' | 'significant' | 'routine';
  event: ReflectionEvent;
}

/**
 * Main reflection cycle - runs after heartbeat or significant task
 */
export async function performIntelligentReflection(
  context: ReflectionContext
): Promise<NotificationDecision> {
  console.log('[Intelligent Reflection] Starting reflection cycle...');

  const brain = getBrainDB();
  const workspacePath = getConfig().getWorkspacePath();

  // Load SELF_REFLECT.md guidelines
  const reflectionGuidelines = loadReflectionGuidelines(workspacePath);

  // Analyze based on context type
  let event: ReflectionEvent;

  if (context.type === 'post_heartbeat') {
    event = await analyzeHeartbeatResults(context, reflectionGuidelines);
  } else if (context.type === 'post_failure') {
    event = await analyzeFailure(context, reflectionGuidelines);
  } else if (context.type === 'pattern_detected') {
    event = await analyzePattern(context, reflectionGuidelines);
  } else {
    event = await analyzeGeneralReflection(context, reflectionGuidelines);
  }

  // Make binary notification decision
  const decision = makeNotificationDecision(event, reflectionGuidelines);

  // Log reflection (whether notifying or not)
  logReflectionToMemory(event, brain);

  console.log(`[Intelligent Reflection] Decision: ${decision.shouldNotify ? 'NOTIFY' : 'NO_NOTIFY'} - ${decision.reason}`);

  return decision;
}

export interface ReflectionContext {
  type: 'post_heartbeat' | 'post_failure' | 'pattern_detected' | 'general';
  sessionId: string;
  message?: string;
  taskResult?: {
    success: boolean;
    toolResults: any[];
    errors: string[];
    duration: number;
  };
  patternData?: {
    requestType: string;
    occurrences: number;
    daysObserved: number;
    lastOccurrences: Date[];
  };
  introspectionData?: {
    learnings: string[];
    improvements: string[];
    gaps_identified: string[];
  };
}

/**
 * Load SELF_REFLECT.md guidelines from workspace
 */
function loadReflectionGuidelines(workspacePath: string): string {
  const reflectionFile = path.join(workspacePath, 'SELF_REFLECT.md');
  try {
    if (fs.existsSync(reflectionFile)) {
      return fs.readFileSync(reflectionFile, 'utf-8').slice(0, 8000); // First 8k chars
    }
  } catch {
    // Ignore
  }
  return ''; // Use defaults if file not found
}

/**
 * Analyze heartbeat results
 */
async function analyzeHeartbeatResults(
  context: ReflectionContext,
  guidelines: string
): Promise<ReflectionEvent> {
  const intro = context.introspectionData;

  if (!intro || (intro.learnings.length === 0 && intro.improvements.length === 0)) {
    // Routine heartbeat - nothing significant
    return {
      type: 'routine_success',
      timestamp: Date.now(),
      summary: 'Routine heartbeat - all systems nominal',
      description: 'No significant issues or patterns detected',
      shouldNotify: false,
    };
  }

  // Check if any learning is significant
  const significantKeywords = ['critical', 'warning', 'error', 'security', 'breakthrough', 'failed', 'discovered'];
  const hasSignificantLearning = intro.learnings.some(l =>
    significantKeywords.some(kw => l.toLowerCase().includes(kw))
  ) || intro.learnings.some(l => l.length > 200); // Substantive learning

  if (hasSignificantLearning) {
    return {
      type: 'breakthrough',
      timestamp: Date.now(),
      summary: 'Significant learning from heartbeat',
      description: intro.learnings.join('\n'),
      analysis: 'This learning may impact future operations',
      shouldNotify: true,
      notificationReason: 'Significant learning discovered',
    };
  }

  return {
    type: 'routine_success',
    timestamp: Date.now(),
    summary: 'Routine heartbeat completed',
    description: intro.learnings.join('\n'),
    shouldNotify: false,
  };
}

/**
 * Analyze failure - generate recovery proposal
 */
async function analyzeFailure(
  context: ReflectionContext,
  guidelines: string
): Promise<ReflectionEvent> {
  const errors = context.taskResult?.errors || [];
  const toolResults = context.taskResult?.toolResults || [];

  // Analyze what failed
  const failedTools = toolResults.filter(r => r.error).map(r => ({
    tool: r.name,
    error: r.result,
    args: r.args,
  }));

  // Generate alternative approaches
  const alternatives = generateAlternativeApproaches(failedTools);

  return {
    type: 'failure_analysis',
    timestamp: Date.now(),
    summary: `Failed to complete: ${context.message?.slice(0, 80) || 'task'}`,
    description: `Failed steps: ${failedTools.map(f => f.tool).join(', ')}`,
    analysis: errors.join('\n'),
    proposal: {
      type: 'retry_alternative',
      title: 'Recovery Proposal',
      description: 'Alternative approaches to complete the task',
      options: alternatives.map((alt, i) => ({
        id: i + 1,
        label: alt.title,
        description: alt.description,
        confidence: alt.confidence,
      })),
      recommendedOption: 0,
    },
    shouldNotify: true,
    notificationReason: 'Task failure requires user decision on recovery approach',
  };
}

/**
 * Analyze pattern - propose automation
 */
async function analyzePattern(
  context: ReflectionContext,
  guidelines: string
): Promise<ReflectionEvent> {
  const pattern = context.patternData!;

  // Design automation solution
  const automationProposal = designAutomation(pattern);

  return {
    type: 'pattern_insight',
    timestamp: Date.now(),
    summary: `Pattern detected: ${pattern.requestType} (${pattern.occurrences}x in ${pattern.daysObserved}d)`,
    description: `You've requested "${pattern.requestType}" ${pattern.occurrences} times over ${pattern.daysObserved} days`,
    analysis: 'This repetitive task could be automated',
    proposal: {
      type: 'create_automation',
      title: 'Automation Proposal',
      description: automationProposal.description,
      options: [
        {
          id: 1,
          label: 'Create Daily Cron Job',
          description: `Run automatically at ${automationProposal.suggestedTime}`,
          confidence: 85,
          estimatedTime: '5 minutes to set up',
        },
        {
          id: 2,
          label: 'Create Reusable Skill',
          description: 'On-demand execution when you ask',
          confidence: 90,
          estimatedTime: '3 minutes to set up',
        },
        {
          id: 3,
          label: 'Not Needed',
          description: 'Continue manual execution',
          confidence: 50,
        },
      ],
      recommendedOption: 0,
    },
    shouldNotify: true,
    notificationReason: 'Repeated pattern detected - automation could save time',
  };
}

/**
 * General reflection for other cases
 */
async function analyzeGeneralReflection(
  context: ReflectionContext,
  guidelines: string
): Promise<ReflectionEvent> {
  // Default: routine reflection
  return {
    type: 'routine_success',
    timestamp: Date.now(),
    summary: 'Reflection cycle complete',
    description: 'No significant events to report',
    shouldNotify: false,
  };
}

/**
 * Generate alternative approaches for failed tasks
 */
function generateAlternativeApproaches(failedTools: Array<{ tool: string; error: string; args: any }>): Array<{
  title: string;
  description: string;
  confidence: number;
}> {
  const alternatives: Array<{ title: string; description: string; confidence: number }> = [];

  for (const failed of failedTools) {
    const error = failed.error.toLowerCase();

    if (error.includes('not found') || error.includes('enoent')) {
      alternatives.push({
        title: 'Check Alternative Paths',
        description: `Search for the file in workspace or create it first`,
        confidence: 75,
      });
    } else if (error.includes('permission') || error.includes('denied')) {
      alternatives.push({
        title: 'Use Different Path or Sudo',
        description: `Try workspace directory or elevate permissions`,
        confidence: 60,
      });
    } else if (error.includes('timeout')) {
      alternatives.push({
        title: 'Retry with Smaller Scope',
        description: `Break into smaller chunks with retries`,
        confidence: 70,
      });
    } else if (error.includes('network') || error.includes('api')) {
      alternatives.push({
        title: 'Check Configuration & Retry',
        description: `Verify API keys and network connectivity`,
        confidence: 80,
      });
    } else {
      alternatives.push({
        title: 'Manual Investigation Required',
        description: `Error requires human review before retry`,
        confidence: 50,
      });
    }
  }

  return alternatives;
}

/**
 * Design automation for repeated pattern
 */
function designAutomation(pattern: { requestType: string; occurrences: number }): {
  description: string;
  suggestedTime: string;
} {
  const requestType = pattern.requestType.toLowerCase();

  // Detect type of automation
  if (requestType.includes('current affair') || requestType.includes('news') || requestType.includes('upsc')) {
    return {
      description: 'Daily current affairs briefing from multiple sources',
      suggestedTime: '8:00 AM daily',
    };
  } else if (requestType.includes('github') || requestType.includes('repo')) {
    return {
      description: 'GitHub repository monitoring and update notifications',
      suggestedTime: 'Every 6 hours',
    };
  } else if (requestType.includes('search') || requestType.includes('research')) {
    return {
      description: 'Automated research compilation on specified topics',
      suggestedTime: 'Daily at 9:00 AM',
    };
  }

  return {
    description: `Automated execution of: ${pattern.requestType}`,
    suggestedTime: 'Daily at 9:00 AM',
  };
}

/**
 * Make binary notification decision
 */
function makeNotificationDecision(
  event: ReflectionEvent,
  guidelines: string
): NotificationDecision {
  // Load notification preferences from config
  const config = getConfig().getConfig() as any;
  const notifyOnFailure = config.self_reflection?.notify_on?.failure_analysis ?? true;
  const notifyOnPattern = config.self_reflection?.notify_on?.pattern_insight ?? true;
  const notifyOnBreakthrough = config.self_reflection?.notify_on?.breakthrough ?? true;
  const notifyOnSkill = config.self_reflection?.notify_on?.skill_creation ?? true;
  const notifyOnRoutine = config.self_reflection?.notify_on?.routine_success ?? false;

  // Binary decision based on event type and preferences
  let shouldNotify = false;
  let reason = '';
  let priority: 'critical' | 'significant' | 'routine' = 'routine';

  switch (event.type) {
    case 'failure_analysis':
      shouldNotify = notifyOnFailure;
      reason = 'Task failure with recovery proposal';
      priority = 'significant';
      break;

    case 'pattern_insight':
      shouldNotify = notifyOnPattern;
      reason = 'Repeated pattern detected - automation opportunity';
      priority = 'significant';
      break;

    case 'breakthrough':
      shouldNotify = notifyOnBreakthrough;
      reason = 'Significant discovery or learning';
      priority = 'critical';
      break;

    case 'skill_creation':
      shouldNotify = notifyOnSkill;
      reason = 'New capability created from successful pattern';
      priority = 'significant';
      break;

    case 'routine_success':
      shouldNotify = notifyOnRoutine;
      reason = 'Routine completion';
      priority = 'routine';
      break;
  }

  // Determine channel
  const channel: 'telegram' | 'web_ui' | 'both' | 'none' = 
    shouldNotify ? 'both' : 'none';

  return {
    shouldNotify,
    reason,
    channel,
    priority,
    event,
  };
}

/**
 * Log reflection to memory (whether notifying or not)
 */
function logReflectionToMemory(event: ReflectionEvent, brain: any): void {
  try {
    const memoryContent = `
## Reflection - ${new Date(event.timestamp).toLocaleString()}
- **Type:** ${event.type}
- **Decision:** ${event.shouldNotify ? 'NOTIFY' : 'NO_NOTIFY'}
- **Summary:** ${event.summary}
- **Description:** ${event.description}
${event.analysis ? `- **Analysis:** ${event.analysis}` : ''}
${event.proposal ? `- **Proposal:** ${event.proposal.title}` : ''}
`.trim();

    brain.upsertMemory({
      key: `reflection_${Date.now()}`,
      content: memoryContent,
      category: 'reflection'
    });
  } catch {
    // Ignore memory write errors
  }
}

/**
 * Format notification for Telegram
 */
export function formatTelegramNotification(decision: NotificationDecision): string {
  const event = decision.event;

  const emojis: Record<string, string> = {
    failure_analysis: '⚠️',
    pattern_insight: '💡',
    breakthrough: '🚨',
    skill_creation: '✨',
    routine_success: '✅',
  };

  const emoji = emojis[event.type] || '🫀';

  let message = `${emoji} **Wolverine Self-Reflection**\n\n`;
  message += `**Event:** ${event.summary}\n\n`;
  message += `**What Happened:**\n${event.description}\n\n`;

  if (event.analysis) {
    message += `**My Analysis:**\n${event.analysis}\n\n`;
  }

  if (event.proposal) {
    message += `**${event.proposal.title}:**\n${event.proposal.description}\n\n`;
    message += '**Your Options:**\n';
    for (const opt of event.proposal.options) {
      message += `[${opt.id}] ${opt.label} - ${opt.description}\n`;
    }
    message += `\n*Reply with number to action*`;
  }

  return message;
}

/**
 * Format notification for Web UI
 */
export function formatWebUINotification(decision: NotificationDecision): any {
  return {
    type: decision.event.type,
    priority: decision.priority,
    title: decision.event.summary,
    description: decision.event.description,
    analysis: decision.event.analysis,
    proposal: decision.event.proposal,
    timestamp: decision.event.timestamp,
    requiresAction: !!decision.event.proposal,
  };
}
