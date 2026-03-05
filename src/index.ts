// Main exports for Wolverine

// Configuration
export { ConfigManager, getConfig, DEFAULT_CONFIG } from './config/config.js';

// Database
export { JobDatabase, getDatabase } from './db/database.js';

// Agents
export { LLMProvider, ChatMessage, ChatResult, ModelInfo } from './providers/LLMProvider.js';
export { getProvider as getOllamaClient, getPrimaryModel, getModelForRole } from './providers/factory.js';

// Tools
export { getToolRegistry } from './tools/registry.js';
export { shellTool } from './tools/shell.js';
export { readTool, writeTool, editTool, listTool, deleteTool, renameTool, copyTool, mkdirTool, statTool, appendTool } from './tools/files.js';

// Types
export * from './types.js';
