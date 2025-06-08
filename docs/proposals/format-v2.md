# Story Format v2: LLM-Driven Simplicity

**Status:** ✅ Fully Implemented  
**Priority:** Complete  
**Implementation:** Success conditions system in `src/engine/gameEngine.ts:968-1011`, working in all example stories

## Core Philosophy Shift

**Original Problem**: Format v1 was too rigid and couldn't handle simple action-based stories like sandwich-making.

**Wrong Solution**: Add complex manual specifications (action_triggers, transforms, etc.) that burden authors.

**Right Solution**: **Let the LLM do the intelligent inference work** - reduce authoring complexity while increasing expressivity.

## The Real Problem

The sandwich crisis story revealed that we're forcing authors to specify things that LLMs should naturally understand:

### What Authors Want to Write:
```yaml
items:
  - id: "bread"
    name: "Stale Bread"
    description: "Old bread that could be toasted"
    
success_conditions:
  - description: "Make and eat a sandwich with toasted bread and cheese"
    requires: ["toasted bread", "cheese"]
    trigger_action: "eat sandwich"
```

### What Format v1 Forces Them to Write:
```yaml
# Complex flow chains, rigid item possession checks, manual state tracking...
# 200+ lines of YAML for a simple sandwich story
```

### What Format v2 (Wrong Approach) Would Force:
```yaml
action_triggers:
  - command_patterns: ["toast bread", "use toaster", "toast the bread"]
    transforms: [{from: "bread", to: "toasted_bread"}]
    requirements: ["has_item:bread"]
# Even MORE manual specification!
```

## Format v2: LLM-Driven Intelligence

### Core Principle: **Describe Intent, Let LLM Infer Implementation**

Instead of manually specifying every possible action and transformation, authors describe their story goals and let the LLM figure out how to achieve them.

### 1. Success Conditions (Instead of Complex Flows)

```yaml
success_conditions:
  - id: "good_ending"
    description: "Player successfully makes and eats a sandwich with toasted bread and cheese"
    requires: ["toasted bread", "cheese"]
    # ending field is optional - if omitted, LLM generates contextual ending
    ending: |
      [!discovery] Perfect! You've made the ideal sandwich with golden toast and cheese.
      Your hunger is satisfied!
      
  - id: "bad_ending"
    description: "Player eats sandwich with the mystery condiment (fish sauce)"
    requires: ["bread", "mystery condiment"]
    priority: 10  # Higher priority than good ending
    # No ending field - LLM will generate appropriate ending based on description
    
  - id: "minimal_ending"
    description: "Player achieves basic sandwich completion"
    requires: ["bread", "cheese"]
    # Completely LLM-generated ending based on story context and description
```

### 2. Smart Item Relationships (Instead of Manual Transformations)

```yaml
items:
  - id: "bread"
    name: "Stale Bread"
    description: "Old bread that could be improved by toasting"
    can_become: "toasted bread"  # LLM infers how
    
  - id: "toasted_bread"
    name: "Golden Toast"
    description: "Perfectly toasted bread"
    created_from: "bread"  # LLM understands the relationship
    
  - id: "mystery_jar"
    name: "Mystery Condiment"
    description: "Unlabeled jar containing unknown sauce"
    aliases: ["mystery condiment", "unknown sauce"]
```

### 3. LLM Inference Guidelines (Instead of Rigid Rules)

```yaml
llm_story_guidelines: |
  STORY GOALS:
  - Player should find bread and cheese
  - Bread can be toasted to become "toasted bread" using kitchen appliances
  - Good ending: Player eats sandwich made with toasted bread + cheese
  - Bad ending: Player uses mystery condiment (it's actually fish sauce)
  
  ITEM TRANSFORMATIONS:
  - When player toasts/cooks bread → becomes "toasted bread"
  - "Toasted bread" satisfies requirements for "toasted bread"
  - Be flexible about cooking methods (toaster, oven, pan, etc.)
  
  ENDING TRIGGERS:
  - Watch for eating/biting sandwich actions
  - Check if player has winning combination
  - Prioritize specific bad endings over general good ones
```

### 4. Simplified Flow System (Optional)

Flows become simple narrative moments instead of complex state machines:

```yaml
flows:
  - id: "start"
    type: "narrative"
    content: |
      Your stomach rumbles! Time to make a sandwich.
      Look around for ingredients!
    
  # No complex transitions - LLM handles progression naturally
```

### 5. Enhanced Item Discovery (Keeps Current Strengths)

