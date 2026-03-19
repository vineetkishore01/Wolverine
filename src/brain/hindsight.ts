import { ChetnaClient } from "./chetna-client.js";
import { ProviderFactory } from "../providers/factory.js";
import type { Settings } from "../types/settings.js";

export class HindsightDistiller {
  private chetna: ChetnaClient;
  private settings: any;

  constructor(settings: Settings) {
    this.settings = settings;
    this.chetna = new ChetnaClient(settings);
  }

  /**
   * Analyzes a user correction to extract a 'Program Memory' (Strategy)
   */
  async distillInstruction(userMessage: string, lastAssistantMessage: string) {
    // Logic: If the user is correcting the AI, distill the underlying rule.
    const feedbackTriggers = ["no,", "actually", "use", "don't", "should", "wrong"];
    const isCorrection = feedbackTriggers.some(t => userMessage.toLowerCase().startsWith(t));

    if (!isCorrection) return;

    console.log("[Hindsight] 🧠 User correction detected. Distilling into Program Memory...");

    try {
      const llm = ProviderFactory.create(this.settings);
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
        messages: [{ role: "user", content: distillationPrompt }]
      });

      const rule = response.content.trim();

      // Push to Chetna as a high-importance 'rule'
      await this.chetna.call("memory_create", {
        content: `PROGRAM_RULE: ${rule}`,
        importance: 0.8,
        category: "rule",
        tags: ["hindsight", "opd"]
      });

      console.log(`[Hindsight] ✅ New Rule Distilled: ${rule}`);
    } catch (err) {
      console.error("[Hindsight] Distillation failed:", err);
    }
  }
}
