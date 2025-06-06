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
  location?: string; // Starting location (if item starts visible/accessible)
  hidden?: boolean; // If true, item must be discovered even if location is specified
  discoverable_in?: string; // Alternative: location where this can be found through exploration
  discovery_objects?: string[]; // Objects to search to find this item
  aliases?: string[]; // Alternative names players might use
}

export interface Knowledge {
  id: string;
  description: string;
  requires: string[];
}

export interface FlowTransition {
  type: 'narrative' | 'dialogue';
  trigger: string;
  flow_id: string;
}

export interface CompletionTransition {
  condition: string;
  to_flow: string;
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
  requirements?: string[];
  sets?: string[];
  content?: string;
  next?: FlowTransition[];
  completion_transitions?: CompletionTransition[];
  participants?: string[];
  location?: string;
  exchanges?: DialogueExchange[];
  player_goal?: string;
  hint?: string;
  ends_game?: boolean; // Marks this flow as a game ending
}

export interface StartSection {
  text: string;
  location: string;
  first_flow: string;
  sets?: string[];
}

export interface Ending {
  id: string;
  name: string;
  requires: string[];
  content: string;
}

export interface Story {
  title: string;
  author: string;
  version: string;
  metadata: StoryMetadata;
  characters: Character[];
  locations: Location[];
  items: Item[];
  knowledge: Knowledge[];
  flows: Flow[];
  start: StartSection;
  endings?: Ending[]; // Optional - endings can be defined as flows instead
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

// Game state types
export interface GameState {
  currentLocation: string;
  inventory: string[];
  flags: Set<string>;
  knowledge: Set<string>;
  currentFlow?: string;
  gameStarted: boolean;
  gameEnded: boolean;
  endingId?: string;
  conversationMemory?: ConversationMemory;
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