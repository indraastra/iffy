# **PRD: Choice-Driven Emergent Narrative Engine**

## Executive Summary

The Emergent Narrative Engine enables authors to create interactive fiction by writing a single **Narrative Outline** in natural language. The system uses a hierarchical just-in-time generation process: first creating a high-level story blueprint, then dynamically generating detailed scene structures on-demand as players progress. This approach preserves the author's core intent while creating rich, replayable experiences that adapt organically to player choices and established narrative context.

## Problem Statement

Creating interactive fiction currently requires authors to either:

- Write exhaustive branching narratives with every possible path
- Learn complex authoring tools and specialized syntax  
- Accept rigid, predetermined story structures
- Define inflexible choice categories that may conflict with emergent narrative context
- Pre-compile all scenes without knowing the actual narrative context that will emerge

This creates high barriers to entry, limits story replayability, and often results in unnatural choice progression where later scenes don't adapt to the actual narrative direction established by player choices.

## Solution Overview

The Emergent Narrative Engine uses a just-in-time hierarchical approach with clearly separated responsibilities:

- **Human Authoring**: Authors provide the creative vision and define "blanks" for player agency
- **Blueprint Generator**: LLM creates high-level story structure with identified blanks
- **Scene Generator**: LLM generates detailed scenes with requirements that fulfill blanks
- **Beat Generator**: LLM creates narrative moments and choices that fill in blanks organically
- **Deterministic Engine**: Reliable state management, transitions, and ending detection

## System Architecture

### Core Components

1. **Blueprint Generator**: Creates script-like story treatment and extracts author-defined blanks
2. **Scene Generator**: Generates detailed scenes with requirements prioritizing blanks
3. **Beat Generator**: Creates narrative content that lets players fill in blanks organically
4. **Sequence Controller**: Manages scene progression, transitions, and ending detection
5. **State Manager**: Tracks player-defined story elements and choice consequences

### Data Flow

```
Markdown Outline (Author Intent + Blanks)
     ↓ [Game Start]
Blueprint Generator (Structure + Blanks Extraction)
     ↓
Story Blueprint (Scenes + Blanks List)
     ↓ [Scene Entry]
Scene Generator (Requirements for Blanks)
     ↓ [Beat Needed]
Beat Generator (Choices to Fill Blanks)
     ↓ [Player Choice]
State Manager (Updates + Blank Filling)
     ↓ [Check Transitions]
Sequence Controller (Scene/Ending Logic)
     ↓ [Loop or End]
```

## Just-in-Time Generation Process

### Phase 1: Blueprint Generation
**Trigger:** Player starts new story  
**Input:** Complete markdown outline (passed as-is to LLM)  
**Process:** LLM creates script-like treatment and extracts author-defined blanks  
**Output:** High-level blueprint with scene structure and blank identification  

### Phase 2: Scene Generation (On-Demand)
**Trigger:** Player enters each scene  
**Input:** Blueprint scene + blanks + current game state + narrative history  
**Process:** LLM generates requirements that prioritize filling blanks organically  
**Output:** Scene with blank-focused requirements and deterministic transitions

### Phase 3: Beat Generation (Per Requirement)
**Trigger:** Player needs next story moment  
**Input:** Scene requirement + blueprint context + current state  
**Process:** LLM creates choices that fill blanks without making assumptions  
**Output:** Narrative text and player choices that define story elements  

## Story Definition Format

### Author Input

Authors provide **only one component**: a **Narrative Outline** written in Markdown describing plot, characters, and thematic possibilities in natural language.

#### Example Author Input

```markdown
# The Lighthouse Keeper

## Summary
You've kept the lighthouse alone for twenty years. Tonight, during a terrible storm, someone is knocking at the door. It's your child whom you haven't seen since they were young—they're injured and need shelter, but they don't recognize you.

## Key Elements  
The story explores whether you reveal your identity before they leave in the morning. The core conflict is the desire to reconnect versus the fear of rejection. The visitor's trust should develop naturally through your actions.

## Potential Endings
A hopeful ending occurs if you reveal your identity after earning their trust.
A melancholic ending happens if time runs out before you reveal yourself.
A tense ending could occur if you reveal yourself too early without sufficient trust.
```

### Blueprint Generation Process

The engine sends the complete markdown outline to the LLM with this directive:

> "Read this narrative outline and create a high-level script treatment following Freytag's dramatic structure. Extract concrete scene details (narrative, location, characters) while identifying author-defined blanks. Apply the CRITICAL EXTRACTION PRINCIPLE: Everything meaningful in the markdown outline must be captured in structured form, or it will be lost forever."

#### Example Generated Blueprint

