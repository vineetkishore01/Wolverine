# Wolverine Gateway API

**Base URL:** `http://localhost:18789`  
**WebSocket:** `ws://localhost:18789`

## HTTP Endpoints

### Health Check
```http
GET /health
```
Returns server status and uptime.

**Response:**
```json
{"status": "ok", "uptime": 1234.56}
```

---

### Get Configuration
```http
GET /api/config
```
Returns current settings.

---

### Update Configuration (Hot Reload)
```http
POST /api/config
Content-Type: application/json

{...settings object...}
```
Updates settings and hot-reloads components without restart.

---

### Search Memory
```http
GET /api/memory?q=search+query
```
Searches Chetna long-term semantic memory.

**Response:**
```json
{"memories": [{"content": "...", "id": "..."}]}
```

---

### Clear Memory
```http
DELETE /api/memory/clear
```
Clears all memories from Chetna.

---

### Onboarding
```http
POST /api/onboarding
Content-Type: application/json

{
  "llm": {
    "defaultProvider": "ollama",
    "ollama": { "url": "http://192.168.0.62:11434", "model": "qwen3.5:4b" }
  },
  "telegram": { "botToken": "", "allowedUserIds": [] },
  "brain": { "chetnaUrl": "http://127.0.0.1:1987" }
}
```
Initial setup - saves config and initializes services.

---

### Trigger Evolution
```http
POST /api/evolve
```
Manually triggers skill evolution cycle (MadMax).

---

## WebSocket Protocol

### Message Format

**Request:**
```json
{
  "type": "req",
  "id": "uuid",
  "method": "method_name",
  "params": {}
}
```

**Response:**
```json
{
  "type": "res",
  "id": "uuid",
  "ok": true,
  "payload": {...}
}
```

**Event (Server Push):**
```json
{
  "type": "event",
  "payload": {
    "type": "thought|action|memory|system",
    "source": "Gateway|Brain|Ollama|ToolHandler",
    "content": "...",
    "timestamp": 1234567890
  }
}
```

---

### Connect Method
Registers a client/node with the gateway.

```json
{
  "type": "req",
  "id": "init",
  "method": "connect",
  "params": {
    "nodeId": "unique-id",
    "capabilities": ["chat", "telemetry"],
    "displayName": "Web Dashboard"
  }
}
```

**Response:**
```json
{
  "type": "res",
  "id": "init",
  "ok": true,
  "payload": { "status": "ready" }
}
```

---

### Agent Chat Method
Sends a message to the agent and gets a response.

```json
{
  "type": "req",
  "id": "msg-1",
  "method": "agent.chat",
  "params": {
    "messages": [
      {"role": "user", "content": "Hello, who are you?"}
    ],
    "metadata": {}
  }
}
```

**Response:**
```json
{
  "type": "res",
  "id": "msg-1",
  "ok": true,
  "payload": {
    "content": "I am Wolverine, a high-performance AI agent...",
    "model": "qwen3.5:4b",
    "usage": {
      "promptTokens": 100,
      "completionTokens": 50,
      "totalTokens": 150
    }
  },
  "metadata": {}
}
```

---

## Event Types

| Type | Source | Description |
|------|--------|-------------|
| `system` | Gateway | Connection status, errors |
| `thought` | Brain | Memory retrieval, context building |
| `thought` | Ollama | LLM raw response |
| `action` | ToolHandler | Tool execution |
| `memory` | Brain | Memory updates |

---

## Error Responses

```json
{
  "type": "res",
  "id": "msg-1",
  "ok": false,
  "error": "Error message here"
}
```

---

## Example: JavaScript Client

```javascript
const ws = new WebSocket('ws://localhost:18789');

ws.onopen = () => {
  // Connect
  ws.send(JSON.stringify({
    type: "req",
    id: "1",
    method: "connect",
    params: { nodeId: "my-client", capabilities: ["chat"] }
  }));
  
  // Chat
  ws.send(JSON.stringify({
    type: "req",
    id: "2",
    method: "agent.chat",
    params: { messages: [{ role: "user", content: "Hello" }] }
  }));
};

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log(data.type, data.payload);
};
```
