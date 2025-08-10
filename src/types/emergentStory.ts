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

// Scene requirement for state validation
export interface SceneRequirement {
  stateKey: string;           // State variable that must be established
  validValues?: string[];     // Optional valid values for the state
  description: string;        // Human-readable description of what this represents
}

// Environmental context for scene atmosphere
export interface SceneEnvironment {
  setting: string;           // Physical location and situation
  atmosphere: string;        // Mood, weather, sensory details
  timeOfDay?: string;        // Time context if relevant
  details?: string[];        // Specific environmental elements
}

// Linear scene definition
export interface SceneDefinition {
  id: string;
  goal: string; // What this scene aims to accomplish narratively
  requirements?: SceneRequirement[]; // State variables that must be established before advancing
  environment?: SceneEnvironment; // Environmental context for atmospheric grounding
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