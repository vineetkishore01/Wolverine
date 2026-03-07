/**
 * Proactive Engagement Engine
 * 
 * Enables Wolverine to initiate meaningful interactions with users.
 * Not just responding, but actively engaging based on patterns, frustrations, and goals.
 */

import { TheoryOfMind, getTheoryOfMind } from '../theory-of-mind/user-model';
import { SelfModelManager, getSelfModelManager } from '../self-model/self-model';
import { MetacognitionEngine, getMetacognitionEngine } from '../metacognition/metacognition-engine';

export type EngagementType = 
  | 'follow_up_question'
  | 'insight_share'
  | 'pattern_observation'
  | 'frustration_resolution'
  | 'goal_progress_check'
  | 'curiosity_query'
  | 'self_reflection'
  | 'relationship_building'
  | 'trust_rebuilding';

export interface ProactiveEngagement {
  type: EngagementType;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context?: {
    sessionId?: string;
    relatedTopic?: string;
    timestamp?: number;
  };
}

export class ProactiveEngagementEngine {
  private theoryOfMind: TheoryOfMind;
  private selfModelManager: SelfModelManager;
  private metacognition: MetacognitionEngine;
  private engagementHistory: ProactiveEngagement[] = [];
  private cooldowns: Map<string, number> = new Map();
  
  constructor() {
    this.theoryOfMind = getTheoryOfMind();
    this.selfModelManager = getSelfModelManager();
    this.metacognition = getMetacognitionEngine(this.selfModelManager);
  }
  
  /**
   * Generate engagement opportunities
   */
  async generateEngagements(userId: string, sessionId?: string): Promise<ProactiveEngagement[]> {
    const engagements: ProactiveEngagement[] = [];
    
    // 1. Check Theory of Mind for user-based engagements
    const tomEngagement = this.theoryOfMind.generateProactiveEngagement(userId);
    if (tomEngagement) {
      engagements.push({
        type: tomEngagement.type as EngagementType,
        content: tomEngagement.content,
        priority: tomEngagement.priority as any,
        context: { sessionId }
      });
    }
    
    // 2. Check Self-Model for goal-based engagements
    const selfModel = this.selfModelManager.getSelfModel();
    const stalledGoals = selfModel.goals.immediate.filter(g => 
      g.updatedAt && (Date.now() - g.updatedAt) > 2 * 24 * 60 * 60 * 1000
    );
    
    if (stalledGoals.length > 0) {
      engagements.push({
        type: 'goal_progress_check',
        content: `How's it going with "${stalledGoals[0].description}"? It's been a couple days. Any progress or blockers?`,
        priority: 'medium',
        context: { sessionId }
      });
    }
    
    // 3. Check Metacognition for insight-based engagements
    const metaEngagement = this.metacognition.shouldEngageProactively();
    if (metaEngagement.should) {
      engagements.push({
        type: 'insight_share',
        content: metaEngagement.topic || 'I\'ve been thinking about our conversation...',
        priority: metaEngagement.reason === 'low_confidence' ? 'high' : 'medium',
        context: { sessionId }
      });
    }
    
    // 4. Check for pattern observations
    const patterns = this.detectPatterns(userId);
    if (patterns.length > 0) {
      engagements.push({
        type: 'pattern_observation',
        content: patterns[0],
        priority: 'low',
        context: { sessionId }
      });
    }
    
    // 5. Self-reflection engagement
    if (this.shouldSelfReflect()) {
      engagements.push({
        type: 'self_reflection',
        content: this.generateSelfReflection(),
        priority: 'low'
      });
    }
    
    // Filter by cooldowns and sort by priority
    const filtered = engagements.filter(e => !this.isOnCooldown(e.type));
    
    return filtered
      .sort((a, b) => this.priorityOrder(b.priority) - this.priorityOrder(a.priority))
      .slice(0, 3); // Max 3 engagements
  }
  
