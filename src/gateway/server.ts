import type { Settings } from "../types/settings.js";
import { ProviderFactory, type LLMProvider } from "../providers/factory.js";
import { nodeRegistry } from "./node-registry.js";
import { CognitiveCore } from "../brain/cognitive-core.js";
import { toolHandler } from "../core/tool-handler.js";
import { SelfEvolutionEngine } from "../brain/evolution.js";
import { VisionEngine } from "./vision-engine.js";
import { SkillEvolver } from "../brain/skill-evolver.js";
import { telemetry } from "./telemetry.js";
import { contextEngineer } from "../brain/context-engineer.js";
import fs from "fs";

export class GatewayServer {
  private settings: Settings;
  private brain: CognitiveCore;
  private evolution: SelfEvolutionEngine;
  private vision: VisionEngine;
  private llmProvider: LLMProvider;

  constructor(settings: Settings) {
    this.settings = settings;
    this.brain = new CognitiveCore(settings);
    this.evolution = new SelfEvolutionEngine(settings);
    this.vision = new VisionEngine(settings);
    this.llmProvider = ProviderFactory.create(settings);
  }

  start() {
    const port = this.settings.gateway.port;
    const host = this.settings.gateway.host;
    const self = this;

    console.log(`[Gateway] Starting server on ws://${host}:${port}`);

    this.vision.startVisualStream();

    const server = Bun.serve({
      port,
      hostname: host,
      
      fetch(req, server) {
        const url = new URL(req.url);
        
        const success = server.upgrade(req, {
          data: { id: crypto.randomUUID() },
        });
        
        if (success) return undefined;

        if (url.pathname === "/health") {
          return new Response(JSON.stringify({ status: "ok", uptime: process.uptime() }));
        }

        if (url.pathname === "/api/config" && req.method === "GET") {
          return new Response(JSON.stringify(self.settings), {
            headers: { "Content-Type": "application/json" }
          });
        }

        if (url.pathname === "/api/config" && req.method === "POST") {
          return req.json().then(newConfig => {
            Object.assign(self.settings, newConfig);
            fs.writeFileSync("settings.json", JSON.stringify(self.settings, null, 2));
            self.llmProvider = ProviderFactory.create(self.settings);
            self.brain = new CognitiveCore(self.settings);
            return new Response(JSON.stringify({ ok: true, message: "Config updated and hot-reloaded" }));
          });
        }

        if (url.pathname === "/api/memory/clear" && req.method === "DELETE") {
          return contextEngineer.clearMemories().then(() => {
            return new Response(JSON.stringify({ ok: true, message: "Memory cleared" }));
          }).catch(() => {
            return new Response(JSON.stringify({ ok: false }));
          });
        }

        if (url.pathname === "/api/memory" && req.method === "GET") {
          const q = url.searchParams.get("q") || "";
          return contextEngineer.searchMemories(q).then(memories => {
            return new Response(JSON.stringify({ memories }), {
              headers: { "Content-Type": "application/json" }
            });
          }).catch(() => {
            return new Response(JSON.stringify({ memories: [] }));
          });
        }

        if (url.pathname === "/api/evolve" && req.method === "POST") {
          const evolver = new SkillEvolver(self.settings);
          evolver.runEvolutionCycle();
          return new Response(JSON.stringify({ ok: true, message: "Evolution cycle started" }));
        }

        if (url.pathname === "/api/onboarding") {
          return req.json().then(data => {
            Object.assign(self.settings, data);
            fs.writeFileSync("settings.json", JSON.stringify(self.settings, null, 2));
            self.llmProvider = ProviderFactory.create(self.settings);
            self.brain = new CognitiveCore(self.settings);
            return new Response(JSON.stringify({ ok: true, message: "Onboarding complete! Wolverine is ready." }));
          });
        }

        if (url.pathname === "/" || url.pathname === "/index.html") {
          return new Response(Bun.file("./web-ui/index.html"));
        }

        return new Response("Not found", { status: 404 });
      },
      
      websocket: {
        open(ws) {
          console.log(`[WS] Connection opened: ${ws.data.id}`);
          ws.subscribe("telemetry");
        },
        
        message(ws, message) {
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

          } catch (err) {
            console.error(`[Gateway] [${connId}] Error processing message:`, err);
          }
        },
        
        close(ws) {
          const connId = ws.data.id;
          nodeRegistry.unregister(connId);
        },
      },
    });

    telemetry.setServer(server);
    console.log(`[Gateway] Wolverine is online and listening. Dashboard: http://${host}:${port}`);
  }

  private async handleAgentChat(ws: any, data: any) {
    const { messages, metadata } = data.params;
    
    if (!messages || messages.length === 0) {
      ws.send(JSON.stringify({
        type: "res",
        id: data.id,
        ok: false,
        error: "No messages provided"
      }));
      return;
    }
    
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    if (!lastUserMessage) {
      ws.send(JSON.stringify({
        type: "res",
        id: data.id,
        ok: false,
        error: "Empty message content"
      }));
      return;
    }

    telemetry.publish({ type: "system", source: "Gateway", content: `New task started: "${lastUserMessage.substring(0, 50)}..."` });

    try {
      telemetry.publish({ type: "thought", source: "Brain", content: "Querying long-term memory (Chetna)..." });
      let activeMessages = await this.brain.enrichPrompt(lastUserMessage);
      telemetry.publish({ type: "thought", source: "Brain", content: `Context assembled: ${activeMessages.length} messages` });
      
      let finalResult: any = null;
      let loopCount = 0;

      while (loopCount < 5) {
        telemetry.publish({ type: "thought", source: "Ollama", content: `Calling Ollama (${this.settings.llm.ollama.model})...` });
        const response = await this.llmProvider.generateCompletion({
          messages: activeMessages,
          model: this.settings.llm.ollama.model,
        });

        const content = response.content;
        telemetry.publish({ type: "thought", source: "Ollama", content });

        const toolCallMatch = content.match(/TOOL_CALL:\s*(\{.*\})/s);

        if (toolCallMatch) {
          try {
            const call = JSON.parse(toolCallMatch[1]);
            telemetry.publish({ type: "action", source: "ToolHandler", content: `Executing ${call.name}...` });

            const result = await toolHandler.execute(call.name, call.params);

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

            loopCount++;
            continue;
          } catch (err) {
            console.error("[Gateway] Tool Error:", err);
          }
        }

        finalResult = response;
        
        // Check if we executed any tools and build a response
        let toolSummary = "";
        if (loopCount > 0) {
          toolSummary = `\n\n[Executed ${loopCount} tool call(s)]`;
        }
        
        // Clean up TOOL_CALL text from final response
        let cleanedContent = (finalResult?.content || "").replace(/TOOL_CALL:\s*\{.*\}\s*/s, '').trim();
        if (!cleanedContent) {
          cleanedContent = "(Processing...)";
        }
        finalResult.content = cleanedContent + toolSummary;
        
        break;
      }

      this.brain.recordMemory(`User: ${lastUserMessage}\nWolverine: ${finalResult?.content || ""}`, 0.7);

      ws.send(JSON.stringify({
        type: "res",
        id: data.id,
        ok: true,
        payload: finalResult,
        metadata: metadata
      }));
    } catch (err) {
      console.error("[Gateway] Agent chat error:", err);
      ws.send(JSON.stringify({
        type: "res",
        id: data.id,
        ok: false,
        error: String(err)
      }));
    }
  }
}
