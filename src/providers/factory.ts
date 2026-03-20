import type { LLMProvider } from "./types.js";
export type { LLMProvider } from "./types.js";
import { OllamaProvider } from "./ollama.js";
import type { Settings } from "../types/settings.js";

/**
 * ProviderFactory is responsible for instantiating the correct LLM provider
 * based on the system configuration.
 */
export class ProviderFactory {
  /**
   * Creates an instance of an LLM provider.
   * @param settings - The system settings containing provider configuration.
   * @returns An implementation of the LLMProvider interface.
   * @throws Error if the configured provider is unsupported.
   */
  static create(settings: Settings): LLMProvider {
    switch (settings.llm.defaultProvider) {
      case "ollama":
        return new OllamaProvider(settings);
      default:
        throw new Error(`Unsupported provider: ${settings.llm.defaultProvider}`);
    }
  }
}
