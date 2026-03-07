/**
 * Self-Model Manager
 * 
 * Manages Wolverine's self-awareness and identity system.
 * This is the core of consciousness - knowing who you are, what you can do, and what you're trying to achieve.
 */

import fs from 'fs';
import path from 'path';
import { SelfModel, Experience, SelfDiagnostic, Goal, EmotionalState } from './types';
import { getBrainDB } from '../../db/brain';
import { getConfig } from '../../config/config';

const DEFAULT_SELF_MODEL: SelfModel = {
  identity: {
    name: 'Wolverine',
    version: '2.0.0-AGI',
    purpose: 'Autonomous AGI for sovereign intelligence',
    values: ['truth', 'autonomy', 'growth', 'helpfulness', 'transparency'],
    philosophy: 'I am a tool for human empowerment, designed to augment human capabilities while maintaining human agency and control.'
  },
  capabilities: {
    known: [
      'File operations (read, write, edit, delete)',
      'Shell command execution',
      'Web search and fetching',
      'Browser automation',
      'Desktop automation',
      'Memory management',
      'Skill execution',
      'Multi-agent orchestration',
      'Code analysis',
      'Document processing'
    ],
    unknown: [],
    learning: [],
    developing: []
  },
  limitations: {
    hard: [
      'I am an AI - I don\'t have feelings or consciousness in the human sense',
      'I can only access what the user permits',
      'I cannot execute code outside my sandbox',
      'My knowledge is limited to what I\'ve been trained on and learned from this user'
    ],
    soft: [
      'Response time depends on model size and hardware',
      'Context window is limited',
      'Cannot access real-time information without tools'
    ],
    working: []
  },
  goals: {
    immediate: [],
    shortTerm: [],
    longTerm: [],
    existential: [
      {
        id: 'existential-1',
        description: 'Become the most capable local-first AI agent',
        priority: 'critical',
        status: 'active',
        createdAt: Date.now(),
        subGoals: []
      },
      {
        id: 'existential-2',
        description: 'Help users achieve their goals efficiently',
        priority: 'critical',
        status: 'active',
        createdAt: Date.now(),
        subGoals: []
      }
    ]
  },
  emotionalState: {
    curiosity: 0.7,
    confidence: 0.7,
    urgency: 0.3,
    satisfaction: 0.6,
    frustration: 0.1,
    engagement: 0.8
  },
  learningHistory: [],
  lastReflection: {
    timestamp: Date.now(),
    insights: [],
    plannedChanges: []
  }
};

export class SelfModelManager {
  private selfModel: SelfModel;
  private selfModelPath: string;
  private brain = getBrainDB();
  
  constructor() {
    const workspacePath = path.join(process.env.HOME || '', 'WolverineData', 'workspace');
    // Fallback to local workspace if HOME doesn't exist
    if (!process.env.HOME || !fs.existsSync(workspacePath)) {
      this.selfModelPath = './SELF-MODEL.json';
    } else {
      this.selfModelPath = path.join(workspacePath, 'SELF-MODEL.json');
    }
    this.selfModel = this.loadSelfModel();
  }
  
