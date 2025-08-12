// Emergent Narrative Engine Types
// Refactored for a three-tier generation architecture: Blueprint -> Scene -> Beat

// ~~~ Tier 1: Blueprint Generation ~~~

/**
 * The author's input, typically from a Markdown file.
 */
export interface NarrativeOutline {
  title: string;
  markdown: string;
}

/**
 * High-level setting description, defined once in the blueprint.
 */
export interface StorySetting {
  world: string;
  tone: string;
  time_period: string;
}

/**
 * A high-level description of a potential ending for the story.
 */
export interface PotentialEnding {
  id: string;
  title: string;
  description: string;
  tone: string;
}

/**
 * A single scene's concrete details within the blueprint's narrative arc.
 */
export interface BlueprintScene {
  id: string;
  goal: string; // What the beat generator should help the player work towards
  narrative: string; // What story is actually being told in this scene
  location: string; // Where this scene takes place
  characters: string[]; // Who is involved in this scene
  dramatic_function: "exposition" | "rising_action" | "climax" | "falling_action" | "resolution";
}

/**
 * The output of the BlueprintGenerator. A high-level, purely narrative
 * structure for the story. It contains no mechanical or state information.
 */
export interface StoryBlueprint {
  title: string;
  setting: StorySetting;
  scene_sequence: BlueprintScene[];
  potential_endings: PotentialEnding[];
  blanks: string[]; // Elements the author left for players to define (e.g., "physical_presence", "emotional_connection")
}


// ~~~ Tier 2: Scene Generation ~~~

/**
 * A directive for the BeatGenerator, specifying a state key to be updated
 * and a narrative description of how to do it.
 */
export interface Requirement {
  key_to_update: string;
  description: string;
}

/**
 * A rule for exiting the current scene, either to another scene or to an ending.
 * The condition is a simple, deterministic expression evaluated by the engine.
 */
export interface SceneTransition {
  target: string; // The ID of the next scene or a potential ending
  condition: string; // A boolean expression, or "continue" for the default path
}

/**
 * The output of the SceneGenerator. A concrete, playable definition for a single
 * scene, including its interactive requirements and its exit logic.
 */
export interface StoryScene {
  id: string;
  goal: string;
  requirements: Requirement[]; // Scene progression goals
  blanks: string[]; // Elements that need to be established for this scene (can include global + scene-specific)
  transitions: SceneTransition[];
}


// ~~~ Tier 3: Beat Generation ~~~

export type StateValue = string | number | boolean | undefined;

export interface StateEffects {
  [key: string]: StateValue | string; // e.g., { "trust": 1, "status": "ally" } or { "trust": "+1" }
}

/**
 * A single choice presented to the player.
 */
export interface Choice {
  text: string;
  effects: StateEffects;
}

/**
 * The output of the BeatGenerator. A single, playable moment of gameplay,
 * consisting of narrative text and a set of choices.
 */
export interface StoryBeat {
  narrative_text: string;
  choices: Choice[];
}


// ~~~ Session & State Management ~~~

export interface GameState {
  [key: string]: StateValue;
}

export interface GameTurn {
  sceneId: string;
  beat: StoryBeat;
  choiceIndex: number;
  stateAfter: GameState;
  timestamp: Date;
}

export interface EmergentGameSession {
  blueprint: StoryBlueprint;
  currentState: GameState;
  currentSceneId: string;
  history: GameTurn[];
  isComplete: boolean;
  endingTriggered?: string;
}


// ~~~ Deprecated / Legacy Types ~~~
// These are kept for reference or for compatibility during transition.

export interface CompiledStoryStructure {
  title: string;
  setting?: StorySetting;
  initial_state?: GameState;
  scene_sequence: SceneDefinition[];
  endings: EndingDefinition[];
}

export interface SceneDefinition {
  id: string;
  goal: string;
  requirements?: any[];
  environment?: any;
}

export interface EndingDefinition {
  id: string;
  tone: string;
  condition: string;
}

export interface GeneratedContent {
  narrative: string;
  choices: Choice[];
  scene_complete?: boolean;
}
