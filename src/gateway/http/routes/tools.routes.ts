/**
 * Tools Routes
 * Tool execution and management endpoints
 */

import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.middleware';
import { getToolDefinitions, executeTool } from '../../../tools/core';

export const toolsRouter = Router();

/**
 * GET /api/tools
 * List all available tools
 */
toolsRouter.get('/', requireAuth, (req: AuthRequest, res) => {
  try {
    const tools = getToolDefinitions();
    res.json({ tools });
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/tools/:name
 * Get tool definition by name
 */
toolsRouter.get('/:name', requireAuth, (req: AuthRequest, res) => {
  try {
    const tools = getToolDefinitions([req.params.name]);
    if (tools.length === 0) {
      res.status(404).json({ error: `Tool ${req.params.name} not found` });
      return;
    }
    res.json({ tool: tools[0] });
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/tools/:name/execute
 * Execute a specific tool
 */
toolsRouter.post('/:name/execute', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name } = req.params;
    const { params, context } = req.body;
    
    const result = await executeTool(name, params, {
      sessionId: req.sessionId,
      ...context
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      error: error.message
    });
  }
});
