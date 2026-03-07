/**
 * Memory Routes
 * Memory, procedures, and scratchpad endpoints
 */

import { Router } from 'express';
import { getBrainDB } from '../../../db/brain';

export const memoryRouter = Router();

memoryRouter.get('/procedures', (_req, res) => {
  try {
    const brain = getBrainDB();
    const rows = brain.listProcedures();
    res.json({ success: true, procedures: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.delete('/procedures/:id', (req, res) => {
  try {
    const id = req.params.id;
    const brain = getBrainDB();
    brain.deleteProcedure(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/scratchpad', (req, res) => {
  try {
    const sessionId = String(req.query.sessionId || 'default');
    const brain = getBrainDB();
    const content = brain.getScratchpad(sessionId);
    res.json({ success: true, content: content || '' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/memories', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const sessionId = String(req.query.sessionId || '');
    const brain = getBrainDB();
    let memories;
    if (q) {
      memories = await brain.searchMemoriesWithVector(q, { session_id: sessionId });
    } else {
      memories = brain.searchMemories('', { session_id: sessionId, max: 50 });
    }
    res.json({ success: true, memories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.delete('/memories/:id', (req, res) => {
  try {
    const brain = getBrainDB();
    const ok = brain.deleteMemory(req.params.id);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
