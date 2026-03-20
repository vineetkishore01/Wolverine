/**
 * Represents a single message in a conversation.
 */
export interface Message {
  /** The role of the message sender */
  role: "system" | "user" | "assistant";
  /** The text content of the message */
  content: string;
}

/**
 * Parameters for requesting a completion from an LLM.
 */
export interface CompletionRequest {
  /** The name of the model to use */
  model: string;
  /** The conversation history to provide as context */
  messages: Message[];
  /** Sampling temperature (typically 0.0 to 1.0) */
  temperature?: number;
  /** Whether to stream the response */
  stream?: boolean;
}

/**
 * The response returned by an LLM provider after a completion request.
 */
export interface CompletionResponse {
  /** The generated text content */
  content: string;
  /** The name of the model that generated the response */
  model: string;
  /** Token usage statistics if available */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Common interface for all Large Language Model providers.
 */
export interface LLMProvider {
  /** The unique name of the provider (e.g., "ollama", "openai") */
  name: string;
  /**
   * Generates a non-streaming completion.
   * @param request - The completion parameters.
   * @returns A promise resolving to the full completion response.
   */
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  /**
   * Generates a streaming completion.
   * @param request - The completion parameters.
   * @yields String chunks of the generated content.
   */
  generateStream?(request: CompletionRequest): AsyncGenerator<string, void, unknown>;
}
