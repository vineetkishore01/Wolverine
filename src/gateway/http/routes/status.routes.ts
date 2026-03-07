/**
 * Status Routes
 * System status, file operations, and session management
 */
import { Router } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { getConfig } from '../../../config/config';
import { getProvider } from '../../../providers/factory';
import { getOrchestrationConfig } from '../../../orchestration/multi-agent';
import { getWorkspace, clearHistory } from '../../session';
import { hookBus } from '../../hooks';

export const statusRouter = Router();

statusRouter.get('/status', async (_req, res) => {
  const ollama = getProvider();
  const connected = await ollama.testConnection();
  const rawCfg = getConfig().getConfig() as any;
  const provider: string = rawCfg.llm?.provider || 'ollama';
  const providerCfg = rawCfg.llm?.providers?.[provider] || {};
  const activeModel: string = providerCfg.model || rawCfg.models?.primary || 'unknown';
  const orchCfg = getOrchestrationConfig();
  res.json({
    status: 'ok', version: 'v2-tools', ollama: connected,
    provider,
    currentModel: activeModel,
    workspace: (getConfig() as any).workspace?.path || '',
    search: rawCfg.search?.google_api_key ? 'google' : (rawCfg.search?.tavily_api_key ? 'tavily' : 'none'),
    orchestration: orchCfg ? {
      enabled: orchCfg.enabled,
      secondary: orchCfg.secondary,
    } : null,
  });
});

statusRouter.get('/open-path', async (req, res) => {
  const fp = req.query.path as string;
  if (!fp || !path.isAbsolute(fp)) {
    res.status(400).json({ error: 'Valid absolute path required' });
    return;
  }
  try {
    const resolvedFp = path.resolve(fp);
    const workspace = getConfig().getWorkspacePath();
    const resolvedWorkspace = path.resolve(workspace);
    
    // SECURITY: Normalize paths to prevent traversal attacks
    const normalizedPath = path.normalize(resolvedFp);
    const normalizedWorkspace = path.normalize(resolvedWorkspace);
    
    // Only allow paths within workspace
    // SECURITY: Use path separator + trailing to prevent partial matches (e.g., /workspace vs /workspace-evil)
    const isWorkspace = normalizedPath === normalizedWorkspace || 
                        normalizedPath.startsWith(normalizedWorkspace + path.sep);
    
    if (!isWorkspace) {
      res.status(403).json({ error: 'Access denied: path must be within workspace directory' });
      return;
    }
    
    // Additional security: reject paths with null bytes or suspicious patterns
    if (fp.includes('\0') || fp.includes('..')) {
      res.status(403).json({ error: 'Access denied: invalid path characters' });
      return;
    }
    
    if (process.platform === 'win32') {
      execFile('explorer.exe', [resolvedFp], (err) => {
        err ? res.status(500).json({ error: err.message }) : res.json({ success: true });
      });
    } else if (process.platform === 'darwin') {
      execFile('open', [resolvedFp], (err) => {
        err ? res.status(500).json({ error: err.message }) : res.json({ success: true });
      });
    } else {
      execFile('xdg-open', [resolvedFp], (err) => {
        err ? res.status(500).json({ error: err.message }) : res.json({ success: true });
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

statusRouter.post('/clear-history', async (req, res) => {
  const sid = req.body.sessionId || 'default';
  const ws = getWorkspace(sid) || (getConfig().getConfig() as any).workspace?.path || '';
  if (ws) {
    await hookBus.fire({
      type: 'command:reset',
      sessionId: sid,
      workspacePath: ws,
      timestamp: Date.now(),
    });
    await hookBus.fire({
      type: 'command:new',
      sessionId: sid,
      workspacePath: ws,
      timestamp: Date.now(),
    });
  }
  clearHistory(sid);
  res.json({ success: true });
});
