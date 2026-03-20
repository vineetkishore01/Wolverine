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
  - **LLM-based extraction** with intelligent understanding
  - Falls back to regex patterns if LLM fails
  - Deduplicates against existing memories before storing

**LLM-Based Fact Extraction** ✅ (Intelligence Feature)

The fact extraction is now **intelligent** rather than pattern-based:

```typescript
// INTELLIGENT: Uses LLM to understand context
private async extractFactsWithLLM(text: string): Promise<string[]> {
  const prompt = `You are a fact extraction assistant...
  Extract SELF-REFERENTIAL FACTS from user messages.
  Examples: "My name is Vineet", "I love Rust", "I'm learning Go"
  NOT: "Thanks for help", "What is Rust?" (not about user)
  `;
  return await this.llm.complete(prompt);
}
```

**Benefits over regex:**
- Understands nuanced phrasing ("I've been living in SF for 5 years")
- Handles new patterns without code changes ("I'm into mountain biking")
- No hardcoded pattern maintenance
- Falls back to regex if LLM fails (graceful degradation)

**Testing Results** (qwen3.5:0.8b, context 50000):
- Memory storage: Working ✅
- Memory recall: Working ✅
- Response time: ~5-15s (fast for small model)
- LLM extraction: Intelligently handles any phrasing ✅

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
│  1. Extract user messages from interaction                        │
│  2. LLM-based fact extraction (intelligent)                      │
│  3. Fallback to regex if LLM fails                              │
│  4. Deduplicate against existing Chetna memories                 │
│  5. Store new facts in Chetna                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Approach 1 (PREFETCH) — COMPLETED
**Memory Retrieval (PREFETCH):**
- [x] User says "My name is Vineet" → Stored in Chetna
- [x] User says "I'm a software engineer" → Stored correctly
- [x] User says "I work at Apple" → Stored correctly
- [x] User asks "Do you remember my name?" → Memory appears in context
- [x] LLM responds correctly with retrieved memory

**LLM-Based Fact Extraction:**
- [x] LLM extracts facts intelligently (no hardcoded patterns)
- [x] "I'm learning Go" correctly extracted as "I am learning Go"
- [x] "My favorite programming language is Rust" → Captured correctly
- [x] "I've been living in San Francisco for 5 years" → Captured correctly
- [x] Non-user messages (questions, requests) NOT stored as facts
- [x] No Wolverine response fragments stored
- [x] Regex fallback works when LLM fails

### Approach 2 (TOOL CALL) — NOT IMPLEMENTED
- [ ] System prompt includes memory tool directive
- [ ] LLM outputs TOOL_CALL when asked about user
- [ ] Wolverine extracts and executes tool call
- [ ] Results injected into context
- [ ] LLM generates final response

### Intelligence Features (See [Full Intelligence Architecture](./FULL_INTELLIGENCE_ARCHITECTURE.md))
- [x] **Fact Extraction** — LLM-based ✅
- [ ] Intent Classification — Hardcoded (see roadmap)
- [ ] Emotional Intelligence — Not implemented (see roadmap)
- [ ] Memory Graph — Flat storage (see roadmap)
- [ ] Self-Reflection — Not implemented (see roadmap)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/brain/cognitive-core.ts` | `enrichPrompt()` + `recordMemory()` |
| `src/brain/chetna-client.ts` | Chetna API client |
| `src/tools/registry.ts` | Tool definitions |
| `src/gateway/server.ts` | WebSocket handling, tool execution |
| `settings.json` | LLM model, context window, Chetna URL |
