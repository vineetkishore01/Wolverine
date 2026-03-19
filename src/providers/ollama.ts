import type { LLMProvider, CompletionRequest, CompletionResponse } from "./types.js";
import type { Settings } from "../types/settings.js";

export class OllamaProvider implements LLMProvider {
  name = "ollama";
  private url: string;

  constructor(settings: Settings) {
    this.url = settings.llm.ollama.url;
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await fetch(`${this.url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.message?.content || "",
      model: data.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      }
    };
  }
}