```json
{
  "title": "The Lighthouse Keeper",
  "setting": {
    "world": "isolated lighthouse during a fierce storm", 
    "tone": "intimate and tense with undercurrents of longing",
    "time_period": "late night during a winter storm"
  },
  "scene_sequence": [
    {
      "id": "arrival_in_storm",
      "goal": "Let player establish visitor's identity through careful observation",
      "narrative": "During a fierce storm, someone pounds desperately at the lighthouse door. When you open it, you see a figure you recognize but who seems not to remember you—injured, exhausted, seeking only shelter from the tempest.",
      "location": "lighthouse entrance during a violent storm",
      "characters": ["lighthouse_keeper", "mysterious_visitor"],
      "dramatic_function": "exposition"
    },
    {
      "id": "shared_warmth", 
      "goal": "Allow player to define the nature of past connection through careful revelation",
      "narrative": "Inside by the fire, conversation begins carefully. Both of you share details about yourselves while the visitor's memory seems clouded. The player can define the relationship through how they choose to interact and what they reveal.",
      "location": "lighthouse main room with fireplace",
      "characters": ["lighthouse_keeper", "mysterious_visitor"],
      "dramatic_function": "rising_action"
    },
    {
      "id": "moment_of_recognition",
      "goal": "Force decision about revealing identity and true relationship",
      "narrative": "Something triggers a moment of potential recognition—a gesture, phrase, or memory. The visitor's confusion wavers. This is the critical moment to decide whether to reveal the truth about who you are to each other.",
      "location": "lighthouse beacon room or by a meaningful object",
      "characters": ["lighthouse_keeper", "mysterious_visitor"],
      "dramatic_function": "climax"
    },
    {
      "id": "dawn_resolution",
      "goal": "Resolve the consequences of identity revelation choices",
      "narrative": "As the storm clears and dawn approaches, the consequences of the night's choices become clear. The visitor must leave, but the nature of your parting depends entirely on what has been revealed and established between you.",
      "location": "lighthouse entrance as storm clears",
      "characters": ["lighthouse_keeper", "mysterious_visitor"],
      "dramatic_function": "resolution"
    }
  ],
  "potential_endings": [
    {
      "id": "reconciliation",
      "title": "Hopeful Reunion", 
      "description": "Identity revealed, trust earned, relationship renewed",
      "tone": "hopeful and healing"
    },
    {
      "id": "missed_chance",
      "title": "Silent Departure",
      "description": "Identity kept secret, visitor leaves unknowing", 
      "tone": "melancholic and regretful"
    },
    {
      "id": "difficult_truth",
      "title": "Painful Honesty",
      "description": "Truth revealed but without sufficient trust built",
      "tone": "tense and uncertain"
    }
  ],
  "blanks": ["visitor_identity", "keeper_motivation", "shared_history"]
}
```

### Just-in-Time Scene Generation

When the player enters each scene, the Scene Generator receives:

**Context Input:**
- The blueprint scene definition
- Current game state (what has been established)
- Narrative history from previous scenes
- Story progress and dramatic arc position

**Generated Output:**
```json
{
  "id": "shared_warmth",
  "goal": "Build connection while maintaining mysterious tension",
  "requirements": [
    {
      "key_to_update": "visitor_identity",
      "description": "Let player define who this person is through observation"
    },
    {
      "key_to_update": "shared_history", 
      "description": "Allow player to establish the nature of past connection"
    }
  ],
  "transitions": [
    {
      "target": "moment_of_recognition",
      "condition": "visitor_identity != null AND shared_history != null"
    },
    {
      "target": "dawn_resolution",
      "condition": "continue"
    }
  ]
}
```

## Runtime Behavior

### Blanks-Driven Scene Generation

When entering each scene, the Scene Generator:
- **Defines scene requirements**: Creates progression goals that must be met for scene completion (trust building, tension creation, decision points)
- **Lists scene blanks**: Includes both global blueprint blanks and scene-specific elements that need player definition
- **Separates concerns completely**: Blanks are for player definition; requirements are for scene progression
- **Validates transitions**: Conditions can only reference variables that exist in game state or are established by scene requirements

### Engine-Driven Blank Priority

The system automatically prioritizes blank-filling over scene progression:
- **Blank-filling beats first**: When unfilled blanks exist, the engine generates dedicated blank-filling beats using specialized prompts
- **Scene progression beats second**: Only after all scene blanks are filled does the engine work on scene requirements
- **Automatic detection**: Engine checks game state to determine which blanks need filling vs which requirements need work
- **Specialized prompts**: Blank-filling beats use focused prompts that create diegetic player definition moments
- **Diegetic integration**: Both beat types automatically reference established state elements in narrative and choices
- **Natural progression**: Once blanks are filled, normal requirement-based beats continue scene advancement

### State-Driven Transitions

The system manages progression through:
1. **Requirement Fulfillment**: Players fill blanks through choices
2. **Condition Evaluation**: Transition logic uses current game state
3. **Scene Advancement**: When requirements met or conditions triggered
4. **Ending Detection**: When transitions target ending IDs rather than scene IDs
5. **Loop Closure**: Each choice updates state, enabling new narrative possibilities

## Key Design Principles

### 1. Author-Defined Blanks
Authors specify what elements should be player-defined in their markdown. The system extracts these "blanks" and ensures they flow through the generation hierarchy without being pre-determined.

### 2. Hierarchical Blank Processing
- **Blueprint Level**: Identifies and preserves blanks from author intent
- **Scene Level**: Creates requirements that prioritize blank-filling in appropriate scenes  
- **Beat Level**: Generates choices that fill blanks organically through player agency

### 3. Player Agency Through Blanks
Instead of rigid character creation or forced choices, players define story elements naturally through contextual observations and decisions that feel authentic to the narrative.

### 4. State-Driven Progression
Game state changes only through player choices. Transitions depend on fulfilled requirements and evaluated conditions, creating a deterministic but responsive narrative flow.

### 5. Ending Integration
Endings are detected when scene transitions target ending IDs. The SequenceController distinguishes between scene-to-scene and scene-to-ending transitions, managing game completion appropriately.

### 6. Complete Control Loop
The system forms a complete loop: Author Intent → Blueprint → Scene → Beat → Player Choice → State Update → Transition Logic → Next Scene, with each stage building on player-established narrative reality.

This architecture creates stories where players become co-authors by filling in intentional blanks left by the original author. The system preserves narrative structure while enabling genuine player agency over character details, relationships, and story elements. Each choice closes a feedback loop that shapes future content generation, creating unique playthroughs that feel both authored and personalized.