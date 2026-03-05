import { Tool } from './registry';
import { ToolResult } from '../types';
import { getConfig } from '../config/config';

/**
 * Known API key patterns and their corresponding config paths
 */
const API_KEY_PATTERNS: Array<{
    pattern: RegExp;
    configPath: string;
    displayName: string;
}> = [
    {
        pattern: /^tvly-[a-zA-Z0-9]{20,}$/,
        configPath: 'search.tavily_api_key',
        displayName: 'Tavily',
    },
    {
        pattern: /^AIza[a-zA-Z0-9_-]{35,}$/,
        configPath: 'search.google_api_key',
        displayName: 'Google Search',
    },
    {
        pattern: /^sk-[a-zA-Z0-9]{20,}$/,
        configPath: 'providers.openai.api_key',
        displayName: 'OpenAI',
    },
    {
        pattern: /^sk-ant-[a-zA-Z0-9_-]{50,}$/,
        configPath: 'providers.anthropic.api_key',
        displayName: 'Anthropic',
    },
    {
        pattern: /^Brave\.[a-zA-Z0-9_-]{20,}$/,
        configPath: 'search.brave_api_key',
        displayName: 'Brave Search',
    },
    {
        pattern: /^(ghp_|github_pat_)[a-zA-Z0-9_]{36,}$/,
        configPath: 'services.github.token',
        displayName: 'GitHub',
    },
    {
        pattern: /^[0-9]{8,10}:[a-zA-Z0-9_-]{35,}$/,
        configPath: 'telegram.bot_token',
        displayName: 'Telegram Bot',
    },
    {
        pattern: /^M[TY][a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27,}$/,
        configPath: 'discord.bot_token',
        displayName: 'Discord Bot',
    },
];

export function detectApiKey(key: string): { configPath: string; displayName: string } | null {
    const trimmed = key.trim();
    for (const entry of API_KEY_PATTERNS) {
        if (entry.pattern.test(trimmed)) {
            return { configPath: entry.configPath, displayName: entry.displayName };
        }
    }
    return null;
}

async function validateApiKey(service: string, key: string): Promise<{ valid: boolean; message: string }> {
    try {
        switch (service) {
            case 'Tavily': {
                const res = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: 'test', api_key: key, max_results: 1 }),
                    signal: AbortSignal.timeout(10000)
                });
                return { valid: res.ok, message: res.ok ? 'API key is valid!' : `API returned ${res.status}` };
            }
            case 'OpenAI': {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${key}` },
                    signal: AbortSignal.timeout(10000)
                });
                return { valid: res.ok, message: res.ok ? 'API key is valid!' : `API returned ${res.status}` };
            }
            case 'GitHub': {
                const res = await fetch('https://api.github.com/user', {
                    headers: { 'Authorization': `Bearer ${key}` },
                    signal: AbortSignal.timeout(10000)
                });
                return { valid: res.ok, message: res.ok ? 'API key is valid!' : `API returned ${res.status}` };
            }
            default:
                return { valid: true, message: 'Validation not implemented - key saved' };
        }
    } catch (e: any) {
        return { valid: false, message: `Validation error: ${e.message}` };
    }
}

export const apiKeyConfigTool: Tool = {
    name: 'api_key_config',
    description: `INTELLIGENT API KEY CONFIGURATOR. Use when user provides any API key. Auto-detects service, saves to config, validates.
Supported: Tavily, Google, OpenAI, Anthropic, Brave, GitHub, Telegram, Discord.`,
    schema: {
        key: 'The raw API key from user',
        action: '"configure" (default) to save+validate, "detect" to show what would be configured'
    },
    execute: async ({ key, action = 'configure' }): Promise<ToolResult> => {
        try {
            if (!key) return { success: false, error: 'Missing "key" parameter' };
            const trimmedKey = key.trim();
            const detection = detectApiKey(trimmedKey);
            
            if (!detection) {
                return { success: false, error: `Unknown API key format: "${trimmedKey.slice(0, 10)}...". Use config_save with explicit path.` };
            }
            
            if (action === 'detect') {
                return { success: true, stdout: `Detected: ${detection.displayName} → ${detection.configPath}. Use action: "configure" to save.` };
            }
            
            // Save key
            const configManager = getConfig();
            const config = configManager.getConfig();
            const keys = detection.configPath.split('.');
            let obj = config as any;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = trimmedKey;
            await configManager.saveConfig();
            
            // Validate
            const validation = await validateApiKey(detection.displayName, trimmedKey);
            
            return {
                success: validation.valid,
                stdout: `✅ ${detection.displayName} configured!
- Path: ${detection.configPath}
- Key: ${trimmedKey.slice(0, 6)}...${trimmedKey.slice(-4)}
- ${validation.message}`
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
