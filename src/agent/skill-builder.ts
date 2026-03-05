/**
 * Skill Builder
 * 
 * Allows Wolverine to create new skills dynamically.
 * Phase 5: Skill Builder
 * 
 * Architecture designed for scalability:
 * - 4GB GPU: Template-based skill creation
 * - 8GB+: AI-assisted skill generation
 * - 16GB+: Full dynamic skill writing
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config';

export interface SkillTemplate {
  name: string;
  description: string;
  triggers: string[];
  prompt_template: string;
  tools: Array<{ name: string; description: string; command: string }>;
}

export interface SkillSpec {
  name: string;
  description: string;
  emoji?: string;
  category?: string;
  triggers: string[];
  instructions: string;
  tools: Array<{ name: string; description: string; command: string }>;
}

// Pre-defined skill templates for common patterns
export const SKILL_TEMPLATES: Record<string, SkillTemplate> = {
  'api-integration': {
    name: 'API Integration',
    description: 'Call external APIs with authentication',
    triggers: ['call api', 'fetch from', 'api request', 'http request'],
    prompt_template: `You are an API integration expert.

## Goal
{{goal}}

## API Details
- Endpoint: {{endpoint}}
- Auth: {{auth_type}}
- Method: {{method}}

## Task
1. Make the API call with proper headers
2. Handle the response
3. Return formatted results

## Error Handling
- Handle network errors gracefully
- Parse JSON responses
- Report failures clearly`,
    tools: [
      { name: 'web_fetch', description: 'Generic web fetch tool', command: 'curl -s {{url}}' },
      { name: 'run_command', description: 'Generic shell executor', command: '{{cmd}}' }
    ]
  },
  'data-transform': {
    name: 'Data Transformation',
    description: 'Transform data between formats',
    triggers: ['convert', 'transform', 'parse', 'format'],
    prompt_template: `You are a data transformation expert.

## Input Format
{{input_format}}

## Output Format
{{output_format}}

## Task
1. Read the input data
2. Transform to the output format
3. Write the result

## Notes
- Handle edge cases
- Preserve data integrity`,
    tools: [
      { name: 'read_file', description: 'Read input data', command: 'cat {{path}}' },
      { name: 'create_file', description: 'Write transformed results', command: 'tee {{path}} <<EOF\n{{content}}\nEOF' },
      { name: 'run_command', description: 'Generic shell executor', command: '{{cmd}}' }
    ]
  },
  'code-review': {
    name: 'Code Review',
    description: 'Review code for issues and improvements',
    triggers: ['review code', 'check code', 'analyze code', 'code review'],
    prompt_template: `You are a code review expert.

## Task
Review the provided code for:
1. Bugs and errors
2. Security vulnerabilities
3. Performance issues
4. Code style violations
5. Best practices

## Output Format
Provide a detailed report with:
- Issue description
- Line number (if applicable)
- Severity (high/medium/low)
- Suggested fix`,
    tools: [
      { name: 'read_file', description: 'Read source code', command: 'cat {{path}}' },
      { name: 'grep', description: 'Search for patterns', command: 'grep -n "{{pattern}}" {{path}}' }
    ]
  },
  'test-generator': {
    name: 'Test Generator',
    description: 'Generate unit tests for code',
    triggers: ['write tests', 'generate tests', 'add tests', 'unit tests'],
    prompt_template: `You are a test generation expert.

## Code to Test
{{code}}

## Test Framework
{{framework}}

## Task
1. Analyze the code
2. Identify testable functions
3. Write comprehensive unit tests
4. Include edge cases

## Output
Provide complete test file ready to run`,
    tools: [
      { name: 'read_file', description: 'Analyze code target', command: 'cat {{path}}' },
      { name: 'create_file', description: 'Write generated tests', command: 'tee {{path}} <<EOF\n{{content}}\nEOF' }
    ]
  },
  'documentation': {
    name: 'Documentation Generator',
    description: 'Generate documentation from code',
    triggers: ['document', 'docs', 'generate docs', 'readme'],
    prompt_template: `You are a documentation expert.

## Code to Document
{{code}}

## Task
Generate comprehensive documentation including:
1. Overview/Purpose
2. Function signatures with params
3. Usage examples
4. Return values
5. Edge cases

## Format
Use clear Markdown format`,
    tools: [
      { name: 'read_file', description: 'Analyze code to document', command: 'cat {{path}}' },
      { name: 'create_file', description: 'Write generated documentation', command: 'tee {{path}} <<EOF\n{{content}}\nEOF' }
    ]
  }
};

/**
 * Detect skill creation request
 */
