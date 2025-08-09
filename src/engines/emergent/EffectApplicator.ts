import { StateManager } from './StateManager.js';
import { Choice, StateEffects, GameState } from '../../types/emergentStory.js';

export class EffectApplicator {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  // Apply effects from a player's choice
  applyChoice(choice: Choice): GameState {
    try {
      // Apply the choice effects to state
      this.stateManager.applyEffects(choice.effects);
      
      // Return the updated state
      return this.stateManager.getState();
    } catch (error) {
      throw new Error(`Failed to apply choice effects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Apply raw state effects
  applyEffects(effects: StateEffects): GameState {
    try {
      this.stateManager.applyEffects(effects);
      return this.stateManager.getState();
    } catch (error) {
      throw new Error(`Failed to apply effects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get current state
  getCurrentState(): GameState {
    return this.stateManager.getState();
  }
}