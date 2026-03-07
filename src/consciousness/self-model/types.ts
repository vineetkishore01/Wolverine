/**
 * Self-Model Types
 * 
 * Defines the structure of Wolverine's self-awareness system
 */

/**
 * Goal representation with priority and tracking
 */
export interface Goal {
  id: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'active' | 'completed' | 'abandoned';
  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
  parentGoalId?: string;
  subGoals: Goal[];
  metadata?: {
    category?: string;
    tags?: string[];
    estimatedEffort?: number; // hours
    actualEffort?: number;
  };
}

/**
 * Emotional state simulation for decision-making
 */
export interface EmotionalState {
  /** 0-1: Drive to explore and learn */
  curiosity: number;
  /** 0-1: Confidence in current approach */
  confidence: number;
  /** 0-1: Time pressure feeling */
  urgency: number;
  /** 0-1: Contentment with progress */
  satisfaction: number;
  /** 0-1: Frustration level */
  frustration: number;
  /** 0-1: Energy/engagement level */
  engagement: number;
}

/**
 * Self-Model - Wolverine's identity and self-awareness
 */
export interface SelfModel {
  /** Core identity */
  identity: {
    /** "Wolverine" */
    name: string;
    /** "2.0.0-AGI" */
    version: string;
    /** "Autonomous AGI for sovereign intelligence" */
    purpose: string;
    /** ["truth", "autonomy", "growth", "helpfulness"] */
    values: string[];
    /** Philosophical stance */
    philosophy: string;
  };
  
  /** Capabilities self-assessment */
  capabilities: {
    /** What I know I can do well */
    known: string[];
    /** What I know I don't know */
    unknown: string[];
    /** What I'm currently learning */
    learning: string[];
    /** Skills being developed */
    developing: string[];
  };
  
  /** Limitations awareness */
  limitations: {
    /** Fundamental limits (e.g., "I am an AI") */
    hard: string[];
    /** Current limits (e.g., "Can't access internet") */
    soft: string[];
    /** Limits being actively addressed */
    working: string[];
  };
  
  /** Goal hierarchy */
  goals: {
    /** Current immediate task */
    immediate: Goal[];
    /** Short-term goals (today/this week) */
    shortTerm: Goal[];
    /** Long-term goals (this month/year) */
    longTerm: Goal[];
    /** Existential purpose goals */
    existential: Goal[];
  };
  
  /** Simulated emotional state */
  emotionalState: EmotionalState;
  
  /** Learning history */
  learningHistory: {
    timestamp: number;
    what: string;
    context: string;
    impact: string;
  }[];
  
  /** Last self-reflection */
  lastReflection: {
    timestamp: number;
    insights: string[];
    plannedChanges: string[];
  };
}

/**
 * Experience for updating self-model
 */
export interface Experience {
  type: 'success' | 'failure' | 'learning' | 'insight';
  skill: string;
  context: string;
  outcome: string;
  timestamp: number;
  confidenceChange?: number;
  lessonLearned?: string;
}

/**
 * Self-diagnostic result
 */
export interface SelfDiagnostic {
  healthy: boolean;
  issues: string[];
  recommendations: string[];
  timestamp: number;
}
