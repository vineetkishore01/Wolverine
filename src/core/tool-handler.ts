import { skillRegistry } from "../tools/registry.js";
import { pinchtab } from "../gateway/pinchtab-bridge.js";
import { ChetnaClient } from "../brain/chetna-client.js";
import { readFileSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  output: string;
  data?: any;
}

export class ToolHandler {
  private chetna: ChetnaClient;

  constructor() {
    const settings = JSON.parse(readFileSync("settings.json", "utf-8"));
    this.chetna = new ChetnaClient(settings);
  }

  /**
   * Executes a tool by name with provided parameters
   */
  async execute(name: string, params: any): Promise<ToolResult> {
    console.log(`[ToolHandler] Pre-flight: Looking up past lessons for ${name}...`);
    
    // 1. HINDSIGHT LOOKUP: Retrieve past experiences with this tool
    let pastLessons = "";
    try {
      const lessons = await this.chetna.searchMemories(`tried to use tool ${name} failed mistake lesson`, 3);
      const results = Array.isArray(lessons) ? lessons : (lessons?.memories || []);
      pastLessons = results.map((r: any) => r.content).join("\n");
    } catch (err) {
      console.warn("[ToolHandler] Lesson lookup failed.");
    }

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
      else if (name === "update_body") {
        skillRegistry.scan();
        result = { success: true, output: "Body updated." };
      } else {
        const entryPoint = skill.manifest.entryPoint;
        const fullPath = path.join(skill.path, entryPoint);
        if (entryPoint.endsWith(".py")) result = await this.runScript(`python3 ${fullPath}`, params);
        else result = await this.runScript(`~/.bun/bin/bun run ${fullPath}`, params);
      }

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
      const cwd = path.resolve(process.cwd(), "../WolverineWorkspace");
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
