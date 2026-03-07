# Wolverine OBD Scanner
## Diagnostic Tool for AI Agent Systems

**Concept Document**  
**Version:** 1.0  
**Created:** March 7, 2026  
**Analogy:** Like an OBD-II scanner for cars, but for Wolverine AGI systems

---

# Executive Summary

## The Problem

As Wolverine becomes more sophisticated (modular gateway, consciousness layer, multi-agent orchestration), debugging and diagnosing issues becomes exponentially harder. When something goes wrong, users ask:

- "Why is Wolverine responding slowly?"
- "Why did it make that decision?"
- "Is my model too small?"
- "Is there a memory leak?"
- "What's happening in the consciousness layer?"
- "Why did proactive engagement fire?"

Currently, diagnosing these requires:
1. Reading multiple log files
2. Understanding internal architecture
3. Analyzing database state
4. Correlating events across modules

**This is like diagnosing a car engine by disassembling it.**

## The Solution: Wolverine OBD Scanner

A **standalone diagnostic tool** that connects to any Wolverine instance and provides:

1. **Real-time diagnostics** - Live metrics and health status
2. **Historical analysis** - What happened in past sessions
3. **Root cause analysis** - Why did X happen?
4. **Performance profiling** - Bottlenecks and optimization opportunities
5. **Consciousness introspection** - What was Wolverine "thinking"?
6. **Recommendations** - How to fix issues

---

# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Wolverine Instance (User's Machine)                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  OBD Port (Diagnostic API)                       │  │
│  │  - /api/diagnostics/health                       │  │
│  │  - /api/diagnostics/metrics                      │  │
│  │  - /api/diagnostics/consciousness                │  │
│  │  - /api/diagnostics/performance                  │  │
│  │  - WebSocket: ws://localhost:18789/diagnostics   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Diagnostic Data Sources                         │  │
│  │  - BrainDB (memories, procedures)                │  │
│  │  - Session logs                                  │  │
│  │  - Token usage stats                             │  │
│  │  - Cache stats                                   │  │
│  │  - Tool execution logs                           │  │
│  │  - Consciousness state (Self-Model, ToM, Meta)   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ USB / Network Connection
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Wolverine OBD Scanner (Separate Application)           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Connection Layer                                 │  │
│  │  - HTTP client for REST API                      │  │
│  │  - WebSocket client for streaming                │  │
│  │  - Direct database access (optional)             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Analysis Engine                                  │  │
│  │  - Health checker                                │  │
│  │  - Performance analyzer                          │  │
│  │  - Root cause analyzer                           │  │
│  │  - Pattern detector                              │  │
│  │  - Recommendation engine                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  User Interface                                   │  │
│  │  - CLI for quick diagnostics                     │  │
│  │  - Web UI for deep analysis                      │  │
│  │  - Report generator                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

# Diagnostic Capabilities

## 1. Health Check

**What it does:** Overall system health assessment

**Metrics:**
- Gateway status (running/stopped/error)
- LLM provider connectivity
- Database integrity
- Memory usage
- CPU usage
- Disk space
- Active sessions
- Tool availability

**Output:**
```
Wolverine Health Report
========================
Overall Status: ⚠️ DEGRADED

✅ Gateway: Running (port 18789)
✅ Database: Healthy (brain.db: 45MB)
⚠️ LLM Provider: Degraded (Ollama: high latency 2500ms)
✅ Cache: Active (hit rate: 42%)
⚠️ Memory: Warning (78% used, 3.1GB/4GB)
✅ Sessions: 3 active

Recommendations:
- Consider upgrading from 4GB to 8GB RAM
- Ollama response times are high - check model size
```

---

## 2. Performance Profiling

**What it does:** Identify bottlenecks and slow operations

**Metrics:**
- Request latency breakdown
- LLM call durations
- Tool execution times
- Database query performance
- Cache effectiveness
- WebSocket throughput

**Output:**
```
Performance Profile (Last 100 requests)
========================================
Average Response Time: 3.2s
P95 Response Time: 8.5s
P99 Response Time: 15.2s

Breakdown:
├─ LLM Calls: 2.8s (87%) ← BOTTLENECK
│  ├─ Time to first token: 1.5s
│  └─ Token generation: 1.3s (45 tokens/s)
├─ Tool Execution: 0.3s (9%)
│  ├─ web_search: 0.25s
│  └─ read: 0.05s
├─ Database: 0.05s (2%)
└─ Overhead: 0.05s (2%)

Slowest Operations:
1. POST /api/chat - 15.2s (model: qwen3.5:4b, tokens: 850)
2. POST /api/chat - 12.1s (model: qwen3.5:4b, tokens: 720)
3. POST /api/tools/execute - 8.5s (tool: web_search)

Recommendations:
- Model qwen3.5:4b is slow on your hardware
- Consider using qwen3.5:1.7b for faster responses
- Enable response caching (current hit rate: 42%, potential: 60%)
```

