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
      const response = await fetch(`${this.url}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Chetna API error: ${response.status} ${response.statusText}`);
      }

      const data: McpResponse = await response.json();
      if (data.error) {
        throw new Error(`Chetna MCP error: ${data.error}`);
      }

      return data.result;
    } catch (err) {
      console.error(`[ChetnaClient] Failed to call ${method}:`, err);
      throw err;
    }
  }

  async createMemory(content: string, importance: number = 0.5, category: string = "fact") {
    return this.call("memory_create", { content, importance, category });
  }

  async buildContext(query: string, maxTokens: number = 4000) {
    return this.call("memory_context", { query, max_tokens: maxTokens });
  }

  async searchMemories(query: string, limit: number = 10, semantic: boolean = true) {
    return this.call("memory_search", { query, limit, semantic });
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
