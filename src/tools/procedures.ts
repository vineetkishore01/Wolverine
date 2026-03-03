import { ToolResult } from '../types.js';
import { getBrainDB } from '../db/brain';

export async function executeProcedureSave(args: {
    name: string;
    description?: string;
    trigger_keywords: string;
    steps: Array<{
        order: number;
        tool: string;
        args_template: Record<string, any>;
        description: string;
    }>;
}): Promise<ToolResult> {
    if (!args.name?.trim()) return { success: false, error: 'name is required' };
    if (!args.steps || !Array.isArray(args.steps)) return { success: false, error: 'steps must be an array' };

    try {
        const brain = getBrainDB();
        const proc = brain.saveProcedure({
            name: args.name.trim(),
            description: args.description?.trim(),
            trigger_keywords: args.trigger_keywords?.trim(),
            steps: JSON.stringify(args.steps)
        });

        return {
            success: true,
            stdout: `Procedure "${proc.name}" saved successfully.`,
            data: proc
        };
    } catch (err: any) {
        return { success: false, error: `Failed to save procedure: ${err.message}` };
    }
}

export async function executeProcedureList(args: {}): Promise<ToolResult> {
    try {
        const brain = getBrainDB();
        const procs = brain.listProcedures();

        if (procs.length === 0) {
            return { success: true, stdout: 'No procedures found.' };
        }

        const list = procs.map(p => `- ${p.name}: ${p.description || 'No description'} (${p.trigger_keywords || 'no keywords'})`).join('\n');
        return { success: true, stdout: list, data: procs };
    } catch (err: any) {
        return { success: false, error: `Failed to list procedures: ${err.message}` };
    }
}

export async function executeProcedureGet(args: { name: string }): Promise<ToolResult> {
    if (!args.name?.trim()) return { success: false, error: 'name is required' };

    try {
        const brain = getBrainDB();
        const proc = brain.getProcedure(args.name.trim());

        if (!proc) {
            return { success: false, error: `Procedure "${args.name}" not found.` };
        }

        let steps;
        try {
            steps = JSON.parse(proc.steps);
        } catch {
            steps = proc.steps;
        }

        return {
            success: true,
            stdout: `Procedure: ${proc.name}\nDescription: ${proc.description || 'N/A'}\nSteps: ${JSON.stringify(steps, null, 2)}`,
            data: { ...proc, steps }
        };
    } catch (err: any) {
        return { success: false, error: `Failed to get procedure: ${err.message}` };
    }
}

export const procedureSaveTool = {
    name: 'procedure_save',
    description: 'Save a learned multi-step workflow that can be reused later.',
    execute: executeProcedureSave,
    schema: {
        name: 'string (required) - unique name for the procedure',
        description: 'string (optional) - what this procedure does',
        trigger_keywords: 'string (required) - comma-separated keywords to trigger/find this',
        steps: 'array (required) - list of objects with {order, tool, args_template, description}'
    }
};

export const procedureListTool = {
    name: 'procedure_list',
    description: 'List all saved procedures',
    execute: executeProcedureList,
    schema: {}
};

export const procedureGetTool = {
    name: 'procedure_get',
    description: 'Get details and steps of a specific procedure',
    execute: executeProcedureGet,
    schema: {
        name: 'string (required) - name of the procedure'
    }
};
