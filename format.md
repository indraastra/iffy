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
    location: "starting_location_id"
    hidden: false  # Optional, default false
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

```yaml
flows:
  - id: "flow_id"
    type: "narrative"  # or "dialogue" or "scene"
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

```yaml
endings:
  - id: "victory"
    name: "Victory Ending"
    requires:
      - "defeated_antagonist"
      - "saved_world"
    content: |
      The triumphant ending text.
      
      Describe the resolution.
```

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

## Validation Rules

### Required Elements
1. Must have `title`, `author`, and `version`
2. Must have at least one location
3. Must have `start` section
4. Must have at least one ending

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