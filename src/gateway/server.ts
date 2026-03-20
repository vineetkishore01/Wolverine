import type { Settings } from "../types/settings.js";
import { ProviderFactory } from "../providers/factory.js";
import { nodeRegistry } from "./node-registry.js";
import { CognitiveCore } from "../brain/cognitive-core.js";
import { SynapsePredictiveRouter } from "../brain/synapse-router.js";
import { toolHandler } from "../core/tool-handler.js";
import { SelfEvolutionEngine } from "../brain/evolution.js";
import { VisionEngine } from "./vision-engine.js";
import { telemetry } from "./telemetry.js";
import { skillRegistry } from "../tools/registry.js";
import { contextEngineer } from "../brain/context-engineer.js";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { PATHS } from "../types/paths.js";

/**
 * GatewayServer is the central communication hub of the Wolverine system.
 * It provides a WebSocket and HTTP interface for nodes, channels, and the Web UI.
 * It manages the cognitive loop, tool execution, and telemetry broadcasting.
 */
export class GatewayServer {
  private settings: Settings;
  private brain: CognitiveCore;
  private spr: SynapsePredictiveRouter;
  private evolution: SelfEvolutionEngine;
  private vision: VisionEngine;
  private llmProvider: any;
  private telegramChannel: any | null = null;

  /**
   * Initializes the GatewayServer with provided settings and bootstraps 
   * core engines (Brain, Evolution, Vision) and the LLM provider.
   * @param settings - The global configuration settings.
   */
  constructor(settings: Settings) {
    this.settings = settings;
    this.brain = new CognitiveCore(settings);
    this.spr = new SynapsePredictiveRouter(settings);
    this.evolution = new SelfEvolutionEngine(settings);
    this.vision = new VisionEngine(settings);
    this.llmProvider = ProviderFactory.create(this.settings);
  }

  /**
   * Attaches a Telegram channel instance to the gateway.
   * @param channel - The TelegramChannel instance.
   */
  setTelegramChannel(channel: any) {
    this.telegramChannel = channel;
  }

