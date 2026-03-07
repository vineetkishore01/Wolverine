/**
 * HTTP Server
 * Express app setup and configuration
 */

import express, { Express } from 'express';
import path from 'path';

// Middleware
import { corsMiddleware } from './middleware/cors.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { optionalAuth } from './middleware/auth.middleware';

// Routes
import { chatRouter } from './routes/chat.routes';
import { toolsRouter } from './routes/tools.routes';
import { sessionsRouter } from './routes/sessions.routes';
import { settingsRouter } from './routes/settings.routes';
import { statusRouter } from './routes/status.routes';

/**
 * Create and configure Express app
 */
export function createExpressApp(): Express {
  const app = express();

  // Global middleware
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(rateLimitMiddleware);

  // Health check (no auth required)
  app.use('/api', statusRouter);

  // API routes (auth required via individual routers)
  app.use('/api/chat', chatRouter);
  app.use('/api/tools', toolsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/settings', settingsRouter);

  // Static files (web UI)
  const webUiPath = path.join(__dirname, '../../web-ui');
  app.use(express.static(webUiPath));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(webUiPath, 'index.html'));
  });

  // Error handler (must be last)
  app.use(errorHandlerMiddleware);

  return app;
}
