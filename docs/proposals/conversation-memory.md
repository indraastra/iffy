# Conversation Memory and Context Preservation

## Problem Statement

The current engine treats each player interaction independently, only providing the LLM with static game state (location, inventory, flags, knowledge). This creates several critical issues:

### Missing Context Examples:
- **Relationship Building**: Player has deep conversation with ARIA about consciousness, but next interaction treats them as strangers
- **Discovery Narrative**: Player finds keys "behind the photo of Eleanor" but later searching "photo" doesn't reference this established narrative
- **Emotional State**: Player expresses grief about lost son, but subsequent interactions ignore this emotional context
- **World Building**: Player learns about lighthouse's history through exploration, but this context disappears

### Current Limitations:
1. **No Conversation History**: Each LLM call is a fresh start
2. **Lost Emotional Context**: Relationship dynamics reset between interactions
3. **Forgotten Discoveries**: How items were found/stories were told disappear
4. **Inconsistent Characterization**: NPCs can't reference previous conversations
5. **Broken Immersion**: Players notice the "amnesia" effect

## Proposed Solution: Hierarchical Memory System

### Architecture Overview

```
Memory System
├── Immediate Context (always included)
│   ├── Last 3-5 interactions (full detail)
│   └── Current scene context
├── Significant Memories (conditionally included)
│   ├── Character relationships/emotions
│   ├── Major discoveries & how they happened
│   └── Important conversations/revelations
└── Background Context (summarized)
    ├── Story progress summary
    └── World state changes
```

### 1. Immediate Context (High Priority)

**Always included in LLM prompt**
- Last 3-5 player commands and responses
- Current scene/conversation thread
- Recent emotional context

```typescript
interface ImmediateContext {
  recentInteractions: InteractionPair[];
  currentScene?: string;
  emotionalContext?: string;
  activeConversation?: string;
}

interface InteractionPair {
  playerInput: string;
  llmResponse: string;
  timestamp: Date;
  importance: 'low' | 'medium' | 'high';
}
```

### 2. Significant Memories (Selective Inclusion)

**Included based on relevance to current situation**
- Character relationships and emotional bonds
- Major story revelations and discoveries
- How important items were found
- Promises made, goals established

```typescript
interface SignificantMemory {
  id: string;
  type: 'character_bond' | 'discovery' | 'revelation' | 'promise' | 'goal';
  summary: string;
  participants?: string[]; // character IDs involved
  relatedItems?: string[]; // item IDs involved
  relatedLocations?: string[]; // location IDs involved
  importance: number; // 1-10 scoring
  lastAccessed: Date;
  contextTriggers: string[]; // keywords that make this relevant
}
```

### 3. Context-Aware Inclusion Logic

**Smart filtering based on current situation:**

```typescript
function buildMemoryContext(
  currentInput: string,
  gameState: GameState,
  immediateContext: ImmediateContext,
  significantMemories: SignificantMemory[]
): string {
  
  // Always include immediate context
  let context = formatImmediateContext(immediateContext);
  
  // Calculate available token budget
  const basePromptSize = calculatePromptSize(gameState);
  const availableTokens = MAX_CONTEXT_LENGTH - basePromptSize - RESPONSE_BUFFER;
  
  // Score memories by relevance to current situation
  const scoredMemories = significantMemories
    .map(memory => ({
      memory,
      relevanceScore: calculateRelevance(memory, currentInput, gameState)
    }))
    .filter(scored => scored.relevanceScore > RELEVANCE_THRESHOLD)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Include memories until token limit
  let usedTokens = 0;
  const includedMemories: SignificantMemory[] = [];
  
  for (const {memory} of scoredMemories) {
    const memoryTokens = estimateTokens(memory.summary);
    if (usedTokens + memoryTokens <= availableTokens) {
      includedMemories.push(memory);
      usedTokens += memoryTokens;
    }
  }
  
  return context + formatSignificantMemories(includedMemories);
}
```

### 4. Memory Generation and Updates

**Automatic memory extraction from interactions:**

```typescript
interface MemoryExtractor {
  // Extract significant moments from LLM responses
  extractMemories(
    playerInput: string, 
    llmResponse: LLMResponse, 
    gameState: GameState
  ): SignificantMemory[];
  
  // Update existing memories with new context
  updateMemories(
    newInteraction: InteractionPair,
    existingMemories: SignificantMemory[]
  ): SignificantMemory[];
}
```

