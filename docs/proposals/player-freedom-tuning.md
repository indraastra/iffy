# Player Freedom Tuning

**Status:** 💡 New Proposal  
**Priority:** Medium  
**Motivation:** Allow authors to control how much creative improvisation and freedom players have during gameplay

## Problem Statement

In the current system, the LLM's interpretation of player actions can be either too restrictive or too permissive for the author's intent. For example, in `sandwich_crisis_v2.yaml`, players may want to add pickles to their sandwich, but the engine might reject this action because it's not explicitly mentioned in the story items or success conditions.

Authors need a way to tune the balance between:
- **Story coherence** (staying true to authored content)  
- **Player agency** (allowing reasonable improvisation and creativity)

## Proposed Solution: Freedom Level Setting

Add a simple `player_freedom` setting to story metadata with three levels:

### LOW Freedom (Strict Adherence)
- Players can only interact with explicitly defined items and locations
- Actions must closely match authored content and success conditions
- LLM rejects improvised actions that aren't directly supported by the story definition
- Best for: Puzzle games, mysteries with specific solutions, educational content

### MEDIUM Freedom (Guided Flexibility) 
- Players can perform reasonable actions with authored items
- LLM allows logical extensions (e.g., adding pickles to sandwich if condiments exist)
- Improvised actions succeed if they don't conflict with core story goals
- Best for: Most interactive fiction, adventure games

### HIGH Freedom (Creative Sandbox)
- Players can introduce new elements and take creative liberties
- LLM prioritizes "yes, and..." approach to player actions
- Only blocks actions that would completely break the story world or safety guidelines
- Best for: Creative writing collaboration, experimental narratives

## Implementation

### Story Metadata
```yaml
metadata:
  player_freedom: "medium"  # low | medium | high
  # ... other metadata
```

### LLM Guidelines Integration
The freedom level would be incorporated into the `llm_story_guidelines` automatically:

```yaml
llm_story_guidelines: |
  PLAYER FREEDOM LEVEL: MEDIUM
  
  FREEDOM GUIDELINES:
  - Allow reasonable improvisation with authored items (e.g., adding condiments, using items creatively)
  - Accept logical extensions that don't conflict with success conditions
  - Encourage player creativity while maintaining story coherence
  - Reject actions that would break the core narrative or make success impossible
  
  # ... rest of story-specific guidelines
```

## Examples

### LOW Freedom Example
```
Player: "I add some pickles to my sandwich"
LLM: "You look around but don't see any pickles available. The [item:cheese of last hope] and [item:mystery condiment] are your only options for the sandwich."
```

### MEDIUM Freedom Example  
```
Player: "I add some pickles to my sandwich"
LLM: "You rummage through the [location:refrigerator zone] and find a jar of pickles hiding behind the [item:cheese]! You add a few tangy slices to your sandwich creation."
```

### HIGH Freedom Example
```
Player: "I add pickles and also some leftover pizza from yesterday"
LLM: "In a stroke of culinary GENIUS, you discover forgotten pizza in the depths of your refrigerator! The combination of [item:cheese], pickles, and cold pizza creates the most UNCONVENTIONAL sandwich in the history of lunch!"
```

## Benefits

1. **Author Control**: Clear, simple setting to match gameplay to story intent
2. **Player Clarity**: Players learn the "rules" quickly through feedback
3. **Reusability**: Same story can be tuned for different audiences (strict puzzle vs. creative sandbox)
4. **Implementation Simplicity**: Just modifies LLM prompt instructions, no engine changes needed

## Default Behavior

If no `player_freedom` is specified, default to `medium` as it balances story coherence with reasonable player agency.

## Future Extensions

- Per-location freedom overrides (`kitchen: high`, `vault: low`)
- Dynamic freedom that changes based on story progress
- Author-defined custom freedom rules for specific items or actions

## Story Example

```yaml
title: "The Great Sandwich Crisis v2"
# ... existing content

metadata:
  player_freedom: "medium"  # Allow reasonable sandwich customization
  setting:
    time: "A fateful Tuesday afternoon, 12:17 PM"
    # ... rest of metadata
```

This would allow players to add reasonable sandwich ingredients (pickles, lettuce, etc.) while still maintaining the dramatic soap opera tone and core success conditions around bread, cheese, and the mystery condiment.