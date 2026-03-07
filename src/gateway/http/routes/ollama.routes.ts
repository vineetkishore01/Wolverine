/**
 * Ollama Routes
 * Ollama model management endpoints
 */

import { Router } from 'express';
import { getConfig } from '../../../config/config';

export const ollamaRouter = Router();

ollamaRouter.get('/models', async (_req, res) => {
  try {
    const ollamaEndpoint = (getConfig().getConfig() as any).ollama?.endpoint || 'http://localhost:11434';
    const response = await fetch(`${ollamaEndpoint}/api/tags`);
    if (!response.ok) { res.json({ success: false, models: [], error: `Ollama returned ${response.status}` }); return; }
    const data = await response.json() as any;
    const models = (data.models || []).map((m: any) => ({
      name: m.name,
      size: m.size,
      parameter_size: m.details?.parameter_size || '',
      family: m.details?.family || '',
      modified_at: m.modified_at,
    }));
    res.json({ success: true, models });
  } catch (err: any) {
    res.json({ success: false, models: [], error: err.message });
  }
});

ollamaRouter.get('/show/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const ollamaEndpoint = (getConfig().getConfig() as any).ollama?.endpoint || 'http://localhost:11434';
    const response = await fetch(`${ollamaEndpoint}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) { res.status(response.status).json({ success: false, error: `Ollama returned ${response.status}` }); return; }
    const data = await response.json();
    res.json({ success: true, ...(data || {}) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

ollamaRouter.post('/create', async (req, res) => {
  try {
    const { name, modelfile } = req.body;
    if (!name || !modelfile) { res.status(400).json({ success: false, error: 'Name and Modelfile required' }); return; }
    const ollamaEndpoint = (getConfig().getConfig() as any).ollama?.endpoint || 'http://localhost:11434';
    const response = await fetch(`${ollamaEndpoint}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, modelfile, stream: false }),
    });
    if (!response.ok) { res.status(response.status).json({ success: false, error: `Ollama returned ${response.status}` }); return; }
    const data = await response.json();
    res.json({ success: true, ...(data || {}) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
