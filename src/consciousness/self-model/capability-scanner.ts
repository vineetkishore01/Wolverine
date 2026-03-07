/**
 * Capability Scanner
 * Scans and reports Wolverine's capabilities
 */

import { SelfModel } from './types';

export class CapabilityScanner {
  private selfModel: SelfModel;
  
  constructor(selfModel: SelfModel) {
    this.selfModel = selfModel;
  }
  
  /**
   * Get all known capabilities
   */
  getKnownCapabilities(): string[] {
    return [...this.selfModel.capabilities.known];
  }
  
  /**
   * Get capabilities being learned
   */
  getLearningCapabilities(): string[] {
    return [...this.selfModel.capabilities.learning];
  }
  
  /**
   * Get unknown areas
   */
  getUnknownAreas(): string[] {
    return [...this.selfModel.capabilities.unknown];
  }
  
  /**
   * Check if capability exists
   */
  hasCapability(capability: string): boolean {
    return this.selfModel.capabilities.known.some(c => 
      c.toLowerCase().includes(capability.toLowerCase())
    );
  }
  
  /**
   * Add new capability
   */
  addCapability(capability: string, category: 'known' | 'learning' | 'developing'): void {
    const list = this.selfModel.capabilities[category];
    if (!list.includes(capability)) {
      list.push(capability);
    }
  }
  
  /**
   * Remove capability
   */
  removeCapability(capability: string, category: 'known' | 'learning' | 'developing'): void {
    this.selfModel.capabilities[category] = 
      this.selfModel.capabilities[category].filter(c => c !== capability);
  }
  
  /**
   * Promote capability from learning to known
   */
  promoteCapability(capability: string): void {
    this.removeCapability(capability, 'learning');
    this.addCapability(capability, 'known');
  }
  
  /**
   * Get capability summary
   */
  getSummary(): string {
    const { capabilities } = this.selfModel;
    return `Known: ${capabilities.known.length}, Learning: ${capabilities.learning.length}, Developing: ${capabilities.developing.length}`;
  }
}
