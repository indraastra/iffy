# Iffy Story Format Reference

Iffy uses an **Impressionist format** that lets you sketch atmospheric scenes and trust the AI to bring them to life naturally. Perfect for emergent storytelling where player creativity drives the narrative.

## Story Structure

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
    leads_to:                                    # Optional - for multi-scene stories
      next_scene: "when something specific happens"

endings:
  when:                                          # Global requirements for ANY ending
    - "conversation has concluded"
    - "player attempts to leave"
  variations:
    - id: "ending_name"
      when: "specific conditions for this ending"
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
Define how your story can conclude with global requirements and specific ending conditions:

```yaml
endings:
  when:                                    # Global requirements for ANY ending
    - "conversation has concluded"
    - "player attempts to leave the garden"
  variations:
    - id: "temporal_understanding"
      when: "player grasps the garden's true nature AND leaves peacefully"
      sketch: |
        You understand now - the garden exists in all times at once. 
        As you step through the gate, you carry this secret forever.
        
    - id: "lost_in_time"
      when: "player becomes confused OR stays too long"
      sketch: |
        The garden keeps you, adding your voice to the fountain's whispers.
        Another soul learning that some mysteries consume those who seek them.
```

**Ending Guidelines**:
- **when** (global): Requirements that must be met for ANY ending to trigger
- **when** (per ending): Specific conditions for this particular ending
- **sketch**: The conclusion narrative
- The AI enforces BOTH global and specific conditions before triggering endings

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

### Advanced Features

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

### Best Practices

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

### Example: Complete Story

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

## Single-Scene vs Multi-Scene Stories

### Single-Scene Stories
Perfect for focused, intimate experiences:

```yaml
scenes:
  - id: "cafe_evening"
    sketch: |
      The coffee shop is closing, rain streaks the windows, and Alex
      seems nervous about something important they want to tell you.

endings:
  when:
    - "conversation has concluded"
    - "someone leaves the cafe"
  variations:
    - id: "connection"
      when: "mutual feelings are shared AND they leave together"
      sketch: "You walk into the rain together, finally understanding."
```

### Multi-Scene Stories
For exploration and progression:

```yaml
scenes:
  - id: "library_entrance"
    sketch: "Towering shelves stretch upward filled with ancient books..."
    leads_to:
      restricted_section: "when player shows proper credentials"
      reading_room: "if they ask about specific research"
      
  - id: "restricted_section" 
    sketch: "Behind locked glass, forbidden tomes whisper secrets..."
```

## Testing Your Stories

### Validation Checklist
- [ ] All required fields present (title, author, scenes, endings)
- [ ] All referenced scene IDs exist (no broken links)
- [ ] At least one path from start to each ending
- [ ] Global ending requirements are achievable
- [ ] IDs use only lowercase letters, numbers, and underscores

### Playtesting Tips
1. **Try unexpected actions** - How does your story handle creative player input?
2. **Test all paths** - Can players reach every ending you defined?
3. **Check pacing** - Are scenes too long or too short?
4. **Verify tone** - Does the AI maintain your intended atmosphere?
5. **Ensure clarity** - Are players getting enough information to progress?

## Common Patterns

### Mystery Stories
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

### Character Development
```yaml
world:
  characters:
    mentor:
      name: "Master Chen"
      essence: "Wise teacher hiding deep sadness about his past failures"
      arc: "guarded → trusting → vulnerable revelation"
```

## Rich Text Reference

Iffy supports rich text formatting for enhanced presentation:

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
Check the bundled example stories:
- **"Friday Night Rain"**: Single-scene intimate conversation with multiple endings
- **"The Sentient Quill"**: Multi-scene Victorian mystery with complex investigation
- **"The Key"**: Simple puzzle story demonstrating basic structure
- **"The Test Chamber"**: Technical testing story with precise condition enforcement

The best way to learn is by studying these examples and modifying them to understand how changes affect the player experience.

---

**Ready to create your first interactive story?** Start with a single scene and simple endings, then expand to multi-scene stories as you become more comfortable with the format. Iffy creates engaging, AI-powered experiences that respond naturally to player creativity.