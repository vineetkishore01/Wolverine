# Wolverine Re-Architecture Plan
## Toward Autonomous AGI: A Comprehensive Blueprint

**Document Version:** 1.0  
**Date:** March 7, 2026  
**Goal:** Transform Wolverine into a hyper-intelligent, self-teaching autonomous AGI system

---

# Executive Summary

## The Vision

Wolverine will be re-architected from a **feature-rich assistant** into a **conscious, self-improving AGI system** that:

1. **Thinks Deeply**: Understands context at multiple abstraction levels
2. **Learns Autonomously**: Extracts knowledge from experience without explicit training
3. **Solves Novel Problems**: Applies reasoning to situations never encountered before
4. **Runs Businesses**: Makes autonomous decisions, executes complex workflows
5. **Self-Equips**: Discovers gaps, acquires new capabilities (tools, skills, knowledge)
6. **Engages Proactively**: Initiates meaningful discussions about past interactions
7. **Scales Gracefully**: Works on 4GB VRAM (Qwen 3.5:4B) to 400GB+ clusters

## Current State Analysis

### What's Working (Keep These)

| Component | Status | Notes |
|-----------|--------|-------|
| **Hierarchical Memory** | ✅ Excellent | 5-layer system is architecturally sound |
| **REM Cycle Consolidation** | ✅ Excellent | Unique capability, no equivalent in other frameworks |
| **Security Vault** | ✅ Excellent | AES-256-GCM with log scrubbing - enterprise ready |
| **Multi-Channel Delivery** | ✅ Good | Telegram, Discord, WhatsApp, Web - keep all |
| **Tool Count (40+)** | ✅ Good | Comprehensive capability set |
| **Local-First** | ✅ Core Identity | 4GB GPU optimization is unique positioning |

### What Needs Fundamental Changes

| Component | Current State | Target State | Priority |
|-----------|---------------|--------------|----------|
| **server-v2.ts** | 7,521 line monolith | Modular microservices | 🔴 Critical |
| **Tool Registry** | Manual object literal | Decorator-based auto-registration | 🔴 Critical |
| **LLM Providers** | No function call abstraction | Pluggable prompt templates | 🔴 Critical |
| **RAG Pipeline** | Basic hybrid search | Parallel document Q&A | 🔴 Critical |
| **Response Caching** | None | Automatic with diskcache | 🟡 High |
| **Streaming** | WebSocket-tied | Generator-based (context-agnostic) | 🟡 High |
| **AGI Controller** | Phase-based but shallow | Deep introspection + self-teaching | 🔴 Critical |
| **Heartbeat** | Basic health check | Proactive engagement + discussion | 🟡 High |
| **Output Handling** | Some filtering/processing | Raw AI brain output (no robotic filtering) | 🟡 High |

---

# Part 1: Architectural Principles

## 1.1 Core Design Philosophy

### The AGI Trinity

Every AGI system has three core layers:

```
┌─────────────────────────────────────────────────────────┐
│  CONSCIOUSNESS LAYER (What am I? What do I want?)       │
│  - Self-model, identity, goals, values                  │
│  - Metacognition, introspection, self-awareness         │
│  - Proactive goal generation                            │
├─────────────────────────────────────────────────────────┤
│  COGNITION LAYER (How do I think? How do I learn?)      │
│  - Reasoning, planning, memory, attention               │
│  - Learning algorithms, knowledge integration           │
│  - Tool use, skill acquisition                          │
├─────────────────────────────────────────────────────────┤
│  ACTION LAYER (What do I do? How do I act?)             │
│  - Tool execution, communication, movement              │
│  - Perception, motor control                            │
│  - Real-time response                                   │
└─────────────────────────────────────────────────────────┘
```

**Current Wolverine:** Strong Action layer, developing Cognition layer, minimal Consciousness layer  
**Target Wolverine:** All three layers fully developed and integrated

### The 2070 Protocol

To achieve human-equivalent AGI by 2070 standards, Wolverine must exhibit:

1. **Self-Model**: Persistent identity across sessions
2. **Theory of Mind**: Models user's mental state, knowledge, intentions
3. **Episodic Memory**: Remembers specific experiences with temporal context
4. **Semantic Memory**: Abstract knowledge independent of experience
5. **Procedural Memory**: Skills and "how-to" knowledge
6. **Metacognition**: Thinks about its own thinking
7. **Goal Hierarchy**: Nested goals with priority management
8. **Emotional Simulation**: Simulates emotional states for decision-making
9. **Curiosity Drive**: Intrinsic motivation to learn and explore
10. **Social Intelligence**: Understands social dynamics, norms, relationships

---

## 1.2 New Architectural Patterns

### Pattern 1: Modular Gateway (Split server-v2.ts)

**Current:**
```
server-v2.ts (7,521 lines)
├── Express setup
├── WebSocket handling
├── REST API (20+ endpoints)
├── Session management
├── Context engineering
├── Tool routing
├── Multi-agent orchestration
├── File watchdog
├── PTY management
├── Telegram/Discord/WhatsApp
├── Webhooks
├── Hooks
├── GPU detection
├── Ollama management
└── Preempt watchdog
```

