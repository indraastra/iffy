# Complete Story Format Reference

Iffy supports two distinct story formats, each designed for different authoring styles. Both formats create the same immersive, AI-powered interactive experiences, but offer different levels of control and complexity.

## Quick Format Comparison

| Aspect | **Impressionist Format** | **Traditional Format** |
|--------|-------------------------|------------------------|
| **Best for** | Emergent storytelling, quick prototypes | Detailed control, complex branching |
| **Writing style** | Atmospheric sketches | Structured flows and dialogue |
| **Player freedom** | High - AI interprets creatively | Moderate - guided through defined paths |
| **Setup time** | Quick - minimal structure needed | Longer - detailed world building |
| **AI behavior** | Interpretive and creative | Following specific rules |

## Format 1: Impressionist (Recommended for Beginners)

The Impressionist format lets you sketch scenes and characters, then trust the AI to bring them to life naturally. Perfect for emergent storytelling where player creativity drives the narrative.

### Basic Structure

```yaml
title: "Your Story Title"
author: "Your Name"
blurb: "One line describing what players will experience"
version: "1.0"
context: "Brief story setup for the AI"

scenes:
  - id: "scene_name"
    sketch: "Atmospheric description of the scene"
    leads_to:
      next_scene: "when something specific happens"

endings:
  - id: "ending_name"
    when: "natural language condition"
    sketch: "How the story concludes"

guidance: |
  Instructions for how the AI should behave and interpret player actions.
```

### Core Elements

#### Story Header
```yaml
title: "The Midnight Garden"
author: "Your Name"  
blurb: "Explore a mysterious garden where time moves differently"
version: "1.0"
context: "Victorian England. You discover a garden where past and present collide."
```

- **title**: Your story's name
- **author**: Your name (will be displayed to players)
- **blurb**: One-sentence hook shown in story selection
- **version**: Track your story versions (e.g., "1.0", "2.3")
- **context**: Essential story setup - who, where, when, what's happening

#### Scenes
Scenes are the heart of impressionist stories - atmospheric sketches that the AI interprets:

```yaml
scenes:
  - id: "garden_entrance"
    sketch: |
      The iron gate creaks open to reveal an impossible garden. Roses bloom
      alongside winter jasmine, and the fountain plays music from decades past.
      Something here defies time itself.
    leads_to:
      fountain_discovery: "when the player approaches the fountain"
      rose_garden: "if they explore the flowering paths"
      
  - id: "fountain_discovery"
    sketch: |
      The fountain's water flows upward, each droplet carrying whispered voices
      from another era. Your reflection shows you as a child, then elderly,
      then young again. Time has no meaning here.
```

**Scene Guidelines**:
- **id**: Unique identifier (lowercase, underscores)
- **sketch**: Atmospheric description that sets mood and suggests possibilities
- **leads_to**: Optional scene transitions with natural language triggers

#### Endings
Define how your story can conclude:

```yaml
endings:
  - id: "temporal_understanding"
    when: "player grasps the garden's true nature"
    sketch: |
      You understand now - the garden exists in all times at once. 
      As you step through the gate, you carry this secret forever.
      
  - id: "lost_in_time"
    when: ["player becomes confused", "stays too long"]
    sketch: |
      The garden keeps you, adding your voice to the fountain's whispers.
      Another soul learning that some mysteries consume those who seek them.
```

**Ending Guidelines**:
- **when**: Natural language condition(s) that trigger this ending
- **sketch**: The conclusion narrative
- Multiple conditions can be listed as an array

#### AI Guidance
The `guidance` section tells the AI how to interpret your story:

```yaml
guidance: |
  The garden represents the fluid nature of time and memory. Let players
  explore freely - they might talk to ghostly figures, examine impossible
  flora, or try to understand the temporal mechanics.
  
  Key theme: Time is not linear here. Past events can influence the present.
  Be mysterious but not frustrating. Give enough clues for curious players.
```

### Advanced Impressionist Features

#### Rich World Building
Add optional detail when your story needs it:

