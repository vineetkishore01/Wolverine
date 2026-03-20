# Wolverine Memory Architectures

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
Wolverine injects memories into context
    ↓
LLM responds naturally
```

**Pros**:
- Works with any LLM regardless of instruction-following capability
- Single LLM call (no extra round-trip)
- Deterministic, predictable behavior
- Model-agnostic — same code works for qwen3.5:4b or GPT-4o

**Cons**:
- Always fetches memories (no selectivity)
- May fetch irrelevant context
- Extra latency from Chetna call

**Implementation**:
- `src/brain/cognitive-core.ts` — `enrichPrompt()` handles prefetch
- Chetna does semantic matching on user message
- Memories injected into system prompt or user message

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

## Decision Matrix

| Factor | Prefetch | Tool Call |
|--------|----------|-----------|
| Small model (qwen3.5:4b) | ✅ Use this | ❌ Won't follow |
| Large model (GPT-4o, Claude) | ✅ Works | ✅ Works |
| Low latency requirement | ✅ | ❌ Extra round-trip |
| Context efficiency | ⚠️ Always fetches | ✅ Selective |
| Model-agnostic | ✅ | ❌ Model-dependent |
| Complex reasoning needed | ❌ | ✅ |

**Recommendation**:
- Small/weak GPU: Use **Approach 1 (PREFETCH)**
- Large GPU + strong model: Consider **Approach 2 (TOOL CALL)** for better selectivity

---

## Testing Checklist

### Approach 1 (PREFETCH)
- [ ] User says "My name is Vineet" → Stored in Chetna
- [ ] User asks "Do you remember my name?" → Memory appears in context
- [ ] LLM responds correctly with retrieved memory

### Approach 2 (TOOL CALL)
- [ ] System prompt includes memory tool directive
- [ ] LLM outputs TOOL_CALL when asked about user
- [ ] Wolverine extracts and executes tool call
- [ ] Results injected into context
- [ ] LLM generates final response