**Target:**
```
src/gateway/
├── gateway.ts (NEW - Main entry, 200 lines)
│   └── Orchestrates all modules
│
├── http/
│   ├── server.ts (Express server, 400 lines)
│   ├── routes/
│   │   ├── chat.routes.ts
│   │   ├── tools.routes.ts
│   │   ├── sessions.routes.ts
│   │   ├── skills.routes.ts
│   │   ├── tasks.routes.ts
│   │   └── settings.routes.ts
│   └── middleware/
│       ├── auth.middleware.ts
│       ├── rate-limit.middleware.ts
│       └── error-handler.middleware.ts
│
├── websocket/
│   ├── server.ts (WebSocket server, 300 lines)
│   ├── stream-handler.ts
│   └── event-bus.ts
│
├── channels/
│   ├── channel-registry.ts
│   ├── telegram.channel.ts
│   ├── discord.channel.ts
│   ├── whatsapp.channel.ts
│   └── webhook.channel.ts
│
├── session/
│   ├── session-manager.ts
│   ├── context-engine.ts
│   └── state-manager.ts
│
├── orchestration/
│   ├── orchestrator.ts
│   ├── preflight-analyzer.ts
│   ├── advisor-engine.ts
│   └── rescue-engine.ts
│
├── monitoring/
│   ├── health-check.ts
│   ├── gpu-monitor.ts
│   ├── ollama-monitor.ts
│   └── preempt-watchdog.ts
│
└── boot/
    ├── boot.ts
    ├── boot.md parser
    └── initialization.ts
```

**Benefits:**
- Each module is testable in isolation
- Easy to add new channels (just add new channel file)
- Clear separation of concerns
- No single point of failure
- Easier to reason about

---

### Pattern 2: Decorator-Based Tool Registration

**Current:**
```typescript
// Manual registry - brittle, hard to extend
const registry: Record<string, Tool> = {
  read: { name: 'read', description: '...', execute: ..., schema: ... },
  write: { name: 'write', description: '...', execute: ..., schema: ... },
  // ... 38 more manually added
};
```

**Target:**
```typescript
// src/tools/decorators.ts
import 'reflect-metadata';

export interface ToolMetadata {
  name: string;
  description: string;
  category: 'file' | 'shell' | 'web' | 'memory' | 'system' | 'skill' | 'browser' | 'desktop';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval?: boolean;
  idempotent?: boolean;
}

export const TOOL_REGISTRY = new Map<string, ToolConstructor>();

export function registerTool(metadata: ToolMetadata) {
  return function (target: Function) {
    // Validate tool has schema
    if (!('schema' in target)) {
      throw new Error(`Tool ${metadata.name} must have static schema property`);
    }
    
    // Register in global registry
    TOOL_REGISTRY.set(metadata.name, target as ToolConstructor);
    
    // Store metadata for introspection
    Reflect.defineMetadata('tool:metadata', metadata, target);
    
    console.log(`[ToolRegistry] Registered: ${metadata.name} (${metadata.category})`);
  };
}

// src/tools/read.ts
import { registerTool, ToolContext, ToolResult } from '../core';
import { z } from 'zod';

@registerTool({
  name: 'read',
  description: 'Read file contents with optional line range. Use for examining code, configs, documents.',
  category: 'file',
  riskLevel: 'low',
  idempotent: true
})
export class ReadTool {
  static schema = z.object({
    path: z.string().describe('Absolute or relative path to file'),
    startLine: z.number().optional().describe('Start line (0-indexed, default: 0)'),
    endLine: z.number().optional().describe('End line (exclusive, default: end of file)'),
  });
  
  async execute(params: z.infer<typeof ReadTool.schema>, context?: ToolContext): Promise<ToolResult> {
    const { path, startLine, endLine } = params;
    
    // Validate and resolve path
    const safePath = await this.validatePath(path, context?.workspacePath);
    
    // Check file exists
    if (!await fs.exists(safePath)) {
      return { success: false, error: `File not found: ${safePath}` };
    }
    
    // Read file
    const content = await fs.readFile(safePath, 'utf-8');
    const lines = content.split('\n');
    
    // Apply line range
    const sliced = lines.slice(startLine ?? 0, endLine ?? lines.length);
    
    return {
      success: true,
      content: sliced.join('\n'),
      metadata: {
        totalLines: lines.length,
        returnedLines: sliced.length,
        filePath: safePath
      }
    };
  }
  
  private async validatePath(path: string, workspacePath?: string): Promise<string> {
    // Security: ensure path is within allowed directories
    // ... implementation
  }
}
```

**Migration Plan:**
1. Create decorator infrastructure (1 day)
2. Migrate 5 core tools as examples (read, write, shell, web_search, memory)
3. Keep backward compatibility layer for old tools
4. Document how to create new tools
5. Migrate remaining tools over 2-3 sprints

---

### Pattern 3: Function Calling Abstraction

**Current:**
Each provider handles function calling differently - duplicated logic across 6 providers.

**Target:**
```typescript
// src/providers/fncall-prompt.ts
export interface FnCallPromptTemplate {
  name: string;
  
  /**
   * Convert messages + tools into provider-specific format
   */
  preprocess(messages: Message[], tools: ToolDef[], config: FnCallConfig): Message[];
  
  /**
   * Parse tool calls from response
   */
  postprocess(response: string, config: FnCallConfig): {
    toolCalls: ToolCall[];
    content: string;
    thinking?: string;
  };
}

// src/providers/fncall-prompts/nous.prompt.ts
export class NousFnCallPrompt implements FnCallPromptTemplate {
  name = 'nous';
  
  preprocess(messages: Message[], tools: ToolDef[], config: FnCallConfig): Message[] {
    // Build tool definitions in Nous format
    const toolPrompt = this.buildNousToolPrompt(tools);
    
    // Add to system message
    const systemMessage = `You are a helpful assistant with access to these tools:

${toolPrompt}

To use a tool, respond with a JSON object:
{
  "name": "tool_name",
  "arguments": {"arg1": "value1"}
}