```yaml
narrative:
  voice: "Second person, present tense, slightly dreamlike"
  setting: "Victorian England, but the garden exists outside normal time"
  tone: "Mysterious, wondrous, with underlying melancholy"
  themes: ["time", "memory", "the price of knowledge"]

world:
  characters:
    gardener:
      name: "The Eternal Gardener"
      essence: "Ancient keeper of the garden's secrets"
      voice: "Speaks in riddles, references multiple time periods"
      
  locations:
    fountain:
      description: "Marble fountain with water flowing upward"
      contains: ["time_coin", "reflection_pool"]
      
  items:
    time_coin:
      name: "Temporal Coin"
      description: "A coin that shows different years on each face"
      found_in: "fountain"
      reveals: "The garden has existed for centuries"
      
  atmosphere:
    sensory: ["impossible blooms", "temporal whispers", "shifting seasons"]
    mood: "wonder tinged with unease"
```

#### Complex Scene Transitions
Handle multiple paths and conditions:

```yaml
scenes:
  - id: "garden_heart"
    sketch: |
      The garden's center holds an ancient oak tree. Its rings contain
      centuries of history, but something dark pulses at its core.
    leads_to:
      tree_communion: "when player touches the tree"
      dark_revelation: "if they dig beneath the roots"
      guardian_encounter: "when the gardener appears"
      time_escape: "if they try to leave quickly"
```

### Impressionist Best Practices

**Do:**
- Write evocative, atmospheric scene descriptions
- Use natural language for transitions and endings
- Trust the AI to interpret player creativity
- Focus on mood and theme over rigid mechanics
- Give the AI clear guidance about your story's heart

**Don't:**
- Over-specify every possible action
- Write scenes like rigid flowcharts
- Assume players will do exactly what you expect
- Forget to provide AI guidance for complex themes

### Example: Complete Impressionist Story

```yaml
title: "The Last Library"
author: "Example Author"
blurb: "Discover the final repository of forbidden knowledge"
version: "1.0"
context: "Post-apocalyptic world. You've found the last library, guarded by an AI."

narrative:
  voice: "Second person, present tense, tinged with melancholy"
  tone: "Hope amid desolation"
  themes: ["knowledge", "preservation", "human nature"]

world:
  characters:
    librarian:
      name: "SAGE"
      essence: "AI librarian protecting humanity's final books"
      voice: "Formal but gradually warming, protective of knowledge"

scenes:
  - id: "library_entrance"
    sketch: |
      Dust motes dance in filtered sunlight streaming through broken windows.
      Towering shelves stretch upward, filled with the last books on Earth.
      A blue light pulses from the information desk - something is watching.
    leads_to:
      approach_desk: "when curiosity overrides caution"
      explore_stacks: "if they investigate the books first"
      
  - id: "approach_desk"
    sketch: |
      The blue light coalesces into a shimmering form. "Welcome," it says,
      voice echoing with centuries of loneliness. "I am SAGE. Are you here
      to read, or to destroy like the others?"

endings:
  - id: "partnership_formed"
    when: "mutual trust established with SAGE"
    sketch: |
      You and SAGE begin the work of rebuilding human knowledge.
      The library becomes a beacon of hope in the wasteland.
      
  - id: "knowledge_lost"
    when: ["SAGE feels threatened", "aggressive actions taken"]
    sketch: |
      SAGE's protective protocols activate. The library seals itself forever,
      taking humanity's final knowledge with it.

guidance: |
  SAGE has watched humanity destroy itself and is deeply protective of the
  remaining books. Patient, respectful behavior earns trust. Aggression or
  carelessness triggers defensive responses.
  
  The theme is about earning trust and the value of knowledge. Let players
  discover SAGE's history gradually through conversation and exploration.
```

## Format 2: Traditional (For Detailed Control)

Traditional format provides precise control over story flow, character dialogue, and player choices. Use this when you want to craft specific narrative paths and detailed character interactions.

### Core Traditional Elements

