import { readdirSync, existsSync, readFileSync } from "fs";
import path from "path";
import { PATHS } from "../types/paths.js";
import { z } from "zod";

export const SkillManifestSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  entryPoint: z.string(), // Relative to skill folder
  capabilities: z.array(z.string()).default([]),
  parameters: z.any().optional(), // JSON schema for tool calls
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

export class SkillRegistry {
  private skills: Map<string, { manifest: SkillManifest; path: string }> = new Map();

  constructor() {
    this.scan();
  }

  /**
   * Scans the WolverineWorkspace/skills folder for skill plugins
   */
  scan() {
    if (!existsSync(PATHS.skills)) return;

    const items = readdirSync(PATHS.skills, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const skillPath = path.join(PATHS.skills, item.name);
        const manifestPath = path.join(skillPath, "manifest.json");

        if (existsSync(manifestPath)) {
          try {
            const content = readFileSync(manifestPath, "utf-8");
            const manifest = SkillManifestSchema.parse(JSON.parse(content));
            this.skills.set(manifest.name, { manifest, path: skillPath });
            console.log(`[Skills] Loaded skill: ${manifest.name} v${manifest.version}`);
          } catch (err) {
            console.error(`[Skills] Failed to load skill in ${item.name}:`, err);
          }
        }
      }
    }
  }

  getToolsForLLM() {
    return Array.from(this.skills.values()).map(s => ({
      name: s.manifest.name,
      description: s.manifest.description,
      parameters: s.manifest.parameters,
    }));
  }

  getSkill(name: string) {
    return this.skills.get(name);
  }

  reload() {
    this.skills.clear();
    this.scan();
    console.log("[Skills] Registry reloaded.");
  }
}

export const skillRegistry = new SkillRegistry();
