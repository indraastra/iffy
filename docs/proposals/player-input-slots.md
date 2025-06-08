# Player Input Slots: Structured Story Customization

**Status:** ❌ Not Implemented  
**Priority:** Low  
**Current State:** No player customization system; stories are entirely pre-authored  

## Problem Statement

Interactive fiction authors currently have two extremes for player input:
1. **Full narrative control** - Players can say anything, but authors lose control over story coherence
2. **Rigid predetermined stories** - Authors maintain control but players have no creative input

There's a missing middle ground where authors can give players **structured creative control** over specific story elements while maintaining narrative coherence and thematic consistency.

### Current Limitations:
- **No player story ownership** - Players consume pre-written narratives without personal investment
- **Missed personalization opportunities** - Stories can't adapt to player preferences or background
- **Limited replay value** - Same story elements every time
- **No collaborative storytelling** - Authors and players can't co-create within boundaries

## Proposed Solution: Input Slots System

A **Mad Libs-style system** where authors define specific **input slots** that players fill before or during the story, allowing controlled customization of story elements.

### Core Concept:

```yaml
# Author defines slots in story metadata
input_slots:
  - id: "protagonist_name"
    type: "text"
    prompt: "What is your character's name?"
    validation: "^[A-Za-z\\s]{2,20}$"
    default: "Alex"
    
  - id: "hometown"
    type: "choice"
    prompt: "Where did you grow up?"
    options:
      - "a bustling city"
      - "a quiet small town" 
      - "a remote rural area"
    default: "a quiet small town"
    
  - id: "greatest_fear"
    type: "text"
    prompt: "What is your character's greatest fear?"
    max_length: 50
    content_filter: ["violence", "explicit"]
    default: "being alone"

# Authors reference slots in story content
flows:
  - id: "introduction"
    content: |
      Welcome, {{protagonist_name}}. Growing up in {{hometown}} prepared you 
      for many things, but nothing could have prepared you for this moment.
      
      As you stand at the threshold, you can't help but think about your 
      greatest fear: {{greatest_fear}}. Today, you'll face it head-on.
```

## System Architecture

### 1. Input Slot Types

#### **Text Slots**
```yaml
- id: "character_trait"
  type: "text"
  prompt: "Describe your character in one word"
  validation: "^[A-Za-z]{3,15}$"
  suggestions: ["brave", "clever", "kind", "determined"]
  max_length: 15
  content_filter: ["inappropriate", "offensive"]
  default: "curious"
```

#### **Choice Slots**
```yaml
- id: "background"
  type: "choice"
  prompt: "What's your character's background?"
  options:
    - value: "scholar"
      display: "Scholar - You value knowledge above all"
    - value: "warrior"
      display: "Warrior - You solve problems with strength"
    - value: "diplomat"
      display: "Diplomat - You believe in the power of words"
  default: "scholar"
  affects_gameplay: true  # This choice unlocks different story paths
```

#### **Numeric Slots**
```yaml
- id: "age"
  type: "number"
  prompt: "How old is your character?"
  min: 16
  max: 65
  default: 25
  affects_content: true  # Age influences dialogue and available actions
```

#### **Relationship Slots**
```yaml
- id: "companion_relationship"
  type: "relationship"
  prompt: "Who is Sarah to your character?"
  character: "sarah"
  options:
    - "childhood friend"
    - "former rival"
    - "trusted mentor"
    - "romantic interest"
  default: "childhood friend"
  affects_dialogue: true  # Changes how characters speak to each other
```

### 2. Content Integration Syntax

#### **Simple Substitution**
```yaml
content: |
  "Hello, {{protagonist_name}}," Sarah says warmly. 
  "I remember when we were kids in {{hometown}}."
```

#### **Conditional Content**
```yaml
content: |
  {{#if background=="warrior"}}
  You instinctively reach for your sword, ready for trouble.
  {{#elseif background=="scholar"}}
  You quickly assess the situation, looking for clues.
  {{#else}}
  You step forward diplomatically, hands raised in peace.
  {{/if}}
```

#### **Dynamic Character References**
```yaml
content: |
  Sarah looks at you with the familiarity of {{companion_relationship}}.
  {{#if companion_relationship=="romantic_interest"}}
  Her eyes linger on yours a moment longer than necessary.
  {{#elseif companion_relationship=="former_rival"}}
  There's still a hint of competitive fire in her gaze.
  {{/if}}
```

### 3. Slot Collection Workflows

#### **Pre-Story Collection**
```yaml
# Collect all slots before story begins
story_setup:
  input_collection: "pre_story"
  slots: ["protagonist_name", "background", "hometown", "greatest_fear"]
  ui_style: "character_creation"
  
# UI shows character creation screen with all fields
```

