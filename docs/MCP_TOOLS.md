# MCP & Tool Registry

Wolverine uses a unified registry where every folder in `WolverineWorkspace/skills/` is treated as a first-class citizen.

## Core Shipped Tools

### 1. `browser` (Pinchtab)
- **Action: `navigate`**: Moves to a URL.
- **Action: `click`**: Clicks an indexed element ID.
- **Action: `snapshot`**: Returns a semantic Markdown map.

### 2. `system` (Shell)
- **Action: `command`**: Executes a bash command in the workspace. Use for software installs, code execution, and file manipulation.

### 3. `telegram` (Outbound)
- **Action: `send_audio`**: Sends a local file as a voice memo to a specific chat ID.

### 4. `update_body` (Meta)
- Triggers a re-scan of the `WolverineWorkspace/skills` directory. Allows Wolverine to acquire new skills it has just written without a reboot.

## The Tool Hindsight Loop
Before any tool is executed, Wolverine performs a **Hindsight Lookup**:
1. It queries Chetna for memories tagged with the tool name and `error` or `lesson`.
2. If past mistakes are found, they are injected into the context *before* the tool runs.
3. This creates a self-correcting feedback loop where Wolverine learns to avoid its own bugs.

## Self-Learning Capability
When Wolverine detects it lacks a tool, it is instructed to use the `system` tool to:
1. Search the web for API docs.
2. Write a Python or TypeScript script.
3. Create a `manifest.json` in its own workspace.
4. Call `update_body` to "upgrade" its own body.
