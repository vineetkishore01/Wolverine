/**
 * MCP Routes
 * Model Context Protocol server management
 */

import { Router } from 'express';
import { getMCPManager } from '../../mcp-manager';

export const mcpRouter = Router();

mcpRouter.get('/servers', (_req, res) => {
  try {
    const mgr = getMCPManager();
    const configs = mgr.getConfigs();
    const status = mgr.getStatus();
    const merged = configs.map(cfg => {
      const s = status.find(x => x.id === cfg.id);
      return { ...cfg, status: s?.status || 'disconnected', toolCount: s?.tools || 0, toolNames: s?.toolNames || [], error: s?.error };
    });
    res.json({ success: true, servers: merged });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mcpRouter.post('/servers', (req, res) => {
  try {
    const mgr = getMCPManager();
    const cfg = req.body;
    if (!cfg.id || !cfg.name) { res.status(400).json({ success: false, error: 'id and name are required' }); return; }
    if (!cfg.id.match(/^[a-z0-9_-]+$/i)) { res.status(400).json({ success: false, error: 'id must be alphanumeric/underscore/dash only' }); return; }
    mgr.upsertConfig(cfg);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mcpRouter.delete('/servers/:id', (req, res) => {
  try {
    const mgr = getMCPManager();
    const deleted = mgr.deleteConfig(req.params.id);
    res.json({ success: deleted, error: deleted ? undefined : 'Server not found' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mcpRouter.post('/servers/:id/connect', async (req, res) => {
  try {
    const mgr = getMCPManager();
    const result = await mgr.connect(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mcpRouter.post('/servers/:id/disconnect', async (req, res) => {
  try {
    const mgr = getMCPManager();
    await mgr.disconnect(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mcpRouter.get('/tools', (_req, res) => {
  try {
    const mgr = getMCPManager();
    res.json({ success: true, tools: mgr.getAllTools() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mcpRouter.get('/oauth/url/:serverId', (req, res) => {
  try {
    const mgr = getMCPManager();
    const result = mgr.getOAuthUrl(req.params.serverId);
    if (!result) {
      res.status(400).json({ success: false, error: 'OAuth not configured for this server' });
      return;
    }
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mcpRouter.get('/oauth/callback', async (req, res) => {
  const { code, state, serverId } = req.query;
  if (!code || !serverId) {
    res.status(400).json({ success: false, error: 'Missing code or serverId' });
    return;
  }

  try {
    const mgr = getMCPManager();
    const result = await mgr.handleOAuthCallback(serverId as string, code as string, (state as string) || '');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
