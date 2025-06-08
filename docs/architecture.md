# Iffy Engine Architecture

## Overview

Iffy is a modern LLM-powered Interactive Fiction Engine built with TypeScript, designed for natural language storytelling experiences. The engine combines traditional IF mechanics with AI-driven narrative generation to create dynamic, responsive stories.

## Core Design Principles

1. **LLM-First Design**: Natural language understanding at the core
2. **Modular Architecture**: Clear separation of concerns
3. **Format v2 Compatibility**: Support for modern YAML-based story definitions
4. **Developer Experience**: Easy story creation and validation
5. **Player Experience**: Intuitive natural language commands

## System Architecture

```mermaid
graph TB
    subgraph "Frontend Application"
        UI[User Interface Layer]
        Engine[Game Engine Core]
        Services[External Services]
    end
    
    subgraph "UI Components"
        UI --> MD[MessageDisplay]
        UI --> LMM[LoadMenuManager]
        UI --> SM[SettingsManager]
        UI --> CP[CommandProcessor]
        UI --> GM[GameManager]
    end
    
    subgraph "Engine Core"
        Engine --> SP[StoryParser]
        Engine --> GE[GameEngine]
        Engine --> SC[SuccessConditions]
    end
    
    subgraph "External Services"
        Services --> AS[AnthropicService]
        Services --> DP[DebugPane]
    end
    
    subgraph "Story Content"
        Stories[Example Stories]
        UserStories[User Stories]
        BundledStories[Bundled Examples]
    end
    
    Stories --> Engine
    UserStories --> Engine
    BundledStories --> Engine
    
    Engine --> Services
    UI --> Engine
```

## Component Architecture

### UI Layer Components

The UI layer is organized into focused manager classes, each handling a specific aspect of the user interface:

```mermaid
classDiagram
    class IffyApp {
        -gameEngine: GameEngine
        -messageDisplay: MessageDisplay
        -loadMenuManager: LoadMenuManager
        -settingsManager: SettingsManager
        +initializeApp()
        +displayWelcomeMessage()
    }
    
    class MessageDisplay {
        -storyOutput: HTMLElement
        +addMessage(text: string, type: MessageType)
        +clearOutput()
        +addCustomElement(element: HTMLElement)
    }
    
    class LoadMenuManager {
        -gameEngine: GameEngine
        -messageDisplay: MessageDisplay
        +showLoadOptions()
        +loadBundledStory(filename: string)
        +loadStoryFile()
    }
    
    class SettingsManager {
        -gameEngine: GameEngine
        -apiKeyInput: HTMLInputElement
        +showSettings()
        +saveApiKey()
        +promptForApiKey()
    }
    
    class CommandProcessor {
        -gameEngine: GameEngine
        -commandInput: HTMLInputElement
        +processCommand()
        +setupEventListeners()
    }
    
    class GameManager {
        -saveManager: SaveManager
        +saveGame()
        +initialize()
        +getSaveManager(): SaveManager
    }
    
    class SaveManager {
        -gameEngine: GameEngine
        -messageDisplay: MessageDisplay
        -autoSaveInterval: number
        -options: SaveOptions
        +initialize()
        +startAutoSave()
        +stopAutoSave()
        +saveGame()
        +loadGame(storyTitle: string): boolean
        +deleteSave(storyTitle: string)
        +getSavedGames(): SaveMetadata[]
        +checkForStoryRecovery()
    }
    
    IffyApp --> MessageDisplay
    IffyApp --> LoadMenuManager
    IffyApp --> SettingsManager
    IffyApp --> CommandProcessor
    IffyApp --> GameManager
    
    LoadMenuManager --> MessageDisplay
    LoadMenuManager --> GameManager
    SettingsManager --> MessageDisplay
    CommandProcessor --> MessageDisplay
    GameManager --> SaveManager
    SaveManager --> MessageDisplay
```

### Engine Layer

The engine layer handles story parsing, game state management, and AI integration:

