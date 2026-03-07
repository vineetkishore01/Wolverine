/**
 * Orchestration Routes
 * Multi-agent orchestration settings and telemetry
 */

import { Router } from 'express';
import {
  clampOrchestrationConfig,
  clampPreemptConfig,
  checkOrchestrationEligibility,
  getOrchestrationConfig
} from '../../../orchestration/multi-agent';
import { getConfig } from '../../../config/config';
import { clampInt } from '../../../shared/utils';

export const orchestrationRouter = Router();

function getOrchestrationConfigForApi() {
  const raw = (getConfig().getConfig() as any).orchestration || {};
  const clamped = clampOrchestrationConfig(raw);
  const preempt = clampPreemptConfig(raw.preempt || {});
  return {
    enabled: raw.enabled === true,
    secondary: {
      provider: String(raw.secondary?.provider || '').trim(),
      model: String(raw.secondary?.model || '').trim(),
    },
    ...clamped,
    preempt,
    subagent_mode: raw.subagent_mode === true,
  };
}

orchestrationRouter.get('/config', (_req, res) => {
  res.json(getOrchestrationConfigForApi());
});

orchestrationRouter.post('/config', (req, res) => {
  const current = getOrchestrationConfigForApi();
  const incoming = req.body || {};
  const incomingMode = String(incoming.preflight?.mode || '').trim();
  const incomingRestartMode = String(incoming.preempt?.restart_mode || '').trim();

  const mergedRaw = {
    enabled: typeof incoming.enabled === 'boolean' ? incoming.enabled : current.enabled,
    secondary: {
      provider: String(incoming.secondary?.provider ?? current.secondary.provider).trim(),
      model: String(incoming.secondary?.model ?? current.secondary.model).trim(),
    },
    triggers: {
      ...current.triggers,
      ...(incoming.triggers && typeof incoming.triggers === 'object' ? incoming.triggers : {}),
      loop_detection: typeof incoming.triggers?.loop_detection === 'boolean'
        ? incoming.triggers.loop_detection
        : current.triggers.loop_detection,
    },
    preflight: {
      ...current.preflight,
      ...(incoming.preflight && typeof incoming.preflight === 'object' ? incoming.preflight : {}),
      mode: ['off', 'complex_only', 'always'].includes(incomingMode)
        ? incomingMode
        : current.preflight.mode,
      allow_secondary_chat: typeof incoming.preflight?.allow_secondary_chat === 'boolean'
        ? incoming.preflight.allow_secondary_chat
        : current.preflight.allow_secondary_chat,
    },
    limits: {
      ...current.limits,
      ...(incoming.limits && typeof incoming.limits === 'object' ? incoming.limits : {}),
    },
    browser: {
      ...current.browser,
      ...(incoming.browser && typeof incoming.browser === 'object' ? incoming.browser : {}),
    },
    file_ops: {
      ...current.file_ops,
      ...(incoming.file_ops && typeof incoming.file_ops === 'object' ? incoming.file_ops : {}),
      enabled: typeof incoming.file_ops?.enabled === 'boolean'
        ? incoming.file_ops.enabled
        : current.file_ops.enabled,
      verify_create_always: typeof incoming.file_ops?.verify_create_always === 'boolean'
        ? incoming.file_ops.verify_create_always
        : current.file_ops.verify_create_always,
      checkpointing_enabled: typeof incoming.file_ops?.checkpointing_enabled === 'boolean'
        ? incoming.file_ops.checkpointing_enabled
        : current.file_ops.checkpointing_enabled,
    },
    preempt: {
      ...current.preempt,
      ...(incoming.preempt && typeof incoming.preempt === 'object' ? incoming.preempt : {}),
      enabled: typeof incoming.preempt?.enabled === 'boolean'
        ? incoming.preempt.enabled
        : current.preempt.enabled,
      restart_mode: ['inherit_console', 'detached_hidden'].includes(incomingRestartMode)
        ? incomingRestartMode
        : current.preempt.restart_mode,
    },
  };

  const clamped = clampOrchestrationConfig(mergedRaw);
  const preempt = clampPreemptConfig(mergedRaw.preempt || {});
  const merged = {
    enabled: mergedRaw.enabled,
    secondary: mergedRaw.secondary,
    ...clamped,
    preempt: {
      ...preempt,
      enabled: mergedRaw.preempt.enabled,
    },
  };

  const finalMerged = {
    ...merged,
    subagent_mode: typeof incoming.subagent_mode === 'boolean'
      ? incoming.subagent_mode
      : (current as any).subagent_mode ?? false,
  };

  getConfig().updateConfig({ orchestration: finalMerged } as any);
  res.json({ success: true, config: finalMerged });
});

orchestrationRouter.get('/eligible', async (_req, res) => {
  const eligibility = await checkOrchestrationEligibility();
  res.json(eligibility);
});

orchestrationRouter.get('/telemetry', (req, res) => {
  // Note: getOrchestrationSessionStats is server-local, returning empty for now
  // In production, this should be moved to a shared module
  const sessionId = String(req.query.sessionId || 'default');
  const stats = { assistCount: 0, events: [] };
  const cfg = getOrchestrationConfig();
  const limit = cfg?.limits?.telemetry_history_limit || 100;
  res.json({
    sessionId,
    assistCount: stats.assistCount,
    assistCap: cfg?.limits?.max_assists_per_session || 0,
    events: stats.events.slice(-limit),
  });
});
