/**
 * MCP Auto-Learn System
 * 
 * Automatically discovers, configures, and connects to MCP servers.
 * Phase 4: MCP Auto-Learn
 * 
 * Architecture:
 * - Detect MCP service requests
 * - Research MCP server requirements
 * - Request configuration from user
 * - Write MCP config
 * - Test connection
 * 
 * Works on 4GB GPU (simple detection/config) but improves with larger models.
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config';

export interface MCPConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPDiscoveryResult {
  name: string;
  description: string;
  command: string;
  args?: string[];
  required_env: string[];
  optional_env: string[];
  docs_url: string;
  install_hint?: string;
}

// Known MCP servers that can be auto-configured
export const KNOWN_MCP_SERVERS: Record<string, MCPDiscoveryResult> = {
  'notion': {
    name: 'notion',
    description: 'Notion API integration - read/write pages, databases',
    command: 'npx',
    args: ['-y', '@notionhq/notion-api-mcp'],
    required_env: ['NOTION_API_KEY'],
    optional_env: ['NOTION_ROOT_PAGE_ID'],
    docs_url: 'https://github.com/makenotion/notion-api-mcp'
  },
  'github': {
    name: 'github',
    description: 'GitHub API - issues, PRs, repos',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    required_env: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github'
  },
  'filesystem': {
    name: 'filesystem',
    description: 'File system access - read/write files',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/'],
    required_env: [],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    install_hint: 'Specify the root directory to serve'
  },
  'brave-search': {
    name: 'brave-search',
    description: 'Brave Web Search API',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    required_env: ['BRAVE_API_KEY'],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search'
  },
  'puppeteer': {
    name: 'puppeteer',
    description: 'Browser automation via Puppeteer',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    required_env: [],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer'
  },
  'slack': {
    name: 'slack',
    description: 'Slack messaging API',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    required_env: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack'
  },
  'sqlite': {
    name: 'sqlite',
    description: 'SQLite database access',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    required_env: ['DATABASE_PATH'],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite'
  },
  'aws-kb-retrieval': {
    name: 'aws-kb-retrieval',
    description: 'AWS Knowledge Base retrieval',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-aws-kb-retrieval-server'],
    required_env: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'KB_ID'],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/aws-kb-retrieval'
  },
  'google-maps': {
    name: 'google-maps',
    description: 'Google Maps API - geocoding, directions',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    required_env: ['GOOGLE_MAPS_API_KEY'],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps'
  },
  'fetch': {
    name: 'fetch',
    description: 'HTTP fetch for any URL',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    required_env: [],
    optional_env: [],
    docs_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch'
  }
};

/**
 * Detect MCP server mentions in user message
 */
export function detectMCPRequest(message: string): {
  detected: string[];
  confidence: number;
} {
  const lower = message.toLowerCase();
  const detected: string[] = [];
  
  for (const [key, server] of Object.entries(KNOWN_MCP_SERVERS)) {
    // Direct mention
    if (lower.includes(key) || lower.includes(server.name)) {
      detected.push(key);
      continue;
    }
    
    // Description match
    const descWords = server.description.toLowerCase().split(' ');
    const matches = descWords.filter(w => w.length > 4 && lower.includes(w)).length;
    if (matches >= 2) {
      detected.push(key);
    }
  }
  
  // Pattern matching for MCP-specific requests
  const mcpPatterns = [
    /mcp server/i,
    /connect.*mcp/i,
    /mcp.*notion/i,
    /mcp.*github/i,
    /add.*mcp/i,
    /setup.*mcp/i
  ];
  
  for (const pattern of mcpPatterns) {
    if (pattern.test(lower)) {
      // Try to extract server name
      for (const key of Object.keys(KNOWN_MCP_SERVERS)) {
        if (lower.includes(key) && !detected.includes(key)) {
          detected.push(key);
        }
      }
    }
  }
  
  return {
    detected: [...new Set(detected)],
    confidence: detected.length > 0 ? 0.9 : 0
  };
}

/**
 * Check if MCP server is already configured
 */
export function isMCPConfigured(serverName: string): boolean {
  const config = getConfig().getConfig();
  const mcpConfig = (config as any).mcp?.servers;
  
  if (!mcpConfig) return false;
  
  return !!mcpConfig[serverName];
}

/**
 * Get MCP configuration path
 */
function getMCPConfigPath(): string {
  const config = getConfig().getConfig();
  const configDir = getConfig().getConfigDir();
  return path.join(configDir, 'mcp.json');
}

/**
 * Load existing MCP configuration
 */
