# Wolverine Memory Architectures

> **See also:** [Full Intelligence Architecture](./FULL_INTELLIGENCE_ARCHITECTURE.md) for the complete vision of intelligent memory processing including knowledge graphs, memory consolidation, and proactive suggestions.

## Overview

Wolverine has two approaches for memory retrieval. The chosen approach depends on LLM capability.

---

## Approach 1: Proactive Prefetch (CURRENT - DEFAULT)

**Philosophy**: Memory retrieval is handled by Wolverine's code, not the LLM. The LLM responds to whatever is in context.

**Flow**:
```
User message
    ↓
Wolverine → Chetna (semantic search)
    ↓
Chetna returns relevant memories
    ↓
Wolverine injects memories into system prompt
    ↓
LLM responds naturally (with memories in context)
```

**Pros**:
- Works with any LLM regardless of instruction-following capability
- Single LLM call (no extra round-trip)
- Deterministic, predictable behavior
- Model-agnostic — same code works for qwen3.5:0.8b or GPT-4o

**Cons**:
- Always fetches memories (no selectivity)
- May fetch irrelevant context
- Extra latency from Chetna call (~5-10ms)

**Implementation**:
- `src/brain/cognitive-core.ts` — `enrichPrompt()` handles prefetch
  - Calls `chetna.searchMemories(userMessage, 5)` before LLM call
  - Injects results into system prompt under "USER INFO (from memory)"
- `src/brain/cognitive-core.ts` — `recordMemory()` handles fact extraction
  - Extracts facts from USER messages only (not Wolverine responses)
  - Uses regex patterns to find self-statements
  - Deduplicates against existing memories before storing

**Fact Extraction Patterns** (15+ patterns):
| Pattern | Example | Extracted |
|---------|---------|-----------|
| "My name is X" | "My name is Vineet" | ✅ |
| "I'm X" (name only) | "I'm Vineet" | ✅ |
| "I work at X" | "I work at Apple" | ✅ |
| "I work in X" | "I work in San Francisco" | ✅ |
| "I work as X" | "I work as a developer" | ✅ |
| "I am X" | "I am a software engineer" | ✅ |
| "I live in/at/with X" | "I live in San Francisco" | ✅ |
| "I have X" | "I have two cats" | ✅ |
| "I love X" | "I love Rust programming" | ✅ |
| "I like X" | "I like using VS Code" | ✅ |
| "I prefer X" | "I prefer dark theme" | ✅ |
| "I enjoy X" | "I enjoy hiking" | ✅ |
| "My favorite X is Y" | "My favorite language is Rust" | ✅ |
| "I am from X" | "I am from India" | ✅ |
| "I am learning X" | "I am learning Go" | ✅ |

**Important Fixes Applied**:
- Pattern "I'm X" now excludes verbs (e.g., "I'm learning" is NOT captured as "My name is learning")
- Pattern "My favorite X is Y" handles multi-word categories (e.g., "programming language")
- Facts extracted only from USER messages to avoid Wolverine response fragments polluting memory
- Deduplication against existing memories before storing

**Testing Results** (qwen3.5:0.8b, context 50000):
- Memory storage: Working ✅
- Memory recall: Working ✅
- Response time: ~5-15s (fast for small model)
- Accuracy: ~85% for fact extraction

**Reference**: OpenClaw's `autoPrefetch` feature uses the same pattern
- Issue: https://github.com/openclaw/openclaw/issues/6589
- Blog: https://openclaws.io/blog/openclaw-contextengine-deep-dive

---

## Approach 2: Tool Call (FUTURE - Large GPU/Model)

**Philosophy**: Let the LLM decide when to search memory via explicit tool calls.

**Flow**:
```
User message → System prompt (instructions to call memory tool when needed)
    ↓
LLM decides: "User asked about me → Call memory tool"
    ↓
LLM outputs: <THOUGHT>...</THOUGHT> TOOL_CALL: {"name": "memory", ...}
    ↓
Wolverine executes memory tool → Chetna search
    ↓
Wolverine injects results → LLM
    ↓
LLM generates final response
```

**Pros**:
- LLM selectively calls memory (context efficiency)
- More "intelligent" — LLM decides what to search
- Better for large context windows (only fetch when needed)
- Aligns with agentic patterns

**Cons**:
- Requires strong instruction-following from LLM
- Extra round-trip latency
- LLM may forget to call tool
- Model-dependent — may not work on small/weak models

**Implementation Notes** (for when you want to build this):

1. **System Prompt** — Include directive like:
   ```
   When asked about the user, past conversations, or preferences, 
   ALWAYS call the memory tool first.
   Format: {"name": "memory", "params": {"query": "search terms"}}
   ```

