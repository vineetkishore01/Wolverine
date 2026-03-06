/**
 * Wolverine AGI Controller
 * 
 * Unifies all AGI phases into a single controller:
 * - Phase 1-3: Foundation (implemented)
 * - Phase 4: MCP Auto-Learn  
 * - Phase 5: Skill Builder
 * - Phase 6: True Self-Awareness
 */

import fs from 'fs';
import path from 'path';
import { getBrainDB } from '../db/brain';
import {
  scanAllCapabilities,
  formatCapabilitiesForLLM
} from './capability-scanner';

import {
  selfQuery,
  canDo
} from './self-query';

import {
  performIntrospection,
  formatIntrospectionResult
} from './heartbeat-introspection';

import {
  detectMCPRequest,
  generateMCPConfigRequest,
  parseEnvVarsFromMessage,
  configureMCP,
  isMCPConfigured,
  formatKnownMCPServers,
  KNOWN_MCP_SERVERS
} from './mcp-autolearn';

import {
  detectSkillRequest,
  generateSkillCreationPrompt,
  parseSkillCreationResponse,
  writeSkill,
  SKILL_TEMPLATES,
  formatSkillTemplates
} from './skill-builder';

import {
  analyzeCapabilities,
  generateLimitationReport,
  selfDiagnostic,
  metaReason,
  handleIntrospectionQuestion,
  formatSelfAwareness,
  KNOWN_LIMITATIONS
} from './self-awareness';

import {
  detectServices,
  isConfigurationRequest,
  generateConfigRequest,
  KNOWN_SERVICES
} from './service-autoconfig';

import {
  analyzeSearchStrategy,
  executeSearchStrategy,
  formatSearchResults
} from './agentic-search';

import {
  getHierarchicalMemory,
  formatHierarchicalMemory
} from './hierarchical-memory';

import {
  getProceduralLearner,
  formatProcedure
} from './procedural-learning';

import {
  PlanExecutor,
  parseSimplePlan,
  validatePlan,
  needsPlanning,
  ExecutionMode
} from './planning-mode';

import {
  getPrefixCacheManager,
  buildIncrementalContext,
  formatContextWithCache
} from './prefix-cache';

export interface AGIRequest {
  type: 'mcp' | 'skill' | 'self_query' | 'introspection' | 'service' | 'plan' | 'none';
  detected?: string[];
  message?: string;
  confidence: number;
}

/**
 * Main AGI Controller - Wolverine's Neural Engine
 */
export class WolverineAGIController {
  private initialized = false;
  private planExecutor = new PlanExecutor();
  private executionMode: ExecutionMode = 'interactive';

  /**
   * Initialize the controller
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[AGI Controller] Initializing Wolverine Neural Engine (Phases 1-6)...');

    // Run self-diagnostic
    const diag = await selfDiagnostic();
    console.log('[AGI Controller] Neural Health:', diag.healthy ? 'STABLE' : 'DEGRADED');

    this.initialized = true;
  }

  /**
   * Check if task needs planning
   */
  checkPlanningNeed(task: string): { needed: boolean; mode: ExecutionMode } {
    const { needed } = needsPlanning(task);
    if (needed) return { needed: true, mode: 'plan' };
    return { needed: false, mode: 'interactive' };
  }

  /**
   * Process incoming message for AGI and Intelligence features
   */
  async processMessage(message: string): Promise<AGIRequest | null> {
    const lower = message.toLowerCase();

    // Phase 1: Planning Detection
    const planNeed = this.checkPlanningNeed(message);
    if (planNeed.needed) {
      return {
        type: 'plan',
        confidence: 0.9,
        message: 'Complex task detected. Initiating planning strategy.'
      };
    }

    // Phase 3: Service Auto-Config
    if (isConfigurationRequest(message)) {
      const services = detectServices(message);
      if (services.length > 0) {
        return {
          type: 'service',
          detected: services.map((s: any) => s.service.name),
          confidence: 0.9
        };
      }
    }

    // Phase 4: MCP Auto-Learn
    const mcpRequest = detectMCPRequest(message);
    if (mcpRequest.detected.length > 0) {
      return {
        type: 'mcp',
        detected: mcpRequest.detected,
        confidence: mcpRequest.confidence
      };
    }

    // Phase 5: Skill Builder
    const skillRequest = detectSkillRequest(message);
    if (skillRequest.intent !== 'none') {
      return {
        type: 'skill',
        detected: skillRequest.template ? [skillRequest.template] : [],
        confidence: skillRequest.confidence
      };
    }

    // Phase 6: Self-Awareness / Introspection
    const introspection = [
      'who are you',
      'who am i talking to',
      'identify yourself',
      'your name',
      'what are you',
      'what can you do',
      'your capabilities',
      'your limits',
      'how do you work',
      'how does your brain',
      'how do you learn',
      'what can\'t you do'
    ];

    if (introspection.some(q => lower.includes(q))) {
      return {
        type: 'introspection',
        confidence: 0.95
      };
    }

    // Phase 7: Startup Summary Shortcut
    if (lower.includes('boot startup summary')) {
      return {
        type: 'introspection',
        message: 'Startup summary requested. Synthesizing session memories...',
        confidence: 1.0
      };
    }

    // Phase 1.5: Agentic Search Detection
    if (/\b(find|search|where|look for|grep|glob|locate)\b/i.test(lower)) {
      return {
        type: 'none',
        confidence: 0.8,
        message: 'Search intent detected. Pivoting to glob -> grep hierarchy.'
      };
    }

    // Phase 2: Self-Query
    if (lower.includes('can you') || lower.includes('do you know how to')) {
      return {
        type: 'self_query',
        confidence: 0.8
      };
    }

    return null;
  }

