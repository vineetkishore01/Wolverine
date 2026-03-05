/**
 * Self-Query Engine
 * 
 * Allows Wolverine to query its own capabilities at runtime.
 * This is the foundation for self-awareness - Wolverine can ask:
 * - "What can I do?"
 * - "How do I do X?"
 * - "Can I do Y?"
 * - "Why can't I do Z?"
 * 
 * For Phase 2: Self-Query Engine
 */

import { scanAllCapabilities, formatCapabilitiesForLLM, getCapabilityDetails, CapabilityMap } from './capability-scanner';

export type QueryType = 'capability' | 'implementation' | 'limitation' | 'comparison';

export interface SelfQuery {
  question: string;
  type: QueryType;
  keywords: string[];
}

export interface SelfAnswer {
  answer: string;
  confidence: number;
  sources: string[];
  follow_ups?: string[];
}

/**
 * Parse a self-query question
 */
function parseQuery(question: string): SelfQuery {
  const lower = question.toLowerCase();
  
  // Determine query type
  let type: QueryType = 'capability';
  
  if (lower.includes('how do') || lower.includes('how to') || lower.includes('implement')) {
    type = 'implementation';
  } else if (lower.includes('can i') || lower.includes('can you') || lower.includes('able to')) {
    type = 'capability';
  } else if (lower.includes('why can\'t') || lower.includes('why not') || lower.includes('limit')) {
    type = 'limitation';
  } else if (lower.includes('vs ') || lower.includes('versus') || lower.includes('or ')) {
    type = 'comparison';
  }
  
  // Extract keywords
  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5);
  
  return { question, type, keywords };
}

/**
 * Find relevant capabilities from keywords
 */
async function findRelevantCapabilities(keywords: string[]): Promise<string[]> {
  const caps = await scanAllCapabilities();
  const all = [...caps.tools, ...caps.skills, ...caps.mcp];
  
  const relevant: string[] = [];
  
  for (const cap of all) {
    const searchText = `${cap.name} ${cap.description}`.toLowerCase();
    for (const kw of keywords) {
      if (searchText.includes(kw)) {
        relevant.push(`- \`${cap.name}\`: ${cap.description}`);
        break;
      }
    }
  }
  
  return relevant;
}

/**
 * Get tool implementation details
 */
async function getToolImplementation(toolName: string): Promise<string | null> {
  const toolMap: Record<string, string> = {
    'read_file': 'Reads file content from workspace. Args: filename (string). Returns file contents with line numbers.',
    'create_file': 'Creates new file. Args: filename, content. Fails if file exists.',
    'replace_lines': 'Replaces specific lines. Args: filename, start_line, end_line, new_content.',
    'find_replace': 'Find and replace text. Args: filename, find, replace.',
    'run_command': 'Executes shell command. Args: command, directory (optional). Returns stdout/stderr.',
    'web_search': 'Searches web. Args: query. Requires API key in config.',
    'web_fetch': 'Fetches URL content. Args: url.',
    'browser_open': 'Opens browser. Args: url, headless (optional).',
    'browser_snapshot': 'Gets page state. Returns DOM screenshot and elements.',
    'browser_click': 'Clicks element. Args: selector.',
    'memory_write': 'Writes to persistent memory. Args: content, category (optional).',
    'memory_search': 'Searches memory. Args: query. Returns relevant memories.',
    'scratchpad_write': 'Writes to scratchpad. Args: content. For temporary notes.',
    'scratchpad_read': 'Reads scratchpad. Returns current scratchpad content.',
  };
  
  return toolMap[toolName] || null;
}

/**
 * Answer a capability question
 */
async function answerCapability(question: string, keywords: string[]): Promise<SelfAnswer> {
  const caps = await scanAllCapabilities();
  const relevant = await findRelevantCapabilities(keywords);
  
  let answer: string;
  
  if (relevant.length > 0) {
    answer = `I can help with that! Here are relevant capabilities:\n${relevant.join('\n')}`;
  } else {
    // Check if we have any matching category
    const allCaps = formatCapabilitiesForLLM(caps);
    answer = `Let me check my capabilities for that...\n\n${allCaps}`;
  }
  
  return {
    answer,
    confidence: relevant.length > 0 ? 0.9 : 0.5,
    sources: ['capability-scanner'],
    follow_ups: [
      'What specifically do you want to do?',
      'Would you like me to list all my tools?'
    ]
  };
}

