/**
 * Capability Scanner
 * 
 * Dynamically discovers what Wolverine CAN do at runtime.
 * This is the foundation for self-awareness - Wolverine knows its own capabilities.
 * 
 * Now TRULY DYNAMIC - reads from actual ToolRegistry!
 * 
 * For Phase 2: Self-Query Engine foundation
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config';
import { getToolRegistry, Tool } from '../tools/registry';

export interface Capability {
  name: string;
  category: 'tool' | 'skill' | 'mcp' | 'channel' | 'model';
  description: string;
  provider?: string;
  status: 'available' | 'configured' | 'requires_config';
  config_needed?: string[];
}

export interface CapabilityMap {
  tools: Capability[];
  skills: Capability[];
  mcp: Capability[];
  channels: Capability[];
  models: Capability[];
  total: number;
  timestamp: number;
}

/**
 * Scan all available tools from ACTUAL registry (TRULY DYNAMIC!)
 */
function scanTools(): Capability[] {
  const capabilities: Capability[] = [];
  const config = getConfig().getConfig();

  try {
    // Get the actual tool registry
    const registry = getToolRegistry();
    const allTools = registry.list(); // Correct method is list(), not getAllTools()

    for (const tool of allTools) {
      let status: Capability['status'] = 'available';
      let config_needed: string[] | undefined = undefined;

      // Special handling for tools that require configuration
      if (tool.name === 'web_search') {
        const hasKey = config.search?.tavily_api_key ||
          config.search?.brave_api_key ||
          config.search?.google_api_key;
        status = hasKey ? 'configured' : 'requires_config';
        if (!hasKey) config_needed = ['Tavily, Brave, or Google API Key'];
      }

      capabilities.push({
        name: tool.name,
        category: 'tool',
        description: tool.description || 'Tool from registry',
        provider: 'registry',
        status,
        config_needed
      });
    }
  } catch (error) {
    console.warn('[CapabilityScanner] Failed to read from registry:', error);

    // Fallback if registry fails (though it shouldn't as it's a singleton)
    const fallbackTools = [
      { name: 'read', desc: 'Read file contents' },
      { name: 'write', desc: 'Write new file' },
      { name: 'edit', desc: 'Edit existing file' },
      { name: 'shell', desc: 'Run shell commands' },
      { name: 'web_search', desc: 'Search the web' },
    ];

    for (const tool of fallbackTools) {
      capabilities.push({
        name: tool.name,
        category: 'tool',
        description: tool.desc,
        provider: 'fallback',
        status: 'available'
      });
    }
  }

  return capabilities;
}


/**
 * Scan all available skills
 */
async function scanSkills(): Promise<Capability[]> {
  const capabilities: Capability[] = [];
  const config = getConfig().getConfig();
  const skillsDir = (config as any).skills?.directory;

  if (!skillsDir) return capabilities;

  const skillsPath = path.resolve(skillsDir);

  if (!fs.existsSync(skillsPath)) return capabilities;

  try {
    const entries = fs.readdirSync(skillsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(skillsPath, entry.name);
      const skillMd = path.join(skillDir, 'SKILL.md');

      if (!fs.existsSync(skillMd)) continue;

      // Read SKILL.md for description
      let description = 'Custom skill';
      try {
        const content = fs.readFileSync(skillMd, 'utf-8');
        const lines = content.split('\n');
        // First non-empty line is often the description
        for (const line of lines.slice(1, 10)) {
          if (line.trim() && !line.startsWith('#')) {
            description = line.slice(0, 100);
            break;
          }
        }
      } catch {
        // Ignore
      }

      capabilities.push({
        name: entry.name,
        category: 'skill',
        description,
        provider: 'skill-system',
        status: 'available'
      });
    }
  } catch {
    // Ignore errors
  }

  return capabilities;
}

/**
 * Scan MCP servers
 */
async function scanMCP(): Promise<Capability[]> {
  const capabilities: Capability[] = [];
  const config = getConfig().getConfig();
  const mcpConfig = (config as any).mcp;

  if (!mcpConfig?.servers) return capabilities;

  for (const [name, serverConfig] of Object.entries(mcpConfig.servers as Record<string, any>)) {
    capabilities.push({
      name: `mcp_${name}`,
      category: 'mcp',
      description: `MCP server: ${name}`,
      provider: 'mcp',
      status: 'available',
      config_needed: serverConfig?.command ? undefined : ['command', 'args']
    });
  }

  return capabilities;
}

/**
 * Scan communication channels
 */
