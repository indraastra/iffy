# LLM-IF Story Format Specification v1.0

## Overview
Stories are defined in pure YAML format. This provides a standard, parseable structure while maintaining human readability for authors.

## File Structure
Stories are contained in a single `.yaml` file with the following top-level keys:

```yaml
title: String
author: String  
version: String
metadata: Object
characters: Array
locations: Array
items: Array
knowledge: Array
flows: Array
```

## Schema Definition

### Required Root Fields

```yaml
title: "Story Title"
author: "Author Name"
version: "1.0"
```

### Metadata Section

```yaml
metadata:
  setting:
    time: "Time period/era"
    place: "Location/world"
  tone:
    overall: "Primary mood/atmosphere"
    narrative_voice: "POV and style description"
  themes:
    - "First theme"
    - "Second theme"
  ui:
    colors:
      primary: "#1a1a2e"
      background: "#0f0f23"
      text: "#eee"
```

### Characters

```yaml
characters:
  - id: "character_id"
    name: "Character Full Name"
    traits: 
      - "trait1"
      - "trait2"
    voice: "Description of how they speak"
    description: |
      Multi-line character description.
      Can include background, motivations, etc.
    relationships:
      other_character_id: "Nature of relationship"
```

### Locations

```yaml
locations:
  - id: "location_id"
    name: "Location Name"
    connections: 
      - "other_location_id"
      - "another_location_id"
    description: |
      Multi-line description of the location.
      Include atmospheric details.
    objects:
      - name: "Object name"
        description: "Object description"
        id: "object_id"  # Optional, for items that can be taken
```

### Items

```yaml
items:
  - id: "item_id"
    name: "Item Name"
    description: "What it is and looks like"
    location: "starting_location_id"  # Optional - if item starts visible
    hidden: false  # Optional - if true, requires discovery even with location
    discoverable_in: "location_id"  # Alternative to location - for items found via exploration
    discovery_objects: ["object1", "object2"]  # Optional - what to search to find it
    aliases: ["alternate_name", "nickname"]  # Optional - other names players might use
```

**Location Logic:**
- **`location`**: Item starts visible/accessible at this location
- **`discoverable_in`**: Item can be found through exploration/searching 
- **`discovery_objects`**: Specific objects players should search (e.g., "dresser", "drawer")
- **`aliases`**: Alternative names to prevent terminology confusion
- **`hidden`**: Even if location is set, item requires discovery action

**Examples:**
```yaml
# Visible item that can be taken immediately
- id: "sword"
  location: "armory"

# Hidden item that requires searching
- id: "hidden_key"
  discoverable_in: "bedroom"
  discovery_objects: ["dresser", "drawer"]
  aliases: ["key", "brass key"]
```

### Knowledge States

```yaml
knowledge:
  - id: "knowledge_id"
    description: "What the player has learned"
    requires:
      - "prerequisite_knowledge_id"
      - "has_item:item_id"
```

### Unified Flow System

The flow system supports both explicit flows for scripted interactions and open scenes for natural exploration.

#### Explicit Flows

Traditional flows with defined interactions:

```yaml
flows:
  - id: "flow_id"
    type: "narrative"  # or "dialogue"
    name: "Flow Name"
    requirements:
      - "previous_flow_id"
      - "has_item:key"
      - "knows:secret_knowledge"
    sets:
      - "flag_name"
      - "knows:new_knowledge"
    content: |
      The narrative content for this flow.
      Can be multiple paragraphs.
      
      Uses second person or chosen narrative style.
    next:
      - type: "dialogue"
        trigger: "talk to character"
        flow_id: "conversation_id"
      - type: "narrative"
        trigger: "examine room"
        flow_id: "examine_flow_id"
    player_goal: "What the player should achieve"  # Optional
    hint: "Optional hint for players"  # Optional

  - id: "conversation_id"
    type: "dialogue"
    name: "Conversation Name"
    participants: 
      - "character_id"
      - "player"
    location: "location_id"  # Optional
    requirements:
      - "knows:prerequisite"
    exchanges:
      - speaker: "character_id"
        text: "What they say"
        emotion: "angry"  # Optional
      - speaker: "player"
        choices:
          - text: "First response option"
            next: "flow_id"  # References another flow
            sets: ["flag_name"]  # Optional
          - text: "Second response option"
            next: "different_flow_id"
      - speaker: "character_id"
        text: "Response that follows any choice"
        next: "continue_flow_id"  # Optional, continues to another flow
```

