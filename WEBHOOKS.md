# 🪝 Wolverine Webhooks

Wolverine can receive external triggers via HTTP POST. This allows you to integrate with n8n, Zapier, IFTTT, or your own scripts.

## How it Works
1.  **Enable** the hook server in Settings (Advanced -> Webhooks).
2.  **Define a Token** (standard Bearer auth) to secure your endpoint.
3.  **POST** a JSON payload to `http://your-ip:18789/hooks/agent`.
4.  Wolverine processes the request and responds.

## Example n8n HTTP node config (to call Wolverine):
- URL: `http://localhost:18789/hooks/agent`
- Method: `POST`
- Auth: `Header`
- Headers: `x-wolverine-token: your-token`
- Body:
  ```json
  {
    "message": "The coffee is ready! Post a draft about local coffee trends.",
    "sessionId": "n8n_flow_1"
  }
  ```

## Integration Patterns

### 1. Inbound Webhook (Wolverine as Target)
The simplest model. An external system (e.g. GitHub, Stripe, Typeform) sends data to Wolverine.
- **n8n Workflow**: Trigger (Webhook) -> HTTP Request (to Wolverine)
- **Direct**: Use `curl` to trigger an objective.
  ```bash
  curl -X POST http://localhost:18789/hooks/agent \
    -H "Content-Type: application/json" \
    -H "x-wolverine-token: your-secret" \
    -d '{"message": "Check the project status"}'
  ```

### 2. Notification Pipeline
Gmail → Third-party servers (US) → Wolverine
**Local stack (Wolverine webhooks + optional n8n):**
Gmail → n8n (your PC) → Wolverine (your PC)
*Your data never leaves your environment.*

## Integration Reference Table

| Source | Needs Tunnel? | Needs n8n? | Notes |
|---|---|---|---|
| n8n | No | Yes | Recommended for local-to-local privacy |
| IFTTT | Yes (ngrok) | No | Good for IoT integration |
| GitHub | Yes (ngrok) | No | Auto-respond to PRs/Issues |
| Custom Script | No | No | Use Python/Node.js to pipe data |
