import { Ollama } from 'ollama';
import { ToolResult } from '../types.js';
import { Tool } from './registry.js';

export const systemStatusTool: Tool = {
    name: 'system_status',
    description: 'Check the health and status of the agent\'s internal systems, including Ollama (LLM/Embeddings) connectivity and available models. If you get a "fetch failed" error, use this tool to diagnose the connection.',
    schema: {},
    execute: async (args: any, context?: { sessionId: string; workspacePath?: string }): Promise<ToolResult> => {
        const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const client = new Ollama({ host });

        try {
            const version = await client.list();
            const models = version.models.map(m => m.name);
            const hasEmbed = models.some(m => m.includes('embed'));

            return {
                success: true,
                stdout: `System Status:
- Ollama: ONLINE (${host})
- Version: ${models.length} models loaded
- Available Models: ${models.join(', ')}
- Embedding Model Status: ${hasEmbed ? 'READY' : 'WARNING - Missing embedding model (mxbai-embed-large suggested)'}
`,
            };
        } catch (err: any) {
            return {
                success: false,
                error: `System Status: 
- Ollama: OFFLINE or UNREACHABLE at ${host}
- Error: ${err.message}
- Tip: Ensure Ollama is running and accessible at the configured host.`,
            };
        }
    },
};

export const ollamaPullTool: Tool = {
    name: 'ollama_pull',
    description: 'Pull a missing model from the Ollama library. Use this if system_status shows a required model is missing.',
    schema: {
        model: 'string',
    },
    execute: async (args: { model: string }, context?: { sessionId: string; workspacePath?: string }): Promise<ToolResult> => {
        const client = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });

        try {
            // Note: pull is a stream. For a tool, we'll wait for completion.
            await client.pull({ model: args.model });
            return {
                success: true,
                stdout: `Successfully pulled model: ${args.model}`,
            };
        } catch (err: any) {
            return {
                success: false,
                error: `Failed to pull model ${args.model}: ${err.message}`,
            };
        }
    },
};
