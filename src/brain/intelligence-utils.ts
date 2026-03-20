import { ProviderFactory } from "../providers/factory.js";
import type { Settings } from "../types/settings.js";

/**
 * IntelligenceUtils provides shared LLM-driven assessments for Wolverine.
 * This centralizes "intelligent" heuristics to avoid hardcoded thresholds.
 */
export class IntelligenceUtils {
  /**
   * Dynamically assesses the importance of a piece of information for long-term memory.
   * @param content - The content to assess.
   * @param settings - System settings for LLM access.
   * @returns A float between 0.0 and 1.0.
   */
  static async assessImportance(content: string, settings: Settings): Promise<number> {
    try {
      const provider = ProviderFactory.create(settings);
      const prompt = `
        CONTENT: "${content}"
        
        TASK: Rate the importance of this information for a long-term AI memory system on a scale of 0.0 to 1.0.
        - 1.0: Extremely critical (User identity, core architectural decisions, major bug fixes).
        - 0.5: Useful context (Project structure, preferred tools, specific API usage).
        - 0.1: Minor detail (Temporary paths, transient errors, conversational filler).
        
        Respond ONLY with the numeric score.
      `;

      const response = await provider.generateCompletion({
        model: settings.llm.ollama.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      });

      const score = parseFloat(response.content.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (err) {
      console.warn("[Intelligence] Importance assessment failed, defaulting to 0.5");
      return 0.5;
    }
  }

  /**
   * Determines if an error/event is meaningful "lesson" or just "noise".
   * @param error - The error message.
   * @param goal - The goal being pursued.
   * @param settings - System settings for LLM access.
   */
  static async isNoise(error: string, goal: string, settings: Settings): Promise<boolean> {
    try {
      const provider = ProviderFactory.create(settings);
      const prompt = `
        ERROR: "${error}"
        GOAL: "${goal}"
        
        TASK: Determine if this error is a "meaningful lesson" (e.g., a bug in logic, tool usage error, or architectural failure) 
        or "system noise" (e.g., standard JS null checks, temporary network blips, or low-level environment noise).
        
        Respond with 'LESSON' if it's meaningful, or 'NOISE' if it should be ignored.
      `;

      const response = await provider.generateCompletion({
        model: settings.llm.ollama.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      });

      return response.content.includes("NOISE");
    } catch (err) {
      return false; // Default to capturing if assessment fails
    }
  }
/**
 * Estimates token count (approx 4 chars per token for English).
 * Used for quick context management without calling an external tokenizer.
 */
static estimateTokens(text: string): number {
  if (!text) return 0;
  // Fast but better than simple char/4:
  // Count words (weighted higher) + characters
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  // Heuristic: 1 token is ~3.8 chars or ~0.75 words. 
  // We take the max to be conservative.
  return Math.max(Math.ceil(chars / 3.8), Math.ceil(words * 1.3));
}

/**
 * Dynamically determines the best viewport and user agent for a given URL or task.
...

   * @param url - The target URL.
   * @param task - The objective of the navigation.
   * @param settings - System settings.
   */
  static async getBrowserProfile(url: string, task: string, settings: Settings) {
    try {
      const provider = ProviderFactory.create(settings);
      const prompt = `
        URL: "${url}"
        TASK: "${task}"
        
        TASK: Recommend the best browser viewport (width/height) and User-Agent for this task.
        If the task implies mobile testing, suggest a mobile viewport.
        If the site is likely to have bot detection, suggest a common browser User-Agent.
        
        Respond ONLY in JSON format:
        {"width": 1280, "height": 720, "userAgent": "..."}
      `;

      const response = await provider.generateCompletion({
        model: settings.llm.ollama.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      });

      const profile = JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] || "{}");
      return {
        width: profile.width || 1280,
        height: profile.height || 720,
        userAgent: profile.userAgent || "Wolverine/1.0 (Agentic Intelligence)"
      };
    } catch (err) {
      return { width: 1280, height: 720, userAgent: "Wolverine/1.0 (Agentic Intelligence)" };
    }
  }
}
