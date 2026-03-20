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

  /**
   * Initializes a new instance of the ChetnaClient.
   * 
   * @param {Settings | { brain: { chetnaUrl: string } }} settings - The system settings containing the Chetna URL.
   */
  constructor(settings: Settings | { brain: { chetnaUrl: string } }) {
    this.url = settings.brain.chetnaUrl;
  }

  /**
   * Executes an MCP (Model Context Protocol) call to the Chetna server.
   * 
   * @param {string} method - The MCP method name to invoke.
   * @param {any} [params] - The parameters to pass to the method.
   * @returns {Promise<any>} A promise that resolves to the result of the call, or null on failure.
   * @sideEffects Performs a POST request to the Chetna server and may log warnings to the console on failure.
   */
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

      if (!response.ok) {
        console.warn(`[Chetna] ${method} failed: HTTP ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data.result;
    } catch (err: any) {
      // Silent failure with logging: Wolverine continues without long-term memory
      const isTimeout = err.name === "TimeoutError";
      console.warn(`[Chetna] ${method} failed: ${isTimeout ? "timeout" : err.message}`);
      return null;
    }
  }

  /**
   * Creates a new long-term memory in the Chetna system.
   * 
   * @param {string} content - The content of the memory to store.
   * @param {number} [importance=0.5] - The importance score of the memory (0.0 to 1.0).
   * @param {string} [category="fact"] - The category of the memory (e.g., "fact", "rule", "habit").
   * @returns {Promise<any>} A promise that resolves to the created memory metadata or result.
   * @sideEffects Invokes an MCP call to 'memory_create'.
   */
  async createMemory(content: string, importance: number = 0.5, category: string = "fact") {
    return this.call("memory_create", { content, importance, category });
  }

  /**
   * Builds a memory-enriched context for a given query.
   * 
   * @param {string} query - The query to search for relevant memories.
   * @param {number} [maxTokens=4000] - The maximum number of tokens for the context.
   * @returns {Promise<any>} A promise that resolves to the context string.
   * @sideEffects Invokes an MCP call to 'memory_context'.
   */
  async buildContext(query: string, maxTokens: number = 4000) {
    return this.call("memory_context", { query, max_tokens: maxTokens });
  }

  /**
   * Searches for relevant memories using a hybrid approach (semantic + keyword fallback).
   * 
   * @param {string} query - The search query.
   * @param {number} [limit=10] - The maximum number of results to return.
   * @param {boolean} [semantic=true] - Whether to use semantic search.
   * @returns {Promise<any[]>} A promise that resolves to an array of memory objects.
   * @sideEffects Invokes multiple MCP calls to 'memory_search' and logs warnings on failure.
   */
  async searchMemories(query: string, limit: number = 10, semantic: boolean = true) {
    // HYBRID SEARCH: Extract technical keywords (UUIDs, Paths, etc.)
    const idRegex = /(?:\/[\w.-]+){2,}|[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}|(?:\d{1,3}\.){3}\d{1,3}/g;
    const keywords = query.match(idRegex) || [];

    let results: any[] = [];

    // 1. Semantic Search
    try {
      const semanticResults = await this.call("memory_search", { query, limit, semantic });
      results = Array.isArray(semanticResults) ? semanticResults : ((semanticResults as any)?.memories || []);
    } catch (e) {
      console.warn("[Chetna] Semantic search failed.");
    }

    // 2. Keyword Fallback (Exact Matches)
    if (keywords.length > 0) {
      try {
        const keywordResults = await this.call("memory_search", { 
          query: keywords.join(" "), 
          limit: Math.max(5, limit), 
          semantic: false 
        });
        const kwMemories = Array.isArray(keywordResults) ? keywordResults : ((keywordResults as any)?.memories || []);
        
        // Merge & Deduplicate (Prioritize exact keyword matches at the top)
        const existingIds = new Set(results.map(r => r.id));
        const uniqueKeywords = kwMemories.filter((r: any) => !existingIds.has(r.id));
        
        // Combine results, prioritizing keywords, and re-slice to limit
        results = [...uniqueKeywords, ...results].slice(0, limit);
      } catch (e) {
        console.warn("[Chetna] Keyword search failed.");
      }
    }

    return results;
  }
}

import { readFileSync } from "fs";
import { PATHS } from "../types/paths.js";

/**
 * Creates a default instance of the ChetnaClient using settings from settings.json.
 * 
 * @returns {ChetnaClient} A new ChetnaClient instance.
 * @sideEffects Reads from the filesystem (settings.json) and logs warnings if the file is missing or invalid.
 */
function createDefaultChetnaClient(): ChetnaClient {
  try {
    const settingsPath = PATHS.settings;
    const settingsContent = readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(settingsContent);
    return new ChetnaClient(settings);
  } catch (err) {
    console.warn("[ChetnaClient] Failed to load settings.json, using environment or default port:");
    const url = process.env.CHETNA_URL || "http://127.0.0.1:1987";
    return new ChetnaClient({ brain: { chetnaUrl: url } });
  }
}

export const chetnaClient = createDefaultChetnaClient();
