import type { Settings } from "../types/settings.js";

export interface McpRequest {
  method: string;
  params?: any;
  id?: string;
}

export interface McpResponse {
  result?: any;
  error?: string;
  id?: string;
}

export class ChetnaClient {
  private url: string;

  constructor(settings: Settings | { brain: { chetnaUrl: string } }) {
    this.url = settings.brain.chetnaUrl;
  }

  async call(method: string, params?: any): Promise<any> {
    const request: McpRequest = {
      method,
      params,
      id: crypto.randomUUID(),
    };

    try {
      // Increased timeout to 10s for slower machines/large searches
      const response = await fetch(`${this.url}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) return null;

      const data: any = await response.json();
      return data.result;
    } catch (err) {
      // Silent failure: Wolverine continues without long-term memory
      // console.warn(`[Chetna] Connection failed or timed out: ${method}`);
      return null;
    }
  }

  async createMemory(content: string, importance: number = 0.5, category: string = "fact") {
    return this.call("memory_create", { content, importance, category });
  }

  async buildContext(query: string, maxTokens: number = 4000) {
    return this.call("memory_context", { query, max_tokens: maxTokens });
  }

  async searchMemories(query: string, limit: number = 10, semantic: boolean = true) {
    // HYBRID SEARCH: Extract technical keywords (UUIDs, Paths, etc.)
    const idRegex = /(?:\/[\w.-]+){2,}|[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}|(?:\d{1,3}\.){3}\d{1,3}/g;
    const keywords = query.match(idRegex) || [];

    let results: any[] = [];

    // 1. Semantic Search
    try {
      const semanticResults = await this.call("memory_search", { query, limit, semantic });
      results = Array.isArray(semanticResults) ? semanticResults : (semanticResults?.memories || []);
    } catch (e) {
      console.warn("[Chetna] Semantic search failed.");
    }

    // 2. Keyword Fallback (Exact Matches)
    if (keywords.length > 0) {
      try {
        const keywordResults = await this.call("memory_search", { 
          query: keywords.join(" "), 
          limit: 5, 
          semantic: false 
        });
        const kwMemories = Array.isArray(keywordResults) ? keywordResults : (keywordResults?.memories || []);
        
        // Merge & Deduplicate (Prioritize exact keyword matches at the top)
        const existingIds = new Set(results.map(r => r.id));
        const uniqueKeywords = kwMemories.filter((r: any) => !existingIds.has(r.id));
        results = [...uniqueKeywords, ...results].slice(0, limit);
      } catch (e) {
        console.warn("[Chetna] Keyword search failed.");
      }
    }

    return results;
  }
}

import { readFileSync } from "fs";

function createDefaultChetnaClient(): ChetnaClient {
  try {
    const settingsContent = readFileSync("settings.json", "utf-8");
    const settings = JSON.parse(settingsContent);
    return new ChetnaClient(settings);
  } catch (err) {
    console.warn("[ChetnaClient] Failed to load settings.json, using defaults:", err);
    return new ChetnaClient({ brain: { chetnaUrl: "http://127.0.0.1:1987" } });
  }
}

export const chetnaClient = createDefaultChetnaClient();
