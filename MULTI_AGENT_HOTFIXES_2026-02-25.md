# Multi-Agent Hotfixes (February 25, 2026)

This document captures the latest orchestration behavior updates after initial rollout testing.

## Scope

1. Improved orchestration observability (UI process log + terminal).
2. Hard lockout of `secondary_chat` when disabled in settings.
3. Session workspace path sync and per-turn workspace logging.
4. Skill-gated post-check continuation to prevent intent-only early finalization.
5. Consistent skill gating across orchestration entry points.

## 1) Observability Improvements

### Process Log

- Added handling for `info` SSE events in the web UI process log.
- Added handling for `orchestration` SSE events in the web UI process log.
- Orchestration log rows now include trigger/mode/route/reason and assist counters.

### Terminal Log

- Added explicit preflight lifecycle logs:
  - preflight start (provider:model)
  - preflight route decision + reason
- Added explicit explicit/auto assist completion counters.

## 2) `secondary_chat` Hard Disable

Problem observed:

- Even when `Secondary direct chat = No`, preflight could still choose `secondary_chat`, causing extra latency before falling back.

Fixes:

- Preflight system prompt is now built dynamically.
- If `allow_secondary_chat=false`, the prompt no longer offers `secondary_chat` as a valid route.
- Runtime safety coercion is also applied: if model still returns `secondary_chat`, route is forced to `primary_direct`.

Result:

- With direct secondary chat disabled, preflight no longer attempts that route.

## 3) Workspace Path Behavior

Problem observed:

- Tool execution can follow the session-persisted workspace path, which may differ from a newly changed config path.

Fixes:

- Chat turn now resolves configured workspace each turn and syncs session workspace to it.
- Added per-turn log visibility:
  - terminal: `SESSION: <id> | Workspace: <path>`
  - UI process log: `Workspace: <path>`

Result:

- Workspace origin is explicit and no longer ambiguous in debugging.

## 4) Skill-Gated Post-Check Continuation

Problem observed:

- In execute-like tasks, model sometimes returns intent text (example: "First I'll check files") instead of continuing tool calls.

Fix implemented:

- Added post-check continuation gate for execute-like turns:
  - detects intent-only/non-final text
  - detects last-tool-failed + no concrete completion
  - injects a strict continuation nudge and retries (max 2)

Important:

- This logic is only active when `multi-agent-orchestrator` skill is enabled.
- It is not default behavior.

## 5) Consistent Skill Gating

Orchestration is now consistently gated by `multi-agent-orchestrator` skill state for:

- preflight execution
- explicit `request_secondary_assist`
- auto rescue triggers
- exposure of `request_secondary_assist` tool
- post-check continuation behavior

## Files Updated

- `src/gateway/server-v2.ts`
- `src/orchestration/multi-agent.ts`
- `web-ui/index.html`
- `README.md`

## Validation

- TypeScript build passes: `npm run build`

