# Governance & Evolution API

The Python control plane runs on port `8001` and handles the "Corporate" side of the agent.

## Endpoints

### `POST /approvals/request`
Wolverine Gateway calls this when a "Dangerous" tool (like `system`) is called with a destructive command.
- Status: `pending` -> `approved` | `denied`

### `GET /soul/{agent_type}`
Fetches a Jinja2-rendered personality template.
- **Input:** `lead`, `worker`, `researcher`
- **Logic:** Injects user name and preferences into the Markdown instructions.

## Self-Evolution Cycle
1. **Logs**: `WolverineWorkspace/logs/lessons.jsonl` stores every failure.
2. **Analysis**: Python `SkillEvolver` reads logs during system idle time.
3. **Synthesis**: LLM writes a new tool `manifest.json` and pushes it to the workspace.
