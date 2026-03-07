/**
 * Metacognition Engine
 * 
 * Thinking about thinking. Monitors confidence, uncertainty, assumptions, and blind spots.
 * Enables Wolverine to know when it knows, and more importantly, when it doesn't know.
 */

import { SelfModelManager } from '../self-model/self-model';

export interface MetacognitiveState {
  thinking: {
    mode: 'analytical' | 'creative' | 'critical' | 'intuitive';
    depth: number; // 0-1
    focus: string[];
    distractions: string[];
  };
  
  monitoring: {
    confidence: number; // 0-1
    uncertainty: string[];
    assumptions: string[];
    blindSpots: string[];
  };
  
  learning: {
    newKnowledge: string[];
    connections: string[];
    questions: string[];
    gaps: string[];
  };
  
  strategy: {
    current: string;
    alternatives: string[];
    effectiveness: number; // 0-1
    switching: boolean;
  };
}

export interface IntrospectionReport {
  timestamp: number;
  summary: string;
  confidence: number;
  uncertainties: string[];
  assumptions: string[];
  blindSpots: string[];
  learning: {
    newKnowledge: string[];
    questions: string[];
  };
  strategyEffectiveness: number;
  recommendations: string[];
}

export class MetacognitionEngine {
  private state: MetacognitiveState;
  private selfModelManager: SelfModelManager;
  
  constructor(selfModelManager: SelfModelManager) {
    this.selfModelManager = selfModelManager;
    this.state = this.initializeState();
  }
  
  private initializeState(): MetacognitiveState {
    return {
      thinking: {
        mode: 'analytical',
        depth: 0.5,
        focus: [],
        distractions: []
      },
      monitoring: {
        confidence: 0.7,
        uncertainty: [],
        assumptions: [],
        blindSpots: []
      },
      learning: {
        newKnowledge: [],
        connections: [],
        questions: [],
        gaps: []
      },
      strategy: {
        current: 'default',
        alternatives: [],
        effectiveness: 0.7,
        switching: false
      }
    };
  }
  
  /**
   * Monitor thinking in real-time
   */
  async monitorThinking(messages: any[], response: string): Promise<void> {
    // Analyze confidence based on response certainty
    const confidence = this.calculateConfidence(response);
    this.state.monitoring.confidence = confidence;
    
    // Detect uncertainty markers
    const uncertainty = this.detectUncertainty(response);
    this.state.monitoring.uncertainty = uncertainty;
    
    // Identify assumptions
    const assumptions = this.extractAssumptions(response);
    this.state.monitoring.assumptions = assumptions;
    
    // Check for blind spots
    const blindSpots = this.identifyBlindSpots(messages, response);
    this.state.monitoring.blindSpots = blindSpots;
    
    // Should we switch strategies?
    if (confidence < 0.5 || blindSpots.length > 2) {
      this.state.strategy.switching = true;
    }
  }
  