export function loadMCPConfig(): Record<string, MCPConfig> {
  const configPath = getMCPConfigPath();
  
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    // Ignore
  }
  
  return {};
}

/**
 * Save MCP configuration
 */
export function saveMCPConfig(config: Record<string, MCPConfig>): void {
  const configPath = getMCPConfigPath();
  
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Add MCP server configuration
 */
export function addMCPServer(serverName: string, config: MCPConfig): void {
  const existing = loadMCPConfig();
  existing[serverName] = config;
  saveMCPConfig(existing);
}

/**
 * Remove MCP server configuration
 */
export function removeMCPServer(serverName: string): void {
  const existing = loadMCPConfig();
  delete existing[serverName];
  saveMCPConfig(existing);
}

/**
 * Generate configuration request message for user
 */
export function generateMCPConfigRequest(detected: string[]): {
  servers: string[];
  message: string;
  required: Record<string, string[]>;
} {
  const required: Record<string, string[]> = {};
  const serverDetails: string[] = [];
  
  for (const serverName of detected) {
    const server = KNOWN_MCP_SERVERS[serverName];
    if (!server) continue;
    
    required[serverName] = server.required_env;
    
    serverDetails.push(`### ${server.name}
- **Description**: ${server.description}
- **Required env vars**: ${server.required_env.join(', ') || 'None'}
- **Docs**: ${server.docs_url}
${server.install_hint ? `- **Note**: ${server.install_hint}` : ''}
`);
  }
  
  const message = `
## MCP Server Detection

I can help you set up the following MCP servers:

${serverDetails.join('\n')}

## What to provide

Please provide the required environment variables (as API keys, tokens, etc.), and I'll configure and connect them for you!

Example format:
\`\`\`
NOTION_API_KEY=your_key_here
GITHUB_TOKEN=your_token_here
\`\`\`
`.trim();
  
  return { servers: detected, message, required };
}

/**
 * Parse user-provided env vars from message
 */
export function parseEnvVarsFromMessage(message: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  
  // Pattern 1: KEY=value on separate lines
  const lines = message.split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2].trim();
    }
  }
  
  // Pattern 2: KEY: value
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*):\s*(.*)$/);
    if (match) {
      envVars[match[1]] = match[2].trim();
    }
  }
  
  return envVars;
}

/**
 * Validate required env vars are provided
 */
export function validateMCPConfig(serverName: string, provided: Record<string, string>): {
  valid: boolean;
  missing: string[];
  extra: string[];
} {
  const server = KNOWN_MCP_SERVERS[serverName];
  
  if (!server) {
    return { valid: false, missing: [], extra: [] };
  }
  
  const providedKeys = Object.keys(provided);
  const missing = server.required_env.filter(e => !providedKeys.includes(e));
  const extra = providedKeys.filter(e => !server.required_env.includes(e) && !server.optional_env.includes(e));
  
  return {
    valid: missing.length === 0,
    missing,
    extra
  };
}

/**
 * Configure MCP server with user-provided values
 */
export async function configureMCP(
  serverName: string,
  envVars: Record<string, string>
): Promise<{
  success: boolean;
  message: string;
  config?: MCPConfig;
}> {
  const server = KNOWN_MCP_SERVERS[serverName];
  
  if (!server) {
    return { success: false, message: `Unknown MCP server: ${serverName}` };
  }
  
  // Validate
  const validation = validateMCPConfig(serverName, envVars);
  
  if (!validation.valid) {
    return {
      success: false,
      message: `Missing required env vars: ${validation.missing.join(', ')}`
    };
  }
  
  // Build config
  const config: MCPConfig = {
    name: serverName,
    command: server.command,
    args: server.args,
    env: envVars
  };
  
  // Save
  try {
    addMCPServer(serverName, config);
    
    return {
      success: true,
      message: `MCP server "${serverName}" configured successfully!`,
      config
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to configure: ${error.message}`
    };
  }
}

/**
 * Format all known MCP servers for context
 */
export function formatKnownMCPServers(): string {
  const parts = ['# Available MCP Servers'];
  
  for (const [key, server] of Object.entries(KNOWN_MCP_SERVERS)) {
    const status = isMCPConfigured(key) ? '✅' : '❌';
    parts.push(`\n${status} **${server.name}**`);
    parts.push(`   ${server.description}`);
    parts.push(`   Required: ${server.required_env.join(', ') || 'none'}`);
  }
  
  return parts.join('\n');
}

/**
 * Get all configured MCP servers
 */
export function getConfiguredMCPs(): string[] {
  const config = loadMCPConfig();
  return Object.keys(config);
}
