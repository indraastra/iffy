# Engine-Vue Decoupling Refactor

## Problem Statement

The current architecture violates separation of concerns by coupling the game engine to Vue through UI callbacks. This creates several issues:

1. **Poor Testability**: LLM player tests must work around Vue-specific callbacks
2. **Tight Coupling**: Engine cannot be used independently of Vue
3. **Mixed Responsibilities**: Engine handles both game logic AND UI integration
4. **Legacy Naming**: "Impressionist" prefix adds no value and creates confusion

## Current Architecture Issues

```typescript
// Current: Engine is coupled to UI
class ImpressionistEngine {
  private uiAddMessageCallback?: (text: string, type: string) => void
  private uiShowTypingCallback?: () => void
  
  // Engine pushes data to UI
  if (this.uiAddMessageCallback) {
    this.uiAddMessageCallback(response, 'story')
  }
}
```

This means:
- LLM player tests need to mock Vue callbacks
- Engine can't be used in CLI/headless environments easily
- Engine is responsible for UI state management

## Proposed Architecture

### Core Principle
**The engine should be a pure domain model with no UI dependencies. The Vue layer should be a thin reactive wrapper.**

### Layer 1: Pure Engine (Domain Logic)
```typescript
// Pure game engine - no UI dependencies
class GameEngine {
  async processAction(input: string): Promise<GameResponse> {
    // Returns result, doesn't push to UI
    const responses = []
    for await (const response of this.director.processInputStreaming(input, context)) {
      responses.push(response)
    }
    return { responses, gameState: this.getState() }
  }
  
  // Pure getters - no callbacks
  getState(): GameState
  getMessages(): Message[]
  isProcessing(): boolean
}
```

### Layer 2: Vue Integration (Reactive Wrapper)
```typescript
// Vue composable wraps pure engine
export function useGameEngine() {
  const engine = new GameEngine()
  const messages = ref<Message[]>([])
  const isAwaitingResponse = ref(false)
  
  const processCommand = async (input: string) => {
    isAwaitingResponse.value = true
    try {
      const result = await engine.processAction(input)
      
      // Pull data from engine instead of engine pushing
      messages.value = engine.getMessages()
    } finally {
      isAwaitingResponse.value = false
    }
  }
  
  return {
    messages: readonly(messages),
    isAwaitingResponse: readonly(isAwaitingResponse),
    processCommand
  }
}
```

### Layer 3: Components (Pure UI)
```vue
<script setup lang="ts">
// Components just consume reactive state
const { messages, isAwaitingResponse, processCommand } = useGameEngine()
</script>
```

## Benefits

### 1. Clean Separation of Concerns
- **Engine**: Pure game logic, no UI knowledge
- **Vue Layer**: Reactivity and UI state management  
- **Components**: Pure presentation

### 2. Multiple Interface Support
```typescript
// Vue app
const { processCommand } = useGameEngine()
await processCommand("look around")

// LLM player tests  
const engine = new GameEngine()
const result = await engine.processAction("look around")

// CLI app
const engine = new GameEngine()
console.log(await engine.processAction(userInput))
```

### 3. Better Testability
```typescript
// Engine tests - no mocking needed
const engine = new GameEngine()
await engine.loadStory(testStory)
const result = await engine.processAction("test input")
expect(result.responses).toHaveLength(1)

// Vue integration tests
const { processCommand, messages } = useGameEngine()
await processCommand("test")
expect(messages.value).toContain("response")
```

### 4. Simplified Naming
- `ImpressionistEngine` → `GameEngine`
- `LangChainDirector` → `Director` 
- `ImpressionistMemoryManager` → `MemoryManager`
- `ImpressionistStory` → `Story`

## Migration Plan

### Phase 1: Remove UI Callbacks from Engine
1. Modify `GameEngine.processAction()` to return results instead of using callbacks
2. Update `Director` to return streaming responses via AsyncGenerator
3. Remove all `setUI*Callback` methods

### Phase 2: Update Vue Integration  
1. Modify `useGameEngine` to pull data from engine instead of receiving pushes
2. Handle streaming by polling engine state or using reactive watchers
3. Update components to use new reactive state

### Phase 3: Update Tests
1. Modify LLM player to use pure engine interface
2. Remove Vue-specific mocking from engine tests
3. Add Vue-specific tests for reactive layer

### Phase 4: Rename & Cleanup
1. Rename classes to remove "Impressionist" prefix
2. Update imports throughout codebase
3. Update documentation

## File Structure After Refactor

```
src/
├── engine/                 # Pure domain logic (no Vue)
│   ├── GameEngine.ts      # Main game coordination
│   ├── Director.ts        # LLM orchestration  
│   ├── MemoryManager.ts   # Game memory
│   └── ActionClassifier.ts
├── services/              # Infrastructure
│   └── MultiModelService.ts
├── composables/           # Vue integration layer
│   ├── useGameEngine.ts   # Primary engine wrapper
│   ├── useGameActions.ts  # Helper actions
│   └── useTheme.ts       # UI theming
└── components/            # Pure UI components
    ├── GameLayout.vue
    ├── StoryOutput.vue
    └── PlayerInput.vue
```

## Implementation Details

### Streaming Response Handling
```typescript
// Engine returns AsyncGenerator
class Director {
  async* processInputStreaming(input: string): AsyncGenerator<DirectorResponse> {
    // Yield responses as they come
    yield actionResponse
    if (transitionNeeded) {
      yield transitionResponse  
    }
  }
}

// Vue layer consumes stream
const processCommand = async (input: string) => {
  isAwaitingResponse.value = true
  
  for await (const response of engine.processInputStreaming(input)) {
    // Add each response to reactive state as it arrives
    messages.value.push(formatMessage(response))
  }
  
  isAwaitingResponse.value = false
}
```

### State Synchronization
```typescript
// Engine maintains canonical state
class GameEngine {
  private state: GameState
  private messageHistory: Message[]
  
  getMessages(): Message[] { return [...this.messageHistory] }
  isProcessing(): boolean { return this.processingState }
}

// Vue layer synchronizes with engine state
const syncWithEngine = () => {
  messages.value = engine.getMessages()
  isAwaitingResponse.value = engine.isProcessing()
}
```

## Success Criteria

1. ✅ LLM player tests work without Vue mocking
2. ✅ Engine can be used in CLI environment
3. ✅ Vue components remain reactive
4. ✅ No UI logic in engine layer
5. ✅ Streaming responses still work smoothly
6. ✅ All existing functionality preserved

## Risks & Mitigations

**Risk**: Streaming UX might feel less responsive  
**Mitigation**: Use reactive watchers or small polling intervals

**Risk**: State synchronization complexity  
**Mitigation**: Keep engine state simple, use immutable updates

**Risk**: Breaking existing LLM player tests  
**Mitigation**: Update tests incrementally, maintain backward compatibility during migration

This refactor will create a much cleaner, more maintainable architecture that supports multiple interfaces while preserving the sophisticated game logic we've built.