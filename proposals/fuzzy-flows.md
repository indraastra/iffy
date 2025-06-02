# Fuzzy Flow Definitions: LLM-Driven Story Connections

## Problem Statement

Currently, authors must explicitly define every possible interaction and transition in their stories. This creates several issues:

1. **Authoring Overhead**: Writers must anticipate every possible player action and create flows for each
2. **Rigid Interactions**: Players can only do exactly what the author pre-defined
3. **Incomplete Coverage**: Authors may forget to create flows for obvious actions
4. **Natural Discovery Friction**: Finding a knife under a bed requires explicit "look under bed" flows

## Goal

Allow authors to define story elements and goals fuzzily, letting the LLM:
- Generate appropriate intermediate steps dynamically
- Handle natural language variations 
- Create connections between defined story points
- Maintain narrative coherence while allowing flexibility

## Proposed Solutions

### Option 1: Implicit Discovery Rules

Authors define discoverable items/information without explicit interaction flows:

```yaml
flows:
  - id: "investigate_bedroom"
    type: "scene"
    name: "Crime Scene Investigation"
    content: |
      You enter the bedroom where the murder took place. The scene appears 
      undisturbed, but your trained eye knows to look deeper.
    
    # Implicit discoveries - LLM determines how to find these
    discoveries:
      - id: "knife_under_bed"
        item: "bloody_knife"
        difficulty: "moderate"  # easy/moderate/hard
        hints: ["something metallic", "hidden from view", "hastily concealed"]
        triggers_when: ["look under", "search thoroughly", "examine bed area"]
        requires_tool: false
        
      - id: "bloodstain_on_sheets"
        knowledge: "victim_killed_in_bed"
        difficulty: "easy"
        hints: ["dark stain", "attempts to clean", "covers pulled up"]
        triggers_when: ["examine bed", "look at sheets", "lift covers"]
        
      - id: "fingerprints_on_window"
        knowledge: "killer_touched_window"
        difficulty: "hard"
        hints: ["condensation reveals", "barely visible", "needs light"]
        triggers_when: ["breathe on window", "shine light", "examine glass"]
        requires: ["has_item:flashlight"]

items:
  - id: "bloody_knife"
    name: "Bloodied Knife" 
    description: "The murder weapon, still stained with blood"
    # No explicit location - discovered through fuzzy rules
```

**How it works:**
- LLM interprets player commands like "search the room" or "look under the bed"
- Matches against discovery triggers and difficulty
- Generates appropriate narrative for the discovery process
- Awards items/knowledge when conditions are met

### Option 2: Goal-Oriented Flow Planning

Authors define high-level goals and let the LLM create the path:

```yaml
flows:
  - id: "bedroom_investigation"
    type: "goal_scene"
    name: "Investigate the Crime Scene"
    setting: |
      A bedroom where a murder took place. The scene has been staged to 
      look undisturbed, but evidence remains if you know where to look.
    
    # High-level goals the player can achieve
    goals:
      - id: "find_murder_weapon"
        description: "Locate the weapon used in the crime"
        reward_item: "bloody_knife"
        hint_progression:
          - "The killer would have hidden it nearby"
          - "Check places where something could be quickly concealed"
          - "Under furniture is a common hiding spot"
        success_criteria:
          - player_action_matches: ["search under", "look beneath", "check under bed"]
          - optional_requirements: ["has_item:flashlight"]
        
      - id: "discover_crime_location"
        description: "Determine where the victim was actually killed"
        reward_knowledge: "murdered_in_bed"
        hint_progression:
          - "The body position doesn't match the blood evidence"
          - "Look for signs the scene was cleaned or rearranged"
          - "Blood patterns tell the real story"
        success_criteria:
          - player_action_matches: ["examine bed", "look at sheets", "check for blood"]
          - requires_discovery: "find_murder_weapon"  # Some goals unlock others
          
      - id: "identify_killer_trace"
        description: "Find evidence that identifies the killer"
        reward_knowledge: "killer_fingerprints"
        hint_progression:
          - "The killer had to touch something to stage the scene"
          - "Windows are often overlooked when cleaning"
          - "Condensation can reveal hidden prints"
        success_criteria:
          - player_action_matches: ["examine window", "breathe on glass", "check for prints"]
    
    # Overall scene completion
    completion_when:
      - goals_achieved: ["find_murder_weapon", "discover_crime_location"]
      - transitions_to: "report_findings"
```

**How it works:**
- LLM evaluates player actions against goal criteria
- Provides progressive hints if player is stuck
- Generates dynamic narrative for different approaches to the same goal
- Unlocks new goals based on discoveries

### Option 3: Semantic Interaction Zones

Authors define areas with semantic meaning rather than specific interactions:

