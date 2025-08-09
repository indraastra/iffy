// Choice-Driven Story Format Types
// Based on the PRD specifications for the Emergent Narrative Engine

export interface ChoiceDrivenStory {
  title: string;
  summary: string;
  initial_state: GameState;
  scenes: Record<string, Scene>;
  endings: Record<string, Ending>;
}

export interface GameState {
  [key: string]: StateValue;
}

export type StateValue = string | number | boolean;

export interface Scene {
  purpose: string;
  available_when: string; // Condition expression
}

export interface Ending {
  condition: string; // Condition expression  
  tone: string;
}

// Runtime types for generated content

export interface GeneratedContent {
  narrative: string;
  choices: Choice[];
}

export interface Choice {
  text: string;
  effects: StateEffects;
  next: string; // "continue", "tension_rises", etc.
}

export interface StateEffects {
  [key: string]: StateOperation;
}

export type StateOperation = StateValue | string; // Direct value or "+1", "-1", etc.

// Engine runtime types

export interface GameSession {
  story: ChoiceDrivenStory;
  currentState: GameState;
  currentScene?: string;
  history: GameTurn[];
  isComplete: boolean;
  endingTriggered?: string;
}

export interface GameTurn {
  sceneId: string;
  content: GeneratedContent;
  choiceIndex: number;
  stateAfter: GameState;
  timestamp: Date;
}

// Error handling types

export interface EngineError {
  type: 'condition_evaluation' | 'scene_selection' | 'content_generation' | 'effect_application';
  message: string;
  context?: any;
}

// Content generation context for LLM

export interface ContentGenerationContext {
  story: ChoiceDrivenStory;
  currentState: GameState;
  sceneId: string;
  scene: Scene;
  history: GameTurn[];
}