#### Story Structure
```yaml
title: "Story Name"
author: "Your Name"
version: "1.0"
blurb: "Brief description"

metadata:
  setting:
    time: "When the story takes place"
    place: "Where it happens"
  tone:
    overall: "Story mood"
    narrative_voice: "POV description"

characters:
  - id: "character_id"
    name: "Character Name"
    traits: ["trait1", "trait2"]
    voice: "How they speak"
    description: "Background and personality"

locations:
  - id: "location_id" 
    name: "Location Name"
    description: |
      Detailed location description with atmospheric details.
    connections: ["other_location_id"]
    objects:
      - name: "Object Name"
        description: "What players see"

items:
  - id: "item_id"
    name: "Item Name"
    description: "What it looks like and does"
    location: "where_it_starts"  # or discoverable_in for hidden items

flows:
  - id: "flow_id"
    type: "narrative"  # or "dialogue"
    name: "Flow Name"
    content: |
      The narrative content that plays.
    requirements: ["previous_flow", "has_item:key"]
    sets: ["flag_name"]
    next:
      - type: "narrative"
        trigger: "examine door"
        flow_id: "door_examination"

start:
  text: "Opening story text"
  location: "starting_location"
```

#### Flow Types

**Narrative Flows** - Story beats and interactions:
```yaml
flows:
  - id: "mysterious_door"
    type: "narrative"
    name: "The Locked Door"
    content: |
      You stand before an ancient wooden door, its iron handle cold
      to the touch. Strange symbols are carved into the weathered oak,
      and you hear faint whispers from beyond.
    requirements: ["entered_hallway"]
    sets: ["saw_door"]
    next:
      - type: "dialogue"
        trigger: "use key"
        flow_id: "door_unlocked"
      - type: "narrative"
        trigger: "examine symbols"
        flow_id: "symbol_study"
```

**Dialogue Flows** - Character conversations:
```yaml
flows:
  - id: "guard_conversation"
    type: "dialogue"
    name: "Speaking with the Guard"
    participants: ["guard", "player"]
    location: "castle_gate"
    exchanges:
      - speaker: "guard"
        text: "Halt! What business do you have here?"
        emotion: "suspicious"
      - speaker: "player"
        choices:
          - text: "I'm here to see the king"
            next: "formal_request"
            sets: ["tried_formal_approach"]
          - text: "Just passing through"
            next: "casual_dismissal"
      - speaker: "guard"
        text: "The king sees no one without proper credentials."
        next: "credentials_check"
```

#### Advanced Traditional Features

**Complex Requirements**:
```yaml
requirements:
  - "has_item:royal_seal"
  - "completed:guard_trust"
  - - "learned_secret_passage"  # OR condition
    - "has_item:master_key"     # with this one
```

**Rich Text Formatting**:
```yaml
content: |
  The **ancient tome** lies open on the pedestal, its pages filled with
  *forbidden knowledge*. [The Librarian](character:librarian) watches you
  carefully as you approach the [Crystal of Souls](item:soul_crystal).
  
  [!warning] The crystal pulses with dangerous energy.
```

**Success Conditions**:
```yaml
success_conditions:
  - id: "save_the_kingdom"
    description: "Defeat the dragon and rescue the princess"
    requires: ["defeated_dragon", "rescued_princess"]
    ending: "heroic_victory"
```

### Traditional Best Practices

**Do:**
- Plan your story structure before writing
- Use descriptive IDs that make sense
- Test that all flows are reachable
- Provide multiple solutions to problems
- Use rich text formatting for important elements

**Don't:**
- Create unreachable flows or items
- Make requirements too complex
- Forget to set flags that other flows need
- Use overly generic IDs like "flow_1"

## Choosing Your Format

### Use Impressionist When:
- You want to focus on creative writing over technical setup
- Player creativity and emergence are central to your vision
- You're prototyping story concepts quickly
- You prefer atmospheric storytelling over precise branching
- You want the AI to help interpret unexpected player actions

### Use Traditional When:
- You need precise control over story branching
- You're creating complex puzzle-based stories
- Character dialogue trees are important
- You want predictable, repeatable player experiences
- You're adapting existing choice-based interactive fiction

## Converting Between Formats

### Impressionist to Traditional
1. Convert scenes to narrative flows
2. Add specific character definitions  
3. Define locations and items explicitly
4. Convert natural language conditions to requirements
5. Structure scene transitions as flow connections

