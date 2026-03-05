/**
 * Service Auto-Config
 * 
 * Detects when user mentions a service (Tavily, Notion, GitHub, etc.)
 * and helps configure it automatically.
 * 
 * For Phase 3: Service Auto-Config
 */

import { getConfig } from '../config/config';

export interface ServiceConfig {
  name: string;
  display_name: string;
  description: string;
  required_keys: ConfigField[];
  optional_keys: ConfigField[];
  mcp_server?: string;
  docs_url?: string;
}

export interface ConfigField {
  key: string;
  display_name: string;
  description: string;
  env_var?: string;
}

export interface DetectedService {
  service: ServiceConfig;
  confidence: number;
  context: string;
}

export interface ConfigRequest {
  service: string;
  needed: string[];
  user_message: string;
}

// Known services that can be auto-configured
export const KNOWN_SERVICES: Record<string, ServiceConfig> = {
  tavily: {
    name: 'tavily',
    display_name: 'Tavily',
    description: 'AI-powered web search with semantic understanding',
    required_keys: [
      { key: 'tavily_api_key', display_name: 'Tavily API Key', description: 'Get from tavily.com', env_var: 'TAVILY_API_KEY' }
    ],
    optional_keys: [],
    docs_url: 'https://tavily.com'
  },
  notion: {
    name: 'notion',
    display_name: 'Notion',
    description: 'Connect to Notion for workspace integration',
    required_keys: [
      { key: 'notion_api_key', display_name: 'Notion API Key', description: 'Notion integration token', env_var: 'NOTION_API_KEY' },
      { key: 'notion_root_page_id', display_name: 'Root Page ID', description: 'Notion page ID to use as root' }
    ],
    optional_keys: [],
    mcp_server: 'notion',
    docs_url: 'https://developers.notion.com'
  },
  github: {
    name: 'github',
    display_name: 'GitHub',
    description: 'GitHub integration for repositories, issues, PRs',
    required_keys: [
      { key: 'github_token', display_name: 'GitHub Token', description: 'Personal access token', env_var: 'GITHUB_TOKEN' }
    ],
    optional_keys: [],
    mcp_server: 'github',
    docs_url: 'https://github.com'
  },
  slack: {
    name: 'slack',
    display_name: 'Slack',
    description: 'Send messages to Slack channels',
    required_keys: [
      { key: 'slack_bot_token', display_name: 'Slack Bot Token', description: 'Slack bot token', env_var: 'SLACK_BOT_TOKEN' },
      { key: 'slack_channel', display_name: 'Default Channel', description: 'Channel ID to post to' }
    ],
    optional_keys: [],
    docs_url: 'https://api.slack.com'
  },
  discord: {
    name: 'discord',
    display_name: 'Discord',
    description: 'Discord bot for messaging',
    required_keys: [
      { key: 'discord_bot_token', display_name: 'Discord Bot Token', description: 'Get from Discord Developer Portal', env_var: 'DISCORD_BOT_TOKEN' }
    ],
    optional_keys: [],
    docs_url: 'https://discord.com/developers'
  },
  telegram: {
    name: 'telegram',
    display_name: 'Telegram',
    description: 'Telegram bot for messaging',
    required_keys: [
      { key: 'telegram_bot_token', display_name: 'Telegram Bot Token', description: 'Get from @BotFather', env_var: 'TELEGRAM_BOT_TOKEN' }
    ],
    optional_keys: [],
    docs_url: 'https://core.telegram.org'
  },
  brave: {
    name: 'brave',
    display_name: 'Brave Search',
    description: 'Privacy-focused web search',
    required_keys: [
      { key: 'brave_api_key', display_name: 'Brave API Key', description: 'Get from brave.com/search/api', env_var: 'BRAVE_API_KEY' }
    ],
    optional_keys: [],
    docs_url: 'https://brave.com'
  },
  google: {
    name: 'google',
    display_name: 'Google Custom Search',
    description: 'Google search API',
    required_keys: [
      { key: 'google_api_key', display_name: 'Google API Key', description: 'Get from Google Cloud Console', env_var: 'GOOGLE_API_KEY' },
      { key: 'google_cx', display_name: 'Search Engine ID', description: 'Custom Search Engine ID', env_var: 'GOOGLE_CX' }
    ],
    optional_keys: [],
    docs_url: 'https://developers.google.com/custom-search'
  },
  openai: {
    name: 'openai',
    display_name: 'OpenAI',
    description: 'GPT models for reasoning',
    required_keys: [
      { key: 'openai_api_key', display_name: 'OpenAI API Key', description: 'Get from platform.openai.com', env_var: 'OPENAI_API_KEY' }
    ],
    optional_keys: [
      { key: 'openai_model', display_name: 'Model', description: 'gpt-4, gpt-4-turbo, etc.', env_var: 'OPENAI_MODEL' }
    ],
    docs_url: 'https://platform.openai.com'
  },
  anthropic: {
    name: 'anthropic',
    display_name: 'Anthropic (Claude)',
    description: 'Claude models for reasoning',
    required_keys: [
      { key: 'anthropic_api_key', display_name: 'Anthropic API Key', description: 'Get from console.anthropic.com', env_var: 'ANTHROPIC_API_KEY' }
    ],
    optional_keys: [],
    docs_url: 'https://console.anthropic.com'
  }
};

