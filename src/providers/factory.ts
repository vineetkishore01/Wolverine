import type { LLMProvider } from "./types.js";
export type { LLMProvider } from "./types.js";
import { OllamaProvider } from "./ollama.js";
import type { Settings } from "../types/settings.js";

export class ProviderFactory {
  static create(settings: Settings): LLMProvider {
    switch (settings.llm.defaultProvider) {
      case "ollama":
        return new OllamaProvider(settings);
      default:
        throw new Error(`Unsupported provider: ${settings.llm.defaultProvider}`);
    }
  }
}
