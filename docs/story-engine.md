# Story Engine Design

## Overview

The Iffy Story Engine is designed around Format v2, which emphasizes LLM-driven storytelling with authored structure and emergent content. The engine balances player freedom with narrative coherence through intelligent success condition detection and natural language processing.

## Story Format v2 Architecture

### Core Story Structure

```mermaid
erDiagram
    Story {
        string title
        string author
        string version
        object metadata
        object start
        string llm_story_guidelines
    }
    
    Metadata {
        object setting
        object tone
        array themes
        object ui
    }
    
    Character {
        string id
        string name
        array traits
        string voice
        string description
    }
    
    Location {
        string id
        string name
        array connections
        string description
        array objects
    }
    
    Item {
        string id
        string name
        string description
        string discoverable_in
        array discovery_objects
        array aliases
        string can_become
        string created_from
    }
    
    Flow {
        string id
        string name
        string type
        array participants
        string content
        string player_goal
        array requirements
        array exchanges
        array completion_transitions
    }
    
    SuccessCondition {
        string id
        string description
        array requires
        string ending
    }
    
    Story ||--o{ Character : contains
    Story ||--o{ Location : contains
    Story ||--o{ Item : contains
    Story ||--o{ Flow : contains
    Story ||--o{ SuccessCondition : defines
    Story ||--|| Metadata : has
```

### Story Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Parsing : Load YAML
    Parsing --> Validation : Parse Complete
    Validation --> ValidationError : Invalid Structure
    ValidationError --> [*]
    Validation --> Loaded : Valid Story
    Loaded --> Playing : Start Game
    Playing --> Processing : Player Action
    Processing --> Updating : Process Complete
    Updating --> SuccessCheck : State Updated
    SuccessCheck --> EndingTriggered : Conditions Met
    SuccessCheck --> Playing : Continue
    EndingTriggered --> Completed : Show Ending
    Completed --> Reflecting : Post-Game
    Reflecting --> Playing : Continue Exploration
```

## Engine Components

### StoryParser

**Purpose**: Converts YAML story files into validated Story objects

```mermaid
classDiagram
    class StoryParser {
        +parseFromFile(file: File): Promise~Story~
        +parseFromYaml(content: string): Story
        -validateStructure(story: object): void
        -validateReferences(story: Story): void
        -validateSuccessConditions(story: Story): void
    }
    
    class ValidationError {
        +message: string
        +details: object
        +field: string
    }
    
    class Story {
        +title: string
        +author: string
        +version: string
        +metadata: Metadata
        +characters: Character[]
        +locations: Location[]
        +items: Item[]
        +flows: Flow[]
        +success_conditions: SuccessCondition[]
        +start: StartConfig
        +llm_story_guidelines: string
    }
    
    StoryParser --> Story
    StoryParser --> ValidationError
```

**Validation Rules**:
1. Required fields present
2. All references (locations, flows, items) exist
3. Success conditions reference valid knowledge flags
4. Start location and flow exist
5. Item transformation chains are valid

### GameEngine

**Purpose**: Manages game state and orchestrates story progression

```mermaid
classDiagram
    class GameEngine {
        -story: Story
        -gameState: GameState
        -anthropicService: AnthropicService
        -debugPane: DebugPane
        +loadStory(story: Story): void
        +processAction(action: PlayerAction): Response
        +saveGame(): string
        +loadGame(saveData: string): boolean
        +getInitialText(): string
        +getCurrentStoryTitle(): string
        -checkSuccessConditions(): SuccessCondition
        -updateKnowledge(flags: string[]): void
    }
    
    class GameState {
        +currentLocation: string
        +currentFlow: string
        +inventory: string[]
        +knowledge: Set~string~
        +visitedLocations: Set~string~
        +gameEnded: boolean
        +endingId: string
        +actionHistory: PlayerAction[]
    }
    
    class PlayerAction {
        +type: string
        +input: string
        +timestamp: Date
    }
    
    class Response {
        +text: string
        +choices: string[]
        +gameState: GameState
        +error: boolean
    }
    
    GameEngine --> GameState
    GameEngine --> PlayerAction
    GameEngine --> Response
```

### Success Condition System

The success condition system enables engine-only ending detection, allowing the LLM to focus on natural responses while the engine handles story completion logic.

```mermaid
flowchart TD
    PlayerAction[Player Action] --> LLMProcess[LLM Processing]
    LLMProcess --> ExtractFlags[Extract Knowledge Flags]
    ExtractFlags --> UpdateState[Update Game State]
    UpdateState --> CheckConditions{Check Success Conditions}
    
    CheckConditions -->|No Match| Continue[Continue Story]
    CheckConditions -->|Match Found| TriggerEnding[Trigger Ending]
    
    TriggerEnding --> ShowEnding[Show Ending Text]
    ShowEnding --> SetCompleted[Set Game Completed]
    SetCompleted --> AllowReflection[Allow Continued Exploration]
    
    Continue --> WaitForNext[Wait for Next Action]
    AllowReflection --> WaitForNext