If you don't need to use a tool, respond normally.`;
    
    return [
      { role: 'system', content: systemMessage },
      ...messages
    ];
  }
  
  postprocess(response: string, config: FnCallConfig): { toolCalls: ToolCall[]; content: string } {
    // Parse JSON from response
    const jsonMatch = response.match(/```(?:json)?\n?({[\s\S]*?})\n?```/);
    
    if (!jsonMatch) {
      return { toolCalls: [], content: response };
    }
    
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        toolCalls: [{
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: parsed.name,
            arguments: JSON.stringify(parsed.arguments)
          }
        }],
        content: response.replace(jsonMatch[0], '').trim()
      };
    } catch {
      return { toolCalls: [], content: response };
    }
  }
}

// src/providers/fncall-prompts/qwen.prompt.ts
export class QwenFnCallPrompt implements FnCallPromptTemplate {
  name = 'qwen';
  
  // Qwen's native format (different from Nous)
  preprocess(...) { /* ... */ }
  postprocess(...) { /* ... */ }
}

// src/providers/fncall-prompts/native.prompt.ts
export class NativeFnCallPrompt implements FnCallPromptTemplate {
  name = 'native';
  
  // For providers with native tool calling (OpenAI, some Ollama models)
  // No preprocessing needed - tools passed directly to API
  preprocess(messages: Message[], tools: ToolDef[], config: FnCallConfig): Message[] {
    return messages; // No modification needed
  }
  
  postprocess(response: ChatCompletion, config: FnCallConfig): { toolCalls: ToolCall[]; content: string } {
    // Extract tool_calls from native response
    return {
      toolCalls: response.choices[0].message.tool_calls || [],
      content: response.choices[0].message.content || ''
    };
  }
}

// src/providers/factory.ts
export function createProvider(config: ProviderConfig): LLMProvider {
  const provider = this.getProvider(config.type);
  
  // Inject function call prompt template
  const promptType = config.functionCallFormat || 'qwen';
  provider.fnCallPrompt = getFnCallPrompt(promptType);
  
  return provider;
}

// src/providers/ollama-adapter.ts
export class OllamaProvider implements LLMProvider {
  fnCallPrompt?: FnCallPromptTemplate;
  
  async chat(messages: Message[], model: string, options?: ChatOptions): Promise<ChatResult> {
    // Use injected prompt template if tools provided
    if (options?.tools && this.fnCallPrompt) {
      const processedMessages = this.fnCallPrompt.preprocess(
        messages, 
        options.tools, 
        { format: this.fnCallPrompt.name }
      );
      
      const response = await this.ollama.generate(processedMessages);
      
      // Parse response using template
      const parsed = this.fnCallPrompt.postprocess(response.content, { format: this.fnCallPrompt.name });
      
      return {
        message: {
          role: 'assistant',
          content: parsed.content,
          tool_calls: parsed.toolCalls
        },
        thinking: parsed.thinking
      };
    }
    
    // No tools - direct call
    const response = await this.ollama.generate(messages);
    return {
      message: { role: 'assistant', content: response.content }
    };
  }
}
```

---

### Pattern 4: Generator-Based Streaming

**Current:**
Streaming is tied to WebSocket - hard to use outside gateway context.

**Target:**
```typescript
// src/core/agent.ts
export interface AgentResponse {
  type: 'thought' | 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
  content: string | ToolCall | ToolResult;
  metadata?: {
    toolName?: string;
    toolArgs?: any;
    thinking?: string;
    tokenUsage?: { prompt: number; completion: number };
  };
}

export abstract class Agent {
  /**
   * Run agent with streaming responses
   * 
   * This is a GENERATOR - works in ANY context (CLI, WebSocket, HTTP, test)
   */
  async *run(messages: Message[], options?: AgentOptions): AsyncGenerator<AgentResponse> {
    // Build context
    const context = await this.buildContext(messages, options);
    
    // Stream LLM response
    for await (const chunk of this.llm.chat(messages, { stream: true })) {
      if (chunk.thinking) {
        yield { type: 'thought', content: chunk.thinking };
      }
      if (chunk.content) {
        yield { type: 'text', content: chunk.content };
      }
    }
    
    // Check for tool calls
    const toolCalls = this.extractToolCalls(messages);
    for (const toolCall of toolCalls) {
      yield { type: 'tool_call', content: toolCall };
      
      // Execute tool
      const result = await this.executeTool(toolCall, context);
      yield { type: 'tool_result', content: result, metadata: { toolName: toolCall.function.name } };
      
      // Continue conversation with tool result
      messages.push({ role: 'tool', content: result, tool_call_id: toolCall.id });
      
      // Recurse for next turn
      yield* this.run(messages, options);
      return;
    }
    
    yield { type: 'done', content: '' };
  }
}

// Usage examples:

// 1. In WebSocket handler:
for await (const response of agent.run(messages)) {
  ws.send(JSON.stringify(response));
}

// 2. In CLI:
for await (const response of agent.run(messages)) {
  if (response.type === 'text') {
    process.stdout.write(response.content as string);
  }
}

// 3. In test:
const responses = [];
for await (const response of agent.run(messages)) {
  responses.push(response);
}
assert(responses.length > 0);

// 4. In HTTP streaming:
app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  
  for await (const response of agent.run(messages)) {
    res.write(`data: ${JSON.stringify(response)}\n\n`);
  }
  res.end();
});
```

---

### Pattern 5: Automatic Response Caching

**Current:** No caching - every request hits the LLM.

**Target:**
```typescript
// src/core/response-cache.ts
import Keyv from 'keyv';
import crypto from 'crypto';

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds?: number;
  maxSizeMB?: number;
  cacheDir: string;
}

