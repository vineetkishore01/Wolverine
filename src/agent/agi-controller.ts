/**
 * Wolverine AGI Controller
 * 
 * Unifies all AGI phases into a single controller:
 * - Phase 1-3: Foundation (implemented)
 * - Phase 4: MCP Auto-Learn  
 * - Phase 5: Skill Builder
 * - Phase 6: True Self-Awareness
 * 
 * Architecture designed to scale:
 * - 4GB GPU: Basic features
 * - 8GB+: AI-assisted features
 * - 16GB+: Full meta-cognition
 */

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

    // Phase 1.5: Agentic Search Detection
    if (/\b(find|search|where|look for|grep|glob|locate)\b/i.test(lower)) {
      return {
        type: 'none', // Continue to general chat but with search hints
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
  async createSkill(skillSpec: ReturnType<typeof parseSkillCreationResponse>): Promise<string> {
    if (!skillSpec) {
      return 'Could not parse skill specification. Please provide more details.';
    }

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

    // Capabilities
    const caps = await scanAllCapabilities();
    parts.push(formatCapabilitiesForLLM(caps));

    // MCP Servers
    parts.push('\n' + formatKnownMCPServers());

    // Skill Templates
    parts.push('\n' + formatSkillTemplates());

    // Limitations (self-awareness)
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

// Re-export all AGI functions
export {
  // Phase 2
  scanAllCapabilities,
  formatCapabilitiesForLLM,
  selfQuery,
  canDo,

  // Phase 1
  performIntrospection,
  formatIntrospectionResult,

  // Phase 4
  detectMCPRequest,
  generateMCPConfigRequest,
  parseEnvVarsFromMessage,
  configureMCP,
  isMCPConfigured,
  formatKnownMCPServers,
  KNOWN_MCP_SERVERS,

  // Phase 5
  detectSkillRequest,
  generateSkillCreationPrompt,
  parseSkillCreationResponse,
  writeSkill,
  SKILL_TEMPLATES,
  formatSkillTemplates,

  // Phase 6
  analyzeCapabilities,
  generateLimitationReport,
  selfDiagnostic,
  metaReason,
  handleIntrospectionQuestion,
  formatSelfAwareness,
  KNOWN_LIMITATIONS
};
