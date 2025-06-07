# UI Components Architecture

## Overview

The Iffy UI layer follows a modular manager pattern, where each manager class handles a specific aspect of the user interface. This design provides clear separation of concerns and makes the codebase more maintainable.

## Component Hierarchy

```mermaid
graph TD
    subgraph "Application Layer"
        App[IffyApp<br/>Main Application]
    end
    
    subgraph "UI Managers"
        MD[MessageDisplay<br/>Output Management]
        LMM[LoadMenuManager<br/>Story Loading]
        SM[SettingsManager<br/>Configuration]
        CP[CommandProcessor<br/>Input Handling]
        GM[GameManager<br/>Save/Load]
    end
    
    subgraph "Core Engine"
        GE[GameEngine<br/>Game Logic]
        AS[AnthropicService<br/>AI Integration]
    end
    
    subgraph "DOM Elements"
        SO[#story-output]
        CI[#command-input]
        SMod[#settings-modal]
        Btns[Control Buttons]
    end
    
    App --> MD
    App --> LMM
    App --> SM
    App --> CP
    App --> GM
    
    MD --> SO
    LMM --> SO
    LMM --> CI
    SM --> SMod
    CP --> CI
    GM --> Btns
    
    LMM --> GE
    SM --> GE
    CP --> GE
    GM --> GE
    
    GE --> AS
```

## Manager Responsibilities

### MessageDisplay
**Purpose**: Manages all story output and user messaging

```mermaid
classDiagram
    class MessageDisplay {
        -storyOutput: HTMLElement
        +addMessage(text: string, type: MessageType)
        +clearOutput()
        +addCustomElement(element: HTMLElement)
        +removeLastMessageIfMatches(text: string)
        -scrollToBottom()
    }
    
    class MessageType {
        <<enumeration>>
        story
        input
        error
        system
        choices
        title
    }
    
    MessageDisplay --> MessageType
```

**Key Features**:
- Rich text rendering for story content
- Type-specific styling (errors, system messages, etc.)
- Automatic scrolling management
- Custom element insertion (API key prompts, etc.)

### LoadMenuManager
**Purpose**: Handles all story loading functionality

```mermaid
classDiagram
    class LoadMenuManager {
        -gameEngine: GameEngine
        -messageDisplay: MessageDisplay
        -commandInput: HTMLInputElement
        +showLoadOptions()
        +loadBundledStory(filename: string)
        +loadStoryFile()
        +loadSaveGame()
        -styleMenu(menu: HTMLElement)
        -attachEventListeners()
        -initializeStory(story: Story)
    }
```

**Key Features**:
- Dynamic example story grid
- File picker integration
- Save game loading
- Complex modal styling
- Error handling with user feedback

### SettingsManager
**Purpose**: Manages application settings and API configuration

```mermaid
classDiagram
    class SettingsManager {
        -gameEngine: GameEngine
        -messageDisplay: MessageDisplay
        -settingsModal: HTMLElement
        -apiKeyInput: HTMLInputElement
        +showSettings()
        +hideSettings()
        +promptForApiKey()
        +isApiKeyConfigured(): boolean
        -saveApiKey()
        -loadApiKey()
        -updateApiKeyStatus()
        -createApiKeyStatusIndicator()
    }
```

**Key Features**:
- API key persistence (localStorage)
- Status indicator management
- Interactive API key prompting
- Modal event handling

### CommandProcessor
**Purpose**: Handles user input and command processing

```mermaid
classDiagram
    class CommandProcessor {
        -gameEngine: GameEngine
        -messageDisplay: MessageDisplay
        -commandInput: HTMLInputElement
        +processCommand()
        +focus()
        -setupEventListeners()
    }
```

**Key Features**:
- Natural language command processing
- Rich text clickable elements
- Loading state management
- Error handling and recovery

### GameManager
**Purpose**: Manages game save/load operations

```mermaid
classDiagram
    class GameManager {
        -gameEngine: GameEngine
        -messageDisplay: MessageDisplay
        +saveGame()
        -generateSaveFilename(): string
        -sanitizeFilename(filename: string): string
        -setupEventListeners()
    }
```

**Key Features**:
- Automatic filename generation
- Browser download integration
- Filename sanitization
- Timestamp-based naming

## Event Flow Patterns

### Command Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant CI as Command Input
    participant CP as CommandProcessor
    participant GE as GameEngine
    participant MD as MessageDisplay
    
    U->>CI: Types command
    U->>CI: Presses Enter
    CI->>CP: keypress event
    CP->>MD: addMessage("> command", "input")
    CP->>CI: Clear & disable input
    CP->>MD: addMessage("Processing...", "system")
    CP->>GE: processAction(command)
    
    alt Success
        GE-->>CP: Response with text
        CP->>MD: removeLastMessageIfMatches("Processing...")
        CP->>MD: addMessage(response.text, "story")
        
        opt Game ended
            CP->>MD: addMessage("Story Complete!", "system")
        end
        
        opt Choices available
            CP->>MD: addMessage(choices, "choices")
        end
    else Error
        CP->>MD: removeLastMessageIfMatches("Processing...")
        CP->>MD: addMessage("Error occurred", "error")
    end
    
    CP->>CI: Re-enable & focus input
```

### Story Loading Flow

```mermaid
sequenceDiagram
    participant U as User
    participant LB as Load Button
    participant LMM as LoadMenuManager
    participant M as Modal Menu
    participant GE as GameEngine
    participant MD as MessageDisplay
    
    U->>LB: Click load
    LB->>LMM: showLoadOptions()
    LMM->>M: Create & style menu
    LMM->>M: Attach event listeners
    M-->>U: Display story options
    
    U->>M: Select example story
    M->>LMM: loadBundledStory(filename)
    LMM->>MD: addMessage("Loading...", "system")
    LMM->>GE: loadStory(parsedStory)
    GE-->>LMM: Story loaded
    LMM->>MD: clearOutput()
    LMM->>MD: addMessage(title, "title")
    LMM->>MD: addMessage(initialText, "story")
    
    opt First flow has content
        LMM->>MD: addMessage(flowContent, "story")
    else No content
        LMM->>GE: processAction("look")
        GE-->>LMM: Look response
        LMM->>MD: addMessage(response, "story")
    end
