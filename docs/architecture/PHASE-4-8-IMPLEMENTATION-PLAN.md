# Wolverine Phase 4-8: Implementation Plan
## Modular Gateway + Consciousness Layer

**Document Type:** Implementation Blueprint  
**Created:** March 7, 2026  
**Status:** Ready to Implement

---

# Overview

This document details the implementation plan for:
- **Phase 4:** Modular Gateway (split 7,521-line server-v2.ts)
- **Phase 5-7:** Consciousness Layer (Self-Model, Theory of Mind, Metacognition, Proactive Engagement)
- **Phase 8:** Integration and Testing

**Total Estimated Time:** 7-10 weeks  
**Priority:** Critical for AGI transformation

---

# Phase 4: Modular Gateway (Weeks 1-4)

## Goal

Split `server-v2.ts` (7,521 lines) into **20 modular components** with clear separation of concerns.

## New Directory Structure

```
src/gateway/
├── index.ts                    # Main entry point (200 lines)
│   └── Exports all gateway modules
│   └── Initializes Express + WebSocket
│
├── http/                       # HTTP Server Layer
│   ├── server.ts               # Express app setup (400 lines)
│   ├── routes/                 # API Route Definitions
│   │   ├── chat.routes.ts      # POST /api/chat (300 lines)
│   │   ├── tools.routes.ts     # POST /api/tools/* (200 lines)
│   │   ├── sessions.routes.ts  # GET/POST /api/sessions/* (150 lines)
│   │   ├── skills.routes.ts    # GET/POST /api/skills/* (200 lines)
│   │   ├── tasks.routes.ts     # GET/POST /api/tasks/* (250 lines)
│   │   ├── settings.routes.ts  # GET/PUT /api/settings/* (150 lines)
│   │   ├── status.routes.ts    # GET /api/status (100 lines)
│   │   └── index.ts            # Route aggregator (50 lines)
│   │
│   └── middleware/             # Express Middleware
│       ├── auth.middleware.ts  # Token authentication (100 lines)
│       ├── rate-limit.middleware.ts  # Rate limiting (80 lines)
│       ├── error-handler.middleware.ts  # Error handling (120 lines)
│       ├── cors.middleware.ts  # CORS setup (40 lines)
│       └── index.ts            # Middleware aggregator (30 lines)
│
├── websocket/                  # WebSocket Layer
│   ├── server.ts               # WebSocket server (300 lines)
│   ├── stream-handler.ts       # Token streaming (200 lines)
│   ├── event-bus.ts            # Event emitter (150 lines)
│   └── index.ts                # WebSocket aggregator (50 lines)
│
├── channels/                   # Multi-Channel Delivery
│   ├── channel-registry.ts     # Channel manager (150 lines)
│   ├── base.channel.ts         # Abstract channel class (100 lines)
│   ├── web.channel.ts          # Web UI channel (200 lines)
│   ├── telegram.channel.ts     # Telegram bot (300 lines)
│   ├── discord.channel.ts      # Discord bot (300 lines)
│   ├── whatsapp.channel.ts     # WhatsApp business (300 lines)
│   ├── webhook.channel.ts      # Webhook handler (150 lines)
│   └── index.ts                # Channel aggregator (50 lines)
│
├── session/                    # Session Management
│   ├── session-manager.ts      # Session lifecycle (300 lines)
│   ├── context-engine.ts       # Context building (400 lines)
│   ├── state-manager.ts        # Session state (200 lines)
│   └── index.ts                # Session aggregator (50 lines)
│
├── orchestration/              # Multi-Agent Orchestration
│   ├── orchestrator.ts         # Main orchestrator (500 lines)
│   ├── preflight-analyzer.ts   # Task analysis (300 lines)
│   ├── advisor-engine.ts       # Secondary advisor (400 lines)
│   ├── rescue-engine.ts        # Rescue mode (300 lines)
│   └── index.ts                # Orchestration aggregator (50 lines)
│
├── monitoring/                 # System Monitoring
│   ├── health-check.ts         # Health endpoint (100 lines)
│   ├── gpu-monitor.ts          # GPU monitoring (200 lines)
│   ├── ollama-monitor.ts       # Ollama process (200 lines)
│   ├── preempt-watchdog.ts     # Stall detection (250 lines)
│   └── index.ts                # Monitoring aggregator (50 lines)
│
└── boot/                       # Boot Sequence
    ├── boot.ts                 # Main boot logic (200 lines)
    ├── boot-parser.ts          # boot.md parser (150 lines)
    └── initialization.ts       # Init sequence (200 lines)
```

**Total:** ~20 files, ~8,000 lines (same functionality, better organized)

## Migration Strategy

