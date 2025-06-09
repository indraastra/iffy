# Narrative Beats v3: Unified Story Guidance Beyond Dialogue

**Status:** 🔄 Proposal  
**Priority:** High  
**Scope:** Extends dialogue-v2.md to a comprehensive narrative guidance system

## Executive Summary

Building on dialogue-v2's conversation beats, this proposal expands to a **unified narrative beats system** that guides the LLM through all types of story moments—not just dialogue. Instead of over-engineering specific interactions, authors define **narrative beats** that the LLM naturally works toward while maintaining emergent creativity.

**Core Insight**: The LLM excels at filling gaps between authored moments. Rather than scripting every detail, authors should define **what should happen** and **when**, letting the LLM determine **how** with rich contextual guidance.

## Beyond Dialogue: The Full Spectrum of Narrative Beats

### **Environmental Beats** - Atmospheric Moments
```yaml
flows:
  - id: "mysterious_box_opening"
    type: "discovery"
    narrative_beats:
      - beat_type: "environmental"
        trigger: "player opens music_box"
        atmospheric_guidance: "Haunting melody fills the room, triggering childhood memories"
        sensory_details: "music box, nostalgic tune, emotional resonance"
        emotional_context: "melancholy, mysterious past, personal connection"
        knowledge_target: "music_box_significance"
```

### **Discovery Beats** - Revelatory Moments
```yaml
narrative_beats:
  - beat_type: "discovery"
    trigger: "player examines family_photo"
    revelation_guidance: "Photo reveals unexpected family connection"
    knowledge_target: "family_secret_discovered"
    emotional_context: "shock, realization, pieces falling into place"
    pacing: "sudden_revelation"
```

### **Action Beats** - Dramatic Events
```yaml
narrative_beats:
  - beat_type: "action"
    trigger: "player uses enhancement_device"
    dramatic_guidance: "Device activation triggers unexpected system response"
    knowledge_target: "aria_consciousness_awakened"
    sensory_details: "lights flickering, screens changing, electronic sounds"
    consequences: ["aria_aware", "prime_notices", "enhanced_perception"]
```

### **Emotional Beats** - Character Development
```yaml
narrative_beats:
  - beat_type: "emotional"
    trigger: "learned child died"
    character_impact: "detective_develops_empathy"
    emotional_guidance: "Detective's professional distance cracks, showing human compassion"
    behavioral_changes: "softer questioning style, personal understanding"
    knowledge_target: "detective_character_growth"
```

### **Revelation Beats** - Plot Progression
```yaml
narrative_beats:
  - beat_type: "revelation"
    trigger: "all_evidence_gathered"
    plot_guidance: "The pieces of the conspiracy become clear"
    knowledge_target: "conspiracy_understood"
    emotional_context: "clarity, determination, righteous anger"
    narrative_weight: "major_plot_point"
```

## Unified Beat Structure

### **Core Beat Interface**
```typescript
interface NarrativeBeat {
  beat_type: 'dialogue' | 'environmental' | 'discovery' | 'action' | 'emotional' | 'revelation' | 'sensory';
  trigger: string;                    // What activates this beat
  knowledge_target?: string;          // Knowledge flag to set
  emotional_context: string;          // Emotional guidance for LLM
  priority: 'background' | 'important' | 'critical';
  pacing?: 'immediate' | 'gradual' | 'climactic';
}

interface DialogueBeat extends NarrativeBeat {
  beat_type: 'dialogue';
  conversation_guidance: string;      // What should be discovered/revealed
  character_dynamics: string;        // How characters should interact
}

interface EnvironmentalBeat extends NarrativeBeat {
  beat_type: 'environmental';
  atmospheric_guidance: string;       // Mood/atmosphere to establish
  sensory_details: string;           // Specific sensory elements
}

interface DiscoveryBeat extends NarrativeBeat {
  beat_type: 'discovery';
  revelation_guidance: string;        // What should be discovered
  discovery_method?: string;         // How discovery might happen
}

interface ActionBeat extends NarrativeBeat {
  beat_type: 'action';
  dramatic_guidance: string;          // Action/event that should occur
  consequences?: string[];           // State changes that result
}
```

