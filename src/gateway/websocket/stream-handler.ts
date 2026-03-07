/**
 * WebSocket Stream Handler
 * Handles token streaming from LLM to clients
 */

import { WebSocket } from 'ws';
import { ChatMessage } from '../../providers/LLMProvider';

export interface StreamChunk {
  type: 'token' | 'thinking' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  thinking?: string;
  toolCall?: any;
  toolResult?: any;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class StreamHandler {
  private ws: WebSocket;
  private sessionId: string;
  private messageQueue: StreamChunk[] = [];
  private isFlushing = false;

  constructor(ws: WebSocket, sessionId: string) {
    this.ws = ws;
    this.sessionId = sessionId;
  }

  /**
   * Send a token chunk to client
   */
  sendToken(content: string): void {
    this.queue({ type: 'token', content });
  }

  /**
   * Send thinking content
   */
  sendThinking(thinking: string): void {
    this.queue({ type: 'thinking', thinking });
  }

  /**
   * Send tool call notification
   */
  sendToolCall(toolCall: any): void {
    this.queue({ type: 'tool_call', toolCall });
  }

  /**
   * Send tool result
   */
  sendToolResult(toolResult: any): void {
    this.queue({ type: 'tool_result', toolResult });
  }

  /**
   * Mark stream as complete
   */
  sendDone(usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }): void {
    this.queue({ type: 'done', usage });
    this.flush();
  }

  /**
   * Send error
   */
  sendError(error: string): void {
    this.queue({ type: 'error', content: error });
    this.flush();
  }

  /**
   * Queue a chunk for sending
   */
  private queue(chunk: StreamChunk): void {
    this.messageQueue.push(chunk);
    
    // Flush if not already flushing
    if (!this.isFlushing && this.ws.readyState === WebSocket.OPEN) {
      this.flush();
    }
  }

  /**
   * Flush queued chunks
   */
  private flush(): void {
    if (this.isFlushing || this.messageQueue.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      while (this.messageQueue.length > 0 && this.ws.readyState === WebSocket.OPEN) {
        const chunk = this.messageQueue.shift();
        if (chunk) {
          this.ws.send(JSON.stringify(chunk));
        }
      }
    } catch (error: any) {
      console.error('[StreamHandler] Flush error:', error.message);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Close the stream
   */
  close(): void {
    this.flush();
    this.messageQueue = [];
  }
}

/**
 * Create streaming handler for LLM response
 */
export function createStreamingCallback(
  handler: StreamHandler
): (chunk: { content?: string; thinking?: string }) => void {
  return (chunk) => {
    if (chunk.content) {
      handler.sendToken(chunk.content);
    }
    if (chunk.thinking) {
      handler.sendThinking(chunk.thinking);
    }
  };
}
