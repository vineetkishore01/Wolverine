/**
 * Gateway Index
 * Main entry point for Wolverine Gateway
 */

import http from 'http';

// HTTP Layer
import { createExpressApp } from './http/server';
export { createExpressApp } from './http/server';
export * from './http/middleware';
export * from './http/routes';

// WebSocket Layer
import { createWebSocketGateway, WebSocketGateway } from './websocket/server';
export { createWebSocketGateway, WebSocketGateway } from './websocket/server';
export { StreamHandler, createStreamingCallback } from './websocket/stream-handler';
export { eventBus } from './websocket/event-bus';

// Session Layer
export { getSessionManager } from './session/session-manager';
export { createContextEngine } from './session/context-engine';

// Orchestration Layer
export { createOrchestrator } from './orchestration/orchestrator';

// Monitoring Layer
export { HealthChecker } from './monitoring/health-check';

// Boot Layer
export { boot } from './boot';

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  port: number;
  host: string;
  auth?: {
    enabled: boolean;
    token?: string;
  };
}

/**
 * Create and start the Wolverine Gateway
 */
export async function createGateway(config: GatewayConfig) {
  console.log('[Gateway] Initializing Wolverine Gateway...');

  // Create Express app
  const app = createExpressApp();

  // Create HTTP server
  const server = http.createServer(app);

  // Create WebSocket gateway
  const wsGateway = createWebSocketGateway(server);

  // Start server
  return new Promise<{ server: http.Server; wsGateway: WebSocketGateway }>((resolve) => {
    server.listen(config.port, config.host, () => {
      console.log(`[Gateway] Listening on http://${config.host}:${config.port}`);
      console.log(`[Gateway] WebSocket endpoint: ws://${config.host}:${config.port}/ws`);

      resolve({ server, wsGateway });
    });
  });
}