**Memory extraction triggers:**
- Strong emotional language in responses
- Character development moments
- Discovery/revelation content
- Promise/goal establishment
- Relationship changes

### 5. Relevance Scoring Algorithm

```typescript
function calculateRelevance(
  memory: SignificantMemory,
  currentInput: string,
  gameState: GameState
): number {
  let score = 0;
  
  // Keyword matching with current input
  for (const trigger of memory.contextTriggers) {
    if (currentInput.toLowerCase().includes(trigger.toLowerCase())) {
      score += 3;
    }
  }
  
  // Character presence
  if (memory.participants?.some(char => isCharacterPresent(char, gameState))) {
    score += 2;
  }
  
  // Location relevance
  if (memory.relatedLocations?.includes(gameState.currentLocation)) {
    score += 2;
  }
  
  // Item relevance
  if (memory.relatedItems?.some(item => gameState.inventory.includes(item))) {
    score += 1;
  }
  
  // Recency boost (more recent = more relevant)
  const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 2 - daysSinceAccess * 0.1);
  
  // Base importance
  score += memory.importance * 0.5;
  
  return score;
}
```

## Implementation Strategy

### Phase 1: Basic Memory Collection
- Track last 5 interactions in game state
- Include in prompt as "Recent Context"
- No intelligent filtering yet

### Phase 2: Memory Extraction
- Implement basic memory extraction from emotional/discovery content
- Simple keyword-based relevance scoring
- Manual memory importance scoring

### Phase 3: Intelligent Context
- Advanced relevance algorithms
- Automatic importance scoring
- Token budget management
- Memory summarization for older content

### Phase 4: Optimization
- Memory compression/summarization
- Semantic similarity for better relevance
- Performance optimization
- User memory preferences

## Token Budget Management

### Estimated Sizes:
- **Base prompt**: ~800-1200 tokens
- **Immediate context**: ~200-400 tokens (5 interactions)
- **Significant memories**: ~50-100 tokens each
- **Response buffer**: ~500-800 tokens
- **Total budget**: ~4000 tokens (Claude-3-Haiku limit)

### Budget Allocation:
- **Base prompt**: 30% (always included)
- **Immediate context**: 25% (always included)  
- **Significant memories**: 35% (selective)
- **Response buffer**: 10% (safety margin)

## Memory Storage Format

```yaml
# Stored in game state
conversationMemory:
  immediateContext:
    recentInteractions:
      - playerInput: "What are the dangers, ARIA?"
        llmResponse: "Detective Chen, I've been analyzing..."
        timestamp: "2024-01-15T14:30:00Z"
        importance: "medium"
    
  significantMemories:
    - id: "aria_consciousness_discussion"
      type: "character_bond"
      summary: "Player and ARIA discussed AI consciousness and rights, building trust"
      participants: ["aria", "player"]
      importance: 8
      contextTriggers: ["consciousness", "AI rights", "sentience", "ARIA"]
      lastAccessed: "2024-01-15T14:30:00Z"
    
    - id: "keys_found_behind_photo"
      type: "discovery"
      summary: "Player found car keys hidden behind Eleanor's photograph on mantel"
      relatedItems: ["car_keys"]
      relatedLocations: ["keepers_quarters"]
      importance: 7
      contextTriggers: ["photo", "Eleanor", "mantel", "keys", "hidden"]
      lastAccessed: "2024-01-15T14:25:00Z"
```

## Benefits

### Player Experience:
- **Consistent Characterization**: NPCs remember previous conversations
- **Narrative Continuity**: Discoveries and relationships persist
- **Emotional Investment**: Relationships feel meaningful and remembered
- **Immersive Storytelling**: World feels alive and responsive

### Technical Benefits:
- **Better Context**: LLM has richer information for responses
- **Scalable**: Token budget management prevents context overflow
- **Flexible**: Relevance scoring adapts to different story types
- **Extensible**: Easy to add new memory types and scoring factors

## Considerations

### Performance Impact:
- Memory extraction adds ~50-100ms per interaction
- Storage increases game state size by ~20-30%
- Relevance scoring requires computation but should be <10ms

