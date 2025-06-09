# Narrative Engine v3: Unified Story Format and LLM-First Architecture

**Status:** 🔄 Proposal  
**Priority:** High  
**Scope:** Complete redesign of story format and engine architecture for LLM-first storytelling  
**Supersedes:** format-v2.md, dialogue-v2.md, dialogue-v3.md

## Executive Summary

This proposal introduces a radical simplification of the Iffy Engine, moving from a complex state machine to an LLM-first architecture with minimal, expressive story format. The new format reduces authoring complexity by 90% while increasing narrative possibilities through structured guidance rather than rigid specifications.

**Key Changes:**
- **6 core concepts** instead of 20+ specialized systems
- **Natural language goals** replace complex state machines
- **Structured flag mechanics** for clear progression tracking
- **Universal hints field** for contextual LLM guidance
- **Impromptu endings** for emergent narrative conclusions
- **No basic commands** - pure LLM-driven interaction

## Core Philosophy

### From State Machine to Story Guide

**Old Approach**: Authors define complex state machines with flows, transitions, commands, and validations. The engine executes rigid logic while the LLM fills gaps.

**New Approach**: Authors define story moments with goals and hints. The LLM drives all interaction, with the engine providing structure and tracking.

### Design Principles

1. **LLM-First**: Every interaction goes through the LLM - no basic commands
2. **Goal-Oriented**: Define what should happen, not how
3. **Emergent-Friendly**: Support unexpected story developments
4. **Context-Efficient**: Structured data enables smart context assembly
5. **Author-Friendly**: Natural language throughout, minimal technical concepts

## The New Format

### Core Sections (6 Total)

```yaml
# 1. Story Context - Always included in LLM context
story_context: |
  One-paragraph summary of setting, situation, and core characters.

# 2. Characters - Structured personality and relationships  
characters:
  character_id:
    name: "Character Name"
    traits: ["list", "of", "traits"]
    arc: "character development trajectory"
    relationships:
      other_character: "how they relate to other characters"

# 3. Moments - Story progression (first = start)
moments:
  moment_id:
    text: "What the player experiences"
    goals: ["Natural language goals to work toward"]
    transitions:
      - to: "next_moment"
        when: "natural language condition"
        sets_flags: ["flags_to_set"]
    hints: "Optional moment-specific guidance"

# 4. World - Locations and items
world:
  locations:
    location_id:
      description: "Location description"
      contains: ["item_ids"]
      atmosphere: "mood and feeling"
  
  items:
    item_id:
      description: "Item description"
      found_in: "location_id"
      sets_flag: "flag_when_discovered"

# 5. Endings - Conditional story conclusions
endings:
  requires: ["common_flags_for_all_endings"]
  
  variations:
    ending_id:
      requires: ["specific_flags"] # Supports OR: [["A", "B"], ["C"]]
      text: "Ending text"
  
  # NEW: Impromptu ending support
  impromptu:
    enabled: true
    signal: "IMPROMPTU_ENDING"
    requirements:
      - "Story has reached a natural conclusion"
      - "No authored ending matches current state"

# 6. Metadata & Hints
metadata:
  tone: "Overall story tone"
  themes: ["story", "themes"]

hints: |
  General LLM guidance for story behavior
```

## Key Innovations

### 1. Natural Language Goals
```yaml
moments:
  investigation:
    goals:
      - "Player discovers the murder weapon"
      - "Player realizes the butler is suspicious"
      - "Build tension through environmental details"
```

### 2. Impromptu Endings
For emergent narratives where the LLM might naturally conclude the story in unexpected ways:

```yaml
endings:
  impromptu:
    enabled: true
    signal: "IMPROMPTU_ENDING"
    requirements:
      - "Story has reached a natural conclusion"
      - "Character relationship has fundamentally changed"
      - "No authored ending applies to current situation"

hints: |
  IMPROMPTU ENDINGS: If the story reaches a natural conclusion that isn't covered 
  by the authored endings, signal IMPROMPTU_ENDING and provide a 2-3 sentence 
  conclusion. Examples:
  - Alex storms off after player says something hurtful
  - Conversation ends early due to external interruption
  - Character breakthrough happens sooner than expected
```

**Example**: In coffee_confessional.yaml, if the player is insensitive and Alex storms off, the LLM can signal:

```
Alex's face crumples. "I can't believe you just said that." They grab their coat 
and rush out, leaving you alone with two cold cups of coffee.

IMPROMPTU_ENDING
```

### 3. Simplified Flag Mechanics
```yaml
# Items set flags when discovered
items:
  bloody_knife:
    sets_flag: "found_murder_weapon"

# Transitions set flags when triggered  
transitions:
  - to: "confrontation"
    when: "player accuses the butler"
    sets_flags: ["accusation_made", "butler_confronted"]

# Completion flags for complex conditions
completion_flags:
  - when: "player presents complete theory"
    sets_flag: "case_solved"
```

