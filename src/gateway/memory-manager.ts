import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getBrainDB } from '../db/brain';
import { executeMemoryWrite } from '../tools/memory.js';
import { sanitizeMemoryText } from '../tools/memory-utils.js';
import { getDatabase } from '../db/database';
import { getConfig } from '../config/config';
import {
  FactScope,
  FactType,
  FactSourceKind,
} from '../types.js';

const db = getDatabase();
const cfg = getConfig().getConfig();

export interface MemoryClaim {
  claim: string;
  type: FactType;
  scope: FactScope;
  workspace_id: string;
  agent_id: string;
  session_id?: string;
  source_kind: FactSourceKind;
  source_ref: string;
  confidence: number;
  ttl_hours?: number;
}

export interface AddMemoryFactArgs {
  fact: string;
  key?: string;
  action?: 'append' | 'upsert' | 'replace_all';
  scope?: FactScope;
  session_id?: string;
  confidence?: number;
  source_url?: string;
  reference?: string;
  source_kind?: FactSourceKind;
  source_ref?: string;
  source_tool?: string;
  source_output?: any;
  actor?: 'agent' | 'user' | 'system';
  type?: FactType;
  workspace_id?: string;
  agent_id?: string;
  ttl_hours?: number;
  routing?: 'direct' | 'policy';
}

function shouldDiscardClaim(claim: MemoryClaim): boolean {
  const text = sanitizeMemoryText(claim.claim);
  if (!text || text.length < 10) return true;
  if (/^error|^max steps|^thought:/i.test(text)) return true;
  if (/\bcould not produce\b|\bformat violation\b|\bunsupported_mutation\b|\bmissing_required_input\b/i.test(text)) return true;
  if (/^\s*blocked\b/i.test(text)) return true;
  return false;
}

export function decideMemoryWrite(claim: MemoryClaim): string {
  if (shouldDiscardClaim(claim)) return 'DISCARD';
  if (!claim.source_kind || !claim.source_ref) return 'DAILY_NOTE';
  if ((claim.type === 'preference' || claim.type === 'rule') && claim.scope === 'global' && claim.confidence >= 0.9) {
    return 'CURATED_PROFILE';
  }
  if (claim.confidence >= 0.55) return 'TYPED_FACT';
  return 'DAILY_NOTE';
}

function shouldForceSessionScopeForTemporalClaim(text: string): boolean {
  return /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(text)
    || /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(text)
    || /\b\d{1,2}:\d{2}\b/.test(text)
    || /\blocal time\b/i.test(text)
    || /\bcurrent time\b/i.test(text);
}

function auditMemoryWrite(args: {
  reference?: string;
  fact: string;
  source_tool?: string;
  source_output?: string;
  actor?: 'agent' | 'user' | 'system';
  success: boolean;
  error?: string;
}): void {
  try {
    if (!(cfg.memory_options?.audit ?? true)) return;
    db.createMemoryLog({
      id: randomUUID(),
      reference: args.reference,
      fact: args.fact,
      source_tool: args.source_tool,
      source_output: args.source_output,
      actor: args.actor || 'agent',
      success: args.success ? 1 : 0,
      error: args.success ? undefined : (args.error || 'unknown'),
    });
  } catch (dbErr: any) {
    console.error('[memory-manager] Failed to persist memory log:', dbErr?.message || dbErr);
  }
}


export async function addMemoryFact(args: AddMemoryFactArgs): Promise<{ success: boolean; message?: string }> {
  const safeFact = sanitizeMemoryText(args.fact);
  if (!safeFact) {
    return { success: false, message: 'fact required' };
  }
  const safeSourceOutput = args.source_output ? sanitizeMemoryText(args.source_output) : undefined;
  const normalizedScope: FactScope = shouldForceSessionScopeForTemporalClaim(safeFact) ? 'session' : (args.scope || 'global');
  const claim: MemoryClaim = {
    claim: safeFact,
    type: args.type || 'generic_fact',
    scope: normalizedScope,
    workspace_id: args.workspace_id || '',
    agent_id: args.agent_id || '',
    session_id: args.session_id,
    source_kind: args.source_kind || 'system',
    source_ref: args.source_ref || 'addMemoryFact',
    confidence: typeof args.confidence === 'number' ? args.confidence : 0.5,
    ttl_hours: args.ttl_hours,
  };

  const routing = args.routing || 'direct';

  const finish = (success: boolean, message: string, error?: string) => {
    auditMemoryWrite({
      reference: args.reference,
      fact: safeFact,
      source_tool: args.source_tool,
      source_output: safeSourceOutput,
      actor: args.actor || 'agent',
      success,
      error,
    });
    return { success, message };
  };

  if (shouldDiscardClaim(claim)) {
    return finish(true, 'discarded');
  }

  const decision = routing === 'policy' ? decideMemoryWrite(claim) : 'TYPED_FACT';

  try {
    if (decision === 'DISCARD') {
      return finish(true, 'discarded');
    }

    // Always write to the brain database now
    const writeResult = await executeMemoryWrite({
      fact: safeFact,
      key: args.key,
      action: args.action || 'upsert',
      reference: args.reference,
      source_tool: args.source_tool,
      source_output: safeSourceOutput,
      actor: args.actor || 'agent',
      category: claim.type,
      importance: args.confidence ?? 0.5
    });

    if (!writeResult.success) {
      const msg = writeResult.error || 'brain_write failed';
      return finish(false, msg, msg);
    }

    return finish(true, writeResult.stdout || 'Memory synchronized with brain');

  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[memory-manager] Error adding memory fact:', msg);
    return finish(false, msg, msg);
  }
}