#### Open Scenes (Fuzzy Discovery)

For natural exploration where the LLM interprets player actions:

```yaml
flows:
  - id: "open_scene_id"
    type: "open_scene"
    name: "Scene Name"
    description: |
      Setting and context for the scene. This helps the LLM understand
      the environment and generate appropriate responses.
    
    # Declare what exists to be discovered
    story_elements:
      evidence:
        - id: "unique_evidence_id"
          type: "item"  # or "knowledge"
          object: "item_id"  # for items
          fact: "knowledge_id"  # for knowledge
          location_hints: ["where it might be found"]
          discovery_clues:
            - "What the player might notice"
            - "Subtle indicators"
          natural_actions: ["search room", "examine area", "look for clues"]
          requires: ["prerequisite_knowledge"]  # Optional
          difficulty: "easy"  # easy/moderate/hard, optional
    
    # Story progression rules
    progression:
      completion_threshold:
        evidence_found: 2  # How many pieces needed to progress
        
      hint_escalation:
        after_turns: 3  # Start giving hints after X turns
        progression: ["subtle", "direct", "explicit"]
        
      synergies:  # Optional - evidence that makes other evidence easier to find
        - if_found: "evidence_id"
          then_easier: "other_evidence_id"
          reason: "Why this connection makes sense"
    
    # Transitions when scene is complete
    completion_transitions:
      - condition: "evidence_threshold_met"
        to_flow: "next_flow_id"
        
    # LLM interpretation guidelines
    llm_guidelines: |
      Instructions for how the LLM should handle this scene:
      - Generate natural discovery sequences
      - Match narrative tone to story
      - Provide appropriate difficulty scaling
      - Connect discoveries meaningfully
```

## Special Sections

### Starting Content

```yaml
start:
  text: |
    The opening text of your story.
    This is what players see first.
    
    Set the scene and tone immediately.
  location: "starting_location_id"
  sets:
    - "game_started"
```

### Endings

Endings are defined as narrative flows with `ends_game: true`. This simplifies the format by eliminating a separate endings section.

```yaml
flows:
  - id: "victory_ending"
    type: "narrative"
    name: "Victory!"
    requirements:
      - "defeated_antagonist"
      - "saved_world"
    ends_game: true
    content: |
      The triumphant ending text.
      
      Describe the complete resolution and epilogue here.
```

**Note:** The legacy `endings:` section is still supported for backward compatibility, but new stories should use `ends_game: true` on narrative flows.

## Condition Syntax

### Basic Conditions
- Item possession: `has_item:item_id`
- Knowledge state: `knows:knowledge_id`  
- Location: `at_location:location_id`
- Flag: `flag_name`
- Beat completion: `completed:beat_id`

### Operators
- AND: List multiple conditions (all must be true)
- OR: Use sub-lists for OR conditions:
  ```yaml
  requirements:
    - - "has_item:key"
      - "knows:lockpick_skill"
    - "has_item:master_key"
  ```
  (This means: (has key AND knows lockpicking) OR has master key)

## Example Story Structure

```yaml
title: "Example Story"
author: "Your Name"
version: "1.0"

metadata:
  # ... metadata here ...

characters:
  - id: "protagonist"
    # ... character details ...

locations:
  - id: "start_room"
    # ... location details ...

items:
  - id: "brass_key"
    # ... item details ...

knowledge:
  - id: "door_locked"
    # ... knowledge details ...

flows:
  - id: "introduction"
    type: "narrative"
    # ... flow content ...

  - id: "guard_conversation"
    type: "dialogue"
    # ... dialogue exchanges ...

start:
  text: "Your adventure begins..."
  location: "start_room"
  first_flow: "introduction"

endings:
  - id: "victory"
    # ... ending content ...
```