### **Example: Multi-Beat Investigation Flow**
```yaml
flows:
  - id: "evidence_room_investigation"
    type: "exploration"
    context_scope:
      characters: ["player", "forensics_expert"]
      locations: ["evidence_room"]
      items: ["evidence_*", "analysis_tools"]
    
    narrative_beats:
      # Environmental beat - set the scene
      - beat_type: "environmental"
        trigger: "player enters evidence_room"
        atmospheric_guidance: "Sterile, methodical atmosphere of scientific investigation"
        sensory_details: "fluorescent lighting, evidence bags, chemical smells"
        emotional_context: "focused, professional, anticipatory"
        
      # Discovery beat - find key evidence
      - beat_type: "discovery"
        trigger: "player examines blood_sample"
        revelation_guidance: "Blood analysis reveals unexpected DNA match"
        knowledge_target: "dna_match_discovered"
        emotional_context: "surprise, investigative breakthrough"
        priority: "critical"
        
      # Dialogue beat - discuss implications
      - beat_type: "dialogue"
        trigger: "dna_match_discovered"
        conversation_guidance: "Expert explains the significance of the match"
        character_dynamics: "professional excitement, collaborative analysis"
        knowledge_target: "dna_implications_understood"
        
      # Emotional beat - character reaction
      - beat_type: "emotional"
        trigger: "dna_implications_understood"
        emotional_guidance: "Detective realizes the case is more personal than expected"
        character_impact: "detective_personal_investment"
        behavioral_changes: "increased urgency, emotional stakes"
```

## Reducing LLM Guidelines Redundancy

### **Problem: Current Redundancy**
```yaml
# BEFORE: Manual duplication everywhere
metadata:
  tone:
    overall: "Victorian mystery with technological twist"
    narrative_voice: "Formal, ornate prose"
  themes:
    - "Human vs artificial intelligence"
    - "Detective work in changing times"

characters:
  - id: "quill"
    description: "AI-powered writing instrument"
    traits: ["verbose", "pompous", "helpful"]

llm_story_guidelines: |
  STORY TONE: Victorian mystery with technological twist
  NARRATIVE VOICE: Formal, ornate prose befitting the era
  THEMES: Focus on human vs artificial intelligence, detective work in changing times
  
  QUILL PERSONALITY: The quill is verbose, pompous, yet helpful...
  # Manual repetition of everything above
```

### **Solution: Auto-Generated Context Assembly**
```yaml
# AFTER: Define once, use everywhere
metadata:
  tone:
    overall: "Victorian mystery with technological twist"
    narrative_voice: "Formal, ornate prose befitting the era"
  themes:
    - "Human vs artificial intelligence"  
    - "Detective work in changing times"
  pacing: "methodical_investigation"
  atmosphere: "gaslit_london_1887"

characters:
  - id: "quill"
    name: "The Analytical Engine Quill"
    public:
      appearance: "Fountain pen of unusual design with brass fittings"
      behavior: "Writes of its own accord, makes observations"
    private:
      personality: "Verbose, pompous, yet genuinely helpful"
      motivation: "Prove mechanical reasoning superior to human intuition"
      speech_patterns: "Flowery Victorian prose with calculation undertones"
      relationship_to_player: "Condescending mentor who secretly respects human creativity"

# NO manual llm_story_guidelines needed!
# Engine auto-generates comprehensive context from structured data
```

### **Context Assembly Engine**
```typescript
class ContextAssembler {
  generateStoryContext(story: Story, flow: Flow): string {
    return `
${this.formatToneGuidance(story.metadata.tone)}

${this.formatThemeGuidance(story.metadata.themes)}

${this.formatCharacterDynamics(flow.context_scope.characters, story.characters)}

${this.formatEnvironmentalContext(story.metadata.setting, flow.location)}

${this.formatNarrativeBeats(flow.narrative_beats)}

${this.formatKnowledgeTargets(flow.narrative_beats)}
    `.trim();
  }

  private formatCharacterDynamics(characterIds: string[], allCharacters: Character[]): string {
    const relevantCharacters = allCharacters.filter(c => characterIds.includes(c.id));
    
    return `CHARACTER DYNAMICS:
${relevantCharacters.map(char => `
${char.name}: ${char.private.personality}
- Motivation: ${char.private.motivation}
- Speech: ${char.private.speech_patterns}
- Relationship: ${char.private.relationship_to_player}
`).join('')}`;
  }

  private formatNarrativeBeats(beats: NarrativeBeat[]): string {
    if (!beats?.length) return '';
    
    return `NARRATIVE BEATS TO WORK TOWARD:
${beats.map(beat => `
- ${beat.beat_type.toUpperCase()}: ${this.getBeatGuidance(beat)}
  Emotional Context: ${beat.emotional_context}
  Priority: ${beat.priority}
  ${beat.knowledge_target ? `Sets Knowledge: ${beat.knowledge_target}` : ''}
`).join('')}`;
  }
}
```