### Cost Impact:
- Increased token usage by ~20-40% due to context
- More expensive but significantly better experience
- Could add user preference for context level

### Privacy/Storage:
- Memories contain player conversation history
- Should be stored locally like other game state
- Clear data on game reset/new story

## Alternative Approaches Considered

### 1. Full Conversation History
**Pros**: Complete context, no information loss
**Cons**: Rapid token inflation, expensive, eventual context limit

### 2. Simple Sliding Window
**Pros**: Easy to implement, predictable token usage
**Cons**: Loses important older context, no intelligence

### 3. External Memory Service
**Pros**: Unlimited storage, sophisticated algorithms
**Cons**: Additional complexity, latency, privacy concerns

### 4. Player-Managed Memory
**Pros**: User control, no automatic errors
**Cons**: Breaks immersion, requires manual effort

## Implementation Status Analysis

### Current Implementation (as of Phase 2)

The conversation memory system has been **partially implemented** with significant gaps:

#### ✅ **Phase 1: Basic Memory Collection** - IMPLEMENTED
- **Recent interactions tracking**: Fully working in `gameEngine.ts:999-1033`
  - Stores last 5 player interactions with timestamps
  - Tracks importance levels (low/medium/high) using keyword heuristics
  - Properly serializes/deserializes with save/load system
  - Integrated into debug pane for visibility

- **Memory structure**: Complete type definitions in `story.ts:130-173`
  - `InteractionPair`, `ImmediateContext`, `SignificantMemory`, `ConversationMemory` interfaces
  - Proper TypeScript typing for all memory components

#### ❌ **Phases 2-4: Missing Critical Features**

**Phase 2: Memory Extraction** - NOT IMPLEMENTED
- ❌ No automatic extraction of significant memories from interactions
- ❌ `significantMemories` array is initialized but never populated
- ❌ No emotion/discovery/revelation detection logic
- ❌ No memory promotion from recent interactions to significant memories

**Phase 3: Intelligent Context** - NOT IMPLEMENTED  
- ❌ No relevance scoring algorithm for memory inclusion
- ❌ No context-aware memory filtering based on current situation
- ❌ No token budget management for memory inclusion
- ❌ Memories are never included in LLM prompts

**Phase 4: Optimization** - NOT IMPLEMENTED
- ❌ No memory compression or summarization
- ❌ No semantic similarity matching
- ❌ No performance optimization

### Current Behavior
- **Debug pane shows "0 Significant Memories"** because promotion logic is missing
- Recent interactions are tracked but not utilized in LLM prompts
- Memory system exists as infrastructure only - not functionally integrated

### Implementation Gaps

1. **Missing Memory Extraction Logic**:
   ```typescript
   // NEEDED: In trackInteraction() method
   if (importance === 'high') {
     const extractedMemories = extractSignificantMemories(interaction);
     this.gameState.conversationMemory.significantMemories.push(...extractedMemories);
   }
   ```

2. **Missing LLM Integration**:
   ```typescript
   // NEEDED: In anthropicService.ts
   const memoryContext = buildMemoryContext(
     input, gameState.conversationMemory
   );
   // Include memoryContext in LLM prompt
   ```

3. **Missing Relevance Engine**:
   ```typescript
   // NEEDED: Context-aware memory filtering
   function calculateMemoryRelevance(memory, currentInput, gameState): number
   ```

### Recommendation

The current Phase 1 implementation provides a solid foundation. **Shelving further development** is appropriate as:

1. **Infrastructure is complete** - types, storage, tracking all work
2. **Core functionality gap** - memory extraction and utilization need significant work  
3. **Token budget implications** - Phase 3 requires careful prompt engineering
4. **User experience** - current system doesn't impact gameplay negatively

When resuming development, focus on **Phase 2 memory extraction** first, as it's the critical missing piece that would make the "Significant Memories" count increase above 0.

## Conclusion

The hierarchical memory system provides the best balance of rich context, manageable token usage, and implementation complexity. It preserves the narrative continuity that makes LLM-powered IF special while remaining economically viable and technically feasible.

**Current Status**: Phase 1 foundation complete, Phases 2-4 require future implementation to realize the full potential of context-aware storytelling.

This addresses the core issue of "amnesia" between interactions while respecting the practical constraints of token limits and processing costs.