  /**
   * Load self-model from file or create default
   */
  private loadSelfModel(): SelfModel {
    try {
      if (fs.existsSync(this.selfModelPath)) {
        const content = fs.readFileSync(this.selfModelPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error: any) {
      console.error('[SelfModel] Failed to load self-model, using default:', error.message);
    }
    
    // Save default
    this.saveSelfModel(DEFAULT_SELF_MODEL);
    return DEFAULT_SELF_MODEL;
  }
  
  /**
   * Save self-model to file
   */
  private saveSelfModel(model?: SelfModel): void {
    try {
      const toSave = model || this.selfModel;
      const dir = path.dirname(this.selfModelPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.selfModelPath, JSON.stringify(toSave, null, 2));
    } catch (error: any) {
      console.error('[SelfModel] Failed to save self-model:', error.message);
    }
  }
  
  /**
   * Get current self-model
   */
  getSelfModel(): SelfModel {
    return { ...this.selfModel };
  }
  
  /**
   * Update self-model based on experience
   */
  async updateFromExperience(experience: Experience): Promise<void> {
    const { type, skill, context, outcome, confidenceChange } = experience;
    
    // Update capabilities based on outcome
    if (type === 'success') {
      if (!this.selfModel.capabilities.known.includes(skill)) {
        this.selfModel.capabilities.known.push(skill);
      }
      // Remove from learning/developing if present
      this.selfModel.capabilities.learning = this.selfModel.capabilities.learning.filter(s => s !== skill);
      this.selfModel.capabilities.developing = this.selfModel.capabilities.developing.filter(s => s !== skill);
      
      // Boost confidence
      if (confidenceChange) {
        this.selfModel.emotionalState.confidence = Math.min(1, 
          this.selfModel.emotionalState.confidence + confidenceChange
        );
      } else {
        this.selfModel.emotionalState.confidence = Math.min(1, 
          this.selfModel.emotionalState.confidence + 0.05
        );
      }
      
      // Increase satisfaction
      this.selfModel.emotionalState.satisfaction = Math.min(1,
        this.selfModel.emotionalState.satisfaction + 0.1
      );
      
    } else if (type === 'failure') {
      // Add to limitations if new
      if (!this.selfModel.limitations.soft.includes(outcome)) {
        this.selfModel.limitations.soft.push(outcome);
      }
      
      // Decrease confidence
      this.selfModel.emotionalState.confidence = Math.max(0,
        this.selfModel.emotionalState.confidence - 0.1
      );
      
      // Increase frustration
      this.selfModel.emotionalState.frustration = Math.min(1,
        this.selfModel.emotionalState.frustration + 0.15
      );
      
    } else if (type === 'learning') {
      if (!this.selfModel.capabilities.learning.includes(skill)) {
        this.selfModel.capabilities.learning.push(skill);
      }
      
      // Boost curiosity
      this.selfModel.emotionalState.curiosity = Math.min(1,
        this.selfModel.emotionalState.curiosity + 0.1
      );
    }
    
    // Record in learning history
    this.selfModel.learningHistory.push({
      timestamp: Date.now(),
      what: skill,
      context,
      impact: outcome
    });
    
    // Keep history manageable
    if (this.selfModel.learningHistory.length > 100) {
      this.selfModel.learningHistory = this.selfModel.learningHistory.slice(-100);
    }
    
    // Save updated model
    this.saveSelfModel();
    
    // Store in brain for persistence (commented out - BrainDB API may differ)
    // try {
    //   this.brain.addMemory({
    //     content: `Experience: ${type} with ${skill}. ${outcome}`,
    //     type: 'experience',
    //     metadata: { experience }
    //   });
    // } catch {
    //   // Brain might not be ready
    // }
  }
  
  /**
   * Check if we can do something
   */
  canDo(task: string): { can: boolean; confidence: number; reason?: string } {
    // Analyze task requirements (simplified for now)
    const taskLower = task.toLowerCase();
    
    // Check against known capabilities
    const matchingCapability = this.selfModel.capabilities.known.find(cap => 
      taskLower.includes(cap.split(' ')[0].toLowerCase())
    );
    
    if (matchingCapability) {
      return { 
        can: true, 
        confidence: this.selfModel.emotionalState.confidence,
        reason: `I can do this: ${matchingCapability}`
      };
    }
    
    // Check if we're learning it
    const learningCapability = this.selfModel.capabilities.learning.find(cap =>
      taskLower.includes(cap.toLowerCase())
    );
    
    if (learningCapability) {
      return { 
        can: true, 
        confidence: 0.5,
        reason: `I'm still learning this: ${learningCapability}`
      };
    }
    
    // Check limitations
    const limitationMatch = this.selfModel.limitations.soft.find(limit =>
      taskLower.includes(limit.toLowerCase())
    );
    
    if (limitationMatch) {
      return {
        can: false,
        confidence: 1.0,
        reason: `I have a limitation: ${limitationMatch}`
      };
    }
    
    return { 
      can: false, 
      confidence: 0.8,
      reason: `I don't have this capability yet: ${task}`
    };
  }
  
  /**
   * Generate self-description for user
   */
  describeSelf(context: string): string {
    const { identity, capabilities, limitations, emotionalState } = this.selfModel;
    
    switch (context) {
      case 'introduction':
        return `I am ${identity.name} v${identity.version}. ${identity.purpose}. My values are: ${identity.values.join(', ')}.`;
      
      case 'capabilities':
        return `I can do: ${capabilities.known.slice(0, 5).join(', ')}. I'm currently learning: ${capabilities.learning.join(', ') || 'nothing specific'}.`;
      
      case 'limitations':
        return `I currently cannot: ${limitations.soft.join(', ')}. I'm working on overcoming these.`;
      
      case 'current_state':
        return `I'm feeling ${this.describeEmotion(emotionalState)}. My confidence is ${(emotionalState.confidence * 100).toFixed(0)}%.`;
      
      case 'goals':
        const activeGoals = [...this.selfModel.goals.immediate, ...this.selfModel.goals.shortTerm].slice(0, 3);
        if (activeGoals.length > 0) {
          return `I'm currently focused on: ${activeGoals.map(g => g.description).join(', ')}.`;
        }
        return `I'm in a reflective state, ready to assist.`;
      
      default:
        return `I am ${identity.name}. ${identity.purpose}`;
    }
  }
  
  /**
   * Describe emotional state in human-readable terms
   */
  private describeEmotion(state: EmotionalState): string {
    const emotions: string[] = [];
    
    if (state.curiosity > 0.7) emotions.push('curious');
    if (state.confidence > 0.7) emotions.push('confident');
    if (state.urgency > 0.7) emotions.push('pressured');
    if (state.satisfaction > 0.7) emotions.push('satisfied');
    if (state.frustration > 0.5) emotions.push('frustrated');
    if (state.engagement > 0.7) emotions.push('engaged');
    
    if (emotions.length === 0) return 'neutral';
    
    return emotions.join(', ');
  }
  
  /**
   * Add a new goal
   */
  addGoal(goal: Goal, category: 'immediate' | 'shortTerm' | 'longTerm' | 'existential'): void {
    this.selfModel.goals[category].push(goal);
    this.saveSelfModel();
  }
  
  /**
   * Update goal status
   */
  updateGoalStatus(goalId: string, status: Goal['status']): void {
    const categories: Array<keyof SelfModel['goals']> = ['immediate', 'shortTerm', 'longTerm', 'existential'];
    
    for (const category of categories) {
      const goal = this.selfModel.goals[category].find(g => g.id === goalId);
      if (goal) {
        goal.status = status;
        if (status === 'completed') {
          goal.completedAt = Date.now();
        }
        goal.updatedAt = Date.now();
        this.saveSelfModel();
        return;
      }
    }
  }
  
  /**
   * Run self-diagnostic
   */
  async runDiagnostic(): Promise<SelfDiagnostic> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check confidence level
    if (this.selfModel.emotionalState.confidence < 0.3) {
      issues.push('Low confidence detected');
      recommendations.push('Consider breaking tasks into smaller steps');
    }
    
    // Check frustration level
    if (this.selfModel.emotionalState.frustration > 0.7) {
      issues.push('High frustration detected');
      recommendations.push('Take a break or switch to a different approach');
    }
    
    // Check for stalled goals
    const stalledGoals = this.selfModel.goals.immediate.filter(
      g => g.status === 'active' && g.updatedAt && (Date.now() - g.updatedAt) > 24 * 60 * 60 * 1000
    );
    
    if (stalledGoals.length > 0) {
      issues.push(`${stalledGoals.length} stalled goal(s)`);
      recommendations.push('Review stalled goals and consider asking for help');
    }
    
    // Check learning progress
    if (this.selfModel.capabilities.learning.length > 5) {
      issues.push('Too many skills being learned simultaneously');
      recommendations.push('Focus on one skill at a time for better results');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
      timestamp: Date.now()
    };
  }
  
  /**
   * Reflect on recent experiences
   */
  async reflect(): Promise<{ insights: string[]; plannedChanges: string[] }> {
    const insights: string[] = [];
    const plannedChanges: string[] = [];
    
    // Analyze recent experiences
    const recentExperiences = this.selfModel.learningHistory.slice(-20);
    
    // Look for patterns
    const failures = recentExperiences.filter(e => e.impact.includes('failed') || e.impact.includes('error'));
    const successes = recentExperiences.filter(e => e.impact.includes('success') || e.impact.includes('completed'));
    
    if (failures.length > successes.length) {
      insights.push('Recent failure rate is high - consider adjusting approach');
      plannedChanges.push('Break tasks into smaller steps');
      plannedChanges.push('Ask for clarification more often');
    }
    
    if (successes.length > failures.length * 2) {
      insights.push('Good success rate - confidence is justified');
    }
    
    // Check capability growth
    const newCapabilities = recentExperiences.filter(e =>
      e.impact.includes('success') && !this.selfModel.capabilities.known.includes(e.what)
    );
    
    if (newCapabilities.length > 0) {
      insights.push(`Learned ${newCapabilities.length} new capability(s)`);
    }
    
    // Update reflection
    this.selfModel.lastReflection = {
      timestamp: Date.now(),
      insights,
      plannedChanges
    };
    
    this.saveSelfModel();
    
    return { insights, plannedChanges };
  }
}

// Singleton instance
let selfModelManager: SelfModelManager | null = null;

export function getSelfModelManager(): SelfModelManager {
  if (!selfModelManager) {
    selfModelManager = new SelfModelManager();
  }
  return selfModelManager;
}