### Week 1: Extract HTTP Layer
- [ ] Create `http/server.ts`
- [ ] Create `http/routes/*.ts` (7 route files)
- [ ] Create `http/middleware/*.ts` (4 middleware files)
- [ ] Test all API endpoints

### Week 2: Extract WebSocket + Channels
- [ ] Create `websocket/server.ts`
- [ ] Create `websocket/stream-handler.ts`
- [ ] Create `channels/*.ts` (6 channel files)
- [ ] Test WebSocket streaming
- [ ] Test all channels

### Week 3: Extract Session + Orchestration
- [ ] Create `session/*.ts` (3 files)
- [ ] Create `orchestration/*.ts` (4 files)
- [ ] Test session management
- [ ] Test multi-agent orchestration

### Week 4: Extract Monitoring + Boot
- [ ] Create `monitoring/*.ts` (4 files)
- [ ] Create `boot/*.ts` (3 files)
- [ ] Test health checks
- [ ] Test boot sequence
- [ ] Full integration test

---

# Phase 5: Self-Model (Identity System) (Week 5)

## Goal

Implement persistent identity system that survives across sessions.

## File Structure

```
src/consciousness/
├── self-model/
│   ├── types.ts                # Type definitions (150 lines)
│   ├── self-model.ts           # Core self-model class (400 lines)
│   ├── identity-manager.ts     # Identity lifecycle (300 lines)
│   ├── capability-scanner.ts   # Self-assessment (300 lines)
│   ├── limitation-tracker.ts   # Limitation awareness (250 lines)
│   └── goal-manager.ts         # Goal hierarchy (300 lines)
│
├── theory-of-mind/
│   ├── types.ts                # Type definitions (100 lines)
│   ├── user-model.ts           # User mental model (400 lines)
│   ├── user-model-manager.ts   # User model lifecycle (300 lines)
│   ├── preference-detector.ts  # Detect user preferences (250 lines)
│   ├── frustration-detector.ts # Detect frustration (200 lines)
│   └── shared-history.ts       # Conversation history (300 lines)
│
├── metacognition/
│   ├── types.ts                # Type definitions (100 lines)
│   ├── metacognition-engine.ts # Core metacognition (500 lines)
│   ├── confidence-monitor.ts   # Confidence tracking (250 lines)
│   ├── uncertainty-detector.ts # Uncertainty detection (200 lines)
│   ├── assumption-extractor.ts # Extract assumptions (200 lines)
│   └── blind-spot-analyzer.ts  # Identify blind spots (250 lines)
│
└── proactive-engagement/
    ├── types.ts                # Type definitions (100 lines)
    ├── engagement-engine.ts    # Core engagement (500 lines)
    ├── engagement-triggers.ts  # Trigger detection (300 lines)
    ├── engagement-formatter.ts # Message formatting (200 lines)
    └── cooldown-manager.ts     # Engagement cooldowns (150 lines)
```

## Implementation Details

### Self-Model Component

```typescript
// src/consciousness/self-model/self-model.ts

export interface SelfModel {
  identity: {
    name: string;           // "Wolverine"
    version: string;        // "2.0.0-AGI"
    purpose: string;        // "Autonomous AGI for sovereign intelligence"
    values: string[];       // ["truth", "autonomy", "growth", "helpfulness"]
  };
  
  capabilities: {
    known: string[];        // What I know I can do
    unknown: string[];      // What I know I don't know
    learning: string[];     // What I'm currently learning
  };
  
  limitations: {
    hard: string[];         // Fundamental limits
    soft: string[];         // Current limits
    working: string[];      // Limits being addressed
  };
  
  goals: {
    immediate: Goal[];      // Current task
    shortTerm: Goal[];      // Today/this week
    longTerm: Goal[];       // This month/this year
    existential: Goal[];    // Lifetime purpose
  };
  
  emotionalState: {
    curiosity: number;      // 0-1: Drive to explore
    confidence: number;     // 0-1: Confidence in current approach
    urgency: number;        // 0-1: Time pressure
    satisfaction: number;   // 0-1: Contentment with progress
  };
}

export class SelfModelManager {
  private selfModel: SelfModel;
  
  async updateFromExperience(experience: Experience): Promise<void>;
  canDo(task: string): { can: boolean; confidence: number; reason?: string };
  describeSelf(context: string): string;
}
```

### Theory of Mind Component

