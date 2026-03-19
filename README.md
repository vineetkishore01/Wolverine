# Wolverine Agent Framework

**Version:** 1.0.0  
**Runtime:** Bun (TypeScript) + Rust (Chetna) + Python (MadMax)

A distributed, self-evolving AI agent with long-term memory, tool execution, and real-time observability.

## Quick Start

```bash
# Start all systems
./launch.sh

# Or manually:
bun run src/index.ts
```

Access dashboard: **http://localhost:18789**

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Wolverine Gateway (Bun/TS)              │
│  WebSocket Hub │ HTTP API │ Web Dashboard          │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Chetna  │   │ Ollama  │   │ MadMax  │
   │ (Rust)  │   │ (GPU)   │   │(Python) │
   │ Memory  │   │ Brain   │   │Scheduler│
   └─────────┘   └─────────┘   └─────────┘
```

## Features

- **WebSocket Gateway** - Real-time bidirectional communication
- **Chetna Memory** - Long-term semantic memory with embeddings
- **Tool Execution** - Browser automation, shell commands, Telegram
- **Pipeline Trace** - Real-time visualization of agent reasoning
- **Hot Reload** - Update config without restart
- **Self-Evolution** - Learns from failures

## Configuration

Edit `settings.json`:

```json
{
  "gateway": { "port": 18789, "host": "0.0.0.0" },
  "llm": {
    "defaultProvider": "ollama",
    "ollama": { "url": "http://192.168.0.62:11434", "model": "qwen3.5:4b" }
  },
  "telegram": { "botToken": "", "allowedUserIds": [] },
  "brain": { "chetnaUrl": "http://127.0.0.1:1987" }
}
```

## Web UI Features

| Tab | Description |
|-----|-------------|
| **Chat** | Talk to Wolverine |
| **Activity** | Real-time event feed |
| **Memory** | Search semantic memories |
| **Tweak** | Hot-reload settings |
| **🐺 Trace** | Pipeline visualization |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/config` | Get current config |
| POST | `/api/config` | Update config (hot-reload) |
| GET | `/api/memory?q=` | Search memories |
| DELETE | `/api/memory/clear` | Clear all memories |
| POST | `/api/onboarding` | Initial setup |

## WebSocket Protocol

```javascript
// Connect
ws.send(JSON.stringify({
  type: "req",
  id: "uuid",
  method: "connect",
  params: { nodeId: "client-1", capabilities: ["chat"], displayName: "Web" }
}));

// Chat
ws.send(JSON.stringify({
  type: "req",
  id: "uuid",
  method: "agent.chat",
  params: { messages: [{ role: "user", content: "Hello" }] }
}));
```

## Skills

Add skills to `WolverineWorkspace/skills/<skill-name>/manifest.json`:

```json
{
  "name": "my-skill",
  "description": "What it does",
  "version": "1.0.0",
  "entryPoint": "script.ts",
  "capabilities": ["custom"]
}
```

## Requirements

- **Bun** 1.x
- **Ollama** (local or remote with GPU)
- **Chetna** Rust memory server
- **Python 3.9+** for MadMax scheduler

## Known Issues

See [docs/CODE_REVIEW.md](docs/CODE_REVIEW.md) for full bug tracking.

## License

MIT
