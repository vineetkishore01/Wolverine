/**
 * ollama-adapter.ts
 * Wraps the existing Ollama SDK. This keeps backward compatibility —
 * all existing code that relied on the Ollama SDK still works unchanged.
 */

import { Ollama } from 'ollama';
import type { LLMProvider, ChatMessage, ChatOptions, ChatResult, GenerateOptions, GenerateResult, ModelInfo } from './LLMProvider';

export class OllamaAdapter implements LLMProvider {
  readonly id = 'ollama' as const;
  private client: Ollama;
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.client = new Ollama({ host: endpoint });
  }

  updateEndpoint(endpoint: string) {
    if (endpoint !== this.endpoint) {
      this.endpoint = endpoint;
      this.client = new Ollama({ host: endpoint });
    }
  }

  async chat(messages: ChatMessage[], model: string, options?: ChatOptions): Promise<ChatResult> {
    const thinkCandidates = this.buildThinkCandidates(options?.think);
    let lastError: any = null;

    for (const think of thinkCandidates) {
      try {
        const response: any = await this.client.chat({
          model,
          messages: messages as any,
          tools: options?.tools,
          ...(Array.isArray(options?.tools) && options!.tools!.length ? { tool_choice: 'auto' } : {}),
          options: {
            temperature: options?.temperature ?? 0.25,
            top_p: 0.9,
            num_ctx: options?.num_ctx ?? 4096,
            num_predict: options?.max_tokens ?? 256,
          },
          ...(think === undefined ? {} : { think }),
          stream: false,
        } as any);

        const message = response?.message || { role: 'assistant', content: String(response?.response || '') };
        return { message, thinking: response?.thinking };
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || error || '');
        if (!/think value .* not supported|invalid think|think .* not supported/i.test(msg)) {
          throw new Error(`Ollama chat failed: ${msg}`);
        }
      }
    }
    throw new Error(`Ollama chat failed: ${lastError?.message || 'Unknown'}`);
  }

  async generate(prompt: string, model: string, options?: GenerateOptions): Promise<GenerateResult> {
    const thinkCandidates = this.buildThinkCandidates(options?.think);
    let lastError: any = null;

    for (const think of thinkCandidates) {
      try {
        const response = await this.client.generate({
          model,
          prompt,
          system: options?.system,
          format: options?.format,
          options: {
            temperature: options?.temperature ?? 0.3,
            top_p: 0.9,
            num_ctx: options?.num_ctx ?? 2048,
            num_predict: options?.max_tokens ?? 256,
          },
          ...(think === undefined ? {} : { think }),
          stream: false,
        });
        return { response: response.response, thinking: response.thinking };
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || error || '');
        if (!/think value .* not supported|invalid think|think .* not supported/i.test(msg)) {
          throw new Error(`Ollama generate failed: ${msg}`);
        }
      }
    }
    throw new Error(`Ollama generate failed: ${lastError?.message || 'Unknown'}`);
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.client.list();
    return response.models.map((m: any) => ({
      name: m.name,
      size: m.size,
      parameter_size: m.details?.parameter_size || '',
      family: m.details?.family || '',
      modified_at: m.modified_at,
    }));
  }

  async testConnection(): Promise<boolean> {
    try { await this.listModels(); return true; } catch { return false; }
  }

  async pullModel(modelName: string): Promise<void> {
    await this.client.pull({ model: modelName, stream: false });
  }

  private buildThinkCandidates(requested?: boolean | 'high' | 'medium' | 'low') {
    const candidates: Array<boolean | 'high' | 'medium' | 'low' | undefined> = [];
    const push = (v: boolean | 'high' | 'medium' | 'low' | undefined) => {
      if (!candidates.some(x => x === v)) candidates.push(v);
    };
    push(requested);
    if (requested !== 'low') push('low');
    push(undefined);
    if (requested !== true) push(true);
    push('medium');
    return candidates;
  }
}
