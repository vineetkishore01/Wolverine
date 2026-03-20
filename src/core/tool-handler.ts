import { skillRegistry } from "../tools/registry.js";
import { pinchtab } from "../gateway/pinchtab-bridge.js";
import { ChetnaClient } from "../brain/chetna-client.js";
import { readFileSync, existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { PATHS } from "../types/paths.js";

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  output: string;
  data?: any;
}

export class ToolHandler {
  private chetna: ChetnaClient | null = null;
  private settings: any = null;
  private callHistory: { hash: string; tool: string }[] = [];
  private readonly MAX_HISTORY = 10;

  private getChetna(): ChetnaClient {
    if (!this.chetna) {
      try {
        const settingsPath = PATHS.settings;
        const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
        this.chetna = new ChetnaClient(settings);
      } catch {
        console.warn("[ToolHandler] Using default Chetna settings");
        this.chetna = new ChetnaClient({ brain: { chetnaUrl: "http://127.0.0.1:1987" } } as any);
      }
    }
    return this.chetna;
  }

  /**
   * Updates the tool handler with the latest settings.
   */
  setSettings(settings: any) {
    this.settings = settings;
    this.chetna = new ChetnaClient(settings);
  }

  /**
   * Executes a tool by name with provided parameters
   */
  async execute(name: string, params: any): Promise<ToolResult> {
    // ... rest of execute method ...
    // 1. LOOP DETECTION (Circuit Breaker)
    const currentHash = createHash("sha256")
      .update(`${name}:${JSON.stringify(params)}`)
      .digest("hex");

    const repetitions = this.callHistory.filter(h => h.hash === currentHash).length;
    
    // Check for "Ping-Pong" (A -> B -> A pattern)
    let isPingPong = false;
    if (this.callHistory.length >= 2) {
      const lastCall = this.callHistory[this.callHistory.length - 1];
      const secondLastCall = this.callHistory[this.callHistory.length - 2];
      isPingPong = secondLastCall.hash === currentHash && lastCall.tool !== name;
    }

    this.callHistory.push({ hash: currentHash, tool: name });
    if (this.callHistory.length > this.MAX_HISTORY) this.callHistory.shift();

    if (repetitions >= 2 || isPingPong) {
      const warning = `[CRITICAL_REASONING_WARNING] You are stuck in a loop using tool '${name}' with these exact parameters. 
STOP. Do not retry this. Analyze the failure, check your intuition, and try a DIFFERENT approach or tool.`;
      
      console.warn(`[ToolHandler] Loop detected for ${name}. Injecting warning.`);
      return { success: false, output: warning };
    }

    console.log(`[ToolHandler] Pre-flight: Looking up past lessons for ${name}...`);
    
    // 2. HINDSIGHT LOOKUP: Retrieve past experiences with this tool IN PARALLEL
    const pastLessonsPromise = this.getChetna().searchMemories(`tried to use tool ${name} failed mistake lesson`, 3)
      .then(lessons => {
        const results = Array.isArray(lessons) ? lessons : ((lessons as any)?.memories || []);
        return results.map((r: any) => r.content).join("\n");
      })
      .catch(err => {
        console.warn("[ToolHandler] Lesson lookup failed.");
        return "";
      });

    const skill = skillRegistry.getSkill(name);
    if (!skill) {
      return { success: false, output: `Tool '${name}' not found.` };
    }

    if (!params) {
      return { success: false, output: `Error: No parameters provided for tool '${name}'.` };
    }

    // 2. Add past lessons to the execution context if found
    // This feeds BACK into the LLM if it fails and retries
    console.log(`[ToolHandler] Executing ${name}...`);

    try {
      let result: ToolResult;
      if (name === "browser") result = await this.executeBrowser(params);
      else if (name === "system") result = await this.executeSystem(params);
      else if (name === "telegram") result = { success: true, output: "Sent to Telegram.", data: { type: "telegram_action", ...params } };
      else if (name === "memory") {
        const { query, limit = 5 } = params;
        const memories = await this.getChetna().searchMemories(query, limit);
        const results = Array.isArray(memories) ? memories : ((memories as any)?.memories || []);
        const contextText = results.map((r: any) => `[Fact] ${r.content}`).join("\n") || "No memories found.";
        result = { success: true, output: `SOUL RECALL:\n${contextText}` };
      }
      else if (name === "subagent") {
        const { task } = params;
        const childId = `sub-${crypto.randomUUID().split("-")[0]}`;
        result = { 
          success: true, 
          output: `SUBAGENT_SPAWNED: ${childId}. The task has been delegated. Do not wait for it. Continue other work. You will be notified via a message when it completes.`,
          data: { type: "subagent_spawn", childId, task }
        };
      }
      else if (name === "update_body") {
        skillRegistry.reload();
        result = { success: true, output: "Body updated." };
      } else {
        const entryPoint = skill.manifest.entryPoint;
        const fullPath = path.join(skill.path, entryPoint);
        if (entryPoint.endsWith(".py")) result = await this.runScript(`python3 "${fullPath}"`, params);
        else {
          // Robust Bun path discovery
          let bunPath = "bun"; // Default to path-based discovery
          if (process.env.BUN_INSTALL) {
            bunPath = path.join(process.env.BUN_INSTALL, "bin", "bun");
          } else if (process.env.HOME) {
            const homeBun = path.join(process.env.HOME, ".bun", "bin", "bun");
            if (existsSync(homeBun)) bunPath = homeBun;
          }
          result = await this.runScript(`"${bunPath}" run "${fullPath}"`, params);
        }
      }

      const pastLessons = await pastLessonsPromise;

      // If there were past lessons, prepend them to the output so the LLM reflects
      if (pastLessons && !result.success) {
        result.output = `PAST LESSONS FOR THIS TOOL:\n${pastLessons}\n\nCURRENT ERROR:\n${result.output}`;
      }

      return result;
    } catch (err: any) {
      return { success: false, output: `Error: ${err.message}` };
    }
  }

