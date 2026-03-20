# Blueprint-Wolverine: The God-Tier Agent Architecture

> A chronological master plan to build "Wolverine" from scratch—a Frankenstein system combining the absolute best features of OpenClaw, MetaClaw, AutoResearchClaw, Lossless-Claw, Chetna, and Mission Control.

**Current Status:** Phase 1-8 Fully Implemented & Intelligence Layer Beginning.

---

## 🏁 Phase 1-7: The Construction & Hardening (COMPLETE)

- [x] **Phase 1: The Foundation** - Headless Bun/TS Gateway + Tailscale + Multi-Node WebSocket Registry.
- [x] **Phase 2: The Memory Layer** - Chetna Rust Memory + Hierarchical DAG Context Compaction.
- [x] **Phase 3: The Hands** - Unified Skill Registry + Pinchtab Browser Bridge + System Shell Access.
- [x] **Phase 4: The Senses** - Telegram Voice Integration + 1fps Visual Frame Streaming.
- [x] **Phase 5: The Mind** - MadMax Idle Scheduler + Hindsight Distiller + Autonomous Skill Evolver.
- [x] **Phase 6: Governance** - Python Administrative Plane + Jinja2 Personality Templates.
- [x] **Phase 7: The Eyes** - OLED Black Telemetry Dashboard + Live Configuration Tweak Panel.

### 🛡️ Post-Audit Hardening (March 20, 2026)

- [x] **Identity Handshake**: Implemented proactive identity search before every response.
- [x] **Habit Formation**: Automatic tagging of repetitive user preferences as `habit/strategy`.
- [x] **Tool Hindsight**: Integrated pre-flight lesson lookup in `ToolHandler` to prevent repeating mistakes.
- [x] **Stability Fixes**: Resolved memory retrieval crashes and identity detection syntax errors.

---

## 🚀 Phase 8: Advanced Cognitive Autonomy (IN PROGRESS)

*Objective: Transform Wolverine into a proactive, habit-forming digital twin.*

- [x] **8.1 The "Inner Monologue" Loop**: Implemented background "Think" loop via MadMax Scheduler.
- [x] **8.2 LLM-Based Fact Extraction**: Replaced hardcoded regex patterns with intelligent LLM extraction.
- [ ] **8.3 Relational Memory Graph (Chetna Upgrade)**: Move beyond simple vector search. Implement hard links in Rust between `Rule` nodes and `Tool` nodes.
- [ ] **8.4 Multi-Agent "Side-Quests"**: Allow Wolverine to spawn child agents for long-running tasks.
- [ ] **8.5 Self-Correction RL (Judge Model)**: Implement the "Judge" pattern from MetaClaw to evaluate plans before execution.

---

## 🧠 Phase 10: Intelligence Layer (NEW - Starting Now)

*Objective: Replace hardcoded shortcuts with intelligent, LLM-powered components. Make Wolverine truly agentic.*

