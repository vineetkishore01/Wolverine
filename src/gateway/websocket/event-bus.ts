/**
 * WebSocket Event Bus
 * Centralized event emitter for WebSocket communication
 */

import { EventEmitter } from 'events';

export interface WebSocketEvent {
  type: string;
  payload: any;
  sessionId?: string;
  timestamp: number;
}

export class WebSocketEventBus extends EventEmitter {
  private static instance: WebSocketEventBus;
  private eventHistory: WebSocketEvent[] = [];
  private readonly maxHistory = 100;

  private constructor() {
    super();
  }

  static getInstance(): WebSocketEventBus {
    if (!WebSocketEventBus.instance) {
      WebSocketEventBus.instance = new WebSocketEventBus();
    }
    return WebSocketEventBus.instance;
  }

  emit(event: string, payload: any, sessionId?: string): boolean {
    const wsEvent: WebSocketEvent = {
      type: event,
      payload,
      sessionId,
      timestamp: Date.now()
    };

    // Store in history
    this.eventHistory.push(wsEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    return super.emit(event, wsEvent);
  }

  getHistory(sessionId?: string, limit: number = 50): WebSocketEvent[] {
    let history = this.eventHistory;
    
    if (sessionId) {
      history = history.filter(e => e.sessionId === sessionId);
    }
    
    return history.slice(-limit);
  }

  clearHistory(sessionId?: string): void {
    if (sessionId) {
      this.eventHistory = this.eventHistory.filter(e => e.sessionId !== sessionId);
    } else {
      this.eventHistory = [];
    }
  }
}

export const eventBus = WebSocketEventBus.getInstance();