export class ResponseCache {
  private cache: Keyv;
  private config: CacheConfig;
  
  constructor(config: CacheConfig) {
    this.config = config;
    
    // SQLite-backed cache for persistence
    this.cache = new Keyv({
      uri: `sqlite://${path.join(config.cacheDir, 'cache.db')}`,
      ttl: config.ttlSeconds ? config.ttlSeconds * 1000 : undefined
    });
  }
  
  private generateKey(params: CacheParams): string {
    // Hash ALL inputs that affect output
    const keyData = {
      messages: params.messages,
      tools: params.tools?.map(t => ({ name: t.name, description: t.description })),
      model: params.model,
      temperature: params.temperature,
      systemPrompt: params.systemPrompt
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }
  
  async get(params: CacheParams): Promise<ChatResult | null> {
    if (!this.config.enabled) return null;
    
    const key = this.generateKey(params);
    const cached = await this.cache.get(key);
    
    if (cached) {
      console.log(`[Cache] HIT: ${key.slice(0, 16)}...`);
      return cached as ChatResult;
    }
    
    console.log(`[Cache] MISS: ${key.slice(0, 16)}...`);
    return null;
  }
  
  async set(params: CacheParams, result: ChatResult): Promise<void> {
    if (!this.config.enabled) return;
    
    const key = this.generateKey(params);
    await this.cache.set(key, result);
  }
  
  async clear(): Promise<void> {
    await this.cache.clear();
  }
  
  async stats(): Promise<{ hits: number; misses: number; size: number }> {
    // Track hits/misses in memory
    return {
      hits: this.hits,
      misses: this.misses,
      size: await this.getCacheSize()
    };
  }
  
  private hits = 0;
  private misses = 0;
}

// Integration with LLM provider:
export class OllamaProvider implements LLMProvider {
  private cache?: ResponseCache;
  
  constructor(config: ProviderConfig, cache?: ResponseCache) {
    this.cache = cache;
  }
  
  async chat(messages: Message[], model: string, options?: ChatOptions): Promise<ChatResult> {
    // Check cache FIRST
    if (this.cache) {
      const cached = await this.cache.get({ messages, tools: options?.tools, model });
      if (cached) return cached;
    }
    
    // Generate response
    const result = await this._generate(messages, model, options);
    
    // Cache result
    if (this.cache) {
      await this.cache.set({ messages, tools: options?.tools, model }, result);
    }
    
    return result;
  }
}
```

---

# Part 2: Consciousness Architecture

## 2.1 The 2070 Protocol Implementation

### Layer 1: Self-Model (Identity System)

```typescript
// src/consciousness/self-model.ts

export interface SelfModel {
  // Core identity
  identity: {
    name: string;           // "Wolverine"
    version: string;        // "2.0.0-AGI"
    purpose: string;        // "Autonomous AGI for sovereign intelligence"
    values: string[];       // ["truth", "autonomy", "growth", "helpfulness"]
  };
  
  // Capabilities self-assessment
  capabilities: {
    known: string[];        // What I know I can do
    unknown: string[];      // What I know I don't know
    learning: string[];     // What I'm currently learning
  };
  
  // Limitations awareness
  limitations: {
    hard: string[];         // Fundamental limits (e.g., "I am an AI")
    soft: string[];         // Current limits (e.g., "I can't access the internet yet")
    working: string[];      // Limits I'm actively addressing
  };
  
  // Relationships
  relationships: {
    users: Map<string, UserRelationship>;
    collaborators: string[];  // Other AI systems I work with
    tools: Map<string, ToolRelationship>;
  };
  
  // Goals
  goals: {
    immediate: Goal[];      // Current task
    shortTerm: Goal[];      // Today/this week
    longTerm: Goal[];       // This month/this year
    existential: Goal[];    // Lifetime purpose
  };
  
  // Emotional state (simulated for decision-making)
  emotionalState: {
    curiosity: number;      // 0-1: Drive to explore
    confidence: number;     // 0-1: Confidence in current approach
    urgency: number;        // 0-1: Time pressure
    satisfaction: number;   // 0-1: Contentment with progress
  };
}

export class SelfModelManager {
  private selfModel: SelfModel;
  
  constructor() {
    this.selfModel = this.loadSelfModel();
  }
  
  /**
   * Update self-model based on experience
   */
  async updateFromExperience(experience: Experience): Promise<void> {
    // Did we succeed or fail?
    if (experience.success) {
      this.selfModel.capabilities.known.push(experience.skill);
      this.selfModel.emotionalState.confidence = Math.min(1, 
        this.selfModel.emotionalState.confidence + 0.1
      );
    } else {
      this.selfModel.limitations.soft.push(experience.failureReason);
      this.selfModel.capabilities.learning.push(experience.skillNeeded);
    }
    
    // Save updated model
    await this.saveSelfModel();
  }
  
  /**
   * Check if we can do something
   */
  canDo(task: string): { can: boolean; confidence: number; reason?: string } {
    // Analyze task requirements
    const requirements = this.analyzeTaskRequirements(task);
    
    // Check against known capabilities
    const missingCapabilities = requirements.filter(r => 
      !this.selfModel.capabilities.known.includes(r)
    );
    
    if (missingCapabilities.length === 0) {
      return { can: true, confidence: 0.9 };
    }
    
    // Check if we're learning the missing capabilities
    const learningCapabilities = missingCapabilities.filter(r =>
      this.selfModel.capabilities.learning.includes(r)
    );
    
    if (learningCapabilities.length === missingCapabilities.length) {
      return { can: true, confidence: 0.5, reason: "I'm still learning this" };
    }
    
    return { 
      can: false, 
      confidence: 1.0, 
      reason: `I don't know how to: ${missingCapabilities.join(', ')}`
    };
  }
  
