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
  scenes: Record<string, ImpressionistScene>  // Key-value structure for O(1) lookup
  endings: ImpressionistEndingCollection
  guidance: string  // LLM behavior hints
  
  // Flag system for state management
  flags?: Record<string, StructuredFlag>  // Story flags with descriptions for LLM guidance
  
  // Optional enrichments
  narrative?: NarrativeMetadata
  world?: WorldDefinition
  ui?: UIConfiguration
}

// Scene transition definition
export interface SceneTransition {
  requires?: FlagCondition  // Flag-based conditions for this transition
  when?: string  // Legacy natural language condition (still supported)
}

// Scene definition - impressionistic outlines
export interface ImpressionistScene {
  sketch: string  // Impressionistic outline for LLM to interpret
  location?: string  // Optional reference to location key
  guidance?: string  // Optional scene-specific guidance for LLM behavior
  process_sketch?: boolean  // If true, send sketch through LLM (default: true). Set false for verbatim display
  leads_to?: Record<string, string>  // scene_id: "when this happens" (legacy)
  transitions?: Record<string, SceneTransition>  // scene_id: transition_conditions (modern)
  
  // Flag system support
  initial_flags?: Record<string, any>  // Flags to set when scene starts
  flag_triggers?: FlagTrigger[]  // Flag changes to watch for
}

// Flag trigger definition
export interface FlagTrigger {
  pattern: string  // Natural language pattern to match
  set: string  // Flag to set when pattern matches
  requires?: string  // Prerequisite flag condition
}

// Structured flag definition for LLM guidance generation
export interface StructuredFlag {
  default: any  // Default value (boolean, string, number, etc.)
  description: string  // When/if condition for LLM guidance
  requires?: FlagCondition  // Optional flag conditions for this flag to be settable
}

// Ending collection with optional global conditions
export interface ImpressionistEndingCollection {
  when?: string | string[]  // Global conditions that must be met for ANY ending
  requires?: FlagCondition  // Flag-based global conditions
  variations: ImpressionistEnding[]
}

// Natural language ending conditions
export interface ImpressionistEnding {
  id: string
  when?: string | string[]  // Legacy natural language condition(s)
  requires?: FlagCondition  // Flag-based conditions
  sketch: string  // How the story concludes
}

// Flag condition types
export interface FlagCondition {
  all_of?: string[]  // All conditions must be true
  any_of?: string[]  // At least one condition must be true
  none_of?: string[]  // None of these conditions can be true
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

// Character behavior system for flag-responsive characters
export interface CharacterBehavior {
  when?: FlagCondition  // Flag conditions for this behavior to be active
  description: string   // Behavioral description for this state
  voice?: string       // Optional voice override for this state
}

export interface CharacterBehaviors {
  base: string                      // Base behavior description (always included)
  states?: CharacterBehavior[]      // Conditional behaviors based on flags
}

// Character sketches over detailed stats
export interface ImpressionistCharacter {
  id: string  // Character identifier (use "player" for player character)
  name: string
  sketch: string  // One line capturing character core
  voice?: string  // How they speak
  behaviors?: CharacterBehaviors  // Flag-responsive behavior system
}

// Location sketches
export interface ImpressionistLocation {
  name: string  // Display name for the location
  sketch: string  // Atmospheric description of the location
  atmosphere?: string[]  // Mood elements (limited to 3 for token efficiency)
  guidance?: string  // Optional author guidance for this location
  connections?: string[]  // Connected location IDs
  contains?: string[]  // Item IDs found here
}

// Item impressions
export interface ImpressionistItem {
  name: string
  sketch: string  // Atmospheric description of the item
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
  interactions: ImpressionistInteraction[]  // Rolling window of recent interactions
  isEnded?: boolean
  endingId?: string
}

// LLM Director context for minimal prompts
export interface DirectorContext {
  // Core context (~200 tokens)
  storyContext: string
  currentSketch: string
  currentSceneId?: string  // Current scene ID for transition handling
  
  // Recent activity (~300 tokens)
  recentInteractions: ImpressionistInteraction[]
  activeMemory: string[]
  
  // Available transitions (~100 tokens)
  currentTransitions?: Record<string, { condition: string; sketch: string }>
  
  // Available endings (~100 tokens)
  availableEndings?: ImpressionistEndingCollection
  
  // Narrative metadata (~50 tokens if defined)
  narrative?: NarrativeMetadata
  
  // Optional enrichment (~200 tokens)
  location?: ImpressionistLocation
  previousLocation?: string  // Previous location ID for context optimization
  discoverableItems?: ImpressionistItem[]
  activeCharacters?: ImpressionistCharacter[]
  
  // Guidance (~100 tokens)
  guidance: string
  sceneGuidance?: string  // Optional scene-specific guidance
  
  // Story state signals
  storyComplete?: boolean  // True when story has ended but exploration continues
  endingId?: string       // ID of the ending that was triggered
}

// Flag changes for action classification and narrative generation
export interface FlagChanges {
  values: Record<string, any>;
}

// LLM response with clear signals
export interface DirectorResponse {
  narrative: string | string[]  // The actual response text (string for compatibility, string[] for new format)
  signals?: DirectorSignals  // Optional engine commands
  importance?: number  // 1-10 scale for interaction importance (optional, LLM-assigned)
  memories?: string[]  // Specific memories to store from this interaction
  predictedFlags?: FlagChanges  // Flags predicted by action classifier
  actualFlags?: FlagChanges     // Flags actually set by narrative generation
}

export interface DirectorSignals {
  scene?: string        // SCENE:next_scene_id
  transition?: string   // TRANSITION:target_scene_id (flag-based)
  ending?: string       // ENDING:ending_id
  discover?: string     // DISCOVER:item_id
  error?: string        // Error message for debugging
  endStory?: boolean    // Mark story as ended
  endingId?: string     // ID of the ending that was triggered
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

// Interaction tracking for conversation history and memory
export interface ImpressionistInteraction {
  playerInput: string
  llmResponse: string
  timestamp: Date
  sceneId: string
  importance?: number // 1-10 scale for memory relevance
  metadata?: {
    inputTokens?: number
    outputTokens?: number
    latencyMs?: number
    signals?: DirectorSignals
  }
}

// Result type for operations
export interface ImpressionistResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Parser result
// UI configuration for story presentation
export interface UIConfiguration {
  loadingMessage?: string  // Custom message during LLM processing
  placeholderText?: string  // Custom placeholder text for the input textarea
  formatters?: FormatterRule[]  // Post-processing formatting rules
  styles?: Record<string, string>  // Custom CSS styles by name (changed from CSSStyleDeclaration to string for YAML compatibility)
  colorPalette?: Record<string, number>  // Theme-aware color palettes: { "distinct": 4, "warm": 2, etc. }
}

// Formatter rule for regex-based post-processing
export interface FormatterRule {
  name: string  // Human-readable name for the rule
  pattern: string  // Regex pattern to match
  priority?: number  // Processing order (higher = first, default: 0)
  applyTo?: 'full' | 'groups'  // Apply styling to full match or capture groups (default: 'groups')
  replacements?: FormatterReplacement[]  // How to style matched content
}

// Replacement configuration for formatter rules
export interface FormatterReplacement {
  target: 'match' | number  // 'match' for full match, number for capture group
  wrapWith: string  // HTML tag to wrap with (e.g., 'span')
  className?: string  // CSS class to apply
  style?: string  // Inline CSS style
  attributes?: Record<string, string>  // Additional HTML attributes
}

export interface ParseResult {
  story?: ImpressionistStory
  errors: string[]
  warnings: string[]
}