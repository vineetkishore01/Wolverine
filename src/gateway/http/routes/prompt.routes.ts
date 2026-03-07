/**
 * Prompt Logger Routes
 * Prompt logging and analytics endpoints
 */

import { Router } from 'express';
import { getPromptLogger } from '../../../db/prompt-logger';

export const promptRouter = Router();

promptRouter.get('/', (req, res) => {
  const { sessionId, limit = 50, search } = req.query;
  const logger = getPromptLogger();

  let logs;
  if (search) {
    logs = logger.searchLogs(String(search), sessionId ? String(sessionId) : undefined);
  } else if (sessionId) {
    logs = logger.getSessionLogs(String(sessionId), Number(limit));
  } else {
    logs = logger.getAllLogs(Number(limit));
  }

  res.json({ success: true, logs });
});

promptRouter.get('/stats', (req, res) => {
  const { sessionId } = req.query;
  const logger = getPromptLogger();
  const stats = logger.getTokenStats(sessionId ? String(sessionId) : undefined);
  res.json({ success: true, stats });
});

promptRouter.get('/export', (req, res) => {
  const { sessionId } = req.query;
  const logger = getPromptLogger();
  const exported = logger.exportLogs(sessionId ? String(sessionId) : undefined);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="prompt-logs${sessionId ? '-' + sessionId : ''}.json"`);
  res.send(exported);
});

promptRouter.delete('/', (req, res) => {
  const { sessionId } = req.query;
  const logger = getPromptLogger();

  if (sessionId) {
    logger.clearSession(String(sessionId));
    res.json({ success: true, message: `Cleared logs for session ${sessionId}` });
  } else {
    logger.clearAll();
    res.json({ success: true, message: 'Cleared all prompt logs' });
  }
});
