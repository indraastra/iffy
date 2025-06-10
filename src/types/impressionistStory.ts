/**
 * Type definitions for the Impressionist Story Format
 * 
 * This format emphasizes natural language over rigid state machines,
 * supporting both minimal sketches and rich narratives through progressive complexity.
 */

// Core story interface
export interface ImpressionistStory {
  // Core metadata (required)
  title: string
  author: string
  blurb: string  // 1-2 sentence hook for the story
  version: string  // e.g., "1.0", "2.3"
  
  // Story essence (required)
  context: string  // 1-3 sentences capturing story essence
  scenes: ImpressionistScene[]
  endings: ImpressionistEnding[]
  guidance: string  // LLM behavior hints
  
  // Optional enrichments
  narrative?: NarrativeMetadata
  world?: WorldDefinition
}

// Scene definition - impressionistic outlines
export interface ImpressionistScene {
  id: string
  sketch: string  // Impressionistic outline for LLM to interpret
  leads_to?: Record<string, string>  // scene_id: "when this happens"
}

// Natural language ending conditions
export interface ImpressionistEnding {
  id: string
  when: string | string[]  // Natural language condition(s)
  sketch: string  // How the story concludes
}

// Narrative style and tone
export interface NarrativeMetadata {
  voice?: string  // Narrative tone and style
  setting?: NarrativeSetting
  tone?: string  // Emotional register
  themes?: string[]  // Core themes explored
}

export interface NarrativeSetting {
  time?: string
  place?: string
  environment?: string
}

// World building elements
export interface WorldDefinition {
  characters?: Record<string, ImpressionistCharacter>
  locations?: Record<string, ImpressionistLocation>
  items?: Record<string, ImpressionistItem>
  atmosphere?: AtmosphereDefinition
}

// Character essence over detailed stats
export interface ImpressionistCharacter {
  name: string
  essence: string  // One line capturing character core
  arc?: string  // Emotional journey
  voice?: string  // How they speak
}

// Location sketches
export interface ImpressionistLocation {
  description: string
  connections?: string[]  // Connected location IDs
  contains?: string[]  // Item IDs found here
}

// Item impressions
export interface ImpressionistItem {
  name: string
  description: string
  found_in?: string | string[]  // Location ID(s) where discoverable
  reveals?: string  // Memory to add when found
  hidden?: boolean  // Requires discovery
}

// Atmospheric elements
export interface AtmosphereDefinition {
  sensory?: string[]  // Sensory details
  objects?: string[]  // Background objects/details
  mood?: string  // Overall mood
}

// Engine state - much simpler than traditional IF
export interface ImpressionistState {
  currentScene: string
  recentDialogue: string[]  // Rolling window of recent exchanges for debugging/saves
}

// LLM Director context for minimal prompts
export interface DirectorContext {
  // Core context (~200 tokens)
  storyContext: string
  currentSketch: string
  
  // Recent activity (~300 tokens)
  recentDialogue: string[]
  activeMemory: string[]
  
  // Available transitions (~100 tokens)
  currentTransitions?: Record<string, string>
  
  // Narrative metadata (~50 tokens if defined)
  narrative?: NarrativeMetadata
  
  // Optional enrichment (~200 tokens)
  location?: ImpressionistLocation
  discoverableItems?: ImpressionistItem[]
  activeCharacters?: ImpressionistCharacter[]
  
  // Guidance (~100 tokens)
  guidance: string
}

// LLM response with clear signals
export interface DirectorResponse {
  narrative: string  // The actual response text
  signals?: DirectorSignals  // Optional engine commands
}

export interface DirectorSignals {
  scene?: string        // SCENE:next_scene_id
  ending?: string       // ENDING:ending_id
  remember?: string[]   // REMEMBER:impression
  forget?: string[]     // FORGET:impression
  discover?: string     // DISCOVER:item_id
  error?: string        // Error message for debugging
}

// Metrics tracking for optimization
export interface ImpressionistMetrics {
  requestId: string
  timestamp: Date
  inputTokens: number
  outputTokens: number
  totalTokens: number
  latencyMs: number
  contextSize: number  // Bytes of context sent
  memoryCount: number  // Number of active memories
  sceneId: string
}

// Result type for operations
export interface ImpressionistResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Parser result
export interface ParseResult {
  story?: ImpressionistStory
  errors: string[]
  warnings: string[]
}