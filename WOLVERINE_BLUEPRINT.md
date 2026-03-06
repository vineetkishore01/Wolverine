# WOLVERINE MASTER BLUEPRINT

> **Vision:** Transform Wolverine from a reactive CLI agent into an autonomous AI agent capable of self-learning, proactive behavior, and running SaaS businesses autonomously.
> **Target:** 4GB GPU (Qwen 3 4B / Llama 3 8B q4)
> **Last Updated:** March 2026

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [OpenClaw Comparison - The Gap Analysis](#2-openclaw-comparison---the-gap-analysis)
3. [Implemented Features (Phase 1)](#3-implemented-features-phase-1)
4. [Phase 2: Intelligence & Autonomy](#4-phase-2-intelligence--autonomy)
5. [Phase 3: Advanced (AGI Features)](#5-phase-3-advanced-agi-features)
6. [Critical Architecture Gaps](#6-critical-architecture-gaps)
7. [Implementation Priority](#7-implementation-priority)
8. [Technical Specifications](#8-technical-specifications)
9. [Success Metrics](#9-success-metrics)

---

## 1. Vision & Philosophy

**Wolverine targets ultralight hardware (4GB GPU) running small, local models.** This is our USP.

- **Single Model Constraint:** We run ONE model sequentially. Multi-agent "Swarm" protocols pushed to far future.
- **The model is forgetful** — limited context window (4K-8K usable tokens)
- **The SYSTEM compensates** — the architecture makes the model appear smart
- **2070 AI Behavior**: Action before explanation, intelligent notifications, and self-evolution.

---

## 2. OpenClaw Comparison - The Gap Analysis

### What Makes OpenClaw "Autonomous SaaS Capable"

| OpenClaw Feature | Wolverine Has | Status |
|-------------------|--------------|--------|
| **6 Types of Inputs** | Messages, Heartbeats, Cron, Webhooks, Background | ✅ Integrated |
| **Skills = Complete Packages** | Basic skill loading | ❌ No dependency checking |
| **Recursive Spawning** | Single agent only | ❌ No multi-agent spawning (Subagent mode in v2) |
| **Dynamic Identity Injection** | Persona files (SOUL.md, etc.) | ✅ Integrated via Workspace |
| **7-Layer Permission Stack** | Basic tool allowlist | ❌ No security layers |
| **Autonomous Skill Creation** | Pattern Recognition | 🔄 Planned |

---

## 3. Implemented Features (Phase 1) ✅

| Innovation | What It Does |
|------------|--------------|
| **Skeleton Template System** | Auto-populates `~/.wolverine/workspace/` with SOUL.md, USER.md, etc. |
| **Browser Automation Fix** | Enhanced detection (20+ verbs) and proactive tool injection. |
| **Intelligent Reflection** | Binary decision (YES/NO) on user notifications only for significant events. |
| **Pattern Recognition** | Detects repeated requests (3+ times) and proposes automation. |
| **Failure Analysis** | Analyzes task failures and generates recovery proposals. |
| **FAST PATH** | Bypasses complex orchestration for simple conversational queries. |
| **Thinking Tag Processing** | Smart stripping of reasoning while preserving action-oriented content. |
| **Persistent Brain (brain.db)** | SQLite with FTS5 - searchable, categorized memory. |
| **HMS (Hierarchical Memory)** | 5-layer memory retrieval for anticipatory context. |
| **Security Hardening** | Remediated CRIT-01/02/03: Path validation, Secure Vaulting, Auth gates. |

---

## 4. Security & Reliability (2026 Audit Remediated)

Wolverine has undergone a comprehensive security audit. The following baseline is now baked into the core:

- **Vault-Backend**: All credentials (API keys, bot tokens) are AES-256-GCM encrypted in the `.wolverine/vault/`.
- **Injection Protection**: Shell tools use proper path resolution (`path.resolve`) and relative confinement checks to prevent traversal.
- **Auth Gates**: Every API endpoint (including approvals and paths) requires the Gateway Bearer Token.
- **Log Scrubber**: A unified pipeline strips PII and secret patterns from all logs and UI responses.
- **Self-Repair Logic**: Foundations implemented for autonomous bug analysis and patch proposal (currently in Step-Verification phase).

---

## 4. Phase 2: Intelligence & Autonomy (In Progress)

### Priority 1: Advanced Browser Automation
- [ ] **`browser_click_text()`**: Click elements by visible text instead of selectors.
- [ ] **`browser_wait_for()`**: Intelligent waits for elements, URLs, or text.
- [ ] **`browser_form_fill()`**: Auto-identify and fill forms from data objects.
- [ ] **`browser_extract()`**: Smart data extraction with auto-formatting.

### Priority 2: Autonomous Evolution
- [ ] **Skill Auto-Creation**: Detect successful workflows and save them as reusable skills.
- [ ] **Goal Decomposition**: Break complex tasks into executable steps with progress tracking.
- [ ] **Interactive Onboarding**: First-run wizard to personalize personality and goals.
- [ ] **Memory Consolidation**: Merge similar memories during idle time to prevent bloat.
- [ ] **REM Cycle Safeguard**: Implement "Undo REM" to restore workspace from backups if consolidation hallucinations occur.
- [ ] **Mental Simulation (Sandbox)**: Run hidden "predicted outcome" loops before risky actions.
- [ ] **Environment Watchdogs**: Autonomously wake up on file/log changes or URL updates.
- [ ] **Semantic Knowledge Graph**: Map entity relationships (Who is X? Owner of Y) for deeper reasoning.

### Priority 3: Architecture Refinement
- [ ] **Server Refactoring**: Modularize `server-v2.ts` (currently a monolith).
- [ ] **Resource-Aware Scheduling**: Check GPU/RAM before executing heavy tasks.
- [ ] **Parallel Sub-Agents**: True multi-agent spawning for independent tasks.

---

## 5. Phase 3: Advanced (AGI Features)

- [ ] **Tool Invention**: Dynamically create new tools as needed.
- [ ] **World Model**: Maintain beliefs and desires for complex social reasoning.
- [ ] **Curiosity Engine**: Self-directed learning and environment exploration.
- [ ] **Self-Modification**: Improve own prompts and logic through recursive analysis.
- [ ] **Neuro-Plasticity**: Autonomously refine `SOUL.md` directives based on repeated user feedback.
- [ ] **Self-Provisioning**: Detect and install (npm/brew) missing dependencies for new skills.

---

## 6. Critical Architecture Gaps

1. **No Dependency Checking**: Skills can't specify required packages (git, npm, etc.).
2. **Monolithic Gateway**: `server-v2.ts` is too large for reliable maintenance.
3. **Keyword-Only Memory**: Needs vector embeddings for better semantic similarity.
4. **No Financial Layer**: Lacks agent wallet or bounty integration.

---

## 7. Implementation Roadmap

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| **CRITICAL** | Browser Element Discovery | 2h | High |
| **CRITICAL** | Goal Decomposition | 4h | Very High |
| **HIGH** | Skill Auto-Discovery | 8h | Very High |
| **HIGH** | Vector Memory (Embeddings) | 6h | High |
| **MEDIUM** | Server Refactoring | 20h | Medium |

---

## 8. Technical Specifications (4GB Target)

```
Model: Qwen 3 4B (q4 quantization)
══════════════════════════════════
• Context Window:     8K tokens (usable)
• VRAM Usage:        ~3.7GB Total
• Strategy:          System-side context management + HMS
```

### Token Budget (8K Context)

| Component | Tokens (Approx) |
|-----------|-----------------|
| Static system prompt | ~300 (cached) |
| Personality files | ~1200 |
| HMS Layered Memory | ~2000 |
| Conversation history | ~1500 |
| Reflections/Insights | ~500 |
| **Remaining (Inference)** | **~2500** |

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| **Self-Improvement Rate** | 25% of tasks lead to logic/prompt changes |
| **Failure Recovery** | 40% of errors never repeat |
| **Autonomy Score** | 70% of tasks completed without user input |
| **Browser Success** | 90%+ success on complex UI tasks |

---

*Master Blueprint Version: 2.6 (Phase 1 INTEGRATED)*  
*Last Updated: 2026-03-07*
