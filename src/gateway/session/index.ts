/**
 * Session Layer Index
 */

// Re-export from legacy session module
export { getSession, addMessage, getHistory, getWorkspace, setWorkspace, clearHistory, cleanupSessions } from '../session';

// Export new session management
export { getSessionManager, type SessionManager } from './session-manager';
export { createContextEngine, type ContextEngine } from './context-engine';
