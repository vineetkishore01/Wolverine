# Wolverine Agent Framework

**Version:** 1.0.0  
**Runtime:** Bun (TypeScript) + Rust (Chetna) + Python (MadMax)

A decoupled, hyper-performance agentic partner designed for YouTube/Gmail scale concurrency and autonomous self-evolution.

---

## 🚀 Quick Start

Wolverine is a "Body" that requires a "Memory Layer" (Chetna) to function.
 Follow these steps in order:

### 1. Host the Soul (Chetna)
Before starting Wolverine, you must have an instance of **Chetna** running. Chetna provides the long-term semantic memory.
- **System Run:** `cd ../chetna && cargo run --release`
- **Docker Run:** `cd ../chetna && docker-compose up -d`

### 2. Configure Wolverine
Once Chetna is live, note its URL (default: `http://localhost:1987`). Update `settings.json` in the Wolverine root:
```json
{
  "brain": { "chetnaUrl": "http://your-chetna-ip:1987" }
}
```

### 3. Ignite the Body
Run the unified launch script to start the Gateway, Mind, and Dashboard:
```bash
chmod +x launch.sh && ./launch.sh
```

Access dashboard: **http://localhost:18789**

---

## 🧠 Architecture: Decoupled Logic

Wolverine uses a strictly decoupled architecture to ensure "Clean Body, Permanent Memory" state management.

- **The Body (Wolverine)**: High-speed TS Gateway, Python Mind, and Workspace. Deleting the `WolverineWorkspace` folder wipes its local logs and temporary skills, making it "virgin" but preserving its memory.
- **The Memory Layer (Chetna)**: Standalone Rust microservice.
 Hosts the vector database and identity traits. It can be shared across multiple Wolverine instances.

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
   │ Soul    │   │ Brain   │   │Scheduler│
   └─────────┘   └─────────┘   └─────────┘
```

## Features

- **WebSocket Gateway** - Real-time bidirectional communication
- **Chetna Memory** - Model Context Protocol (MCP) bridge to long-term memory
- **Tool Execution** - Browser automation, shell commands, Telegram
- **Hindsight Learning** - Distills user corrections into permanent rules
- **Self-Evolution** - Automatically synthesizes skills during system idle
- **OLED Dashboard** - Real-time visualization of agent thoughts

## Configuration

Edit `settings.json`:

```json
{
  "gateway": { "port": 18789, "host": "0.0.0.0" },
  "llm": {
    "defaultProvider": "ollama",
    "ollama": { "url": "http://127.0.0.1:11434", "model": "llama3" }
  },
  "telegram": { "botToken": "YOUR_TOKEN", "allowedUserIds": [] },
  "brain": { "chetnaUrl": "http://127.0.0.1:1987" }
}
```

## Requirements

- **Bun** 1.x
- **Ollama** (local or remote with GPU)
- **Chetna** Rust memory server (Running independently)
- **Python 3.9+** for MadMax scheduler

## License

MIT