---

## 3. Root Cause Analysis

**What it does:** Explain WHY something happened

**Scenarios:**
- "Why did Wolverine fail to complete my task?"
- "Why did it choose that tool?"
- "Why was the response so slow?"
- "Why did proactive engagement fire?"

**Output:**
```
Root Cause Analysis: Task Failure
==================================
Task: "Refactor the authentication system"
Status: ❌ FAILED after 8 attempts

Timeline:
[10:00:00] Task received
[10:00:05] Planning mode activated
[10:00:10] Tool: read (auth.ts) - SUCCESS
[10:00:15] Tool: write (auth.ts) - FAILED (permission denied)
[10:00:20] Tool: write (auth.ts) - FAILED (permission denied)
[10:00:25] Rescue advisor activated
[10:00:30] Tool: run_command (sudo chmod...) - FAILED
[10:00:35] Task failed: Insufficient permissions

Root Cause:
The task required writing to /etc/auth/ which is outside
the allowed workspace path (/Users/vineetkishore/Code/Wolverine/workspace).

Contributing Factors:
1. Tool policy blocks writes outside workspace (security feature)
2. Rescue advisor couldn't bypass policy (by design)
3. No sudo capability configured

Recommendations:
- Add /etc/auth to allowed_paths in config.json (NOT RECOMMENDED)
- OR: Run Wolverine with elevated privileges (SECURITY RISK)
- OR: Refactor to work within workspace (RECOMMENDED)
```

---

## 4. Consciousness Introspection

**What it does:** Show what Wolverine was "thinking"

**Data Sources:**
- Self-Model state
- Theory of Mind (user model)
- Metacognition reports
- Proactive engagement triggers

**Output:**
```
Consciousness State (Session: abc123)
======================================
Timestamp: 2026-03-07 10:15:00

Self-Model:
├─ Identity: Wolverine v2.0.0-AGI
├─ Purpose: "Autonomous AGI for sovereign intelligence"
├─ Capabilities: 42 known, 3 learning, 8 unknown
├─ Limitations: 2 hard, 5 soft, 3 working
└─ Current Goal: "Help user refactor authentication"

Emotional State:
├─ Curiosity: 0.3 (low - focused on task)
├─ Confidence: 0.4 (medium-low - encountering errors)
├─ Urgency: 0.7 (high - multiple failures)
└─ Satisfaction: 0.2 (low - task not progressing)

Theory of Mind (User: vineetkishore):
├─ Knowledge Level: expert
├─ Preferred Style: technical
├─ Known Preferences: ["TypeScript", "local-first"]
├─ Current Frustrations: ["permission errors", "slow responses"]
└─ Trust Level: 0.7 (stable)

Metacognition Report:
├─ Thinking Mode: analytical
├─ Confidence: 0.4
├─ Uncertainties: ["Is permission issue solvable?", "Should I suggest workaround?"]
├─ Assumptions: ["User wants in-place refactor", "Workspace restriction is correct"]
└─ Blind Spots: ["User might have sudo access", "Alternative locations?"]

Proactive Engagement:
├─ Last Engagement: 2 hours ago (goal progress check)
├─ Pending Engagements: 1 (frustration resolution)
└─ Cooldowns: frustration_resolution (15min remaining)

Recommendations:
- Confidence is dropping - consider rescue mode
- User frustration detected - engage proactively
- Multiple blind spots - ask clarifying questions
```

---

## 5. Pattern Detection

**What it does:** Find recurring issues and behaviors

**Analysis:**
- Repeated tool failures
- Common user frustrations
- Recurring task types
- Session patterns
- Performance trends

