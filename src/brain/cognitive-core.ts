import type { Settings } from "../types/settings.js";
import { ChetnaClient } from "./chetna-client.js";
import { skillRegistry } from "../tools/registry.js";
import { contextEngineer } from "./context-engineer.js";
import { telemetry } from "../gateway/telemetry.js";
import type { Message } from "../providers/types.js";
import { ProviderFactory } from "../providers/factory.js";

export class CognitiveCore {
  private chetna: ChetnaClient;
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
    this.chetna = new ChetnaClient(settings);
  }

  /**
   * Process an incoming message and enrich it with Identity, Memory, and Tools
   */
  async enrichPrompt(userMessage: string): Promise<Message[]> {
    console.log(`[Brain] Assembling Sparse Context...`);

    try {
      // 1. Ingest into short-term memory
      await contextEngineer.ingest({ role: "user", content: userMessage });

      // 2. Assemble ONLY the last 5 turns + high-level summary
      const history = await contextEngineer.assembleActiveContext();
      
      // 3. Build Tool Documentation (Names only to save tokens)
      const tools = skillRegistry.getToolsForLLM();
      const toolNames = tools.map(t => t.name).join(", ");
      
      // 4. Silent Pre-fetch (Intuition)
      let passiveContext = "";
      try {
        const memories = await this.chetna.searchMemories(userMessage, 3);
        const results = Array.isArray(memories) ? memories : (memories?.memories || []);
        if (results.length > 0) {
          passiveContext = results.map((r: any) => `- ${r.content}`).join("\n");
        }
      } catch (e) {
        console.warn("[Brain] Pre-fetch failed", e);
      }

      // 5. Construct Guardrailed System Prompt
      let systemPrompt = `You are WOLVERINE, a hyper-autonomous AI engineering partner.

### CORE DIRECTIVES
1. **Extreme Proactivity:** Do not wait for permission. Use tools immediately via TOOL_CALL when needed.
2. **Lean Context:** You only have the immediate conversation. Use the 'memory' tool to fetch deep context from Chetna only when needed.

### RESPONSE FORMAT
- If NO tool is needed: Respond directly with a helpful answer.
- If tool is needed: Output <THOUGHT> briefly explaining, then ONE TOOL_CALL.

### TOOL CALL FORMAT
TOOL_CALL: {"name": "tool_name", "params": {"param_name": "value"}}

### AVAILABLE TOOLS
${toolNames || "system, memory, browser, telegram, subagent"}

### MEMORY TOOL USAGE
Use memory tool to search past conversations: {"name": "memory", "params": {"query": "what to search"}}

### RESILIENCE
- If a tool fails, try a DIFFERENT approach.
- If stuck in a loop, ask the user for clarification.
- Do NOT use "..." in tool parameters - use actual values.

### USER INFO (from memory)
${passiveContext || "None stored yet."}

### IMPORTANT
- Your final response to the user should be CLEAN (no <THOUGHT> or TOOL_CALL blocks).
- Only include thinking blocks when actually calling tools.
`;

      // Telemetry: Show the lean context
      telemetry.publish({ 
        type: "context", 
        source: "Brain", 
        content: `Sparse Context Assembled (${history.length} messages + Instructions)`
      });

      return [
        { role: "system", content: systemPrompt },
        ...history
      ];
    } catch (err) {
      console.warn("[Brain] Sparse enrichment failed.", err);
      return [
        { role: "system", content: "You are Wolverine." },
        { role: "user", content: userMessage }
      ];
    }
  }

  /**
   * Record memory - fast extraction without LLM call
   */
  async recordMemory(interaction: string) {
    try {
      await contextEngineer.ingest({ role: "assistant", content: interaction });
      
      const facts = this.extractFacts(interaction);
      
      for (const fact of facts) {
        await this.chetna.call("memory_create", {
          content: fact,
          importance: 0.6,
          category: "fact",
          tags: ["extracted", "interaction"]
        });
      }

      if (facts.length > 0) {
        telemetry.publish({ 
          type: "memory", 
          source: "Brain", 
          content: `Extracted ${facts.length} facts: ${facts.join("; ")}`
        });
      }
    } catch (err) {
      console.warn("[Brain] Memory recording skipped:", err.message);
    }
  }

  private extractFacts(text: string): string[] {
    const facts: string[] = [];
    
    const patterns = [
      /(?:my name is|I am|I'm|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /I live(?: in)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /I work(?: at)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /I prefer\s+(\w+)\s+over\s+(\w+)/gi,
      /favorite\s+(?:color|food|music|movie|book)\s+is\s+([^\s.,]+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          facts.push(match[0].replace(/\s+/g, ' ').trim());
        }
      }
    }

    return [...new Set(facts)].slice(0, 5);
  }
}