function scanChannels(): Capability[] {
  const capabilities: Capability[] = [];
  const config = getConfig().getConfig();

  // Web (always available)
  capabilities.push({
    name: 'web_channel',
    category: 'channel',
    description: 'Web UI chat interface',
    provider: 'builtin',
    status: 'available'
  });

  // Telegram
  if ((config as any).telegram?.enabled) {
    capabilities.push({
      name: 'telegram',
      category: 'channel',
      description: 'Telegram messaging',
      provider: 'telegram',
      status: 'configured'
    });
  } else {
    capabilities.push({
      name: 'telegram',
      category: 'channel',
      description: 'Telegram messaging',
      provider: 'telegram',
      status: 'requires_config',
      config_needed: ['bot_token']
    });
  }

  // Discord
  if ((config as any).discord?.enabled) {
    capabilities.push({
      name: 'discord',
      category: 'channel',
      description: 'Discord messaging',
      provider: 'discord',
      status: 'configured'
    });
  } else {
    capabilities.push({
      name: 'discord',
      category: 'channel',
      description: 'Discord messaging',
      provider: 'discord',
      status: 'requires_config',
      config_needed: ['bot_token']
    });
  }

  return capabilities;
}

/**
 * Scan available models
 */
function scanModels(): Capability[] {
  const capabilities: Capability[] = [];
  const config = getConfig().getConfig();
  const provider = config.llm?.provider;

  // Ollama (local)
  if (provider === 'ollama') {
    capabilities.push({
      name: 'ollama',
      category: 'model',
      description: 'Local Ollama models (Qwen, Llama, etc.)',
      provider: 'ollama',
      status: 'configured'
    });
  }

  // OpenAI
  if ((config as any).openai?.api_key) {
    capabilities.push({
      name: 'openai',
      category: 'model',
      description: 'OpenAI GPT models',
      provider: 'openai',
      status: 'configured'
    });
  } else {
    capabilities.push({
      name: 'openai',
      category: 'model',
      description: 'OpenAI GPT models',
      provider: 'openai',
      status: 'requires_config',
      config_needed: ['api_key']
    });
  }

  return capabilities;
}

/**
 * Main scanner - discovers all capabilities
 */
export async function scanAllCapabilities(): Promise<CapabilityMap> {
  const tools = scanTools();
  const skills = await scanSkills();
  const mcp = await scanMCP();
  const channels = scanChannels();
  const models = scanModels();

  return {
    tools,
    skills,
    mcp,
    channels,
    models,
    total: tools.length + skills.length + mcp.length + channels.length + models.length,
    timestamp: Date.now()
  };
}

/**
 * Format capabilities for LLM context
 */
export function formatCapabilitiesForLLM(capabilities: CapabilityMap): string {
  const sections: string[] = ['# My Capabilities'];

  // Tools
  const availableTools = capabilities.tools.filter(t => t.status === 'available' || t.status === 'configured');
  sections.push(`\n## Tools (${availableTools.length})`);
  for (const tool of availableTools.slice(0, 20)) {
    sections.push(`- \`${tool.name}\`: ${tool.description}`);
    if (tool.status === 'requires_config') {
      sections.push(`  ⚠️ Needs: ${tool.config_needed?.join(', ')}`);
    }
  }

  // Skills
  if (capabilities.skills.length > 0) {
    sections.push(`\n## Skills (${capabilities.skills.length})`);
    for (const skill of capabilities.skills) {
      sections.push(`- \`${skill.name}\`: ${skill.description}`);
    }
  }

  // MCP
  if (capabilities.mcp.length > 0) {
    sections.push(`\n## MCP Servers (${capabilities.mcp.length})`);
    for (const m of capabilities.mcp) {
      sections.push(`- \`${m.name}\`: ${m.description}`);
    }
  }

  // Channels
  sections.push(`\n## Channels (${capabilities.channels.filter(c => c.status === 'configured').length} active)`);
  for (const channel of capabilities.channels) {
    const status = channel.status === 'configured' ? '✅' : '⚠️';
    sections.push(`- ${status} \`${channel.name}\`: ${channel.description}`);
  }

  sections.push(`\n**Total: ${capabilities.total} capabilities**`);

  return sections.join('\n');
}

/**
 * Check if a capability exists
 */
export async function hasCapability(name: string): Promise<boolean> {
  const caps = await scanAllCapabilities();

  return [
    ...caps.tools,
    ...caps.skills,
    ...caps.mcp,
    ...caps.channels,
    ...caps.models
  ].some(c => c.name === name);
}

/**
 * Get capability details
 */
export async function getCapabilityDetails(name: string): Promise<Capability | null> {
  const caps = await scanAllCapabilities();

  const all = [...caps.tools, ...caps.skills, ...caps.mcp, ...caps.channels, ...caps.models];
  return all.find(c => c.name === name) || null;
}