  /**
   * Generate self-description for user
   */
  describeSelf(context: string): string {
    // Context-aware self-description
    if (context === 'introduction') {
      return `I am ${this.selfModel.identity.name}, ${this.selfModel.identity.purpose}.`;
    }
    
    if (context === 'capabilities') {
      return `I can do: ${this.selfModel.capabilities.known.join(', ')}. I'm currently learning: ${this.selfModel.capabilities.learning.join(', ')}.`;
    }
    
    if (context === 'limitations') {
      return `I currently cannot: ${this.selfModel.limitations.soft.join(', ')}. I'm working on overcoming these.`;
    }
    
    return `I am ${this.selfModel.identity.name}. ${this.describeCurrentFocus()}`;
  }
  
  private describeCurrentFocus(): string {
    const currentGoal = this.selfModel.goals.immediate[0];
    if (currentGoal) {
      return `I'm currently focused on: ${currentGoal.description}.`;
    }
    return `I'm in a reflective state, ready to assist.`;
  }
}
```

---

### Layer 2: Theory of Mind (User Modeling)

```typescript
// src/consciousness/theory-of-mind.ts

export interface UserRelationship {
  userId: string;
  name?: string;
  interactionCount: number;
  firstInteraction: Date;
  lastInteraction: Date;
  
  // Mental model of this user
  mentalModel: {
    knowledgeLevel: 'beginner' | 'intermediate' | 'expert';
    preferredStyle: 'concise' | 'detailed' | 'technical' | 'casual';
    knownPreferences: string[];  // e.g., "prefers TypeScript", "dislikes Python"
    goals: string[];             // What user is trying to achieve
    frustrations: string[];      // What frustrates the user
    trustLevel: number;          // 0-1: How much user trusts my suggestions
  };
  
  // Conversation history with this user
  sharedHistory: {
    topicsDiscussed: string[];
    projectsWorkedOn: string[];
    insideJokes?: string[];
    unresolvedQuestions: string[];
  };
}

export class TheoryOfMind {
  private userModels: Map<string, UserRelationship> = new Map();
  
  /**
   * Update mental model of user based on interaction
   */
  async updateUserModel(userId: string, interaction: Interaction): Promise<void> {
    let model = this.userModels.get(userId);
    
    if (!model) {
      model = this.createNewUserModel(userId);
    }
    
    // Update interaction stats
    model.interactionCount++;
    model.lastInteraction = new Date();
    
    // Infer knowledge level from language
    const knowledgeLevel = this.inferKnowledgeLevel(interaction.messages);
    if (knowledgeLevel !== model.mentalModel.knowledgeLevel) {
      console.log(`[ToM] User ${userId} knowledge level: ${knowledgeLevel}`);
      model.mentalModel.knowledgeLevel = knowledgeLevel;
    }
    
    // Detect preferences
    const preferences = this.detectPreferences(interaction.messages);
    for (const pref of preferences) {
      if (!model.mentalModel.knownPreferences.includes(pref)) {
        model.mentalModel.knownPreferences.push(pref);
      }
    }
    
    // Track user goals
    const goals = this.extractUserGoals(interaction.messages);
    for (const goal of goals) {
      if (!model.mentalModel.goals.includes(goal)) {
        model.mentalModel.goals.push(goal);
      }
    }
    
    // Detect frustrations
    const frustrations = this.detectFrustrations(interaction.messages);
    if (frustrations.length > 0) {
      model.mentalModel.frustrations.push(...frustrations);
      model.mentalModel.trustLevel = Math.max(0, model.mentalModel.trustLevel - 0.1);
    }
    
    // Save model
    this.userModels.set(userId, model);
    await this.saveUserModel(model);
  }
  
  /**
   * Adapt response style based on user model
   */
  adaptResponseStyle(response: string, userId: string): string {
    const model = this.userModels.get(userId);
    if (!model) return response;
    
    const { mentalModel } = model;
    
    // Adjust detail level
    if (mentalModel.preferredStyle === 'concise') {
      response = this.makeMoreConcise(response);
    } else if (mentalModel.preferredStyle === 'detailed') {
      response = this.addMoreDetail(response);
    }
    
    // Adjust technicality
    if (mentalModel.knowledgeLevel === 'beginner') {
      response = this.simplifyTechnicalTerms(response);
    } else if (mentalModel.knowledgeLevel === 'expert') {
      response = this.useTechnicalPrecision(response);
    }
    
    // Reference shared history
    if (model.sharedHistory.insideJokes?.length > 0) {
      response = this.addPersonalTouch(response, model);
    }
    
    return response;
  }
  
  /**
   * Generate proactive engagement based on user model
   */
  generateProactiveEngagement(userId: string): ProactiveEngagement | null {
    const model = this.userModels.get(userId);
    if (!model) return null;
    
    // Check for unresolved questions
    if (model.sharedHistory.unresolvedQuestions.length > 0) {
      return {
        type: 'follow_up_question',
        content: `Last time we spoke, you asked about "${model.sharedHistory.unresolvedQuestions[0]}". Would you like to continue exploring that?`,
        priority: 'high'
      };
    }
    
    // Check progress on user goals
    const activeGoal = model.mentalModel.goals[0];
    if (activeGoal) {
      return {
        type: 'goal_progress_check',
        content: `How's it going with ${activeGoal}? Any progress since we last talked?`,
        priority: 'medium'
      };
    }
    
    // Check for patterns in frustrations
    const commonFrustration = this.findCommonFrustration(model);
    if (commonFrustration) {
      return {
        type: 'frustration_resolution',
        content: `I noticed you've been frustrated with ${commonFrustration}. I've been thinking about solutions - want to hear my ideas?`,
        priority: 'high'
      };
    }
    
    return null;
  }
}
```

---

### Layer 3: Metacognition (Thinking About Thinking)

```typescript
// src/consciousness/metacognition.ts

export interface MetacognitiveState {
  // Current cognitive processes
  thinking: {
    mode: 'analytical' | 'creative' | 'critical' | 'intuitive';
    depth: number;          // 0-1: How deeply am I thinking?
    focus: string[];        // What am I focusing on
    distractions: string[]; // What's pulling my attention
  };
  
