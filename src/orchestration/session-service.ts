import { createHash } from "crypto";

/**
 * SessionService manages unique session identifiers and retrieves session-specific 
 * configuration and personality layers (SOULs).
 */
export class SessionService {
  /**
   * Generates a deterministic session key for any identifier (e.g., Telegram Chat ID).
   * This ensures continuity across different sessions for the same user/channel.
   * @param provider - The name of the channel provider (e.g., "telegram").
   * @param identifier - The unique identifier within that provider (e.g., Chat ID).
   * @returns A truncated SHA-256 hash (12 chars) representing the session key.
   */
  getSessionKey(provider: string, identifier: string): string {
    const raw = `${provider}:${identifier}`;
    return createHash("sha256").update(raw).digest("hex").substring(0, 12);
  }

  /**
   * Resolves the current personality (SOUL) and instructions for a specific session.
   * @param sessionKey - The deterministic key for the session.
   * @returns A promise resolving to the session's configuration object.
   */
  async getMemoryLayerForSession(sessionKey: string) {
    // In later iterations, this will pull from a central Governance API
    return {
      name: "Wolverine",
      instructions: "You are Wolverine, a high-performance agentic AI.",
      approvalsRequired: ["system", "financial"]
    };
  }
}

export const sessionService = new SessionService();
