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
10. [AGI Readiness & 10-Year Roadmap](#10-agi-readiness--10-year-roadmap)

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

| Innovation | What It Does | Status |
|------------|--------------|--------|
| **Skeleton Template System** | Auto-populates `~/.wolverine/workspace/` with SOUL.md, USER.md, etc. | ✅ |
| **Browser Automation Fix** | Enhanced detection (20+ verbs) and proactive tool injection. | ✅ |
| **Intelligent Reflection** | Binary decision (YES/NO) on user notifications only for significant events. | ✅ |
| **Pattern Recognition** | Detects repeated requests (3+ times) and proposes automation. | ✅ |
| **Failure Analysis** | Analyzes task failures and generates recovery proposals. | ✅ |
| **FAST PATH** | Bypasses complex orchestration for simple conversational queries. | ✅ |
| **Thinking Tag Processing** | Smart stripping of reasoning while preserving action-oriented content. | ✅ |
| **Persistent Brain (brain.db)** | SQLite with FTS5 - searchable, categorized memory. | ✅ |
| **HMS (Hierarchical Memory)** | 5-layer memory retrieval for anticipatory context. | ✅ |
| **Security Hardening** | Remediated CRIT-01/02/03: Path validation, Secure Vaulting, Auth gates. | ✅ |
| **REM Cycle (Stage 1-3)** | 3-stage memory consolidation (De-noising, Fact Extraction, File Sync). | ✅ |
| **Universal Launchers** | `launch.sh` (Mac/Linux) & `launch.bat` (Win) for zero-config startup. | ✅ |
| **Token Counter Fix** | Precision token tracking to prevent context overflow. | ✅ |
| **Webhook Integration** | Foundation for autonomous external triggers. | ✅ |
| **Codebase Cleanup** | Purged legacy scripts and SmallClaw remnants for Wolverine sovereignty. | ✅ |

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
- [✅] **Interactive Onboarding**: First-run wizard to personalize personality and goals.
- [✅] **Memory Consolidation**: Merge similar memories during idle time to prevent bloat.
- [✅] **REM Cycle Safeguard**: Implement "Undo REM" to restore workspace from backups if consolidation hallucinations occur.
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

### Strategic Positioning: Wolverine vs OpenClaw

**OpenClaw is an iPhone. Wolverine is a Linux Workstation.**

| Aspect | OpenClaw | Wolverine |
|--------|----------|-----------|
| **Target User** | Mass market, one-click | Technical power users |
| **Ecosystem** | 6,000+ skills (ClawHub) | Curated, code-based skills |
| **Deployment** | Cloud-first, Docker | Local-first, bare metal |
| **Unique Tech** | Standard agent loop | REM Cycle, FileOp Watchdog, Dual-Model |
| **Community** | 15K+ GitHub stars | Early adopter, quality-focused |

**Winning Strategy:**
1. Target technical users who want deep control
2. Highlight unique innovations (REM Cycle, Watchdog, Dual-Model)
3. Build community around quality, not quantity
4. Stay local-first (no cloud dependency)
5. Be Wolverine (not J.A.R.V.I.S., not OpenClaw clone)

---

### Priority Matrix (2026)

| Priority | Feature | Effort | Impact | Timeline |
|----------|---------|--------|--------|----------|
| **CRITICAL** | Browser Element Discovery | 2h | High | Week 1 |
| **CRITICAL** | Goal Decomposition | 4h | Very High | Week 1 |
| **HIGH** | Web UI Dashboard | 16h | High | Week 2 |
| **HIGH** | Skill Auto-Discovery | 8h | Very High | Week 2-3 |
| **HIGH** | Documentation Site | 12h | Medium | Week 3 |
| **MEDIUM** | Vector Memory (Embeddings) | 6h | High | Month 2 |
| **MEDIUM** | Server Refactoring | 20h | Medium | Month 2-3 |
| **LOW** | One-Click Installer | 4h | Medium | Month 3 |

---

### Phase 1: Polish Core (2 Weeks)

#### Week 1: Code Quality
- [ ] **Break up server-v2.ts** - Split into `chat/`, `api/`, `services/`, `utils/`
- [ ] **Add TypeScript interfaces** - Remove all `any` types
- [ ] **Add structured logging** - Replace `console.log` with proper logger
- [ ] **Add error types** - Create `WolverineError` hierarchy

#### Week 2: User Experience
- [ ] **Web UI Dashboard** - Show token usage, task status, memory stats
- [ ] **Skill Creator UI** - Visual skill builder (drag-drop)
- [ ] **Documentation Site** - Use VitePress or Docusaurus
- [ ] **One-Click Installer** - `curl | bash` install script

---

### Phase 2: Killer Features (1 Month)

#### Week 3-4: Autonomous Capabilities
- [ ] **Autonomous Research Agent** - Give it a topic, returns compiled report
- [ ] **Code Review Skill** - Auto-review PRs, suggest fixes
- [ ] **Daily Briefing** - Morning digest: news, tasks, insights
- [ ] **Memory Search UI** - Search across all conversations

#### Week 5-6: Community Building
- [ ] **Discord Server** - Early adopter community
- [ ] **Showcase Videos** - Demo real use cases (2-min each)
- [ ] **GitHub Examples** - Working configurations for common tasks
- [ ] **Technical Blog Posts** - "How REM Cycle Solves Small Model Amnesia"

---

### Phase 3: Market Positioning (2 Months)

#### Month 2: Content Marketing
- [ ] **Post on r/LocalLLaMA** - Technical deep dive
- [ ] **Hacker News "Show HN"** - Launch announcement
- [ ] **Twitter/X Thread** - Wolverine vs OpenClaw comparison
- [ ] **YouTube Demo** - "Watch Wolverine automate my morning briefing"

#### Month 3: Ecosystem Growth
- [ ] **Skill Templates** - Pre-built skills for common tasks
- [ ] **Community Contributions** - Accept PRs for skills
- [ ] **Integration Partners** - Connect with popular tools (Notion, Obsidian)
- [ ] **Sponsorship Program** - Support development financially

---

### Marketing Strategy (Zero Budget)

#### Content Marketing:
1. **Write technical blog posts:**
   - "How Wolverine's REM Cycle Solves Small Model Amnesia"
   - "Building a File Verification System for AI Agents"
   - "Why Dual-Model Orchestration Beats Single Large Models"

2. **Post on:**
   - r/LocalLLaMA (Reddit)
   - Hacker News
   - Lobsters
   - Twitter/X (AI dev community)

3. **Create demo videos:**
   - 2-minute "Wolverine wakes up" video
   - "Watch Wolverine automate my morning briefing"
   - "Wolverine vs OpenClaw: Technical comparison"

#### Community Engagement:
1. **Be active in:**
   - LocalLLaMA Discord
   - Ollama Discord
   - AI agent research communities

2. **Offer:**
   - Free help troubleshooting
   - Technical advice on agent architecture
   - Honest comparisons with OpenClaw

---

### Technical Debt (Must Address)

#### Critical (Do Now):
- [ ] **Modularize server-v2.ts** - Currently 7,500 lines, unmaintainable
- [ ] **Add proper TypeScript types** - Remove `any` types throughout
- [ ] **Add structured logging** - Not just `console.log`
- [ ] **Add unit tests** - At least for core logic

#### Important (This Month):
- [ ] **Add error handling** - Structured error types
- [ ] **Add metrics/monitoring** - Token usage, task success rates
- [ ] **Add circuit breakers** - Handle Ollama failures gracefully
- [ ] **Add rate limiting** - Prevent abuse on sensitive endpoints

#### Nice to Have (Later):
- [ ] **OpenAPI spec** - Document all endpoints
- [ ] **Performance profiling** - Identify bottlenecks
- [ ] **Caching layer** - Reduce redundant operations
- [ ] **Docker optimization** - Smaller image, faster startup

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

## 10. AGI Readiness & 10-Year Roadmap

**Assessment Date:** March 7, 2026  
**Current AGI Proximity:** ~25% (AGI-Adjacent)

### Technical Readiness Audit

| Dimension | Score | Status |
|-----------|-------|--------|
| **AGI Framework Architecture** | 75% | 🟢 World-Class foundation |
| **Model Intelligence (4B)** | 15% | 🔴 Critical reasoning bottleneck |
| **Memory & Learning (HMS/REM)** | 60% | 🟡 Advanced, pending vector retrieval |
| **Tool Mastery (Embodied Cognition)** | 80% | 🟢 Excellent mastery |
| **Self-Awareness** | 35% | 🟡 Simulated via prompts |

### The "Lawnmower Engine" Law
Wolverine is a Formula 1 chassis (Architecture) powered by a lawnmower engine (4B Model). The system must continuously over-engineer its scaffolding (HMS, REM Cycle, Reflection) to compensate for the model's limited reasoning depth (currently ~2-3 steps).

---

### The Three-Phase Path to AGI

#### Phase 1: Enhanced Local AGI (Current - 12 Months)
*Goal: Maximize capability within 4GB VRAM constraint.*
- [ ] **Embedding-Based Retrieval**: Phase 2 memory with vector search (brain.db + FAISS/Chroma).
- [ ] **Autonomous Skill Invention**: Self-directed workflow creation from successful execution patterns.
- [ ] **Goal Decomposition**: Break multi-hour tasks into sub-plans with persistent state tracking.
*Expected AGI Proximity: ~40%*

#### Phase 2: Hybrid Cloud-Local (12 - 24 Months)
*Goal: Leverage high-parameter cloud models for reasoning; local models for action.*
- [ ] **Cloud-Orchestrated Planning**: 70B+ models generate the "Grand Plan"; Local 4B executes the steps.
- [ ] **Cross-Instance Knowledge**: Shared episodic memory across multiple Wolverine nodes.
- [ ] **Advanced World Model**: Causal reasoning - predicting consequences before tool execution.
*Expected AGI Proximity: ~60%*

#### Phase 3: True AGI (The Horizon)
*Goal: Human-level reasoning on consumer hardware.*
- [ ] **Model Breakthrough**: 100B+ parameter capabilities on 4GB hardware (Post-Transformer architecture).
- [ ] **Genuine Self-Awareness**: Internalized self-model that manages its own recursive improvements.
- [ ] **Autonomous Goal Generation**: Transition from reactive task-runner to proactive life-partner.
*Expected AGI Proximity: 90%+*

---

*Master Blueprint Version: 2.7 (AGI ROADMAP INTEGRATED)*  
*Last Updated: 2026-03-07*
