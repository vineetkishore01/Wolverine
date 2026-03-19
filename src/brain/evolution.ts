import { appendFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { PATHS } from "../types/paths.js";
import type { Settings } from "../types/settings.js";
import type { ChetnaClient } from "./chetna-client.js";

let chetnaInstance: ChetnaClient | null = null;

function getChetna(): ChetnaClient {
  if (!chetnaInstance) {
    const { ChetnaClient } = require("./chetna-client.js");
    const settings = { brain: { chetnaUrl: "http://127.0.0.1:1987" } };
    chetnaInstance = new ChetnaClient(settings);
  }
  return chetnaInstance;
}

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

  constructor(settings: Settings) {
    this.settings = settings;
  }

  async captureLesson(lesson: Lesson) {
    const skipPatterns = ["Cannot destructure", "undefined", "null", "parameter"];
    if (lesson.error && skipPatterns.some(p => lesson.error?.includes(p))) {
      return;
    }

    console.log(`[Evolution] Capturing ${lesson.category} lesson: ${lesson.goal}`);

    try {
      const lessonPath = path.join(PATHS.logs, "lessons.jsonl");
      appendFileSync(lessonPath, JSON.stringify(lesson) + "\n");

      if (lesson.error) {
        const chetna = getChetna();
        await chetna.call("memory_create", {
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
    console.log(`[Evolution] Evolving new skill: ${name}`);

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
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
      writeFileSync(path.join(skillDir, "manifest.json"), JSON.stringify(manifest, null, 2));
      writeFileSync(path.join(skillDir, "logic.txt"), logic);

      const chetna = getChetna();
      await chetna.call("memory_create", {
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