2. **Tool Definition** — Ensure memory tool is in tool registry:
   ```typescript
   // src/tools/registry.ts
   const memoryTool = {
     name: "memory",
     description: "Search long-term memory for information about the user",
     params: { query: "string" }
   };
   ```

3. **TOOL_CALL Extraction** — Parse LLM output:
   ```typescript
   // src/gateway/server.ts
   const match = response.match(/TOOL_CALL:\s*(\{[^}]+\})/);
   if (match) {
     const toolCall = JSON.parse(match[1]);
     // execute tool
   }
   ```

4. **Result Injection** — After tool execution:
   ```typescript
   const memoryResults = await chetna.searchMemories(query);
   const injectedContext = `MEMORY RESULTS:\n${memoryResults.map(r => `- ${r.content}`).join('\n')}`;
   // Append to messages and call LLM again
   ```

5. **System Prompt Update** — Include results:
   ```
   ### USER INFO (from memory)
   - Fact 1
   - Fact 2
   ```

**Reference**: OpenClaw's original implementation uses this pattern
- Built-in `memory_search` tool
- Agent explicitly calls it

---

## Architecture Decision: Why Prefetch?

**Why we chose PREFETCH over TOOL CALL**:

1. **Small models can't reliably follow instructions** — qwen3.5:0.8b would frequently forget to call the memory tool
2. **Redundant with LLM context window** — LLM already has conversation history; short-term memory was duplicating
3. **Hallucination contamination** — Wolverine's past responses (which contained hallucinations) were being stored and re-injected
4. **Simpler, more predictable** — No LLM instruction-following dependency

**When TOOL CALL might be better**:
- Large context windows (128k+) where selective fetching matters
- Strong models (GPT-4o, Claude) with reliable instruction following
- When you need LLM to decide what to remember (not just what to recall)

---

## Decision Matrix

| Factor | Prefetch | Tool Call |
|--------|----------|-----------|
| Small model (qwen3.5:0.8b) | ✅ Use this | ❌ Won't follow |
| Medium model (qwen3.5:4b) | ✅ Works | ⚠️ May forget |
| Large model (GPT-4o, Claude) | ✅ Works | ✅ Works |
| Low latency requirement | ✅ | ❌ Extra round-trip |
| Context efficiency | ⚠️ Always fetches | ✅ Selective |
| Model-agnostic | ✅ | ❌ Model-dependent |
| Complex reasoning needed | ❌ | ✅ |

**Recommendation**:
- Small/weak GPU: Use **Approach 1 (PREFETCH)** ✅ (current)
- Large GPU + strong model: Consider **Approach 2 (TOOL CALL)** for better selectivity

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER MESSAGE                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ENRICH PROMPT (cognitive-core.ts)              │
│  1. Call Chetna.searchMemories(userMessage)                      │
│  2. Build system prompt with memories injected                    │
│  3. Return [system, user] messages                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LLM (Ollama/API)                             │
│  Receives: system prompt + user message                          │
│  Responds naturally with memories in context                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RECORD MEMORY (cognitive-core.ts)              │
│  1. Extract facts from user message only                          │
│  2. Run regex patterns (15+ patterns)                            │
│  3. Validate facts (length, words, no Wolverine phrases)         │
│  4. Deduplicate against existing Chetna memories                  │
│  5. Store new facts in Chetna                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Approach 1 (PREFETCH) — COMPLETED
- [x] User says "My name is Vineet" → Stored in Chetna
- [x] User says "I'm a software engineer" → Stored correctly
- [x] User says "I work at Apple" → Stored correctly
- [x] User asks "Do you remember my name?" → Memory appears in context
- [x] LLM responds correctly with retrieved memory
- [x] "I'm learning Go" NOT captured as "My name is learning Go"
- [x] "My favorite programming language is Rust" → Captured correctly
- [x] No Wolverine response fragments stored

### Approach 2 (TOOL CALL) — NOT IMPLEMENTED
- [ ] System prompt includes memory tool directive
- [ ] LLM outputs TOOL_CALL when asked about user
- [ ] Wolverine extracts and executes tool call
- [ ] Results injected into context
- [ ] LLM generates final response

---

## Key Files

| File | Purpose |
|------|---------|
| `src/brain/cognitive-core.ts` | `enrichPrompt()` + `recordMemory()` |
| `src/brain/chetna-client.ts` | Chetna API client |
| `src/tools/registry.ts` | Tool definitions |
| `src/gateway/server.ts` | WebSocket handling, tool execution |
| `settings.json` | LLM model, context window, Chetna URL |
