/**
 * WebSocket Server
 * Manages WebSocket connections for real-time communication
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { eventBus } from './event-bus';
import { StreamHandler } from './stream-handler';
import { getSession } from '../session';
import { getConfig } from '../../config/config';

export interface WSClient {
  ws: WebSocket;
  sessionId: string;
  userId?: string;
  connectedAt: number;
  lastActivity: number;
}

export class WebSocketGateway {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private readonly pingInterval = 30000; // 30 seconds
  private pingTimer: NodeJS.Timeout | null = null;

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupConnectionHandler();
    this.startPingInterval();
  }

  /**
   * Setup WebSocket connection handler
   */
  private setupConnectionHandler(): void {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId') || `session_${Date.now()}`;
      const token = url.searchParams.get('token');

      // Check token against env or config
      const expectedToken = process.env.WOLVERINE_TOKEN || getConfig().getConfig().gateway.auth?.token;

      // SECURITY: If auth is configured, require valid token
      if (expectedToken) {
        if (!token) {
          ws.close(4001, 'Authentication required: missing token');
          return;
        }
        if (token !== expectedToken) {
          ws.close(4001, 'Invalid token');
          return;
        }
      }

      // Create client record
      const client: WSClient = {
        ws,
        sessionId,
        connectedAt: Date.now(),
        lastActivity: Date.now()
      };

      // Store client
      this.clients.set(sessionId, client);

      // Send welcome message
      this.sendToClient(sessionId, {
        type: 'connected',
        sessionId,
        timestamp: Date.now()
      });

      // Handle messages
      ws.on('message', (data) => this.handleMessage(sessionId, data));
      
      // Handle errors
      ws.on('error', (error) => this.handleError(sessionId, error));
      
      // Handle close
      ws.on('close', () => this.handleClose(sessionId));

      // Emit connection event
      eventBus.emit('ws:connect', { sessionId }, sessionId);

      console.log(`[WebSocket] Client connected: ${sessionId}`);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(sessionId: string, data: any): void {
    const client = this.clients.get(sessionId);
    if (!client) return;

    client.lastActivity = Date.now();

    try {
      const message = JSON.parse(data.toString());
      console.log(`[WebSocket] Message from ${sessionId}:`, message.type);

      // Emit to event bus
      eventBus.emit('ws:message', { sessionId, message }, sessionId);

      // Handle specific message types
      switch (message.type) {
        case 'ping':
          this.sendToClient(sessionId, { type: 'pong', timestamp: Date.now() });
          break;
        
        case 'subscribe':
          this.handleSubscription(sessionId, message.topics);
          break;
        
        case 'chat':
          this.handleChatMessage(sessionId, message.content);
          break;
      }
    } catch (error: any) {
      console.error(`[WebSocket] Message parse error (${sessionId}):`, error.message);
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscription(sessionId: string, topics: string[]): void {
    console.log(`[WebSocket] ${sessionId} subscribed to:`, topics);
    eventBus.emit('ws:subscribe', { sessionId, topics }, sessionId);
  }

  /**
   * Handle chat messages via WebSocket
   */
  private handleChatMessage(sessionId: string, content: string): void {
    // Get or create session
    const session = getSession(sessionId);
    
    // Emit to event bus for processing
    eventBus.emit('ws:chat', { sessionId, content, session }, sessionId);
  }

  /**
   * Handle errors
   */
  private handleError(sessionId: string, error: any): void {
    console.error(`[WebSocket] Error (${sessionId}):`, error.message);
    eventBus.emit('ws:error', { sessionId, error }, sessionId);
  }

  /**
   * Handle client disconnect
   */
  private handleClose(sessionId: string): void {
    this.clients.delete(sessionId);
    eventBus.emit('ws:disconnect', { sessionId }, sessionId);
    console.log(`[WebSocket] Client disconnected: ${sessionId}`);
  }

  /**
   * Send message to specific client
   */
  sendToClient(sessionId: string, data: any): boolean {
    const client = this.clients.get(sessionId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(data));
      return true;
    } catch (error: any) {
      console.error(`[WebSocket] Send error (${sessionId}):`, error.message);
      return false;
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(data: any, excludeSessionId?: string): void {
    const message = JSON.stringify(data);
    
    for (const [sessionId, client] of this.clients.entries()) {
      if (sessionId === excludeSessionId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error: any) {
          console.error(`[WebSocket] Broadcast error (${sessionId}):`, error.message);
        }
      }
    }
  }

  /**
   * Create stream handler for a session
   */
  createStreamHandler(sessionId: string): StreamHandler | null {
    const client = this.clients.get(sessionId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return null;
    }

    return new StreamHandler(client.ws, sessionId);
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get client info
   */
  getClientInfo(sessionId: string): WSClient | undefined {
    return this.clients.get(sessionId);
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      this.clients.forEach((client, sessionId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();
            
            // Check for stale connections
            const idleTime = Date.now() - client.lastActivity;
            if (idleTime > 5 * 60 * 1000) { // 5 minutes
              console.log(`[WebSocket] Closing stale connection: ${sessionId}`);
              client.ws.close();
            }
          } catch (error: any) {
            console.error(`[WebSocket] Ping error (${sessionId}):`, error.message);
          }
        }
      });
    }, this.pingInterval);
  }

  /**
   * Close the WebSocket server
   */
  close(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    this.wss.close();
  }
}

/**
 * Create and initialize WebSocket gateway
 */
export function createWebSocketGateway(server: http.Server): WebSocketGateway {
  const gateway = new WebSocketGateway(server);
  
  // Setup chat handler
  import('./chat-handler').then(({ setupWebSocketChat }) => {
    setupWebSocketChat(gateway);
  });
  
  return gateway;
}
