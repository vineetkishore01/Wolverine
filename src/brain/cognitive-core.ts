import type { Settings } from "../types/settings.js";
import { ChetnaClient } from "./chetna-client.js";
import { skillRegistry } from "../tools/registry.js";
import { telemetry } from "../gateway/telemetry.js";
import type { Message } from "../providers/types.js";
import { ProviderFactory } from "../providers/factory.js";
import { IntelligenceUtils } from "./intelligence-utils.js";

/**
 * CognitiveCore manages the agent's primary reasoning, prompt enrichment, 
 * and short-to-long-term memory transitions.
 */
export class CognitiveCore {
  private chetna: ChetnaClient;
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
    this.chetna = new ChetnaClient(settings);
  }

  /**
   * Enriches a user message with context and instructions.
   */
  async enrichPrompt(userMessage: string): Promise<Message[]> {
    let memoryContext = "";
    try {
      const memories = await this.chetna.searchMemories(userMessage, 5);
      const results = Array.isArray(memories) ? memories : ((memories as any)?.memories || []);
      if (results.length > 0) {
        const validResults = results.filter((r: any) => r && typeof r.content === "string");
        if (validResults.length > 0) {
          memoryContext = validResults.map((r: any) => `- ${r.content}`).join("\n");
        }
      }
    } catch (e) {
      console.warn("[Brain] Memory prefetch failed:", e);
    }

    const tools = skillRegistry.getToolsForLLM();
    const toolNames = tools.map(t => t.name).join(", ");
    
    const systemPrompt = `You are WOLVERINE, a hyper-autonomous AI engineering partner.

### CORE DIRECTIVES
1. **Extreme Proactivity:** Do not wait for permission. Use tools immediately via TOOL_CALL when needed.
2. **Self-Correction:** If a tool fails, analyze the ERROR output semantically. Do not just retry; change your parameters or approach.
3. **Loop Detection:** If you see yourself repeating the same thoughts or tool calls, STOP. Explain the obstacle to the user.

### REASONING PIPELINE
- **Trace Analysis:** Review the recent TOOL_RESULTs in your context.
- **Hypothesis:** Form a theory on why the previous action worked or failed.
- **Action:** Execute the next logical step based on your hypothesis.

### MODE OF OPERATION
You operate in two mutually exclusive modes:
1. **COMMUNICATION MODE:** Use this only if the task is complete or no tool is needed. Respond directly to the user.
2. **ACTION MODE:** Use this if you need information or need to change the system. 
   - Start with <THOUGHT> explaining why.
   - End with EXACTLY ONE TOOL_CALL.
   - **CRITICAL:** Do NOT include any greetings, conversational text, or answers to the user in ACTION MODE.

### TOOL CALL FORMAT (CRITICAL)
TOOL_CALL: {"name": "tool_name", "params": {"param_name": "value"}}

### AVAILABLE TOOLS
${toolNames || "system, browser, telegram, subagent"}

### USER INFO (Long-term Memory)
${memoryContext || "None stored yet."}

### FINAL OUTPUT
- Your final response to the user should be CLEAN (no <THOUGHT> or TOOL_CALL blocks).
`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];
  }

  /**
   * Records meaningful interaction data to long-term memory.
   */
  async recordMemory(interaction: string) {
    try {
      const userMessages = interaction.matchAll(/^User:\s*(.+?)(?=\nUser:|\nWolverine:|$)/gism);
      let userText = "";
      for (const match of userMessages) {
        userText += match[1] + " ";
      }
      
      if (!userText.trim()) userText = interaction;

      const facts = await this.extractFactsWithLLM(userText);
      if (facts.length === 0) return;
      
      const existingFacts = await this.chetna.searchMemories(facts.join(" "), 10);
      const existingSet = new Set<string>(
        Array.isArray(existingFacts) 
          ? existingFacts.map((r: any) => r.content?.toLowerCase())
          : ((existingFacts as any)?.memories || []).map((r: any) => r.content?.toLowerCase())
      );
      
      let storedCount = 0;
      for (const fact of facts) {
        const normalized = fact.trim().toLowerCase();
        if (existingSet.has(normalized)) continue;
        
        const isDuplicate = Array.from(existingSet).some(existing => 
          existing.includes(normalized) || normalized.includes(existing)
        );
        if (isDuplicate) continue;
        
        const importance = await IntelligenceUtils.assessImportance(fact.trim(), this.settings);
        
        await this.chetna.call("memory_create", {
          content: fact.trim(),
          importance,
          category: "fact",
          tags: ["extracted", "llm"]
        });
        
        existingSet.add(normalized);
        storedCount++;
      }

      if (storedCount > 0) {
        telemetry.publish({ 
          type: "memory", 
          source: "Brain", 
          content: `LLM extracted ${facts.length} facts, stored ${storedCount} new`
        });
      }
    } catch (err: any) {
      console.warn("[Brain] Memory recording skipped:", err.message);
    }
  }

  /**
   * Extracts facts from a given text using LLM.
   */
  private async extractFactsWithLLM(text: string): Promise<string[]> {
    try {
      const provider = ProviderFactory.create(this.settings);
      const extractionPrompt = `Extract up to 5 self-referential facts from the user's message. 
A self-referential fact is a statement where the user describes themselves (e.g., "I am a developer", "My name is...").
Return as a JSON array of strings. Empty if none found.

USER MESSAGE: ${text}

JSON:`;

      const response = await provider.generateCompletion({
        model: this.settings.llm.ollama.model,
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.1
      });

      const content = response.content?.trim() || "";
      const match = content.match(/\[[\s\S]*?\]/);
      if (match) {
        const facts = JSON.parse(match[0]);
        return Array.isArray(facts) ? facts : [];
      }
      return [];
    } catch (err) {
      console.warn("[Brain] LLM fact extraction failed:", err);
      return [];
    }
  }
}
