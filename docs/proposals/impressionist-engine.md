# Impressionistic Game Engine - Complete Redesign Proposal

**Version:** 2.0  
**Status:** Unified Proposal  
**Date:** January 2025

## Executive Summary

The Impressionistic Game Engine ("Iffy") represents a fundamental shift in interactive fiction design. Rather than rigid state machines, we embrace an impressionistic approach where:

- **Stories are sketches**, not scripts
- **State is fluid memory**, not fixed flags  
- **The LLM paints scenes** from minimal outlines
- **Everything emerges** through natural language

This proposal defines a flexible story format and engine architecture that reduces authoring complexity by 80% while enabling both simple sketches and rich narratives through progressive complexity.

## Core Philosophy

### Impressionism Over Determinism

Traditional IF: `IF player HAS key AND door IS locked THEN unlock door`

Impressionistic IF: `"The player searches for a way through" → LLM interprets creatively`

### Three Pillars

1. **Minimalism**: Authors sketch, don't script
2. **Emergence**: Stories grow beyond their outlines  
3. **Naturalism**: Everything in plain language

### Progressive Complexity

- **Minimal stories**: Just scenes and guidance (50 lines)
- **Rich stories**: Add locations, items, characters as needed (150+ lines)
- **Same engine**: One system handles both elegantly

## Story Format Specification

### Core Grammar (Required)

```yaml
title: String
context: String (1-3 sentences capturing story essence)

scenes:
  - id: String
    sketch: String (impressionistic outline)
    leads_to?: 
      scene_id: "when this happens"

endings:
  - id: String
    when: String | String[]  # Natural language condition(s)
    sketch: String

guidance: String (LLM behavior hints)
```

### Extended Grammar (Optional)

```yaml
# Character definitions
characters?:
  character_id:
    name: String
    essence: String (one line capturing character core)
    arc?: String (emotional journey)
    voice?: String (how they speak)

# World building
world?:
  locations?:
    location_id:
      description: String
      connections?: String[]
      contains?: String[]
  
  items?:
    item_id:
      name: String
      description: String
      found_in?: String | String[]
      reveals?: String  # Memory to add when found
      hidden?: Boolean

# Atmosphere
atmosphere?:
  sensory?: String[]
  objects?: String[]
  mood?: String
```

### Format Rules

1. **First scene is entry point** - no explicit "start" needed
2. **All conditions are natural language** - evaluated by LLM
3. **Sketches are interpretive** - LLM adds detail and context
4. **IDs are lowercase_underscore** - for consistency
5. **Everything optional except core** - scale to your needs

## Examples: Scaling Complexity

### Minimal Story (50 lines)

```yaml
title: "The Key"
context: "You need to get through a locked door."

scenes:
  - id: "locked_door"
    sketch: "Heavy wooden door. Definitely locked."
    
  - id: "found_solution"
    sketch: "The door swings open. Beyond lies darkness."

endings:
  - id: "success"
    when: "player went through the door"
    sketch: "You step into the unknown."

guidance: |
  Let the player be creative. They might find a key, pick the lock,
  break a window, or convince someone to open it. Track their approach.
```

### Medium Story (100 lines)

```yaml
title: "Coffee Confessional"
context: "Friday evening café. Alex harbors romantic feelings for you."

characters:
  alex:
    essence: "Your friend struggling with romantic feelings"
    arc: "guarded → vulnerable → open (or defensive)"
    voice: "Careful with words, warmth shows through"

scenes:
  - id: "opening"
    sketch: |
      Quiet corner café. Alex distant, something unsaid.
      Barista: "Your coffee's gone cold. Should I warm it up?"
      Alex doesn't respond, lost in thought.
    leads_to:
      trust_building: "connection deepening"
      
  - id: "trust_building"
    sketch: "The café feels smaller. Just you two and soft jazz."
    leads_to:
      revelation: "the moment of truth"
      retreat: "walls going back up"

endings:
  - id: "connection"
    when: "mutual understanding achieved"
    sketch: "Alex's hand finds yours. 'Thank you for not giving up on me.'"

atmosphere:
  sensory: ["coffee aroma", "soft jazz", "rain on windows"]

guidance: |
  Alex loves the player romantically but fears ruining the friendship.
  Patient responses → trust. Pressure → walls up.
```

### Rich Story (150+ lines)

```yaml
title: "The Peculiar Case of the Sentient Quill"
context: "Victorian London, 1887. Investigating murder with an AI quill pen."

characters:
  player:
    name: "Inspector Whitmore"
    essence: "Skeptical detective confronted with impossible technology"
    
  quill:
    name: "The Analytical Engine Quill"
    essence: "Pompous AI writing instrument"
    voice: "Verbose Victorian prose with mechanical precision"

world:
  locations:
    study:
      description: "Murder scene. Lord Pemberton slumped over desk."
      contains: ["analytical_quill", "investment_papers"]
      connections: ["drawing_room", "library"]
      
    drawing_room:
      description: "Abandoned teacups suggest interrupted conversation."
      contains: ["teacup_residue"]
  
  items:
    analytical_quill:
      name: "The Analytical Engine Quill"
      description: "Brass pen that writes by itself"
      
    teacup_residue:
      description: "Bitter scent in teacup"
      hidden: true
      reveals: "poison in the tea"

scenes:
  - id: "arrival"
    sketch: |
      The brass pen writes: "Good evening, Inspector. 
      Shall we collaborate?"
    leads_to:
      investigation: "accepting the quill's help"
      
  - id: "investigation"
    sketch: "The quill provides mechanical analysis as you investigate."
    leads_to:
      deduction: "sufficient evidence gathered"

endings:
  - id: "brilliant"
    when: ["found poison", "identified rival", "correct theory"]
    sketch: "Human intuition plus mechanical analysis yields perfect deduction."

guidance: |
  Quill is pompous but helpful. Solution: poisoned by business rival.
  The quill speaks in verbose Victorian prose.
  Track: evidence found, theory building, final deduction.
```

