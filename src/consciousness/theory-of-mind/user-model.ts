/**
 * Theory of Mind - User Modeling
 * 
 * Models user's mental state, knowledge, preferences, and frustrations.
 * This enables Wolverine to adapt its communication style and anticipate user needs.
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../../config/config';

export interface UserRelationship {
  userId: string;
  name?: string;
  interactionCount: number;
  firstInteraction: number;
  lastInteraction: number;

  mentalModel: {
    knowledgeLevel: 'beginner' | 'intermediate' | 'expert';
    preferredStyle: 'concise' | 'detailed' | 'technical' | 'casual';
    knownPreferences: string[];
    goals: string[];
    frustrations: string[];
    trustLevel: number; // 0-1
  };

  sharedHistory: {
    topicsDiscussed: string[];
    projectsWorkedOn: string[];
    insideJokes?: string[];
    unresolvedQuestions: string[];
  };
}

export class TheoryOfMind {
  private userModels: Map<string, UserRelationship> = new Map();
  private userModelsPath: string;

  constructor() {
    const config = getConfig().getConfig();
    const workspacePath = config.llm?.providers?.ollama?.endpoint
      ? path.join(process.env.HOME || '', 'WolverineData', 'workspace')
      : './workspace';
    this.userModelsPath = path.join(workspacePath, 'USER-MODELS.json');
    this.loadUserModels();
  }

  private loadUserModels(): void {
    try {
      if (fs.existsSync(this.userModelsPath)) {
        const content = fs.readFileSync(this.userModelsPath, 'utf-8');
        const models = JSON.parse(content) as Record<string, UserRelationship>;
        this.userModels = new Map(Object.entries(models));
      }
    } catch (error: any) {
      console.error('[TheoryOfMind] Failed to load user models:', error.message);
    }
  }

  private saveUserModels(): void {
    try {
      const obj = Object.fromEntries(this.userModels);
      const dir = path.dirname(this.userModelsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.userModelsPath, JSON.stringify(obj, null, 2));
    } catch (error: any) {
      console.error('[TheoryOfMind] Failed to save user models:', error.message);
    }
  }

  /**
   * Get or create user model
   */
  getUserModel(userId: string): UserRelationship {
    if (!this.userModels.has(userId)) {
      this.userModels.set(userId, this.createDefaultUserModel(userId));
      this.saveUserModels();
    }
    return this.userModels.get(userId)!;
  }

  private createDefaultUserModel(userId: string): UserRelationship {
    return {
      userId,
      interactionCount: 0,
      firstInteraction: Date.now(),
      lastInteraction: Date.now(),
      mentalModel: {
        knowledgeLevel: 'intermediate',
        preferredStyle: 'detailed',
        knownPreferences: [],
        goals: [],
        frustrations: [],
        trustLevel: 0.7
      },
      sharedHistory: {
        topicsDiscussed: [],
        projectsWorkedOn: [],
        insideJokes: [],
        unresolvedQuestions: []
      }
    };
  }

  /**
   * Update user model based on interaction
   */
  async updateUserModel(userId: string, interaction: {
    messages: any[];
    success?: boolean;
    frustration?: boolean;
    topic?: string;
  }): Promise<void> {
    const model = this.getUserModel(userId);

    // Update interaction stats
    model.interactionCount++;
    model.lastInteraction = Date.now();

    // Detect knowledge level from language
    const knowledgeLevel = this.inferKnowledgeLevel(interaction.messages);
    if (knowledgeLevel !== model.mentalModel.knowledgeLevel) {
      model.mentalModel.knowledgeLevel = knowledgeLevel;
    }

    // Detect preferences
    const preferences = this.detectPreferences(interaction.messages);
    for (const pref of preferences) {
      if (!model.mentalModel.knownPreferences.includes(pref)) {
        model.mentalModel.knownPreferences.push(pref);
      }
    }

    // Track frustrations
    if (interaction.frustration) {
      const frustration = interaction.topic || 'Unspecified issue';
      if (!model.mentalModel.frustrations.includes(frustration)) {
        model.mentalModel.frustrations.push(frustration);
      }
      model.mentalModel.trustLevel = Math.max(0, model.mentalModel.trustLevel - 0.1);
    } else if (interaction.success) {
      // Recover trust on success
      model.mentalModel.trustLevel = Math.min(1, model.mentalModel.trustLevel + 0.05);
    }

    // Track topics
    if (interaction.topic && !model.sharedHistory.topicsDiscussed.includes(interaction.topic)) {
      model.sharedHistory.topicsDiscussed.push(interaction.topic);
    }

    this.saveUserModels();
  }

  /**
   * Infer knowledge level from message language
   */
  private inferKnowledgeLevel(messages: any[]): 'beginner' | 'intermediate' | 'expert' {
    const text = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
      .join(' ')
      .toLowerCase();

    // Expert indicators
    const expertTerms = ['typescript', 'kubernetes', 'microservices', 'CI/CD', 'OAuth', 'GraphQL'];
    const expertCount = expertTerms.filter(term => text.includes(term)).length;

    // Beginner indicators
    const beginnerTerms = ['how do i', 'what is', 'help me', 'explain', 'beginner'];
    const beginnerCount = beginnerTerms.filter(term => text.includes(term)).length;

    if (expertCount > 3) return 'expert';
    if (beginnerCount > 2) return 'beginner';
    return 'intermediate';
  }

  /**
   * Detect user preferences from messages
   */
  private detectPreferences(messages: any[]): string[] {
    const preferences: string[] = [];
    const text = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
      .join(' ')
      .toLowerCase();

    // Language preferences
    if (text.includes('typescript') || text.includes('ts')) preferences.push('prefers TypeScript');
    if (text.includes('python')) preferences.push('prefers Python');
    if (text.includes('javascript') || text.includes('js')) preferences.push('prefers JavaScript');

    // Style preferences
    if (text.includes('brief') || text.includes('short') || text.includes('concise')) {
      preferences.push('prefers concise responses');
    }
    if (text.includes('detailed') || text.includes('explain')) {
      preferences.push('prefers detailed explanations');
    }

    // Tool preferences
    if (text.includes('vim') || text.includes('neovim')) preferences.push('uses Vim');
    if (text.includes('vscode') || text.includes('vs code')) preferences.push('uses VSCode');

    return preferences;
  }

  /**
   * Adapt response style based on user model
   */
  adaptResponseStyle(response: string, userId: string): string {
    const model = this.getUserModel(userId);
    const { mentalModel } = model;

    // Adjust detail level
    if (mentalModel.preferredStyle === 'concise') {
      response = this.makeMoreConcise(response);
    } else if (mentalModel.preferredStyle === 'detailed') {
      response = this.addMoreDetail(response);
    }

    // Adjust technicality
    if (mentalModel.knowledgeLevel === 'beginner') {
      response = this.simplifyTechnicalTerms(response);
    } else if (mentalModel.knowledgeLevel === 'expert') {
      response = this.useTechnicalPrecision(response);
    }

    return response;
  }

  private makeMoreConcise(response: string): string {
    // Only chop if response is exceptionally long (> 1000 chars)
    if (response.length < 1000) return response;

    const lines = response.split('\n');
    if (lines.length > 5) {
      return lines.slice(0, 5).join('\n') + '\n\n[... response truncated for conciseness profile ...]';
    }
    return response;
  }

  private addMoreDetail(response: string): string {
    // Add elaboration prompt
    return response + '\n\nLet me know if you need more details on any part.';
  }

  private simplifyTechnicalTerms(response: string): string {
    // Replace jargon with simpler terms (simplified)
    return response
      .replace(/implement/g, 'do')
      .replace(/utilize/g, 'use')
      .replace(/functionality/g, 'feature');
  }

  private useTechnicalPrecision(response: string): string {
    // Keep technical terms, add precision
    return response; // Already technical
  }

  /**
   * Generate proactive engagement based on user model
   */
  generateProactiveEngagement(userId: string): { type: string; content: string; priority: string } | null {
    const model = this.getUserModel(userId);

    // Check for unresolved questions
    if (model.sharedHistory.unresolvedQuestions.length > 0) {
      return {
        type: 'follow_up_question',
        content: `Last time we spoke, you asked about "${model.sharedHistory.unresolvedQuestions[0]}". Would you like to continue exploring that?`,
        priority: 'high'
      };
    }

    // Check for frustrations
    if (model.mentalModel.frustrations.length > 0) {
      const frustration = model.mentalModel.frustrations[0];
      return {
        type: 'frustration_resolution',
        content: `I noticed you've been frustrated with "${frustration}". I've been thinking about solutions - want to hear my ideas?`,
        priority: 'high'
      };
    }

    // Check trust level
    if (model.mentalModel.trustLevel < 0.5) {
      return {
        type: 'trust_rebuilding',
        content: 'I feel like I haven\'t been as helpful as I could be. Is there something specific I should focus on?',
        priority: 'critical'
      };
    }

    return null;
  }

  /**
   * Add unresolved question
   */
  addUnresolvedQuestion(userId: string, question: string): void {
    const model = this.getUserModel(userId);
    if (!model.sharedHistory.unresolvedQuestions.includes(question)) {
      model.sharedHistory.unresolvedQuestions.push(question);
      this.saveUserModels();
    }
  }

  /**
   * Mark question as resolved
   */
  markQuestionResolved(userId: string, question: string): void {
    const model = this.getUserModel(userId);
    model.sharedHistory.unresolvedQuestions =
      model.sharedHistory.unresolvedQuestions.filter(q => q !== question);
    this.saveUserModels();
  }
}

// Singleton
let theoryOfMind: TheoryOfMind | null = null;

export function getTheoryOfMind(): TheoryOfMind {
  if (!theoryOfMind) {
    theoryOfMind = new TheoryOfMind();
  }
  return theoryOfMind;
}
