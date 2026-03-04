/**
 * ollama-adapter.ts
 * Wraps the existing Ollama SDK. This keeps backward compatibility —
 * all existing code that relied on the Ollama SDK still works unchanged.
 */

import { Ollama } from 'ollama';
import type { LLMProvider, ChatMessage, ContentPart, ChatOptions, ChatResult, GenerateOptions, GenerateResult, ModelInfo } from './LLMProvider';

/**
 * Coerce a message's content to a plain string.
 * Ollama 4B models do not support multimodal content arrays.
 * If a ContentPart[] somehow reaches this adapter, extract only the text parts.
 */
function contentToString(content: string | ContentPart[] | null): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .filter((p): p is Extract<ContentPart, { type: 'text' }> => p.type === 'text')
    .map(p => p.text)
    .join('\n');
}

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
    // Normalize all messages to string content before sending to Ollama.
    const normalizedMessages = messages.map(m => ({
      ...m,
      content: contentToString(m.content),
    }));

    const thinkCandidates = this.buildThinkCandidates(options?.think);
    let lastError: any = null;

    for (const think of thinkCandidates) {
      try {
        const chatRequest: any = {
          model,
          messages: normalizedMessages as any,
          tools: options?.tools,
          options: {
            temperature: options?.temperature ?? 0.25,
            top_p: 0.9,
            num_ctx: options?.num_ctx ?? 4096,
            num_predict: options?.max_tokens ?? 512,
          },
          stream: false,
        };

        // Handle thinking mode
        if (think !== undefined) {
          const isThinkingEnabled = (options as any)?.thinking_enabled !== false;
          chatRequest.think = isThinkingEnabled ? think : false;
        }

        const response: any = await this.client.chat(chatRequest);
        const message = response?.message || { role: 'assistant', content: String(response?.response || '') };
        return { message, thinking: response?.thinking };
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || error || '');
        const idx = thinkCandidates.indexOf(think);
        const isLastCandidate = idx === thinkCandidates.length - 1;

        if (!isLastCandidate) {
          // Always try the next think candidate on error
          console.warn(`[OllamaAdapter] Chat failed (think=${think}), trying next candidate. Error: ${msg.slice(0, 120)}`);
          continue;
        }

        throw new Error(`Ollama chat failed at ${this.endpoint}: ${msg}`);
      }
    }
    throw new Error(`Ollama chat failed at ${this.endpoint}: ${lastError?.message || 'Unknown'}`);
  }

  async generate(prompt: string, model: string, options?: GenerateOptions): Promise<GenerateResult> {
    const thinkCandidates = this.buildThinkCandidates(options?.think);
    let lastError: any = null;

    for (const think of thinkCandidates) {
      try {
        const generateRequest: any = {
          model,
          prompt,
          system: options?.system,
          format: options?.format,
          options: {
            temperature: options?.temperature ?? 0.3,
            top_p: 0.9,
            num_ctx: options?.num_ctx ?? 2048,
            num_predict: options?.max_tokens ?? 512,
          },
          stream: false,
        };

        if (think !== undefined) {
          const isThinkingEnabled = (options as any)?.thinking_enabled !== false;
          generateRequest.think = isThinkingEnabled ? think : false;
        }

        const response: any = await this.client.generate(generateRequest);
        return { response: response.response, thinking: response.thinking };
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || error || '');
        const idx = thinkCandidates.indexOf(think);
        const isLastCandidate = idx === thinkCandidates.length - 1;

        if (!isLastCandidate) {
          console.warn(`[OllamaAdapter] Generate failed (think=${think}), trying next candidate. Error: ${msg.slice(0, 120)}`);
          continue;
        }

        throw new Error(`Ollama generate failed: ${msg}`);
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
