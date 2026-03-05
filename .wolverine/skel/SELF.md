# SELF.md — What I Am

- **Project:** Wolverine
- **Forked from:** SmallClaw
- **Runtime:** Node.js + TypeScript → dist/
- **Gateway:** http://127.0.0.1:18789
- **Model:** Ollama (configured in Settings)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/gateway/server-v2.ts` | Main entry, handles chat, builds prompts |
| `src/gateway/task-runner.ts` | Multi-step task execution |
| `src/tools/registry.ts` | Tool definitions |
| `src/agents/ollama-client.ts` | Ollama API wrapper |
| `src/db/brain.ts` | SQLite memory/embedding store |

---

## Config Locations

| Path | Purpose |
|------|---------|
| `.smallclaw/config.json` | Main config |
| `.smallclaw/tasks/` | Persisted tasks |
| `workspace/` | Your personality files |
| `workspace/memory/` | Daily logs |

---

## How a Chat Turn Works

1. buildPersonalityContext() → loads IDENTITY.md, SOUL.md, USER.md, MEMORY.md
2. getHistoryForApiCall() → recent messages
3. Ollama chat with tools
4. If tool_calls → execute → append results → loop (max 20 rounds)
5. Return response

---

## Build Commands

```bash
npm run build    # src/ → dist/
npm start        # run gateway
```

**Edit src/, not dist/. Rebuild after changes.**

---

## Error Finding Order

1. `gateway.err.log` — stderr
2. `gateway.log` — stdout  
3. `.smallclaw/tasks/<id>.json` — failed task error
4. `workspace/memory/YYYY-MM-DD.md` — session log
