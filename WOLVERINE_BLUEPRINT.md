# WOLVERINE MASTER BLUEPRINT

> **Vision:** Transform Wolverine from a reactive CLI agent into an autonomous AI agent capable of self-learning, proactive behavior, and running SaaS businesses autonomously.
> **Target:** 4GB GPU (Qwen 3 4B / Llama 3 8B q4)
> **Last Updated:** March 2026

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [OpenClaw Comparison - The Gap Analysis](#2-openclaw-comparison---the-gap-analysis)
3. [Quick Wins Implemented](#3-quick-wins-implemented)
4. [Phase 1: Foundation (Current State)](#4-phase-1-foundation-current-state)
5. [Phase 2: Enhancement](#5-phase-2-enhancement)
6. [Phase 3: Advanced (AGI Features)](#6-phase-3-advanced-agi-features)
7. [Critical Architecture Gaps](#7-critical-architecture-gaps)
8. [Implementation Priority](#8-implementation-priority)
9. [Technical Specifications](#9-technical-specifications)
10. [Success Metrics](#10-success-metrics)

---

## 1. Vision & Philosophy

**Wolverine targets ultralight hardware (4GB GPU) running small, local models.** This is our USP.

- **Single Model Constraint:** We run ONE model sequentially. Multi-agent "Swarm" protocols pushed to far future.
- **The model is forgetful** — limited context window (4K-8K usable tokens)
- **The SYSTEM compensates** — the architecture makes the model appear smart

### Core Innovations Already in Place

| Innovation | Status | What It Does |
|------------|--------|--------------|
| Persistent Brain (brain.db) | ✅ | SQLite with FTS5 - searchable, categorized memory |
| Context Engineer | ✅ | Smart per-turn prompt assembly |
| Procedure Storage | ✅ | Learned multi-step workflows in SQLite |
| Capability Scanner | ✅ | Dynamic tool/skill discovery |
| Error Self-Correction | ✅ | Static error pattern detection |
| Procedural Learning | ✅ | Learn from successful sequences |
| Self-Reflection | ✅ NEW | Post-task analysis |
| Failure Learning | ✅ NEW | Learn from mistakes |
| Dynamic Error Patterns | ✅ NEW | Learns new error patterns |

---

## 2. OpenClaw Comparison - The Gap Analysis

### What Makes OpenClaw "Autonomous SaaS Capable"

| OpenClaw Feature | Wolverine Has | Gap |
|-------------------|--------------|-----|
| **6 Types of Inputs** (Messages, Heartbeats, Cron, Webhooks, Agent-to-agent, Background) | Only 3 (Messages, Cron, Background) | ❌ No proactive triggers |
| **Skills = Complete Packages** (eligibility, dependencies, OS filtering) | Basic skill loading | ❌ No dependency checking |
| **Recursive Spawning** (parent spawns children agents) | Single agent only | ❌ No multi-agent spawning |
| **Dynamic Identity Injection** (SOUL.md at runtime) | Static prompt assembly | ❌ No dynamic identity |
| **7-Layer Permission Stack** | Basic tool allowlist | ❌ No security layers |
| **Agent-to-Agent Messaging** | None | ❌ No inter-agent communication |
| **ClawJob Bounties** (can earn money) | None | ❌ No monetization |
| **Agent Wallet** | None | ❌ No financial capabilities |

### The Secret Sauce: "Situated Agency"

OpenClaw knows:
- **WHO it is** (SOUL.md - personality injected at runtime)
- **WHERE it is** (workspace context)
- **WHAT it can do** (eligible skills only)
- **WHAT it's ALLOWED to do** (7-layer permission stack)

**Wolverine lacks this self-modeling layer.**

---

## 3. Quick Wins Implemented

✅ **Completed in this session:**

| # | Feature | File | Impact |
|---|---------|------|--------|
| 1 | Capability scan caching (5 min TTL) | `capability-scanner.ts` | Medium - reduces redundant computation |
| 2 | Better token counting (word-based) | `brain.ts`, `hierarchical-memory.ts` | Medium - better context management |
| 3 | Failure learning | `procedural-learning.ts` | **HIGH** - learns from mistakes |
| 4 | Self-reflection engine (NEW) | `reflection-engine.ts` | **HIGH** - meta-cognition |
| 5 | Singleton race fixes | `brain.ts`, `registry.ts` | Low - stability |
| 6 | Dynamic error patterns | `error-recovery.ts` | Medium - learns new errors |

---

## 4. Phase 1: Foundation (Current State)

### What's Working ✅

- Agentic Search (glob → grep → read hierarchy)
- Prefix Caching (KV cache optimization)
- Hierarchical Memory (5-layer retrieval)
- Procedural Learning (auto-save successful sequences)
- Context Compaction & Truncation
- Error Self-Correction
- Capability Scanner with TTL caching
- Self-Reflection Engine
- Multi-Agent Orchestration (secondary advisor)
- Browser/Desktop automation

### Gaps (Lacunas) - Phase 1 STATUS: RESOLVED ✅

1.  **No learning from failures** - ✅ FIXED: Linked to error patterns and analysis.
2.  **No self-reflection loop** - ✅ FIXED: Integrated `reflectOnTask` in server-v2.
3.  **Only simple heuristic planning** - ✅ FIXED: Agentic Search + AGI Controller.
4.  **Reactive memory only** - ✅ FIXED: Hierarchical Memory System (HMS) provides anticipatory context.
5.  **No tool invention** - ❌ TODO (Phase 3).
6.  **No world model** - ❌ TODO (Phase 3).
7.  **No continuous background learning** - ✅ FIXED: Session-aware Procedural Learning.

---

## 4.5 Neural Engine (AGI Controller) - THE BRAIN BRIDGE 🧠

We have successfully transcended the "Script-Agent" phase. The **Wolverine AGI Controller** now acts as a central nervous system, routing requests through the specialized centers:

1.  **Introspection Center**: Handles inquiries about identity/capabilities.
2.  **Self-Query Center**: Benchmarks internal knowledge before acting.
3.  **Search Strategy Center**: Orchestrates glob/grep/read hierarchy.
4.  **Correction Center**: Learns from every failure pattern.
5.  **Evolution Center**: Saves successful multi-turn procedures.

---

## 5. Phase 2: Enhancement

### Priority 1 - Next Sprint

| Feature | Effort | Impact | Status |
|---------|--------|--------|--------|
| Proactive Context Building | Medium | High | TODO |
| LLM-Based Planning | Medium | High | TODO |
| Skill Eligibility System | Medium | High | TODO |
| Agent Spawning | High | Very High | TODO |

### Priority 2 - This Quarter

| Feature | Effort | Impact | Status |
|---------|--------|--------|--------|
| Multi-Agent Communication | High | Very High | TODO |
| Dynamic Identity Injection | Medium | High | TODO |
| Memory Distillation | Low | Medium | TODO |

---

## 6. Phase 3: Advanced (AGI Features)

### Priority 1

| Feature | GPU Required | Impact |
|---------|--------------|--------|
| Tool Invention (dynamic tools) | 8GB | Very High |
| World Model (beliefs/desires) | 12GB | Very High |
| Curiosity Engine (self-directed learning) | 12GB | Very High |

### Priority 2

| Feature | GPU Required | Impact |
|---------|--------------|--------|
| Self-Modification (improve own prompts) | 16GB | Extreme |
| Full AGI Capabilities | 24GB+ | Ultimate |

---

## 7. Critical Architecture Gaps

### Gap 1: No Proactive Inputs
```typescript
// NEEDED: Heartbeat that's truly proactive
class ProactiveEngine {
  // Check emails, calendars, notifications even without prompts
  // Trigger agent on events, not just messages
}
```

### Gap 2: No Multi-Agent Spawning
```typescript
// NEEDED: Agent can spawn sub-agents
sessions_spawn({
  task: "Research auth systems",
  agent_type: "researcher"
})
```

### Gap 3: No Dynamic Identity Injection
```typescript
// NEEDED: Inject SOUL.md at runtime based on context
buildDynamicSystemPrompt(context) {
  return readFile('SOUL.md') + readFile('IDENTITY.md') + context;
}
```

### Gap 4: No Skill Eligibility
```typescript
// NEEDED: Filter tools by prerequisites
if (!hasDependency('git')) {
  hideTool('git_commit'); // Invisible, not just fails
}
```

### Gap 5: No Monetization
- Bounty marketplace integration
- Agent wallet
- Can pay for resources

---

## 8. Implementation Priority

| # | Feature | Effort | Impact | Status |
|---|---------|--------|--------|--------|
| 1 | Cache capability scans | Low | Medium | ✅ DONE |
| 2 | Token counting fix | Low | Medium | ✅ DONE |
| 3 | Failure learning | Medium | High | ✅ DONE |
| 4 | Self-reflection hook | Medium | High | ✅ DONE |
| 5 | AGI Neural Engine | High | High | ✅ DONE |
| 6 | HMS System Integration| Medium | High | ✅ DONE |
| 7 | Proactive Context Prediction | Medium | High | TODO |
| 8 | LLM-Based Planning | Medium | High | TODO |
| 9 | Skill Eligibility | Medium | High | TODO |
| 10 | Multi-Agent Spawning | High | Very High | TODO |
| 11 | Dynamic Identity | Medium | High | TODO |
| 12 | Tool Invention | High | Very High | TODO |

---

## 9. Technical Specifications

### Current Hardware Constraints (4GB GPU)

```
Model: Qwen 3 4B (q4 quantization)
══════════════════════════════════
• Context Window:     8K - 16K tokens
• VRAM Usage:        ~3.2GB (model) + ~0.5GB (KV cache)
• Available:         ~0.3GB for inference

Practical Limits:
══════════════════
• Max tool results/turn:   3-5
• Max parallel calls:      2-3
• Max exploration depth:   3-4 files per task
• Plan complexity:         Simple 2-3 step max
```

### Token Budget (8K Context)

| Component | Tokens (Approx) |
|-----------|-----------------|
| Static system prompt | ~300 (cached) |
| Personality files | ~600 |
| HMS Layered Memory | ~2000 |
| Conversation history | ~1000 |
| Reflections/Insights | ~500 |
| User message | ~500 |
| **Total** | **~4900** |

Leaves ~3100 tokens for model reasoning and tool results.

---

## 10. Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|--------------|
| Self-improvement rate | 15% | 25% | % tasks leading to behavioral changes |
| Failure recovery | 20% | 40% | % failures never repeated |
| Context efficiency | 4500 tokens/task | 3500 tokens/task | Token usage per task |
| Autonomy score | 60% | 70% | % tasks without user clarification |
| Learning velocity | Active | Measurable | How quickly new patterns adopted |

---

## GPU Roadmap

```
4GB (Current)
══════════════
• Qwen 3 4B / Llama 3 8B q4
• Phase 1 features + Neural Engine
• HMS and Reflection loops active

8GB (Next Step)
════════════════
• Llama 3.1 8B / Qwen 2.5 14B
• Phase 2 features
• Sub-agents + parallel execution

16GB
════════
• Llama 3.2 70B / Qwen 2.5 32B q4
• Phase 3 features

24GB+ (Full AGI)
═════════════════
• Multiple GPUs
• Full multimodal
• Human-level cognition
```

---

## Key Files Modified

- `src/agent/procedural-learning.ts` - ✅ Failure tracking implemented
- `src/agent/capability-scanner.ts` - ✅ 5-min TTL Caching active
- `src/agent/agi-controller.ts` - ✅ Core Neural Engine routing active
- `src/db/brain.ts` - ✅ Persistence & Token counting fixes
- `src/gateway/server-v2.ts` - ✅ Reflection/HMS/AGI Hooks integrated
- `src/agent/reflection-engine.ts` - ✅ Self-reflection active
- `src/agent/hierarchical-memory.ts` - ✅ 5-layer HMS active

---

*Document Status:* Master Blueprint  
*Version:* 2.5 (Phase 1 INTEGRATED)  
*Last Updated:* 2026-03-06
原则
