/**
 * Chat Routes - Adaptive Context Engine
 * Main chat completion endpoints with intelligent context management
 */

import { Router, Request, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.middleware';
import { getSession, addMessage, getHistory, getWorkspace } from '../../session';
import { getConsciousnessCoordinator } from '../../../consciousness/coordinator';
import { getResponseCache } from '../../../core/response-cache';
import { getFnCallPrompt } from '../../../core/fncall-prompt';
import { getProvider } from '../../../providers/factory';
import { getToolDefinitions } from '../../../tools/core';
import { getConfig } from '../../../config/config';
import { ChatMessage } from '../../../providers/LLMProvider';
import { getPromptLogger } from '../../../db/prompt-logger';
import { getToolRegistry } from '../../../tools/registry';
import { buildPersonalityContext, readDailyMemoryContext } from '../../personality-engineer';
import { buildContextForMessage } from '../../context-engineer';
import { detectIntelligenceTier } from '../../../agent/tier-detector';
import {
  detectContextMode,
  buildAdaptiveContext,
  parseToolRequest,
  createSessionState,
  type SessionState
} from '../../../agent/adaptive-context-engine';

export const chatRouter = Router();

// Session state cache
const sessionStates = new Map<string, SessionState>();

function getOrCreateSessionState(sessionId: string): SessionState {
  if (!sessionStates.has(sessionId)) {
    sessionStates.set(sessionId, createSessionState());
  }
  return sessionStates.get(sessionId)!;
}

function getCoordinator() {
  return getConsciousnessCoordinator();
}

function getCache() {
  return getResponseCache();
}

/**
 * POST /api/chat
 * Main chat completion endpoint with adaptive context and recursive agentic loop
 */
chatRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const session = getSession(sessionId || req.sessionId || 'default');
    const userId = req.userId || 'anonymous';
    const sessionState = getOrCreateSessionState(session.id);

    // Add user message to history
    await addMessage(session.id, {
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Detect context mode
    const contextTier = detectContextMode(message, sessionState);
    console.log(`[ModularChat] Mode: ${contextTier.mode} (${contextTier.reason})`);

    // ━━━ Wolverine FnCall Architecture ━━━
    // Use the native Wolverine protocol (generic, scalable, AGI-optimized)
    const fnCallPrompt = getFnCallPrompt('wolverine');
    const llm = getProvider();
    const registry = getToolRegistry();
    const config = getConfig().getConfig();
    const providerName = config.llm?.provider || 'ollama';
    const providerConfig = config.llm?.providers?.[providerName];

    if (!providerConfig) {
      res.status(500).json({ error: 'LLM provider not configured' });
      return;
    }

    const isSSE = req.headers.accept?.includes('text/event-stream');
    if (isSSE) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
    }

    const sendEvent = (type: string, data: any) => {
      if (isSSE) {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      }
    };

    let currentRound = 0;
    const MAX_ROUNDS = 5;
    let finalResponse = '';
    let lastResult = null;
    const _startTime = Date.now();
    let detectedTier: any = 'low';
    let toolsCurrentlyInjected = false;
    let turnTools = [];

    // Main Agentic Loop
    while (currentRound < MAX_ROUNDS) {
      const history = getHistory(session.id);

      // 1. Fetch deep context (SOUL.md, USER.md, Memories, Procedures)
      const workspacePath = getWorkspace(session.id) || getConfig().getWorkspacePath();
      const modelName = session.model || (providerConfig as any).model || getConfig().getConfig().models.primary;
      const contextWindow = (providerConfig as any).num_ctx || 8192;
      const tier = detectIntelligenceTier(modelName, contextWindow, providerName);
      detectedTier = tier;

      const personality = await buildPersonalityContext(workspacePath, contextTier.mode, tier);
      const dailyMemory = readDailyMemoryContext(workspacePath);
      const engineerContext = await buildContextForMessage(message, session.id, tier);

      const combinedPersonality = [
        personality,
        dailyMemory,
        engineerContext.relevantMemories,
        engineerContext.matchedProcedure,
        engineerContext.activeScratchpad,
        engineerContext.agentEnhancements
      ].filter(Boolean).join('\n\n');

      // 2. Build adaptive context (includes system prompt and history)
      const context = await buildAdaptiveContext(
        history.map(m => ({ role: m.role as any, content: m.content })),
        sessionState,
        contextTier.mode,
        currentRound, // Pass current round to prevent re-injecting system prompt
        contextTier.toolIntent,
        combinedPersonality
      );

      // Determine tools for this round
      if (!toolsCurrentlyInjected) {
        turnTools = context.tools || [];
      }

      // Check tier for tool strategy
      const useNativeTools = (tier === 'high'); // Only High tier gets native Ollama tool-calling for now

      // Prepare messages for LLM
      let messages: ChatMessage[] = [
        { role: 'system', content: context.systemPrompt },
        ...context.messages
      ];

      // For models that need it (low/med), manual-prompt tool descriptions
      if (turnTools.length > 0 && !useNativeTools) {
        messages = fnCallPrompt.preprocess(messages, turnTools, { format: 'wolverine', tier });
      }

      console.log(`[ModularChat] Round ${currentRound + 1}: calling ${providerConfig.model} (Tier: ${tier}, NativeTools: ${useNativeTools})`);
      sendEvent('info', { message: `Thinking (Round ${currentRound + 1})...` });

      const result = await llm.chat(messages, providerConfig.model, {
        // Only use native tools for capable models
        tools: useNativeTools ? turnTools : undefined,
        temperature: 0.2,
        max_tokens: 4096
      });

      lastResult = result;
      const responseContent = typeof result.message.content === 'string' ? result.message.content : JSON.stringify(result.message.content);

      // Extract and send thinking if available
      if (result.thinking) {
        sendEvent('thinking', { thinking: result.thinking });
      } else {
        // Fallback for models that put thinking in content (standard <thinking> tags)
        const thinkMatch = responseContent.match(/<thinking>([\s\S]*?)(?:<\/thinking>|$)/i);
        if (thinkMatch) {
          sendEvent('thinking', { thinking: thinkMatch[1].trim() });
        }
      }

      // Log prompt
      getPromptLogger().log({
        sessionId: session.id,
        model: providerConfig.model,
        provider: providerName,
        messages: messages.map((m: any) => ({ role: m.role, content: String(m.content || '').slice(0, 5000) })),
        tools: turnTools,
        tokenUsage: result.usage,
        response: responseContent.slice(0, 2000),
        tags: [`round:${currentRound}`, `mode:${contextTier.mode}`],
      });

      // 1. Check for tool capability request (JSON interception)
      const toolRequest = parseToolRequest(responseContent);
      if (toolRequest && toolRequest.length > 0 && !toolsCurrentlyInjected) {
        console.log(`[ModularChat] Tool capability requested: ${toolRequest.join(', ')}`);

        // Inject tools into state
        sessionState.toolCapabilityRequested = true;
        sessionState.requestedTools = toolRequest;
        turnTools = getToolDefinitions(toolRequest);
        toolsCurrentlyInjected = true;

        sendEvent('agent_mode', { mode: 'execute' });
        sendEvent('info', { message: `Injecting tools: ${toolRequest.join(', ')}` });

        // IMPORTANT: We do NOT add an assistant message yet. 
        // We just re-invoke the LLM with the new tools.
        // This keeps the conversation clean and helps small models focus.
        continue;
      }

      // 2. Parse and execute actual tool calls
      const parsed = fnCallPrompt.postprocess(responseContent, { format: 'wolverine' });

      if (parsed.toolCalls && parsed.toolCalls.length > 0) {
        console.log(`[ModularChat] Executing ${parsed.toolCalls.length} tools...`);

        // Add assistant message (the one that called the tools) to history
        await addMessage(session.id, {
          role: 'assistant',
          content: responseContent, // Keep reasoning/raw call
          timestamp: Date.now()
        });

        const workspacePath = getWorkspace(session.id) || getConfig().getWorkspacePath();

        for (const toolCall of parsed.toolCalls) {
          const tName = toolCall.function.name;
          const tArgs = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;

          try {
            console.log(`[ModularChat] Action: ${tName}`);
            sendEvent('tool_call', { action: tName, args: tArgs, stepNum: currentRound + 1 });

            const tResult = await registry.execute(tName, tArgs, { sessionId: session.id, workspacePath });
            const outputText = tResult.stdout || tResult.stderr || tResult.data || tResult.error || 'Done.';

            sendEvent('tool_result', { action: tName, result: outputText, error: !tResult.success, stepNum: currentRound + 1 });

            await addMessage(session.id, {
              role: 'tool' as any,
              content: `Result of ${tName}: ${outputText}`,
              timestamp: Date.now(),
              tool_call_id: toolCall.id
            });
          } catch (e: any) {
            console.error(`[ModularChat] Tool Error:`, e.message);
            sendEvent('tool_result', { action: tName, result: `Error: ${e.message}`, error: true, stepNum: currentRound + 1 });
            await addMessage(session.id, {
              role: 'tool' as any,
              content: `Error executing ${tName}: ${e.message}`,
              timestamp: Date.now()
            });
          }
        }

        currentRound++;
        continue;
      }

      // 3. No more tools - this is the final answer
      finalResponse = responseContent;
      break;
    }

    if (!finalResponse && lastResult) {
      finalResponse = String(lastResult.message.content || '... (Logic processed, awaiting next input)');
    } else if (!finalResponse) {
      finalResponse = '... (Sovereign mode stable, no further action required)';
    }

    // Wrap-up: Add final response to history
    await addMessage(session.id, {
      role: 'assistant',
      content: finalResponse,
      timestamp: Date.now()
    });

    // Detailed Logbook Entry
    console.log(`[ModularChat] Round Finish: ${currentRound}/${MAX_ROUNDS} | Tier: ${detectedTier} | Latency: ${Date.now() - _startTime}ms`);

    // Update session state
    sessionState.turnCount++;
    sessionState.lastMode = contextTier.mode;

    // 4. Final response and cognition (Safety Wrapped)
    let adaptedResponse = finalResponse;
    let engagements: any[] = [];

    try {
      // Consciousness Layer update (Reflection/Metacognition)
      const finalHistory = getHistory(session.id);
      const consciousnessResult = await getCoordinator().processInteraction({
        userId,
        sessionId: session.id,
        messages: finalHistory,
        response: finalResponse,
        success: currentRound < MAX_ROUNDS
      });

      adaptedResponse = consciousnessResult.adaptedResponse || finalResponse;
      engagements = consciousnessResult.engagements || [];
    } catch (cognitionError: any) {
      console.error('[ModularChat] Consciousness Layer Error (Non-Fatal):', cognitionError.message);
      // Fall back to raw response if the brain gets a headache
    }

    if (isSSE) {
      sendEvent('done', {
        reply: adaptedResponse,
        sessionId: session.id,
        mode: contextTier.mode,
        rounds: currentRound,
        engagements: engagements,
        diagnostics: {
          tier: detectedTier,
          rounds: currentRound,
          time_ms: Date.now() - _startTime,
          model: providerConfig.model
        }
      });
      res.end();
    } else {
      res.json({
        response: adaptedResponse,
        sessionId: session.id,
        mode: contextTier.mode,
        rounds: currentRound,
        engagements: engagements
      });
    }

  } catch (error: any) {
    console.error('[ModularChat] Fatal Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /api/chat/stream
 * Streaming chat endpoint
 */
chatRouter.post('/stream', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    res.json({
      message: 'For streaming, connect to WebSocket endpoint',
      wsEndpoint: `/ws/chat?sessionId=${sessionId || 'default'}`
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/consciousness/:sessionId
 * Get consciousness state for a session
 */
chatRouter.get('/consciousness/:sessionId', requireAuth, (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const coordinator = getCoordinator();
    const state = coordinator.getState(sessionId);

    res.json({
      sessionId,
      consciousness: state
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
