/**
 * skill-connector-tool.ts - Tool for intelligent skill connection
 * 
 * This tool allows the agent to dynamically connect to services
 * by asking the user for required credentials.
 */

import { ToolResult } from '../types';
import { getSkillConnectorManager, SkillConnector, SkillRequirement } from './connector';

export interface ConnectSkillArgs {
  action: 'list' | 'info' | 'connect' | 'disconnect' | 'status';
  service?: string;
  credentials?: Record<string, string>;
}

export async function executeSkillConnector(args: ConnectSkillArgs): Promise<ToolResult> {
  const mgr = getSkillConnectorManager();

  switch (args.action) {
    case 'list': {
      const available = mgr.getAvailableConnectors();
      const connected = mgr.getConnectedList();
      
      let text = `# Available Services\n\n`;
      text += `## Connected Services\n`;
      if (connected.length === 0) {
        text += `- No services connected yet\n`;
      } else {
        for (const c of connected) {
          text += `- ${c.emoji} ${c.name} (connected)\n`;
        }
      }
      
      text += `\n## Not Connected\n`;
      const notConnected = available.filter(a => !connected.find(c => c.id === a.id));
      for (const s of notConnected) {
        text += `- ${s.emoji} ${s.name} - ${s.description}\n`;
      }
      
      text += `\n**To connect a service, tell me which one you want to set up!**`;
      
      return { success: true, stdout: text };
    }

    case 'info': {
      if (!args.service) {
        return { success: false, error: 'service is required for info action' };
      }
      
      const connector = mgr.getConnector(args.service);
      if (!connector) {
        return { success: false, error: `Unknown service: ${args.service}` };
      }
      
      const isConnected = mgr.isConnected(args.service);
      
      let text = `# ${connector.emoji} ${connector.name}\n\n`;
      text += `${connector.description}\n\n`;
      text += `**Category:** ${connector.category}\n\n`;
      
      if (isConnected) {
        text += `✅ **Already connected!** Tell me if you want to disconnect.\n\n`;
      } else {
        text += `## Required Credentials\n\n`;
        for (const req of connector.requirements) {
          text += `### ${req.label}\n`;
          text += `- ${req.description}\n`;
          text += `- Required: ${req.required ? 'Yes' : 'No'}\n`;
          if (req.placeholder) text += `- Example: \`${req.placeholder}\`\n`;
          text += `\n`;
        }
        
        text += `**To connect, just tell me:**\n`;
        text += `1. "${connector.name}" or "${args.service}"\n`;
        text += `2. I'll ask you for each credential\n`;
        text += `3. Provide them in chat and I'll connect it automatically!\n`;
      }
      
      return { success: true, stdout: text };
    }

    case 'connect': {
      if (!args.service) {
        return { success: false, error: 'service is required for connect action' };
      }
      
      if (!args.credentials || Object.keys(args.credentials).length === 0) {
        // Return what we need
        const connector = mgr.getConnector(args.service);
        if (!connector) {
          return { success: false, error: `Unknown service: ${args.service}` };
        }
        
        let text = `To connect ${connector.name}, please provide:\n\n`;
        const missing: string[] = [];
        
        for (const req of connector.requirements) {
          missing.push(req.label);
          text += `- **${req.label}**: ${req.description}\n`;
        }
        
        text += `\nJust reply with these details and I'll connect it!`;
        
        return { 
          success: true, 
          stdout: text,
          data: { needsCredentials: missing, service: args.service }
        };
      }
      
      const result = mgr.connect(args.service, args.credentials);
      
      if (result.success) {
        return { 
          success: true, 
          stdout: `✅ ${result.message}\n\nYou can now use ${args.service} features!`,
          data: { connected: true, service: args.service }
        };
      } else {
        return { success: false, error: result.message };
      }
    }

    case 'disconnect': {
      if (!args.service) {
        return { success: false, error: 'service is required for disconnect action' };
      }
      
      const disconnected = mgr.disconnect(args.service);
      if (disconnected) {
        return { success: true, stdout: `✅ Disconnected ${args.service}!` };
      } else {
        return { success: false, error: `${args.service} was not connected` };
      }
    }

    case 'status': {
      const connected = mgr.getConnectedList();
      const available = mgr.getAvailableConnectors();
      
      let text = `# Connected Services Status\n\n`;
      
      if (connected.length === 0) {
        text += `No services connected yet.\n\n`;
        text += `**To see available services, just ask:**\n`;
        text += `- "what services can you connect?"\n`;
        text += `- "show me available integrations"\n`;
        text += `- "list all connectors"\n`;
      } else {
        for (const c of connected) {
          const connector = available.find(a => a.id === c.id);
          text += `- ${connector?.emoji || '🔌'} ${c.name}`;
          if (c.connectedAt) {
            text += ` (since ${new Date(c.connectedAt).toLocaleDateString()})`;
          }
          text += `\n`;
        }
        
        text += `\n**To add more, just ask!**`;
      }
      
      return { success: true, stdout: text };
    }

    default:
      return { success: false, error: `Unknown action: ${args.action}` };
  }
}

export const skillConnectorTool = {
  name: 'skill_connector',
  description: `Connect to external services (Email, GitHub, Notion, Telegram, etc.). 
    - Use action='list' to see available services
    - Use action='info' with service='xxx' to see what credentials are needed
    - Use action='connect' with service='xxx' and credentials to connect
    - Use action='disconnect' to remove a connection
    - Use action='status' to see what's connected
    
    **Smart Feature:** Just tell the user what service you want to connect, and I'll guide you through providing the credentials!`,
  execute: executeSkillConnector,
  schema: {
    action: "string (required) - Action: list, info, connect, disconnect, status",
    service: "string (optional) - Service ID (email, github, notion, telegram, etc.)",
    credentials: "object (optional) - Credentials as key-value pairs"
  }
};
