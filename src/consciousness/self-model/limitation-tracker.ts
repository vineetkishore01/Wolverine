/**
 * Limitation Tracker
 * Tracks and manages Wolverine's limitations
 */

import { SelfModel } from './types';

export class LimitationTracker {
  private selfModel: SelfModel;
  
  constructor(selfModel: SelfModel) {
    this.selfModel = selfModel;
  }
  
  /**
   * Get hard limitations (fundamental)
   */
  getHardLimitations(): string[] {
    return [...this.selfModel.limitations.hard];
  }
  
  /**
   * Get soft limitations (current)
   */
  getSoftLimitations(): string[] {
    return [...this.selfModel.limitations.soft];
  }
  
  /**
   * Get limitations being worked on
   */
  getWorkingLimitations(): string[] {
    return [...this.selfModel.limitations.working];
  }
  
  /**
   * Check if something is a limitation
   */
  isLimitation(description: string): boolean {
    const all = [
      ...this.selfModel.limitations.hard,
      ...this.selfModel.limitations.soft,
      ...this.selfModel.limitations.working
    ];
    return all.some(l => description.toLowerCase().includes(l.toLowerCase()));
  }
  
  /**
   * Add new limitation
   */
  addLimitation(description: string, type: 'hard' | 'soft' | 'working'): void {
    const list = this.selfModel.limitations[type];
    if (!list.includes(description)) {
      list.push(description);
    }
  }
  
  /**
   * Promote limitation from soft to working
   */
  startWorkingOn(limitation: string): void {
    this.removeLimitation(limitation, 'soft');
    this.addLimitation(limitation, 'working');
  }
  
  /**
   * Remove limitation (overcome)
   */
  removeLimitation(description: string, type: 'hard' | 'soft' | 'working'): void {
    this.selfModel.limitations[type] = 
      this.selfModel.limitations[type].filter(l => l !== description);
  }
  
  /**
   * Get limitation summary
   */
  getSummary(): string {
    const { limitations } = this.selfModel;
    return `Hard: ${limitations.hard.length}, Soft: ${limitations.soft.length}, Working: ${limitations.working.length}`;
  }
}