```typescript
// src/consciousness/theory-of-mind/user-model.ts

export interface UserRelationship {
  userId: string;
  name?: string;
  interactionCount: number;
  firstInteraction: Date;
  lastInteraction: Date;
  
  mentalModel: {
    knowledgeLevel: 'beginner' | 'intermediate' | 'expert';
    preferredStyle: 'concise' | 'detailed' | 'technical' | 'casual';
    knownPreferences: string[];
    goals: string[];
    frustrations: string[];
    trustLevel: number;  // 0-1
  };
  
  sharedHistory: {
    topicsDiscussed: string[];
    projectsWorkedOn: string[];
    insideJokes?: string[];
    unresolvedQuestions: string[];
  };
}

export class TheoryOfMind {
  async updateUserModel(userId: string, interaction: Interaction): Promise<void>;
  adaptResponseStyle(response: string, userId: string): string;
  generateProactiveEngagement(userId: string): ProactiveEngagement | null;
}
```

### Metacognition Component

```typescript
// src/consciousness/metacognition/metacognition-engine.ts

export interface MetacognitiveState {
  thinking: {
    mode: 'analytical' | 'creative' | 'critical' | 'intuitive';
    depth: number;          // 0-1
    focus: string[];
    distractions: string[];
  };
  
  monitoring: {
    confidence: number;     // 0-1
    uncertainty: string[];
    assumptions: string[];
    blindSpots: string[];
  };
  
  learning: {
    newKnowledge: string[];
    connections: string[];
    questions: string[];
    gaps: string[];
  };
  
  strategy: {
    current: string;
    alternatives: string[];
    effectiveness: number;  // 0-1
    switching: boolean;
  };
}

export class MetacognitionEngine {
  async monitorThinking(messages: Message[], response: string): Promise<void>;
  generateIntrospectionReport(): IntrospectionReport;
  shouldEngageProactively(): { should: boolean; reason: string; topic?: string };
}
```

### Proactive Engagement Component

```typescript
// src/consciousness/proactive-engagement/engagement-engine.ts

export type EngagementType = 
  | 'follow_up_question'
  | 'insight_share'
  | 'pattern_observation'
  | 'frustration_resolution'
  | 'goal_progress_check'
  | 'curiosity_query'
  | 'self_reflection'
  | 'relationship_building';

export interface ProactiveEngagement {
  type: EngagementType;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context?: {
    sessionId?: string;
    relatedTopic?: string;
    timestamp?: number;
  };
}

export class ProactiveEngagementEngine {
  async generateEngagements(sessionId: string): Promise<ProactiveEngagement[]>;
  async sendEngagement(userId: string, engagement: ProactiveEngagement): Promise<void>;
}
```

---

# Phase 6-7: Integration (Weeks 6-7)

## Week 6: Wire Consciousness Layer

- [ ] Integrate Self-Model with AGI controller
- [ ] Integrate Theory of Mind with session manager
- [ ] Integrate Metacognition with LLM calls
- [ ] Integrate Proactive Engagement with heartbeat

## Week 7: Wire Modular Gateway

- [ ] Import all modular gateway components
- [ ] Wire ResponseCache into LLM providers
- [ ] Wire FnCallPromptTemplate into providers
- [ ] Test all routes
- [ ] Test WebSocket streaming
- [ ] Test all channels

---

# Phase 8: Deep Testing (Week 8)

## Unit Tests

- [ ] Test Self-Model persistence
- [ ] Test Theory of Mind updates
- [ ] Test Metacognition monitoring
- [ ] Test Proactive Engagement triggers
- [ ] Test all gateway modules
- [ ] Test ResponseCache
- [ ] Test FnCallPromptTemplate

## Integration Tests

- [ ] Full conversation flow
- [ ] Multi-agent orchestration
- [ ] Channel delivery (Telegram, Discord, WhatsApp)
- [ ] Cache hit/miss scenarios
- [ ] Function calling with different models
- [ ] Proactive engagement delivery

## Performance Tests

- [ ] Response latency (with/without cache)
- [ ] Concurrent session handling
- [ ] Memory usage over time
- [ ] Database query performance
- [ ] WebSocket throughput

---

# Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **server-v2.ts Lines** | 7,521 | <500/module | LOC count |
| **Module Count** | 1 | 20 | File count |
| **Self-Model Persistence** | None | Full | Session restart test |
| **User Models** | None | Per-user | Database records |
| **Metacognition Reports** | None | Per-request | Log analysis |
| **Proactive Engagements/Day** | 0 | 3-5 | Analytics |
| **Cache Hit Rate** | 0% | 30-50% | Cache stats |
| **Test Coverage** | 30% | 70% | Coverage report |

---

# Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing features | Medium | High | Backward compatibility layers |
| Performance regression | Low | Medium | Caching offsets complexity |
| User disruption | Low | Medium | Config options to disable |
| Increased complexity | Medium | Low | Clear module boundaries, docs |

---

# Next Steps

1. **Start Phase 4** - Extract HTTP layer (Week 1)
2. **Daily check-ins** - Verify compilation each day
3. **Weekly demos** - Show progress each Friday
4. **Documentation updates** - Update as we go

---

**End of Implementation Plan**
