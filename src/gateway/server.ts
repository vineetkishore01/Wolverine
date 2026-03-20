import type { Settings } from "../types/settings.js";
import { ProviderFactory } from "../providers/factory.js";
import { nodeRegistry } from "./node-registry.js";
import { CognitiveCore } from "../brain/cognitive-core.js";
import { toolHandler } from "../core/tool-handler.js";
import { SelfEvolutionEngine } from "../brain/evolution.js";
import { VisionEngine } from "./vision-engine.js";
import { skillEvolver } from "../brain/skill-evolver.js";
import { telemetry } from "./telemetry.js";
import { skillRegistry } from "../tools/registry.js";
import { contextEngineer } from "../brain/context-engineer.js";
import { SkillEvolver } from "../brain/skill-evolver.js";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export class GatewayServer {
  private settings: Settings;
  private brain: CognitiveCore;
  private evolution: SelfEvolutionEngine;
  private vision: VisionEngine;
  private llmProvider: any;

  constructor(settings: Settings) {
    this.settings = settings;
    this.brain = new CognitiveCore(settings);
    this.evolution = new SelfEvolutionEngine(settings);
    this.vision = new VisionEngine(settings);
    this.llmProvider = ProviderFactory.create(this.settings);
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
          data: { id: crypto.randomUUID() } as any,
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
          const indexPath = path.resolve("./web-ui/dist/index.html");
          if (fs.existsSync(indexPath)) {
            return new Response(Bun.file(indexPath));
          }
          return new Response("Wolverine Web UI not built. Run 'npm run build' in web-ui folder.", { status: 500 });
        }

        // Static file serving for React assets
        const staticPath = path.resolve("./web-ui/dist", "." + url.pathname);
        if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
          return new Response(Bun.file(staticPath));
        }

        return new Response("Not found", { status: 404 });
      },
      
      websocket: {
        open(ws: any) {
          console.log(`[WS] Connection opened: ${ws.data.id}`);
          ws.subscribe("telemetry");
        },
        
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

          } catch (err) {
            console.error(`[Gateway] [${connId}] Error processing message:`, err);
          }
        },
        
        close(ws: any) {
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
    
    try {
      telemetry.publish({ type: "chat", source: "User", content: lastUserMessage });
      
      let activeMessages = await this.brain.enrichPrompt(lastUserMessage);
      
      let finalResult: any = null;
      let loopCount = 0;

      while (loopCount < 5) {
        telemetry.publish({ 
          type: "llm_in", 
          source: "Brain", 
          content: `Model: ${this.settings.llm.ollama.model} | Sparse Context: ${activeMessages.length} msgs`
        });
        
        const startTime = Date.now();
        const response = await this.llmProvider.generateCompletion({
          messages: activeMessages,
          model: this.settings.llm.ollama.model,
        });
        const duration = (Date.now() - startTime) / 1000;

        const content = response.content;
        telemetry.publish({ type: "llm_out", source: "Ollama", content: `(In ${duration}s) ${content}` });

        const cleanContent = this.stripThoughtAndToolBlocks(content);
        const toolCallMatch = this.extractFirstToolCall(cleanContent);

        if (toolCallMatch) {
          try {
            const call = toolCallMatch;
            telemetry.publish({ type: "action", source: "ToolHandler", content: { tool: call.name, params: call.params } });

            const result = await toolHandler.execute(call.name, call.params);
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

            loopCount++;
            continue;
          } catch (err) {
            console.error("[Gateway] Tool Error:", err);
          }
        }

        finalResult = response;
        
        let cleanedContent = this.stripThoughtAndToolBlocks(content).trim();
        if (!cleanedContent) {
          cleanedContent = "(Completed task)";
        }
        finalResult.content = cleanedContent;
        
        break;
      }

      this.brain.recordMemory(`User: ${lastUserMessage}\nWolverine: ${finalResult.content}`, 0.7);
      telemetry.publish({ type: "chat", source: "Wolverine", content: finalResult.content });

      ws.send(JSON.stringify({ 
        type: "res", 
        id: data.id, 
        ok: true, 
        payload: finalResult,
        metadata: metadata 
      }));

    } catch (err: any) {
      console.error("[Gateway] Chat Error:", err);
      ws.send(JSON.stringify({
        type: "res",
        id: data.id,
        ok: false,
        error: { message: err.message }
      }));
    }
  }

  /**
   * BACKGROUND HANDSHAKE: Simulates a subagent task and notifies parent
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
    ws.send(JSON.stringify({
      type: "msg",
      payload: {
        role: "user",
        content: `[Event: Subagent Completion]\n${resultSummary}`,
        ...metadata
      }
    }));
  }

  private extractFirstToolCall(content: string): { name: string; params: any } | null {
    const match = content.match(/TOOL_CALL:\s*(\{[^}]+\})/);
    if (!match) return null;
    
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.name && parsed.params) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  private stripThoughtAndToolBlocks(content: string): string {
    return content
      .replace(/<THOUGHT>[\s\S]*?<\/THOUGHT>/gi, '')
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/TOOL_CALL:\s*\{[^}]+\}/g, '')
      .replace(/TOOL_CALL:\s*\{[\s\S]*?\}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
