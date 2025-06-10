# Impressionist Engine Implementation Plan

## Overview

This plan outlines the transition from the current state-machine based engine to the new impressionistic architecture. The goal is to preserve valuable existing components while fundamentally shifting the core philosophy from deterministic to impressionistic storytelling.

## Phase 1: Foundation & Format (Week 1)

### 1.1 Story Format Migration
- **Create new format parser** (`src/engine/impressionistParser.ts`)
  - Support both minimal and extended grammar
  - Convert existing v2 stories to impressionist format for testing
  - Validate natural language conditions and sketches

### 1.2 Core Data Structures
- **Update story types** (`src/types/impressionistStory.ts`)
  ```typescript
  interface ImpressionsStory {
    // Core metadata
    title: string
    author: string
    blurb: string  // 1-2 sentence hook
    version: string  // e.g., "1.0"
    
    // Story essence
    context: string  // 1-3 sentence essence
    scenes: Scene[]
    endings: Ending[]
    guidance: string
    
    // Optional enrichments
    narrative?: {
      voice?: string  // Narrative tone and style
      setting?: {
        time?: string
        place?: string
        environment?: string
      }
      tone?: string
      themes?: string[]
    }
    
    world?: {
      characters?: Record<string, Character>
      locations?: Record<string, Location>
      items?: Record<string, Item>
      atmosphere?: {
        sensory?: string[]
        objects?: string[]
        mood?: string
      }
    }
  }
  ```

### 1.3 Preserve Memory Manager
- **Keep existing MemoryManager** with modifications:
  - Rename "SignificantMemory" to "Impression"
  - Adapt memory extraction for impressionistic content
  - Maintain the compaction and relevance scoring logic

## Phase 2: Engine Core Redesign (Week 2)

### 2.1 Create ImpressionsEngine
- **New engine class** (`src/engine/impressionsEngine.ts`)
  - Replace GameEngine's state machine logic
  - Implement scene-based navigation
  - Natural language condition evaluation

### 2.2 LLM Director Pattern
- **Create LLMDirector** (`src/engine/llmDirector.ts`)
  - Minimal context assembly (600-900 tokens)
  - Clear signal protocol (SCENE, ENDING, REMEMBER, etc.)
  - Natural voice emergence through sketches
  - Include narrative metadata in prompts:
    - Pass narrative.voice to maintain consistent tone
    - Include setting context for time/place consistency
    - Reference themes for thematic coherence

### 2.3 Memory Bank Evolution
- **Adapt MemoryManager to MemoryBank**
  - Keep the async processing architecture
  - Modify for impression-based memories
  - Maintain relevance scoring and compaction

## Phase 3: Integration & Migration (Week 3)

### 3.1 Dual Engine Support
- **Factory pattern for engine selection**
  - Detect story format version
  - Route to appropriate engine
  - Allow testing both engines side-by-side

### 3.2 UI Layer Adaptation
- **Minimal UI changes needed**:
  - GameManager remains mostly unchanged
  - CommandProcessor works with both engines
  - MessageDisplay needs no changes
  - SaveManager adapts to new state structure

### 3.3 Service Layer Updates
- **AnthropicService modifications**:
  - Add support for new prompt formats
  - Maintain existing API structure
  - Add impressionistic response parsing

## Phase 4: Testing & Validation (Week 4)

### 4.1 Example Story Creation
- **Create test stories**:
  1. Minimal story (50 lines) - "The Key"
  2. Medium story (100 lines) - "Coffee Confessional" 
  3. Rich story (150+ lines) - "Sentient Quill"

### 4.2 Test Suite Updates
- **Adapt existing tests**:
  - GameEngine tests → ImpressionsEngine tests
  - Add natural language condition tests
  - Memory system compatibility tests

### 4.3 Performance Validation
- **Ensure context stays under 1000 tokens**
- **Validate memory compaction efficiency**
- **Test scene transition smoothness**

### 4.4 Metrics & Monitoring
- **Implement minimal metrics tracking**:
  ```typescript
  interface ImpressionsMetrics {
    requestId: string
    timestamp: Date
    inputTokens: number
    outputTokens: number
    totalTokens: number
    latencyMs: number
    contextSize: number
    memoryCount: number
    sceneId: string
  }
  ```
- **Real-time monitoring**:
  - Token usage per request
  - Context efficiency (target: <900 tokens)
  - API latency tracking
  - Cost estimation ($0.015/1K input, $0.075/1K output)
- **Session analytics**:
  - Average tokens per interaction
  - Memory compaction effectiveness
  - Scene transition patterns
  - Total session cost

## Components to Preserve

### Definitely Keep:
1. **MemoryManager** - Core async processing, compaction, relevance scoring
2. **SaveManager** - Auto-save, recovery, localStorage logic
3. **UI Components** - All UI managers work as-is
4. **AnthropicService** - API integration layer
5. **Test Infrastructure** - Adapt for new engine

