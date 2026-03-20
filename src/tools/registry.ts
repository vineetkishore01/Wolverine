import { readdirSync, existsSync, readFileSync } from "fs";
import path from "path";
import { PATHS } from "../types/paths.js";
import { z } from "zod";

/**
 * Zod schema for validating skill manifests.
 * Ensures all skills provide necessary metadata for the LLM to understand them.
 */
export const SkillManifestSchema = z.object({
  /** Unique name of the skill/tool */
  name: z.string(),
  /** Detailed description for the LLM's system prompt */
  description: z.string(),
  /** Semantic version of the skill */
  version: z.string(),
  /** Path to the main execution file (or "builtin") */
  entryPoint: z.string(),
  /** Functional categories this skill belongs to */
  capabilities: z.array(z.string()).default([]),
  /** JSON schema defining the parameters this tool accepts */
  parameters: z.any().optional(),
});

/**
 * Type derived from the SkillManifestSchema.
 */
export type SkillManifest = z.infer<typeof SkillManifestSchema>;

/**
 * SkillRegistry manages the discovery, loading, and listing of tools available to Wolverine.
 * It handles both hardcoded "core" skills and dynamically loaded "plugin" skills from the workspace.
 */
export class SkillRegistry {
  private skills: Map<string, { manifest: SkillManifest; path: string }> = new Map();

  /**
   * Initializes the registry by loading core skills and scanning for plugins.
   */
  constructor() {
    this.addCoreSkills();
    this.scan();
  }

  /**
   * Registers built-in core skills that are essential for Wolverine's operation.
   * @private
   */
  private addCoreSkills() {
    const core: SkillManifest[] = [
      {
        name: "browser",
        description: "Headless Chromium browser. Use for navigation, scraping, and visual research.",
        version: "1.0.0",
        entryPoint: "builtin",
        parameters: { action: "navigate|click|snapshot", url: "string", elementId: "number" }
      },
      {
        name: "system",
        description: "Bash shell access. Use for file manipulation, running code, and installs.",
        version: "1.0.0",
        entryPoint: "builtin",
        parameters: { command: "string" }
      },
      {
        name: "telegram",
        description: "Outbound messaging. Use for sending voice memos or files to the user.",
        version: "1.0.0",
        entryPoint: "builtin",
        parameters: { action: "send_audio|send_message", text: "string", filePath: "string" }
      },
      {
        name: "memory",
        description: "Memory Recall. Use to search your long-term memory layer (Chetna) for older facts, rules, or habits.",
        version: "1.0.0",
        entryPoint: "builtin",
        parameters: { query: "string", limit: "number" }
      },
      {
        name: "subagent",
        description: "Delegation. Spawn a child agent to handle a sub-task. Use 'run' for independent tasks.",
        version: "1.0.0",
        entryPoint: "builtin",
        parameters: { task: "string", mode: "run|session" }
      }
    ];

    for (const m of core) {
      this.skills.set(m.name, { manifest: m, path: "builtin" });
    }
  }

  /**
   * Scans the WolverineWorkspace/skills folder for skill plugins.
   * Each folder must contain a valid manifest.json file.
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

  /**
   * Transforms the registry into a format suitable for inclusion in an LLM system prompt.
   * @returns An array of tool definitions (name, description, parameters).
   */
  getToolsForLLM() {
    return Array.from(this.skills.values()).map(s => ({
      name: s.manifest.name,
      description: s.manifest.description,
      parameters: s.manifest.parameters,
    }));
  }

  /**
   * Retrieves a specific skill by its name.
   * @param name - The name of the skill to find.
   * @returns The skill manifest and its absolute path on disk.
   */
  getSkill(name: string) {
    return this.skills.get(name);
  }

  /**
   * Clears the current registry and re-scans the disk for skills.
   * Useful for hot-reloading newly created or modified tools.
   */
  reload() {
    this.skills.clear();
    this.addCoreSkills();
    this.scan();
    console.log("[Skills] Registry reloaded.");
  }
}

export const skillRegistry = new SkillRegistry();
