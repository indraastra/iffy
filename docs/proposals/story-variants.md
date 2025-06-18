# Story Variants System

## Summary

Enable multiple narrative styles of the same core story to coexist as selectable variants, allowing players to experience different aesthetic interpretations while maintaining the same plot structure and decision points.

## Background

The Friday Night Rain story has evolved from its original sweet, romantic tone to a sophisticated Wong Kar-wai-inspired aesthetic with temporal dislocation and restraint. Both versions have distinct appeal:

- **Original**: Direct emotional connection, accessible romance
- **Wong Kar-wai version**: Cinematic sophistication, oblique storytelling

Rather than choosing one over the other, we should enable both to coexist as variants, potentially leading to a broader Create/Remix feature.

## Proposed Design

### File Structure

Stories with variants would use a folder-based structure:

```
examples/
├── friday_night_rain/
│   ├── metadata.yaml          # Collection metadata
│   ├── base.yaml             # Shared story structure
│   └── variants/
│       ├── sweet_surrender.yaml    # Original version
│       └── through_glass_darkly.yaml  # Wong Kar-wai version
└── simple_story.yaml        # Non-variant stories remain flat
```

### Metadata Structure

**metadata.yaml**:
```yaml
title: "Friday Night Rain"
author: "Iffy Engine Team"
blurb: "Your weekly coffee ritual takes an unexpected turn."
version: "3.0"
type: "variant_collection"

variants:
  sweet_surrender:
    name: "Sweet Surrender"
    description: "A tender, accessible romance with direct emotional connection"
    aesthetic: "romantic_realism"
    
  through_glass_darkly:
    name: "Through a Glass Darkly" 
    description: "Cinematic sophistication with temporal dislocation and restraint"
    aesthetic: "wong_kar_wai"
```

**base.yaml** (shared structure):
```yaml
# Core story structure that remains constant across variants
context: "Your usual Friday evening at the café. Alex seems different tonight."

world:
  characters:
    alex:
      name: "Alex"
      sketch: "Your Friday night companion, unusually restless and fidgeting with mug of cold coffee"
      arc: "searching for words, wrestling with change"

  locations:
    grounded_cafe:
      name: "Grounded Café"
      sketch: "Modern urban café with corner booths, large windows, and soft jazz playing through speakers"

scenes:
  opening:
    location: "grounded_cafe"
    process_sketch: false
    # Note: sketch comes from variant

endings:
  when: ["the player or Alex exit the cafe"]
  variations:
    - id: "connection"
      when: "player and Alex leave the café together"
    - id: "missed_chance" 
      when: ["player lets Alex leave without resolution", "player hurts Alex"]
    - id: "friendship_preserved"
      when: "player acknowledges the moment but chooses friendship"

guidance: |
  Alex has been in love with the player for months and tonight plans to confess.
  The player should discover this gradually through Alex's behavior and dialogue.
```

**Variant files** contain only the aesthetic differences:

**variants/sweet_surrender.yaml**:
```yaml
narrative:
  voice: "Warm, intimate, emotionally direct"
  tone: "Hopeful romance with gentle vulnerability"
  themes: ["new love", "taking chances", "coffee shop intimacy"]

scenes:
  opening:
    sketch: |
      The familiar warmth of Grounded Café wraps around you like a favorite sweater. 
      Steam rises from your mug as you settle into your usual booth, the soft jazz 
      creating a perfect backdrop for another Friday evening with Alex.
      
      But tonight feels different. Alex fidgets with their coffee, barely touching 
      the foam art they usually admire. There's something in their eyes - a mix 
      of excitement and nerves that makes your heart skip.

guidance: |
  RESPONSE STYLE:
  - Write with warmth and emotional accessibility
  - Focus on genuine connection and tender moments
  - Use cozy, intimate details that invite the reader in
  - Let emotions be clear and relatable
```