/**
 * Detect service mentions in user message
 */
export function detectServices(message: string): DetectedService[] {
  const lower = message.toLowerCase();
  const detected: DetectedService[] = [];
  
  for (const [key, service] of Object.entries(KNOWN_SERVICES)) {
    // Direct mention
    if (lower.includes(key)) {
      detected.push({
        service,
        confidence: 1.0,
        context: `Direct mention: "${key}"`
      });
      continue;
    }
    
    // Fuzzy match on display name
    if (lower.includes(service.display_name.toLowerCase())) {
      detected.push({
        service,
        confidence: 0.9,
        context: `Display name match: "${service.display_name}"`
      });
      continue;
    }
    
    // Common synonyms
    const synonyms: Record<string, string[]> = {
      tavily: ['tavily', 'ai search', 'semantic search'],
      notion: ['notion', 'notion api', 'notion integration'],
      github: ['github', 'git hub', 'gh '],
      slack: ['slack', 'slack bot'],
      discord: ['discord', 'discord bot'],
      telegram: ['telegram', 'telegram bot'],
      brave: ['brave search', 'brave'],
      google: ['google search', 'google api'],
      openai: ['openai', 'gpt', 'chatgpt'],
      anthropic: ['anthropic', 'claude', 'anthropic api']
    };
    
    const syns = synonyms[key] || [];
    for (const syn of syns) {
      if (lower.includes(syn) && key !== syn) {
        detected.push({
          service,
          confidence: 0.7,
          context: `Synonym match: "${syn}"`
        });
        break;
      }
    }
  }
  
  return detected.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Check if service is already configured
 */
export function isServiceConfigured(serviceName: string): boolean {
  const config = getConfig().getConfig();
  
  switch (serviceName.toLowerCase()) {
    case 'tavily':
      return !!(config as any).search?.tavily_api_key;
    case 'brave':
      return !!(config as any).search?.brave_api_key;
    case 'google':
      return !!(config as any).search?.google_api_key;
    case 'openai':
      return !!(config as any).openai?.api_key;
    case 'anthropic':
      return !!(config as any).anthropic?.api_key;
    case 'telegram':
      return !!(config as any).telegram?.enabled;
    case 'discord':
      return !!(config as any).discord?.enabled;
    case 'notion':
    case 'github':
    case 'slack':
      // Check MCP config
      return !!((config as any).mcp?.servers || {})[serviceName];
    default:
      return false;
  }
}

/**
 * Generate config request for user
 */
export function generateConfigRequest(detected: DetectedService[]): ConfigRequest[] {
  const requests: ConfigRequest[] = [];
  
  for (const det of detected) {
    // Skip if already configured
    if (isServiceConfigured(det.service.name)) {
      continue;
    }
    
    const needed = det.service.required_keys.map(k => k.display_name);
    
    const user_message = [
      `I can help you connect to **${det.service.display_name}**!`,
      ``,
      `**What it does:** ${det.service.description}`,
      ``,
      `**Required:**`,
      ...det.service.required_keys.map(k => `  - ${k.display_name}: ${k.description}`),
      ``,
      det.service.docs_url ? `**Docs:** ${det.service.docs_url}` : '',
      ``,
      `Please provide the required keys/values, and I'll configure it for you!`
    ].filter(Boolean).join('\n');
    
    requests.push({
      service: det.service.name,
      needed,
      user_message
    });
  }
  
  return requests;
}

/**
 * Format service capabilities for context
 */
export function formatKnownServices(): string {
  const parts = [
    '# Available Service Integrations',
    ''
  ];
  
  for (const [key, service] of Object.entries(KNOWN_SERVICES)) {
    const status = isServiceConfigured(key) ? '✅' : '❌';
    parts.push(`${status} **${service.display_name}** - ${service.description}`);
    parts.push(`   Required: ${service.required_keys.map(k => k.display_name).join(', ')}`);
    parts.push('');
  }
  
  return parts.join('\n');
}

/**
 * Check if message is asking to configure a service
 */
export function isConfigurationRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const patterns = [
    /connect to/i,
    /set up/i,
    /configure/i,
    /integrate/i,
    /api key/i,
    /add.*service/i,
    /enable.*\w+/i
  ];
  
  return patterns.some(p => p.test(lower));
}
