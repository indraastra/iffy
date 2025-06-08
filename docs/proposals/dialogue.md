# Dialogue Integration in LLM-IF Stories

**Status:** ❌ Superseded by Dialogue v2 Proposal  
**Priority:** N/A  
**Note:** Original dialogue proposal replaced by v2 approach emphasizing emergent conversation beats  

## Current Problem
The current format has separate `beats` and `dialogue` sections, but it's unclear:
- When dialogues trigger during gameplay
- How they connect to the narrative flow
- Whether they're optional or required
- How dialogue outcomes affect story progression

## Proposed Solutions

### Option 1: Dialogues as Special Beats
Treat dialogues as a type of beat that handles conversation:

```yaml
beats:
  - id: "find_sarah"
    name: "Finding Sarah"
    type: "narrative"
    requirements:
      - "location:sarahs_room"
    content: |
      Sarah doesn't respond when you enter. She sits perfectly still...
    transitions:
      - action: "talk_to_sarah"
        to_beat: "sarah_revelation_dialogue"
      - action: "examine_room"
        to_beat: "examine_sarah_room"

  - id: "sarah_revelation_dialogue"
    name: "Sarah's Revelation"
    type: "dialogue"
    participants: ["sarah", "player"]
    requirements:
      - "location:sarahs_room"
      - "found_sarah"
    exchanges:
      - speaker: "sarah"
        text: "Forty-seven days. That's how long I've been listening..."
      - speaker: "player"
        choices:
          - text: "Sarah, you need help. Let us get you out of here."
            to_beat: "sarah_resists"
          - text: "Show me everything. Help me understand."
            to_beat: "server_revelation"
            sets: ["sarah_cooperates"]
```

### Option 2: Inline Dialogue Triggers
Embed dialogue references directly in narrative beats:

```yaml
beats:
  - id: "find_sarah"
    name: "Finding Sarah"
    requirements:
      - "location:sarahs_room"
    content: |
      Sarah doesn't respond when you enter. She sits perfectly still...
      
      "You're late," she whispers. "They've been waiting."
    actions:
      - trigger: "talk"
        dialogue: "sarah_revelation"
      - trigger: "examine"
        description: "Look around the room"
      - trigger: "leave"
        to_location: "dormitory"
```

### Option 3: Context-Sensitive Dialogues
Let the LLM determine when dialogues are appropriate:

```yaml
beats:
  - id: "investigation_phase"
    name: "Investigation"
    content: |
      You're investigating the facility, looking for Sarah.
    available_dialogues:
      - id: "sarah_revelation"
        conditions:
          - "found_sarah"
          - "location:sarahs_room"
      - id: "marcus_concern"
        conditions:
          - "time_elapsed:30_minutes"
          - "with:marcus"

dialogue:
  - id: "sarah_revelation"
    name: "Sarah's Revelation"
    can_trigger_when:
      - "player attempts to talk to Sarah"
      - "player asks Sarah about the signal"
      - "player shows concern for Sarah"
    # ... rest of dialogue definition
```

### Option 4: Unified Flow System (Recommended)
Merge beats and dialogues into a single flow system:

```yaml
flows:
  - id: "find_sarah"
    type: "narrative"
    requirements:
      - "location:sarahs_room"
    content: |
      Sarah doesn't respond when you enter...
    next:
      - type: "dialogue"
        trigger: "talk to Sarah"
        flow_id: "sarah_revelation"
      - type: "narrative"
        trigger: "examine room"
        flow_id: "examine_sarah_room"

  - id: "sarah_revelation"
    type: "dialogue"
    participants: ["sarah", "player"]
    exchanges:
      - speaker: "sarah"
        text: "Forty-seven days..."
      - speaker: "player"
        choices:
          - text: "Sarah, you need help."
            next: "sarah_resists"
          - text: "Show me everything."
            next: "server_revelation"
            sets: ["sarah_cooperates"]

  - id: "server_revelation"
    type: "narrative"
    requirements:
      - "sarah_cooperates"
    content: |
      Sarah leads you to the server room...
```

## Implementation Considerations

### For the LLM Engine:
1. **Natural Triggers**: Player says "talk to Sarah" → engine checks available dialogues
2. **Context Awareness**: Engine knows when dialogue is appropriate vs. narrative
3. **Smooth Transitions**: Natural flow between narrative and dialogue
4. **State Tracking**: Dialogue choices affect story state

### For Authors:
1. **Clear Connections**: Obvious how dialogues connect to story
2. **Flexible Triggering**: Multiple ways to enter conversations
3. **Optional vs. Required**: Some dialogues essential, others exploratory

## Recommended Approach for MVP

For the MVP, I recommend **Option 4 (Unified Flow System)** with simplified implementation:

```yaml
story_elements:  # Instead of separate beats/dialogue sections
  - id: "find_sarah"
    type: "scene"
    location: "sarahs_room"
    content: |
      Sarah sits at her desk, headphones on, swaying slightly.
    
  - id: "talk_to_sarah"
    type: "dialogue"
    available_after: "find_sarah"
    exchanges:
      - sarah: "Forty-seven days..."
      - player_choices:
          - "Sarah, you need help." -> "sarah_resists"
          - "Show me everything." -> "server_revelation"
    
  - id: "server_revelation"
    type: "scene"
    follows: "talk_to_sarah"
    content: |
      In the server room, the truth becomes clear...
```

This approach:
- Treats everything as "story elements" that flow together
- Makes connections explicit
- Lets the LLM handle natural transitions
- Keeps the format simple for MVP