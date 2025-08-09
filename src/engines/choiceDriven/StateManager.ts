import { GameState, StateValue, StateOperation, StateEffects } from '../../types/choiceDrivenStory.js';

export class StateManager {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = { ...initialState };
  }

  // Get current state (immutable copy)
  getState(): GameState {
    return { ...this.state };
  }

  // Get specific state value
  getValue(key: string): StateValue | undefined {
    return this.state[key];
  }

  // Apply state effects from a choice
  applyEffects(effects: StateEffects): void {
    for (const [key, operation] of Object.entries(effects)) {
      try {
        this.state[key] = this.applyOperation(key, operation);
      } catch (error) {
        throw new Error(`Failed to apply effect to '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Apply a single state operation
  private applyOperation(key: string, operation: StateOperation): StateValue {
    // Handle direct assignment (boolean, string, or number)
    if (typeof operation === 'boolean' || typeof operation === 'number') {
      return operation;
    }

    if (typeof operation === 'string') {
      // Handle increment/decrement operations
      if (operation.startsWith('+')) {
        const increment = parseInt(operation.slice(1), 10);
        if (isNaN(increment)) {
          throw new Error(`Invalid increment operation: ${operation}`);
        }
        const currentValue = this.state[key];
        if (typeof currentValue !== 'number') {
          throw new Error(`Cannot increment non-numeric value: ${key} is ${typeof currentValue}`);
        }
        return currentValue + increment;
      }

      if (operation.startsWith('-')) {
        const decrement = parseInt(operation.slice(1), 10);
        if (isNaN(decrement)) {
          throw new Error(`Invalid decrement operation: ${operation}`);
        }
        const currentValue = this.state[key];
        if (typeof currentValue !== 'number') {
          throw new Error(`Cannot decrement non-numeric value: ${key} is ${typeof currentValue}`);
        }
        return currentValue - decrement;
      }

      // Handle string assignment
      return operation;
    }

    throw new Error(`Invalid operation type: ${typeof operation}`);
  }

  // Create a new StateManager with the same state
  clone(): StateManager {
    return new StateManager(this.state);
  }

  // Reset to initial state
  reset(initialState: GameState): void {
    this.state = { ...initialState };
  }

  // Validate that all required keys exist
  validateKeys(requiredKeys: string[]): void {
    const missing = requiredKeys.filter(key => !(key in this.state));
    if (missing.length > 0) {
      throw new Error(`Missing required state keys: ${missing.join(', ')}`);
    }
  }

  // Get state as string for debugging
  toString(): string {
    return JSON.stringify(this.state, null, 2);
  }

  // Set a single value (for testing/debugging)
  setValue(key: string, value: StateValue): void {
    this.state[key] = value;
  }
}