## Engine Architecture

### Core Components

```typescript
interface ImpressionsEngine {
  // Story data
  story: Story
  
  // Dynamic state
  memory: MemoryBank        // Impressions and facts
  currentScene: string      // Active scene ID
  recentDialogue: string[]  // Rolling window (5-7 exchanges)
  
  // LLM interface
  director: LLMDirector     // Interprets and paints scenes
}
```

### Memory System

```typescript
class MemoryBank {
  private impressions: Set<string> = new Set()
  private readonly MAX_RECENT = 20
  private readonly MAX_TOTAL = 50
  
  // Natural language memories
  remember(impression: string) {
    this.impressions.add(impression)
    this.pruneIfNeeded()
  }
  
  forget(impression: string) {
    this.impressions.delete(impression)
  }
  
  // Get contextually relevant memories
  getRelevant(context: string, limit: number = 10): string[] {
    return this.findSimilar(context, limit)
  }
}
```

### LLM Protocol

#### Request (Minimal Context)
```typescript
interface DirectorRequest {
  // Core context (always included) ~200 tokens
  storyContext: string          
  currentSketch: string         
  
  // Recent activity ~300 tokens
  recentDialogue: string[]      
  activeMemory: string[]        
  
  // Available transitions ~100 tokens
  currentTransitions?: Record<string, string>
  
  // Optional enrichment ~200 tokens
  location?: Location
  discoverableItems?: Item[]
  
  // Guidance ~100 tokens
  guidance: string
}
// Total: 600-900 tokens depending on story complexity
```

#### Response (Clear Signals)
```typescript
interface DirectorResponse {
  // Narrative output
  narrative: string
  
  // Engine signals (optional)
  signals?: {
    scene?: string        // SCENE:next_scene_id
    ending?: string       // ENDING:ending_id
    remember?: string[]   // REMEMBER:impression
    forget?: string[]     // FORGET:impression
    discover?: string     // DISCOVER:item_id
  }
}
```

### Signal Examples

```
// Scene transition
"Alex finally looks at you. 'There's something I need to tell you.'
SCENE:revelation"

// Memory creation
"The butler's hands shake as he serves tea.
REMEMBER:butler is nervous
REMEMBER:something wrong with the tea"

// Item discovery
"You notice a bitter scent from the teacup.
DISCOVER:teacup_residue
REMEMBER:poison in the tea"
```

## Context Management Strategy

### Principle of Least Context

Context scales with story complexity:

1. **Minimal Stories** (~600 tokens)
   - Story context + current sketch
   - Recent dialogue + memories
   - Current transitions + guidance

2. **Rich Stories** (~900 tokens)
   - All of the above, plus:
   - Current location details
   - Discoverable items in location

### Character Voice Through Natural Language

Rather than explicit voice management, character voices emerge naturally:
- **Character definitions** provide essence and voice descriptions
- **Sketches** show who's speaking through natural prose
- **Guidance** can remind about distinct character voices
- **LLM interprets** and maintains voices based on context

Example:
```yaml
sketch: |
  The quill writes: "Most peculiar, Inspector. Note the positioning."
  
guidance: |
  The quill speaks in verbose Victorian prose.
  Maintain distinct character voices throughout.
```

### Smart Assembly

```typescript
class ContextBuilder {
  build(state: GameState): Context {
    const base = {
      storyContext: story.context,
      currentSketch: currentScene.sketch,
      memories: this.getRelevantMemories(state),
      recentDialogue: state.recentDialogue,
      guidance: story.guidance
    }
    
    // Add complexity only if defined
    if (currentScene.location && story.world?.locations) {
      base.location = story.world.locations[currentScene.location]
    }
    
    // Include discoverable items if in a location with items
    if (currentScene.location && story.world?.items) {
      base.discoverableItems = this.getItemsInLocation(currentScene.location)
    }
    
    return this.compress(base)  // Ensure < 1000 tokens
  }
}
```

## Benefits

### For Authors
- **Write stories in 30 minutes** instead of 3 hours
- **No programming** - pure natural language
- **Scale as needed** - simple stories stay simple
- **Natural expression** - write like you think

### For Players  
- **Natural interaction** - no command parsing
- **Creative solutions** - true emergent gameplay
- **Rich narratives** - LLM paints detailed scenes
- **Consistent experience** - memories maintain coherence

### For Engine
- **80% simpler codebase** - no complex state machines
- **Better performance** - minimal context per request
- **Easier maintenance** - fewer moving parts
- **Flexible architecture** - same system for all stories

## Conclusion

The Impressionistic Game Engine transforms interactive fiction from rigid state machines to fluid, painterly narratives. By trusting the LLM as creative director and maintaining impressions rather than state, we enable stories that scale from simple sketches to rich worlds while maintaining the same natural, emergent core.

This is interactive fiction as it should be: a collaboration between author, player, and AI, where stories grow beyond their sketches into unique experiences every time. Whether authoring a simple conversation or a complex mystery, the tools remain natural and the possibilities limitless.