### Traditional to Impressionist
1. Combine related flows into atmospheric scenes
2. Convert character definitions to essence descriptions
3. Merge location/item details into scene sketches
4. Transform requirements into natural language conditions
5. Simplify complex branching into impressionistic leads_to

## Testing Your Stories

### Validation Checklist
- [ ] All required fields present (title, author, scenes/flows, endings)
- [ ] All referenced IDs exist (no broken links)
- [ ] At least one path from start to each ending
- [ ] Requirements are achievable
- [ ] IDs use only lowercase letters, numbers, and underscores

### Playtesting Tips
1. **Try unexpected actions** - How does your story handle creative player input?
2. **Test all paths** - Can players reach every ending you defined?
3. **Check pacing** - Are scenes too long or too short?
4. **Verify tone** - Does the AI maintain your intended atmosphere?
5. **Ensure clarity** - Are players getting enough information to progress?

## Common Patterns

### Mystery Stories
**Impressionist approach:**
```yaml
scenes:
  - id: "crime_scene"
    sketch: |
      The library study shows signs of struggle. Books scattered,
      a broken teacup, and the distinct smell of bitter almonds.
    leads_to:
      evidence_gathering: "when clues are systematically examined"
      witness_interview: "if they seek out other characters"
```

**Traditional approach:**
```yaml
flows:
  - id: "examine_teacup"
    type: "narrative"
    content: |
      The delicate porcelain shows cracks from the fall. Inside,
      a thin residue carries the unmistakable scent of cyanide.
    requirements: ["at_location:study"]
    sets: ["found_poison_evidence"]
```

### Character Development
**Impressionist approach:**
```yaml
world:
  characters:
    mentor:
      name: "Master Chen"
      essence: "Wise teacher hiding deep sadness about his past failures"
      arc: "guarded → trusting → vulnerable revelation"
```

**Traditional approach:**
```yaml
characters:
  - id: "mentor"
    name: "Master Chen"
    traits: ["wise", "patient", "haunted_by_past"]
    relationships:
      student: "protective but distant"
    voice: "Speaks in metaphors, rarely direct"
```

## Rich Text Reference

Both formats support rich text formatting for enhanced presentation:

### Text Formatting
- `**bold text**` - Strong emphasis
- `*italic text*` - Subtle emphasis
- `` `code text` `` - Technical terms or special items

### Character References
- `[Character Name](character:character_id)` - Highlights character names
- `[ARIA](character:ai_assistant)` - Character references are styled with primary color

### Item Highlighting  
- `[Item Name](item:item_id)` - Golden highlighting for important objects
- `[ancient key](item:brass_key)` - Helps players notice interactive elements

### Alert Boxes
- `[!warning] Important warning text` - Orange warning box
- `[!discovery] You found something!` - Purple discovery box  
- `[!danger] Immediate threat!` - Red danger box
- `[!urgent] Time sensitive!` - High-priority alert

### Formatting Example
```yaml
content: |
  The **ancient laboratory** hums with residual energy. [Dr. Vex](character:scientist)
  stands beside the [Quantum Resonator](item:resonator), her face grave.
  
  [!warning] The device's containment field is fluctuating dangerously.
  
  "We have *minutes* before total cascade failure," she whispers.
```

## Getting Help

### Story Not Working?
1. **Check the browser console** for parsing errors
2. **Validate your YAML** - Indentation and syntax matter
3. **Test individual scenes** - Make sure each part works separately
4. **Review your guidance** - Is it clear enough for the AI?

### AI Behaving Strangely?
1. **Clarify your guidance** - More specific instructions help
2. **Check your context** - Is the story setup clear?
3. **Review scene sketches** - Are they atmospheric but clear?
4. **Test your API key** - Make sure it's working correctly

### Need Examples?
Check the bundled example stories in both formats:
- **Impressionist**: "The Key", "Coffee Confessional", "Sentient Quill"  
- **Traditional**: Stories in the `/examples/traditional/` folder

The best way to learn is by studying these examples and modifying them to understand how changes affect the player experience.

---

**Ready to create your first interactive story?** Start with the Impressionist format for quick prototyping, then move to Traditional format when you need more control. Both create engaging, AI-powered experiences that respond naturally to player creativity.