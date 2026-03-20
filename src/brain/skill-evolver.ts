import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { PATHS } from "../types/paths.js";
import { SelfEvolutionEngine } from "./evolution.js";
import { ProviderFactory } from "../providers/factory.js";
import type { Settings } from "../types/settings.js";

/**
 * SkillEvolver analyzes past lessons and errors to autonomously synthesize new tools.
 */
export class SkillEvolver {
  private engine: SelfEvolutionEngine;
  private settings: Settings;
  private static isRunning = false;

  constructor(settings: Settings) {
    this.settings = settings;
    this.engine = new SelfEvolutionEngine(settings);
  }

  /**
   * Executes one full cycle of skill synthesis.
   * Only one cycle can run at a time globally.
   */
  async runEvolutionCycle() {
    if (SkillEvolver.isRunning) {
      console.log("[Evolution] Evolution already in progress, skipping request.");
      return;
    }

    const lessonPath = path.join(PATHS.logs, "lessons.jsonl");
    if (!existsSync(lessonPath)) {
      return;
    }

    SkillEvolver.isRunning = true;
    console.log("[Evolution] Starting autonomous skill synthesis cycle...");

    try {
      const content = readFileSync(lessonPath, "utf-8");
      if (!content.trim()) {
        SkillEvolver.isRunning = false;
        return;
      }

      const lessons = content
        .split("\n")
        .filter(l => l.trim() !== "")
        .map(l => JSON.parse(l));

      const normalizeError = (err: string) => {
        return err
          .substring(0, 100)
          .replace(/\d+/g, "#")
          .replace(/\/.*?\//g, "/.../")
          .trim();
      };

      const errorCounts: Record<string, number> = {};
      lessons.filter(l => l.error).forEach(l => {
        const errorKey = `${l.goal}::${normalizeError(l.error || "")}`;
        errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
      });

      let synthesized = 0;
      for (const [errorKey, count] of Object.entries(errorCounts)) {
        // Only evolve if we've seen the same error 3 times (increase threshold)
        if (count >= 3) {
          const [goal, errorPattern] = errorKey.split("::");
          const relevantLessons = lessons.filter(l => 
            l.goal === goal && 
            normalizeError(l.error || "") === errorPattern
          );
          
          console.log(`[Evolution] Signal detected: ${count} failures for "${goal}". Synthesizing solution...`);
          const success = await this.synthesizeNewSkill(goal, relevantLessons);
          if (success) synthesized++;
        }
      }
      
      // CRITICAL: Clear processed lessons so we don't repeat work
      // In a real world we might archive them, but for lean MVP we clear.
      writeFileSync(lessonPath, "");
      
      console.log(`[Evolution] Evolution cycle complete. Synthesized ${synthesized} new skills.`);
    } catch (err) {
      console.error("[Evolution] Evolution cycle failed:", err);
    } finally {
      SkillEvolver.isRunning = false;
    }
  }

  private async synthesizeNewSkill(goal: string, relevantLessons: any[]): Promise<boolean> {
    try {
      const llm = ProviderFactory.create(this.settings);
      const prompt = `You are the Wolverine Evolution Engine. 
Analyze these failed attempts to achieve the goal: "${goal}".

FAILED ATTEMPTS:
${JSON.stringify(relevantLessons.map(l => ({ action: l.action, error: l.error })), null, 2)}

TASK:
Create a robust TypeScript or Python "Skill" to solve this. 
Provide a descriptive name, clear description, and the logical implementation.

RESPOND ONLY IN JSON FORMAT:
{
  "name": "descriptive-skill-name",
  "description": "...",
  "logic": "..."
}
`;

      const response = await llm.generateCompletion({
        model: this.settings.llm.ollama.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      });

      const cleanJson = response.content.match(/\{[\s\S]*\}/)?.[0];
      if (!cleanJson) return false;

      const data = JSON.parse(cleanJson);
      
      await this.engine.evolveSkill(
        data.name || `Learned-${randomUUID().substring(0, 4)}`,
        data.description || `Auto-generated skill to solve: ${goal}`,
        data.logic
      );
      return true;
    } catch (err) {
      console.error(`[Evolution] Failed to synthesize skill for "${goal}":`, err);
      return false;
    }
  }
}
