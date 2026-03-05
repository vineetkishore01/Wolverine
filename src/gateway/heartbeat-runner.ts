/**
 * heartbeat-runner.ts
 *
 * Separate heartbeat runner (not a CronJob).
 * Runs an internal checklist turn in the main session and suppresses HEARTBEAT_OK.
 */

import fs from 'fs';
import path from 'path';

// AGI: Heartbeat Introspection
import { performIntrospection, formatIntrospectionResult } from '../agent/heartbeat-introspection';

export interface HeartbeatRunnerConfig {
  enabled: boolean;
  intervalMinutes: number;
  activeHoursStart: number;
  activeHoursEnd: number;
}

interface HeartbeatRunnerDeps {
  workspacePath: string;
  configPath: string;
  handleChat: (
    message: string,
    sessionId: string,
    sendSSE: (event: string, data: any) => void,
    pinnedMessages?: Array<{ role: string; content: string }>,
    abortSignal?: { aborted: boolean },
    callerContext?: string,
    modelOverride?: string,
    executionMode?: 'interactive' | 'background_task' | 'heartbeat' | 'cron',
  ) => Promise<{ type: string; text: string; thinking?: string }>;
  getMainSessionId: () => string;
  getIsModelBusy: () => boolean;
  broadcast?: (data: object) => void;
  broadcastPulse?: (category: 'cron' | 'heartbeat' | 'telegram' | 'system', message: string) => void;
  deliverTelegram?: (text: string) => Promise<void>;
}

export class HeartbeatRunner {
  private deps: HeartbeatRunnerDeps;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(deps: HeartbeatRunnerDeps) {
    this.deps = deps;
  }

  private defaultConfig(): HeartbeatRunnerConfig {
    return {
      enabled: true,
      intervalMinutes: 30,
      activeHoursStart: 8,
      activeHoursEnd: 22,
    };
  }

  getConfig(): HeartbeatRunnerConfig {
    try {
      if (!fs.existsSync(this.deps.configPath)) return this.defaultConfig();
      const parsed = JSON.parse(fs.readFileSync(this.deps.configPath, 'utf-8'));
      const base = this.defaultConfig();
      return {
        enabled: typeof parsed?.enabled === 'boolean' ? parsed.enabled : base.enabled,
        intervalMinutes: Number.isFinite(Number(parsed?.intervalMinutes))
          ? Math.max(1, Math.min(1440, Math.floor(Number(parsed.intervalMinutes))))
          : base.intervalMinutes,
        activeHoursStart: Number.isFinite(Number(parsed?.activeHoursStart))
          ? Math.max(0, Math.min(23, Math.floor(Number(parsed.activeHoursStart))))
          : base.activeHoursStart,
        activeHoursEnd: Number.isFinite(Number(parsed?.activeHoursEnd))
          ? Math.max(0, Math.min(23, Math.floor(Number(parsed.activeHoursEnd))))
          : base.activeHoursEnd,
      };
    } catch {
      return this.defaultConfig();
    }
  }

  updateConfig(partial: Partial<HeartbeatRunnerConfig>): HeartbeatRunnerConfig {
    const next = { ...this.getConfig(), ...partial };
    try {
      fs.mkdirSync(path.dirname(this.deps.configPath), { recursive: true });
      fs.writeFileSync(this.deps.configPath, JSON.stringify(next, null, 2), 'utf-8');
    } catch {
      // ignore write errors; runtime continues with in-memory next
    }
    this.stop();
    this.start();
    return next;
  }

  private withinActiveHours(cfg: HeartbeatRunnerConfig): boolean {
    const hour = new Date().getHours();
    if (cfg.activeHoursStart <= cfg.activeHoursEnd) {
      return hour >= cfg.activeHoursStart && hour < cfg.activeHoursEnd;
    }
    return hour >= cfg.activeHoursStart || hour < cfg.activeHoursEnd;
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    const cfg = this.getConfig();
    if (!cfg.enabled) return;
    const delayMs = Math.max(60_000, cfg.intervalMinutes * 60_000);
    this.timer = setTimeout(() => {
      this.tick().catch((err) => console.warn('[HeartbeatRunner] Tick error:', err?.message || err));
    }, delayMs);
    if (this.timer && typeof (this.timer as any).unref === 'function') (this.timer as any).unref();
  }