#### **In-Story Collection**
```yaml
# Collect slots as story progresses
flows:
  - id: "name_reveal"
    type: "input_collection"
    slot: "protagonist_name"
    prompt: |
      "And what should I call you?" the mysterious figure asks.
    
    after_collection:
      next_flow: "story_continues"
```

#### **Contextual Collection**
```yaml
# Collect based on story events
flows:
  - id: "memory_flashback"
    type: "narrative"
    content: |
      As you see the old playground, memories flood back...
    
    input_prompts:
      - slot: "childhood_memory"
        trigger: "examine playground"
        prompt: "What's your strongest memory from this place?"
```

### 4. Validation and Content Filtering

#### **Built-in Validation**
```yaml
- id: "pet_name"
  type: "text"
  validation:
    pattern: "^[A-Za-z\\s]{2,15}$"
    no_numbers: true
    no_special_chars: true
    min_length: 2
    max_length: 15
```

#### **Content Filtering**
```yaml
- id: "personal_story"
  type: "text"
  content_filter:
    prohibited_topics: ["violence", "explicit", "political"]
    toxicity_threshold: 0.7
    fallback_on_filter: "a personal experience"
```

#### **Thematic Validation**
```yaml
- id: "magical_item"
  type: "text"
  thematic_filter:
    genre: "fantasy"
    allowed_concepts: ["medieval", "magical", "mystical"]
    prohibited_concepts: ["modern", "technological", "sci-fi"]
```

## Implementation Strategy

### Phase 1: Basic Text Substitution

**Scope**: Simple {{slot_id}} replacement in story content
- Add input_slots to story metadata
- Create slot collection UI before story starts
- Implement basic text substitution in content rendering
- Add validation for common slot types

**Estimated effort**: 2-3 weeks

### Phase 2: Conditional Content

