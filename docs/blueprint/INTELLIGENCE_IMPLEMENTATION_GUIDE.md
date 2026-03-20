# Wolverine Intelligence Implementation Guide

> A practical, step-by-step guide to transforming Wolverine from a reactive tool to a truly intelligent agent.

**Audience:** Developers building and extending Wolverine  
**Goal:** Make intelligent features accessible to users with varying GPU capabilities  
**Timeline:** Phased implementation over 3-6 months

---

## Table of Contents

1. [Current State](#current-state)
2. [Target State](#target-state)
3. [The Intelligence Pipeline](#the-intelligence-pipeline)
4. [Phase 1: Foundation (Week 1-2)](#phase-1-foundation)
5. [Phase 2: Perception (Week 3-4)](#phase-2-perception)
6. [Phase 3: Reasoning (Week 5-6)](#phase-3-reasoning)
7. [Phase 4: Planning (Week 7-8)](#phase-4-planning)
8. [Phase 5: Learning (Week 9-12)](#phase-5-learning)
9. [Phase 6: Meta-Cognition (Week 13-24)](#phase-6-meta-cognition)
10. [Testing Strategy](#testing-strategy)
11. [Rollback Procedures](#rollback-procedures)

---

## Current State

### What Wolverine Does Today

```
User: "My name is Vineet, I work at Apple"
    ↓
Wolverine: (Stores "My name is Vineet" in Chetna)
    ↓
User: "What's my name?"
    ↓
Wolverine: "Your name is Vineet." (retrieves from memory)
```

### What Makes It "Semi-Intelligent"

- ✅ **Memory storage** — Saves facts
- ✅ **Memory retrieval** — Fetches relevant memories
- ✅ **LLM-based fact extraction** — Intelligent, not regex-based
- ❌ **No understanding** — Just pattern match and retrieve
- ❌ **No adaptation** — Same behavior for all users
- ❌ **No learning** — Doesn't improve from interactions

### The Gap

```
CURRENT:                    TARGET:
─────────────────────────────────────────────────
Input → Store → Retrieve    Input → Understand → Reason → Learn → Adapt
                                 ↑           ↑
                            LLM thinks   LLM improves
```

---

## Target State

### What Wolverine Will Do

```
User: "I've been feeling overwhelmed with the project deadline"
    ↓
Wolverine:
  1. Perceives: User is stressed/frustrated (emotional intelligence)
  2. Understands: Deadline pressure, possible burnout risk (reasoning)
  3. Plans: Offer help, break down tasks (planning)
  4. Acts: "Let me help you break this down..."
  5. Learns: "User struggles with tight deadlines" (learning)
  6. Adapts: Future responses more supportive around deadlines (meta-cognition)
```

### The Intelligence Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     META-COGNITION                           │
│         Self-reflection, Strategy selection, Evolution       │
├─────────────────────────────────────────────────────────────┤
│                       LEARNING                               │
│        Success/failure analysis, Preference tracking         │
├─────────────────────────────────────────────────────────────┤
│                      PLANNING                                │
│       Task decomposition, Multi-step plans, Contingencies   │
├─────────────────────────────────────────────────────────────┤
│                     REASONING                                │
│       Inference, Memory linking, Pattern recognition         │
├─────────────────────────────────────────────────────────────┤
│                     PERCEPTION                               │
│         Intent detection, Emotion analysis, Entities         │
└─────────────────────────────────────────────────────────────┘
```

---

## The Intelligence Pipeline

### How Intelligence Flows

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER MESSAGE                                 │
│                     "I'm learning Rust for work"                     │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          PERCEPTION                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Intent: INFORMATION_SHARING (user is telling about themselves)│ │
│  │  Emotion: NEUTRAL (casual statement)                            │ │
│  │  Entities: Rust (language), work (context)                      │ │
│  │  Complexity: SIMPLE (single fact)                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         REASONING                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Fact to extract: "I am learning Rust"                          │ │
│  │  Existing knowledge: User works → learning work-related skills │ │
│  │  Inference: User is proactive about career development           │ │
│  │  Memory links: Connect to "I work at Apple"                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          ┌─────────────────┐           ┌─────────────────┐
          │     STORE        │           │    RESPOND      │
          │                 │           │                 │
          │ Extract facts   │           │ "That's great!  │
          │ → Store in      │           │  Rust is a      │
          │   Chetna         │           │  solid choice   │
          │ Update memory    │           │  for systems..." │
          │ graph           │           │                 │
          └─────────────────┘           └─────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         LEARNING                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Update preferences: User learns new technologies               │ │
│  │  Track pattern: User shares career info openly                  │ │
│  │  Success: Fact stored correctly, response appropriate            │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      META-COGNITION                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Reflection: "Did I respond in a helpful way?"                  │ │
│  │  Strategy: "For learning-related info, offer resources"          │ │
│  │  Evolution: Update response template for learning statements      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation

**Duration:** Week 1-2  
**Goal:** Establish infrastructure for intelligent features  
**GPU Tier:** 1 (No GPU required)  
**Files to Create/Modify:** None (infrastructure only)

### 1.1 Intelligence Configuration System

Create `src/config/intelligence.ts`:

```typescript
// src/config/intelligence.ts

export interface IntelligenceConfig {
  enabled: boolean;
  tier: 1 | 2 | 3 | 4 | 'auto';
  features: {
    intentClassification: boolean;
    emotionalIntelligence: boolean;
    factExtraction: boolean;      // Already done
    preferenceLearning: boolean;
    proactiveSuggestions: boolean;
    selfReflection: boolean;
    memoryConsolidation: boolean;
    multiTurnPlanning: boolean;
    selfEvolution: boolean;
  };
  performance: {
    maxLLMCallsPerMessage: number;
    cacheEnabled: boolean;
    asyncProcessing: boolean;
    timeoutMs: number;
  };
}

export const defaultIntelligenceConfig: IntelligenceConfig = {
  enabled: true,
  tier: 'auto',  // Auto-detect based on GPU
  features: {
    intentClassification: true,
    emotionalIntelligence: true,
    factExtraction: true,      // ✅ Already implemented
    preferenceLearning: false,   // Tier 2+
    proactiveSuggestions: false, // Tier 2+
    selfReflection: false,      // Tier 3+
    memoryConsolidation: false, // Tier 3+
    multiTurnPlanning: false,   // Tier 3+
    selfEvolution: false,       // Tier 4
  },
  performance: {
    maxLLMCallsPerMessage: 2,
    cacheEnabled: true,
    asyncProcessing: true,
    timeoutMs: 30000,
  }
};
```

### 1.2 GPU Detection

Create `src/utils/gpu-detector.ts`:

```typescript
// src/utils/gpu-detector.ts

import { execSync } from 'child_process';

export interface GPUInfo {
  tier: 1 | 2 | 3 | 4;
  vramGB: number;
  model: string;
}

export function detectGPU(): GPUInfo {
  try {
    // Try nvidia-smi
    const nvidia = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null', 
      { encoding: 'utf-8' });
    const [model, mem] = nvidia.trim().split(',');
    const vramGB = parseInt(mem.trim()) / 1024;
    
    if (vramGB >= 16) return { tier: 4, vramGB, model };
    if (vramGB >= 8) return { tier: 3, vramGB, model };
    if (vramGB >= 4) return { tier: 2, vramGB, model };
    return { tier: 1, vramGB, model };
  } catch {
    // Try AMD
    try {
      const amd = execSync('rocm-smi --showid --showmeminfo vram 2>/dev/null', { encoding: 'utf-8' });
      // Parse AMD output
      // ...
    } catch {
      return { tier: 1, vramGB: 0, model: 'Integrated/Unknown' };
    }
  }
}

export function getIntelligenceTier(): 1 | 2 | 3 | 4 {
  const gpu = detectGPU();
  
  // Allow manual override via settings
  const settings = loadSettings();
  if (settings.intelligence?.tier && settings.intelligence.tier !== 'auto') {
    return settings.intelligence.tier;
  }
  
  return gpu.tier;
}
```

### 1.3 Intelligence Manager

Create `src/brain/intelligence-manager.ts`:

```typescript
// src/brain/intelligence-manager.ts

import { IntelligenceConfig, defaultIntelligenceConfig } from '../config/intelligence';
import { getIntelligenceTier } from '../utils/gpu-detector';

export class IntelligenceManager {
  private config: IntelligenceConfig;
  private tier: 1 | 2 | 3 | 4;

  constructor(config?: Partial<IntelligenceConfig>) {
    this.tier = getIntelligenceTier();
    this.config = { ...defaultIntelligenceConfig, ...config };
    
    // Auto-enable features based on tier
    this.autoConfigureFeatures();
  }

  private autoConfigureFeatures(): void {
    // Tier 1: Basic only
    if (this.tier >= 1) {
      this.config.features.intentClassification = true;
      this.config.features.emotionalIntelligence = true;
      this.config.features.factExtraction = true;
    }
    
    // Tier 2: Add preferences
    if (this.tier >= 2) {
      this.config.features.preferenceLearning = true;
      this.config.features.proactiveSuggestions = true;
    }
    
    // Tier 3: Add planning
    if (this.tier >= 3) {
      this.config.features.selfReflection = true;
      this.config.features.memoryConsolidation = true;
      this.config.features.multiTurnPlanning = true;
    }
    
    // Tier 4: Full intelligence
    if (this.tier >= 4) {
      this.config.features.selfEvolution = true;
    }
  }

  isEnabled(feature: keyof IntelligenceConfig['features']): boolean {
    return this.config.features[feature];
  }

  getConfig(): IntelligenceConfig {
    return this.config;
  }

  getTier(): number {
    return this.tier;
  }

  shouldRun(feature: keyof IntelligenceConfig['features']): boolean {
    return this.config.enabled && this.isEnabled(feature);
  }
}
```

### 1.4 Testing Phase 1

```bash
# Run GPU detection
npx ts-node -e "import {detectGPU} from './src/utils/gpu-detector'; console.log(detectGPU())"

# Test config loading
npx ts-node -e "import {IntelligenceManager} from './src/brain/intelligence-manager'; const im = new IntelligenceManager(); console.log(im.getTier(), im.getConfig())"
```

### 1.5 Success Criteria

- [ ] GPU detection works on NVIDIA/AMD/Integrated
- [ ] Config system loads from settings.json
- [ ] Features auto-configure based on tier
- [ ] Manual override via settings works

---

## Phase 2: Perception

**Duration:** Week 3-4  
**Goal:** Understand what the user wants and how they feel  
**GPU Tier:** 1 (Low GPU impact)  
**New Files:** `src/brain/intent-classifier.ts`, `src/brain/emotional-context.ts`

### 2.1 Intent Classification

**What it does:** Determines the user's goal (task, question, vent, learning, etc.)

```typescript
// src/brain/intent-classifier.ts

export interface Intent {
  type: 'task' | 'question' | 'vent' | 'learning' | 'debug' | 'casual' | 'feedback';
  urgency: 1 | 2 | 3 | 4 | 5;
  complexity: 'simple' | 'moderate' | 'complex' | 'multi_step';
  domain?: string;  // "coding", "career", "personal", etc.
}

const INTENT_PROMPT = `You are an intent classifier for an AI assistant.

Classify the user's message and return a JSON object with:
- type: One of "task" (wants action), "question" (seeking info), "vent" (emotional release), 
  "learning" (wants to understand), "debug" (troubleshooting), "casual" (chatting), 
  "feedback" (correcting or rating)
- urgency: 1-5 (1=low, 5=critical)
- complexity: "simple" (one action), "moderate" (few steps), "complex" (many steps), 
  "multi_step" (multiple tasks)
- domain: Optional domain hint like "coding", "career", "personal", "tech"

Examples:
User: "Help me set up a React project"
Intent: {"type":"task","urgency":3,"complexity":"complex","domain":"coding"}

User: "I'm so frustrated with this bug"
Intent: {"type":"vent","urgency":4,"complexity":"simple","domain":"coding"}

User: "What does async/await mean?"
Intent: {"type":"learning","urgency":2,"complexity":"moderate","domain":"coding"}

Now classify:
User: "{message}"

Return only the JSON object.`;

export class IntentClassifier {
  private cache: Map<string, Intent> = new Map();
  
  async classify(message: string, history: Message[] = []): Promise<Intent> {
    // Check cache
    const cacheKey = message.substring(0, 50);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Build context from history (last 3 messages)
    const recentContext = history.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const prompt = INTENT_PROMPT.replace('{message}', message)
      .replace('{context}', recentContext);
    
    const response = await this.llm.complete(prompt, {
      maxTokens: 200,
      temperature: 0.1,
    });
    
    const intent = this.parseIntent(response.content);
    this.cache.set(cacheKey, intent);
    
    return intent;
  }
  
  private parseIntent(content: string): Intent {
    try {
      // Try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall back to defaults
    }
    
    return {
      type: 'casual',
      urgency: 2,
      complexity: 'simple',
    };
  }
}
```

### 2.2 Emotional Intelligence

**What it does:** Detects user emotions and adjusts response tone.

```typescript
// src/brain/emotional-context.ts

export interface EmotionalState {
  tone: 'neutral' | 'frustrated' | 'excited' | 'confused' | 'impatient' | 'stressed' | 'happy';
  intensity: 1 | 2 | 3 | 4 | 5;
  triggers: string[];  // What triggered the emotion
  needs: 'patience' | 'clarity' | 'speed' | 'support' | 'encouragement' | 'resources';
}

const EMOTION_PROMPT = `You are an emotional intelligence analyzer.

Analyze the conversation and identify the user's emotional state.

Return a JSON object with:
- tone: "neutral" | "frustrated" | "excited" | "confused" | "impatient" | "stressed" | "happy"
- intensity: 1-5 (how strong is the emotion)
- triggers: What in the conversation triggered this emotion
- needs: What would help the user right now ("patience", "clarity", "speed", "support", "encouragement", "resources")

Examples:
Messages: ["User: This is impossible", "AI: Let me help you break it down"]
Emotion: {"tone":"frustrated","intensity":4,"triggers":["complexity","past failures"],"needs":"patience,clarity"}

Messages: ["User: I finally got it working!", "AI: Congratulations!"]
Emotion: {"tone":"excited","intensity":5,"triggers":["success","breakthrough"],"needs":"encouragement"}

Analyze this conversation:
{messages}

Return only the JSON object.`;

export class EmotionalContext {
  async analyze(messages: Message[]): Promise<EmotionalState> {
    const conversation = messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const response = await this.llm.complete(
      EMOTION_PROMPT.replace('{messages}', conversation),
      { maxTokens: 200, temperature: 0.1 }
    );
    
    return this.parseEmotion(response.content);
  }
  
  // Adjust response based on emotion
  adjustResponse(response: string, emotion: EmotionalState): string {
    if (emotion.tone === 'frustrated' && emotion.intensity >= 4) {
      // Add reassurance
      response = `I understand this is frustrating. Let me help you step by step.\n\n` + response;
    }
    
    if (emotion.tone === 'confused') {
      // Simplify language
      response = `Let me explain clearly:\n\n` + response;
    }
    
    if (emotion.tone === 'excited') {
      // Match energy
      response = `That's awesome! 🎉\n\n` + response;
    }
    
    return response;
  }
}
```

### 2.3 Integration into Cognitive Core

Modify `src/brain/cognitive-core.ts`:

```typescript
// In enrichPrompt method, add perception layer

import { IntentClassifier } from './intent-classifier';
import { EmotionalContext } from './emotional-context';

export class CognitiveCore {
  private intentClassifier: IntentClassifier;
  private emotionalContext: EmotionalContext;
  
  // In enrichPrompt:
  async enrichPrompt(userMessage: string, history: Message[] = []): Promise<Message[]> {
    // Get perception data (if enabled)
    let intent: Intent | null = null;
    let emotion: EmotionalState | null = null;
    
    if (this.intelligenceManager.shouldRun('intentClassification')) {
      intent = await this.intentClassifier.classify(userMessage, history);
    }
    
    if (this.intelligenceManager.shouldRun('emotionalIntelligence')) {
      emotion = await this.emotionalContext.analyze([...history, { role: 'user', content: userMessage }]);
    }
    
    // Build system prompt with perception context
    let systemPrompt = this.buildSystemPrompt();
    
    if (intent) {
      systemPrompt += `\n\n### USER INTENT\nType: ${intent.type}\nUrgency: ${intent.urgency}/5\nComplexity: ${intent.complexity}`;
    }
    
    if (emotion) {
      systemPrompt += `\n\n### USER EMOTIONAL STATE\nTone: ${emotion.tone}\nNeeds: ${emotion.needs}`;
    }
    
    // ... rest of enrichPrompt
  }
}
```

### 2.4 Testing Phase 2

```typescript
// test/intelligence/perception.test.ts

describe('Intent Classification', () => {
  it('classifies task requests correctly', async () => {
    const classifier = new IntentClassifier();
    const intent = await classifier.classify("Help me set up Docker");
    
    expect(intent.type).toBe('task');
    expect(intent.domain).toBe('coding');
  });
  
  it('detects frustration', async () => {
    const emotion = new EmotionalContext();
    const state = await emotion.analyze([
      { role: 'user', content: "This isn't working, I've tried everything" }
    ]);
    
    expect(['frustrated', 'stressed']).toContain(state.tone);
    expect(state.intensity).toBeGreaterThanOrEqual(3);
  });
});
```

### 2.5 Success Criteria

- [ ] Intent classifier returns correct type for 10 test cases
- [ ] Emotional detection identifies frustration/confusion/excitement
- [ ] Response adjusts based on emotion
- [ ] Performance: <500ms added latency for perception

---

## Phase 3: Reasoning

**Duration:** Week 5-6  
**Goal:** Infer meaning, link memories, recognize patterns  
**GPU Tier:** 2 (Medium GPU)  
**New Files:** `src/brain/inference-engine.ts`, `src/brain/pattern-detector.ts`

### 3.1 Inference Engine

**What it does:** Draws conclusions from facts and conversation.

```typescript
// src/brain/inference-engine.ts

export interface Inference {
  statement: string;      // "User is a backend engineer"
  confidence: number;       // 0-1
  evidence: string[];       // Source facts
  type: 'role' | 'preference' | 'relationship' | 'capability';
}

const INFERENCE_PROMPT = `You are an inference engine. Given facts about a user, infer new information.

Input facts:
{facts}

Input conversation:
{conversation}

Task: Infer relationships, roles, and preferences not explicitly stated.

Return a JSON array of inferences, each with:
- statement: The inferred fact (e.g., "User prefers working on backend systems")
- confidence: 0-1 (how certain are you)
- evidence: Array of source facts supporting this inference
- type: "role" | "preference" | "relationship" | "capability"

Example:
Facts: ["I work at Apple", "I build APIs", "I use Go for backend"]
Inference: {"statement":"User is a backend engineer","confidence":0.85,"evidence":["I build APIs","I use Go for backend"],"type":"role"}

Generate inferences:`;

export class InferenceEngine {
  async infer(facts: string[], conversation: string): Promise<Inference[]> {
    const prompt = INFERENCE_PROMPT
      .replace('{facts}', facts.map(f => `- ${f}`).join('\n'))
      .replace('{conversation}', conversation);
    
    const response = await this.llm.complete(prompt, {
      maxTokens: 500,
      temperature: 0.3,
    });
    
    return this.parseInferences(response.content);
  }
}
```

### 3.2 Pattern Detector

**What it does:** Finds behavioral patterns over time.

```typescript
// src/brain/pattern-detector.ts

export interface Pattern {
  name: string;
  description: string;
  frequency: number;       // Times observed
  lastSeen: Date;
  confidence: number;      // How reliable is this pattern
  examples: string[];      // Example instances
}

const PATTERN_PROMPT = `Analyze this user's conversation history and identify behavioral patterns.

Recent interactions:
{interactions}

Task: Find recurring patterns in behavior, preferences, or communication style.

Return a JSON array of patterns, each with:
- name: Short pattern name (e.g., "debug_mornings")
- description: What the pattern is
- frequency: How often observed (number)
- lastSeen: When last observed (date)
- confidence: How reliable (0-1)
- examples: 2-3 example instances

Generate patterns:`;

export class PatternDetector {
  async detectPatterns(interactions: Interaction[]): Promise<Pattern[]> {
    const prompt = PATTERN_PROMPT.replace(
      '{interactions}',
      interactions.map(i => `${i.date}: ${i.userMessage.substring(0, 100)}`).join('\n')
    );
    
    const response = await this.llm.complete(prompt, { maxTokens: 500, temperature: 0.3 });
    
    return this.parsePatterns(response.content);
  }
}
```

### 3.3 Testing Phase 3

```typescript
describe('Reasoning', () => {
  it('infers role from facts', async () => {
    const engine = new InferenceEngine();
    const inferences = await engine.infer(
      ['I work at Apple', 'I build microservices', 'I use Kubernetes'],
      []
    );
    
    const backendInf = inferences.find(i => i.type === 'role');
    expect(backendInf).toBeDefined();
    expect(backendInf.confidence).toBeGreaterThan(0.7);
  });
});
```

---

## Phase 4: Planning

**Duration:** Week 7-8  
**Goal:** Break complex tasks into steps, create plans  
**GPU Tier:** 3 (Strong GPU)  
**New Files:** `src/brain/task-planner.ts`, `src/brain/step-executor.ts`

### 4.1 Task Planner

```typescript
// src/brain/task-planner.ts

export interface Plan {
  steps: PlanStep[];
  estimatedTime: string;
  risks: string[];
  alternativeApproaches: string[];
}

export interface PlanStep {
  number: number;
  action: string;
  tools: string[];
  successCriteria: string;
  rollbackAction?: string;
}

const PLANNING_PROMPT = `You are a task planning assistant. Break complex requests into actionable steps.

User request: "{task}"

Context:
- Available tools: {tools}
- User expertise: {expertise}

Create a plan with:
- steps: Numbered actions, each with tool to use and success criteria
- estimatedTime: Rough time estimate
- risks: Potential issues and how to mitigate
- alternativeApproaches: Other ways to solve this

Return JSON:`;

export class TaskPlanner {
  async plan(task: string, context: PlanningContext): Promise<Plan> {
    const prompt = PLANNING_PROMPT
      .replace('{task}', task)
      .replace('{tools}', context.availableTools.join(', '))
      .replace('{expertise}', context.userExpertise || 'unknown');
    
    const response = await this.llm.complete(prompt, {
      maxTokens: 800,
      temperature: 0.2,
    });
    
    return this.parsePlan(response.content);
  }
  
  async executePlan(plan: Plan): Promise<ExecutionResult> {
    const results: StepResult[] = [];
    
    for (const step of plan.steps) {
      const result = await this.executeStep(step);
      results.push(result);
      
      // Validate success
      if (!this.validateStep(step, result)) {
        // Try rollback
        if (step.rollbackAction) {
          await this.executeRollback(step);
        }
        return { success: false, completedSteps: results.length, totalSteps: plan.steps.length };
      }
    }
    
    return { success: true, completedSteps: results.length, totalSteps: plan.steps.length };
  }
}
```

### 4.2 Testing Phase 4

```typescript
describe('Planning', () => {
  it('breaks down complex task', async () => {
    const planner = new TaskPlanner();
    const plan = await planner.plan(
      "Set up a CI/CD pipeline for my Node.js project",
      { availableTools: ['shell', 'git', 'docker', 'github'] }
    );
    
    expect(plan.steps.length).toBeGreaterThan(3);
    expect(plan.estimatedTime).toBeDefined();
  });
});
```

---

## Phase 5: Learning

**Duration:** Week 9-12  
**Goal:** Learn from success/failure, track preferences  
**GPU Tier:** 2 (Medium GPU)  
**New Files:** `src/brain/preference-learner.ts`, `src/brain/outcome-analyzer.ts`

### 5.1 Preference Learner

```typescript
// src/brain/preference-learner.ts

export interface UserPreferences {
  communicationStyle: 'brief' | 'detailed' | 'mixed';
  technicalLevel: 'beginner' | 'intermediate' | 'expert';
  preferredTone: 'formal' | 'casual' | 'playful';
  responseFormat: 'markdown' | 'plain' | 'structured';
  learningStyle: 'visual' | 'text' | 'hands_on';
  workStyle: 'planning' | 'adaptive' | 'mixed';
  lastUpdated: Date;
}

const PREFERENCE_PROMPT = `Analyze this conversation to understand the user's preferences.

Recent conversation:
{conversation}

Infer and return JSON with preferences:
- communicationStyle: "brief" (short responses) | "detailed" (thorough) | "mixed"
- technicalLevel: "beginner" | "intermediate" | "expert"
- preferredTone: "formal" | "casual" | "playful"
- responseFormat: "markdown" | "plain" | "structured"
- learningStyle: "visual" | "text" | "hands_on"
- workStyle: "planning" (prefers plans) | "adaptive" (flexible) | "mixed"

Generate JSON:`;

export class PreferenceLearner {
  async updatePreferences(messages: Message[], currentPrefs: UserPreferences): Promise<UserPreferences> {
    const conversation = messages.slice(-20).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const response = await this.llm.complete(
      PREFERENCE_PROMPT.replace('{conversation}', conversation),
      { maxTokens: 300, temperature: 0.2 }
    );
    
    const inferred = this.parsePreferences(response.content);
    
    // Merge with current, preferring explicit signals over inference
    return {
      ...currentPrefs,
      ...inferred,
      lastUpdated: new Date()
    };
  }
  
  applyPreferences(response: string, prefs: UserPreferences): string {
    if (prefs.communicationStyle === 'brief') {
      // Condense response
      response = this.summarize(response);
    }
    
    // Add emojis for playful tone
    if (prefs.preferredTone === 'playful') {
      response = this.addEmojis(response);
    }
    
    return response;
  }
}
```

---

## Phase 6: Meta-Cognition

**Duration:** Week 13-24  
**Goal:** Wolverine thinks about thinking, improves itself  
**GPU Tier:** 4 (Enterprise GPU)  
**New Files:** `src/brain/self-reflection.ts`, `src/brain/self-evolution.ts`

### 6.1 Self-Reflection

```typescript
// src/brain/self-reflection.ts

export interface SelfReview {
  understood: boolean;
  quality: 1 | 2 | 3 | 4 | 5;
  improvements: string[];
  needsFollowUp: boolean;
  followUpQuestion?: string;
  selfCorrection?: string;
}

const REFLECTION_PROMPT = `Review your response and identify how it could be improved.

User asked: "{userMessage}"
You responded: "{response}"
Conversation context: {context}

Evaluate:
1. Did you fully understand what the user needed?
2. Was your response helpful and accurate?
3. Did you communicate clearly?
4. Should you offer follow-up help?

Return JSON with:
- understood: boolean
- quality: 1-5 rating
- improvements: Array of suggestions
- needsFollowUp: boolean
- followUpQuestion: Optional question to ask
- selfCorrection: If you made a mistake, how to fix it`;

export class SelfReflection {
  async reflect(response: Response, context: ConversationContext): Promise<SelfReview> {
    const prompt = REFLECTION_PROMPT
      .replace('{userMessage}', context.userMessage)
      .replace('{response}', response.content)
      .replace('{context}', context.history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n'));
    
    const llmResponse = await this.llm.complete(prompt, {
      maxTokens: 400,
      temperature: 0.3,
    });
    
    return this.parseReview(llmResponse.content);
  }
}
```

### 6.2 Self-Evolution

```typescript
// src/brain/self-evolution.ts

export interface Evolution {
  type: 'prompt_update' | 'skill_improvement' | 'strategy_change' | 'new_capability';
  description: string;
  implementation: string;  // Code or config change
  confidence: number;
  rollback: string;       // How to undo this change
}

export class SelfEvolution {
  async evolve(sessions: Session[]): Promise<Evolution[]> {
    const outcomes = this.analyzeOutcomes(sessions);
    
    const prompt = `Analyze Wolverine's performance across these sessions and suggest improvements.

Sessions: {sessions}
Outcomes: {outcomes}

Identify:
1. What strategies are working well?
2. What patterns lead to failures?
3. How can Wolverine adapt to improve?
4. Should any system prompts be updated?

Return JSON array of evolution suggestions:`;
    
    const response = await this.llm.complete(prompt, {
      maxTokens: 800,
      temperature: 0.4,
    });
    
    return this.parseEvolutions(response.content);
  }
  
  async applyEvolution(evolution: Evolution): Promise<void> {
    if (evolution.type === 'prompt_update') {
      await this.updateSystemPrompt(evolution.implementation);
    }
    // ... apply other types
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Intelligence Components', () => {
  describe('IntentClassifier', () => {
    const testCases = [
      { input: "Help me debug", expected: 'task' },
      { input: "What's this?", expected: 'question' },
      { input: "I'm so tired of this", expected: 'vent' },
    ];
    
    testCases.forEach(({ input, expected }) => {
      it(`classifies "${input}" as ${expected}`, async () => {
        const intent = await classifier.classify(input);
        expect(intent.type).toBe(expected);
      });
    });
  });
});
```

### Integration Tests

```typescript
describe('Intelligence Pipeline', () => {
  it('processes message through all layers', async () => {
    // Input
    const response = await wolverine.chat("I'm learning Rust for work");
    
    // Verify perception
    expect(response.intent.type).toBe('information_sharing');
    
    // Verify reasoning
    expect(response.inferences.length).toBeGreaterThan(0);
    
    // Verify learning
    const memory = await chetna.search("learning Rust");
    expect(memory).toContain("learning Rust");
  });
});
```

### A/B Testing

```typescript
describe('A/B: Intelligence vs Baseline', () => {
  it('intelligence improves response quality', async () => {
    // Test with intelligence enabled
    const intelligentResponse = await wolverine.chat(
      "This is frustrating, I've tried everything",
      { intelligence: true }
    );
    
    // Test with intelligence disabled
    const baselineResponse = await wolverine.chat(
      "This is frustrating, I've tried everything",
      { intelligence: false }
    );
    
    // Intelligence should add empathy
    expect(intelligentResponse.emotion?.tone).toBe('frustrated');
    expect(intelligentResponse.content).toContain('understand');
  });
});
```

---

## Rollback Procedures

### If Intelligence Feature Causes Issues

```typescript
// Emergency disable in settings.json
{
  "intelligence": {
    "enabled": false,
    "features": {
      "intentClassification": false,
      "emotionalIntelligence": false,
      // ...
    }
  }
}
```

### Monitoring

```typescript
// Alert if quality drops
if (metrics.responseQuality < 0.7) {
  await alert("Intelligence quality degraded");
  await disableIntelligence();
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Intent accuracy | >85% | Manual review of 100 samples |
| Emotion detection | >80% | A/B test vs manual |
| Inference accuracy | >75% | Cross-reference with facts |
| Pattern detection | >70% | User confirmation |
| Preference accuracy | >80% | User feedback |
| Self-reflection helpfulness | >70% | User rating |
| Overall satisfaction | >85% | User survey |

---

## Next Steps

Ready to implement? Start with:

1. **Phase 1 (Foundation)** — Week 1-2
   - Create config system
   - Set up GPU detection
   - Build IntelligenceManager

2. **Phase 2 (Perception)** — Week 3-4
   - Implement IntentClassifier
   - Implement EmotionalContext
   - Integrate into CognitiveCore

3. **Continue Phases 3-6** as resources allow

---

*Document Version: 1.0*  
*Last Updated: March 2026*  
*Next Review: After Phase 2 completion*
