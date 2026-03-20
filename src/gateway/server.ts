import type { Settings } from "../types/settings.js";
import { ProviderFactory } from "../providers/factory.js";
import { nodeRegistry } from "./node-registry.js";
import { CognitiveCore } from "../brain/cognitive-core.js";
import { toolHandler } from "../core/tool-handler.js";
import { SelfEvolutionEngine } from "../brain/evolution.js";
import { VisionEngine } from "./vision-engine.js";
import { telemetry } from "./telemetry.js";
import { skillRegistry } from "../tools/registry.js";
import { contextEngineer } from "../brain/context-engineer.js";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

/**
 * GatewayServer is the central communication hub of the Wolverine system.
 * It provides a WebSocket and HTTP interface for nodes, channels, and the Web UI.
 * It manages the cognitive loop, tool execution, and telemetry broadcasting.
 */
export class GatewayServer {
  private settings: Settings;
  private brain: CognitiveCore;
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
              newTelegram.start();
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
            self.evolution = new SelfEvolutionEngine(self.settings);
            self.vision = new VisionEngine(self.settings);
            toolHandler.setSettings(self.settings);

            // Hot-reload Telegram channel if present
            if (self.telegramChannel) {
              const { TelegramChannel } = require("./channels/telegram.js");
              await self.telegramChannel.stop();
              const newTelegram = new TelegramChannel(self.settings);
              self.telegramChannel = newTelegram;
              newTelegram.start();
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

            if (data.type === "req" && data.method === "agent.chat") {
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
    
    try {
      telemetry.publish({ type: "chat", source: "User", content: lastUserMessage });
      
      const contextStart = Date.now();
      let activeMessages = await this.brain.enrichPrompt(lastUserMessage);
      const contextDuration = Date.now() - contextStart;
      
      let finalResult: any = null;
      let loopCount = 0;
      let systemPrompt = activeMessages[0]?.content || "";

      while (loopCount < 5) {
        if (loopCount === 0) {
          telemetry.recordContextAssembly(systemPrompt, activeMessages, contextDuration);
        }
        
        telemetry.publish({ 
          type: "llm_in", 
          source: "Brain", 
          content: `Model: ${this.settings.llm.ollama.model} | Sparse Context: ${activeMessages.length} msgs`
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
            activeMessages.push({ role: "system", content: `TOOL_RESULT: ${JSON.stringify(result)}` });

            // CONTEXT MONITORING: If context grows too large (e.g. over 10000 tokens), log a warning.
            const estimatedTokens = activeMessages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
            if (estimatedTokens > 10000) {
              console.warn(`[Gateway] Context is extremely large (${estimatedTokens} tokens). Next iteration might be slow.`);
            }

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
        finalResult = { content: "(Max tool iterations reached)" };
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
    
    // Simulate thinking/work (5-10s)
    await new Promise(r => setTimeout(r, 8000));

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
    // Find TOOL_CALL: and parse the JSON that follows, handling nested braces
    const toolCallMatch = content.match(/TOOL_CALL:\s*(.+?)(?=\n\n|\n[^]|$)/s);
    if (!toolCallMatch) return null;
    
    const jsonStr = toolCallMatch[1].trim();
    
    try {
      // Try direct parse first
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && parsed.params) {
        return parsed;
      }
    } catch {
      // Try extracting just the JSON portion
      const braceMatch = jsonStr.match(/(\{[\s\S]*\})/);
      if (braceMatch) {
        try {
          const parsed = JSON.parse(braceMatch[1]);
          if (parsed.name && parsed.params) {
            return parsed;
          }
        } catch {
          // Try with escaped quotes fixed
          const fixed = braceMatch[1].replace(/\\"/g, '"');
          try {
            const parsed = JSON.parse(fixed);
            if (parsed.name && parsed.params) {
              return parsed;
            }
          } catch {}
        }
      }
    }
    
    // Fallback: try to find balanced braces manually
    const startIdx = jsonStr.indexOf('{');
    if (startIdx === -1) return null;
    
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') depth++;
      if (jsonStr[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    
    if (endIdx !== -1) {
      const json = jsonStr.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(json);
        if (parsed.name && parsed.params) {
          return parsed;
        }
      } catch {
        console.warn(`[Gateway] Tool call parse failed for: ${json.substring(0, 100)}`);
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
