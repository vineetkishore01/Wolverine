/**
 * multi-agent.ts
 *
 * Dual-model orchestration: advisor / executor split.
 *
 * PRIMARY model (active llm.provider) does all tool calls.
 * SECONDARY model is advisory only and returns structured guidance that is
 * injected as hidden runtime context into the primary's next step.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { getConfig } from '../config/config';
import type { LLMProvider } from '../providers/LLMProvider';

export type PreflightMode = 'off' | 'complex_only' | 'always';

export interface SecondaryProfile {
  provider: string;
  model: string;
}

export interface OrchestrationConfig {
  enabled: boolean;
  secondary: SecondaryProfile;
  triggers: {
    consecutive_failures: number;
    stagnation_rounds: number;
    loop_detection: boolean;
    risky_files_threshold: number;
    risky_tool_ops_threshold: number;
    no_progress_seconds: number;
  };
  preflight: {
    mode: PreflightMode;
    allow_secondary_chat: boolean;
  };
  limits: {
    assist_cooldown_rounds: number;
    max_assists_per_turn: number;
    max_assists_per_session: number;
    telemetry_history_limit: number;
  };
}

const VALID_PREFLIGHT_MODES: Set<PreflightMode> = new Set(['off', 'complex_only', 'always']);

function normalizePreflightMode(value: any): PreflightMode {
  const mode = String(value || '').trim() as PreflightMode;
  return VALID_PREFLIGHT_MODES.has(mode) ? mode : 'complex_only';
}

function clampInt(value: any, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function getOrchestrationConfig(): OrchestrationConfig | null {
  const raw = getConfig().getConfig() as any;
  const oc = raw.orchestration;
  if (!oc?.secondary?.provider || !oc?.secondary?.model) return null;

  return {
    enabled: !!oc.enabled,
    secondary: {
      provider: String(oc.secondary.provider || '').trim(),
      model: String(oc.secondary.model || '').trim(),
    },
    triggers: {
      consecutive_failures: clampInt(oc.triggers?.consecutive_failures, 1, 8, 2),
      stagnation_rounds: clampInt(oc.triggers?.stagnation_rounds, 1, 12, 3),
      loop_detection: oc.triggers?.loop_detection ?? true,
      risky_files_threshold: clampInt(oc.triggers?.risky_files_threshold, 1, 30, 6),
      risky_tool_ops_threshold: clampInt(oc.triggers?.risky_tool_ops_threshold, 10, 2000, 220),
      no_progress_seconds: clampInt(oc.triggers?.no_progress_seconds, 15, 600, 90),
    },
    preflight: {
      mode: normalizePreflightMode(oc.preflight?.mode),
      allow_secondary_chat: oc.preflight?.allow_secondary_chat === true,
    },
    limits: {
      assist_cooldown_rounds: clampInt(oc.limits?.assist_cooldown_rounds, 1, 12, 3),
      max_assists_per_turn: clampInt(oc.limits?.max_assists_per_turn, 1, 12, 3),
      max_assists_per_session: clampInt(oc.limits?.max_assists_per_session, 1, 100, 18),
      telemetry_history_limit: clampInt(oc.limits?.telemetry_history_limit, 10, 500, 100),
    },
  };
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

function getConfigDir(): string {
  const project = path.join(process.cwd(), '.localclaw');
  const home = path.join(os.homedir(), '.localclaw');
  return fs.existsSync(project) ? project : home;
}

export async function checkOrchestrationEligibility(): Promise<EligibilityResult> {
  const raw = getConfig().getConfig() as any;
  const primaryProvider = raw.llm?.provider || 'ollama';
  if (!raw.llm?.providers?.[primaryProvider]) {
    return { eligible: false, reason: 'Primary provider not configured in Settings -> Models.' };
  }

  const secondary = raw.orchestration?.secondary;
  if (!secondary?.provider || !secondary?.model) {
    return { eligible: false, reason: 'Secondary model not configured in Settings -> Models -> Orchestration.' };
  }

  const primaryModel = raw.llm?.providers?.[primaryProvider]?.model;
  if (secondary.provider === primaryProvider && secondary.model === primaryModel) {
    return { eligible: false, reason: 'Secondary must be a different model than primary.' };
  }

  if (secondary.provider === 'openai_codex') {
    const tokenPath = path.join(getConfigDir(), 'credentials', 'oauth-openai.json');
    if (!fs.existsSync(tokenPath)) {
      return { eligible: false, reason: 'Secondary is ChatGPT but no OAuth token found - connect your account first.' };
    }
  }

  if (secondary.provider === 'openai') {
    if (!raw.llm?.providers?.openai?.api_key) {
      return { eligible: false, reason: 'Secondary is OpenAI but no API key configured.' };
    }
  }

  return { eligible: true };
}

export function shouldRunPreflight(userMessage: string, mode: PreflightMode): boolean {
  if (mode === 'off') return false;
  if (mode === 'always') return true;

  // complex_only heuristic tuned for 4B assistance:
  // longer prompts, coding/edit/search terms, or multiline asks.
  const text = String(userMessage || '');
  const lower = text.toLowerCase();
  if (text.length >= 120) return true;
  if (text.includes('\n')) return true;

  return /\b(plan|spec|checklist|refactor|debug|fix|error|stack|search|web|browse|tool|edit|file|code|implement|oauth|api|endpoint|config|settings|migration)\b/i.test(lower);
}

export class OrchestrationTriggerState {
  consecutiveFailures = 0;
  stagnantRounds = 0;
  lastProgressRound = -1;
  lastProgressAtMs = Date.now();
  recentToolSignatures: string[] = [];
  lastAssistRound = -99;
  assistCountThisTurn = 0;
  riskyEditOps = 0;
  touchedFiles: Set<string> = new Set();

  recordToolResult(round: number, toolName: string, args: any, error: boolean) {
    if (error) {
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
      this.lastProgressRound = round;
      this.lastProgressAtMs = Date.now();
      this.stagnantRounds = 0;
      this.trackEditRisk(toolName, args);
    }

    const sig = `${toolName}:${JSON.stringify(args).slice(0, 80)}`;
    this.recentToolSignatures.push(sig);
    if (this.recentToolSignatures.length > 8) this.recentToolSignatures.shift();
  }

  recordRoundNoProgress(round: number) {
    if (this.lastProgressRound < round) this.stagnantRounds++;
  }

  shouldTrigger(
    cfg: OrchestrationConfig,
    round: number,
    nowMs: number = Date.now(),
    sessionAssistCount: number = 0,
  ): { fire: boolean; reason: string } {
    if (this.assistCountThisTurn >= cfg.limits.max_assists_per_turn) {
      return { fire: false, reason: 'turn assist cap reached' };
    }
    if (sessionAssistCount >= cfg.limits.max_assists_per_session) {
      return { fire: false, reason: 'session assist cap reached' };
    }
    if (round - this.lastAssistRound < cfg.limits.assist_cooldown_rounds) {
      return { fire: false, reason: 'cooldown' };
    }
    if (this.consecutiveFailures >= cfg.triggers.consecutive_failures) {
      return { fire: true, reason: `${this.consecutiveFailures} consecutive tool failures` };
    }
    if (cfg.triggers.loop_detection && this.detectLoop()) {
      return { fire: true, reason: 'repeated tool-call loop detected' };
    }
    if (this.touchedFiles.size >= cfg.triggers.risky_files_threshold) {
      return { fire: true, reason: `risky edit scope: ${this.touchedFiles.size} files touched` };
    }
    if (this.riskyEditOps >= cfg.triggers.risky_tool_ops_threshold) {
      return { fire: true, reason: `risky edit volume: ~${this.riskyEditOps} line-ops` };
    }
    if (this.stagnantRounds >= cfg.triggers.stagnation_rounds) {
      return { fire: true, reason: `stalled for ${this.stagnantRounds} rounds with no progress` };
    }
    const noProgressForMs = nowMs - this.lastProgressAtMs;
    if (noProgressForMs >= cfg.triggers.no_progress_seconds * 1000) {
      return { fire: true, reason: `no progress for ${Math.floor(noProgressForMs / 1000)}s` };
    }
    return { fire: false, reason: '' };
  }

  markFired(round: number) {
    this.lastAssistRound = round;
    this.assistCountThisTurn++;
    this.consecutiveFailures = 0;
    this.stagnantRounds = 0;
  }

  private trackEditRisk(toolName: string, args: any): void {
    const filename = String(args?.filename || args?.name || '').trim();
    if (filename) this.touchedFiles.add(filename);

    switch (toolName) {
      case 'create_file':
      case 'delete_file':
      case 'find_replace':
        this.riskyEditOps += 1;
        break;
      case 'replace_lines':
      case 'delete_lines': {
        const start = Math.max(1, Math.floor(Number(args?.start_line) || 1));
        const end = Math.max(start, Math.floor(Number(args?.end_line) || start));
        this.riskyEditOps += Math.max(1, end - start + 1);
        break;
      }
      case 'insert_after': {
        const inserted = String(args?.content || '').split('\n').length;
        this.riskyEditOps += Math.max(1, inserted);
        break;
      }
      default:
        break;
    }
  }

  private detectLoop(): boolean {
    const sigs = this.recentToolSignatures;
    if (sigs.length < 4) return false;
    const last4 = sigs.slice(-4);
    return last4[0] === last4[2] && last4[1] === last4[3];
  }
}

export interface AdvisoryResult {
  mode: 'planner' | 'rescue';
  next_actions: string[];
  stop_doing: string[];
  hints: string[];
  risk_note: string;
  task_plan: string[];
  checkpoints: string[];
  exact_files: string[];
  success_criteria: string[];
  verification_checklist: string[];
  search_queries: string[];
  tool_sequence: string[];
}

const RESCUE_ADVISOR_SYSTEM = `You are a senior AI rescue advisor. Another AI (the executor) is stuck and needs recovery guidance.

Return ONLY a JSON object - no markdown, no explanation:
{
  "mode": "rescue",
  "next_actions": ["step 1", "step 2", "step 3"],
  "stop_doing": ["what to stop"],
  "hints": ["exact search query", "file path", "tool arg hint"],
  "risk_note": "warning or empty string",
  "task_plan": [],
  "checkpoints": [],
  "exact_files": [],
  "success_criteria": [],
  "verification_checklist": [],
  "search_queries": [],
  "tool_sequence": []
}

Rules:
- next_actions: max 5 items, each under 90 chars, ordered and specific
- stop_doing: max 3 items
- hints: concrete and actionable, max 6 items
- Return rescue-focused actions only
- Return JSON only`;

const PLANNER_ADVISOR_SYSTEM = `You are a senior AI planning advisor for a small 4B local executor model.

Return ONLY a JSON object - no markdown, no explanation:
{
  "mode": "planner",
  "task_plan": ["high-level step 1", "high-level step 2"],
  "checkpoints": ["checkpoint 1", "checkpoint 2"],
  "exact_files": ["path/file1.ts", "path/file2.md"],
  "success_criteria": ["what must be true at the end"],
  "verification_checklist": ["how to verify quickly"],
  "search_queries": ["query 1", "query 2"],
  "tool_sequence": ["read_file(file)", "replace_lines(file,...)"],
  "next_actions": ["immediate next action 1", "action 2"],
  "stop_doing": ["what to avoid"],
  "hints": ["small concrete tip"],
  "risk_note": "warning or empty string"
}

Rules:
- Keep it concise and executable for a small model
- task_plan max 6 items
- checkpoints max 6 items
- exact_files max 8 items
- success_criteria max 6 items
- verification_checklist max 6 items
- search_queries max 6 items
- tool_sequence max 8 items
- next_actions max 5 items
- Use precise file/tool hints over vague advice
- Return JSON only`;

export interface PreflightResult {
  route: 'primary_direct' | 'primary_with_plan' | 'secondary_chat';
  reason: string;
  quick_plan: string[];
  search_queries: string[];
  likely_files: string[];
  tool_hints: string[];
  secondary_response: string;
  risk_note: string;
}

function buildPreflightSystemPrompt(allowSecondaryChat: boolean): string {
  if (!allowSecondaryChat) {
    return `You are the secondary advisor for a small local coding assistant.

Decide routing for this turn and return JSON only:
{
  "route": "primary_direct" | "primary_with_plan",
  "reason": "short reason",
  "quick_plan": ["step 1", "step 2", "step 3"],
  "search_queries": ["query 1", "query 2"],
  "likely_files": ["path/one.ts", "path/two.ts"],
  "tool_hints": ["tool(arg: value)", "tool(arg: value)"],
  "secondary_response": "",
  "risk_note": "warning or empty string"
}

Routing policy:
- primary_direct: simple message, no planning needed
- primary_with_plan: technical, multi-step, tool-heavy, or risky tasks

Critical rule:
- secondary_chat is DISABLED in runtime for this session.
- NEVER output route=secondary_chat.
- Keep secondary_response empty.

Output constraints:
- quick_plan max 5 items
- search_queries max 4
- likely_files max 6
- tool_hints max 6
- Keep entries short and concrete
- Return JSON only`;
  }

  return `You are the secondary advisor for a small local coding assistant.

Decide routing for this turn and return JSON only:
{
  "route": "primary_direct" | "primary_with_plan" | "secondary_chat",
  "reason": "short reason",
  "quick_plan": ["step 1", "step 2", "step 3"],
  "search_queries": ["query 1", "query 2"],
  "likely_files": ["path/one.ts", "path/two.ts"],
  "tool_hints": ["tool(arg: value)", "tool(arg: value)"],
  "secondary_response": "Only if route=secondary_chat, otherwise empty",
  "risk_note": "warning or empty string"
}

Routing policy:
- primary_direct: simple message, no planning needed
- primary_with_plan: technical, multi-step, tool-heavy, or risky tasks
- secondary_chat: plain conversation where a direct answer is enough and no tools are needed

Output constraints:
- quick_plan max 5 items
- search_queries max 4
- likely_files max 6
- tool_hints max 6
- Keep entries short and concrete
- Return JSON only`;
}

function compactList(values: any, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const v of values) {
    const s = String(v || '').trim();
    if (!s) continue;
    out.push(s.slice(0, maxLen));
    if (out.length >= maxItems) break;
  }
  return out;
}

function parseJsonObject(raw: string): any | null {
  const clean = String(raw || '').replace(/```json|```/g, '').trim();
  if (!clean) return null;
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

async function buildSecondaryProvider(): Promise<{ provider: LLMProvider; config: OrchestrationConfig } | null> {
  const config = getOrchestrationConfig();
  if (!config) return null;

  let provider: LLMProvider;
  try {
    const { buildProviderById } = await import('../providers/factory');
    provider = buildProviderById(config.secondary.provider);
  } catch (err: any) {
    console.error('[Orchestrator] Failed to build secondary provider:', err.message);
    return null;
  }

  return { provider, config };
}

export async function callSecondaryPreflight(input: {
  userMessage: string;
  recentHistory?: Array<{ role: string; content: string }>;
}): Promise<PreflightResult | null> {
  const built = await buildSecondaryProvider();
  if (!built) return null;
  const { provider, config } = built;
  if (config.preflight.mode === 'off') return null;

  const historyText = (input.recentHistory || [])
    .slice(-4)
    .map((m, i) => `${i + 1}. ${m.role}: ${String(m.content || '').slice(0, 220)}`)
    .join('\n');

  const prompt = `USER MESSAGE:
${String(input.userMessage || '').slice(0, 1800)}

RECENT CONTEXT:
${historyText || '(none)'}

Return routing JSON now.`;

  try {
    const preflightSystem = buildPreflightSystemPrompt(config.preflight.allow_secondary_chat);
    const result = await provider.chat(
      [
        { role: 'system', content: preflightSystem },
        { role: 'user', content: prompt },
      ],
      config.secondary.model,
      { max_tokens: 650 },
    );

    const parsed = parseJsonObject(result.message.content || '');
    if (!parsed) return null;

    const routeRaw = String(parsed.route || '').trim();
    let route: PreflightResult['route'] =
      routeRaw === 'secondary_chat' || routeRaw === 'primary_with_plan' || routeRaw === 'primary_direct'
        ? routeRaw
        : 'primary_with_plan';
    let reason = String(parsed.reason || '').slice(0, 240);
    if (!config.preflight.allow_secondary_chat && route === 'secondary_chat') {
      route = 'primary_direct';
      reason = (reason ? `${reason} ` : '') + '(secondary_chat disabled by settings)';
    }

    return {
      route,
      reason: reason.slice(0, 240),
      quick_plan: compactList(parsed.quick_plan, 5, 120),
      search_queries: compactList(parsed.search_queries, 4, 140),
      likely_files: compactList(parsed.likely_files, 6, 180),
      tool_hints: compactList(parsed.tool_hints, 6, 140),
      secondary_response: String(parsed.secondary_response || '').slice(0, 1600),
      risk_note: String(parsed.risk_note || '').slice(0, 220),
    };
  } catch (err: any) {
    console.error('[Orchestrator] Preflight call failed:', err.message);
    return null;
  }
}

export async function callSecondaryAdvisor(
  goal: string,
  recentActions: string[],
  triggerReason: string,
  mode: 'planner' | 'rescue',
): Promise<AdvisoryResult | null> {
  const built = await buildSecondaryProvider();
  if (!built) return null;
  const { provider, config } = built;

  const actionsText = recentActions.slice(-6).map((a, i) => `${i + 1}. ${a}`).join('\n');
  const prompt = `GOAL: ${goal}

WHY I AM BEING CALLED: ${triggerReason}

WHAT THE EXECUTOR HAS DONE:
${actionsText || '(no actions yet - executor needs initial plan)'}

Return guidance JSON now.`;

  try {
    const systemPrompt = mode === 'planner' ? PLANNER_ADVISOR_SYSTEM : RESCUE_ADVISOR_SYSTEM;
    const result = await provider.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      config.secondary.model,
      { max_tokens: mode === 'planner' ? 950 : 600 },
    );

    const parsed = parseJsonObject(result.message.content || '');
    if (!parsed) {
      const raw = String(result.message.content || '').trim();
      return {
        mode,
        next_actions: ['Continue carefully with the task.'],
        stop_doing: [],
        hints: raw ? [raw.slice(0, 200)] : [],
        risk_note: '',
        task_plan: [],
        checkpoints: [],
        exact_files: [],
        success_criteria: [],
        verification_checklist: [],
        search_queries: [],
        tool_sequence: [],
      };
    }

    return {
      mode: parsed.mode === 'planner' || parsed.mode === 'rescue' ? parsed.mode : mode,
      next_actions: compactList(parsed.next_actions, 5, 120),
      stop_doing: compactList(parsed.stop_doing, 3, 120),
      hints: compactList(parsed.hints, 6, 160),
      risk_note: String(parsed.risk_note || '').slice(0, 220),
      task_plan: compactList(parsed.task_plan, 6, 140),
      checkpoints: compactList(parsed.checkpoints, 6, 140),
      exact_files: compactList(parsed.exact_files, 8, 220),
      success_criteria: compactList(parsed.success_criteria, 6, 160),
      verification_checklist: compactList(parsed.verification_checklist, 6, 160),
      search_queries: compactList(parsed.search_queries, 6, 160),
      tool_sequence: compactList(parsed.tool_sequence, 8, 160),
    };
  } catch (err: any) {
    console.error('[Orchestrator] Secondary call failed:', err.message);
    return null;
  }
}

export function formatPreflightHint(preflight: PreflightResult): string {
  const lines: string[] = ['[ADVISOR PREFLIGHT - hidden guidance for this turn]'];
  if (preflight.reason) lines.push(`Reason: ${preflight.reason}`);

  if (preflight.quick_plan.length) {
    lines.push('Quick plan:');
    preflight.quick_plan.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  }

  if (preflight.search_queries.length) {
    lines.push('Suggested search queries:');
    preflight.search_queries.forEach((q) => lines.push(`  - ${q}`));
  }

  if (preflight.likely_files.length) {
    lines.push('Likely files:');
    preflight.likely_files.forEach((f) => lines.push(`  - ${f}`));
  }

  if (preflight.tool_hints.length) {
    lines.push('Tool hints:');
    preflight.tool_hints.forEach((t) => lines.push(`  - ${t}`));
  }

  if (preflight.risk_note) lines.push(`Risk: ${preflight.risk_note}`);
  lines.push('[/ADVISOR PREFLIGHT]');
  return lines.join('\n');
}

export function formatAdvisoryHint(advice: AdvisoryResult): string {
  const lines = ['[ADVISOR GUIDANCE - follow this for your next actions]'];
  if (advice.mode === 'planner' && advice.task_plan.length) {
    lines.push('Task plan:');
    advice.task_plan.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
  }
  if (advice.mode === 'planner' && advice.checkpoints.length) {
    lines.push('Checkpoints:');
    advice.checkpoints.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
  }
  if (advice.mode === 'planner' && advice.exact_files.length) {
    lines.push('Exact files likely involved:');
    advice.exact_files.forEach((f) => lines.push(`  - ${f}`));
  }
  if (advice.mode === 'planner' && advice.success_criteria.length) {
    lines.push('Success criteria:');
    advice.success_criteria.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  }
  if (advice.mode === 'planner' && advice.verification_checklist.length) {
    lines.push('Verification checklist:');
    advice.verification_checklist.forEach((v, i) => lines.push(`  ${i + 1}. ${v}`));
  }
  if (advice.mode === 'planner' && advice.search_queries.length) {
    lines.push('Suggested search queries:');
    advice.search_queries.forEach((q) => lines.push(`  - ${q}`));
  }
  if (advice.mode === 'planner' && advice.tool_sequence.length) {
    lines.push('Suggested tool sequence:');
    advice.tool_sequence.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  if (advice.next_actions.length) {
    lines.push('Next actions (do these in order):');
    advice.next_actions.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
  }
  if (advice.stop_doing.length) {
    lines.push('Stop doing:');
    advice.stop_doing.forEach((s) => lines.push(`  - ${s}`));
  }
  if (advice.hints.length) {
    lines.push('Hints:');
    advice.hints.forEach((h) => lines.push(`  -> ${h}`));
  }
  if (advice.risk_note) lines.push(`Risk: ${advice.risk_note}`);
  lines.push('[/ADVISOR GUIDANCE]');
  return lines.join('\n');
}
