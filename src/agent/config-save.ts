/**
 * Config Save Tool
 * 
 * Wolverine can now SAVE configuration keys securely.
 * This closes the "Action Gap" - Wolverine can now:
 * 1. Detect a service is needed
 * 2. Ask user for keys
 * 3. SAVE those keys to config
 * 4. Use the service
 * 
 * Usage in LLM: Just tell Wolverine to "save the config" or "save the key"
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config';

export interface ConfigSaveResult {
  success: boolean;
  message: string;
  path?: string;
  changes?: Record<string, any>;
}

/**
 * Save a configuration value
 */
export function saveConfigValue(category: string, key: string, value: string): ConfigSaveResult {
  const config = getConfig();
  const configPath = path.join(config.getConfigDir(), 'config.json');
  
  try {
    // Load existing config
    let existingConfig: Record<string, any> = {};
    
    if (fs.existsSync(configPath)) {
      try {
        existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch {
        existingConfig = {};
      }
    }
    
    // Set the value
    const keys = key.split('.');
    let current = existingConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
    
    // Save
    fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
    
    // Reload config (if method exists)
    try {
      (config as any).loadConfig?.();
    } catch {
      // Ignore reload errors
    }
    
    return {
      success: true,
      message: `Saved ${category}.${key} successfully`,
      path: configPath,
      changes: { [key]: value }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to save: ${error.message}`
    };
  }
}

/**
 * Save multiple config values at once
 */
export function saveMultipleConfigValues(category: string, values: Record<string, string>): ConfigSaveResult {
  const results: string[] = [];
  let allSuccess = true;
  
  for (const [key, value] of Object.entries(values)) {
    const result = saveConfigValue(category, key, value);
    if (result.success) {
      results.push(`✓ ${key}`);
    } else {
      results.push(`✗ ${key}: ${result.message}`);
      allSuccess = false;
    }
  }
  
  if (allSuccess) {
    return {
      success: true,
      message: `Saved all ${Object.keys(values).length} values:\n${results.join('\n')}`,
      changes: values
    };
  }
  
  return {
    success: false,
    message: `Partial save:\n${results.join('\n')}`
  };
}

/**
 * Parse user message for config values
 * 
 * Wolverine can call this to extract keys from user messages
 */
export function extractConfigFromMessage(message: string): {
  category: string;
  values: Record<string, string>;
} | null {
  const lines = message.split('\n');
  const values: Record<string, string> = {};
  let category = '';
  
  // Pattern 1: KEY=value
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      values[match[1]] = match[2].trim();
      
      // Infer category from key
      if (!category) {
        if (match[1].includes('API_KEY') || match[1].includes('TOKEN')) {
          category = 'api';
        } else if (match[1].includes('NOTION')) {
          category = 'notion';
        } else if (match[1].includes('GITHUB')) {
          category = 'github';
        } else if (match[1].includes('SLACK')) {
          category = 'slack';
        }
      }
    }
  }
  
  // Pattern 2: Key: value
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*):\s*(.+)$/);
    if (match && !values[match[1]]) {
      values[match[1]] = match[2].trim();
    }
  }
  
  // Pattern 3: "api_key: xxx" or "token: xxx" in code blocks
  const codeBlockMatch = message.match(/```[\s\S]*?([A-Z_][A-Z0-9_]*)=([^\s]+)[\s\S]*?```/);
  if (codeBlockMatch) {
    values[codeBlockMatch[1]] = codeBlockMatch[2].trim();
  }
  
  if (Object.keys(values).length === 0) {
    return null;
  }
  
  return {
    category: category || 'general',
    values
  };
}

/**
 * Validate config values before saving
 */
export function validateConfigValues(category: string, values: Record<string, string>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const [key, value] of Object.entries(values)) {
    // Check for empty values
    if (!value || value.trim() === '') {
      errors.push(`${key} is empty`);
    }
    
    // Check for placeholder text
    if (value.includes('your_') || value.includes('xxx') || value.includes('example')) {
      warnings.push(`${key} appears to be a placeholder`);
    }
    
    // Check for obvious keys
    if (key.includes('KEY') && value.length < 10) {
      warnings.push(`${key} seems too short for an API key`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get current config status
 */
export function getConfigStatus(): Record<string, any> {
  const config = getConfig().getConfig();
  const status: Record<string, any> = {};
  
  // Search providers
  const search = (config as any).search;
  status.search = {
    tavily: !!search?.tavily_api_key,
    brave: !!search?.brave_api_key,
    google: !!search?.google_api_key
  };
  
  // Channels
  status.channels = {
    telegram: !!(config as any).telegram?.enabled,
    discord: !!(config as any).discord?.enabled
  };
  
  // MCP
  status.mcp = {
    servers: Object.keys((config as any).mcp?.servers || {}).length
  };
  
  // Model
  const llmConfig = config.llm as any;
  status.model = {
    provider: llmConfig?.provider,
    model: llmConfig?.model
  };
  
  return status;
}

/**
 * Format config status for display
 */
export function formatConfigStatus(): string {
  const status = getConfigStatus();
  
  const lines = [
    '# Current Configuration Status',
    ''
  ];
  
  // Search
  const searchStatus = Object.entries(status.search)
    .map(([k, v]) => `${v ? '✅' : '❌'} ${k}`)
    .join(', ');
  lines.push(`**Search**: ${searchStatus}`);
  
  // Channels
  const channelStatus = Object.entries(status.channels)
    .map(([k, v]) => `${v ? '✅' : '❌'} ${k}`)
    .join(', ');
  lines.push(`**Channels**: ${channelStatus}`);
  
  // MCP
  lines.push(`**MCP Servers**: ${status.mcp.servers}`);
  
  // Model
  lines.push(`**Model**: ${status.model.provider}/${status.model.model}`);
  
  return lines.join('\n');
}