**Scope**: {{#if}} conditional rendering based on slot values
- Implement template engine for conditional content
- Add support for choice-based story branching
- Create preview system for authors to test combinations

**Estimated effort**: 3-4 weeks

### Phase 3: In-Story Collection

**Scope**: Collect slots during story progression
- Add input_collection flow type
- Implement contextual slot prompts
- Add slot validation during gameplay

**Estimated effort**: 2-3 weeks

### Phase 4: Advanced Features

**Scope**: Relationships, complex validation, content filtering
- Implement relationship slots affecting dialogue
- Add AI-based content filtering
- Create slot dependency system
- Add export/import for slot configurations

**Estimated effort**: 4-5 weeks

## User Experience Flows

### 1. Author Experience

#### **Slot Definition**
```yaml
# Author defines in story YAML
input_slots:
  - id: "hero_name"
    type: "text"
    prompt: "What's your hero's name?"
    default: "Robin"
    
  - id: "quest_motivation"
    type: "choice"
    prompt: "Why does your hero seek the artifact?"
    options: ["revenge", "justice", "curiosity", "duty"]
```

#### **Content Creation**
```yaml
# Author writes templated content
content: |
  {{hero_name}} stands before the ancient temple, driven by {{quest_motivation}}.
  
  {{#if quest_motivation=="revenge"}}
  Your jaw clenches as you remember what they took from you.
  {{#elseif quest_motivation=="justice"}}
  The weight of responsibility settles on your shoulders.
  {{/if}}
```

#### **Testing & Preview**
- **Slot Preview Tool**: Authors can test different slot combinations
- **Content Validation**: Check that all slot references are valid
- **Impact Analysis**: See which story paths are affected by each slot

### 2. Player Experience

#### **Character Creation Screen**
```
┌─ Create Your Character ─────────────────────────┐
│                                                 │
│ Name: [Robin________________]                   │
│                                                 │
│ Background:                                     │
│ ○ Scholar  ○ Warrior  ● Diplomat               │
│                                                 │
│ Hometown:                                       │
│ ○ Bustling city                                │
│ ● Quiet small town                             │
│ ○ Remote rural area                            │
│                                                 │
│ Greatest Fear: [being forgotten_______________] │
│                                                 │
│ [Preview Story] [Start Adventure]               │
└─────────────────────────────────────────────────┘
```

#### **In-Story Collection**
```
> examine old photo

As you look at the faded photograph, a memory surfaces...

┌─ Character Memory ──────────────────────────────┐
│ What do you remember most about this place?     │
│                                                 │
│ [________________________________]             │
│                                                 │
│ [Continue Story]                                │
└─────────────────────────────────────────────────┘
```

#### **Personalized Content**
```
"Robin," Sarah says, her voice carrying the weight of your shared 
history as childhood friends. "I know this isn't easy for someone 
who fears being forgotten, but your diplomat background makes you 
the only one who can negotiate with them."

> talk to sarah about the plan
```

## Benefits & Use Cases

### 1. Enhanced Player Investment

**Personalization**: Players see their input reflected in the story
```yaml
# Player input: hero_name="Alex", hometown="New York"
content: |
  As Alex walked through the alien landscape, they couldn't help 
  but think of the bustling streets of New York, so different 
  from this barren world.
```

**Ownership**: Players feel co-creative rather than passive
**Replayability**: Different input combinations create varied experiences

### 2. Author Creative Control

**Bounded creativity**: Players contribute within author-defined parameters
**Thematic consistency**: Content filtering ensures story coherence
**Narrative structure**: Core plot remains intact while details personalize

### 3. Specific Use Cases

#### **Character-Driven Stories**
```yaml
# Romance story with customizable relationships
input_slots:
  - id: "meet_location"
    prompt: "Where did you first meet Sam?"
    type: "choice"
    options: ["coffee shop", "library", "park", "work"]
    
content: |
  "Remember when we met at the {{meet_location}}?" Sam asks softly.
  {{#if meet_location=="coffee_shop"}}
  "You spilled coffee all over my laptop."
  {{#elseif meet_location=="library"}}
  "You were reading the same obscure philosophy book."
  {{/if}}
```

#### **Mystery Stories**
```yaml
# Player defines key evidence or suspects
input_slots:
  - id: "suspicious_behavior"
    prompt: "What odd behavior did you notice about the victim?"
    type: "text"
    content_filter: ["violence"]
    
content: |
  Detective Morrison nods thoughtfully. "The fact that the victim 
  had been {{suspicious_behavior}} definitely changes things."
```

#### **Fantasy Adventures**
```yaml
# Customizable magical abilities or items
input_slots:
  - id: "magic_specialty"
    prompt: "What type of magic do you specialize in?"
    type: "choice"
    options: ["elemental", "illusion", "healing", "divination"]
    affects_gameplay: true
    
# Different spells available based on choice
```

## Technical Implementation Details

### 1. Storage Format

#### **Story Metadata Extension**
```yaml
title: "The Customizable Quest"
author: "Adventure Writer"
version: "1.0"

# New input_slots section
input_slots:
  - id: "hero_name"
    type: "text"
    prompt: "Hero's name?"
    default: "Robin"
    validation: "^[A-Za-z\\s]{2,20}$"
    
  - id: "quest_reason"
    type: "choice"
    prompt: "Why seek the treasure?"
    options: ["glory", "gold", "knowledge"]
    default: "glory"
    affects_gameplay: true

# Content uses template syntax
flows:
  - id: "intro"
    content: |
      Welcome, {{hero_name}}! Your quest for {{quest_reason}} begins now.
      
      {{#if quest_reason=="knowledge"}}
      The ancient library calls to your scholarly nature.
      {{#elseif quest_reason=="gold"}}
      You can almost feel the weight of coins in your pocket.
      {{#else}}
      Songs will be sung of your deeds!
      {{/if}}
```

#### **Player Data Storage**
```json
{
  "storyId": "customizable_quest_v1",
  "playerSlots": {
    "hero_name": "Alexandra",
    "quest_reason": "knowledge",
    "hometown": "mystical_forest",
    "collected_at": "2024-01-15T10:30:00Z"
  },
  "gameState": {
    // ... existing game state
  }
}
```

### 2. Template Engine

#### **Template Processor**
```typescript
interface SlotValue {
  id: string;
  value: string | number | boolean;
  type: 'text' | 'choice' | 'number';
}

class TemplateProcessor {
  processContent(content: string, slots: SlotValue[]): string {
    // 1. Simple substitution: {{slot_id}}
    let processed = this.substituteSlots(content, slots);
    
    // 2. Conditional blocks: {{#if condition}}...{{/if}}
    processed = this.processConditionals(processed, slots);
    
    return processed;
  }
  
  private substituteSlots(content: string, slots: SlotValue[]): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, slotId) => {
      const slot = slots.find(s => s.id === slotId);
      return slot ? String(slot.value) : match;
    });
  }
  
  private processConditionals(content: string, slots: SlotValue[]): string {
    // Handle {{#if slot=="value"}}...{{#elseif}}...{{#else}}...{{/if}}
    const conditionalRegex = /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return content.replace(conditionalRegex, (match, condition, body) => {
      return this.evaluateConditional(condition, body, slots);
    });
  }
}
```

#### **Validation Engine**
```typescript
interface SlotDefinition {
  id: string;
  type: 'text' | 'choice' | 'number';
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  contentFilter?: string[];
  default: any;
}

class SlotValidator {
  validateSlot(definition: SlotDefinition, value: any): ValidationResult {
    const errors: string[] = [];
    
    // Type validation
    if (!this.validateType(definition.type, value)) {
      errors.push(`Invalid type for ${definition.id}`);
    }
    
    // Pattern validation
    if (definition.validation?.pattern) {
      const regex = new RegExp(definition.validation.pattern);
      if (!regex.test(String(value))) {
        errors.push(`Invalid format for ${definition.id}`);
      }
    }
    
    // Content filtering
    if (definition.contentFilter) {
      const filtered = this.applyContentFilter(value, definition.contentFilter);
      if (filtered !== value) {
        errors.push(`Content not appropriate for ${definition.id}`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
}
```

### 3. UI Components

#### **Slot Collection UI**
```typescript
interface SlotCollectionProps {
  slots: SlotDefinition[];
  onComplete: (values: Record<string, any>) => void;
  onPreview?: (values: Record<string, any>) => void;
}

const SlotCollectionUI: React.FC<SlotCollectionProps> = ({ slots, onComplete }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  
  return (
    <div className="slot-collection">
      <h2>Customize Your Story</h2>
      
      {slots.map(slot => (
        <SlotInput
          key={slot.id}
          definition={slot}
          value={values[slot.id] || slot.default}
          onChange={(value) => setValues(prev => ({ ...prev, [slot.id]: value }))}
        />
      ))}
      
      <div className="actions">
        <button onClick={() => onComplete(values)}>
          Start Adventure
        </button>
        <button onClick={() => onPreview?.(values)}>
          Preview Story
        </button>
      </div>
    </div>
  );
};
```

## Advanced Features

### 1. Slot Dependencies

```yaml
input_slots:
  - id: "has_pet"
    type: "choice"
    prompt: "Do you have a pet?"
    options: ["yes", "no"]
    
  - id: "pet_type"
    type: "choice"
    prompt: "What kind of pet?"
    options: ["dog", "cat", "bird", "other"]
    depends_on: 
      - slot: "has_pet"
        value: "yes"
    
  - id: "pet_name"
    type: "text"
    prompt: "What's your pet's name?"
    depends_on:
      - slot: "has_pet" 
        value: "yes"
```

### 2. Slot Impact Tracking

```yaml
input_slots:
  - id: "character_class"
    type: "choice"
    options: ["warrior", "mage", "rogue"]
    impacts:
      dialogue: ["guard_conversation", "merchant_talk"]
      items: ["weapon_selection", "armor_availability"]
      flows: ["combat_scenes", "stealth_options"]
```

### 3. Content Preview System

```typescript
// Author preview tool
const PreviewSystem = {
  generatePreviews(story: Story, slotCombinations: SlotValue[][]): Preview[] {
    return slotCombinations.map(combination => ({
      slots: combination,
      content: this.renderStoryWithSlots(story, combination),
      affectedFlows: this.getAffectedFlows(story, combination)
    }));
  }
};
```

## Considerations & Limitations

### 1. Content Coherence

**Challenge**: Player input might break story logic or tone
**Solution**: 
- Strong content filtering and validation
- Thematic constraints based on story genre
- Fallback to defaults when input is inappropriate

### 2. Authoring Complexity

**Challenge**: Authors need to consider multiple input combinations
**Solution**:
- Preview tools showing different slot combinations
- Impact analysis showing which content is affected
- Template validation catching broken references

### 3. Performance Impact

**Challenge**: Template processing on every content render
**Solution**:
- Cache processed content for common slot combinations
- Lazy evaluation of conditional blocks
- Pre-compile templates when possible

### 4. Player Expectations

**Challenge**: Players might expect more influence than slots provide
**Solution**:
- Clear communication about the scope of customization
- Preview system showing impact of choices
- Gradual introduction of slot complexity

## Migration Strategy

### 1. Backward Compatibility

**Existing stories continue to work unchanged**
- input_slots section is optional
- Stories without slots render normally
- No breaking changes to existing story format

### 2. Gradual Adoption

**Phase 1**: Simple text substitution (names, places)
**Phase 2**: Choice-based content variation
**Phase 3**: Complex conditional rendering
**Phase 4**: Advanced features (dependencies, validation)

### 3. Author Education

**Documentation**: Comprehensive guides with examples
**Templates**: Pre-built slot configurations for common use cases
**Community**: Sharing slot patterns and best practices

## Conclusion

The Player Input Slots system provides a **structured middle ground** between rigid predetermined stories and complete narrative freedom. By allowing authors to define specific customization points, we enable:

- **Player agency** within author-defined boundaries
- **Personalized experiences** that maintain story coherence  
- **Replayability** through different input combinations
- **Co-creative storytelling** between authors and players

This system preserves the author's creative vision while giving players meaningful ways to make stories their own, creating more engaging and personally relevant interactive fiction experiences.

The phased implementation approach ensures we can start simple with basic text substitution and gradually add more sophisticated features based on author adoption and player feedback.