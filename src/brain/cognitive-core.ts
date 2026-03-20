import type { Settings } from "../types/settings.js";
import { ChetnaClient } from "./chetna-client.js";
import { skillRegistry } from "../tools/registry.js";
import { telemetry } from "../gateway/telemetry.js";
import type { Message } from "../providers/types.js";
import { ProviderFactory } from "../providers/factory.js";

export class CognitiveCore {
  private chetna: ChetnaClient;
  private settings: Settings;

  /**
   * Initializes a new instance of the CognitiveCore.
   * 
   * @param {Settings} settings - The system settings.
   */
  constructor(settings: Settings) {
    this.settings = settings;
    this.chetna = new ChetnaClient(settings);
  }

  /**
   * Enriches a user message with a system prompt, identity, and available tools.
   * 
   * Uses PREFETCH approach: memories are automatically retrieved from Chetna
   * before the LLM call, and injected into the context. The LLM responds
   * naturally to whatever is in context.
   * 
   * @param {string} userMessage - The message from the user.
   * @returns {Promise<Message[]>} A promise that resolves to an array of messages (system and user) for the LLM.
   * @sideEffects Fetches available tools from the skill registry and retrieves memories from Chetna.
   */
  async enrichPrompt(userMessage: string): Promise<Message[]> {
    // PREFETCH: Retrieve relevant memories from Chetna before LLM call
    // This approach works with any LLM regardless of instruction-following capability
    let memoryContext = "";
    try {
      const memories = await this.chetna.searchMemories(userMessage, 5);
      const results = Array.isArray(memories) ? memories : ((memories as any)?.memories || []);
      if (results.length > 0) {
        const validResults = results.filter((r: any) => r && typeof r.content === "string");
        if (validResults.length > 0) {
          memoryContext = validResults.map((r: any) => `- ${r.content}`).join("\n");
        }
      }
    } catch (e) {
      console.warn("[Brain] Memory prefetch failed:", e);
    }

    const tools = skillRegistry.getToolsForLLM();
    const toolNames = tools.map(t => t.name).join(", ");
    
    const systemPrompt = `You are WOLVERINE, a hyper-autonomous AI engineering partner.

### CORE DIRECTIVES
1. **Extreme Proactivity:** Do not wait for permission. Use tools immediately via TOOL_CALL when needed.
2. **Lean Context:** You only have the immediate conversation. Focus on the current task.

### RESPONSE FORMAT
- If NO tool is needed: Respond directly with a helpful answer.
- If tool is needed: Output <THOUGHT> briefly explaining, then ONE TOOL_CALL on a new line.

### TOOL CALL FORMAT (CRITICAL - Follow this EXACT format)
When calling a tool, your response MUST include:
<THOUGHT>Why you need this tool...</THOUGHT>
TOOL_CALL: {"name": "tool_name", "params": {"param_name": "value"}}

### AVAILABLE TOOLS
${toolNames || "system, browser, telegram, subagent"}

### RESILIENCE
- If a tool fails, try a DIFFERENT approach.
- If stuck in a loop, ask the user for clarification.
- Do NOT use "..." in tool parameters - use actual values.

### USER INFO (from memory - prefetched automatically)
${memoryContext || "None stored yet."}

### IMPORTANT
- Your final response to the user should be CLEAN (no <THOUGHT> or TOOL_CALL blocks).
- Only include thinking blocks when actually calling tools.
- If the user asks about themselves, their preferences, or past conversations, use the memories shown above.
`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];
  }

  /**
   * Extracts and records facts from an interaction into the long-term memory (Chetna).
   * 
   * Uses INTELLIGENT LLM-based extraction with fallback to regex.
   * The LLM understands context, nuance, and varied phrasings.
   * 
   * Flow:
   * 1. Extract user's messages from interaction
   * 2. Send to LLM for fact extraction (intelligent)
   * 3. Deduplicate against existing memories
   * 4. Store new facts in Chetna
   * 
   * @param {string} interaction - The full interaction string.
   * @returns {Promise<void>}
   */
  async recordMemory(interaction: string) {
    try {
      // Extract ALL user messages from the interaction
      const userMessages = interaction.matchAll(/^User:\s*(.+?)(?=\nUser:|\nWolverine:|$)/gism);
      let userText = "";
      for (const match of userMessages) {
        userText += match[1] + " ";
      }
      
      if (!userText.trim()) {
        userText = interaction;
      }

      // INTELLIGENT: Use LLM to extract facts
      const facts = await this.extractFactsWithLLM(userText);
      
      if (facts.length === 0) return;
      
      // Check for duplicates before storing
      const existingFacts = await this.chetna.searchMemories(facts.join(" "), 10);
      const existingSet = new Set<string>(
        Array.isArray(existingFacts) 
          ? existingFacts.map((r: any) => r.content?.toLowerCase())
          : ((existingFacts as any)?.memories || []).map((r: any) => r.content?.toLowerCase())
      );
      
      let storedCount = 0;
      for (const fact of facts) {
        const normalized = fact.trim().toLowerCase();
        
        // Skip if too similar to existing facts
        if (existingSet.has(normalized)) continue;
        
        const isDuplicate = Array.from(existingSet).some(existing => 
          existing.includes(normalized) || normalized.includes(existing)
        );
        if (isDuplicate) continue;
        
        await this.chetna.call("memory_create", {
          content: fact.trim(),
          importance: 0.6,
          category: "fact",
          tags: ["extracted", "llm"]
        });
        
        existingSet.add(normalized);
        storedCount++;
      }

      if (storedCount > 0) {
        telemetry.publish({ 
          type: "memory", 
          source: "Brain", 
          content: `LLM extracted ${facts.length} facts, stored ${storedCount} new`
        });
      }
    } catch (err: any) {
      console.warn("[Brain] Memory recording skipped:", err.message);
    }
  }

  /**
   * INTELLIGENT: Extracts facts using the LLM.
   * 
   * This approach:
   * - Understands context and nuance
   * - Handles varied phrasings ("I've been living in SF", "My dog's name is...")
   * - Extracts meaningful facts, not just pattern matches
   * - No hardcoded regex patterns
   * 
   * @param {string} text - User's message text
   * @returns {Promise<string[]>} Array of extracted facts
   */
  private async extractFactsWithLLM(text: string): Promise<string[]> {
    const provider = ProviderFactory.create(this.settings);
    
    const extractionPrompt = `You are a fact extraction assistant. Your job is to identify SELF-REFERENTIAL FACTS from user messages.

SELF-REFERENTIAL FACTS are statements where the user tells you about THEMSELVES. Examples:
- "My name is Vineet" ✓
- "I'm a software engineer at Apple" ✓
- "I live in San Francisco" ✓
- "I have two cats named Luna and Mochi" ✓
- "My favorite language is Rust" ✓
- "I love hiking on weekends" ✓
- "I'm learning Go programming" ✓
- "My birthday is March 15th" ✓
- "I work on backend systems" ✓

NOT self-referential facts (these are NOT about the user):
- "Thanks for your help" ✗
- "Can you help me debug this?" ✗
- "What is Rust?" ✗
- "How do I install Python?" ✗

RULES:
1. Only extract facts where the user is describing THEMSELVES (use "I", "my", "I've", etc.)
2. Extract COMPLETE facts as full sentences or phrases
3. Do NOT extract fragments - if a fact is incomplete, skip it
4. Return UP TO 5 facts maximum
5. Return as a JSON array of strings

Output format:
["Fact 1 as a complete phrase", "Fact 2", "Fact 3"]

User message:
${text}

JSON array of facts (only self-referential facts, max 5):`;

    try {
      const response = await provider.complete(extractionPrompt, {
        maxTokens: 500,
        temperature: 0.1,
        stop: undefined
      });

      const content = response.content?.trim() || "";
      
      // Parse JSON array from response
      // Try to find JSON array in response
      let facts: string[] = [];
      
      // Method 1: Direct JSON parse
      if (content.startsWith("[")) {
        try {
          facts = JSON.parse(content);
        } catch {
          // Method 2: Extract from markdown code block
          const jsonMatch = content.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            try {
              facts = JSON.parse(jsonMatch[0]);
            } catch {
              // Method 3: Parse line by line
              facts = content
                .replace(/[\[\]"]/g, "")
                .split("\n")
                .map(s => s.trim().replace(/^[-*\d.]\s*/, ""))
                .filter(s => s.length > 5);
            }
          }
        }
      } else {
        // Try to extract quoted strings
        const quoted = content.match(/"([^"]+)"/g);
        if (quoted) {
          facts = quoted.map(q => q.replace(/"/g, "").trim());
        }
      }

      // Validate facts
      const validFacts = facts
        .filter(f => typeof f === "string" && f.length > 5)
        .map(f => f.trim())
        .filter(f => /^(I|My|I've|I am|I'm)\b/i.test(f))
        .slice(0, 5);

      if (validFacts.length > 0) {
        console.log(`[Brain] LLM extracted ${validFacts.length} facts:`, validFacts);
      }

      return validFacts;

    } catch (err) {
      console.warn("[Brain] LLM fact extraction failed, using fallback:", err);
      // FALLBACK: Use regex if LLM fails
      return this.extractFactsWithRegex(text);
    }
  }

  /**
   * FALLBACK: Extracts facts using regex patterns (legacy approach).
   * 
   * This is a fallback when LLM extraction fails.
   * Less intelligent but works without LLM.
   * 
   * @param {string} text - User's message text
   * @returns {string[]} Array of extracted facts
   */
  private extractFactsWithRegex(text: string): string[] {
    const facts: string[] = [];
    
    const isValidFact = (fact: string): boolean => {
      const trimmed = fact.trim();
      if (trimmed.length < 8) return false;
      if (trimmed.split(/\s+/).length < 2) return false;
      if (!/^(I|My)\b/i.test(trimmed)) return false;
      const skipPhrases = ["ready to", "glad to", "happy to", "here to", "how can i", "let me", "i'll be", "let me know", "feel free", "don't hesitate", "got it", "sure thing", "absolutely", "i'm ready", "memory"];
      if (skipPhrases.some(p => trimmed.toLowerCase().startsWith(p))) return false;
      return true;
    };
    
    const patterns: [RegExp, (m: RegExpMatchArray) => string | null][] = [
      [/my name is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, m => `My name is ${m[1]}`],
      [/I am ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, m => `I am ${m[1]}`],
      [/I work at ([A-Za-z][^.,!?\n]{1,50})/i, m => `I work at ${m[1].trim()}`],
      [/I work in ([A-Za-z][^.,!?\n]{1,50})/i, m => `I work in ${m[1].trim()}`],
      [/I work as (?:a |an )?([A-Za-z][^.,!?\n]{1,50})/i, m => `I work as ${m[1].trim()}`],
      [/(?:I am|I'm) (?:a |an )?([A-Za-z][^.,!?\n]{1,50})/i, m => `I am ${m[1].trim()}`],
      [/I live (?:in|at|with) ([A-Za-z][^.,!?\n]{1,50})/i, m => `I live in ${m[1].trim()}`],
      [/I have ([A-Za-z][^.,!?\n]{1,50})/i, m => `I have ${m[1].trim()}`],
      [/I love ([A-Za-z][^.,!?\n]{1,50})/i, m => `I love ${m[1].trim()}`],
      [/I like ([A-Za-z][^.,!?\n]{1,50})/i, m => `I like ${m[1].trim()}`],
      [/I prefer ([A-Za-z][^.,!?\n]{1,50})/i, m => `I prefer ${m[1].trim()}`],
      [/I enjoy ([A-Za-z][^.,!?\n]{1,50})/i, m => `I enjoy ${m[1].trim()}`],
      [/my favorite ([A-Za-z][A-Za-z\s]*?) is ([A-Za-z][^.,!?\n]{1,50})/i, m => `My favorite ${m[1].trim()} is ${m[2].trim()}`],
      [/(?:I am|I'm) from ([A-Za-z][^.,!?\n]{1,50})/i, m => `I am from ${m[1].trim()}`],
      [/I (?:am )?learning ([A-Za-z][^.,!?\n]{1,50})/i, m => `I am learning ${m[1].trim()}`],
    ];
    
    for (const [pattern, formatter] of patterns) {
      const match = text.match(pattern);
      if (match) {
        const fact = formatter(match);
        if (fact && isValidFact(fact)) {
          facts.push(fact);
        }
      }
    }
    
    const seen = new Set<string>();
    const uniqueFacts = facts.filter(f => {
      const lower = f.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
    
    return uniqueFacts.slice(0, 5);
  }

}