### Intelligence Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: PERCEPTION                                            │
│  - Intent Classification (what does user want?)                 │
│  - Sentiment Analysis (how does user feel?)                     │
│  - Entity Extraction (who, what, where, when?)                 │
│  - Context Understanding (build semantic graph)                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: REASONING                                             │
│  - ✅ Fact Extraction (LLM-based, COMPLETE)                     │
│  - Inference (imply relationships from facts)                   │
│  - Memory Linking (knowledge graph)                             │
│  - Pattern Recognition (behavior over time)                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: PLANNING                                              │
│  - Task Decomposition (break complex tasks)                     │
│  - Plan Generation (multi-step with contingencies)              │
│  - Resource Allocation (choose best tools)                      │
│  - Time Estimation (predict duration)                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: EXECUTION                                             │
│  - Dynamic Tool Selection (LLM chooses)                           │
│  - Optimal Tool Chaining (parallel where possible)             │
│  - Error Recovery (diagnose + pivot)                           │
│  - Adaptive Execution (adjust based on feedback)                │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: LEARNING                                              │
│  - Success Analysis (what worked?)                             │
│  - Failure Analysis (why did it fail?)                         │
│  - Strategy Adaptation (update approach)                        │
│  - Preference Learning (track user likes/dislikes)              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6: META-COGNITION                                        │
│  - Self-Reflection (critique own reasoning)                     │
│  - Confidence Estimation (express uncertainty)                  │
│  - Strategy Selection (choose best approach)                    │
│  - Memory Consolidation (periodically review + link)            │
└─────────────────────────────────────────────────────────────────┘
```

### Implemented Intelligence Features

| Feature | Status | Implementation | File |
|---------|--------|----------------|------|
| **LLM-Based Fact Extraction** | ✅ Done | `extractFactsWithLLM()` | `cognitive-core.ts` |
| Regex Fallback | ✅ Done | `extractFactsWithRegex()` | `cognitive-core.ts` |
| Memory Prefetch | ✅ Done | `enrichPrompt()` | `cognitive-core.ts` |

### Intelligence Features Pipeline

| Feature | Layer | Priority | GPU Tier | Complexity |
|---------|-------|----------|----------|------------|
| **Intent Classification** | 1-Perception | 1 | 1 (Low) | Low |
| **Emotional Intelligence** | 1-Perception | 2 | 1 (Low) | Low |
| **Preference Learning** | 5-Learning | 3 | 2 (Medium) | Medium |
| **Memory-Aware Context** | 2-Reasoning | 4 | 2 (Medium) | Medium |
| **Proactive Suggestions** | 2-Reasoning | 5 | 2 (Medium) | Medium |
| **Self-Reflection** | 6-Meta | 6 | 3 (High) | High |
| **Memory Consolidation** | 6-Meta | 7 | 3 (High) | High |
| **Multi-Turn Planning** | 3-Planning | 8 | 3 (High) | High |
| **Self-Evolution Engine** | 6-Meta | 9 | 4 (Enterprise) | Very High |
| **Knowledge Graph** | 2-Reasoning | 10 | 4 (Enterprise) | Very High |

---

## 🎯 GPU Tier System

*Intelligence features scale based on available GPU resources. System auto-detects capability.*

### Tier 1: No GPU / Integrated Graphics

```
Capabilities:
- Intent classification
- Emotional intelligence
- LLM-based fact extraction
- Basic memory retrieval

Models: qwen3.5:0.8b, llama3.2:1b

Latency: <5s for intelligence tasks
```

### Tier 2: Medium GPU (4GB+ VRAM)

```
All Tier 1 +:
- Preference learning
- Proactive suggestions
- Memory-aware context injection
- Behavioral pattern detection

Models: qwen3.5:4b, llama3:8b

Latency: <10s for intelligence tasks
```

### Tier 3: Strong GPU (8GB+ VRAM)

```
All Tier 2 +:
- Self-reflection after responses
- Periodic memory consolidation
- Multi-turn task planning
- Dynamic tool selection

Models: qwen3.5:8b, mistral-nemo:12b

Latency: <30s for intelligence tasks
```

### Tier 4: Enterprise GPU (16GB+ VRAM)

```
All Tiers +:
- Self-evolution engine
- Full knowledge graph construction
- Real-time learning from outcomes
- Advanced inference and reasoning

Models: qwen3.5:32b, llama3.1:70b

Latency: <60s for intelligence tasks
```

---

## 📋 Implementation Strategy

### Phase 10A: Quick Wins (Low GPU, High Impact)

**Duration:** 1-2 weeks  
**Target:** Users with weak/no GPU

#### 10A.1: Intent Classification

```typescript
// src/brain/intent-classifier.ts (NEW)

interface Intent {
  type: 'task' | 'question' | 'vent' | 'learning' | 'debug' | 'casual';
  urgency: 1 | 2 | 3 | 4 | 5;
  complexity: 'simple' | 'moderate' | 'complex';
  emotionalTone: 'neutral' | 'frustrated' | 'excited' | 'confused';
}

async classifyIntent(message: string, history: Message[]): Promise<Intent> {
  const prompt = `Classify this conversation:
  
  ${history.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}
  
  User: "${message}"
  
  Return JSON with intent classification.`;
  
  return await this.llm.complete(prompt, { schema: IntentSchema });
}
```

**Impact:** Wolverine responds differently based on user's goal and emotional state.

#### 10A.2: Emotional Intelligence

```typescript
// src/brain/emotional-context.ts (NEW)

interface EmotionalState {
  tone: 'neutral' | 'frustrated' | 'excited' | 'confused' | 'impatient';
  intensity: 1 | 2 | 3 | 4 | 5;
  needs: 'patience' | 'clarity' | 'speed' | 'support' | 'encouragement';
}