### Modify Significantly:
1. **GameEngine** → **ImpressionsEngine**
2. **StoryParser** → **ImpressionsParser**
3. **GameState** → **ImpressionsState** (simpler)
4. **Prompt Building** → **Minimal Context Assembly**

### Remove/Replace:
1. **Flow-based state machines**
2. **Complex condition checking**
3. **Rigid item/location mechanics**
4. **Deterministic transitions**

## Migration Strategy

### Step 1: Parallel Development
- Build new engine alongside existing one
- No breaking changes initially
- Test with converted stories

### Step 2: Feature Parity
- Ensure new engine handles existing stories
- Validate save/load compatibility
- Test all UI interactions

### Step 3: Gradual Cutover
- Add format detection
- Route stories to appropriate engine
- Deprecation warnings for old format

### Step 4: Full Migration
- Convert all example stories
- Update documentation
- Remove legacy engine code

## Key Implementation Details

### Metrics Integration
```typescript
class MetricsCollector {
  private metrics: ImpressionsMetrics[] = []
  
  async trackRequest(
    fn: () => Promise<AnthropicResponse>,
    context: DirectorContext
  ): Promise<AnthropicResponse> {
    const startTime = performance.now()
    const requestId = crypto.randomUUID()
    
    const response = await fn()
    
    const metric: ImpressionsMetrics = {
      requestId,
      timestamp: new Date(),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.total_tokens,
      latencyMs: performance.now() - startTime,
      contextSize: JSON.stringify(context).length,
      memoryCount: context.memories?.length || 0,
      sceneId: context.currentScene
    }
    
    this.metrics.push(metric)
    this.logMetric(metric)
    
    return response
  }
  
  private logMetric(m: ImpressionsMetrics) {
    const efficiency = m.inputTokens < 900 ? '✅' : '⚠️'
    console.log(`${efficiency} ${m.inputTokens}/${m.outputTokens} tokens, ${m.latencyMs}ms`)
  }
  
  getSessionStats() {
    return {
      avgInputTokens: this.average(m => m.inputTokens),
      avgLatency: this.average(m => m.latencyMs),
      totalCost: this.calculateTotalCost(),
      contextEfficiency: this.getContextEfficiency()
    }
  }
}
```

### Natural Language Conditions
```typescript
class ConditionEvaluator {
  private metrics: MetricsCollector
  
  async evaluate(condition: string, context: ImpressionsState): Promise<boolean> {
    // Use LLM to evaluate natural language conditions
    const prompt = `Given the context: ${context}, 
                    does this condition hold true: "${condition}"?
                    Answer only YES or NO.`
    
    const response = await this.metrics.trackRequest(
      () => this.llm.evaluate(prompt),
      { condition, state: context }
    )
    
    return response.content[0].text === 'YES'
  }
}
```

### Scene Transitions
```typescript
interface SceneTransition {
  to: string  // scene_id
  when: string  // natural language condition
}

// Evaluated by LLM based on conversation context
```

### Memory as Impressions
```typescript
interface Impression {
  content: string  // What happened
  strength: number  // How memorable (1-10)
  associations: string[]  // Related concepts
  lastRecalled: Date
}
```

## Success Metrics

1. **Authoring Time**: 30 minutes vs 3 hours
2. **Context Size**: <1000 tokens per request
3. **Response Quality**: Natural, contextual narratives
4. **Memory Efficiency**: 50 impressions max
5. **Code Simplicity**: 80% reduction in engine complexity

## Debug & Monitoring UI

### Real-time Metrics Display
```typescript
class ImpressionsDebugPane {
  private metricsCollector: MetricsCollector
  
  updateDisplay() {
    const latest = this.metricsCollector.getLatest()
    const stats = this.metricsCollector.getSessionStats()
    
    this.element.innerHTML = `
      <div class="metrics-header">
        <h3>Impressions Engine Metrics</h3>
      </div>
      
      <div class="latest-request">
        <h4>Latest Request</h4>
        <p>Scene: ${latest.sceneId}</p>
        <p>Tokens: ${latest.inputTokens} → ${latest.outputTokens}</p>
        <p>Latency: ${latest.latencyMs}ms</p>
        <p>Context: ${latest.contextSize} bytes</p>
        <p>Memories: ${latest.memoryCount}</p>
      </div>
      
      <div class="session-stats">
        <h4>Session Statistics</h4>
        <p>Avg Input: ${stats.avgInputTokens} tokens</p>
        <p>Avg Latency: ${stats.avgLatency}ms</p>
        <p>Efficiency: ${stats.contextEfficiency}%</p>
        <p>Est. Cost: $${stats.totalCost}</p>
      </div>
      
      <div class="warnings">
        ${this.getWarnings()}
      </div>
    `
  }
  
  private getWarnings(): string {
    const warnings = []
    const latest = this.metricsCollector.getLatest()
    
    if (latest.inputTokens > 900) {
      warnings.push('⚠️ Context approaching token limit')
    }
    if (latest.latencyMs > 3000) {
      warnings.push('⚠️ High latency detected')
    }
    if (latest.memoryCount > 40) {
      warnings.push('⚠️ Memory approaching compaction threshold')
    }
    
    return warnings.join('<br>')
  }
}
```

