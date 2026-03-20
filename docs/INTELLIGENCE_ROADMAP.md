# Wolverine Intelligence Roadmap

## Vision: Build an agentic AI system that learns, reasons, and adapts

The goal is to replace hardcoded shortcuts with intelligent, LLM-powered components.

---

## Completed: Intelligent Fact Extraction ✅

**Before:** Hardcoded regex patterns (15+) for extracting facts
**After:** LLM-based extraction with regex fallback

```typescript
// OLD: Hardcoded patterns
const workAtMatch = text.match(/I\s+work\s+at\s+([A-Z][^.,!?\n]{1,50})/i);
if (workAtMatch) { facts.push(`I work at ${workAtMatch[1]}`); }

// NEW: Intelligent extraction
const facts = await this.extractFactsWithLLM(userText);
```

**Benefits:**
- Understands nuanced phrasing ("I've been living in SF for 5 years")
- Handles new patterns without code changes
- Falls back to regex if LLM fails

---

## Priority 1: Intelligent Corrections Detection

### Current State (Hardcoded)

**File:** `src/brain/hindsight.ts`

```typescript
// Hardcoded keywords for correction detection
const feedbackKeywords = ["no,", "actually", "use", "don't", "should", "wrong"];
```

**Problems:**
- Can't understand intent ("Actually, I prefer...")
- Misses corrections like "I meant...", "Better to...", "You should..."
- Fragile list that needs constant updating

### Target State (Intelligent)

Use LLM to classify if user is:
1. Correcting Wolverine's response
2. Providing feedback on behavior
3. Simply making conversation

```typescript
async detectCorrection(userMessage: string, wolverineResponse: string): Promise<CorrectionType> {
  const prompt = `Analyze if the user is correcting Wolverine...
  User: "${userMessage}"
  Wolverine said: "${wolverineResponse}"
  
  Classify: CORRECTION | FEEDBACK | CONVERSATION | NONE
  `;
}
```

---

## Priority 2: Intelligent Loop Detection

### Current State (Hash-based)

**File:** `src/core/tool-handler.ts`

```typescript
// Simple hash-based loop detection
const hash = sha256(`${tool.name}:${JSON.stringify(tool.params)}`);
if (callHistory.includes(hash)) { loopDetected = true; }
```

**Problems:**
- Only detects exact same calls
- Can't detect semantic loops (different params, same intent)
- Example: "search for X" → "search for Y" → "search for X" looks like new calls

### Target State (Semantic)

```typescript
async detectSemanticLoop(calls: ToolCall[]): Promise<boolean> {
  const prompt = `Are these tool calls showing a repeating pattern?
  ${calls.map(c => `${c.name}(${JSON.stringify(c.params)})`).join('\n')}
  
  Are they essentially the same action with different parameters?`;
}
```

---

## Priority 3: Intelligent Tool Call Parsing

### Current State (Regex hacks)

**File:** `src/gateway/server.ts`

```typescript
// Multiple regex fallbacks for parsing LLM tool calls
const match = response.match(/TOOL_CALL:\s*(.+?)(?=\n\n|\n[^]|$)/s);
if (!match) {
  // Fallback to JSON extraction
  const jsonMatch = response.match(/(\{[\s\S]*\})/);
  // Then try escaped quotes fix
  // Then try manual brace balancing
}
```

**Problems:**
- Fragile, breaks with slight format changes
- Can't handle malformed output gracefully
- Multiple fallbacks = more complexity

### Target State (Function Calling)

Use LLM API's native function calling:

```typescript
// With Ollama's function calling support (when available)
const response = await ollama.chat({
  messages,
  tools: [{
    name: "memory",
    description: "Search memory",
    parameters: { type: "object", properties: {...} }
  }]
});

// Direct structured output, no parsing needed
const toolCalls = response.message.tool_calls;
```

---

## Priority 4: Intelligent Error Classification

### Current State (Hardcoded patterns)

**File:** `src/brain/skill-evolver.ts`

```typescript
// Skip common errors (fragile)
const skipErrors = [
  "Cannot destructure property",
  "Cannot read properties of undefined",
  // ...
];
if (skipErrors.some(e => error.includes(e))) continue;
```

**Problems:**
- Manual maintenance of error patterns
- Misses important lessons from "skipped" errors
- Can't understand if error is relevant to learning

### Target State (Semantic)