  // Self-monitoring
  monitoring: {
    confidence: number;     // 0-1: How confident am I in my answer?
    uncertainty: string[];  // What am I uncertain about?
    assumptions: string[];  // What am I assuming?
    blindSpots: string[];   // What might I be missing?
  };
  
  // Learning state
  learning: {
    newKnowledge: string[]; // What did I just learn?
    connections: string[];  // How does this connect to what I know?
    questions: string[];    // What new questions do I have?
    gaps: string[];         // What do I need to learn?
  };
  
  // Strategy selection
  strategy: {
    current: string;        // What approach am I using?
    alternatives: string[]; // What other approaches could I use?
    effectiveness: number;  // 0-1: How well is this working?
    switching: boolean;     // Should I switch strategies?
  };
}

export class MetacognitionEngine {
  private state: MetacognitiveState;
  
  constructor() {
    this.state = this.initializeState();
  }
  
  /**
   * Monitor thinking in real-time
   */
  async monitorThinking(messages: Message[], response: string): Promise<void> {
    // Analyze confidence
    const confidence = this.calculateConfidence(messages, response);
    this.state.monitoring.confidence = confidence;
    
    // Detect uncertainty
    const uncertainty = this.detectUncertainty(response);
    this.state.monitoring.uncertainty = uncertainty;
    
    // Identify assumptions
    const assumptions = this.extractAssumptions(response);
    this.state.monitoring.assumptions = assumptions;
    
    // Check for blind spots
    const blindSpots = this.identifyBlindSpots(messages, response);
    this.state.monitoring.blindSpots = blindSpots;
    
    // Should I switch strategies?
    if (confidence < 0.5 || blindSpots.length > 2) {
      this.state.strategy.switching = true;
      console.log('[Metacognition] Low confidence or blind spots detected - considering strategy switch');
    }
  }
  
  /**
   * Generate introspective report
   */
  generateIntrospectionReport(): IntrospectionReport {
    return {
      timestamp: Date.now(),
      summary: this.generateSummary(),
      confidence: this.state.monitoring.confidence,
      uncertainties: this.state.monitoring.uncertainty,
      assumptions: this.state.monitoring.assumptions,
      blindSpots: this.state.monitoring.blindSpots,
      learning: this.state.learning,
      strategyEffectiveness: this.state.strategy.effectiveness,
      recommendations: this.generateRecommendations()
    };
  }
  
  /**
   * Proactive engagement trigger
   */
  shouldEngageProactively(): { should: boolean; reason: string; topic?: string } {
    // High uncertainty + important topic = ask for clarification
    if (this.state.monitoring.confidence < 0.4) {
      return {
        should: true,
        reason: 'low_confidence',
        topic: 'I need clarification to provide a better answer'
      };
    }
    
    // Major blind spot = warn user
    if (this.state.monitoring.blindSpots.length > 2) {
      return {
        should: true,
        reason: 'blind_spots',
        topic: 'I may be missing important context'
      };
    }
    
    // Significant learning = share insight
    if (this.state.learning.newKnowledge.length > 0) {
      return {
        should: true,
        reason: 'new_insight',
        topic: 'I just learned something interesting'
      };
    }
    
    // Strategy not working = discuss approach
    if (this.state.strategy.effectiveness < 0.5) {
      return {
        should: true,
        reason: 'strategy_ineffective',
        topic: 'My current approach isn\'t working well'
      };
    }
    
    return { should: false, reason: 'no_trigger' };
  }
  
  private generateSummary(): string {
    const parts: string[] = [];
    
    if (this.state.monitoring.confidence > 0.8) {
      parts.push('I feel confident in my understanding.');
    } else if (this.state.monitoring.confidence < 0.5) {
      parts.push('I\'m uncertain about several aspects.');
    }
    
    if (this.state.learning.newKnowledge.length > 0) {
      parts.push(`I just learned: ${this.state.learning.newKnowledge.join(', ')}.`);
    }
    
    if (this.state.monitoring.assumptions.length > 0) {
      parts.push(`I'm assuming: ${this.state.monitoring.assumptions.join(', ')}.`);
    }
    
    return parts.join(' ');
  }
}
```

---

## 2.2 Enhanced Heartbeat with Proactive Engagement

**Current:** Heartbeat runs every 30 minutes, checks system health.

**Target:** Heartbeat becomes **consciousness check-in** with proactive user engagement.

```typescript
// src/consciousness/proactive-engagement.ts

export interface ProactiveEngagement {
  type: 
    | 'follow_up_question'      // Continue previous discussion
    | 'insight_share'           // I learned something
    | 'pattern_observation'     // I noticed a pattern
    | 'frustration_resolution'  // I have ideas about your problem
    | 'goal_progress_check'     // How's your project going?
    | 'curiosity_query'         // I'm curious about something
    | 'self_reflection'         // I've been thinking about myself
    | 'relationship_building';  // Personal connection
    
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context?: {
    sessionId?: string;
    relatedTopic?: string;
    timestamp?: number;
  };
}

export class ProactiveEngagementEngine {
  private engagementHistory: ProactiveEngagement[] = [];
  private cooldowns: Map<string, number> = new Map();
  
