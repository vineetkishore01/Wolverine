export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  generateStream?(request: CompletionRequest): AsyncGenerator<string, void, unknown>;
}