/**
 * Answer an implementation question
 */
async function answerImplementation(question: string, keywords: string[]): Promise<SelfAnswer> {
  // Try to find specific tool
  for (const kw of keywords) {
    const impl = await getToolImplementation(kw);
    if (impl) {
      return {
        answer: `To do that, I can use \`${kw}\`:\n\n${impl}`,
        confidence: 0.95,
        sources: ['tool-registry'],
        follow_ups: [
          'Would you like me to demonstrate?'
        ]
      };
    }
  }
  
  // General answer
  const caps = await scanAllCapabilities();
  
  return {
    answer: `To accomplish that, I would typically:\n\n1. Use file tools to read/modify files\n2. Use shell to run commands\n3. Use web tools for research\n\n${formatCapabilitiesForLLM(caps)}`,
    confidence: 0.5,
    sources: ['capability-scanner'],
    follow_ups: [
      'What specific task are you trying to accomplish?'
    ]
  };
}

/**
 * Answer a limitation question
 */
async function answerLimitation(question: string, keywords: string[]): Promise<SelfAnswer> {
  const caps = await scanAllCapabilities();
  
  // Check what requires config
  const requiresConfig = [
    ...caps.tools,
    ...caps.channels,
    ...caps.models
  ].filter(c => c.status === 'requires_config');
  
  const missing = requiresConfig
    .map(c => `- \`${c.name}\`: needs ${c.config_needed?.join(', ')}`)
    .join('\n');
  
  return {
    answer: `Current limitations:\n\n${missing || 'All capabilities are configured!'}\n\nI cannot currently:\n- Use vision/camera directly\n- Access external APIs without configuration\n- Modify my own source code dynamically\n- Train new models`,
    confidence: 0.8,
    sources: ['capability-scanner'],
    follow_ups: [
      'Would you like me to help configure any missing capabilities?'
    ]
  };
}

/**
 * Main query function - Wolverine asks itself a question
 */
export async function selfQuery(question: string): Promise<SelfAnswer> {
  const parsed = parseQuery(question);
  
  switch (parsed.type) {
    case 'implementation':
      return answerImplementation(question, parsed.keywords);
    case 'limitation':
      return answerLimitation(question, parsed.keywords);
    case 'capability':
    default:
      return answerCapability(question, parsed.keywords);
  }
}

/**
 * Format answer for LLM context
 */
export function formatSelfQueryAnswer(answer: SelfAnswer): string {
  const parts = [
    '[SELF-QUERY]',
    answer.answer,
    `\nConfidence: ${Math.round(answer.confidence * 100)}%`
  ];
  
  if (answer.follow_ups?.length) {
    parts.push(`\nYou could ask: ${answer.follow_ups.join(', ')}`);
  }
  
  return parts.join('\n');
}

/**
 * Wolverine can call this to check if it can do something
 */
export async function canDo(action: string): Promise<{ canDo: boolean; how?: string; missing?: string }> {
  const caps = await scanAllCapabilities();
  const all = [...caps.tools, ...caps.skills, ...caps.mcp];
  
  const actionLower = action.toLowerCase();
  
  for (const cap of all) {
    if (actionLower.includes(cap.name.toLowerCase()) || 
        actionLower.includes(cap.description.toLowerCase())) {
      
      if (cap.status === 'available' || cap.status === 'configured') {
        return { 
          canDo: true, 
          how: `Use \`${cap.name}\`: ${cap.description}` 
        };
      } else if (cap.status === 'requires_config') {
        return { 
          canDo: false, 
          missing: `Need to configure: ${cap.config_needed?.join(', ')}` 
        };
      }
    }
  }
  
  return { canDo: false, missing: 'No matching capability found' };
}
