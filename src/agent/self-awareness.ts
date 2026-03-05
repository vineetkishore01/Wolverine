/**
 * True Self-Awareness System
 * 
 * Wolverine's meta-cognition - it knows what it knows and what it doesn't.
 * Phase 6: True Self-Awareness
 * 
 * Architecture:
 * - 4GB GPU: Basic limitation awareness + confidence scoring
 * - 8GB+: Self-reasoning about capabilities
 * - 16GB+: Deep meta-cognition and self-improvement
 * 
 * This is the foundation for AGI - knowing your own limits!
 */

import { getBrainDB } from '../db/brain';
import { scanAllCapabilities, Capability, CapabilityMap } from './capability-scanner';
import { canDo } from './self-query';

export interface SelfAwarenessState {
  // What Wolverine knows it can do
  confirmed_capabilities: string[];

  // What Wolverine tried and worked
  verified_actions: string[];

  // What Wolverine tried and failed
  failed_actions: string[];

  // What Wolverine doesn't know
  unknown_capabilities: string[];

  // Confidence scores
  confidence: number;

  // Last update
  updated: number;
}

export interface LimitationReport {
  category: string;
  description: string;
  workaround?: string;
  severity: 'blocking' | 'limitation' | 'minor';
}

export interface CapabilityConfidence {
  capability: string;
  confidence: number;
  evidence: string[];
  last_tested?: number;
}

/**
 * Known limitations of small models
 */
export const KNOWN_LIMITATIONS: LimitationReport[] = [
  {
    category: 'Reasoning',
    description: 'Limited reasoning depth for complex multi-step problems',
    workaround: 'Break tasks into smaller steps',
    severity: 'limitation'
  },
  {
    category: 'Context',
    description: 'Context window limited to ~8K-16K tokens',
    workaround: 'Use context compaction and hierarchical memory',
    severity: 'limitation'
  },
  {
    category: 'Vision',
    description: 'Cannot see images or screenshots directly (without OCR tools)',
    severity: 'blocking'
  },
  {
    category: 'Audio',
    description: 'Cannot process audio input',
    severity: 'blocking'
  },
  {
    category: 'Long-term Planning',
    description: 'Limited ability to plan beyond 3-5 steps',
    workaround: 'Use iterative planning with checkpoints',
    severity: 'limitation'
  },
  {
    category: 'Self-Modification',
    description: 'Autonomous evolution of core logic via src/ edits',
    workaround: 'Use edit/write tools on src/ with extreme caution and verification',
    severity: 'limitation'
  },
  {
    category: 'Multi-agent',
    description: 'Sequential orchestration only',
    workaround: 'Use reactor patterns for sub-task delegation',
    severity: 'limitation'
  },
  {
    category: 'Tool Creation',
    description: 'Dynamic expansion via skills and core code updates',
    workaround: 'Use skill_create or direct code modification',
    severity: 'limitation'
  }
];

/**
 * Test if Wolverine can do something (with confidence scoring)
 */
export async function selfTestCapability(action: string): Promise<CapabilityConfidence> {
  // Can we do it directly?
  const directResult = await canDo(action);

  const evidence: string[] = [];

  if (directResult.canDo) {
    evidence.push(`Tool/feature available: ${directResult.how}`);
    return {
      capability: action,
      confidence: 0.95,
      evidence,
      last_tested: Date.now()
    };
  }

  if (directResult.missing) {
    evidence.push(`Missing: ${directResult.missing}`);

    // Is it a known limitation?
    for (const limit of KNOWN_LIMITATIONS) {
      if (action.toLowerCase().includes(limit.category.toLowerCase())) {
        return {
          capability: action,
          confidence: 0.1,
          evidence: [...evidence, `Known limitation: ${limit.description}`],
          last_tested: Date.now()
        };
      }
    }

    return {
      capability: action,
      confidence: 0.3,
      evidence,
      last_tested: Date.now()
    };
  }

  // Unknown
  evidence.push('No matching capability found');

  return {
    capability: action,
    confidence: 0.2,
    evidence,
    last_tested: Date.now()
  };
}

