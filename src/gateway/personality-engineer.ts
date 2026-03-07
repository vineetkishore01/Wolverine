/**
 * personality-engineer.ts - Personality and Identity Context Management
 * 
 * Extracts and compresses key personality files (SOUL.md, USER.md, etc.)
 * from the workspace to give the agent its consistent identity and user awareness.
 */

import fs from 'fs';
import path from 'path';

/**
 * Load a file from the workspace with basic truncation.
 */
export function loadWorkspaceFile(workspacePath: string, filename: string, maxChars: number = 500): string {
    try {
        const filePath = path.join(workspacePath, filename);
        if (!fs.existsSync(filePath)) return '';
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        if (content.length <= maxChars) return content;
        return content.slice(0, maxChars) + '\n...(truncated)';
    } catch { return ''; }
}

/**
 * Intelligent compression for personality files.
 * Extracts high-signal content (rules, headers) rather than just truncating.
 */
export function compressPersonalityFile(content: string, maxChars: number): string {
    if (!content || content.length <= maxChars) return content || '';

    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length <= 4) return content.slice(0, maxChars) + '\n...(truncated)';

    // Priority: headers, bullet points, key rules
    const importantLines: string[] = [];
    const normalLines: string[] = [];

    for (const line of lines) {
        const isHeader = line.startsWith('#') || line.startsWith('##') || line.startsWith('###');
        const isRule = /^- .*(must|never|always|do not|avoid)/i.test(line);
        const isKeyPoint = /^- \*\\*|^- \[/i.test(line) || (line.includes(':') && line.length < 80);

        if (isHeader || isRule || isKeyPoint) {
            importantLines.push(line);
        } else if (importantLines.length < 15) {
            normalLines.push(line);
        }
    }

    const compressed = [...importantLines, ...normalLines].join('\n');
    if (compressed.length > maxChars * 0.9) {
        return compressed.slice(0, maxChars) + '\n...(truncated)';
    }
    return compressed;
}

import { IntelligenceTier, getTierConfig } from '../agent/tier-detector';

/**
 * Build the core personality context block.
 * Scaling is now driven by IntelligenceTier to prevent overfitting.
 */
export async function buildPersonalityContext(
    workspacePath: string,
    mode: 'chat' | 'agent' = 'chat',
    tier: IntelligenceTier = 'low'
): Promise<string> {
    const config = getTierConfig(tier);
    const isAgent = mode === 'agent';
    const includeExtended = config.includeExtendedContext || isAgent;

    // Static Core: SOUL, USER, AGENTS, TOOLS, SELF/IDENTITY
    const soulRaw = loadWorkspaceFile(workspacePath, 'SOUL.md', 5000) || '';
    const soulMatch = compressPersonalityFile(soulRaw, Math.floor(soulRaw.length * config.compressionRatio));

    const user = loadWorkspaceFile(workspacePath, 'USER.md', Math.floor(2500 * config.compressionRatio)) || '';

    // Only load heavy files in High tier or Agent mode
    const agents = includeExtended ? (loadWorkspaceFile(workspacePath, 'AGENTS.md', 1500) || '') : '';
    const tools = includeExtended ? (loadWorkspaceFile(workspacePath, 'TOOLS.md', 1500) || '') : '';
    const self = loadWorkspaceFile(workspacePath, 'SELF.md', isAgent ? 2500 : 1500) || loadWorkspaceFile(workspacePath, 'IDENTITY.md', 1500) || '';

    const coreParts: string[] = [];

    // Clean up and adapt (legacy references to "Wolverine")
    const adapt = (s: string) => s
        .replace(/🦞/g, '🐺')
        .replace(/Lobster/gi, 'Wolverine')
        .replace(/SmallClaw/gi, 'Wolverine')
        .replace(/Wolf/g, 'wolf'); // Preserve casing for programmatic refs but fix branding

    if (soulMatch) coreParts.push(`## SOUL (Core Protocol)\n${adapt(soulMatch)}`);
    if (user) coreParts.push(`## USER PREFERENCES\n${adapt(user)}`);

    if (includeExtended) {
        if (agents) coreParts.push(`## AGENT COORDINATION\n${adapt(agents)}`);
        if (tools) coreParts.push(`## TOOL GUIDELINES\n${adapt(tools)}`);

        // Low tier only loads these in explicit agent mode
        const loadDynamic = tier !== 'low' || isAgent;
        if (loadDynamic) {
            const heartbeat = loadWorkspaceFile(workspacePath, 'HEARTBEAT.md', 1500) || '';
            const selfImprove = loadWorkspaceFile(workspacePath, 'SELF_IMPROVE.md', 1500) || '';
            const selfReflect = loadWorkspaceFile(workspacePath, 'SELF_REFLECT.md', 1500) || '';

            if (heartbeat) coreParts.push(`## HEARTBEAT & BACKGROUND GOALS\n${adapt(heartbeat)}`);
            if (selfImprove) coreParts.push(`## SELF-IMPROVEMENT OBJECTIVES\n${adapt(selfImprove)}`);
            if (selfReflect) coreParts.push(`## INTERNAL REFLECTION LOG\n${adapt(selfReflect)}`);
        }
    }

    if (self) coreParts.push(`## IDENTITY & SELF-AWARENESS\n${adapt(self)}`);

    return coreParts.join('\n\n');
}

/**
 * Load recent daily memory notes from workspace/memory/<date>.md
 */
export function readDailyMemoryContext(workspacePath: string, maxTokens: number = 800): string {
    try {
        const memDir = path.join(workspacePath, 'memory');
        if (!fs.existsSync(memDir)) return '';

        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const sections: string[] = [];

        for (const day of [yesterday, today]) {
            const p = path.join(memDir, `${day}.md`);
            if (!fs.existsSync(p)) continue;
            const raw = fs.readFileSync(p, 'utf-8').trim();
            if (!raw) continue;
            sections.push(`### Memory: ${day}\n${raw}`);
        }

        if (!sections.length) return '';

        let combined = sections.join('\n\n');
        const charLimit = Math.floor(maxTokens * 4); // ~4 chars per token
        if (combined.length > charLimit) {
            combined = combined.slice(-charLimit);
        }
        return `\n\n## Recent Memory Notes\n${combined}`;
    } catch {
        return '';
    }
}
