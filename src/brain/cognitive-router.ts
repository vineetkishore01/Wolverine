import { ProviderFactory } from "../providers/factory.js";
import type { Settings } from "../types/settings.js";
import { telemetry } from "../gateway/telemetry.js";
import fs from "fs";
import path from "path";
import { PATHS } from "../types/paths.js";

export interface RoutingDecision {
  intent: 'RESEARCH' | 'CODE' | 'TEST' | 'TRIVIAL' | 'DANGEROUS' | 'SYSTEM';
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  strategy: 'IMMEDIATE' | 'LOOP' | 'DELEGATE' | 'REJECT';
  suggestedFiles: string[];
  reasoning: string;
}

/**
 * The CognitiveRouter is a sophisticated pre-processor that determines 
 * the optimal execution path for any given task. It prevents hallucinated 
 * destructive commands, optimizes token usage by choosing the right "brain" 
 * for the job, and performs "Hindsight-style" codebase pre-analysis.
 */
export class CognitiveRouter {
  private settings: Settings;
  private llmProvider: any;

  constructor(settings: Settings) {
    this.settings = settings;
    this.llmProvider = ProviderFactory.create(this.settings);
  }

  /**
   * Routes the incoming task to the most appropriate execution strategy.
   * Performs semantic analysis and risk assessment.
   */
  async route(userMessage: string, contextSnippet: string): Promise<RoutingDecision> {
    telemetry.publish({ 
      type: "thought", 
      source: "CognitiveRouter", 
      content: "Analyzing intent and risk vectors..." 
    });

    // Codebase root is where the source code actually resides
    const projectRoot = process.cwd();
    const fileOverview = this.getQuickFileOverview(projectRoot);

    const routerPrompt = `
      You are the Wolverine Cognitive Router. Analyze the following user task and codebase context.
      
      USER_TASK: "${userMessage}"
      
      CODEBASE_OVERVIEW:
      ${fileOverview}
      
      ADDITIONAL_CONTEXT:
      ${contextSnippet}
      
      TASK:
      1. Determine the intent: RESEARCH (gathering info), CODE (modifying files), TEST (running tests), TRIVIAL (simple chat/greeting), DANGEROUS (risky system commands), SYSTEM (gateway/config changes).
      2. Assess the risk level: LOW (no side effects), MEDIUM (read-only or local file changes), HIGH (large scale refactor or complex shell commands), CRITICAL (destructive actions like 'rm -rf /', modifying git history, etc.).
      3. Choose a strategy: 
         - IMMEDIATE (Return result directly, no tool loop needed)
         - LOOP (Enter the Think-Tool-Act cycle)
         - DELEGATE (Spawn a specialized sub-agent for long-running or complex tasks)
         - REJECT (If the task is malicious or violates safety guidelines)
      4. Suggest 2-3 files that are most likely relevant to this task for pre-loading.
      
      RESPOND IN STRICT JSON FORMAT:
      {
        "intent": "...",
        "risk": "...",
        "strategy": "...",
        "suggestedFiles": ["file1", "file2"],
        "reasoning": "..."
      }
    `;

    try {
      const response = await this.llmProvider.generateCompletion({
        model: this.settings.llm.ollama.model,
        messages: [{ role: "system", content: "You are a highly analytical engineering sub-agent." }, { role: "user", content: routerPrompt }]
      });

      const decision: RoutingDecision = JSON.parse(this.cleanJsonResponse(response.content));
      
      telemetry.publish({ 
        type: "thought", 
        source: "CognitiveRouter", 
        content: `Decision: [${decision.intent}] Risk: [${decision.risk}] Strategy: [${decision.strategy}] Reasoning: ${decision.reasoning}` 
      });

      return decision;
    } catch (err) {
      console.error("[CognitiveRouter] Routing failed, falling back to default LOOP strategy:", err);
      return {
        intent: 'RESEARCH',
        risk: 'MEDIUM',
        strategy: 'LOOP',
        suggestedFiles: [],
        reasoning: "Fallback strategy due to router failure."
      };
    }
  }

  /**
   * Generates a lightweight summary of the project structure.
   */
  private getQuickFileOverview(dir: string): string {
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      const importantFiles = files
        .filter(f => !f.name.startsWith('.') && f.name !== 'node_modules')
        .map(f => f.isDirectory() ? `${f.name}/` : f.name)
        .slice(0, 20); // Keep it lean
      
      return `Root structure: ${importantFiles.join(', ')}`;
    } catch {
      return "Unable to list directory.";
    }
  }

  /**
   * Cleans LLM response to ensure it's valid JSON.
   */
  private cleanJsonResponse(content: string): string {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? match[0] : content;
  }
}
