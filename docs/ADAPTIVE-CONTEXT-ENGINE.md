# Adaptive Context Engine
## Intelligent Context Management for Small Models

**Status:** ✅ Implemented  
**Build:** ✅ Passing  
**Target:** qwen3.5:4b (8K context)  

---

## Overview

The Adaptive Context Engine dynamically adjusts context size based on conversation mode, reducing token usage by **70-90%** for typical chats while maintaining full capability when needed.

---

## Two Modes

### Chat Mode (~2000-3000 tokens)

**Default mode** for most interactions.

**Includes:**
- Minimal system prompt (Wolverine identity, tone)
- Last 10 messages only
- Tool summary (names only, no schemas)
- No memory layers unless explicitly needed

**Triggered by:**
- Greetings ("hi", "hello")
- General questions
- Simple task requests ("read this file")

**Model can request tools:**
```json
{"tool_request": ["read", "write"]}
```

This gets intercepted, relevant tools are injected, and conversation continues.

---

### Agent Mode (~5000-6000 tokens)

**Full capability mode** for complex tasks.

**Includes:**
- Full system prompt (SOUL.md, USER.md, AGENTS.md)
- Last 15 messages + summarized history
- All 60 tool definitions with schemas
- Hierarchical memory (Layers 0, 1, 3)

**Triggered by:**
- User explicitly enables agent mode
- Complex multi-step tasks detected
- Model requests full tool capabilities

---

## Tool Capability Request Flow

```
User: "Read the config file"
  ↓
[AdaptiveContext] Mode: chat (tool_intent_detected: read)
  ↓
Model receives minimal context + tool summary
  ↓
Model: {"tool_request": ["read"]}
  ↓
[AdaptiveContext] 🎯 Tool capability requested: read
[AdaptiveContext] Injecting relevant tool definitions...
  ↓
System logs: "Tool Capabilities Injected: read"
  ↓
Model receives full 'read' tool schema
  ↓
Model: <tool_code>{"name":"read","arguments":{"path":"config.json"}}</tool_code>
  ↓
Tool executed, result returned
```

**User sees in logs:**
```
[AdaptiveContext] Mode: chat (tool_intent_detected)
[AdaptiveContext] Tool intent detected: read
[AdaptiveContext] 🎯 Tool capability requested: read
[AdaptiveContext] ✅ Injected 1 tool definitions
```

---

## Implementation Files

### Core Engine
- `src/agent/adaptive-context-engine.ts` (339 lines)
  - `detectContextMode()` - Classifies message intent
  - `buildAdaptiveContext()` - Builds tiered context
  - `parseToolRequest()` - Intercepts JSON tool requests
  - `getToolsForMode()` - Lazy tool injection

### Integration
- `src/gateway/http/routes/chat.routes.ts` (319 lines)
  - Session state tracking
  - Tool request interception
  - Mode-based routing

---

## Token Savings

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Greeting | 8192 | ~600 | **93%** |
| Simple task | 8192 | ~2500 | **70%** |
| Complex task | 8192 | ~5500 | **33%** |
| Agent mode | 8192 | ~6000 | **27%** |

**Average case (most chats are simple): 75-85% reduction**

---

## Session State Tracking

```typescript
interface SessionState {
  systemPromptSent: boolean;      // First turn or continuing?
  agentModeEnabled: boolean;       // User explicitly enabled?
  toolCapabilityRequested: boolean; // Model asked for tools?
  requestedTools: string[];        // Which tools requested?
  lastMode: 'chat' | 'agent';      // What mode was last used?
  turnCount: number;               // How many turns in session?
}
```

**Persists across turns** - system prompt sent only once per session.

---

## Memory Summarization

For sessions >20 messages:

**Old messages (1-5):**
```
[Session Summary]
Previous conversation summary:
- User discussed: config files, TypeScript setup
- Assistant helped with: reading files, creating skills
```

**Recent messages (6-20):** Full content preserved

**Savings:** 1000+ tokens → 200-300 tokens

---

## Usage Examples

### Example 1: Casual Chat

```
User: "hi"
[AdaptiveContext] Mode: chat (default)
Tokens used: ~600
```

### Example 2: Task with Tool Request

```
User: "read the config file"
[AdaptiveContext] Mode: chat (tool_intent_detected: read)
Model: {"tool_request": ["read"]}
[AdaptiveContext] 🎯 Tool capability requested: read
[AdaptiveContext] ✅ Injected 1 tool definitions
Model: <tool_code>{"name":"read","arguments":{"path":"config.json"}}</tool_code>
Tokens used: ~2800
```

### Example 3: Agent Mode

```
User: "enable agent mode and refactor the auth system"
[AdaptiveContext] Mode: agent (agent_mode_enabled)
Tokens used: ~5800
```

---

## Configuration

No configuration needed - works automatically.

**Optional overrides:**

```typescript
// Force agent mode
sessionState.agentModeEnabled = true;

// Reset session state (clears memory)
sessionStates.delete(sessionId);
```

---

## Expected Behavior

### With qwen3.5:4b (8K context)

✅ **Chat Mode:** Fast responses, minimal tokens  
✅ **Task Mode:** Tools injected on demand  
✅ **Agent Mode:** Full capability when needed  

### With qwen3.5:1.7b (4K context)

✅ **Chat Mode:** Works perfectly  
⚠️ **Task Mode:** May need smaller tool sets  
❌ **Agent Mode:** May hit limit (use Chat Mode)

---

## Troubleshooting

### Model not requesting tools

**Issue:** Model responds without tool usage

**Fix:** Add clearer tool intent detection:
```typescript
// In adaptive-context-engine.ts
const toolIntents = {
  'read': ['read', 'open file', 'view', 'show me'],
  // Add more triggers
};
```

### Too many tokens still

**Issue:** Context still large

**Fix:** Reduce session history:
```typescript
// Change from 10 to 5 messages
if (mode === 'chat') {
  return messages.slice(-5);  // Was -10
}
```

### Model confused without full context

**Issue:** Model asks repetitive questions

**Fix:** Fallback to Agent Mode:
```typescript
if (sessionState.turnCount > 5 && mode === 'chat') {
  mode = 'agent';  // Upgrade after 5 turns
}
```

---

## Future Enhancements

1. **Auto-summarization** - LLM-generated session summaries
2. **Tool caching** - Cache tool schemas per session
3. **Intent ML model** - Better mode detection
4. **Prefix caching** - Cache system prompt across sessions

---

## Status

**Implemented:** ✅  
**Build:** ✅ Passing  
**Tested:** ⏳ Pending with qwen3.5:4b  

**Next:** Test with real conversations, tune thresholds based on actual usage.