### 4. Flexible Requirements (OR Logic)
```yaml
endings:
  variations:
    good:
      requires: [
        ["perfect_solution", "all_evidence"],  # Best path
        ["partial_solution", "key_evidence"]   # Alternate path
      ]
```

### 5. Character Relationships
```yaml
characters:
  alex:
    relationships:
      player: "Best friend harboring romantic feelings - torn between confession and fear"
```

## Implementation Plan

### Phase 1: Core Engine (2 weeks)
- New engine architecture alongside existing engine
- Feature flag system for gradual rollout
- Basic moment/goal/flag processing
- Impromptu ending detection

### Phase 2: Advanced Features (2 weeks)
- Smart context assembly
- OR logic for requirements
- Character relationship processing
- Performance optimization

### Phase 3: Migration (1 week)
- Story conversion tools
- Testing and validation
- Documentation and examples

### Phase 4: Rollout (1 week)
- Beta testing with v3 stories
- Full migration with fallback
- Legacy system removal

## Impromptu Ending Implementation

### LLM Signal Detection
```typescript
class ImpromptuEndingDetector {
  checkForImpromptuEnding(response: string): ImpromptuEnding | null {
    if (!this.story.endings.impromptu?.enabled) return null;
    
    const signal = this.story.endings.impromptu.signal;
    if (response.includes(signal)) {
      return {
        content: response.replace(signal, '').trim(),
        triggered: true
      };
    }
    
    return null;
  }
}
```

### Engine Integration
```typescript
async processInput(input: string): Promise<Response> {
  const response = await this.llm.process(input, this.assembleContext());
  
  // Check for impromptu ending first
  const impromptuEnding = this.impromptuDetector.check(response);
  if (impromptuEnding) {
    return this.handleImpromptuEnding(impromptuEnding);
  }
  
  // Normal processing continues...
  this.updateState(response);
  return response;
}
```

## Migration Examples

### Coffee Confessional v3
```yaml
title: "Coffee Confessional v3"

story_context: |
  Friday evening café. You're meeting Alex who's been distant lately. 
  Alex harbors romantic feelings for you but fears ruining the friendship.

characters:
  alex:
    name: "Alex"
    traits: ["conflicted", "guarded", "secretly vulnerable"]
    arc: "defensive → conflicted → vulnerable → open"
    relationships:
      player: "Best friend they've fallen for - torn between confession and preserving friendship"

moments:
  quiet_moment:
    text: |
      You're sitting across from Alex in a quiet corner café. The barista approaches...
    goals:
      - "Establish intimate café atmosphere"
      - "Show Alex's distracted, troubled state"
      - "Begin building trust through patient responses"
    transitions:
      - to: "opening_up"
        when: "player shows patience and empathy"
        sets_flags: ["conversation_started"]

endings:
  impromptu:
    enabled: true
    signal: "IMPROMPTU_ENDING"
    
  variations:
    full_confession:
      requires: ["alex_vulnerable", "admitted_feelings", "secret_revealed"]
    
    walls_stay_up:
      requires: ["alex_defensive", "distance_maintained"]

hints: |
  IMPROMPTU ENDINGS: If Alex storms off due to player insensitivity, or conversation 
  ends due to external factors, signal IMPROMPTU_ENDING with 2-3 sentence conclusion.
  
  CHARACTER GROWTH: Alex opens up with patience/empathy, shuts down with pressure.
```

**Size Reduction**: 150 lines → 40 lines (73% reduction)

## Benefits

### For Authors
- **90% fewer lines** to write the same story
- **5 concepts** to learn instead of 20+
- **Natural language** throughout
- **LLM-friendly** authoring

### For Players
- **No jarring basic commands** - everything conversational
- **More natural interactions** through pure LLM processing
- **Emergent story endings** for unexpected developments
- **Consistent narrative voice**

### For Engine
- **80% simpler codebase** - remove complex state machines
- **Better performance** - streamlined processing
- **Easier maintenance** - fewer moving parts
- **Context efficiency** - structured data assembly

## Risk Mitigation

- **Feature flags** enable safe parallel development
- **Conversion tools** migrate existing stories automatically
- **Fallback system** maintains current functionality during transition
- **Comprehensive testing** with existing story library

## Conclusion

Narrative Engine v3 represents a fundamental shift from complex state machines to LLM-guided storytelling. By trusting the LLM's capabilities and providing minimal structure, we create a system that's both easier to author and more powerful in practice.

The addition of impromptu endings acknowledges that emergent narratives often conclude in ways authors can't foresee - the system gracefully handles these while maintaining the authored story structure for expected paths.

This is the future of interactive narrative: structured enough to guide, flexible enough to surprise, simple enough for anyone to create.