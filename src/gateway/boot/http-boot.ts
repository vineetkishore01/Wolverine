/**
 * Boot Sequence
 * Initializes Wolverine Gateway
 */

import { createExpressApp } from '../http/server';
import { createWebSocketGateway } from '../websocket/server';
import { GatewayConfig } from '../index';
import http from 'http';

export interface BootResult {
  app: ReturnType<typeof createExpressApp>;
  server: http.Server;
  wsGateway: ReturnType<typeof createWebSocketGateway>;
}

/**
 * Boot sequence for Wolverine Gateway
 */
export async function boot(config: GatewayConfig): Promise<BootResult> {
  console.log('[Boot] Starting Wolverine Gateway...');
  
  // Create Express app
  const app = createExpressApp();
  console.log('[Boot] HTTP layer initialized');
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Create WebSocket gateway
  const wsGateway = createWebSocketGateway(server);
  console.log('[Boot] WebSocket layer initialized');
  
  // Start server
  await new Promise<void>((resolve) => {
    server.listen(config.port, config.host, () => {
      console.log(`[Boot] Server listening on http://${config.host}:${config.port}`);
      resolve();
    });
  });
  
  console.log('[Boot] Wolverine Gateway started successfully');
  
  return { app, server, wsGateway };
}
