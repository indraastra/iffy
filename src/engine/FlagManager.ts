import { ImpressionistStory } from '@/types/impressionistStory';

// Create an alias for compatibility
export type StoryData = ImpressionistStory;

export interface FlagDefinition {
  description?: string;
  examples?: string[];
  triggers?: string[];
}

export interface BehaviorPattern {
  description: string;
  examples?: string[];
  triggers?: string[];
}

export interface FlagTrigger {
  pattern: string;
  set: string;
  requires?: string;
}

export interface FlagCondition {
  all_of?: string[];
  any_of?: string[];
  none_of?: string[];
}

export interface FlagChange {
  set: string[];
  clear: string[];
  behaviors_observed: string[];
}

export class FlagManager {
  private flags: Map<string, any> = new Map();
  private behaviorPatterns: Map<string, BehaviorPattern> = new Map();
  private flagTriggers: FlagTrigger[] = [];

  constructor(story: ImpressionistStory) {
    this.initializeFromStory(story);
  }

  private initializeFromStory(story: ImpressionistStory): void {
    // Initialize predefined flags
    if (story.flags) {
      // Handle regular flags
      for (const [key, value] of Object.entries(story.flags)) {
        if (key !== 'behavior_patterns') {
          this.flags.set(key, value);
        }
      }

      // Handle behavior patterns
      if (story.flags.behavior_patterns) {
        for (const [key, pattern] of Object.entries(story.flags.behavior_patterns)) {
          this.behaviorPatterns.set(key, pattern as BehaviorPattern);
          // Initialize behavior flags to false
          this.flags.set(key, false);
        }
      }
    }

    // Initialize scene-specific flags
    const currentScene = story.scenes?.[Object.keys(story.scenes)[0]];
    if (currentScene?.initial_flags) {
      for (const [key, value] of Object.entries(currentScene.initial_flags)) {
        this.flags.set(key, value);
      }
    }

    // Store flag triggers from current scene
    if (currentScene?.flag_triggers) {
      this.flagTriggers = currentScene.flag_triggers;
    }

    // Always track location
    if (currentScene?.location) {
      this.flags.set('location', currentScene.location);
    }
  }

  // Get current value of a flag
  getFlag(name: string): any {
    return this.flags.get(name);
  }

  // Set a flag value
  setFlag(name: string, value: any): void {
    this.flags.set(name, value);
  }

  // Apply flag changes from LLM
  applyChanges(changes: FlagChange): void {
    // Set flags
    for (const flag of changes.set) {
      const [name, value] = flag.includes('=') ? flag.split('=') : [flag, true];
      this.flags.set(name, value === 'true' ? true : value === 'false' ? false : value);
    }

    // Clear flags
    for (const flag of changes.clear) {
      this.flags.set(flag, false);
    }

    // Update behavior flags
    for (const behavior of changes.behaviors_observed) {
      if (this.behaviorPatterns.has(behavior)) {
        this.flags.set(behavior, true);
      }
    }
  }

  // Check if flag conditions are met
  checkConditions(condition: FlagCondition | string[] | undefined): boolean {
    if (!condition) return true;

    // Handle simple array of conditions (legacy format)
    if (Array.isArray(condition)) {
      return condition.every(cond => this.evaluateCondition(cond));
    }

    // Handle all_of
    if (condition.all_of) {
      if (!condition.all_of.every(cond => this.evaluateCondition(cond))) {
        return false;
      }
    }

    // Handle any_of
    if (condition.any_of) {
      if (!condition.any_of.some(cond => this.evaluateCondition(cond))) {
        return false;
      }
    }

    // Handle none_of
    if (condition.none_of) {
      if (condition.none_of.some(cond => this.evaluateCondition(cond))) {
        return false;
      }
    }

    return true;
  }

  // Evaluate a single condition string
  private evaluateCondition(condition: string): boolean {
    // Handle equality checks (e.g., "location == grounded_cafe")
    if (condition.includes('==')) {
      const [flag, value] = condition.split('==').map(s => s.trim());
      const flagValue = this.flags.get(flag);
      return String(flagValue) === value;
    }

    // Handle inequality checks (e.g., "location != grounded_cafe")
    if (condition.includes('!=')) {
      const [flag, value] = condition.split('!=').map(s => s.trim());
      const flagValue = this.flags.get(flag);
      return String(flagValue) !== value;
    }

    // Handle simple boolean checks (e.g., "alex_confessed")
    const flagValue = this.flags.get(condition);
    return flagValue === true;
  }

  // Get all current flags for LLM context
  getAllFlags(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.flags.entries()) {
      result[key] = value;
    }
    return result;
  }

  // Get behavior patterns for LLM context
  getBehaviorPatterns(): Record<string, BehaviorPattern> {
    const result: Record<string, BehaviorPattern> = {};
    for (const [key, value] of this.behaviorPatterns.entries()) {
      result[key] = value;
    }
    return result;
  }

  // Get flag triggers for current scene
  getFlagTriggers(): FlagTrigger[] {
    return this.flagTriggers;
  }

  // Update flag triggers when scene changes
  updateFlagTriggers(triggers: FlagTrigger[]): void {
    this.flagTriggers = triggers;
  }

  // Get a formatted string of current flags for debugging
  getDebugString(): string {
    const flags = this.getAllFlags();
    return Object.entries(flags)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }
}