```typescript
async classifyError(error: Error, context: ErrorContext): Promise<ErrorClass> {
  const prompt = `Classify this error:
  Error: ${error.message}
  Context: ${context.description}
  
  Is this error:
  - RELEVANT: Worth learning from (fix the skill)
  - TRANSIENT: Network/timeout (retry)
  - IRRELEVANT: Unrelated to the task
  - CRITICAL: System failure`;
}
```

---

## Priority 5: Intelligent Identifier Preservation

### Current State (Regex)

**File:** `src/brain/chetna-client.ts`

```typescript
// Hardcoded patterns for identifiers
const identifierPattern = /[\/][\w.-]+){2,}|UUID|IP|hash.../g;
const identifiers = text.match(identifierPattern);
```

**Problems:**
- Limited to known identifier formats
- Can't understand semantic importance

### Target State (LLM)

```typescript
async extractIdentifiers(text: string): Promise<Identifier[]> {
  const prompt = `Extract semantically important identifiers from this text:
  ${text}
  
  Return JSON: [{"type": "path", "value": "...", "importance": "critical"}]`;
}
```

---

## Priority 6: Intelligent Response Generation

### Current State (Hardcoded)

**File:** `src/gateway/channels/telegram.ts`

```typescript
// Hardcoded access denial message
const accessDenied = `Access Denied. Your Chat ID is: ${chatId}.`;

// Hardcoded voice message handling
const voicePrompt = `[SYSTEM: The user has sent a voice message...]`;
```

**Problems:**
- Not i18n-ready
- Rigid templates

### Target State (Dynamic)

```typescript
async generateResponse(intent: ResponseIntent, context: Context): Promise<string> {
  const prompt = `Generate an appropriate response for:
  Intent: ${intent.type}
  Context: ${JSON.stringify(intent.context)}
  Language: ${user.preferredLanguage || 'en'}
  
  The response should be natural, helpful, and match the user's communication style.`;
}
```

---

## Priority 7: Intelligent System Prompt Generation

### Current State (Hardcoded template)

**File:** `src/brain/cognitive-core.ts`

```typescript
const systemPrompt = `You are WOLVERINE, a hyper-autonomous AI...

### CORE DIRECTIVES
1. **Extreme Proactivity:** Do not wait for permission...
```

**Problems:**
- Fixed for all LLMs
- Can't adapt to different model capabilities
- No learning from what works best

### Target State (Dynamic)

```typescript
async generateSystemPrompt(
  model: LLMModel,
  task: Task,
  userContext: UserContext
): Promise<string> {
  const prompt = `Generate an optimal system prompt for:
  Model: ${model.name} (capabilities: ${model.capabilities})
  Task: ${task.type}
  User: ${userContext.preferences}
  
  The prompt should leverage the model's strengths and match user preferences.`;
}
```

---

## Implementation Order

| Priority | Component | Effort | Impact | Status |
|----------|-----------|--------|--------|--------|
| 1 | Fact Extraction | ✅ Done | High | Complete |
| 2 | Corrections Detection | Low | Medium | Pending |
| 3 | Loop Detection | Medium | High | Pending |
| 4 | Tool Call Parsing | Medium | High | Pending |
| 5 | Error Classification | Low | Medium | Pending |
| 6 | Identifier Preservation | Low | Low | Pending |
| 7 | Response Generation | Medium | Medium | Pending |
| 8 | System Prompt Generation | Medium | High | Pending |

---

## Migration Strategy

### Phase 1: Parallel Running
- Keep hardcoded logic as fallback
- Add LLM-based logic alongside
- Measure accuracy improvement

### Phase 2: Gradual Replacement
- Replace one component at a time
- Monitor performance metrics
- Keep fallback for edge cases

### Phase 3: Full Intelligence
- Remove hardcoded fallbacks
- Pure LLM-based processing
- Continuous learning from interactions

---

## Testing Requirements

For each intelligent component:

1. **Accuracy Test:** Compare LLM output vs hardcoded output
2. **Latency Test:** Measure added delay from LLM calls
3. **Fallback Test:** Verify fallback works when LLM fails
4. **Edge Case Test:** Test unusual inputs that break patterns

---

## Notes

- qwen3.5:0.8b is fast enough for most intelligence tasks
- For complex tasks (like full conversation analysis), use qwen3.5:4b
- Monitor LLM latency and optimize prompts
- Consider caching for repeated patterns
