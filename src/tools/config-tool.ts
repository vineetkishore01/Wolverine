import { Tool, getToolRegistry } from './registry';
import { ToolResult } from '../types';
import { getConfig } from '../config/config';
import fs from 'fs';
import path from 'path';

/**
 * config_save tool
 * Allows Wolverine to save configuration keys to config.json
 */
export const configSaveTool: Tool = {
    name: 'config_save',
    description: 'Save/update configuration keys. Use this to set API keys or toggle features.',
    schema: {
        key: 'The dot-notated path to the config key (e.g. "search.tavily_api_key" or "telegram.bot_token")',
        value: 'The value to set for this key'
    },
    execute: async ({ key, value }): Promise<ToolResult> => {
        try {
            if (!key) {
                return { success: false, error: 'Missing "key" parameter' };
            }

            const configManager = getConfig();
            const currentConfig = configManager.getConfig();

            // We want to update the config object safely
            const keys = key.split('.');
            let obj = currentConfig as any;

            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!obj[k] || typeof obj[k] !== 'object') {
                    obj[k] = {};
                }
                obj = obj[k];
            }

            const lastKey = keys[keys.length - 1];
            obj[lastKey] = value;

            // Save the updated config
            await configManager.saveConfig();

            return {
                success: true,
                data: `Successfully updated config key "${key}" to "${typeof value === 'string' && value.length > 8 ? value.slice(0, 4) + '...' : value}".`
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to save config: ${error.message}`
            };
        }
    }
};