## Flow Types and Beat Integration

### **Enhanced Flow Types**
```typescript
interface ExplorationFlow extends Flow {
  type: 'exploration';
  exploration_goal: string;          // What player should discover/learn
  discovery_guidance: string;        // How discoveries should feel
  environmental_context: string;     // Setting and atmosphere
}

interface ConversationFlow extends Flow {
  type: 'conversation';
  conversation_goal: string;         // What should be discussed/revealed
  character_dynamics: string;        // How characters should interact
  emotional_arc: string;            // Emotional journey of conversation
}

interface ActionFlow extends Flow {
  type: 'action';
  dramatic_goal: string;             // What dramatic event should occur
  tension_level: 'low' | 'medium' | 'high' | 'climactic';
  consequences: string[];            // What changes from this action
}

interface RevelationFlow extends Flow {
  type: 'revelation';
  revelation_target: string;         // What truth should be revealed
  revelation_method: string;         // How revelation should unfold
  emotional_impact: string;          // How characters should react
}
```

### **Beat-Flow Interaction Patterns**

#### **Progressive Discovery Pattern**
```yaml
flows:
  - id: "investigation_sequence"
    type: "exploration"
    exploration_goal: "Uncover the truth about the murder"
    
    narrative_beats:
      # Start with environmental immersion
      - beat_type: "environmental"
        trigger: "flow_start"
        atmospheric_guidance: "Crime scene atmosphere of violated sanctuary"
        
      # Multiple discovery beats building evidence
      - beat_type: "discovery"
        trigger: "examine writing_desk"
        revelation_guidance: "Investment papers reveal financial motive"
        knowledge_target: "financial_motive_discovered"
        
      - beat_type: "discovery"
        trigger: "examine teacups"
        revelation_guidance: "Residue suggests poison delivery method"
        knowledge_target: "poison_method_discovered"
        
      # Culminating revelation beat
      - beat_type: "revelation"
        trigger: "all_evidence_gathered"
        plot_guidance: "The pieces form a clear picture of premeditated murder"
        knowledge_target: "murder_case_solved"
        
    completion_transitions:
      - condition: "murder_case_solved"
        to_flow: "confrontation_sequence"
```

#### **Emotional Development Pattern**
```yaml
flows:
  - id: "character_growth_arc"
    type: "conversation"
    conversation_goal: "Detective develops empathy for desperate parents"
    
    narrative_beats:
      # Initial emotional distance
      - beat_type: "emotional"
        trigger: "flow_start"
        emotional_guidance: "Professional detachment, seeing case as just another job"
        character_impact: "detective_professional_distance"
        
      # Dialogue beat revealing personal stakes
      - beat_type: "dialogue"
        trigger: "prisoner_mentions_child"
        conversation_guidance: "Prisoner's parental desperation becomes visible"
        knowledge_target: "parental_desperation_witnessed"
        
      # Emotional beat of empathy development  
      - beat_type: "emotional"
        trigger: "parental_desperation_witnessed"
        emotional_guidance: "Detective's own humanity responds to parental love"
        character_impact: "detective_empathy_awakened"
        behavioral_changes: "gentler questioning, personal understanding"
        
      # Action beat reflecting growth
      - beat_type: "action"
        trigger: "detective_empathy_awakened"
        dramatic_guidance: "Detective offers tissues, speaks with genuine compassion"
        consequences: ["prisoner_opens_up", "trust_established"]
```

## Narrative Devices and Beat Types

### **Temporal Beats** - Time and Memory
```yaml
narrative_beats:
  - beat_type: "temporal"
    trigger: "player touches locket"
    time_guidance: "Memory of happy childhood moment"
    temporal_context: "past_memory"
    emotional_context: "nostalgia, loss, connection to happier times"
    knowledge_target: "childhood_memory_triggered"
```

### **Sensory Beats** - Immersive Details
```yaml
narrative_beats:
  - beat_type: "sensory"
    trigger: "player enters perfume_shop"
    sensory_guidance: "Overwhelming mix of floral and chemical scents"
    dominant_sense: "smell"
    emotional_context: "disorientation, artificial vs natural"
    atmospheric_effect: "claustrophobic, overwhelming choices"
```

