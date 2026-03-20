import type { LLMProvider, CompletionRequest, CompletionResponse } from "./types.js";
import type { Settings } from "../types/settings.js";

/**
 * OllamaProvider implements the LLMProvider interface for the Ollama local LLM server.
 * it handles communication with the Ollama API for both single completions and streaming responses.
 */
export class OllamaProvider implements LLMProvider {
  name = "ollama";
  private settings: Settings;

  /**
   * Initializes the OllamaProvider with system settings.
   * @param settings - Global configuration including Ollama URL and default parameters.
   */
  constructor(settings: Settings) {
    this.settings = settings;
  }

  /**
   * Generates a complete chat response from the Ollama model.
   * Includes a 300s timeout to allow for model loading and processing on varying hardware.
   * @param request - The completion request parameters (model, messages, etc.).
   * @returns A promise that resolves to the completion response, including token usage.
   * @throws Error if the API returns a non-ok response or if a timeout occurs.
   */
  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      // 300s timeout to allow for model loading + evaluation on slow machines
      const response = await fetch(`${this.settings.llm.ollama.url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false,
          options: {
            temperature: request.temperature ?? this.settings.llm.ollama.temperature,
            num_ctx: this.settings.llm.ollama.contextWindow,
          },
        }),
        signal: AbortSignal.timeout(300000) 
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      return {
        content: data.message?.content || "",
        model: data.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        }
      };
      } catch (err: any) {
      if (err.name === 'TimeoutError') {
        throw new Error(`Ollama completion timed out after 300s (model loading or machine may be too slow)`);
      }
      throw err;
      }
      }


  /**
   * Generates a streaming chat response from the Ollama model.
   * @param request - The completion request parameters.
   * @yields String chunks of the model's generated content.
   * @throws Error if the API returns a non-ok response.
   */
  async *generateStream(request: CompletionRequest): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.settings.llm.ollama.url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        options: {
          temperature: request.temperature ?? this.settings.llm.ollama.temperature,
          num_ctx: this.settings.llm.ollama.contextWindow,
        },
      }),
      signal: AbortSignal.timeout(300000),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // The last element might be an incomplete line, so keep it in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              yield json.message.content;
            }
          } catch (e) {
            console.error("[Ollama] Stream parse error:", e, "Line:", line);
          }
        }
      }
    } finally {
      reader.releaseLock();
      response.body.cancel().catch(() => {});
    }
  }
}
