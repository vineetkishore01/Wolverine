import type { ServerWebSocket } from "bun";

export interface NodeSession {
  nodeId: string;
  connId: string;
  ws: ServerWebSocket<unknown>;
  capabilities: string[];
  displayName?: string;
  platform?: string;
}

export class NodeRegistry {
  private sessions: Map<string, NodeSession> = new Map();

  register(session: NodeSession) {
    this.sessions.set(session.connId, session);
    console.log(`[NodeRegistry] Registered node: ${session.displayName || session.nodeId} (${session.connId})`);
  }

  unregister(connId: string) {
    const session = this.sessions.get(connId);
    if (session) {
      this.sessions.delete(connId);
      console.log(`[NodeRegistry] Unregistered node: ${session.connId}`);
    }
  }

  getAllNodes(): NodeSession[] {
    return Array.from(this.sessions.values());
  }

  findNodeById(nodeId: string): NodeSession | undefined {
    return Array.from(this.sessions.values()).find(s => s.nodeId === nodeId);
  }
}

export const nodeRegistry = new NodeRegistry();
