// Emergent Narrative Engine Types
// New architecture with Markdown input and per-playthrough compilation

// Author's input - simple Markdown narrative outline
export interface NarrativeOutline {
  title: string;
  markdown: string; // Full Markdown content
}

// Style guidelines for narrative generation
export interface StyleGuidelines {
  narrative?: string;   // Voice and perspective (e.g., "second-person, contemplative")
  choices?: string;     // Choice style and transparency (e.g., "hidden-effects, internal-thoughts")  
  tone?: string;        // Atmospheric keywords (e.g., "mysterious, melancholic")
}

// LLM-generated structure (unique per playthrough)
export interface CompiledStoryStructure {
  title: string;
  initial_state: GameState;
  scene_sequence: SceneDefinition[];
  endings: EndingDefinition[];
  guidelines?: StyleGuidelines;
}

// Linear scene definition
export interface SceneDefinition {
  id: string;
  goal: string; // What this scene aims to accomplish narratively
}

// Ending definition with condition
export interface EndingDefinition {
  id: string;
  tone: string;
  condition: string; // Boolean expression
}

// Runtime state (unchanged from previous)
export interface GameState {
  [key: string]: StateValue;
}

export type StateValue = string | number | boolean;

// Runtime generated content
export interface GeneratedContent {
  narrative: string;
  choices: Choice[];
  scene_complete?: boolean; // Whether scene goal has been fulfilled
}

export interface Choice {
  text: string;
  effects: StateEffects;
}

export interface StateEffects {
  [key: string]: StateOperation;
}

export type StateOperation = StateValue | string; // Direct value or "+1", "-1", etc.

// Game session for linear progression
export interface EmergentGameSession {
  narrativeOutline: NarrativeOutline;
  compiledStructure: CompiledStoryStructure;
  currentState: GameState;
  currentSceneIndex: number;
  history: GameTurn[];
  isComplete: boolean;
  endingTriggered?: string;
}

export interface GameTurn {
  sceneIndex: number;
  sceneId: string;
  content: GeneratedContent;
  choiceIndex: number;
  stateAfter: GameState;
  timestamp: Date;
}

// Story compilation context
export interface CompilationContext {
  narrativeOutline: NarrativeOutline;
}

// Content generation context for runtime
export interface ContentGenerationContext {
  compiledStructure: CompiledStoryStructure;
  currentScene: SceneDefinition;
  currentState: GameState;
  history: GameTurn[];
  sceneIndex: number;
}