/**
 * Sessions Routes
 * Session management endpoints
 */

import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.middleware';
import { getSession, getHistory, clearHistory, listSessions } from '../../session';

export const sessionsRouter = Router();

/**
 * GET /api/sessions
 * List all sessions
 */
sessionsRouter.get('/', requireAuth, (req: AuthRequest, res) => {
  try {
    const sessions = listSessions();
    res.json({ success: true, sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sessions/:id
 * Get session details
 */
sessionsRouter.get('/:id', requireAuth, (req: AuthRequest, res) => {
  try {
    const session = getSession(req.params.id);
    const history = getHistory(session.id);
    
    res.json({
      session: {
        id: session.id,
        createdAt: session.createdAt,
        messageCount: history.length
      },
      history
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sessions/:id
 * Clear session history
 */
sessionsRouter.delete('/:id', requireAuth, (req: AuthRequest, res) => {
  try {
    clearHistory(req.params.id);
    res.json({ success: true, message: 'Session cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
