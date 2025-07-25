import { ImpressionistStory, StructuredFlag } from '@/types/impressionistStory';

// Create an alias for compatibility
export type StoryData = ImpressionistStory;

// Simple flag change interface for LLM responses
export interface FlagChange {
  set: string[];
  clear: string[];
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


export class FlagManager {
  private flags: Map<string, any> = new Map();
  private flagDefinitions: Map<string, StructuredFlag> = new Map();
  private flagTriggers: FlagTrigger[] = [];
  private conditionCache: Map<string, boolean> = new Map();

  constructor(story: ImpressionistStory) {
    this.initializeFromStory(story);
  }

  private initializeFromStory(story: ImpressionistStory): void {
    // Initialize structured flags
    if (story.flags) {
      for (const [key, flagDef] of Object.entries(story.flags)) {
        this.flagDefinitions.set(key, flagDef);
        this.flags.set(key, flagDef.default);
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

    // Always track location with automatic location flags
    if (currentScene?.location) {
      this.flags.set('location', currentScene.location);
      this.setLocationFlag(currentScene.location);
    }
  }

  // Get current value of a flag
  getFlag(name: string): any {
    return this.flags.get(name);
  }

  // Set a flag value
  setFlag(name: string, value: any): void {
    this.flags.set(name, value);
    this.invalidateConditionCache();
  }

  // Clear all location flags (at_*)
  clearLocationFlags(): void {
    const locationFlags = Array.from(this.flags.keys()).filter(key => key.startsWith('at_'));
    for (const flag of locationFlags) {
      this.flags.set(flag, false);
    }
    this.invalidateConditionCache();
  }

  // Set the current location flag
  setLocationFlag(location: string): void {
    // Clear all location flags first
    this.clearLocationFlags();
    
    // Set the new location flag
    if (location) {
      this.flags.set(`at_${location}`, true);
    }
  }

  // Apply flag changes from LLM
  applyChanges(changes: FlagChange): void {
    // Set flags to true
    for (const flag of changes.set) {
      this.flags.set(flag, true);
    }

    // Set flags to false
    for (const flag of changes.clear) {
      this.flags.set(flag, false);
    }
    
    // Invalidate cache after batch changes
    this.invalidateConditionCache();
  }

  // Check if flag conditions are met (with caching)
  checkConditions(condition: FlagCondition | undefined): boolean {
    if (!condition) return true;

    // Create cache key from condition
    const cacheKey = this.createConditionCacheKey(condition);
    
    // Check cache first
    if (this.conditionCache.has(cacheKey)) {
      return this.conditionCache.get(cacheKey)!;
    }

    // Calculate result
    const result = this.evaluateConditions(condition);
    
    // Cache the result
    this.conditionCache.set(cacheKey, result);
    
    return result;
  }

  // Internal method to evaluate conditions without caching
  private evaluateConditions(condition: FlagCondition | undefined): boolean {
    if (!condition) return true;

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

  // Evaluate a single condition string (simplified for traditional engine style)
  private evaluateCondition(condition: string): boolean {
    // Handle negation with ! prefix (e.g., "!has_key")
    if (condition.startsWith('!')) {
      const flagName = condition.slice(1).trim();
      const flagValue = this.flags.get(flagName);
      return flagValue !== true;
    }

    // Handle simple boolean checks (e.g., "has_key")
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

  // Get story flags only (excluding location flags) for LLM context
  getStoryFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [key, value] of this.flags.entries()) {
      // Exclude location flags (at_*) and the location key itself
      if (!key.startsWith('at_') && key !== 'location') {
        result[key] = value === true;
      }
    }
    return result;
  }

  getAllFlagNames(): string[] {
    return Array.from(this.flags.keys());
  }

  // Generate FLAG PROGRESSION guidance for LLM prompts
  generateFlagProgressionGuidance(): string {
    if (this.flagDefinitions.size === 0) {
      return '';
    }

    let guidance = 'FLAG PROGRESSION:\nSet these flags as the story develops:\n';
    
    for (const [flagName, flagDef] of this.flagDefinitions.entries()) {
      guidance += `- "${flagName}" → ${flagDef.description}\n`;
    }
    
    return guidance;
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

  // Cache management methods
  private createConditionCacheKey(condition: FlagCondition): string {
    return JSON.stringify(condition);
  }

  private invalidateConditionCache(): void {
    this.conditionCache.clear();
  }

  // Get cache statistics for debugging
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.conditionCache.size
    };
  }

  // Generate flag state section for prompts
  generateFlagStateSection(): string {
    const currentFlags = this.getStoryFlags();
    
    if (!currentFlags || Object.keys(currentFlags).length === 0) {
      return '';
    }

    const setFlags = Object.entries(currentFlags)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);
    
    const unsetFlags = Object.entries(currentFlags)
      .filter(([_, value]) => value === false)
      .map(([key, _]) => key);
    
    let section = `**CURRENT STORY FLAGS:**\n`;
    if (setFlags.length > 0) {
      section += `Set (true): ${setFlags.join(', ')}\n`;
    }
    if (unsetFlags.length > 0) {
      section += `Unset (false): ${unsetFlags.join(', ')}\n`;
    }
    section += '\n';
    
    // Add all available flags for reference
    const allFlags = Object.keys(currentFlags);
    section += `**AVAILABLE FLAGS:** ${allFlags.join(', ')}\n\n`;
    
    // Add note about automatic location management
    section += `**NOTE:** Location flags (at_*) are automatically managed by the engine. Only manage story flags above.\n\n`;
    
    return section;
  }

  // Generate complete flag context for prompts (progression + current state)
  generateFlagContext(): string {
    let context = '';
    
    // Add flag progression guidance
    const progressionGuidance = this.generateFlagProgressionGuidance();
    if (progressionGuidance) {
      context += `**${progressionGuidance}**\n\n`;
    }
    
    // Add current flag state
    context += this.generateFlagStateSection();
    
    return context;
  }

  // Generate flag management instructions for prompts
  generateFlagManagementInstructions(): string {
    return `**FLAG AWARENESS:**
* Consider current flag states when crafting responses
* Respect character behavior based on flags (e.g., if alex_withdrawing is true, show Alex retreating)

**FLAG MANAGEMENT (Simplified System):**
* All flags are boolean (true/false) - no complex expressions
* Set flags when significant story events occur - BE PROACTIVE in recognizing these moments
* Flags track story state and character relationships
* Only set/unset flags that logically result from the current interaction
* IMPORTANT: Don't be overly conservative - set flags when narrative events clearly occur
* Look for clear narrative moments that match the flag descriptions provided in the story
* Set flags based on actual story events, character actions, and dialogue outcomes
* Maintain narrative consistency with established flag states
* NOTE: Location flags (at_*) are automatically managed by the engine - do not modify them`;
  }
}