```mermaid
classDiagram
    class GameEngine {
        -story: Story
        -gameState: GameState
        -anthropicService: AnthropicService
        +loadStory(story: Story)
        +processAction(action: PlayerAction)
        +saveGame(): string
        +loadGame(saveData: string): Result
        +trackInteraction(input: string, response: string)
        +getCurrentStoryTitle(): string
    }
    
    class StoryParser {
        +parseFromFile(file: File): Story
        +parseFromYaml(content: string): Story
        +validate(story: Story): ValidationResult
    }
    
    class AnthropicService {
        -apiKey: string
        +setApiKey(key: string)
        +processNaturalLanguage(input: string): Response
        +isConfigured(): boolean
    }
    
    class Story {
        +title: string
        +author: string
        +characters: Character[]
        +locations: Location[]
        +items: Item[]
        +flows: Flow[]
        +success_conditions: SuccessCondition[]
    }
    
    GameEngine --> StoryParser
    GameEngine --> AnthropicService
    GameEngine --> Story
    StoryParser --> Story
```

## Save System Architecture

### Enhanced Save System (Phase 1)

The save system has been enhanced to provide auto-save functionality, complete interaction history preservation, and crash recovery:

```mermaid
classDiagram
    class SaveManager {
        -gameEngine: GameEngine
        -messageDisplay: MessageDisplay
        -autoSaveInterval: number
        -options: SaveOptions
        -sessionStartTime: Date
        +initialize()
        +startAutoSave()
        +stopAutoSave()
        +performAutoSave()
        +saveGame()
        +loadGame(storyTitle: string): boolean
        +deleteSave(storyTitle: string)
        +getSavedGames(): SaveMetadata[]
        +checkForStoryRecovery()
        +updateOptions(options: SaveOptions)
    }
    
    class SaveOptions {
        +autoSaveEnabled: boolean
        +autoSaveIntervalMinutes: number
    }
    
    class SaveMetadata {
        +storyTitle: string
        +timestamp: Date
        +location: string
        +playtime: number
    }
    
    SaveManager --> SaveOptions
    SaveManager --> SaveMetadata
    SaveManager --> GameEngine
    SaveManager --> MessageDisplay
```

### Save System Features

1. **Auto-Save**: Automatic saves every 2 minutes during active gameplay
2. **LocalStorage Persistence**: Saves persist across browser sessions
3. **Complete History**: Removed 5-interaction limit for full session preservation
4. **Recovery Detection**: Prompts for recent saves (<30 minutes old) on story load
5. **Save Management**: One save per story with delete functionality
6. **Dual Format**: Both localStorage and JSON download support

### Save Data Flow

```mermaid
sequenceDiagram
    participant Player
    participant SM as SaveManager
    participant GE as GameEngine
    participant LS as LocalStorage
    participant MD as MessageDisplay
    
    Note over SM: Auto-save Timer (2 minutes)
    SM->>GE: getCurrentStoryTitle()
    GE-->>SM: "Story Title"
    SM->>GE: saveGame()
    GE-->>SM: JSON save data
    SM->>LS: Store save + metadata
    
    Note over Player: Manual Save
    Player->>SM: saveGame()
    SM->>GE: saveGame()
    GE-->>SM: JSON save data
    SM->>LS: Store save + metadata
    SM->>SM: Download JSON file
    SM->>MD: "Game saved" message
    
    Note over Player: Recovery Check
    SM->>LS: Check for recent save
    LS-->>SM: Save metadata
    SM->>Player: Confirm recovery dialog
    Player-->>SM: Accept recovery
    SM->>GE: loadGame(saveData)
    GE-->>SM: Load result
    SM->>MD: "Game restored" message
```

## Data Flow

### Command Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant CP as CommandProcessor
    participant GE as GameEngine
    participant AS as AnthropicService
    participant MD as MessageDisplay
    
    User->>CP: Enter command
    CP->>MD: Show user input
    CP->>MD: Show "Processing..."
    CP->>GE: processAction(command)
    GE->>AS: processNaturalLanguage(input)
    AS-->>GE: Interpreted action
    GE->>GE: Update game state
    GE->>GE: Check success conditions
    GE-->>CP: Response with text & choices
    CP->>MD: Remove "Processing..."
    CP->>MD: Show response
    CP->>MD: Show choices (if any)