```yaml
# Keep the current discoverable_in system - it works well
items:
  - id: "bread"
    discoverable_in: "kitchen"
    discovery_objects: ["pantry", "bread box"]
    can_become: "toasted bread"  # NEW: LLM inference hint
```

## Implementation Strategy

### Phase 1: Success Conditions System
1. Add `success_conditions` parsing to story format
2. Implement success condition checking in game engine
3. Create LLM prompts that understand success goals

### Phase 2: Smart Item Relationships  
1. Add `can_become` and `created_from` to item definitions
2. Enhance LLM prompts to understand item transformations
3. Let LLM infer when transformations should occur

### Phase 3: LLM Story Intelligence
1. Add `llm_story_guidelines` section to stories
2. Enhance prompts to include story-specific guidance
3. Implement intelligent ending detection

### Phase 4: Simplified Authoring Tools
1. Create story templates for common patterns
2. Add validation for success conditions
3. Provide authoring guidelines for LLM-friendly stories

## Example: Simple Sandwich Story (Format v2)

```yaml
title: "Simple Sandwich"
# ... metadata ...

items:
  - id: "bread"
    name: "Stale Bread" 
    description: "Old bread that could be improved by toasting"
    discoverable_in: "kitchen"
    can_become: "toasted bread"
    
  - id: "cheese"
    name: "Cheese"
    description: "A slice of cheese"
    discoverable_in: "kitchen"

success_conditions:
  - id: "perfect_sandwich"
    description: "Make and eat a sandwich with toasted bread and cheese"
    requires: ["toasted bread", "cheese"]
    trigger_action: "eat sandwich"
    ending: |
      [!discovery] Perfect! You've made the ideal sandwich.
      The golden toast and melted cheese are delicious!

flows:
  - id: "start"
    type: "narrative"
    content: |
      Your stomach rumbles! Time to make a sandwich.
      Look around the kitchen for ingredients.

llm_story_guidelines: |
  STORY GOAL: Player should make and eat a sandwich with toasted bread and cheese.
  
  ITEM TRANSFORMATIONS:
  - When player toasts "Stale Bread" → becomes "toasted bread"
  - Be flexible about toasting methods (toaster, oven, pan, etc.)
  
  SUCCESS: When player eats sandwich with both "toasted bread" and "cheese"
```

**Result**: 25 lines instead of 100+, and the LLM handles all the complexity!

## LLM-Generated Endings

When a success condition is reached but has no predefined `ending` field, the game engine automatically generates an ending using the LLM. This provides:

1. **Dynamic Conclusions**: Endings that reflect the specific player journey and story context
2. **Reduced Authoring Effort**: Authors only need to define ending conditions, not ending text
3. **Contextual Relevance**: Generated endings incorporate the player's final action and current story state
4. **Consistent Tone**: Endings match the story's established tone and style

The LLM generation process:
- Receives the success condition description and requirements
- Gets full story context and tone guidance
- Considers the player's final action that triggered the ending
- Generates appropriate conclusion text using the story's narrative voice

## Benefits of LLM-Driven Approach

1. **Reduced Authoring Burden**: Authors describe goals, not implementation details
2. **Natural Language for Authors**: Write what you want, not how to achieve it
3. **Flexible Player Actions**: LLM handles variations and synonyms naturally
4. **Intelligent Inference**: System understands logical relationships (bread → toasted bread)
5. **Dynamic Content**: Endings generated contextually when not pre-written
6. **Simpler Debugging**: Fewer moving parts, clearer intent
7. **Future-Proof**: New LLM capabilities automatically benefit stories

## Key Insights

### ❌ Wrong Approach: More Manual Specification
- Forces authors to think like programmers
- Brittle - breaks when players use unexpected phrasing
- Doesn't leverage LLM intelligence
- Creates maintenance burden

### ✅ Right Approach: LLM Intelligence + Author Intent
- Authors focus on storytelling, not edge cases
- LLM handles the "how", authors specify the "what"
- Robust to player variation
- Leverages the core strength of LLMs

## Migration Path

- Format v1 remains fully supported
- New `success_conditions` are optional enhancements
- Existing stories work unchanged
- Authors can gradually adopt v2 patterns
- LLM prompts enhanced to understand both formats

## Success Metrics

1. **sandwich_crisis.yaml** can be rewritten in <30 lines while maintaining functionality
2. Authors can express complex story logic without programming knowledge
3. Stories become more robust to player input variations
4. Reduced time from story concept to working implementation

## Next Steps

1. Implement `success_conditions` parsing
2. Enhance LLM prompts with story intelligence
3. Rewrite sandwich_crisis.yaml as proof of concept
4. Create authoring guidelines for LLM-friendly stories