```

#### Success Condition Examples

```yaml
# Multiple ending paths based on knowledge gained
success_conditions:
  - id: "full_confession"
    description: "Prisoner reveals complete truth about motivation and tragedy"
    requires: ["learned child sick", "learned financial desperation", "learned child died", "prisoner opened up"]
    ending: |
      You close your notebook and stand up. The prisoner looks smaller now, 
      diminished by the weight of their confession. The truth is often more 
      tragic than the crime itself.

  - id: "partial_truth"
    description: "Prisoner admits to crime but doesn't reveal full context"
    requires: ["learned financial motivation", "prisoner defensive"]
    ending: |
      You have what you need for the case - a confession and motive. But 
      something tells you there's more to this story than simple greed.
```

## LLM Integration

### AnthropicService Architecture

```mermaid
classDiagram
    class AnthropicService {
        -apiKey: string
        -client: Anthropic
        -debugCallback: Function
        +setApiKey(key: string): void
        +processNaturalLanguage(input: string, context: Context): Response
        +isConfigured(): boolean
        -buildPrompt(input: string, context: Context): string
        -parseResponse(response: string): ProcessedResponse
    }
    
    class Context {
        +story: Story
        +gameState: GameState
        +currentLocation: Location
        +availableItems: Item[]
        +storyGuidelines: string
    }
    
    class ProcessedResponse {
        +narrativeText: string
        +knowledgeFlags: string[]
        +stateChanges: object
        +suggestedChoices: string[]
    }
    
    AnthropicService --> Context
    AnthropicService --> ProcessedResponse
```

### LLM Prompt Structure

```mermaid
flowchart TB
    subgraph "Prompt Components"
        StoryContext[Story Context<br/>Characters, setting, theme]
        CurrentState[Current State<br/>Location, inventory, knowledge]
        Guidelines[LLM Guidelines<br/>Tone, mechanics, flags]
        PlayerInput[Player Input<br/>Natural language command]
    end
    
    subgraph "Prompt Assembly"
        SystemPrompt[System Prompt<br/>Core instructions]
        ContextPrompt[Context Prompt<br/>Current situation]
        UserPrompt[User Prompt<br/>Player command]
    end
    
    subgraph "Response Processing"
        ParseResponse[Parse LLM Response]
        ExtractFlags[Extract Knowledge Flags]
        UpdateInventory[Update Inventory]
        SetLocation[Set Location]
    end
    
    StoryContext --> SystemPrompt
    CurrentState --> ContextPrompt
    Guidelines --> ContextPrompt
    PlayerInput --> UserPrompt
    
    SystemPrompt --> ParseResponse
    ContextPrompt --> ParseResponse
    UserPrompt --> ParseResponse
    
    ParseResponse --> ExtractFlags
    ParseResponse --> UpdateInventory
    ParseResponse --> SetLocation
```

## Item System

### Item Transformation Mechanics

Format v2 introduces a flexible item transformation system that allows items to change state through player actions.

```mermaid
stateDiagram-v2
    state "Bread System" as bread_system {
        [*] --> StaleBread : Discovered
        StaleBread --> ToastedBread : Toast/Cook action
        ToastedBread --> [*] : Used in recipe
    }
    
    state "Mystery Item" as mystery {
        [*] --> MysteryJar : Found
        MysteryJar --> FishSauce : Examined/Used
        FishSauce --> [*] : Consumed
    }
    
    state "Sandwich Creation" as sandwich {
        [*] --> Ingredients : Gather
        Ingredients --> Assembly : Combine action
        Assembly --> Sandwich : Created
        Sandwich --> Consumed : Eat action
    }
```

### Item Discovery System

```mermaid
sequenceDiagram
    participant P as Player
    participant L as LLM
    participant E as Engine
    participant I as Item System
    
    P->>L: "examine the table"
    L->>E: Parse examine action
    E->>I: Check discoverable items in location
    I->>E: Return available items
    E->>L: Generate response with items
    L->>P: "On the table you see: bread, cheese, mystery jar"
    
    P->>L: "take the bread"
    L->>E: Parse take action
    E->>I: Move item to inventory
    I->>E: Update item location
    E->>L: Confirm action
    L->>P: "You pick up the stale bread"
```

## Flow System

### Flow Types and Mechanics

```mermaid
graph TD
    subgraph "Flow Types"
        Narrative[Narrative Flow<br/>Story content]
        Dialogue[Dialogue Flow<br/>Character interaction]
        Action[Action Flow<br/>Player choices]
        Exploration[Exploration Flow<br/>Location discovery]
    end
    
    subgraph "Flow Mechanics"
        Requirements[Requirements Check<br/>Knowledge/flags needed]
        Exchanges[Exchange System<br/>Turn-based interaction]
        Transitions[Flow Transitions<br/>Next flow logic]
        Completion[Completion Detection<br/>Success conditions]
    end
    
    Narrative --> Requirements
    Dialogue --> Exchanges
    Action --> Transitions
    Exploration --> Completion