  /**
   * Starts the Bun server, handling both HTTP API requests and WebSocket connections.
   * Endpoints include configuration management, memory searching, and evolution triggers.
   */
  start() {
    const port = this.settings.gateway.port;
    const host = this.settings.gateway.host;
    const self = this;

    console.log(`[Gateway] Starting server on ws://${host}:${port}`);

    this.vision.startVisualStream();

    const server = Bun.serve({
      port,
      hostname: host,
      
      /**
       * Main fetch handler for the Bun server.
       * Routes HTTP requests and upgrades WebSocket connections.
       * @param req - The incoming Request object.
       * @param server - The Bun Server instance.
       * @returns A Response object or undefined (if upgraded to WS).
       */
      async fetch(req, server) {
        const url = new URL(req.url);
        
        // Handle HTTP endpoints first (avoid WebSocket upgrade issues)
        if (url.pathname === "/health") {
          return new Response(JSON.stringify({ status: "ok", uptime: process.uptime() }));
        }

        if (url.pathname === "/api/config" && req.method === "GET") {
          return new Response(JSON.stringify(self.settings), {
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.pathname === "/api/config" && req.method === "POST") {
          try {
            const newConfig = await req.json();
            // Validate Gateway config
            if (newConfig.gateway?.port) {
              const port = parseInt(newConfig.gateway.port);
              if (isNaN(port) || port < 1024 || port > 65535) {
                return new Response(JSON.stringify({ 
                  ok: false, 
                  error: "Port must be between 1024 and 65535" 
                }), { status: 400 });
              }
            }
            
            // Preserve critical in-memory state
            const oldBrain = self.brain;
            
            // Apply new config
            Object.assign(self.settings, newConfig);
            fs.writeFileSync("settings.json", JSON.stringify(self.settings, null, 2));
            
            // Hot-reload engines
            try {
              self.llmProvider = ProviderFactory.create(self.settings);
              self.brain = new CognitiveCore(self.settings);
              self.spr = new SynapsePredictiveRouter(self.settings);
              self.evolution = new SelfEvolutionEngine(self.settings);
              self.vision = new VisionEngine(self.settings);
              toolHandler.setSettings(self.settings);
            } catch (err: any) {
              self.brain = oldBrain;
              return new Response(JSON.stringify({ 
                ok: false, 
                error: `Engine reload failed: ${err.message}` 
              }), { status: 500 });
            }

            // Hot-reload Telegram channel if present
            if (self.telegramChannel) {
              const { TelegramChannel } = require("./channels/telegram.js");
              await self.telegramChannel.stop();
              const newTelegram = new TelegramChannel(self.settings);
              self.telegramChannel = newTelegram;
              newTelegram.start().then(() => {
                newTelegram.sendTestMessage();
              });
              console.log("[Gateway] Telegram channel hot-reloaded.");
            }
            
            console.log(`[Gateway] Config hot-reloaded. Warning: In-memory conversation context was reset.`);
            return new Response(JSON.stringify({ 
              ok: true, 
              message: "Config updated. Note: Active conversations lost context." 
            }));
          } catch (err: any) {
            return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400 });
          }
        }

        if (url.pathname === "/api/memory/clear" && req.method === "DELETE") {
          try {
            await contextEngineer.clearMemories();
            return new Response(JSON.stringify({ ok: true, message: "Memory cleared" }));
          } catch (err: any) {
            console.error("[Gateway] Memory clear failed:", err);
            return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
          }
        }

        if (url.pathname === "/api/memory" && req.method === "GET") {
          const q = url.searchParams.get("q") || "";
          try {
            const memories = await contextEngineer.searchMemories(q);
            return new Response(JSON.stringify({ memories }), {
              headers: { "Content-Type": "application/json" }
            });
          } catch {
            return new Response(JSON.stringify({ memories: [] }));
          }
        }

        if (url.pathname === "/api/evolve" && req.method === "POST") {
          const { SkillEvolver } = require("../brain/skill-evolver.js");
          const evolver = new SkillEvolver(self.settings);
          evolver.runEvolutionCycle().catch((err: any) => console.error("[Evolution] Error:", err));
          return new Response(JSON.stringify({ ok: true, message: "Evolution cycle started" }));
        }

        if (url.pathname === "/api/onboarding" && req.method === "POST") {
          try {
            const data = await req.json();
            Object.assign(self.settings, data);
            fs.writeFileSync("settings.json", JSON.stringify(self.settings, null, 2));
            
            // Initial engine load
            self.llmProvider = ProviderFactory.create(self.settings);
            self.brain = new CognitiveCore(self.settings);
            self.spr = new SynapsePredictiveRouter(self.settings);
            self.evolution = new SelfEvolutionEngine(self.settings);
            self.vision = new VisionEngine(self.settings);
            toolHandler.setSettings(self.settings);

            // Hot-reload Telegram channel if present
            if (self.telegramChannel) {
              const { TelegramChannel } = require("./channels/telegram.js");
              await self.telegramChannel.stop();
              const newTelegram = new TelegramChannel(self.settings);
              self.telegramChannel = newTelegram;
              newTelegram.start().then(() => {
                newTelegram.sendTestMessage();
              });
              console.log("[Gateway] Telegram channel hot-reloaded after onboarding.");
            }

            return new Response(JSON.stringify({ ok: true, message: "Onboarding complete! Wolverine is ready." }));
          } catch (err) {
            return new Response(JSON.stringify({ ok: false, error: "Invalid onboarding data" }), { status: 400 });
          }
        }

        // Attempt WebSocket upgrade for everything else
        const success = server.upgrade(req, {
          data: { id: crypto.randomUUID() },
        } as any);
        
        if (success) return undefined;

        // Static file serving for web UI
        const distRoot = path.resolve("./web-ui/dist");
        
        if (url.pathname === "/" || url.pathname === "/index.html") {
          const indexPath = path.join(distRoot, "index.html");
          if (fs.existsSync(indexPath)) {
            return new Response(Bun.file(indexPath));
          }
          return new Response("Wolverine Web UI not built. Run 'npm run build' in web-ui folder.", { status: 500 });
        }

        // Static file serving with path traversal protection
        const relativePath = url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname;
        const staticPath = path.join(distRoot, relativePath);
        
        if (staticPath.startsWith(distRoot) && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
          return new Response(Bun.file(staticPath));
        }

        return new Response("Not found", { status: 404 });
      },
      
      websocket: {
        /**
         * Triggered when a new WebSocket connection is established.
         * Subscribes the connection to the 'telemetry' topic.
         * @param ws - The WebSocket connection instance.
         */
        open(ws: any) {
          console.log(`[WS] Connection opened: ${ws.data.id}`);
          ws.subscribe("telemetry");
        },
        
        /**
         * Main message handler for WebSocket connections.
         * Handles node registration ('connect') and chat requests ('agent.chat').
         * @param ws - The WebSocket connection instance.
         * @param message - The raw message data.
         */
        message(ws: any, message: any) {
          const connId = ws.data.id;
          try {
            const data = JSON.parse(message.toString());

            if (data.type === "req" && data.method === "connect") {
              const { nodeId, capabilities, displayName } = data.params;
              nodeRegistry.register({ nodeId, connId, ws, capabilities: capabilities || [], displayName });

              telemetry.publish({
                type: "system", source: "Gateway",
                content: `Node Connected: ${displayName || nodeId}`
              });

              ws.send(JSON.stringify({ type: "res", id: data.id, ok: true, payload: { status: "ready" } }));
              return;
            }

            if (data.type === "req" && data.method === "agent.history") {
              contextEngineer.assembleActiveContext().then(history => {
                ws.send(JSON.stringify({
                  type: "res",
                  id: data.id,
                  ok: true,
                  payload: { messages: history }
                }));
              });
              return;
            }

            if (data.type === "req" && data.method === "agent.chat") {
              ws.subscribe("chat"); // Sync messages
              self.handleAgentChat(ws, data);
              return;
            }

            // Unknown message type - send error response
            ws.send(JSON.stringify({
              type: "res",
              id: data.id || "unknown",
              ok: false,
              error: "Unknown message type"
            }));

          } catch (err) {
            console.error(`[Gateway] [${connId}] Error processing message:`, err);
            // Send error back to client
            ws.send(JSON.stringify({
              type: "res",
              id: "unknown",
              ok: false,
              error: "Failed to process message"
            }));
          }
        },
        
        /**
         * Triggered when a WebSocket connection is closed.
         * Unregisters the node from the registry.
         * @param ws - The WebSocket connection instance.
         */
        close(ws: any) {
          const connId = ws.data.id;
          nodeRegistry.unregister(connId);
        },
      },
    });

    telemetry.setServer(server);
    console.log(`[Gateway] Wolverine is online and listening. Dashboard: http://${host}:${port}`);
  }

