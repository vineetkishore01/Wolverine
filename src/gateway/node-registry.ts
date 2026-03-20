import type { ServerWebSocket } from "bun";

/**
 * Represents an active connection session from a node (e.g., a channel like Telegram or a remote tool executor).
 */
export interface NodeSession {
  /** Unique identifier for the node instance */
  nodeId: string;
  /** Unique connection identifier (usually a UUID) */
  connId: string;
  /** The WebSocket connection instance */
  ws: ServerWebSocket<unknown>;
  /** List of functional capabilities this node supports (e.g., ["messaging", "vision"]) */
  capabilities: string[];
  /** Human-readable name for display in logs and UI */
  displayName?: string;
  /** Operating system or platform description */
  platform?: string;
}

/**
 * NodeRegistry maintains a global mapping of all connected nodes.
 * It allows the Gateway to track which agents/channels are online and route messages to them.
 */
export class NodeRegistry {
  private sessions: Map<string, NodeSession> = new Map();

  /**
   * Registers a new node session.
   * @param session - The session details of the connecting node.
   */
  register(session: NodeSession) {
    this.sessions.set(session.connId, session);
    console.log(`[NodeRegistry] Registered node: ${session.displayName || session.nodeId} (${session.connId})`);
  }

  /**
   * Unregisters a node session by its connection ID.
   * @param connId - The unique connection identifier to remove.
   */
  unregister(connId: string) {
    const session = this.sessions.get(connId);
    if (session) {
      this.sessions.delete(connId);
      console.log(`[NodeRegistry] Unregistered node: ${session.connId}`);
    }
  }

  /**
   * Retrieves all currently registered node sessions.
   * @returns An array of active NodeSession objects.
   */
  getAllNodes(): NodeSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Finds a specific node session by its node ID.
   * @param nodeId - The unique node identifier to search for.
   * @returns The matching NodeSession, or undefined if not found.
   */
  findNodeById(nodeId: string): NodeSession | undefined {
    return Array.from(this.sessions.values()).find(s => s.nodeId === nodeId);
  }
}

export const nodeRegistry = new NodeRegistry();
