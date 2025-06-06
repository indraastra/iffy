# Story Format v2: Action-Based Narrative Enhancement

**Status:** 📋 Proposed  
**Priority:** High  
**Motivation:** Current format limitations discovered through sandwich_crisis.yaml implementation

## Problem Statement

While implementing a simple branching sandwich-making story, we discovered fundamental limitations in the current story format that prevent natural action-based storytelling:

### Current Format Limitations

1. **Item Collection Focus**: Format is designed around collecting items and meeting possession conditions
2. **Automatic Flow Transitions**: Flows trigger based on item possession, not player actions
3. **No Action-Based State Tracking**: Cannot reliably detect and respond to specific player actions like "use toaster" or "take bite"
4. **No Item Transformations**: Cannot transform items (bread → toasted bread)
5. **Automatic Ending Triggers**: Endings trigger on flow entry, not on specific player commands
6. **LLM Compliance Issues**: No guarantee LLM will follow complex guidelines about flag setting or waiting for specific commands

### Real-World Story Requirements

The sandwich crisis story revealed a need for simple state machines:

```
Collecting → Toasting → Assembling → [Choice] → Eating → Ending
```

But current format only supports:

```
Collect Items → Meet Conditions → Auto-trigger Flows
```

## Proposed Format v2 Enhancements

### 1. Action Triggers

Add explicit action detection and response:

```yaml
action_triggers:
  - id: "toast_bread"
    command_patterns: 
      - "use toaster"
      - "toast bread"
      - "put bread in toaster"
    requirements: ["has_item:bread"]
    sets: ["bread_toasted"]
    removes: ["has_item:bread"]
    adds: ["has_item:toasted_bread"]
    response: |
      [!discovery] The bread transforms into **GOLDEN TOAST**! 
      The toaster has done its MAGNIFICENT work!
    
  - id: "apply_condiment"
    command_patterns:
      - "apply condiment"
      - "use mystery jar"
      - "add condiment to sandwich"
    requirements: ["has_item:mystery_jar", "has_item:toasted_bread"]
    sets: ["condiment_applied"]
    response: |
      [!warning] You apply the mysterious condiment! Its fate 
      shall be revealed when you take the first bite!
```

### 2. Item Transformations

Support explicit item state changes:

```yaml
item_transformations:
  - trigger: "use_toaster"
    from_item: "bread"
    to_item: "toasted_bread"
    requirements: []
    sets: ["bread_toasted"]
    
  - trigger: "assemble_sandwich"
    required_items: ["toasted_bread", "cheese"]
    creates_item: "basic_sandwich"
    consumes_items: ["toasted_bread", "cheese"]
    sets: ["sandwich_assembled"]
```

### 3. Conditional Ending Triggers

Replace automatic flow-based endings with action-triggered endings:

```yaml
ending_triggers:
  - id: "safe_ending"
    action_patterns:
      - "eat sandwich"
      - "take bite"
      - "taste sandwich"
    conditions: 
      - "flag:bread_toasted"
      - "has_item:cheese" 
      - "NOT flag:condiment_applied"
    ending_flow: "cheese_triumph"
    
  - id: "dangerous_ending"
    action_patterns:
      - "eat sandwich"
      - "take bite"
      - "taste sandwich"
    conditions:
      - "flag:bread_toasted"
      - "flag:condiment_applied"
    ending_flow: "fish_sauce_doom"
```

### 4. Enhanced Flow Control

Flows wait for specific actions rather than auto-advancing:

```yaml
flows:
  - id: "assembly_phase"
    type: "narrative"
    name: "Ready to Assemble!"
    content: |
      You have the ingredients! Now you must **USE THE TOASTER** 
      to transform your bread into golden perfection!
    
    # Flow waits for action, doesn't auto-advance
    waits_for_action: true
    
    # Only advance when specific action taken
    action_transitions:
      - action: "use_toaster"
        to_flow: "toasting_complete"
      - action: "assemble_without_toasting"
        to_flow: "raw_bread_warning"
```

### 5. State Validation

Ensure story consistency with state validation:

```yaml
state_validation:
  - rule: "sandwich_assembly"
    condition: "assembling_sandwich"
    requires: ["flag:bread_toasted", "has_item:cheese"]
    failure_message: "You need toasted bread and cheese to make a proper sandwich!"
    
  - rule: "ending_trigger"
    condition: "eating_sandwich"
    requires: ["has_item:sandwich OR (has_item:toasted_bread AND has_item:cheese)"]
    failure_message: "You need to assemble a sandwich before eating it!"
```

### 6. Action Command Patterns

More flexible command recognition:

```yaml
command_patterns:
  cooking_actions:
    - patterns: ["toast *", "use toaster with *", "put * in toaster"]
      action: "use_toaster"
      target_extraction: "item_reference"
    
    - patterns: ["eat *", "take bite of *", "taste *"]
      action: "consume"
      target_extraction: "item_reference"
    
    - patterns: ["apply * to *", "spread * on *", "add * to *"]
      action: "combine_items"
      source_extraction: "first_item"
      target_extraction: "second_item"
```

## Implementation Strategy

### Phase 1: Core Action System
1. Implement `action_triggers` parsing and execution
2. Add action pattern matching to game engine
3. Create action response system

### Phase 2: Item Transformations
1. Add item transformation system
2. Support item creation/consumption
3. Update inventory management

### Phase 3: Conditional Endings
1. Implement `ending_triggers` system
2. Replace automatic flow endings
3. Add action-based ending detection

### Phase 4: Enhanced Flow Control
1. Add `waits_for_action` flow behavior
2. Implement `action_transitions`
3. Create state validation system

## Example: Simple Sandwich Story

```yaml
title: "Simple Sandwich"
# ... metadata ...

items:
  - id: "bread"
    name: "Bread"
    description: "Plain bread that needs toasting"
    
  - id: "toasted_bread"
    name: "Toast"
    description: "Golden, perfect toast!"
    
  - id: "cheese"
    name: "Cheese"
    description: "A slice of cheese"

action_triggers:
  - id: "toast_bread"
    command_patterns: ["toast bread", "use toaster"]
    requirements: ["has_item:bread"]
    transforms:
      - from: "bread"
        to: "toasted_bread"
    response: "Perfect golden toast!"

ending_triggers:
  - id: "good_ending"
    action_patterns: ["eat", "bite"]
    conditions: ["has_item:toasted_bread", "has_item:cheese"]
    ending_flow: "success"

flows:
  - id: "start"
    type: "narrative"
    content: "Find ingredients and make a sandwich!"
    waits_for_action: true
    
  - id: "success"
    type: "narrative"
    content: "Delicious sandwich!"
    ends_game: true
```

## Benefits

1. **Natural Storytelling**: Stories can follow actual player actions
2. **Flexible Progression**: No forced item collection sequences
3. **Action-Based Logic**: Triggers based on what players DO, not what they HAVE
4. **Simpler Stories**: Complex flow chains replaced with simple action → response
5. **Better Player Agency**: Players drive progression through actions
6. **Predictable Behavior**: Less reliance on LLM compliance for story logic

## Migration Path

- Current v1 format remains fully supported
- v2 features are additive enhancements
- Stories can gradually adopt v2 features
- Mixed v1/v2 stories supported during transition

## Related Issues

- Fixes sandwich_crisis.yaml structural problems
- Enables natural action-based narratives
- Reduces complexity in story authoring
- Improves player experience consistency

## Success Metrics

1. **sandwich_crisis.yaml** works as intended with v2 format
2. Story authors can create action-based narratives easily
3. Player actions reliably trigger intended responses
4. Reduced reliance on complex LLM prompt engineering for story logic