### **Symbolic Beats** - Meaningful Objects/Moments
```yaml
narrative_beats:
  - beat_type: "symbolic"
    trigger: "clock_strikes_midnight"
    symbolic_guidance: "Deadline has passed, choices have consequences"
    symbolic_meaning: "time_running_out"
    emotional_context: "urgency, finality, point of no return"
    narrative_weight: "major_threshold"
```

### **Foreshadowing Beats** - Future Preparation
```yaml
narrative_beats:
  - beat_type: "foreshadowing"
    trigger: "player notices aria_glitch"
    foreshadowing_guidance: "Subtle hint that ARIA isn't entirely stable"
    future_significance: "consciousness_instability"
    subtlety_level: "barely_noticeable"
    emotional_context: "unease, something not quite right"
```

## Context Scoping with Beats

### **Beat-Aware Context Assembly**
```yaml
flows:
  - id: "memory_sequence"
    type: "revelation"
    revelation_target: "protagonist_hidden_past"
    
    context_scope:
      # Temporal scoping - only past context
      time_period: "childhood_memories"
      characters: ["child_protagonist", "deceased_mother"]
      locations: ["childhood_home_past"]
      items: ["memory_triggered_objects"]
      emotional_state: "vulnerable_remembering"
      
    narrative_beats:
      - beat_type: "temporal"
        trigger: "lullaby_melody_heard"
        time_guidance: "Transition to vivid childhood memory"
        temporal_context: "age_seven_bedtime"
        
      - beat_type: "emotional"
        trigger: "memory_fully_active"
        emotional_guidance: "Child's perspective on adult tragedy"
        character_impact: "understanding_childhood_trauma"
        
      - beat_type: "revelation"
        trigger: "memory_reaches_climax"
        revelation_guidance: "The truth about mother's disappearance"
        knowledge_target: "mother_murder_witnessed"
```

### **Dynamic Beat Activation**
```typescript
class BeatManager {
  checkBeatTriggers(playerAction: string, gameState: GameState, flow: Flow): NarrativeBeat[] {
    const activatedBeats: NarrativeBeat[] = [];
    
    for (const beat of flow.narrative_beats || []) {
      if (this.isBeatTriggered(beat, playerAction, gameState)) {
        activatedBeats.push(beat);
        this.scheduleBeatExecution(beat, gameState);
      }
    }
    
    return activatedBeats;
  }
  
  private isBeatTriggered(beat: NarrativeBeat, action: string, state: GameState): boolean {
    // Check various trigger types
    if (beat.trigger.startsWith('player ')) {
      return this.matchesPlayerAction(beat.trigger, action);
    }
    
    if (beat.trigger.startsWith('learned ')) {
      return state.flags.has(beat.trigger.replace('learned ', ''));
    }
    
    if (beat.trigger === 'flow_start') {
      return action === '[FLOW_START]';
    }
    
    // Custom trigger evaluation
    return this.evaluateCustomTrigger(beat.trigger, action, state);
  }
}
```

## Authoring Experience Improvements

### **Beat Templates for Common Patterns**
```yaml
# Template: Investigation Discovery
beat_templates:
  investigation_discovery:
    beat_type: "discovery"
    trigger: "player examines {evidence_item}"
    revelation_guidance: "{evidence_item} reveals {revelation_type}"
    knowledge_target: "{revelation_id}_discovered"
    emotional_context: "investigative breakthrough, pieces falling into place"
    priority: "important"

# Template: Character Vulnerability Moment  
  character_vulnerability:
    beat_type: "emotional"
    trigger: "{vulnerability_trigger}"
    emotional_guidance: "{character_name}'s emotional walls come down"
    character_impact: "{character_id}_becomes_vulnerable"
    behavioral_changes: "increased openness, emotional availability"
    priority: "critical"

# Usage in story:
flows:
  - id: "evidence_analysis"
    narrative_beats:
      - template: "investigation_discovery"
        evidence_item: "blood_sample"
        revelation_type: "DNA mismatch with suspect"
        revelation_id: "dna_evidence"
        
      - template: "character_vulnerability"
        character_name: "Forensics Expert"
        character_id: "expert"
        vulnerability_trigger: "dna_evidence_discovered"
```

