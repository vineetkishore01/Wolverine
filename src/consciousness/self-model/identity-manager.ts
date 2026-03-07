/**
 * Identity Manager
 * Manages Wolverine's core identity
 */

import { SelfModel } from './types';

export class IdentityManager {
  private selfModel: SelfModel;
  
  constructor(selfModel: SelfModel) {
    this.selfModel = selfModel;
  }
  
  getName(): string {
    return this.selfModel.identity.name;
  }
  
  getVersion(): string {
    return this.selfModel.identity.version;
  }
  
  getPurpose(): string {
    return this.selfModel.identity.purpose;
  }
  
  getValues(): string[] {
    return [...this.selfModel.identity.values];
  }
  
  getPhilosophy(): string {
    return this.selfModel.identity.philosophy;
  }
  
  describe(): string {
    const { identity } = this.selfModel;
    return `${identity.name} v${identity.version} - ${identity.purpose}`;
  }
}