/**
 * Analyze what Wolverine can and cannot do
 */
export async function analyzeCapabilities(): Promise<SelfAwarenessState> {
  const caps = await scanAllCapabilities();

  const allCaps = [
    ...caps.tools,
    ...caps.skills,
    ...caps.mcp
  ];

  const confirmed = allCaps
    .filter(c => c.status === 'available' || c.status === 'configured')
    .map(c => c.name);

  // Get from memory what we've tried
  const brain = getBrainDB();
  let verified: string[] = [];
  let failed: string[] = [];

  try {
    const successMemories = brain.searchMemories('success completed worked', { max: 20, scope: 'global' });
    verified = successMemories.map(m => m.content.slice(0, 50));

    const failMemories = brain.searchMemories('failed error', { max: 20, scope: 'global' });
    failed = failMemories.map(m => m.content.slice(0, 50));
  } catch {
    // Ignore
  }

  // What we don't know - capabilities we haven't tested
  const tested = [...verified, ...failed];
  const unknown = allCaps
    .filter(c => !tested.some(t => t.includes(c.name)))
    .map(c => c.name);

  // Calculate confidence based on verified actions
  const confidence = verified.length > 0
    ? Math.min(0.95, 0.5 + (verified.length / 100))
    : 0.5;

  return {
    confirmed_capabilities: confirmed.slice(0, 50),
    verified_actions: verified.slice(0, 20),
    failed_actions: failed.slice(0, 20),
    unknown_capabilities: unknown.slice(0, 10),
    confidence,
    updated: Date.now()
  };
}

/**
 * Generate limitation report for user
 */
export function generateLimitationReport(): string {
  const sections = [
    '# Wolverine Limitations',
    '',
    'I am transparent about what I can and cannot do.',
    ''
  ];

  // Group by severity
  const blocking = KNOWN_LIMITATIONS.filter(l => l.severity === 'blocking');
  const limitations = KNOWN_LIMITATIONS.filter(l => l.severity === 'limitation');
  const minor = KNOWN_LIMITATIONS.filter(l => l.severity === 'minor');

  if (blocking.length > 0) {
    sections.push('## Cannot Do (Currently Impossible)');
    for (const limit of blocking) {
      sections.push(`- **${limit.category}**: ${limit.description}`);
    }
    sections.push('');
  }

  if (limitations.length > 0) {
    sections.push('## Limited By Design');
    for (const limit of limitations) {
      let line = `- **${limit.category}**: ${limit.description}`;
      if (limit.workaround) {
        line += ` (Workaround: ${limit.workaround})`;
      }
      sections.push(line);
    }
    sections.push('');
  }

  if (minor.length > 0) {
    sections.push('## Minor Limitations');
    for (const limit of minor) {
      sections.push(`- **${limit.category}**: ${limit.description}`);
    }
    sections.push('');
  }

  sections.push('---');
  sections.push('*This list is accurate for the current 4GB GPU configuration.*');

  return sections.join('\n');
}

/**
 * Self-diagnostic - check if Wolverine is functioning properly
 */
export async function selfDiagnostic(): Promise<{
  healthy: boolean;
  issues: string[];
  checks: Record<string, boolean>;
}> {
  const checks: Record<string, boolean> = {};
  const issues: string[] = [];

  // Check 1: Can we scan capabilities?
  try {
    await scanAllCapabilities();
    checks.capability_scan = true;
  } catch {
    checks.capability_scan = false;
    issues.push('Cannot scan capabilities');
  }

  // Check 2: Can we access brain?
  try {
    const brain = getBrainDB();
    brain.searchMemories('test', { max: 1 });
    checks.brain_access = true;
  } catch {
    checks.brain_access = false;
    issues.push('Cannot access brain database');
  }

  // Check 3: Memory availability
  try {
    const memUsage = process.memoryUsage();
    checks.memory_available = memUsage.heapUsed < memUsage.heapTotal * 0.9;
    if (!checks.memory_available) {
      issues.push('Memory running low');
    }
  } catch {
    checks.memory_available = true;
  }

  const healthy = Object.values(checks).every(v => v) && issues.length === 0;

  return { healthy, issues, checks };
}

