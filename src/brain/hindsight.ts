import { ChetnaClient } from "./chetna-client.js";
import { ProviderFactory } from "../providers/factory.js";
import type { Settings } from "../types/settings.js";
import { IntelligenceUtils } from "./intelligence-utils.js";

export class HindsightDistiller {
  private chetna: ChetnaClient;
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
    this.chetna = new ChetnaClient(settings);
  }

  /**
   * Analyzes a user correction to extract a 'Program Memory' (Strategy)
   */
  async distillInstruction(userMessage: string, lastAssistantMessage: string) {
    // Logic: If the user is correcting the AI, distill the underlying rule.
    try {
      const llm = ProviderFactory.create(this.settings);
      
      // Phase 1: Intent Analysis
      const intentPrompt = `
        USER MESSAGE: "${userMessage}"
        ASSISTANT PREVIOUS MESSAGE: "${lastAssistantMessage}"
        
        TASK: Determine if the user is providing a correction, a new rule, or feedback on a mistake.
        Respond with exactly 'CORRECTION' if they are, or 'OTHER' if it is just a general comment, question, or compliment.
      `;

      const intentResponse = await llm.generateCompletion({
        model: this.settings.llm.ollama.model,
        messages: [{ role: "user", content: intentPrompt }],
        temperature: 0
      });

      const isCorrection = intentResponse.content.trim().toUpperCase() === "CORRECTION" || 
                           intentResponse.content.includes("CORRECTION");

      if (!isCorrection) return;

      console.log("[Hindsight] 🧠 User correction detected via LLM analysis. Distilling into Program Memory...");

      const distillationPrompt = `
        USER FEEDBACK: "${userMessage}"
        MY PREVIOUS ACTION: "${lastAssistantMessage}"
        
        TASK: Extract a permanent "Program Rule" from this correction. 
        A Program Rule is a strategy I should follow next time to avoid this mistake.
        Example: "When using tool X, always include parameter Y."
        
        Respond with ONLY the rule text.
      `;

      const response = await llm.generateCompletion({
        model: this.settings.llm.ollama.model,
        messages: [{ role: "user", content: distillationPrompt }],
        temperature: 0.2
      });

      const rule = response.content.trim();
      const content = `PROGRAM_RULE: ${rule}`;
      const importance = await IntelligenceUtils.assessImportance(content, this.settings);

      // Push to Chetna as a high-importance 'rule'
      await this.chetna.call("memory_create", {
        content,
        importance,
        category: "rule",
        tags: ["hindsight", "opd"]
      });

      console.log(`[Hindsight] ✅ New Rule Distilled: ${rule}`);
    } catch (err) {
      console.error("[Hindsight] Distillation failed:", err);
    }
  }
}