```

### Dialogue Flow Example

```yaml
flows:
  - id: "interrogation_start"
    name: "Opening Question"
    type: "dialogue"
    participants: ["player", "prisoner"]
    player_goal: "Understand the prisoner's motivation"
    exchanges:
      - speaker: "player"
        text: '"Why did you do it?" you ask directly.'
        choices:
          - text: "Wait for an answer"
            next: "patient_approach"
            sets: ["patient approach"]
          - text: "Press harder"
            next: "aggressive_approach"  
            sets: ["aggressive approach"]
```

## Knowledge System

### Knowledge Flag Management

The knowledge system tracks story progression through flags that are set by LLM responses and checked by success conditions.

```mermaid
graph LR
    subgraph "Knowledge Sources"
        LLMResponse[LLM Response<br/>Sets flags]
        PlayerAction[Player Action<br/>Triggers checks]
        FlowCompletion[Flow Completion<br/>Auto-sets flags]
    end
    
    subgraph "Knowledge Storage"
        GameState[Game State<br/>knowledge: Set<string>]
    end
    
    subgraph "Knowledge Usage"
        SuccessCheck[Success Conditions<br/>Requires flags]
        FlowRequirements[Flow Requirements<br/>Conditional access]
        LLMContext[LLM Context<br/>What player knows]
    end
    
    LLMResponse --> GameState
    PlayerAction --> GameState
    FlowCompletion --> GameState
    
    GameState --> SuccessCheck
    GameState --> FlowRequirements
    GameState --> LLMContext
```

### Flag Naming Conventions

```mermaid
mindmap
  root((Knowledge Flags))
    Learned Facts
      learned_child_sick
      learned_financial_desperation
      learned_child_died
    Character States
      prisoner_opened_up
      prisoner_defensive
      prisoner_silent
    Player Actions
      showed_compassion
      used_aggressive_approach
      discovered_tragedy
    Item States
      sandwich_has_bread
      sandwich_has_cheese
      player_has_eaten_sandwich
```

## Debugging and Development

### Debug System Architecture

```mermaid
classDiagram
    class DebugPane {
        -isVisible: boolean
        -requests: DebugEntry[]
        -responses: DebugEntry[]
        +toggle(): void
        +logRequest(prompt: string): void
        +logResponse(response: string): void
        +clear(): void
    }
    
    class DebugEntry {
        +timestamp: Date
        +content: string
        +type: string
    }
    
    class GameEngine {
        -debugPane: DebugPane
        +setDebugPane(debugPane: DebugPane): void
    }
    
    DebugPane --> DebugEntry
    GameEngine --> DebugPane
```

### Development Tools

1. **Story Validation**: Build-time validation of all story files
2. **Debug Pane**: Real-time LLM request/response inspection
3. **Knowledge Tracking**: Visibility into flag states
4. **Save/Load**: Quick iteration on game states
5. **Test Stories**: Simple stories for testing mechanics

## Performance Optimization

### Engine Performance Characteristics

```mermaid
graph TD
    subgraph "Performance Metrics"
        ParseTime[Story Parse<br/>~50ms avg]
        ActionTime[Action Processing<br/>~100ms avg]
        LLMTime[LLM Response<br/>~2000ms avg]
        UIUpdate[UI Update<br/>~10ms avg]
    end
    
    subgraph "Optimization Strategies"
        LazyLoad[Lazy Loading<br/>Parse on demand]
        Caching[Response Caching<br/>Repeated actions]
        Batch[Batch Updates<br/>DOM operations]
        Async[Async Processing<br/>Non-blocking UI]
    end
    
    ParseTime --> LazyLoad
    ActionTime --> Caching
    LLMTime --> Async
    UIUpdate --> Batch
```

### Memory Management

```mermaid
flowchart LR
    subgraph "Memory Usage"
        StoryData[Story Data<br/>~1-5MB]
        GameState[Game State<br/>~100KB]
        ActionHistory[Action History<br/>~500KB]
        UIElements[UI Elements<br/>~200KB]
    end
    
    subgraph "Cleanup Strategies"
        HistoryLimit[Limit History<br/>Max 100 actions]
        WeakRefs[Weak References<br/>Event listeners]
        Disposal[Element Disposal<br/>Modal cleanup]
    end
    
    StoryData --> HistoryLimit
    GameState --> WeakRefs
    ActionHistory --> HistoryLimit
    UIElements --> Disposal
```

This engine design provides a robust foundation for creating engaging interactive fiction experiences while maintaining performance and developer productivity.