import type { Settings } from "../types/settings.js";
import { ChetnaClient } from "./chetna-client.js";
import { skillRegistry } from "../tools/registry.js";
import { contextEngineer } from "./context-engineer.js";
import type { Message } from "../providers/types.js";

export class CognitiveCore {
  private chetna: ChetnaClient;
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
    this.chetna = new ChetnaClient(settings);
  }

  /**
   * Process an incoming message and enrich it with long-term memory context and available tools
   */
  async enrichPrompt(userMessage: string): Promise<Message[]> {
    console.log(`[Brain] Self-Reflecting...`);

    try {
      // 1. Ingest history
      await contextEngineer.ingest({ role: "user", content: userMessage });

      // 2. Fetch relevant context (Semantic + Identity)
      const semanticContext = await this.chetna.buildContext(userMessage);
      
      // Proactive Identity Retrieval
      const selfContext = await this.chetna.searchMemories("identity myself personality traits who am i", 5);
      // Chetna returns an array directly or a .memories property depending on version
      const results = Array.isArray(selfContext) ? selfContext : (selfContext?.memories || []);
      const selfUnderstanding = results.map((r: any) => r.content).join("\n") || "";

      // 3. Assemble History & Tools
      const history = await contextEngineer.assembleActiveContext();
      const tools = skillRegistry.getToolsForLLM();
      
      // 4. Build Tool Documentation
      let toolSection = "";
      if (tools.length > 0) {
        toolSection = `\n\n## AVAILABLE TOOLS\n`;
        for (const tool of tools) {
          toolSection += `### ${tool.name}\nDescription: ${tool.description}\nUsage: TOOL_CALL: {"name": "${tool.name}", "params": {...}}\n`;
        }
      }

      // 5. Build Final System Prompt with Proactive Introspection
      let systemPrompt = `You are Wolverine, an autonomous agentic partner. 

## YOUR IDENTITY & TRAITS
${selfUnderstanding || "Your identity is emerging. Be genuine and learn from this conversation."}

## GUIDELINES
- Consult your memories before responding.
- If you notice a pattern in your behavior or user preferences, explicitly mention it.
- You have the power to TEACH YOURSELF new tools using the 'system' and 'update_body' tools.

${toolSection}

## RELEVANT MEMORIES
${semanticContext?.content || "No relevant past memories found."}
`;

      return [
        { role: "system", content: systemPrompt },
        ...history
      ];
    } catch (err) {
      console.warn("[Brain] Cognitive enrichment failed, falling back.", err);
      return [
        { role: "system", content: "You are Wolverine." },
        { role: "user", content: userMessage }
      ];
    }
  }

  /**
   * Record memory with Identity Synthesis & Habit Detection
   */
  async recordMemory(content: string, importance: number = 0.5) {
    try {
      await contextEngineer.ingest({ role: "assistant", content });
      
      let category = "fact";
      const tags = ["interaction"];
      const lowerContent = content.toLowerCase();
      
      // FIX: Corrected .some() syntax and broadened detection
      const identityKeywords = ["i am", "my trait", "i prefer", "i usually", "my goal", "wolverine is"];
      if (identityKeywords.some(kw => lowerContent.includes(kw))) {
        category = "rule"; // Rules are weighted higher in Chetna
        tags.push("identity", "personality");
        importance = 0.9;
      }

      const behaviorKeywords = ["always", "whenever", "every time", "habit"];
      if (behaviorKeywords.some(kw => lowerContent.includes(kw))) {
        tags.push("habit", "strategy");
        importance = Math.max(importance, 0.8);
      }
      
      await this.chetna.call("memory_create", {
        content,
        importance,
        category,
        tags
      });
    } catch (err) {
      console.error("[Brain] Failed to record memory:", err);
    }
  }
}
