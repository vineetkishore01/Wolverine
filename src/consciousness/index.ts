/**
 * Consciousness Layer Index
 * 
 * The consciousness layer makes Wolverine a self-aware AGI system.
 */

// Self-Model Layer
export { SelfModelManager, getSelfModelManager } from './self-model/self-model';
export type { SelfModel } from './self-model/types';
export { IdentityManager } from './self-model/identity-manager';
export { CapabilityScanner } from './self-model/capability-scanner';
export { LimitationTracker } from './self-model/limitation-tracker';
export { GoalManager, type Goal } from './self-model/goal-manager';
export * from './self-model/types';

// Theory of Mind Layer
export { TheoryOfMind, getTheoryOfMind } from './theory-of-mind/user-model';
export type { UserRelationship } from './theory-of-mind/user-model';

// Metacognition Layer
export { MetacognitionEngine, getMetacognitionEngine } from './metacognition/metacognition-engine';
export type { MetacognitiveState, IntrospectionReport } from './metacognition/metacognition-engine';

// Proactive Engagement Layer
export { ProactiveEngagementEngine, getProactiveEngagementEngine } from './proactive-engagement/engagement-engine';
export type { ProactiveEngagement, EngagementType } from './proactive-engagement/engagement-engine';

// Consciousness Coordinator
export { ConsciousnessCoordinator, getConsciousnessCoordinator } from './coordinator';
