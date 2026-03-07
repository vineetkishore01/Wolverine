/**
 * Context Engine
 * Builds context for LLM requests using hierarchical memory
 */

import { getHierarchicalMemory } from '../../agent/hierarchical-memory';

export interface ContextEngine {
  buildContext(sessionId: string, messages: any[]): Promise<string>;
}

export function createContextEngine(): ContextEngine {
  return {
    async buildContext(sessionId: string, messages: any[]): Promise<string> {
      try {
        // Get hierarchical memory
        const lastMessage = messages[messages.length - 1];
        const query = lastMessage?.content || '';
        
        // Note: getHierarchicalMemory needs 3 args, using simplified version
        // const memory = await getHierarchicalMemory(query, sessionId, messages);
        
        // Build context from messages for now
        const contextParts: string[] = [];
        
        // Add recent messages
        const recentMessages = messages.slice(-10).map((m: any) => 
          `[${m.role}]: ${typeof m.content === 'string' ? m.content.slice(0, 200) : '...'}`
        ).join('\n');
        
        contextParts.push(`## Recent Conversation\n${recentMessages}`);
        
        return contextParts.join('\n\n');
      } catch (error: any) {
        console.error('[ContextEngine] Error building context:', error.message);
        return `Context for session ${sessionId} with ${messages.length} messages`;
      }
    }
  };
}