**variants/through_glass_darkly.yaml**:
```yaml
narrative:
  voice: "Detached intimacy, present tense, like observing through glass"
  tone: "Melancholic restraint, understated longing, bittersweet"
  themes: ["missed connections", "time slipping away", "unspoken desires", "urban solitude"]

scenes:
  opening:
    sketch: |
      2:47 AM becomes 9:23 PM becomes this moment, always. Rain against glass, 
      the same Chet Baker track on repeat. You know this booth, these shadows.

      Alex's reflection doubles in the window - one facing you, one watching the street. 
      The coffee has gone cold again. It always goes cold.

      You've been here before. You'll be here again. But tonight feels different, 
      like a film running at the wrong speed, frames dropping into silence.

guidance: |
  RESPONSE STYLE:
  - Write like a Wong Kar-wai film: oblique, restrained, poetic without being overwrought
  - Focus on surfaces, reflections, fragments - what's seen rather than felt
  - Use repetition and temporal dislocation ("You've done this before", "This feels familiar")
  - Emphasize the weight of unspoken moments rather than explicit emotion
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. **Story Loader Enhancement**
   - Detect folder vs file structure
   - Parse metadata.yaml to identify variant collections
   - Merge base.yaml with selected variant
   - Maintain backward compatibility with single-file stories

2. **Story Selection Interface**
   - Add variant picker to story selection screen
   - Display variant names, descriptions, and aesthetic tags
   - Store player's variant preference

### Phase 2: Runtime Support
1. **Engine Integration**
   - Update ImpressionistStory type to support variant metadata
   - Ensure all story processing works with merged structure
   - Add variant tracking to game state

2. **Testing Framework**
   - Extend test suite to cover variant loading
   - Test narrative consistency across variants
   - Validate shared structure integrity

### Phase 3: Authoring Tools
1. **CLI Tools**
   - `iffy create-variant <story> <variant-name>` command
   - `iffy validate-variants <story>` for structure checking
   - `iffy merge-preview <story> <variant>` for debugging

2. **Documentation**
   - Variant authoring guide
   - Best practices for separating shared vs variant content
   - Migration guide for existing stories

## Technical Considerations

### Story Loading Logic
```typescript
interface VariantCollection {
  metadata: VariantMetadata;
  base: Partial<ImpressionistStory>;
  variants: Record<string, Partial<ImpressionistStory>>;
}

function loadStory(path: string, variantId?: string): ImpressionistStory {
  if (isVariantCollection(path)) {
    const collection = loadVariantCollection(path);
    const variant = collection.variants[variantId || 'default'];
    return mergeStoryStructure(collection.base, variant);
  }
  return loadSingleStory(path);
}
```

### Deep Merge Strategy
- Arrays: variant overrides base completely
- Objects: deep merge with variant taking precedence
- Strings: variant overrides base completely
- Special handling for scenes (sketch can be variant-specific)

### Backward Compatibility
- Single .yaml files continue to work unchanged
- No impact on existing stories or save games
- Gradual migration path for stories that want variants

## Future Extensions

### Create/Remix Feature
This variant system enables a future "Create/Remix" feature where:
- Players can fork existing stories
- Community variants of popular stories
- Procedural aesthetic variations
- A/B testing different narrative approaches

### Advanced Variant Types
- **Perspective variants**: First person vs third person
- **Genre variants**: Same plot, different genres (horror, comedy, etc.)
- **Length variants**: Extended vs condensed versions
- **Accessibility variants**: Different complexity levels

### Analytics Integration
- Track variant popularity
- A/B test new variants against originals
- Identify successful aesthetic patterns

## Success Metrics

1. **Technical**: Variant loading performance < 100ms additional overhead
2. **User Experience**: Clear variant selection without confusion
3. **Author Experience**: Easy variant creation and maintenance
4. **Content**: At least 3 stories converted to variant format within 6 months

## Migration Example

Converting existing Friday Night Rain:

1. Create `examples/friday_night_rain/` folder
2. Extract shared structure to `base.yaml`
3. Move current version to `variants/through_glass_darkly.yaml`
4. Create `variants/sweet_surrender.yaml` with original tone
5. Add `metadata.yaml` with variant descriptions
6. Update any hardcoded references

This creates a foundation for rich, replayable stories while maintaining the simplicity that makes Iffy Engine accessible to new authors.