  /**
   * Runs a shell command and passes params as a JSON string
   */
  private async runScript(command: string, params: any): Promise<ToolResult> {
    try {
      // Pass parameters via environment variable to keep command line clean
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, TOOL_PARAMS: JSON.stringify(params) },
        timeout: 30000
      });
      return { success: true, output: stdout || stderr || "Success (no output)" };
    } catch (err: any) {
      return { success: false, output: `Runtime Error: ${err.message}\n${err.stderr || ""}` };
    }
  }

  private async executeSystem(params: any): Promise<ToolResult> {
    const { command } = params;
    if (!command) return { success: false, output: "System tool requires a 'command' parameter." };
    try {
      // Use the standardized workspace root
      const cwd = PATHS.root;
      const { stdout, stderr } = await execAsync(command, { cwd, timeout: 60000 });
      let output = stdout + (stderr ? `\nSTDERR: ${stderr}` : "");
      return { success: true, output: output.substring(0, 4000) };
    } catch (err: any) {
      return { success: false, output: `Command failed: ${err.message}` };
    }
  }

  private async executeBrowser(params: any): Promise<ToolResult> {
    const { action, url, elementId } = params;
    if (!action) return { success: false, output: "Browser tool requires an 'action' (navigate|click|snapshot)." };
    try {
      let output = "";
      if (action === "navigate") {
        if (!url) return { success: false, output: "Navigation requires a 'url'." };
        output = await pinchtab.navigate(url);
      }
      else if (action === "click") {
        if (elementId === undefined) return { success: false, output: "Click action requires an 'elementId'." };
        output = await pinchtab.click(elementId);
      }
      else if (action === "snapshot") output = await pinchtab.getSnapshot();
      return { success: true, output };
    } catch (err: any) {
      return { success: false, output: `Browser Error: ${err.message}` };
    }
  }
}

export const toolHandler = new ToolHandler();
