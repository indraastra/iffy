// Story format types based on the unified flow system

export interface StoryMetadata {
  setting: {
    time: string;
    place: string;
  };
  tone: {
    overall: string;
    narrative_voice: string;
  };
  themes: string[];
  ui?: {
    colors?: {
      primary?: string;
      background?: string;
      text?: string;
    };
  };
}

export interface Character {
  id: string;
  name: string;
  traits: string[];
  voice: string;
  description: string;
  relationships?: { [characterId: string]: string };
}

export interface Location {
  id: string;
  name: string;
  connections: string[];
  description: string;
  objects?: Array<{
    name: string;
    description: string;
    id?: string;
  }>;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  display_name?: string; // Contextual name for narrative text (e.g., "coffee" instead of "Jamie's Coffee")
  location?: string; // Starting location (if item starts visible/accessible)
  hidden?: boolean; // If true, item must be discovered even if location is specified
  discoverable_in?: string; // Alternative: location where this can be found through exploration
  discovery_objects?: string[]; // Objects to search to find this item
  aliases?: string[]; // Alternative names players might use
  // Format v2: Smart item relationships
  can_become?: string; // What this item can transform into (e.g., "toasted bread")
  created_from?: string; // What item this was created from (e.g., "bread")
}


export interface FlowTransition {
  requires: string[];  // Array of flags/conditions that must be met (analogous to success_conditions.requires)
  to_flow: string;
  description?: string; // Optional description for LLM context
}

export interface DialogueChoice {
  text: string;
  next: string;
  sets?: string[];
}

export interface DialogueExchange {
  speaker: string;
  text?: string;
  emotion?: string;
  choices?: DialogueChoice[];
  next?: string;
}

export interface Flow {
  id: string;
  type: 'narrative' | 'dialogue';
  name: string;
  sets?: string[];
  content?: string;
  transitions?: FlowTransition[];  // Renamed from completion_transitions, uses new structure
  participants?: string[];
  location?: string;
  exchanges?: DialogueExchange[];
  player_goal?: string;
  hint?: string;
  ends_game?: boolean; // Marks this flow as a game ending
}


export interface Ending {
  id: string;
  name: string;
  requires: string[];
  content: string;
}

// Format v2: Success conditions for LLM-driven story goals
export interface SuccessCondition {
  id: string;
  description: string; // Natural language description of the goal
  requires: string[]; // Items/flags/knowledge needed (including action requirements)
  ending?: string; // Rich text content for this ending (optional - will be LLM-generated if missing)
}

export interface Story {
  title: string;
  author: string;
  version: string;
  blurb?: string; // Brief description of the story for players to see in game selection
  metadata: StoryMetadata;
  characters: Character[];
  locations: Location[];
  items: Item[];
  flows: Flow[];
  endings?: Ending[]; // Optional - endings can be defined as flows instead
  // Format v2: LLM-driven story intelligence
  success_conditions?: SuccessCondition[]; // Story goals for LLM to track
  llm_guidelines?: string; // Natural language guidance for LLM
}

// Conversation memory types
export interface InteractionPair {
  playerInput: string;
  llmResponse: string;
  timestamp: Date;
  importance: 'low' | 'medium' | 'high';
}

export interface ImmediateContext {
  recentInteractions: InteractionPair[];
  currentScene?: string;
  emotionalContext?: string;
  activeConversation?: string;
}

export interface SignificantMemory {
  id: string;
  type: 'character_bond' | 'discovery' | 'revelation' | 'promise' | 'goal';
  summary: string;
  participants?: string[]; // character IDs involved
  relatedItems?: string[]; // item IDs involved
  relatedLocations?: string[]; // location IDs involved
  importance: number; // 1-10 scoring
  lastAccessed: Date;
  contextTriggers: string[]; // keywords that make this relevant
}

export interface ConversationMemory {
  immediateContext: ImmediateContext;
  significantMemories: SignificantMemory[];
}

// Result types for consistent API responses
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Game state types
export interface GameState {
  currentLocation: string;
  inventory: string[];
  flags: Set<string>;
  currentFlow?: string;
  gameStarted: boolean;
  gameEnded: boolean;
  endingId?: string;
}

// Engine types
export interface PlayerAction {
  type: 'command' | 'choice';
  input: string;
  timestamp: Date;
}

export interface GameResponse {
  text: string;
  choices?: string[];
  gameState: GameState;
  error?: string;
}