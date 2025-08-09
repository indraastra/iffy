import { StateManager } from './StateManager.js';
import { Choice, StateEffects, GameState } from '../../types/choiceDrivenStory.js';

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

  // Apply raw state effects (for testing or manual state changes)
  applyEffects(effects: StateEffects): GameState {
    try {
      this.stateManager.applyEffects(effects);
      return this.stateManager.getState();
    } catch (error) {
      throw new Error(`Failed to apply effects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Preview what effects would do without actually applying them
  previewChoice(choice: Choice): GameState {
    // Clone the state manager to avoid modifying the real state
    const tempStateManager = this.stateManager.clone();
    
    try {
      tempStateManager.applyEffects(choice.effects);
      return tempStateManager.getState();
    } catch (error) {
      throw new Error(`Failed to preview choice effects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get current state
  getCurrentState(): GameState {
    return this.stateManager.getState();
  }

  // Validate that choice effects are valid before applying
  validateChoice(choice: Choice): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Try to preview the choice to see if it would work
      this.previewChoice(choice);
      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, errors };
    }
  }

  // Apply multiple choices in sequence (for testing scenarios)
  applyChoiceSequence(choices: Choice[]): GameState {
    for (let i = 0; i < choices.length; i++) {
      try {
        this.applyChoice(choices[i]);
      } catch (error) {
        throw new Error(`Failed to apply choice ${i + 1} in sequence: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    return this.stateManager.getState();
  }
}