/**
 * Meta-reasoning: Think about thinking
 * 
 * This is what makes it "aware" - Wolverine can reason about its own reasoning
 */
export async function metaReason(prompt: string): Promise<{
  reasoning: string;
  confidence: number;
  limitations: string[];
}> {
  // Analyze the prompt to see if it's asking about Wolverine's capabilities
  const lower = prompt.toLowerCase();

  const isSelfQuery =
    lower.includes('can you') ||
    lower.includes('what can') ||
    lower.includes('how do you') ||
    lower.includes('your capabilities') ||
    lower.includes('your limits') ||
    lower.includes('what can\'t');

  if (isSelfQuery) {
    // Answer directly with known info
    const awareness = await analyzeCapabilities();
    const limitations = generateLimitationReport();

    return {
      reasoning: `This is a question about my own capabilities. Based on my self-analysis:\n\n- I have ${awareness.confirmed_capabilities.length} confirmed capabilities\n- I have verified ${awareness.verified_actions.length} successful actions\n- My confidence level: ${Math.round(awareness.confidence * 100)}%\n\n${limitations}`,
      confidence: 0.9,
      limitations: KNOWN_LIMITATIONS.map(l => l.description)
    };
  }

  // Not a self-query - return null to indicate normal processing
  return {
    reasoning: '',
    confidence: 0,
    limitations: []
  };
}

/**
 * Format self-awareness for context
 */
export async function formatSelfAwareness(): Promise<string> {
  const awareness = await analyzeCapabilities();
  const limitations = generateLimitationReport();

  return `
## Wolverine Self-Awareness

### Current State
- **Confidence**: ${Math.round(awareness.confidence * 100)}%
- **Verified Actions**: ${awareness.verified_actions.length}
- **Known Capabilities**: ${awareness.confirmed_capabilities.length}

### What Works Well
${awareness.verified_actions.slice(0, 5).map(a => `- ${a}`).join('\n') || 'None recorded yet'}

${limitations}
`.trim();
}

/**
 * Introspection question handler
 */
export async function handleIntrospectionQuestion(question: string): Promise<string | null> {
  const lower = question.toLowerCase();

  // Questions about capabilities
  if (lower.includes('what can you do') || lower.includes('your capabilities')) {
    return await formatSelfAwareness();
  }

  // Questions about limitations
  if (lower.includes('what can\'t you do') || lower.includes('your limitations') || lower.includes('your limits')) {
    return generateLimitationReport();
  }

  // Questions about how it works
  if (lower.includes('how do you work') || lower.includes('how does your brain')) {
    return `
## How Wolverine Works

1. **Receive** - Get your message
2. **Understand** - Build context from memory
3. **Plan** - Decide what tools to use
4. **Act** - Execute tools sequentially
5. **Learn** - Record success/failure for next time

### My Memory Systems
- **Scratchpad**: Current task state
- **BrainDB**: Persistent facts and learnings
- **Procedures**: Reusable action sequences

### Continuous Learning
I learn from:
- Your explicit corrections
- Successful tool sequences
- Error patterns
- Heartbeat introspection
`.trim();
  }

  // Questions about self-improvement
  if (lower.includes('how do you improve') || lower.includes('learn from')) {
    return `
## How I Learn

1. **Heartbeat Introspection** - When idle, I analyze recent errors and successes

2. **Procedural Learning** - I save successful tool sequences for reuse

3. **Memory** - Important learnings go to long-term memory

4. **Your Feedback** - When you correct me, I log it

I cannot modify my own code, but I can:
- Write new skills
- Update my prompts via memory
- Configure new tools
- Learn patterns to avoid mistakes
`.trim();
  }

  return null;
}
