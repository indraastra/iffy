# Conversation Memory and Context Preservation

**Status:** 🟢 Implemented  
**Priority:** Medium  
**Implementation:** Full memory system in `src/engine/memoryManager.ts` with LLM-based extraction and compaction  

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

### Current Implementation

The conversation memory system has been **fully implemented** with a sophisticated LLM-based approach:

#### ✅ **Complete Memory System** - IMPLEMENTED
- **MemoryManager class**: Full implementation in `src/engine/memoryManager.ts`
  - Stores up to 15 recent interactions automatically
  - Extracts significant memories every 10 interactions using LLM
  - Compacts memories when limit exceeded using intelligent grouping
  - Provides formatted context for LLM prompts

- **Key Features**:
  - Automatic importance detection based on content analysis
  - Asynchronous batch processing to avoid blocking gameplay
  - Relevance-based memory filtering for current context
  - Time-based memory decay and pruning
  - Full save/load persistence support

### How MemoryManager Works

#### 1. Adding Memories
```typescript
// Called after each interaction in gameEngine.ts
memoryManager.addMemory(playerInput, llmResponse, gameState);

// The MemoryManager:
// - Determines importance (low/medium/high) automatically
// - Stores in recentInteractions array
// - Triggers async processing every 10 interactions
```

#### 2. Memory Extraction Process
Every 10 interactions, the MemoryManager:
1. Sends a batch to the LLM for analysis
2. Extracts significant memories (character bonds, discoveries, etc.)
3. Compacts existing memories if over limit (50 memories)
4. Updates memory access times based on relevance

#### 3. Memory Retrieval
```typescript
// Getting memories for LLM context
const memoryContext = memoryManager.getMemories(currentInput, gameState);

// Returns:
{
  recentInteractions: "Recent Conversation History (last 15 interactions):\n...",
  significantMemories: "Significant Memories (10 relevant):\n...",
  stats: { recentCount: 15, significantCount: 23 }
}
```

### Example Memory Outputs

#### Recent Interactions Format:
```
Recent Conversation History (last 5 interactions):

1. [2 mins ago] Player: "What do you know about the lighthouse keeper?"
   Response: "The lighthouse keeper was a mysterious figure who disappeared..."
   [Importance: high]

2. [5 mins ago] Player: "examine the photograph"
   Response: "The faded photograph shows a woman standing by the lighthouse..."
   [Importance: medium]
```

#### Significant Memories Format:
```
Significant Memories (3 relevant):

1. [DISCOVERY] Player found car keys hidden behind Eleanor's photograph on mantel (items: car_keys) [10 mins ago]

2. [CHARACTER_BOND] Player and ARIA discussed AI consciousness and rights, building trust (participants: aria, player) [1 hour ago]

3. [REVELATION] The lighthouse keeper's disappearance is connected to experiments with the fog (participants: lighthouse_keeper) [2 hours ago]
```

### Memory Extraction Example

When the LLM analyzes a batch of interactions, it might extract:
```json
{
  "memories": [
    {
      "type": "character_bond",
      "summary": "Player comforted Sara about her missing brother, strengthening their relationship",
      "importance": 8,
      "participants": ["sara", "player"],
      "contextTriggers": ["sara", "brother", "missing", "comfort"]
    },
    {
      "type": "discovery",
      "summary": "Found a hidden journal in the lighthouse basement revealing keeper's experiments",
      "importance": 9,
      "relatedItems": ["journal"],
      "relatedLocations": ["lighthouse_basement"],
      "contextTriggers": ["journal", "experiments", "basement", "keeper"]
    }
  ]
}
```

### Memory Compaction Example

When memories exceed the limit, the LLM groups related memories:
```json
{
  "compactionGroups": [
    {
      "memoryIds": ["mem_1", "mem_2", "mem_3"],
      "compactedMemory": {
        "type": "character_bond",
        "summary": "Multiple interactions with ARIA revealed her growing self-awareness and trust in the player",
        "importance": 9,
        "participants": ["aria", "player"],
        "contextTriggers": ["aria", "consciousness", "trust", "ai"]
      }
    }
  ],
  "keepIndividual": ["mem_4", "mem_5"]
}
```

### Integration Points

1. **GameEngine Integration**:
   ```typescript
   // In processPlayerInput()
   this.memoryManager.addMemory(input, response.text, this.gameState);
   ```

2. **LLM Prompt Integration**:
   ```typescript
   // In buildPrompt()
   const memoryContext = this.memoryManager.getMemories(input, gameState);
   // Includes both recent interactions and relevant significant memories
   ```

3. **Save/Load Integration**:
   ```typescript
   // Save: memoryManager.exportState()
   // Load: memoryManager.importState(savedState)
   ```

### Configuration Options

- **Extraction Interval**: Default 10 interactions, configurable via `setExtractionInterval()`
- **Memory Model**: Default Claude 3 Haiku for cost efficiency, configurable
- **Max Memories**: 50 significant memories, 15 recent interactions
- **Relevance Threshold**: 2.0 score minimum for memory inclusion

## Benefits Realized

### Player Experience:
- **Consistent Characterization**: NPCs remember previous conversations through significant memories
- **Narrative Continuity**: Discoveries and relationships persist across sessions
- **Emotional Investment**: Relationships feel meaningful with tracked character bonds
- **Immersive Storytelling**: World responds to player history via relevance filtering

### Technical Benefits:
- **Better Context**: LLM receives rich, relevant history for responses
- **Scalable**: Token budget managed through intelligent filtering
- **Flexible**: Relevance scoring adapts to different story types
- **Cost-Effective**: Uses cheaper Haiku model for memory operations

## Performance Characteristics

- **Memory Addition**: < 5ms per interaction
- **Async Extraction**: Runs in background, no gameplay impact
- **Memory Retrieval**: < 10ms with relevance filtering
- **Storage Impact**: ~2-3KB per significant memory
- **Token Usage**: +20-40% but with much richer context

## Conclusion

The hierarchical memory system has been successfully implemented with sophisticated LLM-based extraction and compaction. It solves the core "amnesia" problem while respecting token limits and processing costs.

**Current Status**: ✅ Fully implemented and integrated into the game engine, providing rich context-aware storytelling capabilities.