```yaml
flows:
  - id: "bedroom_exploration"
    type: "semantic_scene"
    name: "Crime Scene Bedroom"
    
    # Define meaningful areas with associated concepts
    zones:
      - id: "bed_area"
        concepts: ["sleep", "victim", "staging", "concealment", "blood"]
        contains:
          - item: "bloody_knife" 
            concealment: "hidden_underneath"
            discovery_difficulty: "requires_thorough_search"
          - knowledge: "bed_was_crime_scene"
            evidence_type: "blood_traces"
            discovery_difficulty: "requires_close_examination"
            
      - id: "window_area" 
        concepts: ["escape", "entry", "outside", "glass", "traces"]
        contains:
          - knowledge: "killer_fingerprints"
            evidence_type: "latent_prints"
            discovery_difficulty: "requires_special_technique"
            technique_hints: ["condensation", "light_angle", "magnification"]
            
      - id: "desk_area"
        concepts: ["work", "personal", "documents", "tools", "illumination"]
        contains:
          - item: "desk_lamp"
            utility: "provides_better_lighting"
            affects: ["window_area", "bed_area"]  # Improves discovery in other zones
    
    # Global scene modifiers
    modifiers:
      - has_item: "flashlight"
        effect: "reduces_discovery_difficulty"
        applies_to: ["all_zones"]
      - knowledge: "crime_scene_training" 
        effect: "provides_investigative_hints"
        applies_to: ["all_zones"]
    
    # LLM interprets player actions semantically
    interpretation_guidelines: |
      - Map player actions to relevant zones based on intent
      - Consider investigation experience and available tools
      - Provide realistic discovery narratives
      - Connect discoveries to the crime's timeline
```

**How it works:**
- LLM maps player commands to semantic zones
- Generates contextually appropriate discovery narratives
- Applies difficulty modifiers based on tools/knowledge
- Creates emergent connections between zones

### Option 4: Declarative Story State (Recommended)

Authors declare what exists without specifying how it's found:

```yaml
flows:
  - id: "bedroom_investigation"
    type: "open_scene"
    name: "The Crime Scene"
    description: |
      The bedroom where the murder took place. Your job is to uncover 
      what really happened here.
    
    # Declare what exists to be discovered
    story_elements:
      # Physical evidence
      evidence:
        - id: "murder_weapon"
          type: "item"
          object: "bloody_knife"
          location_hints: ["concealed", "hastily_hidden", "accessible"]
          discovery_clues: 
            - "metallic glint"
            - "something doesn't belong"
            - "check obvious hiding spots"
          natural_actions: ["search room", "look under furniture", "examine bed area"]
          
        - id: "blood_evidence"  
          type: "knowledge"
          fact: "victim_killed_in_bed"
          location_hints: ["where victim found", "bed area", "covered up"]
          discovery_clues:
            - "scene has been cleaned"
            - "position doesn't match blood pattern" 
            - "covers hide something"
          natural_actions: ["examine bed", "look at sheets", "investigate bloodstains"]
          
        - id: "fingerprint_evidence"
          type: "knowledge" 
          fact: "killer_left_prints"
          location_hints: ["surfaces killer touched", "overlooked by cleaning"]
          discovery_clues:
            - "killer had to touch something"
            - "cleaning missed some areas"
            - "glass surfaces hold prints well"
          natural_actions: ["check for prints", "examine glass", "breathe on window"]
          requires: ["investigative_training"]
    
    # Story progression rules
    progression:
      # Complete when enough evidence is found
      completion_threshold: 
        evidence_found: 2  # Any 2 of the 3 pieces of evidence
        
      # Hints get more specific if player is stuck  
      hint_escalation:
        after_turns: 3
        progression: ["subtle", "direct", "explicit"]
        
      # Some evidence makes others easier to find
      synergies:
        - if_found: "murder_weapon"
          then_easier: "blood_evidence"
          reason: "weapon location suggests victim position"
          
    # Let LLM handle the how, author controls the what
    llm_guidelines: |
      - Generate natural discovery sequences for any reasonable player action
      - Match discovery narrative to investigation methods used
      - Provide appropriate difficulty based on player's approach
      - Connect evidence discoveries to build coherent crime scene picture
      - Escalate hints if player seems stuck, but let them drive discovery
```

**How it works:**
- Authors declare story elements without rigid interaction paths
- LLM interprets any reasonable player action against available discoveries
- Natural language understanding determines if action should yield evidence
- Progressive hint system prevents players from getting completely stuck
- Evidence synergies create emergent storytelling

## Implementation Considerations

### For the LLM Engine:
1. **Semantic Matching**: Map player natural language to story element triggers
2. **Context Awareness**: Consider player tools, knowledge, and previous actions
3. **Narrative Generation**: Create appropriate discovery sequences dynamically
4. **Difficulty Scaling**: Adjust based on player approach and story needs
5. **Hint Management**: Provide escalating guidance without breaking immersion

### For Authors:
1. **Flexible Definition**: Focus on what exists, not how it's found
2. **Rich Context**: Provide enough hints/clues for LLM to generate good narratives
3. **Clear Goals**: Define completion criteria and story progression
4. **Discovery Logic**: Specify what makes sense vs. what doesn't

### For Players:
1. **Natural Exploration**: Use intuitive commands like "search the room"
2. **Multiple Solutions**: Different approaches can lead to same discoveries
3. **Realistic Interactions**: Actions must make sense in context
4. **Progressive Discovery**: Hints help when stuck, but don't force solutions

## Recommended Approach for MVP

For Phase 2 implementation, I recommend **Option 4 (Declarative Story State)** because:

1. **Author-Friendly**: Focuses on story intent rather than technical implementation
2. **Player-Friendly**: Supports natural language exploration
3. **LLM-Friendly**: Clear guidelines with room for creative interpretation
4. **Backward Compatible**: Can coexist with explicit flows for complex interactions
5. **Scalable**: Works for simple discoveries and complex investigation sequences

## Migration Strategy

1. **Phase 2.1**: Implement basic fuzzy discovery for items and simple knowledge
2. **Phase 2.2**: Add progressive hint system and difficulty scaling  
3. **Phase 2.3**: Implement evidence synergies and complex discovery chains
4. **Phase 3**: Full semantic scene understanding with goal-oriented planning

This approach maintains the structure authors expect while dramatically reducing the authoring burden for natural interactions.