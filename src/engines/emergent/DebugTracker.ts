// Debug tracking system for LLM interactions and state changes

export type LLMInteractionType = 'blueprint_generation' | 'scene_generation' | 'beat_generation' | 'blank_filling_generation' | 'classification' | 'compilation' | 'content_generation';
export type LLMInteractionPhase = 'architect' | 'director' | 'writer' | 'narrator' | 'classifier';

export interface LLMInteraction {
  id: string;
  timestamp: Date;
  type: LLMInteractionType;
  phase: LLMInteractionPhase;
  prompt: string;
  response: string;
  success: boolean;
  error?: string;
  processingTimeMs: number;
}

export interface StateChange {
  id: string;
  timestamp: Date;
  trigger: 'choice' | 'initialization' | 'restart';
  previousState: any;
  newState: any;
  effects?: any;
  choiceText?: string;
}

export interface DebugLog {
  llmInteractions: LLMInteraction[];
  stateChanges: StateChange[];
  startTime: Date;
  currentSession?: string;
}

export class DebugTracker {
  private log: DebugLog;
  private interactionCounter = 0;
  private stateChangeCounter = 0;

  constructor() {
    this.log = {
      llmInteractions: [],
      stateChanges: [],
      startTime: new Date()
    };
  }

  // Track LLM interaction
  trackLLMInteraction(
    type: LLMInteractionType,
    phase: LLMInteractionPhase,
    prompt: string,
    response: string,
    success: boolean,
    processingTimeMs: number,
    error?: string
  ): string {
    const id = `llm_${++this.interactionCounter}`;
    
    this.log.llmInteractions.push({
      id,
      timestamp: new Date(),
      type,
      phase,
      prompt: this.truncateText(prompt, 5000), // Limit size for UI
      response: this.truncateText(response, 5000),
      success,
      error,
      processingTimeMs
    });

    return id;
  }

  // Track state change
  trackStateChange(
    trigger: 'choice' | 'initialization' | 'restart',
    previousState: any,
    newState: any,
    effects?: any,
    choiceText?: string
  ): string {
    const id = `state_${++this.stateChangeCounter}`;
    
    this.log.stateChanges.push({
      id,
      timestamp: new Date(),
      trigger,
      previousState: this.deepCopy(previousState),
      newState: this.deepCopy(newState),
      effects: effects ? this.deepCopy(effects) : undefined,
      choiceText
    });

    return id;
  }

  // Get current debug log
  getLog(): DebugLog {
    return {
      ...this.log,
      llmInteractions: [...this.log.llmInteractions],
      stateChanges: [...this.log.stateChanges]
    };
  }

  // Get recent interactions (last N)
  getRecentInteractions(count: number = 5): LLMInteraction[] {
    return this.log.llmInteractions.slice(-count);
  }

  // Get recent state changes (last N)
  getRecentStateChanges(count: number = 5): StateChange[] {
    return this.log.stateChanges.slice(-count);
  }

  // Clear the log
  clear(): void {
    this.log = {
      llmInteractions: [],
      stateChanges: [],
      startTime: new Date()
    };
    this.interactionCounter = 0;
    this.stateChangeCounter = 0;
  }

  // Get statistics
  getStats(): {
    totalInteractions: number;
    totalStateChanges: number;
    averageResponseTime: number;
    successRate: number;
    sessionDuration: number;
  } {
    const totalInteractions = this.log.llmInteractions.length;
    const successfulInteractions = this.log.llmInteractions.filter(i => i.success).length;
    const averageResponseTime = totalInteractions > 0 
      ? this.log.llmInteractions.reduce((sum, i) => sum + i.processingTimeMs, 0) / totalInteractions
      : 0;
    
    return {
      totalInteractions,
      totalStateChanges: this.log.stateChanges.length,
      averageResponseTime,
      successRate: totalInteractions > 0 ? successfulInteractions / totalInteractions : 0,
      sessionDuration: Date.now() - this.log.startTime.getTime()
    };
  }

  // Export log as JSON
  exportAsJSON(): string {
    return JSON.stringify(this.log, null, 2);
  }

  // Helper methods
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '... [truncated]';
  }

  private deepCopy(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  // Format interaction for display
  formatInteraction(interaction: LLMInteraction): {
    title: string;
    subtitle: string;
    status: 'success' | 'error';
    details: string;
  } {
    const title = `${interaction.type.toUpperCase()} (${interaction.phase})`;
    const subtitle = `${interaction.timestamp.toLocaleTimeString()} | ${interaction.processingTimeMs}ms`;
    const status = interaction.success ? 'success' : 'error';
    
    let details = `PROMPT:\n${interaction.prompt}\n\n`;
    details += `RESPONSE:\n${interaction.response}`;
    if (interaction.error) {
      details += `\n\nERROR:\n${interaction.error}`;
    }

    return { title, subtitle, status, details };
  }

  // Format state change for display  
  formatStateChange(change: StateChange): {
    title: string;
    subtitle: string;
    details: string;
  } {
    const title = `STATE CHANGE (${change.trigger})`;
    const subtitle = change.timestamp.toLocaleTimeString();
    
    let details = '';
    if (change.choiceText) {
      details += `CHOICE: ${change.choiceText}\n\n`;
    }
    
    if (change.effects) {
      details += `EFFECTS:\n${JSON.stringify(change.effects, null, 2)}\n\n`;
    }

    details += `PREVIOUS STATE:\n${JSON.stringify(change.previousState, null, 2)}\n\n`;
    details += `NEW STATE:\n${JSON.stringify(change.newState, null, 2)}`;

    return { title, subtitle, details };
  }
}