```

### Story Loading Flow

```mermaid
sequenceDiagram
    participant User
    participant LMM as LoadMenuManager
    participant SP as StoryParser
    participant GE as GameEngine
    participant MD as MessageDisplay
    
    User->>LMM: Click load story
    LMM->>LMM: Show load menu
    User->>LMM: Select example story
    LMM->>SP: parseFromYaml(content)
    SP->>SP: Validate story structure
    SP-->>LMM: Parsed story
    LMM->>GE: loadStory(story)
    GE->>GE: Initialize game state
    GE-->>LMM: Story loaded
    LMM->>MD: Clear output
    LMM->>MD: Show story title
    LMM->>MD: Show initial text
```

## Build System

### Build Pipeline

```mermaid
flowchart LR
    subgraph "Source"
        Stories[Example Stories<br/>*.yaml]
        Code[TypeScript Code<br/>src/**/*.ts]
    end
    
    subgraph "Build Process"
        Bundle[Bundle Examples<br/>bundle-examples.ts]
        Validate[Validate Stories<br/>Story validation]
        Compile[TypeScript<br/>Compilation]
        ViteBuild[Vite Build<br/>Bundling]
    end
    
    subgraph "Output"
        BundledJS[bundled-examples.ts]
        DistJS[dist/assets/*.js]
        DistCSS[dist/assets/*.css]
        HTML[dist/index.html]
    end
    
    Stories --> Bundle
    Bundle --> Validate
    Validate --> BundledJS
    Code --> Compile
    BundledJS --> Compile
    Compile --> ViteBuild
    ViteBuild --> DistJS
    ViteBuild --> DistCSS
    ViteBuild --> HTML
```

### Story Validation Pipeline

```mermaid
flowchart TB
    Start([Start Build]) --> Discover[Discover *.yaml files]
    Discover --> Parse[Parse each story]
    Parse --> ValidateStructure{Valid structure?}
    ValidateStructure -->|No| Fail[❌ Build fails]
    ValidateStructure -->|Yes| ValidateRefs{Valid references?}
    ValidateRefs -->|No| Fail
    ValidateRefs -->|Yes| Bundle[Bundle into TS module]
    Bundle --> Continue[✅ Continue build]
    
    style Fail fill:#ff6b6b
    style Continue fill:#4ecdc4
```

## Story Format

### Format v2 Structure

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
        string can_become
        string created_from
    }
    
    Flow {
        string id
        string name
        string type
        array participants
        string content
        array exchanges
        array requirements
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
```

## Testing Strategy

### Test Coverage Areas

```mermaid
mindmap
  root((Testing))
    Unit Tests
      StoryParser
      GameEngine
      AnthropicService
      RichTextParser
      SaveManager
    Integration Tests
      End-to-End Success
      Story Validation
      Command Processing
      Save/Load Flow
    Build Tests
      Example Validation
      Bundle Generation
      TypeScript Compilation
    UI Tests
      Component Isolation
      Event Handling
      State Management
      Auto-save Functionality
```

## Deployment

### Deployment Architecture

```mermaid
flowchart LR
    subgraph "Development"
        Dev[Local Development<br/>npm run dev]
        Test[Test Suite<br/>npm run test]
        Build[Production Build<br/>npm run build]
    end
    
    subgraph "CI/CD"
        Validate[Validate Stories]
        Bundle[Bundle Examples]
        Compile[TypeScript Build]
        Package[Vite Package]
    end
    
    subgraph "Deployment"
        GHPages[GitHub Pages<br/>Static Hosting]
        CDN[Asset Distribution]
    end
    
    Dev --> Test
    Test --> Build
    Build --> Validate
    Validate --> Bundle
    Bundle --> Compile
    Compile --> Package
    Package --> GHPages
    GHPages --> CDN
```

## Security Considerations

1. **API Key Management**: Client-side storage with user control
2. **Content Validation**: All stories validated at build time  
3. **Input Sanitization**: Rich text parser prevents XSS
4. **No Server Dependencies**: Fully client-side application

## Performance Characteristics

- **Bundle Size**: ~191KB gzipped
- **Load Time**: <2s on 3G networks
- **Memory Usage**: ~50MB runtime
- **Responsiveness**: <100ms UI interactions

## Future Architecture Considerations

1. **Plugin System**: Extensible story mechanics
2. **Cloud Storage**: Cross-device save synchronization
3. **Multiplayer**: Shared story experiences
4. **Mobile**: Progressive Web App capabilities
5. **Offline**: Service worker story caching