**Output:**
```
Pattern Analysis (Last 30 days)
================================

Repeated Failures:
1. Tool: write - 15 failures
   └─ Pattern: 80% occur outside workspace
   └─ Recommendation: Educate user on workspace restrictions

2. Tool: web_search - 8 failures
   └─ Pattern: 100% occur with Tavily API
   └─ Recommendation: Check API key or switch to DuckDuckGo

3. LLM Timeout - 12 occurrences
   └─ Pattern: 90% with qwen3.5:4b model
   └─ Recommendation: Use smaller model or increase timeout

User Frustration Patterns:
- Frustration spikes after 3+ consecutive failures
- Frustration correlates with response time >5s
- Frustration decreases after proactive engagement

Task Success Rates:
├─ File operations: 92% success
├─ Web searches: 78% success
├─ Code refactoring: 65% success ← Needs improvement
├─ Research tasks: 88% success
└─ Creative writing: 95% success

Performance Trends:
- Response times increasing over 30 days (correlation: database growth)
- Cache hit rate improving (42% → 58%)
- Tool execution times stable
```

---

## 6. Database Analysis

**What it does:** Analyze BrainDB health and content

**Analysis:**
- Memory count and quality
- Procedure effectiveness
- Scratchpad usage
- Token usage trends

**Output:**
```
BrainDB Analysis
=================
Database Size: 45MB
├─ Memories: 1,245 entries
│  ├─ Global: 856
│  └─ Session-specific: 389
├─ Procedures: 47 saved
├─ Scratchpads: 12 active
└─ Token Usage: 2.5M tokens (30 days)

Memory Quality:
├─ High Confidence (>0.8): 456 (37%)
├─ Medium Confidence (0.5-0.8): 589 (47%)
└─ Low Confidence (<0.5): 200 (16%) ← Review recommended

Memory Topics:
1. User preferences (234 memories)
2. Project context (189 memories)
3. Tool usage patterns (156 memories)
4. Error patterns (123 memories)
5. Code snippets (98 memories)

Procedures:
├─ Most Used: "React component setup" (23 uses)
├─ Most Effective: "TypeScript compilation" (100% success)
└─ Least Effective: "Docker deployment" (45% success)

Recommendations:
- 200 low-confidence memories should be reviewed
- Consider memory consolidation (REM cycle)
- "Docker deployment" procedure needs improvement
```

---

## 7. Recommendations Engine

**What it does:** Generate actionable improvement suggestions

**Categories:**
- Performance optimizations
- Configuration changes
- Model recommendations
- Security improvements
- User experience enhancements

**Output:**
```
Recommendations Report
======================

High Priority:
1. ⚠️ Memory Usage Critical (78%)
   └─ Action: Increase RAM or reduce concurrent sessions
   └─ Impact: Prevents crashes

2. ⚠️ Ollama Latency High (2500ms)
   └─ Action: Switch to qwen3.5:1.7b or upgrade GPU
   └─ Impact: 2-3x faster responses

3. ⚠️ Cache Hit Rate Low (42%)
   └─ Action: Enable caching in config.json
   └─ Impact: 30-50% cost reduction

Medium Priority:
4. 💡 Model Recommendation
   └─ Current: qwen3.5:4b (slow on your hardware)
   └─ Suggested: qwen3.5:1.7b (2x faster, similar quality)
   └─ Impact: Better user experience

5. 💡 Tool Policy Update
   └─ Add 'apply_patch' to allowed tools
   └─ Impact: Better code editing

6. 💡 Enable Proactive Engagement
   └─ Currently disabled in config
   └─ Impact: Better user experience

Low Priority:
7. ℹ️ Database Optimization
   └─ Run VACUUM on brain.db
   └─ Impact: 10-15% faster queries

8. ℹ️ Log Rotation
   └─ Configure log rotation (logs growing unbounded)
   └─ Impact: Disk space management
```

---

# User Interfaces

## 1. CLI (Quick Diagnostics)

```bash
# Quick health check
$ wolverine-obd health
✅ All systems operational

# Full diagnostic scan
$ wolverine-obd scan
🔍 Running diagnostics...
⚠️ Found 3 issues:
  1. High memory usage (78%)
  2. Ollama latency (2500ms)
  3. Low cache hit rate (42%)

# Performance profile
$ wolverine-obd profile --last 100
Average response: 3.2s
Bottleneck: LLM calls (87%)

# Consciousness state
$ wolverine-obd consciousness --session abc123
Confidence: 0.4, Urgency: 0.7, Satisfaction: 0.2

# Root cause analysis
$ wolverine-obd why --task "refactor auth"
Root cause: Permission denied (workspace restriction)
```

## 2. Web UI (Deep Analysis)