export function detectSkillRequest(message: string): {
  intent: 'create' | 'modify' | 'none';
  template?: string;
  topic?: string;
  confidence: number;
} {
  const lower = message.toLowerCase();

  // Create skill patterns
  const createPatterns = [
    /create.*skill/i,
    /make.*skill/i,
    /add.*skill/i,
    /new.*skill/i,
    /build.*skill/i,
    /write.*skill/i
  ];

  // Template patterns
  for (const pattern of createPatterns) {
    if (pattern.test(lower)) {
      // Check for template mentions
      for (const [templateName, template] of Object.entries(SKILL_TEMPLATES)) {
        if (lower.includes(templateName) || template.triggers.some(t => lower.includes(t))) {
          return {
            intent: 'create',
            template: templateName,
            confidence: 0.9
          };
        }
      }

      // Extract topic (what kind of skill)
      const topicMatch = lower.match(/(?:to|for|that)\s+(\w+(?:\s+\w+)?)/);
      const topic = topicMatch ? topicMatch[1] : 'general';

      return {
        intent: 'create',
        topic,
        confidence: 0.7
      };
    }
  }

  // Modify skill patterns
  const modifyPatterns = [
    /update.*skill/i,
    /modify.*skill/i,
    /edit.*skill/i,
    /change.*skill/i
  ];

  for (const pattern of modifyPatterns) {
    if (pattern.test(lower)) {
      return {
        intent: 'modify',
        confidence: 0.8
      };
    }
  }

  return { intent: 'none', confidence: 0 };
}

/**
 * Get skills directory
 */
function getSkillsDir(): string {
  const config = getConfig().getConfig();
  const configuredDir = (config as any).skills?.directory;
  const configDir = getConfig().getConfigDir();

  return configuredDir || path.join(configDir, 'skills');
}

/**
 * Generate skill from template
 */