  start(): void {
    this.schedule();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getHeartbeatPrompt(): string {
    const raw = this.getHeartbeatPromptRaw();
    if (raw && raw.trim()) return raw.trim();
    return 'Check for anything important and reply HEARTBEAT_OK if nothing needs attention.';
  }

  private getHeartbeatPromptRaw(): string | null {
    const mdPath = path.join(this.deps.workspacePath, 'HEARTBEAT.md');
    try {
      if (fs.existsSync(mdPath)) {
        return fs.readFileSync(mdPath, 'utf-8');
      }
    } catch {
      // ignore read errors
    }
    return null;
  }

  private isHeartbeatContentEffectivelyEmpty(raw: string): boolean {
    const lines = String(raw || '').split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('#')) continue; // markdown headers
      if (t.startsWith('//')) continue; // single-line comments
      if (/^<!--.*-->$/.test(t)) continue; // inline HTML comments
      if (/^[-*+]\s*(\[[ xX]\])?\s*$/.test(t)) continue; // empty markdown list item
      if (/^\d+\.\s*$/.test(t)) continue; // empty ordered list item
      return false;
    }
    return true;
  }

  async tick(mainSessionId?: string): Promise<void> {
    if (this.running) {
      this.schedule();
      return;
    }
    const cfg = this.getConfig();
    if (!cfg.enabled || !this.withinActiveHours(cfg) || this.deps.getIsModelBusy()) {
      this.schedule();
      return;
    }

    this.running = true;
    this.deps.broadcastPulse?.('heartbeat', 'Starting proactive scout pulse...');
    const sessionId = mainSessionId || this.deps.getMainSessionId() || 'default';
    const rawPrompt = this.getHeartbeatPromptRaw();
    if (rawPrompt !== null && this.isHeartbeatContentEffectivelyEmpty(rawPrompt)) {
      this.running = false;
      this.schedule();
      return;
    }
    const prompt = rawPrompt?.trim() || this.getHeartbeatPrompt();
    const sendSSE = (event: string, data: any) => {
      if (!this.deps.broadcast) return;
      if (['tool_call', 'tool_result', 'thinking', 'info'].includes(event)) {
        this.deps.broadcast({ type: 'heartbeat_sse', event, data });
      }
    };

    try {
      const result = await this.deps.handleChat(
        prompt,
        sessionId,
        sendSSE,
        undefined,
        undefined,
        'CONTEXT: This is an autonomous HEARTBEAT mission. You are in SELF-EVOLUTION mode. Audit the environment, optimize memory, and advance active goals. Do not ask for guidance. Report progress or HEARTBEAT_OK if stable.',
        undefined,
        'heartbeat',
      );
      const text = String(result?.text || '');
      const isOk = /^\s*HEARTBEAT_OK\s*$/i.test(text);
      if (!isOk && text.trim()) {
        this.deps.broadcast?.({
          type: 'heartbeat_result',
          sessionId,
          text: text.slice(0, 8000),
          at: Date.now(),
        });
        if (this.deps.deliverTelegram) {
          this.deps.deliverTelegram(`🫀 <b>Heartbeat</b>\n\n${text}`).catch(() => { });
        }
        this.deps.broadcastPulse?.('heartbeat', 'Scout Pulse: Observations reported.');
      } else {
        // No pulse broadcast for HEARTBEAT_OK - be silent as requested.
        console.log('[HeartbeatRunner] System check: OK (Silent)');
      }
    } catch (err: any) {
      console.warn('[HeartbeatRunner] Execution failed:', err?.message || err);
    } finally {
      this.running = false;

      // AGI: Run introspection after heartbeat
      try {
        const introspection = await performIntrospection();
        const formatted = formatIntrospectionResult(introspection);
        console.log('[HeartbeatRunner] Introspection complete:', {
          errors: introspection.learnings.length,
          improvements: introspection.improvements.length,
          gaps: introspection.gaps_identified.length
        });

        // Log to heartbeat results
        if (introspection.improvements.length > 0 || introspection.gaps_identified.length > 0) {
          this.deps.broadcast?.({
            type: 'introspection_result',
            data: introspection
          });
        }
      } catch (introspectionErr) {
        console.warn('[HeartbeatRunner] Introspection failed:', introspectionErr);
      }

      this.schedule();
    }
  }
}