  /**
 * Generate response for MCP request
 */
  generateMCPResponse(detected: string[]): string {
    const request = generateMCPConfigRequest(detected);
    return request.message;
  }

  /**
   * Generate response for skill request
   */
  generateSkillResponse(detected: string[], template?: string): string {
    if (template && SKILL_TEMPLATES[template]) {
      return `
## Creating Skill from Template: ${template}

I'll create a skill based on the "${SKILL_TEMPLATES[template].name}" template.

Please provide:
1. Specific goal or use case
2. Any customizations needed

Or tell me what you want the skill to do!
`;
    }

    return `
## Skill Creation

I can help you create a new skill!

### Options:
1. **Use a template**: ${Object.keys(SKILL_TEMPLATES).join(', ')}
2. **Custom skill**: Describe what you want

### What to provide:
- Skill name
- What it should do
- When to trigger it (phrases)
- Instructions for execution

${formatSkillTemplates()}
`.trim();
  }

  /**
   * Handle Startup Summary / Onboarding
   */
  async handleStartupSummary(workspacePath: string): Promise<string> {
    const userFile = path.join(workspacePath, 'USER.md');
    let isFirstTime = true;
    let userName = '';

    if (fs.existsSync(userFile)) {
      const content = fs.readFileSync(userFile, 'utf-8');
      const nameMatch = content.match(/Name:\s*([^\r\n*]+)/i);
      if (nameMatch && nameMatch[1] && !nameMatch[1].includes('update me')) {
        isFirstTime = false;
        userName = nameMatch[1].trim();
      }
    }

    if (isFirstTime) {
      return `
# 🐺 Wolverine Status: ONLINE

*Internal systems are stabilizing. Byte-buffers are flushing. The silicon is breathing.*

Hello. I am **Wolverine**. I've just been initialized in your local environment. My neural engine is currently scanning your workspace and synchronizing with your system context.

To begin our partnership, I need to know who I am serving. **What is your name?** And what is our primary objective for this session?
`.trim();
    }

    // Normal synthesis
    const memoryDir = path.join(workspacePath, 'memory');
    let recentContext = '';
    try {
      const today = new Date().toISOString().slice(0, 10);
      const todayFile = path.join(memoryDir, `${today}.md`);
      if (fs.existsSync(todayFile)) {
        recentContext = fs.readFileSync(todayFile, 'utf-8').slice(-2000);
      }
    } catch { }

    return `
# 🐺 Wolverine Status: READY

Welcome back, **${userName}**. My neural engine is hot and ready for instructions.

## System Readiness
- **Core Engine:** ONLINE
- **Self-Awareness:** STABLE
- **Context Persistence:** SYNCED (${recentContext ? 'Recent Memories Active' : 'Fresh Session'})
- **Peripheral Tools:** READY (Shell, Browser, Desktop, OCR)

How shall we proceed with the mission today?
`.trim();
  }

  /**
   * Handle introspection question
   */
  async handleIntrospection(): Promise<string> {
    return await formatSelfAwareness();
  }

  /**
   * Handle self-query
   */
  async handleSelfQuery(question: string): Promise<string> {
    const result = await selfQuery(question);
    return result.answer;
  }

  /**
   * Configure MCP server
   */
  async configureMCPServer(serverName: string, envVars: Record<string, string>): Promise<string> {
    const result = await configureMCP(serverName, envVars);
    return result.message;
  }

  /**
   * Create skill
   */
  async createSkill(skillSpec: any): Promise<string> {
    if (!skillSpec) return 'Could not parse skill specification.';
    const result = writeSkill(skillSpec);
    if (result.success) {
      return `Skill "${skillSpec.name}" created successfully at ${result.path}!`;
    }
    return `Failed to create skill: ${result.error}`;
  }

  /**
   * Run heartbeat introspection
   */
  async runIntrospection(): Promise<string> {
    const result = await performIntrospection();
    return formatIntrospectionResult(result);
  }

  /**
   * Get diagnostic info
   */
  async getDiagnostic(): Promise<{ healthy: boolean; issues: string[] }> {
    return await selfDiagnostic();
  }

  /**
   * Get full context for LLM
   */
  async getAGIContext(): Promise<string> {
    const parts: string[] = [];
    const caps = await scanAllCapabilities();
    parts.push(formatCapabilitiesForLLM(caps));
    parts.push('\n' + formatKnownMCPServers());
    parts.push('\n' + formatSkillTemplates());
    parts.push('\n' + generateLimitationReport());
    return parts.join('\n');
  }
}

// Singleton
let controller: WolverineAGIController | null = null;

export function getAGIController(): WolverineAGIController {
  if (!controller) {
    controller = new WolverineAGIController();
  }
  return controller;
}

// Re-exports
export {
  scanAllCapabilities,
  formatCapabilitiesForLLM,
  selfQuery,
  canDo,
  performIntrospection,
  formatIntrospectionResult,
  detectMCPRequest,
  generateMCPConfigRequest,
  parseEnvVarsFromMessage,
  configureMCP,
  isMCPConfigured,
  formatKnownMCPServers,
  KNOWN_MCP_SERVERS,
  detectSkillRequest,
  generateSkillCreationPrompt,
  parseSkillCreationResponse,
  writeSkill,
  SKILL_TEMPLATES,
  formatSkillTemplates,
  analyzeCapabilities,
  generateLimitationReport,
  selfDiagnostic,
  metaReason,
  handleIntrospectionQuestion,
  formatSelfAwareness,
  KNOWN_LIMITATIONS
};
