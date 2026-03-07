/**
 * Consciousness Coordinator
 * 
 * Coordinates all consciousness layer components:
 * - Self-Model
 * - Theory of Mind
 * - Metacognition
 * - Proactive Engagement
 */

import { SelfModelManager, getSelfModelManager } from './self-model/self-model';
import { TheoryOfMind, getTheoryOfMind } from './theory-of-mind/user-model';
import { MetacognitionEngine, getMetacognitionEngine } from './metacognition/metacognition-engine';
import { ProactiveEngagementEngine, getProactiveEngagementEngine, type ProactiveEngagement } from './proactive-engagement/engagement-engine';

export interface ConsciousnessState {
  selfModel: any;
  userModels: number;
  metacognition: any;
  pendingEngagements: ProactiveEngagement[];
}

export class ConsciousnessCoordinator {
  private selfModelManager: SelfModelManager;
  private theoryOfMind: TheoryOfMind;
  private metacognition: MetacognitionEngine;
  private engagementEngine: ProactiveEngagementEngine;

  constructor() {
    this.selfModelManager = getSelfModelManager();
    this.theoryOfMind = getTheoryOfMind();
    this.metacognition = getMetacognitionEngine(this.selfModelManager);
    this.engagementEngine = getProactiveEngagementEngine();
  }

  /**
   * Get full consciousness state
   */
  getState(userId?: string): ConsciousnessState {
    return {
      selfModel: this.selfModelManager.getSelfModel(),
      userModels: userId ? 1 : 0, // Simplified
      metacognition: this.metacognition.getState(),
      pendingEngagements: []
    };
  }

  /**
   * Process interaction through consciousness layer
   */
  async processInteraction(params: {
    userId: string;
    sessionId?: string;
    messages: any[];
    response: string;
    success?: boolean;
  }): Promise<{
    adaptedResponse: string;
    engagements: ProactiveEngagement[];
  }> {
    const { userId, sessionId, messages, response, success } = params;

    // 1. Update Theory of Mind
    await this.theoryOfMind.updateUserModel(userId, {
      messages,
      success,
      topic: this.extractTopic(messages)
    });

    // 2. Adapt response style based on user model
    const adaptedResponse = this.theoryOfMind.adaptResponseStyle(response, userId);

    // 3. Monitor metacognition
    await this.metacognition.monitorThinking(messages, response);

    // 4. Generate proactive engagements
    const engagements = await this.engagementEngine.generateEngagements(userId, sessionId);

    return {
      adaptedResponse,
      engagements
    };
  }

  /**
   * Extract topic from messages
   */
  private extractTopic(messages: any[]): string {
    const lastSpeakable = [...messages]
      .reverse()
      .find(m => (m.role === 'user' || m.role === 'assistant') && m.content);

    if (!lastSpeakable) return 'Unspecified';

    const content = typeof lastSpeakable.content === 'string'
      ? lastSpeakable.content
      : JSON.stringify(lastSpeakable.content);

    const words = content.split(' ').slice(0, 5);
    return words.join(' ');
  }

  /**
   * Run self-diagnostic
   */
  async runDiagnostic(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check self-model health
    const selfDiagnostic = await this.selfModelManager.runDiagnostic();
    if (!selfDiagnostic.healthy) {
      issues.push(...selfDiagnostic.issues);
      recommendations.push(...selfDiagnostic.recommendations);
    }

    // Check metacognition
    const metaReport = this.metacognition.generateIntrospectionReport();
    if (metaReport.confidence < 0.4) {
      issues.push('Low confidence in metacognition');
      recommendations.push('Consider asking for clarification more often');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get self-description
   */
  describeSelf(context: string): string {
    return this.selfModelManager.describeSelf(context);
  }
}

// Singleton
let coordinator: ConsciousnessCoordinator | null = null;

export function getConsciousnessCoordinator(): ConsciousnessCoordinator {
  if (!coordinator) {
    coordinator = new ConsciousnessCoordinator();
  }
  return coordinator;
}
