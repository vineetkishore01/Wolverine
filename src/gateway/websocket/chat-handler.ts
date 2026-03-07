/**
 * WebSocket Chat Handler
 * Integrates consciousness layer with WebSocket streaming
 */

import { WebSocketGateway } from './server';
import { getConsciousnessCoordinator } from '../../consciousness/coordinator';
import { getResponseCache } from '../../core/response-cache';
import { getFnCallPrompt } from '../../core/fncall-prompt';
import { getProvider } from '../../providers/factory';
import { getToolDefinitions } from '../../tools/core';
import { getConfig } from '../../config/config';
import { getSession, addMessage, getHistory } from '../session';

let coordinator: any = null;
let cache: any = null;

function getCoordinator() {
  if (!coordinator) {
    coordinator = getConsciousnessCoordinator();
  }
  return coordinator;
}

function getCache() {
  if (!cache) {
    cache = getResponseCache({
      enabled: true,
      ttlSeconds: 3600,
      maxSizeMB: 100,
      cacheDir: './.wolverine/cache'
    });
  }
  return cache;
}

export function setupWebSocketChat(wsGateway: WebSocketGateway): void {
  console.log('[WebSocket] Chat handler setup');

  // Listen for chat messages
  wsGateway['wss'].on('connection', (ws) => {
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type !== 'chat') return;

        const { content, sessionId } = message;
        const session = getSession(sessionId || `session_${Date.now()}`);
        const userId = 'websocket-user';

        console.log(`[WebSocket] Chat message from ${session.id}`);

        // Add user message
        await addMessage(session.id, {
          role: 'user',
          content,
          timestamp: Date.now()
        });

        // Get history
        const history = getHistory(session.id);

        // Get config
        const config = getConfig().getConfig();
        const providerName = config.llm?.provider || 'ollama';
        const providerConfig = config.llm?.providers?.[providerName];

        if (!providerConfig) {
          ws.send(JSON.stringify({
            type: 'error',
            content: 'LLM provider not configured'
          }));
          return;
        }

        // Get LLM (from config)
        const llm = getProvider();
        const tools = getToolDefinitions();
        const fnCallPrompt = getFnCallPrompt('wolverine');

        // Prepare messages
        const messages = history.map((m: any) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        }));

        const processedMessages = fnCallPrompt.preprocess(messages, tools, { format: 'wolverine' });

        // Check cache
        const cached = await getCache().get({
          messages: processedMessages,
          tools: tools,
          model: providerConfig.model
        });

        if (cached) {
          console.log('[WebSocket] Cache HIT');
          ws.send(JSON.stringify({
            type: 'response',
            content: cached.response,
            cached: true
          }));
          return;
        }

        // Send thinking indicator
        ws.send(JSON.stringify({
          type: 'thinking',
          content: 'Processing...'
        }));

        // Call LLM
        const result = await llm.chat(processedMessages, providerConfig.model, {
          tools: tools,
          temperature: 0.7
        });

        // Parse response
        const responseContent = typeof result.message.content === 'string' ? result.message.content : JSON.stringify(result.message.content);
        const parsed = fnCallPrompt.postprocess(responseContent, { format: 'wolverine' });

        // Send response
        ws.send(JSON.stringify({
          type: 'response',
          content: parsed.content,
          toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined
        }));

        // Add to history
        await addMessage(session.id, {
          role: 'assistant',
          content: parsed.content,
          timestamp: Date.now()
        });

        // Cache
        await getCache().set({
          messages: processedMessages,
          tools: tools,
          model: providerConfig.model
        }, {
          response: parsed.content
        });

        // Process consciousness
        const consciousnessResult = await getCoordinator().processInteraction({
          userId,
          sessionId: session.id,
          messages: history,
          response: parsed.content,
          success: true
        });

        // Send proactive engagements
        if (consciousnessResult.engagements.length > 0) {
          ws.send(JSON.stringify({
            type: 'engagement',
            engagements: consciousnessResult.engagements
          }));
        }

      } catch (error: any) {
        console.error('[WebSocket] Chat error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          content: error.message
        }));
      }
    });
  });
}