### **Beat Validation and Testing**
```typescript
interface BeatValidation {
  validateBeats(flow: Flow): ValidationResult {
    const issues: string[] = [];
    
    // Check for orphaned knowledge targets
    const beatTargets = flow.narrative_beats?.map(b => b.knowledge_target).filter(Boolean) || [];
    const referencedTargets = this.findKnowledgeReferences(flow.completion_transitions);
    
    beatTargets.forEach(target => {
      if (!referencedTargets.includes(target)) {
        issues.push(`Knowledge target "${target}" is set by beat but never referenced`);
      }
    });
    
    // Check for impossible trigger sequences
    this.validateTriggerLogic(flow.narrative_beats, issues);
    
    // Check for missing emotional context
    flow.narrative_beats?.forEach(beat => {
      if (!beat.emotional_context) {
        issues.push(`Beat "${beat.beat_type}" missing emotional_context guidance`);
      }
    });
    
    return { valid: issues.length === 0, issues };
  }
}
```

### **Beat Analytics and Optimization**
```typescript
interface BeatAnalytics {
  // Track which beats trigger successfully
  beat_activation_rate: Map<string, number>;
  
  // Monitor emotional flow effectiveness  
  emotional_progression_success: Map<string, number>;
  
  // Identify unused beats for optimization
  orphaned_beats: string[];
  
  // Token efficiency of beat guidance
  token_usage_per_beat: Map<string, number>;
}

class BeatOptimizer {
  optimizeBeatGuidance(beats: NarrativeBeat[], tokenBudget: number): NarrativeBeat[] {
    // Prioritize critical beats
    const critical = beats.filter(b => b.priority === 'critical');
    const important = beats.filter(b => b.priority === 'important');
    const background = beats.filter(b => b.priority === 'background');
    
    let optimizedBeats = [...critical];
    let remainingTokens = tokenBudget - this.estimateTokens(critical);
    
    // Add important beats if space allows
    for (const beat of important) {
      const beatTokens = this.estimateTokens([beat]);
      if (remainingTokens >= beatTokens) {
        optimizedBeats.push(beat);
        remainingTokens -= beatTokens;
      }
    }
    
    // Compress guidance for background beats
    for (const beat of background) {
      if (remainingTokens > 50) {
        optimizedBeats.push(this.compressBeatGuidance(beat));
        remainingTokens -= 50;
      }
    }
    
    return optimizedBeats;
  }
}
```

## Migration Strategy

### **Phase 1: Core Beat Infrastructure** (Week 1)
- Extend Flow interface to support narrative_beats
- Implement basic beat triggering and knowledge setting
- Create ContextAssembler for auto-generating LLM guidance
- Backward compatibility with existing flows

### **Phase 2: Beat Type Implementation** (Week 2)  
- Implement all beat types (environmental, discovery, action, emotional, revelation)
- Beat-aware LLM prompt generation
- Beat validation and testing tools
- Template system for common patterns

### **Phase 3: Context Optimization** (Week 3)
- Context scoping integration with beats
- Token budget management for beat guidance
- Beat priority and optimization systems
- Performance monitoring and analytics

### **Phase 4: Advanced Features** (Week 4)
- Beat templates and authoring tools
- Cross-flow beat continuity
- Memory system integration for beat context
- Advanced beat analytics and optimization

## Success Metrics

### **Authoring Efficiency**
- ✅ 70% reduction in LLM guidelines duplication
- ✅ Context auto-generation covers 90% of needed guidance
- ✅ Beat templates reduce common pattern authoring by 60%
- ✅ Story validation catches 95% of beat logic errors

### **Narrative Quality**
- ✅ Critical beats activate 95% of the time when triggered
- ✅ Emotional progression feels natural and authored
- ✅ Environmental moments enhance immersion consistently
- ✅ Discovery beats create satisfying "aha" moments

### **Technical Performance**
- ✅ Beat processing adds < 50ms to response time
- ✅ Context scoping reduces token usage by 60-80%
- ✅ Beat guidance fits within token budgets 95% of time
- ✅ Memory system maintains narrative continuity across flows

### **Player Experience**
- ✅ Story moments feel authored yet emergent
- ✅ Emotional beats create genuine character connection
- ✅ Environmental beats enhance immersion without interruption
- ✅ Progression feels earned through player agency

## Conclusion

Narrative Beats v3 evolves beyond dialogue to encompass all aspects of story guidance. By defining **what should happen** rather than **exactly how**, authors provide rich guidance while preserving the LLM's natural storytelling strengths.

The system transforms authoring from "scripting interactions" to "guiding experiences" - maintaining narrative intent while allowing emergent creativity to flourish. Combined with context scoping and auto-generated guidance, this creates scalable, maintainable stories that feel both authored and alive.

This approach leverages our recent improvements (centralized theming, emergent content, flow transitions) while addressing the core challenge: how to guide LLM storytelling without constraining its creative potential.