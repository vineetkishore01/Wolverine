import { appendFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { PATHS } from "../types/paths.js";
import type { Settings } from "../types/settings.js";
import { ChetnaClient } from "./chetna-client.js";

export interface Lesson {
  timestamp: string;
  goal: string;
  action: string;
  error?: string;
  output?: string;
  category: "browser" | "logic" | "system" | "api";
}

export class SelfEvolutionEngine {
  private settings: Settings;
  private chetna: ChetnaClient;

  constructor(settings: Settings) {
    this.settings = settings;
    this.chetna = new ChetnaClient(settings);
  }

  async captureLesson(lesson: Lesson) {
    const skipPatterns = [
      "Cannot destructure property",
      "Cannot read properties of undefined",
      "Cannot read property",
      "undefined is not a function",
    ];
    const errorIncludesSkip = (err: string) => skipPatterns.some(p => err.includes(p));

    if (lesson.error && errorIncludesSkip(lesson.error)) {
      return;
    }

    console.log(`[Evolution] Capturing ${lesson.category} lesson: ${lesson.goal}`);

    try {
      const lessonPath = path.join(PATHS.logs, "lessons.jsonl");
      appendFileSync(lessonPath, JSON.stringify(lesson) + "\n");

      if (lesson.error) {
        await this.chetna.call("memory_create", {
          content: `LEARNED: ${lesson.goal} - ${lesson.action}. Error: ${lesson.error}.`,
          importance: 0.5,
          category: "lesson",
          tags: ["lesson", lesson.category]
        });
      }
    } catch (err) {
      console.error("[Evolution] Failed to capture lesson:", err);
    }
  }

  async evolveSkill(name: string, description: string, logic: string) {
    if (!name || !logic || logic.length < 10) {
      throw new Error("[Evolution] Skill evolution failed: Invalid name or logic content.");
    }

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const skillDir = path.join(PATHS.skills, sanitizedName);

    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true });
    }

    const manifest = {
      name: sanitizedName,
      description,
      version: "1.0.0",
      entryPoint: "logic.txt",
      capabilities: ["learned"],
      parameters: { type: "object", properties: {} }
    };

    try {
      // Basic JSON validation before write
      const manifestStr = JSON.stringify(manifest, null, 2);

      writeFileSync(path.join(skillDir, "manifest.json"), manifestStr);
      writeFileSync(path.join(skillDir, "logic.txt"), logic);

      await this.chetna.call("memory_create", {
        content: `LEARNED SKILL: ${name}. ${description}. Logic: ${logic}`,
        importance: 0.9,
        category: "skill_learned",
        tags: ["evolution", "power"]
      });

      console.log(`[Evolution] Skill evolved: ${sanitizedName}`);
      return skillDir;
    } catch (err) {
      console.error("[Evolution] Failed to evolve skill:", err);
      throw err;
    }
  }
}