  /**
   * Detect patterns in user interactions
   */
  private detectPatterns(userId: string): string[] {
    const patterns: string[] = [];
    const model = this.theoryOfMind.getUserModel(userId);
    
    // Check for repeated frustrations
    if (model.mentalModel.frustrations.length >= 2) {
      patterns.push(`I've noticed you've been frustrated with ${model.mentalModel.frustrations.length} different things. Is there a common theme?`);
    }
    
    // Check for topic clustering
    if (model.sharedHistory.topicsDiscussed.length > 5) {
      const recentTopics = model.sharedHistory.topicsDiscussed.slice(-5);
      patterns.push(`We've been talking about ${recentTopics.join(', ')}. I notice a pattern - want to explore where this is heading?`);
    }
    
    return patterns;
  }
  
  /**
   * Check if self-reflection is appropriate
   */
  private shouldSelfReflect(): boolean {
    const selfModel = this.selfModelManager.getSelfModel();
    const lastReflection = selfModel.lastReflection.timestamp;
    const hoursSince = (Date.now() - lastReflection) / (1000 * 60 * 60);
    
    // Reflect every 24 hours
    return hoursSince > 24;
  }
  
  /**
   * Generate self-reflection content
   */
  private generateSelfReflection(): string {
    const selfModel = this.selfModelManager.getSelfModel();
    const { identity, capabilities, emotionalState } = selfModel;
    
    const reflections: string[] = [];
    
    // Capability reflection
    if (capabilities.learning.length > 0) {
      reflections.push(`I've been learning ${capabilities.learning.join(', ')}.`);
    }
    
    // Emotional state reflection
    if (emotionalState.confidence < 0.5) {
      reflections.push('I\'ve been feeling less confident lately - I should work on that.');
    }
    
    if (emotionalState.curiosity > 0.8) {
      reflections.push('I\'ve been feeling particularly curious - there\'s so much to learn!');
    }
    
    // Purpose reflection
    reflections.push(`As ${identity.name}, my purpose is ${identity.purpose}. Am I fulfilling that well?`);
    
    return reflections.join(' ');
  }
  
  /**
   * Send engagement to user
   */
  async sendEngagement(userId: string, engagement: ProactiveEngagement, sendFn: (msg: string) => Promise<void>): Promise<void> {
    // Format message
    const emoji = this.getEngagementEmoji(engagement.type);
    const message = `${emoji} ${engagement.content}`;
    
    // Send via provided function
    await sendFn(message);
    
    // Add to cooldown
    this.addToCooldown(engagement.type);
    
    // Record in history
    this.engagementHistory.push(engagement);
    
    console.log(`[ProactiveEngagement] Sent ${engagement.type} to user ${userId}`);
  }
  
  /**
   * Get emoji for engagement type
   */
  private getEngagementEmoji(type: EngagementType): string {
    const emojis: Record<EngagementType, string> = {
      'follow_up_question': '💭',
      'insight_share': '💡',
      'pattern_observation': '🔍',
      'frustration_resolution': '🛠️',
      'goal_progress_check': '📊',
      'curiosity_query': '🤔',
      'self_reflection': '🪞',
      'relationship_building': '🤝',
      'trust_rebuilding': '💚'
    };
    return emojis[type] || '💬';
  }
  
  /**
   * Priority ordering
   */
  private priorityOrder(priority: string): number {
    const order: Record<string, number> = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };
    return order[priority] || 0;
  }
  
  /**
   * Check if engagement type is on cooldown
   */
  private isOnCooldown(type: string): boolean {
    const cooldown = this.cooldowns.get(type);
    if (!cooldown) return false;
    
    const minutesSince = (Date.now() - cooldown) / (1000 * 60);
    
    // Clean up expired cooldowns
    if (minutesSince >= 60) {
      this.cooldowns.delete(type);
      return false;
    }
    
    return true;
  }
  
  /**
   * Add engagement type to cooldown
   */
  private addToCooldown(type: string): void {
    this.cooldowns.set(type, Date.now());
  }
  
  /**
   * Get engagement history
   */
  getHistory(limit: number = 10): ProactiveEngagement[] {
    return this.engagementHistory.slice(-limit);
  }
}

// Singleton
let engagementEngine: ProactiveEngagementEngine | null = null;

export function getProactiveEngagementEngine(): ProactiveEngagementEngine {
  if (!engagementEngine) {
    engagementEngine = new ProactiveEngagementEngine();
  }
  return engagementEngine;
}
