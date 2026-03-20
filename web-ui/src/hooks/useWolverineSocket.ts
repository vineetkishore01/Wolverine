import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Represents a chat message in the UI.
 */
export type Message = {
  /** Unique identifier for the message. */
  id: string;
  /** The source of the message: 'user' or 'bot'. */
  source: 'user' | 'bot';
  /** The text content of the message. */
  content: string;
  /** Optional flag indicating if the bot is currently processing (thinking). */
  isThinking?: boolean;
};

/**
 * Represents a trace event received from the backend.
 */
export type TraceEvent = {
  /** Unique identifier for the trace event. */
  id: string;
  /** The type of event (e.g., 'llm_in', 'llm_out', 'context'). */
  type: string;
  /** The subsystem or node that generated the event. */
  source: string;
  /** ISO timestamp of when the event occurred. */
  timestamp: string;
  /** The payload content of the event. */
  content: any;
};

const MESSAGES_KEY = 'wolverine_messages';

/**
 * Loads messages from local storage.
 * 
 * @returns An array of Message objects, or an empty array if none are found or parsing fails.
 * @private
 */
function loadMessages(): Message[] {
  try {
    const saved = localStorage.getItem(MESSAGES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Persists the last 50 messages to local storage.
 * 
 * @param messages - The array of Message objects to save.
 * @private
 */
function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages.slice(-50)));
  } catch {}
}

/**
 * Generates a unique identifier.
 * Fallback for environments where crypto.randomUUID() is unavailable.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Custom hook to manage the WebSocket connection to the Wolverine Gateway.
 * Handles real-time messaging, connection status, and trace event accumulation.
 * 
 * @returns An object containing:
 * - status: The current connection state ('connecting', 'connected', 'disconnected').
 * - messages: An array of chat messages.
 * - traces: An array of trace events.
 * - sendMessage: Function to send a message to the gateway.
 * - clearMessages: Function to clear the message history.
 */
export function useWolverineSocket() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = `ws://${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => {
      setStatus('connected');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      // Attempt reconnect after 3 seconds
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        
        // 1. Handle standard Chat/Trace events (only user messages from here)
        if (event.type === 'chat' || event.type === 'msg') {
          const isBot = event.source?.toLowerCase() !== 'user' && event.payload?.role !== 'user';
          const content = event.content || event.payload?.content;

          if (!content) return;

          // Skip bot messages here - they come from 'res' event
          if (isBot) return;

          setMessages((prev) => {
            const updated = [...prev, { id: generateId(), source: 'user' as const, content }];
            saveMessages(updated);
            return updated;
          });
        }

        // 2. Handle Response objects from agent.chat
        if (event.type === 'res') {
          setMessages((prev) => {
            const filtered = prev.filter(m => !m.isThinking);
            if (event.ok && event.payload?.content) {
              const updated = [
                ...filtered,
                {
                  id: generateId(),
                  source: 'bot' as const,
                  content: event.payload.content,
                }
              ];
              saveMessages(updated);
              return updated;
            } else {
              // Error response - show error message
              const errorMsg = event.error?.message || event.payload?.content || "An error occurred";
              const updated = [
                ...filtered,
                {
                  id: generateId(),
                  source: 'bot' as const,
                  content: `⚠️ ${errorMsg}`,
                }
              ];
              saveMessages(updated);
              return updated;
            }
          });
        }
        
        if (event.type && event.source && event.timestamp) {
          setTraces((prev) => {
            return [
              {
                id: generateId(),
                type: event.type,
                source: event.source,
                timestamp: event.timestamp,
                content: event.content,
              },
              ...prev.slice(0, 99), // Keep last 100
            ];
          });
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setMessages((prev) => {
        const updated = [
          ...prev,
          { id: generateId(), source: 'user', content: text },
          { id: generateId(), source: 'bot', content: 'Wolverine is thinking', isThinking: true }
        ];
        saveMessages(updated);
        return updated;
      });

      wsRef.current.send(
        JSON.stringify({
          type: "req",
          id: generateId(),
          method: "agent.chat",
          params: { 
            messages: [{ role: "user", content: text }], 
            metadata: { source: "web-ui" } 
          }
        })
      );
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(MESSAGES_KEY);
  }, []);

  return { status, messages, traces, sendMessage, clearMessages };
}