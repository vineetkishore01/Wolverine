# Wolverine Roadmap

## Current Status: Phase 2 - Foundation Complete ✅

### What's Working
- [x] Gateway WebSocket server (Bun/TypeScript)
- [x] Cognitive Core with sparse context
- [x] Ollama LLM integration
- [x] Chetna long-term memory (storage/retrieval)
- [x] Fast memory extraction (regex-based)
- [x] SQLite short-term context
- [x] OBD diagnostic system
- [x] Telegram channel (ready to enable)
- [x] Tool handler with loop detection
- [x] Response cleanup (no THOUGHT leaking)

### Testing Complete (via OBD)
- [x] LLM responding to chat
- [x] Facts extracted and stored in Chetna
- [x] Memory recall working
- [x] Clean responses (no thinking blocks)

---

## Phase 3: Fast GPU Integration (Priority: CRITICAL)

**Blocker:** Current Ollama server (192.168.0.62) too slow for real-time chat.

### Tasks
- [ ] Set up fast Ollama server with GPU (8GB+ VRAM)
- [ ] Configure `qwen3.5:4b` or larger model
- [ ] Update `settings.json` with new Ollama URL
- [ ] Target response time: <2 seconds

### Expected Outcome
```
User: "My name is Vineet"
Wolverine: "Got it! I'll remember that." (in <2s)
```

---

## Phase 4: Tool Calling Enhancement

### Tasks
- [ ] Fix TOOL_CALL output format (current model outputs `...` placeholders)
- [ ] Implement actual command execution via `system` tool
- [ ] Add file listing, creation, editing capabilities
- [ ] Test multi-step tool chains

### Code Changes Needed
```typescript
// In cognitive-core.ts - improve system prompt examples
TOOL_CALL: {"name": "system", "params": {"command": "ls -la /path"}}

// Instead of:
TOOL_CALL: {"name": "system", "params": {"command": "..."}}
```

---

## Phase 5: Memory System Refinement

### Current Behavior
- Facts extracted via regex (limited)
- Simple key-value storage

### Desired Behavior
- [ ] Semantic memory extraction via LLM
- [ ] Memory importance scoring
- [ ] Memory decay simulation
- [ ] Cross-session continuity verification

### Tasks
- [ ] Re-enable LLM-based distillation (after fast GPU)
- [ ] Add memory categorization (fact, preference, habit)
- [ ] Implement memory importance decay
- [ ] Add memory editing/deletion tools

---

## Phase 6: Telegram Chatbot Experience

### What's Ready
- [x] Telegram channel code
- [x] Webhook handling
- [x] Message routing

### Tasks to Enable
```bash
# 1. Get bot token from @BotFather
# 2. Update settings.json:
{
  "telegram": {
    "botToken": "YOUR_TOKEN_HERE",
    "allowedUserIds": ["YOUR_USER_ID"]
  }
}
# 3. Restart Wolverine
```

### Desired UX
```
User (Telegram): "Hey, my name is Vineet"
Wolverine: "Hi Vineet! Nice to meet you. I'll remember that."

User (Telegram): "What's my name?"
Wolverine: "Your name is Vineet."

[After restart]
User (Telegram): "What's my name?"
Wolverine: "Your name is Vineet. We talked earlier."
```

---

## Phase 7: Self-Evolution System

### Background Systems
- [x] MadMax idle scheduler (Python)
- [x] Governance API (FastAPI)
- [x] SkillEvolver (exists, needs fast GPU)

### Tasks
- [ ] Enable autonomous skill synthesis
- [ ] Connect Governance approval workflows
- [ ] Implement lesson capture from failures
- [ ] Test skill auto-generation

---

## Phase 8: Browser Automation

### Prerequisites
- [ ] Fast GPU for reliable tool execution
- [ ] Pinchtab bridge working

### Tasks
- [ ] Navigate to URLs
- [ ] Click elements
- [ ] Screenshot capture
- [ ] Form filling

---

## Phase 9: Advanced Features (Future)

### Potential Additions
- [ ] Streaming responses (show as typing)
- [ ] Voice input/output
- [ ] Image understanding
- [ ] Multi-agent coordination
- [ ] Code execution sandbox

---

## Quick Wins (Can Do Now)

1. **Enable Telegram** - Just add bot token to settings.json
2. **Test Memory** - Use OBD to verify Chetna integration
3. **Add More Facts** - Test preference/habit extraction
4. **Improve Prompts** - Refine system prompt based on LLM responses

---

## Next Action Items

1. **Immediate:** Set up fast Ollama server with GPU
2. **After GPU:** Test full tool calling pipeline
3. **Enable Telegram:** Add bot token
4. **Memory:** Verify cross-session persistence

---

## Dependencies

```
Fast Ollama GPU ─┬─> Tool Calling
                 │
                 ├─> Memory Distillation
                 │
                 └─> Real-time Chat

Chetna ──────────> Long-term Memory (Working Now ✓)

Telegram ────────> Chat UI (Ready, just needs token)
```