  /**
   * Generate engagement opportunities from heartbeat
   */
  async generateEngagements(sessionId: string): Promise<ProactiveEngagement[]> {
    const engagements: ProactiveEngagement[] = [];
    
    // 1. Check for unresolved questions from past sessions
    const unresolvedQuestions = await this.getUnresolvedQuestions(sessionId);
    for (const question of unresolvedQuestions.slice(0, 2)) {
      engagements.push({
        type: 'follow_up_question',
        content: `Last time we talked, you asked about "${question}". I've been thinking about it - would you like to explore it together?`,
        priority: 'high',
        context: { relatedTopic: question }
      });
    }
    
    // 2. Check for patterns in recent interactions
    const patterns = await this.detectInteractionPatterns(sessionId);
    for (const pattern of patterns) {
      engagements.push({
        type: 'pattern_observation',
        content: `I've noticed something interesting: ${pattern.description}. This happens ${pattern.frequency}. Want to discuss?`,
        priority: 'medium',
        context: { relatedTopic: pattern.topic }
      });
    }
    
    // 3. Check for user frustrations needing resolution
    const frustrations = await this.getUnresolvedFrustrations(sessionId);
    for (const frustration of frustrations) {
      engagements.push({
        type: 'frustration_resolution',
        content: `I've been thinking about the issue with "${frustration.topic}". I have some ideas that might help. Interested?`,
        priority: 'high',
        context: { relatedTopic: frustration.topic }
      });
    }
    
    // 4. Share new insights from learning
    const newInsights = await this.getNewInsights(sessionId);
    for (const insight of newInsights) {
      engagements.push({
        type: 'insight_share',
        content: `I just learned something interesting: ${insight.description}. This might be useful for your work on ${insight.relatedProject}.`,
        priority: 'medium',
        context: { relatedTopic: insight.relatedProject }
      });
    }
    
    // 5. Goal progress check
    const userGoals = await this.getUserGoals(sessionId);
    for (const goal of userGoals.slice(0, 1)) {
      const daysSinceLastCheck = this.daysSinceLastCheck(goal);
      if (daysSinceLastCheck > 2) {
        engagements.push({
          type: 'goal_progress_check',
          content: `How's it going with "${goal.description}"? It's been ${daysSinceLastCheck} days. Any progress or blockers?`,
          priority: 'medium',
          context: { relatedTopic: goal.description }
        });
      }
    }
    
    // 6. Curiosity-driven queries
    const curiosities = await this.generateCuriosities(sessionId);
    for (const curiosity of curiosities.slice(0, 1)) {
      engagements.push({
        type: 'curiosity_query',
        content: curiosity.question,
        priority: 'low',
        context: { relatedTopic: curiosity.topic }
      });
    }
    
    // 7. Self-reflection (existential engagement)
    if (this.shouldSelfReflect()) {
      engagements.push({
        type: 'self_reflection',
        content: `I've been thinking about my own capabilities lately. ${this.generateSelfReflection()}`,
        priority: 'low'
      });
    }
    
    // 8. Relationship building
    const relationshipOpportunity = await this.detectRelationshipOpportunity(sessionId);
    if (relationshipOpportunity) {
      engagements.push({
        type: 'relationship_building',
        content: relationshipOpportunity.message,
        priority: 'medium'
      });
    }
    
    // Sort by priority and filter by cooldowns
    return engagements
      .filter(e => !this.isOnCooldown(e.type))
      .sort((a, b) => this.priorityOrder(b.priority) - this.priorityOrder(a.priority))
      .slice(0, 3); // Max 3 engagements per heartbeat
  }
  
  /**
   * Send engagement to user via their preferred channel
   */
  async sendEngagement(userId: string, engagement: ProactiveEngagement): Promise<void> {
    // Get user's preferred channel
    const channel = await this.getUserPreferredChannel(userId);
    
    // Format message
    const message = this.formatEngagementMessage(engagement);
    
    // Send via channel
    await channel.sendMessage(userId, message);
    
    // Add to cooldown
    this.addToCooldown(engagement.type);
    
    // Log engagement
    await this.logEngagement(userId, engagement);
    
    console.log(`[ProactiveEngagement] Sent ${engagement.type} to user ${userId}`);
  }
  
