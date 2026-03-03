/**
 * skill-connector.ts - Intelligent Skill Connection System
 * 
 * Allows the agent to dynamically connect to services based on user input.
 * Instead of manual configuration, the agent asks for required credentials
 * and automatically sets up the skill.
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config';

export interface SkillRequirement {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'password' | 'url' | 'number';
  required: boolean;
  placeholder?: string;
}

export interface SkillConnector {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'productivity' | 'communication' | 'development' | 'automation' | 'data';
  requirements: SkillRequirement[];
  setupScript?: (credentials: Record<string, string>) => Record<string, any>;
}

const SKILL_CONNECTORS: SkillConnector[] = [
  {
    id: 'email',
    name: 'Email',
    description: 'Read, send, and manage emails via IMAP/Gmail',
    emoji: '📧',
    category: 'communication',
    requirements: [
      { key: 'imap_host', label: 'IMAP Host', description: 'e.g. imap.gmail.com', type: 'string', required: true, placeholder: 'imap.gmail.com' },
      { key: 'imap_port', label: 'IMAP Port', description: 'Usually 993 for Gmail', type: 'number', required: true, placeholder: '993' },
      { key: 'email_user', label: 'Email Address', description: 'Your email address', type: 'string', required: true },
      { key: 'email_password', label: 'App Password', description: 'Use app password for Gmail, not your regular password', type: 'password', required: true },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repositories, issues, pull requests, and actions',
    emoji: '🐙',
    category: 'development',
    requirements: [
      { key: 'github_token', label: 'Personal Access Token', description: 'GitHub token with repo scope', type: 'password', required: true },
    ],
  },
  {
    id: 'gmail_oauth',
    name: 'Gmail (OAuth)',
    description: 'Access Gmail via Google OAuth for full API access',
    emoji: '📬',
    category: 'communication',
    requirements: [
      { key: 'gmail_client_id', label: 'Google Client ID', description: 'From Google Cloud Console', type: 'string', required: true },
      { key: 'gmail_client_secret', label: 'Google Client Secret', description: 'From Google Cloud Console', type: 'password', required: true },
      { key: 'gmail_refresh_token', label: 'Refresh Token', description: 'Obtained via OAuth flow', type: 'password', required: false },
    ],
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Schedule meetings, check availability, manage events',
    emoji: '📅',
    category: 'productivity',
    requirements: [
      { key: 'calendar_client_id', label: 'Google Client ID', description: 'From Google Cloud Console', type: 'string', required: true },
      { key: 'calendar_client_secret', label: 'Google Client Secret', description: 'From Google Cloud Console', type: 'password', required: true },
      { key: 'calendar_refresh_token', label: 'Refresh Token', description: 'Obtained via OAuth flow', type: 'password', required: false },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    description: 'Send and receive messages via Telegram',
    emoji: '✈️',
    category: 'communication',
    requirements: [
      { key: 'telegram_bot_token', label: 'Bot Token', description: 'Get from @BotFather on Telegram', type: 'password', required: true },
      { key: 'telegram_chat_id', label: 'Chat ID', description: 'Your Telegram chat ID', type: 'string', required: false },
    ],
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    description: 'Send and receive messages via Discord',
    emoji: '💬',
    category: 'communication',
    requirements: [
      { key: 'discord_bot_token', label: 'Bot Token', description: 'From Discord Developer Portal', type: 'password', required: true },
      { key: 'discord_channel_id', label: 'Channel ID', description: 'The channel to post to', type: 'string', required: false },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages to Slack channels',
    emoji: '💼',
    category: 'communication',
    requirements: [
      { key: 'slack_webhook_url', label: 'Webhook URL', description: 'Incoming webhook URL from Slack', type: 'url', required: true },
      { key: 'slack_bot_token', label: 'Bot Token', description: 'For sending messages (optional if using webhook)', type: 'password', required: false },
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Read and write Notion pages and databases',
    emoji: '📝',
    category: 'productivity',
    requirements: [
      { key: 'notion_token', label: 'Integration Token', description: 'From notion.so/profile/integrations', type: 'password', required: true },
    ],
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Query databases (PostgreSQL, MySQL, SQLite)',
    emoji: '🗄️',
    category: 'data',
    requirements: [
      { key: 'db_type', label: 'Database Type', description: 'postgresql, mysql, or sqlite', type: 'string', required: true, placeholder: 'postgresql' },
      { key: 'db_connection', label: 'Connection String', description: 'e.g. postgresql://user:pass@localhost:5432/db', type: 'string', required: true },
    ],
  },
  {
    id: 'mcp',
    name: 'MCP Server',
    description: 'Connect to any MCP (Model Context Protocol) server',
    emoji: '🔌',
    category: 'development',
    requirements: [
      { key: 'mcp_url', label: 'Server URL', description: 'HTTP/SSE URL of the MCP server', type: 'url', required: true },
      { key: 'mcp_token', label: 'Auth Token', description: 'Bearer token if required', type: 'password', required: false },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    description: 'Use OpenAI models for enhanced capabilities',
    emoji: '🤖',
    category: 'development',
    requirements: [
      { key: 'openai_api_key', label: 'API Key', description: 'From platform.openai.com', type: 'password', required: true },
    ],
  },
  {
    id: 'tavily',
    name: 'Tavily Search',
    description: 'Enhanced web search with AI summaries',
    emoji: '🔍',
    category: 'automation',
    requirements: [
      { key: 'tavily_api_key', label: 'API Key', description: 'From tavily.com', type: 'password', required: true },
    ],
  },
  {
    id: 'brave',
    name: 'Brave Search',
    description: 'Web search via Brave API',
    emoji: '🦁',
    category: 'automation',
    requirements: [
      { key: 'brave_api_key', label: 'API Key', description: 'From brave.com/search/api', type: 'password', required: true },
    ],
  },
  {
    id: 'smart_home',
    name: 'Smart Home',
    description: 'Control smart home devices via Home Assistant',
    emoji: '🏠',
    category: 'automation',
    requirements: [
      { key: 'ha_url', label: 'Home Assistant URL', description: 'e.g. http://homeassistant.local:8123', type: 'url', required: true },
      { key: 'ha_token', label: 'Long-Lived Access Token', description: 'From Home Assistant Profile', type: 'password', required: true },
    ],
  },
  {
    id: 'image_gen',
    name: 'Image Generation',
    description: 'Generate images using DALL-E or Stable Diffusion',
    emoji: '🎨',
    category: 'automation',
    requirements: [
      { key: 'image_provider', label: 'Provider', description: 'openai, stability, or local', type: 'string', required: true, placeholder: 'openai' },
      { key: 'image_api_key', label: 'API Key', description: 'Provider API key', type: 'password', required: true },
    ],
  },
];

export class SkillConnectorManager {
  private configPath: string;

  constructor() {
    const cfg = getConfig();
    this.configPath = path.join(cfg.getConfigDir(), 'skill-connectors.json');
  }

  getAvailableConnectors(): SkillConnector[] {
    return SKILL_CONNECTORS;
  }

  getConnector(id: string): SkillConnector | undefined {
    return SKILL_CONNECTORS.find(c => c.id === id);
  }

  listConnectors(): Array<{ id: string; name: string; emoji: string; category: string; description: string }> {
    return SKILL_CONNECTORS.map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      category: c.category,
      description: c.description,
    }));
  }

  getConnectedServices(): Record<string, any> {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      }
    } catch {}
    return {};
  }

  getRequirementsForConnector(connectorId: string): SkillRequirement[] | null {
    const connector = this.getConnector(connectorId);
    return connector?.requirements || null;
  }

  connect(connectorId: string, credentials: Record<string, string>): { success: boolean; message: string } {
    const connector = this.getConnector(connectorId);
    if (!connector) {
      return { success: false, message: `Unknown connector: ${connectorId}` };
    }

    // Validate required credentials
    const missing: string[] = [];
    for (const req of connector.requirements) {
      if (req.required && !credentials[req.key]) {
        missing.push(req.label);
      }
    }

    if (missing.length > 0) {
      return { success: false, message: `Missing required credentials: ${missing.join(', ')}` };
    }

    // Save credentials
    const connected = this.getConnectedServices();
    connected[connectorId] = {
      ...credentials,
      connectedAt: new Date().toISOString(),
    };
    
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(connected, null, 2));

    return { success: true, message: `${connector.emoji} ${connector.name} connected successfully!` };
  }

  disconnect(connectorId: string): boolean {
    const connected = this.getConnectedServices();
    if (connected[connectorId]) {
      delete connected[connectorId];
      fs.writeFileSync(this.configPath, JSON.stringify(connected, null, 2));
      return true;
    }
    return false;
  }

  isConnected(connectorId: string): boolean {
    const connected = this.getConnectedServices();
    return !!connected[connectorId];
  }

  getConnectedList(): Array<{ id: string; name: string; emoji: string; connectedAt?: string }> {
    const connected = this.getConnectedServices();
    return SKILL_CONNECTORS
      .filter(c => connected[c.id])
      .map(c => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        connectedAt: connected[c.id].connectedAt,
      }));
  }

  getCredentials(connectorId: string): Record<string, string> | null {
    const connected = this.getConnectedServices();
    const creds = connected[connectorId];
    if (!creds) return null;
    
    // Remove metadata
    const { connectedAt, ...credentials } = creds;
    return credentials;
  }
}

let connectorManager: SkillConnectorManager | null = null;

export function getSkillConnectorManager(): SkillConnectorManager {
  if (!connectorManager) {
    connectorManager = new SkillConnectorManager();
  }
  return connectorManager;
}
