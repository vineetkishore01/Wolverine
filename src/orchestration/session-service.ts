import { createHash } from "crypto";

export class SessionService {
  /**
   * Generates a deterministic session key for any identifier (e.g., Telegram Chat ID)
   * This is the 'Secret Sauce' from OpenClaw MC for multi-user continuity.
   */
  getSessionKey(provider: string, identifier: string): string {
    const raw = `${provider}:${identifier}`;
    return createHash("sha256").update(raw).digest("hex").substring(0, 12);
  }

  /**
   * Resolves the current personality (SOUL) for a session
   */
  async getSoulForSession(sessionKey: string) {
    // In later iterations, this will pull from a central Governance API
    return {
      name: "Wolverine",
      instructions: "You are Wolverine, a high-performance agentic AI.",
      approvalsRequired: ["system", "financial"]
    };
  }
}

export const sessionService = new SessionService();
