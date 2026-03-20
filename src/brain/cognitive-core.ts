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
      const results = Array.isArray(memories) ? memories : (memories?.memories || []);
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
   * This method performs the following:
   * 1. Extracts the user's part of the interaction.
   * 2. Identifies facts using regex patterns.
   * 3. Validates and deduplicates facts against existing memories.
   * 4. Stores new facts in Chetna.
   * 5. Publishes telemetry about the memory operation.
   * 
   * @param {string} interaction - The full interaction string (e.g., "User: ... \nWolverine: ...").
   * @returns {Promise<void>} A promise that resolves when the recording process is complete.
   * @sideEffects Invokes multiple MCP calls to Chetna and publishes telemetry events.
   */
  async recordMemory(interaction: string) {
    try {
      
      // Extract ONLY from user messages to avoid Wolverine response fragments
      // The interaction format is "User: <msg>\nWolverine: <response>"
      // We only want facts from what the USER said
      const userMessageMatch = interaction.match(/^User:\s*(.+?)(?:\n|$)/is);
      const userText = userMessageMatch ? userMessageMatch[1] : interaction;
      
      const facts = this.extractFacts(userText);
      const validFacts = facts.filter(f => f && f.trim().length > 2);
      
      if (validFacts.length === 0) return;
      
      // Check for duplicates before storing
      const existingFacts = await this.chetna.searchMemories(validFacts.join(" "), 10);
      const existingSet = new Set(
        Array.isArray(existingFacts) 
          ? existingFacts.map((r: any) => r.content?.toLowerCase())
          : (existingFacts?.memories || []).map((r: any) => r.content?.toLowerCase())
      );
      
      let storedCount = 0;
      for (const fact of validFacts) {
        const normalized = fact.trim().toLowerCase();
        
        // Skip if too similar to existing facts
        if (existingSet.has(normalized)) continue;
        
        // Check for substring matches (partial duplicates)
        const isDuplicate = Array.from(existingSet).some(existing => 
          existing.includes(normalized) || normalized.includes(existing)
        );
        if (isDuplicate) continue;
        
        await this.chetna.call("memory_create", {
          content: fact.trim(),
          importance: 0.6,
          category: "fact",
          tags: ["extracted", "interaction"]
        });
        
        existingSet.add(normalized);
        storedCount++;
      }

      if (storedCount > 0) {
        telemetry.publish({ 
          type: "memory", 
          source: "Brain", 
          content: `Extracted ${validFacts.length} facts, stored ${storedCount} new (${validFacts.length - storedCount} duplicates skipped)`
        });
      }
    } catch (err) {
      console.warn("[Brain] Memory recording skipped:", err.message);
    }
  }

  /**
   * Extracts facts from a given text using predefined regex patterns.
   * 
   * @param {string} text - The text to extract facts from.
   * @returns {string[]} An array of extracted fact strings.
   * @private
   */
  private extractFacts(text: string): string[] {
    const facts: string[] = [];
    
    // ============================================
    // VALIDATION: Facts must be complete self-statements
    // ============================================
    const isValidFact = (fact: string): boolean => {
      const trimmed = fact.trim();
      // Must be at least 8 chars
      if (trimmed.length < 8) return false;
      // Must have at least 2 words
      if (trimmed.split(/\s+/).length < 2) return false;
      // Must start with I/my (user self-statement)
      if (!/^(I|My)\b/i.test(trimmed)) return false;
      // Skip Wolverine response fragments
      const skipPhrases = [
        "ready to", "glad to", "happy to", "here to", "how can i",
        "what would you", "let me", "i'll be", "let me know",
        "feel free", "don't hesitate", "got it", "sure thing",
        "absolutely", "i'm ready", "memory"
      ];
      if (skipPhrases.some(p => trimmed.toLowerCase().startsWith(p))) return false;
      return true;
    };
    
    // ============================================
    // PATTERN 1: "My name is X" - Only match actual names
    // ============================================
    // Only match if followed by what looks like a person name (capitalized words, not verbs)
    const nameMatch = text.match(/(?:my name is|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (nameMatch && nameMatch[1]) {
      facts.push(`My name is ${nameMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 1b: "I'm X" - Only match single capitalized names
    // ============================================
    const imNameMatch = text.match(/I'm\s+([A-Z][a-z]+)(?:\s|$|\.)/i);
    if (imNameMatch && imNameMatch[1] && !["am", "is", "was", "going", "learning", "working", "living", "having", "doing", "going"].includes(imNameMatch[1].toLowerCase())) {
      facts.push(`My name is ${imNameMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 2: "I work at X"
    // ============================================
    const workAtMatch = text.match(/I\s+work\s+at\s+([A-Za-z][^.,!?\n]*)/i);
    if (workAtMatch && workAtMatch[1]) {
      facts.push(`I work at ${workAtMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 3: "I work in X"
    // ============================================
    const workInMatch = text.match(/I\s+work\s+in\s+([A-Za-z][^.,!?\n]*)/i);
    if (workInMatch && workInMatch[1]) {
      facts.push(`I work in ${workInMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 4: "I work as a/an X"
    // ============================================
    const workAsMatch = text.match(/I\s+work\s+as\s+(?:a\s+|an\s+)?([A-Za-z][^.,!?\n]*)/i);
    if (workAsMatch && workAsMatch[1]) {
      facts.push(`I work as ${workAsMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 5: "I am a/an X" / "I'm a/an X"
    // ============================================
    const amMatch = text.match(/(?:I am|I'm)\s+(?:a\s+|an\s+)?([A-Za-z][^.,!?\n]*?)(?:\.|,|$)/i);
    if (amMatch && amMatch[1]) {
      const role = amMatch[1].trim();
      if (role.length > 2 && !["ready", "happy", "glad", "here", "going", "doing", "not", "in", "from", "learning"].includes(role.toLowerCase().split(/\s+/)[0])) {
        facts.push(`I am ${role}`);
      }
    }
    
    // ============================================
    // PATTERN 6: "I live in X"
    // ============================================
    const liveMatch = text.match(/I\s+live\s+(?:in|at|with)\s+([A-Za-z][^.,!?\n]*)/i);
    if (liveMatch && liveMatch[1]) {
      facts.push(`I live in ${liveMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 7: "I have X"
    // ============================================
    const haveMatch = text.match(/I\s+have\s+([A-Za-z][^.,!?\n]*)/i);
    if (haveMatch && haveMatch[1]) {
      facts.push(`I have ${haveMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 8: "I love X"
    // ============================================
    const loveMatch = text.match(/I\s+love\s+([A-Za-z][^.,!?\n]*)/i);
    if (loveMatch && loveMatch[1]) {
      facts.push(`I love ${loveMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 9: "I like X"
    // ============================================
    const likeMatch = text.match(/I\s+like\s+([A-Za-z][^.,!?\n]*)/i);
    if (likeMatch && likeMatch[1] && !text.toLowerCase().includes("i love")) {
      facts.push(`I like ${likeMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 10: "I hate X"
    // ============================================
    const hateMatch = text.match(/I\s+hate\s+([A-Za-z][^.,!?\n]*)/i);
    if (hateMatch && hateMatch[1]) {
      facts.push(`I hate ${hateMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 11: "I prefer X"
    // ============================================
    const preferMatch = text.match(/I\s+prefer\s+([A-Za-z][^.,!?\n]*)/i);
    if (preferMatch && preferMatch[1]) {
      facts.push(`I prefer ${preferMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 12: "I enjoy X" / "I love X" / "I hate X"
    // ============================================
    const enjoyMatch = text.match(/I\s+enjoy\s+([A-Za-z][^.,!?\n]*)/i);
    if (enjoyMatch && enjoyMatch[1]) {
      facts.push(`I enjoy ${enjoyMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 13: "My favorite X is Y"
    // ============================================
    const favMatch = text.match(/my\s+favorite\s+([A-Za-z][A-Za-z\s]*?)\s+is\s+([A-Za-z][^.,!?\n]*)/i);
    if (favMatch && favMatch[1] && favMatch[2]) {
      facts.push(`My favorite ${favMatch[1].trim()} is ${favMatch[2].trim()}`);
    }
    
    // ============================================
    // PATTERN 14: "I am from X" / "I'm from X"
    // ============================================
    const fromMatch = text.match(/(?:I am|I'm)\s+from\s+([A-Za-z][^.,!?\n]*)/i);
    if (fromMatch && fromMatch[1]) {
      facts.push(`I am from ${fromMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 15: "I am learning X"
    // ============================================
    const learningMatch = text.match(/I\s+(?:am\s+)?learning\s+([A-Za-z][^.,!?\n]*)/i);
    if (learningMatch && learningMatch[1]) {
      facts.push(`I am learning ${learningMatch[1].trim()}`);
    }
    
    // ============================================
    // PATTERN 16: Catch-all for any "I X" or "My X" statements
    // ============================================
    const catchAll = text.match(/(?:^|\.\s*)(I\s+[A-Za-z]+\s+[A-Za-z][^.,!?\n]{5,})/i);
    if (catchAll && catchAll[1]) {
      const phrase = catchAll[1].trim();
      if (isValidFact(phrase) && phrase.length > 10) {
        facts.push(phrase);
      }
    }
    
    // ============================================
    // DEDUPLICATION & VALIDATION
    // ============================================
    const seen = new Set<string>();
    const uniqueFacts: string[] = [];
    
    for (const fact of facts) {
      const normalized = fact.trim();
      if (!seen.has(normalized.toLowerCase()) && isValidFact(normalized)) {
        seen.add(normalized.toLowerCase());
        uniqueFacts.push(normalized);
      }
    }
    
    return uniqueFacts.slice(0, 5);
  }
}