## Risk Mitigation

1. **Backwards Compatibility**: Dual engine support during transition
2. **Save File Migration**: Converter for old save formats
3. **Performance**: Careful context management
4. **Quality**: Extensive testing with example stories

## Timeline

- **Week 1**: Format & Foundation
- **Week 2**: Core Engine Implementation  
- **Week 3**: Integration & UI Adaptation
- **Week 4**: Testing & Polish
- **Week 5**: Documentation & Release

## Future Expansions (Post-Launch)

### Phase 5: Embeddings-Based Memory (Month 2)
- **Vector Memory Store**:
  ```typescript
  interface VectorMemory extends Impression {
    embedding: Float32Array  // 1536-dim for text-embedding-3-small
    semanticTags: string[]   // Extracted themes/concepts
  }
  
  class EmbeddingMemoryBank extends MemoryBank {
    private embeddings: Map<string, VectorMemory>
    private embeddingService: EmbeddingService
    
    async remember(impression: string) {
      const embedding = await this.embeddingService.embed(impression)
      const semanticTags = await this.extractConcepts(impression)
      
      this.embeddings.set(impression, {
        content: impression,
        embedding,
        semanticTags,
        strength: this.calculateStrength(impression),
        lastRecalled: new Date()
      })
    }
    
    async getRelevant(context: string, limit: number = 10): string[] {
      const contextEmbedding = await this.embeddingService.embed(context)
      
      // Find top-k similar memories using cosine similarity
      const similarities = Array.from(this.embeddings.entries())
        .map(([id, memory]) => ({
          id,
          memory,
          similarity: this.cosineSimilarity(contextEmbedding, memory.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
      
      return similarities.map(s => s.memory.content)
    }
  }
  ```
- **Benefits**:
  - Scale to 1000s of memories efficiently
  - Semantic search vs keyword matching
  - Better relevance scoring
  - Support for very long stories

### Phase 6: Agentic Engine Control (Month 3)
- **LLM as Dungeon Master**:
  ```typescript
  interface EngineTools {
    createItem: {
      description: "Create a new item in the current scene"
      parameters: {
        name: string
        description: string
        properties?: string[]
      }
    }
    
    introduceCharacter: {
      description: "Introduce a new character"
      parameters: {
        name: string
        essence: string
        voice?: string
      }
    }
    
    modifyScene: {
      description: "Add details to current scene"
      parameters: {
        additions: string[]
        atmosphereChanges?: string
      }
    }
    
    createPath: {
      description: "Open a new path/option"
      parameters: {
        to: string  // scene_id or new scene
        description: string
        condition?: string
      }
    }
  }
  
  class AgenticDirector extends LLMDirector {
    async processWithTools(input: string, context: DirectorContext) {
      const response = await this.llm.complete({
        messages: [...],
        tools: this.getAvailableTools(context),
        tool_choice: "auto"
      })
      
      // Process any tool calls
      for (const toolCall of response.tool_calls || []) {
        await this.executeToolCall(toolCall, context)
      }
      
      return this.parseResponse(response)
    }
    
    private async executeToolCall(call: ToolCall, context: DirectorContext) {
      switch (call.name) {
        case 'createItem':
          // Dynamically add item to world.items
          context.world.items[call.inputs.name] = {
            name: call.inputs.name,
            description: call.inputs.description,
            emergent: true  // Mark as LLM-created
          }
          break
          
        case 'introduceCharacter':
          // Add character to current scene
          context.world.characters[call.inputs.name] = {
            name: call.inputs.name,
            essence: call.inputs.essence,
            emergent: true
          }
          break
      }
    }
  }
  ```
- **Controlled Emergence**:
  - Author sets boundaries via guidance
  - LLM can create within those boundaries
  - All creations marked as "emergent"
  - Can be disabled per story
- **Use Cases**:
  - Procedural NPCs in response to player actions
  - Dynamic item generation (e.g., "I craft a rope from vines")
  - Adaptive scene details
  - Branching paths based on player creativity

### Integration Strategy
1. **Embeddings**: Drop-in replacement for current memory relevance scoring
2. **Agentic Tools**: Opt-in per story via metadata flag
3. **Both features**: Work together (embeddings help track emergent content)

## Next Steps

1. Create `impressionistStory.ts` types
2. Build `impressionistParser.ts` 
3. Start `impressionsEngine.ts` with basic scene handling
4. Adapt MemoryManager to work with impressions
5. Create minimal test story for validation