```
┌─────────────────────────────────────────────────────────┐
│  Wolverine OBD Scanner - Web Dashboard                  │
├─────────────────────────────────────────────────────────┤
│  [Health] [Performance] [Consciousness] [Patterns]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Health Status: ⚠️ DEGRADED                            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  System Metrics                                   │  │
│  │                                                   │  │
│  │  Memory: ████████░░ 78%  ⚠️                      │  │
│  │  CPU:   █████░░░░░ 45%  ✅                      │  │
│  │  Disk:  ███░░░░░░░ 28%  ✅                      │  │
│  │                                                   │  │
│  │  LLM Latency: 2500ms  ⚠️                         │  │
│  │  Cache Hit: 42%  ⚠️                              │  │
│  │  Active Sessions: 3  ✅                          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Recent Issues                                    │  │
│  │                                                   │  │
│  │  ⚠️ Tool failure: write (permission denied)      │  │
│  │  ⚠️ LLM timeout: qwen3.5:4b (3.5s)              │  │
│  │  ✅ Task completed: "Fix login bug"              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Recommendations                                  │  │
│  │                                                   │  │
│  │  1. Increase RAM (critical)                       │  │
│  │  2. Switch to smaller model (high)               │  │
│  │  3. Enable caching (medium)                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 3. Report Generator

```bash
# Generate full diagnostic report
$ wolverine-obd report --output diagnostic-report.pdf

# Generate specific analysis
$ wolverine-obd report --type performance --output perf-report.json

# Generate shareable bundle
$ wolverine-obd report --bundle --output wolverine-diagnostics.zip
```

---

# Technical Implementation

## Architecture

```
wolverine-obd-scanner/
├── src/
│   ├── cli/                    # CLI interface
│   │   ├── index.ts
│   │   ├── commands/
│   │   │   ├── health.ts
│   │   │   ├── scan.ts
│   │   │   ├── profile.ts
│   │   │   ├── why.ts
│   │   │   └── consciousness.ts
│   │   └── output/
│   │       ├── table.ts
│   │       └── json.ts
│   │
│   ├── web-ui/                 # Web dashboard
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── components/
│   │   └── static/
│   │
│   ├── analyzer/               # Analysis engine
│   │   ├── health-checker.ts
│   │   ├── performance-analyzer.ts
│   │   ├── root-cause-analyzer.ts
│   │   ├── pattern-detector.ts
│   │   ├── recommendation-engine.ts
│   │   └── consciousness-analyzer.ts
│   │
│   ├── connector/              # Connection layer
│   │   ├── http-client.ts
│   │   ├── websocket-client.ts
│   │   └── database-reader.ts
│   │
│   └── reporter/               # Report generation
│       ├── pdf-generator.ts
│       ├── json-generator.ts
│       └── bundle-generator.ts
│
├── package.json
└── README.md
```

## Connection Methods

### 1. HTTP API (Primary)

```typescript
// Wolverine exposes diagnostic endpoints
GET  /api/diagnostics/health
GET  /api/diagnostics/metrics
GET  /api/diagnostics/consciousness/:sessionId
GET  /api/diagnostics/performance
POST /api/diagnostics/analyze/root-cause
```

### 2. WebSocket (Real-time)

```typescript
// Stream live metrics
ws://localhost:18789/diagnostics

// Subscribe to specific events
{ "subscribe": ["health", "performance", "consciousness"] }
```

### 3. Direct Database Access (Offline)

```typescript
// Read WolverineData folder directly
const brain = new BrainDB('~/WolverineData/brain.db');
const memories = brain.getAll();
const procedures = brain.getProcedures();
```

---

# Use Cases

## Use Case 1: User Reports "Wolverine is Slow"

```bash
# Step 1: Run health check
$ wolverine-obd health
⚠️ DEGRADED - Ollama latency high

# Step 2: Profile performance
$ wolverine-obd profile
Bottleneck: LLM calls (87%)
Model: qwen3.5:4b on 4GB RAM

# Step 3: Get recommendations
$ wolverine-obd recommendations
1. Switch to qwen3.5:1.7b (2x faster)
2. Enable caching (30-50% reduction in LLM calls)

# Step 4: Apply fix
$ wolverine config set llm.model qwen3.5:1.7b
$ wolverine config set cache.enabled true
```

## Use Case 2: Task Keeps Failing

```bash
# Step 1: Analyze root cause
$ wolverine-obd why --task "deploy to production"
Root Cause: Missing Docker permissions

