# WOLVERINE OBD (On-Board Diagnostics) SYSTEM

## Overview

The OBD system is Wolverine's engineering diagnostic suite, inspired by automotive OBD systems. It provides complete visibility into Wolverine's internal processing, allowing engineers to observe, test, and debug the agent's behavior in real-time.

---

## Quick Start

```bash
# Start Wolverine Gateway
./launch_obd.sh

# Or run OBD directly (Gateway must be running)
~/.bun/bin/bun run scripts/obd.ts

# With debugging enabled
~/.bun/bin/bun run scripts/obd.ts --debug --full-prompts

# Run a test simulation
~/.bun/bin/bun run scripts/obd.ts --simulate --script scripts/test-obd.json
```

---

## Command Flags

| Flag | Description |
|------|-------------|
| `--debug` | Show all raw WebSocket messages |
| `--full-prompts` | Display complete LLM prompts/responses |
| `--metrics` | Enable real-time metrics tracking |
| `--trace` | Log all events to trace file |
| `--simulate` | Run automated test script |
| `--script <path>` | Path to simulation script |

---

## Interactive Commands

Once OBD is running, type these commands:

### Core Commands
| Command | Description |
|---------|-------------|
| `chat <msg>` | Send message to Wolverine |
| `chat! <msg>` | Send and wait for full response dump |
| `help` or `?` | Show all available commands |
| `exit` or `quit` | Exit OBD |

### Diagnostic Commands
| Command | Description |
|---------|-------------|
| `health` | Check Gateway health |
| `metrics` | Show session statistics |
| `perf` | Show events per second |
| `trace` | View recent event history |
| `version` | Show system version |
| `clear` | Clear screen |

### Memory Commands
| Command | Description |
|---------|-------------|
| `memory search <query>` | Search Chetna memory |
| `memory list` | List recent memories |
| `memory clear` | Clear all memories |

### System Commands
| Command | Description |
|---------|-------------|
| `context dump` | Show current context assembly |
| `db dump` | Query SQLite messages table |
| `db summaries` | Show summary table |
| `tools list` | Show registered skills |
| `config get` | Show current settings |

### Testing Commands
| Command | Description |
|---------|-------------|
| `stress <n>` | Run n concurrent requests |
| `inject <json>` | Inject test data |

---

## OBD Telemetry Events

The OBD captures and displays these event types:

| Event | Color | Description |
|-------|-------|-------------|
| `SYSTEM` | White | Gateway connections, initialization |
| `CHAT` | Green | User and Wolverine messages |
| `CONTEXT` | Cyan | Context assembly details |
| `LLM_IN` | Yellow | Model being called |
| `LLM_OUT` | Yellow | Model response |
| `ACTION` | Green | Tool execution |
| `MEMORY` | Magenta | Memory operations |
| `ERROR` | Red | Error conditions |

---

## Example Output

```
╔════════════════════════════════════════════════════════════════╗
║   🐺 WOLVERINE OBD v2.0 - ENGINEERING DIAGNOSTIC SUITE          ║
╠════════════════════════════════════════════════════════════════╣
║  Mode: DEBUG                                                   ║
║  Target: ws://127.0.0.1:18789                                    ║
╚════════════════════════════════════════════════════════════════╝

[0001] --- SYSTEM (Source: Gateway at 2:30:00 PM) ---
Node Connected: OBD Harness

[0002] --- CHAT (Source: User at 2:30:00 PM) ---
My name is Vineet.

[0003] --- CONTEXT (Source: Brain at 2:30:01 PM) ---
Sparse Context Assembled (6 messages + Instructions)

[0004] --- LLM_IN (Source: Brain at 2:30:01 PM) ---
════════════════════════════════════════════════════════════
Model: qwen3.5:0.8b | Sparse Context: 7 msgs
════════════════════════════════════════════════════════════

[0005] --- LLM_OUT (Source: Ollama at 2:30:08 PM) ---
════════════════════════════════════════════════════════════
(In 7.2s) Hello Vineet! I'm ready to assist you...

════════════════════════════════════════════════════════════

[0006] --- CHAT (Source: Wolverine at 2:30:08 PM) ---
Hello Vineet! I'm ready to assist you...

[0007] --- MEMORY (Source: Brain at 2:30:10 PM) ---
🧠 MEMORY OP: "Extracted 2 facts: My name is Vineet"
```

---

## Creating Test Scripts

Test scripts are JSON files that automate conversations:

```json
{
  "name": "Memory Test",
  "description": "Test Chetna memory integration",
  "steps": [
    {
      "input": "My name is Vineet.",
      "wait": 30000
    },
    {
      "input": "I live in San Francisco.",
      "wait": 30000
    },
    {
      "input": "What's my name?",
      "wait": 45000
    }
  ]
}
```

Save to `scripts/` folder and run:
```bash
~/.bun/bin/bun run scripts/obd.ts --simulate --script scripts/my-test.json
```

---

## Log Files

OBD automatically logs to:

| File | Location | Contents |
|------|----------|----------|
| `obd_trace.log` | `WolverineWorkspace/logs/diagnostics/` | All telemetry events |
| `obd_full_trace.log` | `WolverineWorkspace/logs/diagnostics/` | Full debug trace (with `--trace`) |
| `obd_metrics.json` | `WolverineWorkspace/logs/diagnostics/` | Session metrics |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OBD CLIENT                                   │
│                   (scripts/obd.ts)                                   │
├─────────────────────────────────────────────────────────────────────┤
│  • WebSocket connection to Gateway                                   │
│  • Command parser                                                    │
│  • Event formatter                                                   │
│  • Simulation runner                                                 │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WOLVERINE GATEWAY                               │
│                      (src/gateway/server.ts)                         │
├─────────────────────────────────────────────────────────────────────┤
│  • WebSocket server                                                  │
│  • TelemetryHub publishes events                                     │
│  • Routes requests to CognitiveCore                                 │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       TELEMETRY HUB                                  │
│                      (src/gateway/telemetry.ts)                      │
├─────────────────────────────────────────────────────────────────────┤
│  • Broadcasts events via WebSocket                                   │
│  • Persists to log files                                            │
│  • Console output for diagnostics                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Connection Refused
```bash
# Check if Gateway is running
curl http://127.0.0.1:18789/health

# Restart Gateway
pkill -f "bun" && ~/.bun/bin/bun run src/index.ts &
```

### No Responses from LLM
```bash
# Check Ollama status
curl http://192.168.0.62:11434/api/tags

# Test Ollama directly
curl -s http://192.168.0.62:11434/api/generate \
  -d '{"model":"qwen3.5:0.8b","prompt":"hi","stream":false}'
```

### Chetna Memory Issues
```bash
# Check Chetna status
curl http://127.0.0.1:1987/api/health

# Test Chetna MCP
curl -X POST http://127.0.0.1:1987/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"memory_search","params":{"query":"test"},"id":"test"}'
```

---

## For Fast GPU Testing

Once you have a fast Ollama server:

1. Update `settings.json`:
```json
{
  "llm": {
    "ollama": {
      "url": "http://YOUR-FAST-GPU-IP:11434",
      "model": "qwen3.5:4b"
    }
  }
}
```

2. Restart Wolverine and test with `--debug --full-prompts` to see the full LLM interaction pipeline.
