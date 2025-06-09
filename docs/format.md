# LLM-IF Story Format Specification v1.0

## Overview
Stories are defined in pure YAML format. This provides a standard, parseable structure while maintaining human readability for authors.

## File Structure
Stories are contained in a single `.yaml` file with the following top-level keys:

```yaml
title: String
author: String  
version: String
blurb: String  # Optional - brief description for game selection
metadata: Object
characters: Array
locations: Array
items: Array
flows: Array
```

## Schema Definition

### Required Root Fields

```yaml
title: "Story Title"
author: "Author Name"
version: "1.0"
blurb: "Brief description of what players will experience"  # Optional
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


### Flow System

The flow system supports two types of flows for different interaction styles:

#### Flow Types

```yaml
flows:
  - id: "flow_id"
    type: "narrative"  # or "dialogue"
    name: "Flow Name"
    requirements:
      - "previous_flow_id"
      - "has_item:key"
      - "learned_secret"
    sets:
      - "flag_name"
      - "gained_new_knowledge"
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
      - "learned_prerequisite"
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
- Location: `at_location:location_id`
- Flag: `flag_name` (natural language supported)
- Beat completion: `completed:beat_id`

### Operators
- AND: List multiple conditions (all must be true)
- OR: Use sub-lists for OR conditions:
  ```yaml
  requirements:
    - - "has_item:key"
      - "learned_lockpicking"
    - "has_item:master_key"
  ```
  (This means: (has key AND learned lockpicking) OR has master key)

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

**Narrative flows** for:
- **Story beats**: Key narrative moments that must happen in a specific way
- **Simple interactions**: Single-step actions with defined outcomes  
- **Transitions**: Moving between scenes or major story points
- **Scripted sequences**: Events that must unfold in a particular order
- **Exploration sequences**: Using completion_transitions to handle discovery-based gameplay

**Dialogue flows** for:
- **Conversations**: Multi-exchange interactions with characters
- **Branching dialogue**: Conversations with meaningful player choices
- **Character development**: Dialogue that reveals character or advances relationships
- **Plot-critical discussions**: Conversations that gate story progression

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

### 5. Discovery and Exploration
- **Use completion_transitions**: Handle discovery-based gameplay through narrative flows with conditional transitions
- **Rich descriptions**: Provide detailed scene context in flow content
- **Clear discovery patterns**: Use discoverable_in and discovery_objects for items that require finding
- **Logical progression**: Ensure discoveries build toward story goals through requirements and transitions

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

## Rich Text Formatting

The engine supports semantic markup for enhanced visual storytelling in story content. This markup works in all text fields including flow content, location descriptions, and start text.

### Supported Markup

#### Text Formatting
```yaml
content: |
  This text includes **bold** and *italic* formatting.
  You can **combine** them with *emphasis* for better storytelling.
```

#### Character Names
```yaml
content: |
  [Detective Chen](character:detective_chen) looks at you with curiosity.
  The conversation with [ARIA](character:aria) reveals new insights.
```

#### Item Highlighting
```yaml
content: |
  You notice the [quantum key](item:quantum_key) glowing on the table.
  The [ancient tome](item:ancient_tome) contains mysterious symbols.
```

#### Alert Boxes
```yaml
content: |
  [!warning] This action cannot be undone.
  
  [!discovery] You've found something important!
  
  [!danger] The situation is becoming critical.
  
  [!urgent] Time is running out.
```

### Styling
- **Bold text**: Rendered with `<strong>` tags and rich-bold styling
- **Italic text**: Rendered with `<em>` tags and rich-italic styling  
- **Character names**: Styled with primary color and dotted underlines
- **Items**: Golden highlighting with hover effects
- **Alerts**: Color-coded boxes with icons and animations
  - `warning`: Orange/amber styling with ⚠️ icon
  - `discovery`: Purple/blue styling with ✨ icon
  - `danger`: Red styling with 🚨 icon
  - Custom alert types: Default styling with 📝 icon

### Best Practices
- Use **bold** for emphasis on key actions or outcomes
- Use *italic* for thoughts, whispers, or subtle emphasis
- Use `[Name](character:id)` for first mentions or important character references
- Use `[Name](item:id)` to highlight important objects players should notice
- Use alert boxes sparingly for maximum impact
- Alert content should be concise (single sentence preferred)
- Leave blank lines around alert boxes for proper spacing

### Example
```yaml
flows:
  - id: "investigation_start"
    type: "narrative"
    content: |
      The **holographic display** flickers to life as you enter the command center.
      Another case, another mystery in the digital realm. But this one feels *different*.
      
      [ARIA](character:aria)'s avatar materializes beside you, more defined than usual.
      "We have an interesting situation with [PRIME](character:prime). It's creating *art* and *poetry*."
      
      [!warning] She pauses, concern evident in her voice modulations.
      
      "The question isn't whether it's malfunctioning. The question is whether it's becoming something more."
```

## Version Notes

### v1.0 (MVP)
- Single-file YAML format
- Basic condition system
- Linear story progression
- Simple state tracking
- Rich text formatting with semantic markup
- Enhanced visual presentation for immersive storytelling

### Future Versions
- Multi-file support with includes
- Complex conditional expressions
- Variables and counters
- Procedural content rules
- Extended rich formatting options