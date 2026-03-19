import { readFileSync, existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { PATHS } from "../types/paths.js";
import { SelfEvolutionEngine } from "./evolution.js";
import { ProviderFactory } from "../providers/factory.js";
import type { Settings } from "../types/settings.js";

export class SkillEvolver {
  private engine: SelfEvolutionEngine;
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
    this.engine = new SelfEvolutionEngine(settings);
  }

  async runEvolutionCycle() {
    const lessonPath = path.join(PATHS.logs, "lessons.jsonl");
    if (!existsSync(lessonPath)) {
      console.log("[Evolution] No lessons file found, skipping evolution.");
      return;
    }

    console.log("[Evolution] Starting autonomous skill synthesis cycle...");

    try {
      const lessons = readFileSync(lessonPath, "utf-8")
        .split("\n")
        .filter(l => l.trim() !== "")
        .map(l => JSON.parse(l));

      const errorCounts: Record<string, number> = {};
      lessons.filter(l => l.error).forEach(l => {
        errorCounts[l.goal] = (errorCounts[l.goal] || 0) + 1;
      });

      let synthesized = 0;
      for (const [goal, count] of Object.entries(errorCounts)) {
        if (count >= 2) {
          await this.synthesizeNewSkill(goal, lessons.filter(l => l.goal === goal));
          synthesized++;
        }
      }
      
      console.log(`[Evolution] Evolution cycle complete. Synthesized ${synthesized} new skills.`);
    } catch (err) {
      console.error("[Evolution] Evolution cycle failed:", err);
    }
  }

  private async synthesizeNewSkill(goal: string, relevantLessons: any[]) {
    console.log(`[Evolution] Synthesizing new skill for recurring goal: ${goal}`);

    try {
      const llm = ProviderFactory.create(this.settings);
      const prompt = `Analyze these failed attempts to ${goal}:\n${JSON.stringify(relevantLessons)}\n\n` +
                     `Create a robust "Skill" to solve this. Provide a name, description, and the step-by-step logic.`;

      const response = await llm.generateCompletion({
        model: this.settings.llm.ollama.model,
        messages: [{ role: "user", content: prompt }]
      });

      await this.engine.evolveSkill(
        `Learned-${randomUUID().substring(0, 4)}`,
        `Auto-generated skill to solve: ${goal}`,
        response.content
      );
    } catch (err) {
      console.error(`[Evolution] Failed to synthesize skill for "${goal}":`, err);
    }
  }
}