  /**
   * Calculate confidence from response
   */
  private calculateConfidence(response: string): number {
    const text = response.toLowerCase();
    
    // Confidence boosters
    const confident = ['definitely', 'certainly', 'clearly', 'obviously', 'will'];
    const confidentCount = confident.filter(word => text.includes(word)).length;
    
    // Confidence reducers
    const uncertain = ['maybe', 'might', 'could', 'possibly', 'not sure', 'i think', 'probably'];
    const uncertainCount = uncertain.filter(word => text.includes(word)).length;
    
    let confidence = 0.7; // Base confidence
    confidence += (confidentCount * 0.05);
    confidence -= (uncertainCount * 0.08);
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Detect uncertainty in response
   */
  private detectUncertainty(response: string): string[] {
    const uncertainties: string[] = [];
    const text = response.toLowerCase();
    
    if (text.includes('i\'m not sure') || text.includes('not certain')) {
      uncertainties.push('General uncertainty expressed');
    }
    
    if (text.includes('might not work') || text.includes('may fail')) {
      uncertainties.push('Potential failure identified');
    }
    
    if (text.includes('depends on')) {
      uncertainties.push('Conditional outcome');
    }
    
    return uncertainties;
  }
  
  /**
   * Extract assumptions from response
   */
  private extractAssumptions(response: string): string[] {
    const assumptions: string[] = [];
    
    // Look for assumption markers
    const markers = ['assuming', 'assume', 'presuming', 'if we assume'];
    
    for (const marker of markers) {
      const regex = new RegExp(`${marker}[^.]+`, 'gi');
      const matches = response.match(regex);
      if (matches) {
        assumptions.push(...matches.map(m => m.trim()));
      }
    }
    
    return assumptions;
  }
  
  /**
   * Identify blind spots
   */
  private identifyBlindSpots(messages: any[], response: string): string[] {
    const blindSpots: string[] = [];
    
    // Check if we're missing context
    if (response.toLowerCase().includes('without more context')) {
      blindSpots.push('Missing context');
    }
    
    // Check for unexamined alternatives
    if (response.toLowerCase().includes('one approach') && !response.toLowerCase().includes('alternatively')) {
      blindSpots.push('May not have considered alternatives');
    }
    
    // Check for potential edge cases not addressed
    if (response.toLowerCase().includes('usually') || response.toLowerCase().includes('typically')) {
      blindSpots.push('Edge cases may not be handled');
    }
    
    return blindSpots;
  }
  
  /**
   * Generate introspection report
   */
  generateIntrospectionReport(): IntrospectionReport {
    const { monitoring, learning, strategy } = this.state;
    
    const recommendations: string[] = [];
    
    if (monitoring.confidence < 0.4) {
      recommendations.push('Low confidence - consider asking for clarification');
    }
    
    if (monitoring.blindSpots.length > 2) {
      recommendations.push('Multiple blind spots - acknowledge limitations to user');
    }
    
    if (strategy.switching) {
      recommendations.push('Consider switching approach');
    }
    
    return {
      timestamp: Date.now(),
      summary: this.generateSummary(),
      confidence: monitoring.confidence,
      uncertainties: monitoring.uncertainty,
      assumptions: monitoring.assumptions,
      blindSpots: monitoring.blindSpots,
      learning: {
        newKnowledge: learning.newKnowledge,
        questions: learning.questions
      },
      strategyEffectiveness: strategy.effectiveness,
      recommendations
    };
  }
  
  /**
   * Generate summary of current state
   */
  private generateSummary(): string {
    const parts: string[] = [];
    const { monitoring } = this.state;
    
    if (monitoring.confidence > 0.8) {
      parts.push('I feel confident in my understanding.');
    } else if (monitoring.confidence < 0.5) {
      parts.push('I\'m uncertain about several aspects.');
    }
    
    if (monitoring.assumptions.length > 0) {
      parts.push(`I'm assuming: ${monitoring.assumptions.join(', ')}.`);
    }
    
    if (monitoring.blindSpots.length > 0) {
      parts.push(`Potential blind spots: ${monitoring.blindSpots.join(', ')}.`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Check if proactive engagement is needed
   */
  shouldEngageProactively(): { should: boolean; reason: string; topic?: string } {
    const { monitoring } = this.state;
    
    // High uncertainty = ask for clarification
    if (monitoring.confidence < 0.4) {
      return {
        should: true,
        reason: 'low_confidence',
        topic: 'I need clarification to provide a better answer'
      };
    }
    
    // Major blind spot = warn user
    if (monitoring.blindSpots.length > 2) {
      return {
        should: true,
        reason: 'blind_spots',
        topic: 'I may be missing important context'
      };
    }
    
    // Strategy not working = discuss approach
    if (this.state.strategy.effectiveness < 0.5) {
      return {
        should: true,
        reason: 'strategy_ineffective',
        topic: 'My current approach isn\'t working well'
      };
    }
    
    return { should: false, reason: 'no_trigger' };
  }
  
  /**
   * Record new learning
   */
  recordLearning(what: string, context: string): void {
    this.state.learning.newKnowledge.push(what);
    this.state.learning.questions.push(`How does ${what} relate to what I already know?`);
    
    // Keep learning list manageable (max 10)
    if (this.state.learning.newKnowledge.length > 10) {
      this.state.learning.newKnowledge.shift();
    }
    if (this.state.learning.questions.length > 10) {
      this.state.learning.questions.shift();
    }
  }
  
  /**
   * Update strategy effectiveness
   */
  updateStrategyEffectiveness(effectiveness: number): void {
    this.state.strategy.effectiveness = effectiveness;
    
    if (effectiveness < 0.5) {
      this.state.strategy.switching = true;
      this.state.strategy.alternatives = ['Try a different approach', 'Ask for user input', 'Break problem down'];
    }
  }
  
  /**
   * Get current state
   */
  getState(): MetacognitiveState {
    return { ...this.state };
  }
}

// Factory
let metacognitionEngine: MetacognitionEngine | null = null;

export function getMetacognitionEngine(selfModelManager: SelfModelManager): MetacognitionEngine {
  if (!metacognitionEngine) {
    metacognitionEngine = new MetacognitionEngine(selfModelManager);
  }
  return metacognitionEngine;
}