## Flow Type Guidelines

### When to Use Explicit Flows

**Narrative flows** for:
- **Story beats**: Key narrative moments that must happen in a specific way
- **Simple interactions**: Single-step actions with defined outcomes  
- **Transitions**: Moving between scenes or major story points
- **Scripted sequences**: Events that must unfold in a particular order

**Dialogue flows** for:
- **Conversations**: Multi-exchange interactions with characters
- **Branching dialogue**: Conversations with meaningful player choices
- **Character development**: Dialogue that reveals character or advances relationships
- **Plot-critical discussions**: Conversations that gate story progression

### When to Use Open Scenes

**Open scene flows** for:
- **Exploration sequences**: Investigating rooms, searching areas, examining objects
- **Discovery-based gameplay**: Finding clues, items, or information naturally
- **Investigation scenes**: Crime scenes, research, archaeological digs
- **Social situations**: Meeting people, gathering information through conversation
- **Creative problem-solving**: Multiple valid approaches to the same goal
- **Sandbox interactions**: Letting players experiment and discover organically

### Benefits of Open Scenes
- **Reduced authoring overhead**: No need to anticipate every possible player action
- **Natural interactions**: Players can use intuitive commands like "search the room"
- **Multiple solutions**: Different approaches can lead to the same discoveries
- **Emergent storytelling**: LLM creates contextually appropriate narratives
- **Player agency**: Freedom to explore and discover at their own pace

## Best Practices

### 1. ID Conventions
- Use lowercase with underscores: `ancient_tomb`, not `AncientTomb`
- Be descriptive: `sarah_reveals_secret` not `beat_1`
- Keep IDs unique across all types

### 2. Content Writing
- Use pipe (`|`) for multi-line strings to preserve formatting
- Keep paragraphs concise (2-4 sentences)
- Include sensory details in descriptions

### 3. Structure
- Order flows roughly in sequence of play
- Group related narrative and dialogue flows together
- Define items near their first appearance location

### 4. Requirements
- Make critical path clear with simple requirements
- Provide multiple solutions where possible
- Test that all flows are reachable

### 5. Open Scene Design
- **Rich descriptions**: Provide detailed scene context for the LLM
- **Clear discovery clues**: Give enough hints without being too obvious
- **Varied natural actions**: List different ways players might approach discovery
- **Logical progression**: Ensure evidence builds toward story goals
- **Appropriate difficulty**: Match discovery difficulty to story pacing
- **Meaningful synergies**: Connect discoveries in ways that make narrative sense

## Validation Rules

### Required Elements
1. Must have `title`, `author`, and `version`
2. Must have at least one location
3. Must have `start` section
4. Must have at least one ending (either `endings:` section or narrative flow with `ends_game: true`)

### ID Rules
- All `id` fields must be unique
- IDs can only contain: `a-z`, `0-9`, `_`
- IDs cannot start with numbers

### Reference Integrity  
- All referenced IDs must exist
- Location connections should be bidirectional
- Requirements must be achievable

## YAML Tips for Authors

### Multi-line Strings
```yaml
# Preserves line breaks
description: |
  First paragraph here.
  
  Second paragraph here.

# Folds into single line
summary: >
  This will become one
  long line of text.
```

### Lists
```yaml
# Simple list
traits:
  - "brave"
  - "clever"

# Inline list (equivalent)
traits: ["brave", "clever"]
```

### Comments
```yaml
# This is a comment and won't be parsed
character:
  id: "hero"  # You can also put comments at line ends
```

## Version Notes

### v1.0 (MVP)
- Single-file YAML format
- Basic condition system
- Linear story progression
- Simple state tracking

### Future Versions
- Multi-file support with includes
- Complex conditional expressions
- Variables and counters
- Procedural content rules