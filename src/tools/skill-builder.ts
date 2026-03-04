import { ToolResult } from '../types.js';
import { writeSkillPackFromContent } from '../skills/processor.js';
import { executeSkillExec } from './skills.js';

/**
 * Tool: skill_create — agent creates a new skill after learning from docs
 */
export async function executeSkillCreate(args: {
    name: string;
    description: string;
    emoji?: string;
    category?: string;
    requirements?: Array<{
        key: string;
        label: string;
        type: 'string' | 'password' | 'url' | 'number';
        required: boolean;
        description: string;
    }>;
    tools?: Array<{
        name: string;
        description: string;
        command: string;  // shell command with {{placeholders}}
    }>;
    procedures?: Array<{
        name: string;
        trigger: string;
        steps: string[];
    }>;
}): Promise<ToolResult> {
    if (!args.name?.trim()) return { success: false, error: 'name is required' };
    if (!args.description?.trim()) return { success: false, error: 'description is required' };

    const slug = args.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!slug) return { success: false, error: 'Invalid skill name: must contain alphanumeric characters' };

    try {
        // Generate SKILL.md content
        let skillMd = `---
name: ${slug}
title: ${args.name.trim()}
description: ${args.description.trim()}
${args.emoji ? `emoji: ${args.emoji}` : ''}
${args.category ? `category: ${args.category}` : ''}
generated_at: ${new Date().toISOString()}
---

# Description
${args.description}

`;

        if (args.requirements && args.requirements.length > 0) {
            skillMd += `## Requirements\n| key | label | type | required | description |\n|-----|-------|------|----------|-------------|\n`;
            for (const req of args.requirements) {
                skillMd += `| ${req.key} | ${req.label} | ${req.type} | ${req.required ? 'yes' : 'no'} | ${req.description} |\n`;
            }
            skillMd += `\n`;
        }

        if (args.tools && args.tools.length > 0) {
            skillMd += `## Tools\n\n`;
            for (const tool of args.tools) {
                skillMd += `### ${tool.name}\n${tool.description}\n\`\`\`shell\n${tool.command}\n\`\`\`\n\n`;
            }
        }

        if (args.procedures && args.procedures.length > 0) {
            skillMd += `## Procedures\n\n`;
            for (const proc of args.procedures) {
                skillMd += `### ${proc.name}\nTrigger: ${proc.trigger}\n`;
                if (Array.isArray(proc.steps)) {
                    proc.steps.forEach((step, i) => {
                        skillMd += `${i + 1}. ${step}\n`;
                    });
                }
                skillMd += `\n`;
            }
        }

        const manifest = writeSkillPackFromContent({
            id: slug,
            skillMdContent: skillMd,
            sourceType: 'manual'
        });

        return {
            success: true,
            stdout: `Skill "${args.name}" created successfully. It is now available for setup and testing.`,
            data: manifest
        };
    } catch (err: any) {
        return { success: false, error: `Failed to create skill: ${err.message}` };
    }
}

/**
 * Tool: skill_test — test a newly created skill
 */
export async function executeSkillTest(args: {
    skill_name: string;
    tool_name: string;
    params?: Record<string, any>;
}): Promise<ToolResult> {
    if (!args.skill_name) return { success: false, error: 'skill_name is required' };
    if (!args.tool_name) return { success: false, error: 'tool_name is required' };

    return executeSkillExec({
        slug: args.skill_name,
        action: args.tool_name,
        params: args.params,
        confirmed: true
    });
}