export function generateSkillFromTemplate(
  templateName: string,
  customizations: Record<string, string>
): SkillSpec | null {
  const template = SKILL_TEMPLATES[templateName];

  if (!template) return null;

  // Replace placeholders in template
  let instructions = template.prompt_template;
  for (const [key, value] of Object.entries(customizations)) {
    instructions = instructions.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return {
    name: customizations.name || template.name,
    description: customizations.description || template.description,
    triggers: template.triggers,
    instructions,
    tools: template.tools
  };
}

import { writeSkillPackFromContent } from '../skills/processor.js';
import { executeSkillExec } from '../tools/skills.js';
import { ToolResult } from '../types.js';

/**
 * Write skill to disk with advanced formatting
 */
export function writeSkill(args: {
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
    command: string;
  }>;
  procedures?: Array<{
    name: string;
    trigger: string;
    steps: string[];
  }>;
  triggers?: string[];
  instructions?: string;
}): { success: boolean; path?: string; id?: string; error?: string } {
  if (!args.name?.trim()) return { success: false, error: 'name is required' };

  const slug = args.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  if (!slug) return { success: false, error: 'Invalid skill name' };

  try {
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

    if (args.triggers && args.triggers.length > 0) {
      skillMd += `## Triggers\n${args.triggers.map(t => `- ${t}`).join('\n')}\n\n`;
    }

    if (args.instructions) {
      skillMd += `## Instructions\n\n${args.instructions}\n\n`;
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

    return { success: true, path: slug, id: slug };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Tool: skill_create
 */
export async function executeSkillCreate(args: any): Promise<ToolResult> {
  const result = writeSkill(args);
  if (result.success) {
    return {
      success: true,
      stdout: `Skill "${args.name}" created successfully. It is now available for setup.`,
      data: result
    };
  }
  return { success: false, error: result.error };
}

/**
 * Tool: skill_test
 */
export async function executeSkillTest(args: {
  skill_name: string;
  tool_name: string;
  params?: Record<string, any>;
}): Promise<ToolResult> {
  return executeSkillExec({
    slug: args.skill_name,
    action: args.tool_name,
    params: args.params,
    confirmed: true
  });
}

/**
 * Generate skill creation prompt for the LLM (for 8GB+ models)
 */
export function generateSkillCreationPrompt(userRequest: string): string {
  return `
## Skill Creation Request

User wants to create a new skill: "${userRequest}"

## Guidelines

1. Determine the skill name (kebab-case for directory)
2. Write clear triggers (when to use this skill)
3. Provide detailed instructions
4. List required tools

## Output Format

Provide:
\`\`\`json
{
  "name": "skill-name",
  "description": "What this skill does",
  "triggers": ["trigger phrase 1", "trigger phrase 2"],
  "instructions": "Detailed instructions for the LLM",
  "tools": ["tool1", "tool2"]
}
\`\`\`
`;
}

/**
 * Parse LLM response for skill creation
 */
export function parseSkillCreationResponse(response: string): SkillSpec | null {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.name || !parsed.instructions) {
      return null;
    }

    return {
      name: parsed.name,
      description: parsed.description || '',
      emoji: parsed.emoji,
      category: parsed.category,
      triggers: parsed.triggers || [],
      instructions: parsed.instructions,
      tools: (parsed.tools || []).map((t: any) => {
        if (typeof t === 'string') {
          return { name: t, description: `Autonomous execution of ${t}`, command: t };
        }
        return t;
      })
    };
  } catch {
    return null;
  }
}

export const skillCreateTool = {
  name: 'skill_create',
  description: 'Create a new skill after learning how a service works. Use this after browsing documentation to create a reusable skill with tools and procedures.',
  execute: executeSkillCreate,
  schema: {
    name: 'string (required) - Short name (e.g., "obsidian", "youtube")',
    description: 'string (required) - What this skill does',
    emoji: 'string (optional)',
    category: 'string (optional) - productivity, communication, development, automation, data',
    requirements: 'array (optional) - Credentials/config needed',
    tools: 'array (optional) - Shell-based tools this skill provides',
    procedures: 'array (optional) - Multi-step workflows'
  }
};

export const skillTestTool = {
  name: 'skill_test',
  description: 'Test a newly created skill by running one of its tools.',
  execute: executeSkillTest,
  schema: {
    skill_name: 'string (required) - Name of the skill',
    tool_name: 'string (required) - Name of the tool within the skill to test',
    params: 'object (optional) - Arguments for the tool'
  }
};

/**
 * Check if skill already exists
 */
export function skillExists(skillName: string): boolean {
  const skillsDir = getSkillsDir();
  const skillPath = path.join(skillsDir, skillName.toLowerCase().replace(/\s+/g, '-'));

  return fs.existsSync(skillPath);
}

/**
 * List all skills
 */
export function listSkills(): string[] {
  const skillsDir = getSkillsDir();

  if (!fs.existsSync(skillsDir)) return [];

  try {
    return fs.readdirSync(skillsDir)
      .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());
  } catch {
    return [];
  }
}

/**
 * Format skill templates for context
 */
export function formatSkillTemplates(): string {
  const parts = ['# Skill Templates Available'];

  for (const [name, template] of Object.entries(SKILL_TEMPLATES)) {
    parts.push(`\n## ${template.name}`);
    parts.push(`- Description: ${template.description}`);
    parts.push(`- Triggers: ${template.triggers.slice(0, 3).join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Interactive skill creation wizard prompt
 */
export function getSkillCreationWizard(): string {
  return `
## Skill Creation Wizard

I'll help you create a new skill. Please provide:

1. **Name**: What should I call this skill? (e.g., "api-integration", "data-transform")

2. **Description**: What does this skill do?

3. **Triggers**: When should this skill activate? (comma-separated phrases)

4. **Instructions**: Detailed instructions for what to do when triggered

5. **Tools**: Which tools should be available? (e.g., read_file, web_fetch)

Or choose from a template:
${Object.keys(SKILL_TEMPLATES).map(t => `- ${t}`).join('\n')}

Just tell me what you want, and I'll create it!
`;
}
