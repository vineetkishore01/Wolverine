import { db } from "../db/database.js";
import { randomUUID } from "crypto";
import type { Message } from "../providers/types.js";
import { ProviderFactory } from "../providers/factory.js";
import type { Settings } from "../types/settings.js";
import { chetnaClient } from "./chetna-client.js";
import { PATHS } from "../types/paths.js";
import { readFileSync, existsSync } from "fs";

export class ContextEngineer {
  private settings: Settings;
  private isCompacting = false;
  private lastCompactionTime = 0;
  private readonly COMPACTION_COOLDOWN = 60000; // 1 minute

  /**
   * Initializes a new instance of the ContextEngineer.
   * Reads settings from the global paths.
   */
  constructor() {
    try {
      if (existsSync(PATHS.settings)) {
        const content = readFileSync(PATHS.settings, "utf-8");
        this.settings = JSON.parse(content);
      } else {
        throw new Error("Settings not found");
      }
    } catch {
      this.settings = {
        gateway: { port: 18789, host: "0.0.0.0" },
        llm: { defaultProvider: "ollama", ollama: { url: "http://127.0.0.1:11434", model: "llama3", contextWindow: 8192, temperature: 0.7, thinkMode: true } },
        telegram: { botToken: "mock", allowedUserIds: [], allowedChatIds: [] },
        brain: { chetnaUrl: "http://127.0.0.1:1987", memoryProvider: "chetna" }
      } as Settings;
    }
  }

  /**
   * Dynamically calculates the context limit based on the model's window.
   * Reserves 20% for the system prompt and new response.
   */
  private getContextLimit(): number {
    const window = this.settings.llm.ollama?.contextWindow || 8192;
    return Math.floor(window * 0.8);
  }

  /**
   * Ingests a new message into the context database.
   */
  async ingest(message: Message) {
    const id = randomUUID();
    const tokens = IntelligenceUtils.estimateTokens(message.content);

    db.run(
      "INSERT INTO messages (id, role, content, tokens) VALUES (?, ?, ?, ?)",
      [id, message.role, message.content, tokens]
    );

    console.log(`[Context] Ingested message: ${tokens} tokens`);

    // Fire and forget compaction
    this.maybeCompact().catch(() => {});
  }

  /**
   * Checks context size and performs compaction (summarization) if it exceeds the limit.
   */
  private async maybeCompact() {
    if (this.isCompacting) return;

    if (Date.now() - this.lastCompactionTime < this.COMPACTION_COOLDOWN) return;

    const res = db.query("SELECT SUM(tokens) as total FROM messages") as any;
    const totalTokens = res[0]?.total || 0;

    const limit = this.getContextLimit();

    if (totalTokens <= limit) return;

    this.isCompacting = true;
    this.lastCompactionTime = Date.now();
    console.log(`[Context] Compacting history (${totalTokens}/${limit} tokens)...`);

    // DYNAMIC SELECTION: Pull messages until we have enough tokens to clear space
    const targetToClear = Math.floor(limit * 0.3);
    const messages = db.query("SELECT * FROM messages ORDER BY timestamp ASC") as any[];
    
    let oldestMessages: any[] = [];
    let cumulativeTokens = 0;
    
    for (const msg of messages) {
      oldestMessages.push(msg);
      cumulativeTokens += msg.tokens;
      if (cumulativeTokens >= targetToClear) break;
    }

    if (oldestMessages.length < 3) {
      this.isCompacting = false;
      return;
    }

    const textToSummarize = oldestMessages.map(m => `${m.role}: ${m.content}`).join("\n");

    // IDENTIFIER PRESERVATION: Scan for UUIDs, Paths, IPs, and Hashes
    const idRegex = /(?:\/[\w.-]+){2,}|[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}|(?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F]{32,64}/g;
    const foundIdentifiers = Array.from(new Set(textToSummarize.match(idRegex) || []));
    const identifierBlock = foundIdentifiers.length > 0 
      ? `[STRICT_IDENTIFIERS: ${foundIdentifiers.join(", ")}]\n` 
      : "";

    try {
      const llm = ProviderFactory.create(this.settings);
      const summaryResponse = await llm.generateCompletion({
        model: this.settings.llm.ollama.model,
        messages: [
          { 
            role: "system", 
            content: "You are a context compressor. Summarize the following conversation chunk into a concise, fact-dense paragraph. " +
                     "PRESERVE all technical details, URLs, and user preferences. " +
                     "CRITICAL: Do not generalize specific identifiers (UUIDs, paths, IDs) mentioned in the input." 
          },
          { role: "user", content: textToSummarize }
        ]
      });

      const summaryId = randomUUID();
      const summaryContent = identifierBlock + summaryResponse.content;

      db.run(
        "INSERT INTO summaries (id, content, depth, token_count) VALUES (?, ?, ?, ?)",
        [summaryId, summaryContent, 0, IntelligenceUtils.estimateTokens(summaryContent)]
      );

      for (const msg of oldestMessages) {
        db.run("INSERT INTO dag_edges (parent_id, child_id, type) VALUES (?, ?, ?)", [summaryId, msg.id, "summary_to_message"]);
        db.run("DELETE FROM messages WHERE id = ?", [msg.id]);
      }

      console.log(`[Context] Compacted ${oldestMessages.length} messages into DAG node ${summaryId}`);
    } catch (err: any) {
      const isTimeout = err?.message?.includes("timed out") || err?.name === "TimeoutError";
      if (isTimeout) {
        console.log("[Context] Compaction skipped (LLM busy)");
      } else {
        console.error("[Context] Compaction failed:", err.message);
      }
    } finally {
      this.isCompacting = false;
    }
  }

  /**
   * Assembles the active conversation context for the LLM.
   */
  async assembleActiveContext(): Promise<Message[]> {
    const messages: Message[] = [];

    // Only pull the single latest summary for a high-level "where were we"
    const summaries = db.query("SELECT content FROM summaries ORDER BY created_at DESC LIMIT 1") as any[];
    if (summaries.length > 0) {
      messages.push({ role: "system", content: `CONTEXT SUMMARY: ${summaries[0].content}` });
    }

    // Only pull the last 5 raw messages for immediate conversational continuity
    const rawMessages = db.query("SELECT role, content FROM messages ORDER BY timestamp DESC LIMIT 5") as any[];
    
    // Reverse to get them in chronological order
    rawMessages.reverse().forEach(m => messages.push({ role: m.role as any, content: m.content }));

    return messages;
  }

  /**
   * Searches long-term memory (Chetna) for relevant context.
   */
  async searchMemories(query: string): Promise<any[]> {
    try {
      return await chetnaClient.searchMemories(query, 20);
    } catch {
      return [];
    }
  }

  /**
   * Clears all long-term memories in Chetna.
   */
  async clearMemories(): Promise<void> {
    try {
      return await chetnaClient.call("memory_clear", {});
    } catch {
      return;
    }
  }
}

export const contextEngineer = new ContextEngineer();
