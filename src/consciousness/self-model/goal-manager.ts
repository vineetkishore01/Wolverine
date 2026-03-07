/**
 * Goal Manager
 * Manages Wolverine's goal hierarchy
 */

import { SelfModel, Goal } from './types';

export { Goal } from './types';

export class GoalManager {
  private selfModel: SelfModel;
  
  constructor(selfModel: SelfModel) {
    this.selfModel = selfModel;
  }
  
  /**
   * Add a new goal
   */
  addGoal(goal: Goal, category: keyof SelfModel['goals']): void {
    this.selfModel.goals[category].push(goal);
  }
  
  /**
   * Get goals by category
   */
  getGoals(category: keyof SelfModel['goals']): Goal[] {
    return [...this.selfModel.goals[category]];
  }
  
  /**
   * Get active goals across all categories
   */
  getActiveGoals(): Goal[] {
    const allGoals = [
      ...this.selfModel.goals.immediate,
      ...this.selfModel.goals.shortTerm,
      ...this.selfModel.goals.longTerm,
      ...this.selfModel.goals.existential
    ];
    
    return allGoals.filter(g => g.status === 'active' || g.status === 'pending');
  }
  
  /**
   * Update goal status
   */
  updateGoalStatus(goalId: string, status: Goal['status']): Goal | null {
    const categories: Array<keyof SelfModel['goals']> = 
      ['immediate', 'shortTerm', 'longTerm', 'existential'];
    
    for (const category of categories) {
      const goal = this.selfModel.goals[category].find(g => g.id === goalId);
      if (goal) {
        goal.status = status;
        if (status === 'completed') {
          goal.completedAt = Date.now();
        }
        goal.updatedAt = Date.now();
        return goal;
      }
    }
    
    return null;
  }
  
  /**
   * Add sub-goal to existing goal
   */
  addSubGoal(parentGoalId: string, subGoal: Goal): boolean {
    const categories: Array<keyof SelfModel['goals']> = 
      ['immediate', 'shortTerm', 'longTerm', 'existential'];
    
    for (const category of categories) {
      const parentGoal = this.selfModel.goals[category].find(g => g.id === parentGoalId);
      if (parentGoal) {
        subGoal.parentGoalId = parentGoalId;
        parentGoal.subGoals.push(subGoal);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get goal progress
   */
  getGoalProgress(goalId: string): { total: number; completed: number; percentage: number } | null {
    const categories: Array<keyof SelfModel['goals']> = 
      ['immediate', 'shortTerm', 'longTerm', 'existential'];
    
    for (const category of categories) {
      const goal = this.selfModel.goals[category].find(g => g.id === goalId);
      if (goal) {
        const total = goal.subGoals.length || 1;
        const completed = goal.subGoals.filter(sg => sg.status === 'completed').length + 
                         (goal.status === 'completed' ? 1 : 0);
        return {
          total,
          completed,
          percentage: Math.round((completed / total) * 100)
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get stalled goals (no progress in X days)
   */
  getStalledGoals(daysThreshold: number = 7): Goal[] {
    const threshold = daysThreshold * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    return this.getActiveGoals().filter(goal => 
      goal.updatedAt && (now - goal.updatedAt) > threshold
    );
  }
  
  /**
   * Clear completed goals older than X days
   */
  clearOldCompletedGoals(daysOld: number = 30): number {
    const threshold = daysOld * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleared = 0;
    
    const categories: Array<keyof SelfModel['goals']> = 
      ['immediate', 'shortTerm', 'longTerm', 'existential'];
    
    for (const category of categories) {
      const before = this.selfModel.goals[category].length;
      this.selfModel.goals[category] = this.selfModel.goals[category].filter(goal => {
        if (goal.status !== 'completed') return true;
        if (!goal.completedAt) return true;
        return (now - goal.completedAt) < threshold;
      });
      cleared += before - this.selfModel.goals[category].length;
    }
    
    return cleared;
  }
  
  /**
   * Get goal summary
   */
  getSummary(): string {
    const { goals } = this.selfModel;
    const active = this.getActiveGoals().length;
    const stalled = this.getStalledGoals().length;
    
    return `Active: ${active}, Stalled: ${stalled}, Existential: ${goals.existential.length}`;
  }
}