async analyzeEmotion(messages: Message[]): Promise<EmotionalState> {
  const prompt = `Analyze emotional context:
  
  ${messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}
  
  Return emotional analysis.`;
}
```

**Impact:** Wolverine adjusts tone based on user emotions.

---

### Phase 10B: Core Intelligence (Medium GPU)

**Duration:** 2-4 weeks  
**Target:** Users with 4GB+ GPU

#### 10B.1: Preference Learning Engine

```typescript
// src/brain/preference-learner.ts (NEW)

interface UserPreferences {
  communicationStyle: 'brief' | 'detailed' | 'mixed';
  technicalLevel: 'beginner' | 'intermediate' | 'expert';
  preferredTone: 'formal' | 'casual' | 'playful';
  responseFormat: 'markdown' | 'plain' | 'structured';
  learningStyle: 'visual' | 'text' | 'hands-on';
}

async updatePreferences(messages: Message[], memories: Memory[]): Promise<UserPreferences> {
  const prompt = `Analyze user preferences from conversation:
  
  ${messages.slice(-20).map(m => `${m.role}: ${m.content}`).join('\n')}
  
  Return updated preferences.`;
}
```

**Impact:** Wolverine learns how user communicates and adapts.

#### 10B.2: Memory-Aware Context Injection

```typescript
// src/brain/context-intelligence.ts (NEW)

async getRelevantMemories(context: ConversationContext): Promise<Memory[]> {
  const prompt = `Find memories relevant to this conversation:
  
  Conversation: ${context.messages.map(m => m.content).join('\n')}
  Available: ${await chetna.getAll()}
  
  Return memories with relevance scores.`;
}
```

**Impact:** Smarter memory retrieval, not just keyword matching.

---

### Phase 10C: Advanced Cognition (Strong GPU)

**Duration:** 1-2 months  
**Target:** Users with 8GB+ GPU

#### 10C.1: Self-Reflection Loop

```typescript
// src/brain/self-reflection.ts (NEW)

interface SelfReview {
  understood: boolean;
  improvements: string[];
  needsFollowUp: boolean;
  followUpQuestion?: string;
  selfCorrection?: string;
}

async reflect(response: string, context: Context): Promise<SelfReview> {
  const prompt = `Review your response:
  
  User: "${context.userMessage}"
  You: "${response}"
  
  Identify improvements and follow-ups.`;
}
```

**Impact:** Wolverine critiques own work and improves.

#### 10C.2: Multi-Turn Task Planning

```typescript
// src/brain/task-planner.ts (NEW)

interface Plan {
  steps: {
    action: string;
    tools: string[];
    successCriteria: string;
  }[];
  estimatedTime: string;
  risks: string[];
}

async planTask(task: string): Promise<Plan> {
  const prompt = `Create execution plan for: ${task}
  
  Break into steps with tools and success criteria.`;
}
```

**Impact:** Wolverine handles complex multi-step tasks intelligently.

---

### Phase 10D: Full Autonomy (Enterprise GPU)

**Duration:** 3-6 months  
**Target:** Research / Enterprise deployments

#### 10D.1: Self-Evolution Engine

```typescript
// src/brain/self-evolution.ts (NEW)

interface Evolutions {
  systemPromptUpdates: string[];
  skillImprovements: string[];
  newCapabilities: string[];
}

async evolve(): Promise<Evolutions> {
  const sessions = await this.getRecentSessions(10);
  const outcomes = await this.analyzeOutcomes(sessions);
  
  const prompt = `Analyze Wolverine's performance:
  
  ${JSON.stringify(outcomes)}
  
  Suggest improvements.`;
}
```

**Impact:** Wolverine improves itself based on experience.

#### 10D.2: Knowledge Graph

```typescript
// src/brain/knowledge-graph.ts (NEW)

interface KnowledgeGraph {
  entities: { id: string; type: string; properties: Record<string, any> }[];
  relationships: { from: string; to: string; type: string; strength: number }[];
  inferredFacts: string[];
}

async buildGraph(memories: Memory[]): Promise<KnowledgeGraph> {
  const prompt = `Build knowledge graph from:
  
  ${memories.map(m => m.content).join('\n')}
  
  Return entities, relationships, and inferred facts.`;
}
```

**Impact:** Deep understanding of user, not just facts.

---

## 🔄 Migration Strategy

### Step 1: Parallel Running

```
┌─────────────────────────────────────────────────────────────┐
│                    PARALLEL MODE                             │
│                                                              │
│  User Message → [Hardcoded] ──┬──→ Response A               │
│                   [LLM]      │                               │
│                              └──→ Response B               │
│                                                              │
│  Compare: Which is better?                                   │
│  Use better result going forward                             │
│  Measure accuracy improvement                                  │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Gradual Replacement