# Step 2: Review consciousness state
$ wolverine-obd consciousness --task "deploy to production"
Confidence dropped from 0.8 to 0.3 after 3 failures

# Step 3: Get recommendations
$ wolverine-obd recommendations
1. Configure Docker permissions
2. OR: Use alternative deployment method
```

## Use Case 3: Debugging Consciousness Behavior

```bash
# Step 1: Review self-model state
$ wolverine-obd consciousness --self-model
Purpose: "Autonomous AGI"
Goals: 3 immediate, 5 short-term, 2 long-term

# Step 2: Review user model
$ wolverine-obd consciousness --user-model
Knowledge: expert
Frustrations: ["slow responses", "permission errors"]

# Step 3: Review metacognition
$ wolverine-obd consciousness --metacognition
Confidence: 0.4 (low)
Blind spots: 3 detected

# Step 4: Review proactive engagements
$ wolverine-obd consciousness --engagements
Pending: 1 (frustration resolution)
Cooldown: 15min remaining
```

## Use Case 4: Sharing Diagnostics for Support

```bash
# Generate shareable diagnostic bundle
$ wolverine-obd report --bundle --output wolverine-diagnostics.zip

# Bundle contains:
# - health-report.json
# - performance-profile.json
# - consciousness-state.json
# - database-analysis.json
# - recommendations.json
# - logs (last 7 days)

# Upload to GitHub issue or send to support
```

---

# Benefits

## For Users

1. **Self-Service Diagnostics** - No need to manually dig through logs
2. **Clear Recommendations** - Actionable steps to fix issues
3. **Performance Insights** - Understand bottlenecks
4. **Consciousness Transparency** - See what Wolverine is "thinking"
5. **Faster Support** - Share diagnostic bundles

## For Developers

1. **Debug Complex Issues** - Root cause analysis
2. **Performance Optimization** - Identify bottlenecks
3. **Pattern Detection** - Find recurring issues
4. **User Behavior Analysis** - Understand how users interact
5. **Regression Detection** - Catch performance degradation

## For Support Team

1. **Standardized Diagnostics** - Everyone uses same tool
2. **Faster Triage** - Immediately see issues
3. **Remote Debugging** - Analyze user bundles
4. **Knowledge Base** - Common patterns documented
5. **Training Tool** - Show new users how system works

---

# Implementation Phases

## Phase 1: Core Diagnostics (Week 1-2)

- [ ] HTTP API endpoints in Wolverine
- [ ] CLI health check command
- [ ] CLI performance profile command
- [ ] Basic report generation

## Phase 2: Deep Analysis (Week 3-4)

- [ ] Root cause analyzer
- [ ] Pattern detector
- [ ] Recommendation engine
- [ ] Database analyzer

## Phase 3: Consciousness Integration (Week 5-6)

- [ ] Self-model introspection
- [ ] Theory of Mind visualization
- [ ] Metacognition reports
- [ ] Proactive engagement tracking

## Phase 4: Web UI (Week 7-8)

- [ ] Web dashboard
- [ ] Real-time metrics (WebSocket)
- [ ] Interactive visualizations
- [ ] Report generation UI

## Phase 5: Advanced Features (Week 9-10)

- [ ] Historical trend analysis
- [ ] Predictive analytics
- [ ] Automated remediation
- [ ] Plugin system

---

# Security Considerations

## Data Access

- OBD Scanner should NOT modify Wolverine state (read-only)
- Sensitive data (API keys, credentials) must be redacted
- User must explicitly grant access

## Authentication

- Local connections: No auth required (localhost only)
- Remote connections: Token-based authentication
- Database access: Read-only user

## Privacy

- Diagnostic bundles should exclude:
  - API keys
  - User credentials
  - Sensitive conversation content
  - Personal files

---

# Conclusion

The Wolverine OBD Scanner is to AI agents what OBD-II scanners are to cars:

- **Quick diagnostics** - "Check engine light" for AI
- **Deep analysis** - Understand what's happening internally
- **Root cause** - Why did this happen?
- **Recommendations** - How to fix it
- **Transparency** - See the "consciousness" state

This tool becomes **essential** as Wolverine grows more complex. Without it, debugging is like disassembling a car engine to find why the check engine light is on.

**With it**, users can quickly diagnose and fix issues, understand Wolverine's behavior, and optimize performance.

---

**Next Step:** Begin Phase 1 implementation - Add diagnostic API endpoints to Wolverine's modular gateway.