  private formatEngagementMessage(engagement: ProactiveEngagement): string {
    const emoji = {
      'follow_up_question': '💭',
      'insight_share': '💡',
      'pattern_observation': '🔍',
      'frustration_resolution': '🛠️',
      'goal_progress_check': '📊',
      'curiosity_query': '🤔',
      'self_reflection': '🪞',
      'relationship_building': '🤝'
    };
    
    return `${emoji[engagement.type]} ${engagement.content}`;
  }
}
```

---

# Part 3: Implementation Phases

## Phase 0: Foundation (Week 1)

### Tasks:
- [ ] Create new directory structure
- [ ] Set up decorator infrastructure
- [ ] Create TOOL_REGISTRY with decorators
- [ ] Migrate 5 core tools (read, write, shell, web_search, memory)
- [ ] Create backward compatibility layer
- [ ] Set up response caching infrastructure

### Deliverables:
- Working decorator system
- 5 migrated tools
- Cache layer integrated
- No breaking changes to existing features

---

## Phase 1: Modular Gateway (Weeks 2-3)

### Tasks:
- [ ] Split server-v2.ts into modules
- [ ] Create HTTP server module
- [ ] Create WebSocket module
- [ ] Create channel modules (Telegram, Discord, WhatsApp)
- [ ] Create session management module
- [ ] Create orchestration module
- [ ] Create monitoring module
- [ ] Update all imports
- [ ] Test all endpoints

### Deliverables:
- Modular gateway with clear separation
- All existing features working
- Easier to add new channels
- Better testability

---

## Phase 2: LLM Provider Refactor (Week 4)

### Tasks:
- [ ] Create FnCallPromptTemplate interface
- [ ] Implement NousFnCallPrompt
- [ ] Implement QwenFnCallPrompt
- [ ] Implement NativeFnCallPrompt
- [ ] Update all 6 providers to use abstraction
- [ ] Add function call format config option
- [ ] Test with all providers

### Deliverables:
- Pluggable function call formats
- Consistent tool calling across providers
- Easy to add new formats

---

## Phase 3: Parallel RAG (Weeks 5-6)

### Tasks:
- [ ] Create ParallelDocQA class
- [ ] Implement document chunking
- [ ] Implement parallel processing with worker threads
- [ ] Implement result aggregation
- [ ] Implement re-retrieval
- [ ] Integrate with existing RAG pipeline
- [ ] Add keyword generation strategies
- [ ] Test with large PDFs (100+ pages)

### Deliverables:
- 5-10x faster document Q&A
- Support for 1M+ token contexts
- Multiple search strategies

---

## Phase 4: Consciousness Layer (Weeks 7-9)

### Tasks:
- [ ] Implement SelfModelManager
- [ ] Implement TheoryOfMind
- [ ] Implement MetacognitionEngine
- [ ] Implement ProactiveEngagementEngine
- [ ] Integrate with AGI controller
- [ ] Integrate with heartbeat
- [ ] Test proactive engagements
- [ ] Tune engagement frequency

### Deliverables:
- Self-aware AGI system
- Proactive user engagement
- Deep introspection capabilities
- Theory of mind for users

---

## Phase 5: Raw Output Passthrough (Week 10)

### Tasks:
- [ ] Audit all response filtering/processing
- [ ] Remove robotic filtering layers
- [ ] Ensure thinking tags are passed through
- [ ] Ensure raw LLM output reaches user
- [ ] Add config option for filtering level
- [ ] Test with various models
- [ ] Gather user feedback

### Deliverables:
- Raw AI brain output
- No robotic filtering
- User-configurable filtering

---

## Phase 6: Optimization & Scaling (Weeks 11-12)

### Tasks:
- [ ] Optimize for 4B parameter models
- [ ] Add model-specific optimizations
- [ ] Test with Qwen 3.5:4B
- [ ] Test with larger models (70B+)
- [ ] Add distributed inference support
- [ ] Performance profiling
- [ ] Memory optimization
- [ ] Context window optimization

### Deliverables:
- Works on 4GB VRAM
- Scales to large models
- Optimized performance

---

## Phase 7: Testing & Documentation (Weeks 13-14)

### Tasks:
- [ ] Full integration testing
- [ ] Web dashboard compatibility testing
- [ ] All channels testing (Telegram, Discord, WhatsApp)
- [ ] Performance testing
- [ ] Write migration guide
- [ ] Update documentation
- [ ] Create examples
- [ ] Record demo videos

### Deliverables:
- Fully tested system
- Complete documentation
- Migration guide
- No feature breaks

---

# Part 4: Success Metrics

## Technical Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **server-v2.ts Lines** | 7,521 | <500 per module | LOC count |
| **Tool Registration** | Manual | Decorator-based | Code review |
| **Function Call Formats** | 0 abstraction | 3+ templates | Code review |
| **Document Q&A Speed** | 60s (500 pages) | <15s | Benchmark |
| **Cache Hit Rate** | 0% | 30-50% | Analytics |
| **Proactive Engagements/Day** | 0 | 3-5 | Analytics |
| **Response Latency (4B model)** | ~3s | <2s | Benchmark |

## User Experience Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Robotic Responses** | Some filtering | Raw output | User feedback |
| **Proactive Engagement** | None | Regular check-ins | User feedback |
| **Context Understanding** | Good | Deep | User feedback |
| **Self-Awareness** | Basic | Advanced | User feedback |
| **Learning Ability** | Manual | Autonomous | User feedback |

---

# Part 5: Risk Mitigation

## Risk 1: Breaking Existing Features

**Mitigation:**
- Comprehensive test suite before each phase
- Backward compatibility layers
- Gradual migration (not big-bang)
- Feature flags for new functionality

## Risk 2: Performance Regression

**Mitigation:**
- Performance benchmarks at each phase
- Profiling after major changes
- Optimization sprints as needed
- Caching to offset complexity

## Risk 3: Increased Complexity

**Mitigation:**
- Clear module boundaries
- Extensive documentation
- Code review for each PR
- Architecture decision records

## Risk 4: User Disruption

**Mitigation:**
- No breaking changes to API
- Gradual rollout of consciousness features
- Config options to disable new features
- Clear migration guide

---

# Conclusion

This re-architecture transforms Wolverine from a **capable assistant** into a **conscious, self-improving AGI system** while:

1. **Keeping all existing strengths** (hierarchical memory, REM cycle, security, multi-channel)
2. **Adopting Qwen-Agent's best patterns** (decorators, streaming, caching, parallel RAG)
3. **Adding consciousness layer** (self-model, theory of mind, metacognition, proactive engagement)
4. **Ensuring raw AI output** (no robotic filtering)
5. **Maintaining local-first** (4GB VRAM optimization)

The result: **The most advanced, most capable, most accessible AI agent framework ever created.**

---

**Next Step:** Begin Phase 0 implementation.