```
Timeline:
Week 1-2:   Implement LLM version alongside hardcoded
Week 3-4:   A/B test, gather metrics
Week 5-6:   80% LLM / 20% hardcoded fallback
Week 7-8:   100% LLM with fallback for edge cases
```

### Step 3: Full Intelligence

```
After migration:
- Hardcoded logic becomes emergency fallback
- LLM handles all cases by default
- System learns from fallback usage
- Continuous improvement over time
```

---

## 📊 Metrics & Testing

### Intelligence Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Fact Extraction Accuracy | >90% | Compare extracted vs expected |
| Intent Classification | >85% | A/B test vs hardcoded |
| Memory Recall | >95% | User queries memory test |
| Response Appropriateness | >80% | User feedback survey |
| Self-Reflection Accuracy | >75% | Manual review |

### Performance Metrics

| Tier | Latency Target | Throughput |
|------|---------------|------------|
| 1 (No GPU) | <5s | 10 req/min |
| 2 (4GB GPU) | <10s | 20 req/min |
| 3 (8GB GPU) | <30s | 5 req/min |
| 4 (16GB GPU) | <60s | 2 req/min |

---

## 🌟 Future: Collective Intelligence

Extend beyond single-user to multi-user/team:

```
┌─────────────────────────────────────────────────────────────┐
│                 COLLECTIVE INTELLIGENCE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User A ←────→ Shared Memory Graph                          │
│  User B ←────→                                              │
│  User C ←────→ Team Knowledge                               │
│                                                              │
│  Role-Based Access:                                        │
│  - Admin: Full access                                      │
│  - Developer: Project context                               │
│  - Guest: Basic info only                                 │
│                                                              │
│  Organizational Memory:                                     │
│  - Team preferences                                        │
│  - Project history                                          │
│  - Decisions and rationale                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files Reference

| File | Purpose | Phase |
|------|---------|-------|
| `src/brain/cognitive-core.ts` | Memory prefetch + fact extraction | 2, 10A |
| `src/brain/chetna-client.ts` | Chetna API client | 2 |
| `src/brain/intent-classifier.ts` | Intent detection | 10A |
| `src/brain/emotional-context.ts` | Emotional analysis | 10A |
| `src/brain/preference-learner.ts` | User preference tracking | 10B |
| `src/brain/context-intelligence.ts` | Smart memory retrieval | 10B |
| `src/brain/self-reflection.ts` | Self-critique loop | 10C |
| `src/brain/task-planner.ts` | Multi-step planning | 10C |
| `src/brain/self-evolution.ts` | Self-improvement | 10D |
| `src/brain/knowledge-graph.ts` | Knowledge representation | 10D |
| `docs/MEMORY_ARCHITECTURE.md` | Memory approach docs | All |
| `docs/INTELLIGENCE_ROADMAP.md` | Near-term priorities | 10A-C |
| `docs/FULL_INTELLIGENCE_ARCHITECTURE.md` | Complete vision | 10D |

---

## 🛠️ Current Tech Stack (March 2026)

- **Core Orchestration:** Bun (TypeScript) - Sub-millisecond I/O.
- **Intelligence:** Ollama (Local) / OpenAI / Anthropic.
- **Memory Layer:** Chetna (Rust) - Vector embeddings + Semantic search + Ebbinghaus Decay.
- **UI:** React + Vite + TailwindCSS + Lucide Icons (Polished Mission Control).
- **Background Tasks:** Python (MadMax Scheduler) + FastAPI (Governance Plane).
- **Tooling:** Pinchtab (Headless Browser) + System Shell + Telegram Voice.
- **Deployment:** Tailscale (Secure Overlay) + Docker (Planned Sandbox).
- **Intelligence Tiers:** GPU-accelerated LLM inference for advanced cognition.

---

## 🎯 Quick Start: Enable Intelligence

```bash
# Tier 1 (No GPU) - Basic intelligence
# Already working! LLM fact extraction enabled.

# Tier 2 (4GB+ GPU) - Add preferences
# Edit settings.json:
{
  "intelligence": {
    "tier": 2,
    "features": {
      "preferenceLearning": true,
      "proactiveSuggestions": true
    }
  }
}

# Tier 3 (8GB+ GPU) - Full cognition
{
  "intelligence": {
    "tier": 3,
    "features": {
      "selfReflection": true,
      "memoryConsolidation": true,
      "multiTurnPlanning": true
    }
  }
}
```