```

## Styling Architecture

### CSS Organization

```mermaid
flowchart TB
    subgraph "Style Sources"
        MainCSS[main.css<br/>Base styles]
        CompCSS[Component styles<br/>Inline in managers]
        AdditionalCSS[Additional styles<br/>In main.ts]
    end
    
    subgraph "Style Categories"
        Layout[Layout & Structure]
        Typography[Typography & Text]
        Interactive[Interactive Elements]
        Messages[Message Types]
        Modals[Modal & Overlays]
    end
    
    subgraph "CSS Variables"
        Colors[Color Variables<br/>--primary-color, etc.]
        Spacing[Spacing Variables<br/>Margins, padding]
        Responsive[Responsive Variables<br/>Breakpoints]
    end
    
    MainCSS --> Layout
    MainCSS --> Typography
    CompCSS --> Interactive
    CompCSS --> Modals
    AdditionalCSS --> Messages
    
    Layout --> Colors
    Typography --> Colors
    Interactive --> Colors
    Messages --> Colors
```

### Message Type Styling

```mermaid
graph LR
    subgraph "Message Types"
        Story[story<br/>Rich text content]
        Input[input<br/>User commands]
        Error[error<br/>Error messages]
        System[system<br/>System notifications]
        Choices[choices<br/>Player options]
        Title[title<br/>Story titles]
    end
    
    subgraph "Visual Treatment"
        Story --> RichText[Rich text parsing<br/>Clickable elements]
        Input --> Italic[Italic gray text]
        Error --> RedBold[Red bold text]
        System --> Cyan[Cyan italic text]
        Choices --> YellowBox[Yellow bordered box]
        Title --> LargeCenter[Large centered text]
    end
```

## State Management

### Manager State Dependencies

```mermaid
graph TD
    subgraph "Shared State"
        GE[GameEngine<br/>Game State]
        DOM[DOM Elements<br/>Input/Output]
        LS[LocalStorage<br/>API Key]
    end
    
    subgraph "Manager States"
        MDState[MessageDisplay<br/>Output history]
        LMMState[LoadMenuManager<br/>Menu visibility]
        SMState[SettingsManager<br/>Modal state]
        CPState[CommandProcessor<br/>Input state]
        GMState[GameManager<br/>No persistent state]
    end
    
    GE --> LMMState
    GE --> SMState
    GE --> CPState
    GE --> GMState
    
    DOM --> MDState
    DOM --> CPState
    
    LS --> SMState
    
    SMState --> GE
    LMMState --> MDState
    CPState --> MDState
    GMState --> MDState
```

## Error Handling Strategy

### Error Flow Pattern

```mermaid
flowchart TD
    UserAction[User Action] --> Validation{Input Valid?}
    Validation -->|No| UIError[Show UI Error]
    Validation -->|Yes| Processing[Process Action]
    Processing --> EngineCall{Engine Call}
    EngineCall -->|Success| Success[Show Result]
    EngineCall -->|Error| ErrorHandler[Error Handler]
    
    ErrorHandler --> LogError[Log to Console]
    ErrorHandler --> UserError[Show User Error]
    ErrorHandler --> Recovery[Attempt Recovery]
    
    Recovery --> EnableUI[Re-enable UI]
    
    UIError --> EnableUI
    UserError --> EnableUI
    Success --> Ready[Ready for Next Action]
    EnableUI --> Ready
```

### Error Types and Handling

```mermaid
classDiagram
    class ErrorHandler {
        +handleStoryLoadError(error: Error, context: string)
        +handleCommandError(error: Error)
        +handleSaveError(error: Error)
        +handleApiError(error: Error)
    }
    
    class StoryParseError {
        +message: string
        +details: object
    }
    
    class NetworkError {
        +message: string
        +status: number
    }
    
    class ValidationError {
        +message: string
        +field: string
    }
    
    ErrorHandler --> StoryParseError
    ErrorHandler --> NetworkError
    ErrorHandler --> ValidationError
```

## Performance Considerations

### Optimization Strategies

1. **Event Delegation**: Single document listener for clickable elements
2. **Lazy Loading**: Managers only initialize when needed
3. **Memory Management**: Remove event listeners on cleanup
4. **DOM Efficiency**: Batch DOM updates where possible
5. **CSS Performance**: Use CSS variables for dynamic styling

### Bundle Size Impact

```mermaid
pie title Bundle Size Distribution
    "GameEngine Core" : 35
    "UI Managers" : 25
    "AnthropicService" : 15
    "StoryParser" : 10
    "Rich Text Utils" : 8
    "Bundled Examples" : 7
```

## Testing Strategy

### Component Testing Approach

```mermaid
flowchart LR
    subgraph "Test Types"
        Unit[Unit Tests<br/>Individual methods]
        Integration[Integration Tests<br/>Manager interactions]
        E2E[E2E Tests<br/>Full user flows]
    end
    
    subgraph "Test Coverage"
        Managers[Manager Classes<br/>95% coverage]
        Events[Event Handling<br/>90% coverage]
        ErrorPaths[Error Paths<br/>85% coverage]
    end
    
    Unit --> Managers
    Integration --> Events
    E2E --> ErrorPaths
```

This modular UI architecture provides a solid foundation for maintaining and extending the Iffy engine while keeping concerns properly separated and testable.