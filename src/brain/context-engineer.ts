import { db } from "../db/database.js";
import { randomUUID } from "crypto";
import type { Message } from "../providers/types.js";
import { ProviderFactory } from "../providers/factory.js";
import type { Settings } from "../types/settings.js";
import type { ChetnaClient } from "./chetna-client.js";

let chetnaClientInstance: ChetnaClient | null = null;

function getChetnaClient(): ChetnaClient {
  if (!chetnaClientInstance) {
    const { chetnaClient } = require("./chetna-client.js");
    chetnaClientInstance = chetnaClient;
  }
  return chetnaClientInstance;
}

export class ContextEngineer {
  private CONTEXT_LIMIT = 3000;
  private LEAF_CHUNK = 1000;
  private settings: Settings;
  private isCompacting = false;

  constructor() {
    try {
      const { readFileSync } = require("fs");
      const content = readFileSync("settings.json", "utf-8");
      this.settings = JSON.parse(content);
    } catch {
      this.settings = {
        gateway: { port: 18789, host: "0.0.0.0" },
        llm: { defaultProvider: "ollama", ollama: { url: "http://127.0.0.1:11434", model: "llama3" } },
        telegram: { botToken: "", allowedUserIds: [] },
        brain: { chetnaUrl: "http://127.0.0.1:1987" }
      } as Settings;
    }
  }

  async ingest(message: Message) {
    const id = randomUUID();
    const tokens = Math.ceil(message.content.length / 4);

    db.run(
      "INSERT INTO messages (id, role, content, tokens) VALUES (?, ?, ?, ?)",
      [id, message.role, message.content, tokens]
    );

    console.log(`[Context] Ingested message: ${tokens} tokens`);

    await this.maybeCompact();
  }

  private async maybeCompact() {
    if (this.isCompacting) return;

    const res = db.query("SELECT SUM(tokens) as total FROM messages") as any;
    const totalTokens = res[0]?.total || 0;

    if (totalTokens <= this.CONTEXT_LIMIT) return;

    this.isCompacting = true;
    console.log(`[Context] Compacting history (${totalTokens} tokens)...`);

    const oldestMessages = db.query(`SELECT * FROM messages ORDER BY timestamp ASC LIMIT 15`) as any[];

    if (oldestMessages.length < 5) {
      this.isCompacting = false;
      return;
    }

    const textToSummarize = oldestMessages.map(m => `${m.role}: ${m.content}`).join("\n");

    try {
      const llm = ProviderFactory.create(this.settings);
      const summaryResponse = await llm.generateCompletion({
        model: this.settings.llm.ollama.model,
        messages: [
          { role: "system", content: "You are a context compressor. Summarize the following conversation chunk into a concise, fact-dense paragraph. Preserve all technical details, URLs, and specific user preferences." },
          { role: "user", content: textToSummarize }
        ]
      });

      const summaryId = randomUUID();
      const summaryContent = summaryResponse.content;

      db.run(
        "INSERT INTO summaries (id, content, depth, token_count) VALUES (?, ?, ?, ?)",
        [summaryId, summaryContent, 0, Math.ceil(summaryContent.length / 4)]
      );

      for (const msg of oldestMessages) {
        db.run("INSERT INTO dag_edges (parent_id, child_id, type) VALUES (?, ?, ?)", [summaryId, msg.id, "summary_to_message"]);
        db.run("DELETE FROM messages WHERE id = ?", [msg.id]);
      }

      console.log(`[Context] Compacted ${oldestMessages.length} messages into DAG node ${summaryId}`);
    } catch (err) {
      console.error("[Context] Compaction failed:", err);
    } finally {
      this.isCompacting = false;
    }
  }

  async assembleActiveContext(): Promise<Message[]> {
    const messages: Message[] = [];

    const summaries = db.query("SELECT content FROM summaries ORDER BY created_at DESC LIMIT 3") as any[];
    if (summaries.length > 0) {
      const summaryText = summaries.map(s => s.content).join("\n\n---\n\n");
      messages.push({ role: "system", content: `PREVIOUS CONTEXT SUMMARY:\n${summaryText}` });
    }

    const rawMessages = db.query("SELECT role, content FROM messages ORDER BY timestamp ASC") as any[];
    rawMessages.forEach(m => messages.push({ role: m.role as any, content: m.content }));

    return messages;
  }

  async searchMemories(query: string): Promise<any[]> {
    try {
      const client = getChetnaClient();
      return await client.searchMemories(query, 20);
    } catch {
      return [];
    }
  }

  async clearMemories(): Promise<void> {
    try {
      const client = getChetnaClient();
      return await client.call("memory_clear", {});
    } catch {
      return;
    }
  }
}

export const contextEngineer = new ContextEngineer();
