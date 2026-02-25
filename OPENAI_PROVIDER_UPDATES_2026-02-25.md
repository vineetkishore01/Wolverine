# OpenAI + Multi-Agent Updates (February 25, 2026)

This document is the latest status of the provider and orchestration rollout in SmallClaw.

For the newest post-rollout fixes (skill-gated continuation checks, strict `secondary_chat` disabling, workspace sync logging), see:

- `MULTI_AGENT_HOTFIXES_2026-02-25.md`

## Scope Completed

1. Multi-provider model system (local + cloud) is integrated.
2. OpenAI Codex OAuth is integrated and working.
3. OpenAI API model list is live-refresh (not hardcoded-only).
4. Multi-Agent Orchestration skill is implemented with gating + preflight + auto/explicit triggers.
5. Skills loading mismatch was fixed with runtime recovery logic.
6. Models settings UI was cleaned up and role overrides were removed.

## Provider Coverage

- `ollama` (local)
- `llama_cpp` (local OpenAI-compatible server)
- `lm_studio` (local OpenAI-compatible server)
- `openai` (API key)
- `openai_codex` (ChatGPT Plus/Pro OAuth)

## OpenAI Codex (OAuth) Implementation

- Codex provider uses:
  - `https://chatgpt.com/backend-api/codex/responses`
- Required headers include:
  - `Authorization: Bearer <oauth_access_token>`
  - `chatgpt-account-id: <account_id>`
  - `OpenAI-Beta: responses=experimental`
- OAuth flow supports:
  - PKCE + state validation
  - localhost callback
  - manual redirect paste fallback
  - refresh token handling

## Codex Request Compatibility Fixes

Codex endpoint payload now matches supported parameters for this backend path.

- Added:
  - `store: false`
- Removed unsupported fields from this flow:
  - `temperature`
  - `max_output_tokens`
- Added:
  - `tool_choice: auto`
  - `parallel_tool_calls: true`

## OpenAI API Model UX

- OpenAI model picker uses live account model list.
- Backend endpoint:
  - `POST /api/openai/models`
- UI supports:
  - `Refresh Models`
  - `Test Connection`

## Multi-Agent Orchestration (New)

### Core design

- Primary model remains the active runtime executor.
- Secondary model is advisory only (planner/rescue guidance).
- Secondary advice is injected back into the primary loop as guidance text.

### Configuration + APIs

- `GET /api/orchestration/config`
- `POST /api/orchestration/config`
- `GET /api/orchestration/eligible`

Stored under config:

- `orchestration.enabled`
- `orchestration.secondary.provider`
- `orchestration.secondary.model`
- `orchestration.triggers.consecutive_failures`
- `orchestration.triggers.stagnation_rounds`
- `orchestration.triggers.loop_detection`
- `orchestration.triggers.risky_files_threshold`
- `orchestration.triggers.risky_tool_ops_threshold`
- `orchestration.triggers.no_progress_seconds`
- `orchestration.preflight.mode`
- `orchestration.preflight.allow_secondary_chat`
- `orchestration.limits.assist_cooldown_rounds`
- `orchestration.limits.max_assists_per_turn`
- `orchestration.limits.max_assists_per_session`
- `orchestration.limits.telemetry_history_limit`

### Skill gating behavior

- `multi-agent-orchestrator` skill is only eligible when a valid secondary model is configured.
- `/api/skills` returns `eligible` and `eligibleReason` for this skill.
- Enabling the skill is blocked server-side if not eligible (409 response).
- Toggling the skill on/off also syncs `orchestration.enabled` in config.

### Runtime triggers

Secondary advisor can be invoked by:

1. Explicit tool call: `request_secondary_assist`
2. Auto trigger on consecutive tool failures
3. Auto trigger on loop detection
4. Auto trigger on stagnation rounds
5. Auto trigger on risky edit scope (many files)
6. Auto trigger on risky edit volume (large line-ops)
7. Auto trigger on time-based no-progress window

### Secondary-First preflight

Before the main executor loop (when enabled), SmallClaw can run a secondary advisor preflight pass:

- Route output options:
  - `primary_direct`
  - `primary_with_plan`
  - `secondary_chat`
- For `primary_with_plan`, structured hints are injected into hidden runtime context for the primary model.
- For `secondary_chat`, direct secondary answer is allowed only when `allow_secondary_chat=true`.

### Assist caps and telemetry

- Session cap enforced: secondary advisor stops after `max_assists_per_session`.
- Turn cap enforced: no more than `max_assists_per_turn`.
- Cooldown enforced across rounds: `assist_cooldown_rounds`.
- Runtime telemetry is tracked per session and exposed via:
  - `GET /api/orchestration/telemetry?sessionId=<id>`
- SSE orchestration events now include assist counters (`assist_count`, `assist_cap`).

### Planner contract (upgraded)

Planner mode now returns a richer structured payload intended for small local executors:

- `task_plan`
- `checkpoints`
- `exact_files`
- `success_criteria`
- `verification_checklist`
- `search_queries`
- `tool_sequence`
- plus immediate `next_actions`, `stop_doing`, `hints`, `risk_note`

## Skills Path Recovery Fix

Issue addressed:

- Skills existed in project path (`d:\SmallClaw\.localclaw\skills`) but runtime path (`D:\localclaw\.localclaw\skills`) was configured and could be empty.

Fixes added:

- Skills directory resolver + sync at startup.
- Skills state migration when missing.
- Auto-recovery rescan on `/api/skills` when runtime skills are empty.
- Guaranteed provisioning of `multi-agent-orchestrator/SKILL.md` template.

## Settings UI Final State

- Role Overrides section removed from Models settings.
- Multi-Agent panel restyled to match theme.
- Secondary Model is now a dropdown (provider-aware model options) rather than plain text input.
- Existing provider/model controls remain intact.

## Gateway/CLI Stability Improvement

- Starting gateway while another instance is already bound to `127.0.0.1:18789` now reports clearly instead of crashing with unclear output.
- CLI `localclaw gateway start` checks if gateway is already running first.

## Main Files Updated

- `src/auth/openai-oauth.ts`
- `src/providers/openai-codex-adapter.ts`
- `src/providers/openai-compat-adapter.ts`
- `src/providers/factory.ts`
- `src/orchestration/multi-agent.ts`
- `src/orchestration/SKILL.md`
- `.localclaw/skills/multi-agent-orchestrator/SKILL.md`
- `src/gateway/server-v2.ts`
- `src/config/config.ts`
- `src/types.ts`
- `src/cli/index.ts`
- `web-ui/index.html`

## Current Result (as of February 25, 2026)

- Multi-provider runtime works across local and OpenAI paths.
- OpenAI Codex OAuth flow is connected and usable.
- OpenAI API model selection is live-populated.
- Multi-Agent Orchestrator is implemented with backend gating and runtime trigger logic.
- Skills panel loading/path mismatch issue is fixed.