  /**
   * Handles incoming chat requests from users or channels.
   * Manages the "Think-Tool-Act" loop (up to 5 iterations).
   * Records telemetry and enriches context using CognitiveCore.
   * @param ws - The WebSocket connection that sent the request.
   * @param data - The parsed request message containing parameters and metadata.
   * @private
   */
  private async handleAgentChat(ws: any, data: any) {
    if (ws.readyState !== 1) {
      console.warn("[Gateway] WebSocket not open, skipping message");
      return;
    }
    
    const { messages, metadata } = data.params;
    
    if (!messages || messages.length === 0) {
      this.safeSend(ws, {
        type: "res",
        id: data.id,
        ok: false,
        error: "No messages provided"
      });
      return;
    }
    
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const convId = telemetry.startConversation(lastUserMessage);
    
    // BROADCAST USER MESSAGE: Echo to all other connected clients
    this.broadcast({
      type: "chat",
      source: "user",
      content: lastUserMessage,
      metadata: { ...metadata, convId }
    }, ws);

    try {
      telemetry.publish({ type: "chat", source: "User", content: lastUserMessage });
      
      const contextStart = Date.now();
      let activeMessages = await this.brain.enrichPrompt(lastUserMessage);
      const contextDuration = Date.now() - contextStart;
      
      // SYNAPSE PREDICTIVE ROUTING (SPR): Pre-analyze the task to determine strategy
      let routingDecision;
      try {
        routingDecision = await this.spr.route(lastUserMessage, activeMessages.map(m => m.content).join("\n").substring(0, 1000));
      } catch (err: any) {
        const isTimeout = err.message === "SPR_TIMEOUT";
        telemetry.publish({ 
          type: "system", 
          source: "SPR", 
          content: isTimeout ? "Bypassing predictive pass (Latency spike)" : `SPR Error: ${err.message}` 
        });
        // Default strategy on fail/timeout
        routingDecision = { strategy: "LOOP", suggestedFiles: [], intent: "RESEARCH", risk: "MEDIUM", reasoning: "Fallback from SPR." } as any;
      }
      
      if (routingDecision.strategy === "REJECT") {
        this.safeSend(ws, { 
          type: "res", id: data.id, ok: false, 
          payload: { content: `SPR Governance: I've declined this task for safety or policy reasons: ${routingDecision.reasoning}` } 
        });
        return;
      }

      // Pre-load suggested files (SPR Hindsight Pre-analysis)
      if (routingDecision.suggestedFiles?.length > 0) {
        let preloadContent = "[SPR HINDSIGHT PRE-ANALYSIS] I've pre-loaded relevant file snippets based on your request:\n";
        for (const fileName of routingDecision.suggestedFiles) {
          try {
            // Try current working directory (project root) first, then workspace root
            const projectPath = path.resolve(process.cwd(), fileName);
            const workspacePath = path.resolve(PATHS.root, fileName);
            const fullPath = fs.existsSync(projectPath) ? projectPath : workspacePath;

            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
              const content = fs.readFileSync(fullPath, "utf-8").substring(0, 3000);
              preloadContent += `\n--- FILE: ${fileName} ---\n${content}\n`;
            }
          } catch {}
        }
        activeMessages.push({ role: "system", content: preloadContent });
      }

      if (routingDecision.strategy === "IMMEDIATE") {
        telemetry.publish({ type: "thought", source: "SynapsePredictiveRouter", content: "SPR: Routing to IMMEDIATE execution path." });
        const response = await this.llmProvider.generateCompletion({
          messages: activeMessages,
          model: this.settings.llm.ollama.model,
        });
        this.safeSend(ws, { type: "res", id: data.id, ok: true, payload: response, metadata: { ...metadata, convId } });
        return;
      }

      let finalResult: any = null;
      let loopCount = 0;
      let systemPrompt = activeMessages[0]?.content || "";

      while (loopCount < 5) {
        // 1. REFLECTIVE ANALYSIS: Before calling LLM, check for semantic loops
        const recentActions = activeMessages.filter(m => m.role === "assistant" && m.content.includes("TOOL_CALL"));
        if (recentActions.length >= 3) {
          const lastAction = recentActions[recentActions.length - 1].content;
          const secondLastAction = recentActions[recentActions.length - 2].content;
          
          if (lastAction === secondLastAction) {
            telemetry.publish({ type: "thought", source: "Reflector", content: "Semantic loop detected. Injecting course correction." });
            activeMessages.push({ 
              role: "system", 
              content: "[CRITICAL REFLECTION] You have attempted the exact same action twice. It did not produce the desired result. DO NOT repeat it. Analyze why it failed and try a COMPLETELY different tool or strategy." 
            });
          }
        }

        if (loopCount === 0) {
          telemetry.recordContextAssembly(systemPrompt, activeMessages, contextDuration);
        }
        
        telemetry.publish({ 
          type: "llm_in", 
          source: "Brain", 
          content: `Model: ${this.settings.llm.ollama.model} | Loop: ${loopCount + 1}/5`
        });
        
        const llmStart = Date.now();
        const response = await this.llmProvider.generateCompletion({
          messages: activeMessages,
          model: this.settings.llm.ollama.model,
        });
        const llmDuration = Date.now() - llmStart;

        const content = response.content;
        const cleanContent = this.stripThoughtAndToolBlocks(content);
        const toolCallMatch = this.extractFirstToolCall(content);
        
        telemetry.recordLLMResponse(content, llmDuration, !!toolCallMatch);
        telemetry.publish({ type: "llm_out", source: "Ollama", content: `(In ${llmDuration / 1000}s) ${content}` });

        if (toolCallMatch) {
          try {
            const call = toolCallMatch;
            telemetry.publish({ type: "action", source: "ToolHandler", content: { tool: call.name, params: call.params } });

            const toolStart = Date.now();
            const result = await toolHandler.execute(call.name, call.params);
            const toolDuration = Date.now() - toolStart;
            
            telemetry.recordToolCall(call.name, call.params, result, toolDuration);
            telemetry.publish({ type: "system", source: "ToolResult", content: result });

            if (result.data?.type === "subagent_spawn") {
              const { childId, task } = result.data;
              this.simulateSubagentTask(ws, childId, task, metadata).catch(err => console.error("[Subagent] Simulation error:", err));
            }

            await this.evolution.captureLesson({
              timestamp: new Date().toISOString(),
              goal: lastUserMessage,
              action: `${call.name}(${JSON.stringify(call.params)})`,
              error: result.success ? undefined : result.output,
              output: result.success ? result.output : undefined,
              category: call.name === "browser" ? "browser" : "logic"
            });

            activeMessages.push({ role: "assistant", content });
            
            // INTELLECTUAL FEEDBACK: Provide structured feedback so the LLM understands the result semantically
            const resultFeedback = result.success 
              ? `TOOL_RESULT (${call.name}): SUCCESS. Output: ${result.output}`
              : `TOOL_RESULT (${call.name}): FAILED. Error: ${result.output}. Analyze this error and solve it.`;
            
            activeMessages.push({ role: "system", content: resultFeedback });

            loopCount++;
            continue;
          } catch (err) {
            console.error("[Gateway] Tool Error:", err);
          }
        }

        finalResult = response;
        
        let cleanedContent = cleanContent.trim();
        if (!cleanedContent) {
          cleanedContent = "(Completed task)";
        }
        finalResult.content = cleanedContent;
        
        break;
      }

      if (!finalResult) {
        finalResult = { content: "I've completed the requested operations but have no specific textual summary. Please check the trace for details or let me know if you need more info." };
      }

      telemetry.recordToolResult(finalResult);
      telemetry.endConversation(finalResult.content);
      
      this.brain.recordMemory(`User: ${lastUserMessage}\nWolverine: ${finalResult.content}`);
      
      this.safeSend(ws, { 
        type: "res", 
        id: data.id, 
        ok: true, 
        payload: finalResult,
        metadata: { ...metadata, convId } 
      });

      // BROADCAST BOT RESPONSE: Sync to all other clients
      this.broadcast({
        type: "chat",
        source: "bot",
        content: finalResult.content,
        metadata: { ...metadata, convId }
      }, ws);

    } catch (err: any) {
      const isTimeout = err.message?.includes("timed out") || err.name === "TimeoutError";
      const userMessage = isTimeout 
        ? "I'm taking longer than usual to respond. The AI server might be busy or overloaded. Please try again."
        : "I encountered an issue processing your request. Please try again.";

      console.error(`[Gateway] Chat Error: ${isTimeout ? "LLM timeout" : err.message}`);
      
      telemetry.publish({ type: "error", source: "Gateway", content: { message: err.message, timeout: isTimeout, convId } });
      telemetry.endConversation(`ERROR: ${userMessage}`);
      
      this.safeSend(ws, {
        type: "res",
        id: data.id,
        ok: false,
        payload: { content: userMessage },
        error: { message: userMessage }
      });
    }
  }

  /**
   * Simulates a subagent task and notifies the parent when it's done.
   * This is used for "background" tasks that Wolverine delegates to specialized agents.
   * @param ws - The parent connection to notify.
   * @param childId - Identifier for the child subagent.
   * @param task - Description of the task being performed.
   * @param metadata - Original metadata from the parent request to maintain context.
   * @private
   */
  private async simulateSubagentTask(ws: any, childId: string, task: string, metadata: any) {
    console.log(`[Subagent] ${childId} starting task: ${task}`);
    
    // Simulate thinking/work with incremental progress updates
    const stages = [
      "Analyzing requirements...",
      "Researching codebase...",
      "Drafting implementation...",
      "Validating changes...",
      "Finalizing sub-task..."
    ];

    for (let i = 0; i < stages.length; i++) {
      telemetry.publish({ 
        type: "system", 
        source: "Subagent", 
        content: { childId, status: "running", stage: stages[i], progress: Math.round(((i + 1) / stages.length) * 100) } 
      });
      
      // Random delay between 1-3 seconds per stage
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
    }

    const resultSummary = `SUBAGENT_COMPLETE: ${childId}. 
Task: ${task}. 
Result: Successfully completed sub-task. The required files/information are now available in the workspace.`;

    telemetry.publish({ type: "system", source: "Subagent", content: { childId, status: "complete" } });

    // Inject the result as a "User Message" to the parent, including original metadata
    this.safeSend(ws, {
      type: "msg",
      payload: {
        role: "user",
        content: `[Event: Subagent Completion]\n${resultSummary}`,
        ...metadata
      }
    });
  }

  /**
   * Attempts to extract the first TOOL_CALL from an LLM response.
   * Supports both direct JSON and JSON wrapped in markers.
   * @param content - The raw content from the LLM.
   * @returns The parsed tool call name and params, or null if not found.
   * @private
   */
  private extractFirstToolCall(content: string): { name: string; params: any } | null {
    // 1. PRIMARY: Standard prefixed format
    const standardMatch = content.match(/TOOL_CALL:\s*(\{[\s\S]*?\})/);
    if (standardMatch) {
      try {
        const parsed = JSON.parse(standardMatch[1]);
        if (parsed.name && parsed.params) return parsed;
      } catch {}
    }

    // 2. SECONDARY: Raw JSON search (for models that forget the prefix)
    const jsonBlocks = content.match(/\{[\s\S]*?\}/g);
    if (jsonBlocks) {
      for (const block of jsonBlocks) {
        try {
          const parsed = JSON.parse(block);
          if (parsed.name && parsed.params) {
            console.log(`[Gateway] Rescued un-prefixed tool call: ${parsed.name}`);
            return parsed;
          }
        } catch {}
      }
    }
    
    return null;
  }

  /**
   * Removes thought tags and tool call blocks from an LLM response to get the user-facing content.
   * @param content - The raw content from the LLM.
   * @returns The cleaned, user-facing string.
   * @private
   */
  private stripThoughtAndToolBlocks(content: string): string {
    let result = content
      .replace(/<THOUGHT>[\s\S]*?<\/THOUGHT>/gi, '')
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      // Better regex for TOOL_CALL that handles balanced braces and potential multiple calls
      .replace(/TOOL_CALL:\s*\{[\s\S]*?\}/g, '')
      .replace(/```json\n\{\s*"name":[\s\S]*?\n\}\n```/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // If result is empty or just "}" / "{", the LLM was calling a tool
    if (/^[{}]$/.test(result) || result.trim() === '') {
      return '';
    }
    
    return result;
  }

  /**
   * Broadcasts a message to all connected WebSocket clients.
   * @param message - The message object to send.
   * @param exclude - Optional WebSocket instance to exclude from broadcast.
   * @private
   */
  private broadcast(message: any, exclude: any = null) {
    if (!this.server) return;
    this.server.publish("telemetry", JSON.stringify(message));
    // Also publish to all active connections (topics are easier in Bun)
    this.server.publish("chat", JSON.stringify(message));
  }

  /**
   * Safely sends a JSON message over a WebSocket if it's currently open.
   * @param ws - The WebSocket connection.
   * @param message - The message object to stringify and send.
   * @private
   */
  private safeSend(ws: any, message: any) {
    if (ws.readyState === 1) { // 1 = OPEN
      try {
        ws.send(JSON.stringify(message));
      } catch (err) {
        console.error("[Gateway] Failed to send WebSocket message:", err);
      }
    }
  }
}
