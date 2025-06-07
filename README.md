# Iffy - LLM-powered Interactive Fiction Engine

A modern interactive fiction engine that uses Large Language Models to interpret natural language commands and manage game state, with a modular architecture and comprehensive documentation.

## 🎯 Project Status

**Current Phase:** Phase 3 Complete - Advanced Architecture & Polish ✅  
**Next:** Phase 4 - Extended Tooling & Community Features

## ✨ Features

### 🎮 **Easy Playtesting**
- **Bundled Example Stories**: Try stories instantly without downloading files
- **One-Click Loading**: Beautiful story gallery with descriptions and authors
- **Build-time Validation**: All example stories validated automatically
- **Instant Access**: No setup required for trying the engine

### 🎨 **Rich Visual Experience**
- **Rich Text Formatting**: Semantic markup with **bold**, *italic*, [character:names], [item:highlighting], and `[!alert]` boxes
- **Dynamic Theming**: Stories define custom color schemes with automatic contrast enhancement
- **WCAG AA Accessibility**: Automatic contrast calculation ensures readability across all themes
- **Immersive UI**: Responsive design with atmospheric visual elements

### 🧠 **AI-Powered Gameplay**  
- **Natural Language Commands**: Full LLM integration for understanding player intent
- **Format v2 Engine**: Success condition system with engine-only ending detection
- **Conversation Memory**: AI remembers previous interactions and context
- **Adaptive Responses**: Story reacts dynamically to player choices and exploration

### 📖 **Author-Friendly Format**
- **YAML-based Stories**: Clean, readable Format v2 specification
- **Success Conditions**: Declarative endings with knowledge flag requirements
- **Flexible Story Structure**: Support for linear and branching narratives
- **Built-in Validation**: Comprehensive story file error checking

### 🏗️ **Modern Architecture**
- **Modular UI Components**: Clean separation of concerns with manager classes
- **TypeScript**: Full type safety and modern development tools
- **Web-based**: Runs in any modern browser, no installation required
- **Comprehensive Testing**: 99 tests covering all major components
- **Performance Optimized**: ~191KB gzipped bundle with fast loading

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
git clone <repository-url>
cd iffy
npm install
```

### Development
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

### Try Example Stories
1. **Click "Load"** in the app
2. **Select from example stories** in the gallery:
   - **The Interrogation** - Serious crime drama with moral complexity
   - **The Great Sandwich Crisis v2** - Over-the-top soap opera melodrama
   - **Simple Sandwich Test** - Basic mechanics demonstration
3. **Start playing** with natural language or simple commands

### AI Enhancement (Recommended)
For the full experience with natural language commands:

1. **Get an API key** from [Anthropic Console](https://console.anthropic.com)
2. **Click Settings** in the app and enter your API key
3. **Load a story** and try natural language like:
   - `"examine the mysterious door"`
   - `"talk to the detective about the case"`  
   - `"search around for anything useful"`

**Basic Mode:** Works without an API key using simple commands like `look`, `go north`, `inventory`.

### Building
```bash
npm run build
```

This will:
1. **Validate all example stories** and fail if any are invalid
2. **Bundle examples** into the application 
3. **Compile TypeScript** with full type checking
4. **Build production assets** optimized for deployment

### Testing
```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

The project uses **Vitest** for testing with comprehensive coverage:

#### Test Coverage
- **Example Story Validation** (4 tests) - All bundled stories validate correctly
- **Rich Text Parser** (30 tests) - Full semantic markup processing, nested components, regression tests
- **Game Engine** (16 tests) - Story loading, state management, save/load functionality, validation
- **Story Parser** (5 tests) - YAML parsing, story structure validation, format compliance  
- **Anthropic Service** (23 tests) - Prompt building, response parsing, configuration management
- **Success Conditions** (16 tests) - Format v2 ending detection and knowledge flag system
- **End-to-End** (5 tests) - Complete gameplay workflows and integration testing

**Total: 99 tests** ensuring reliability and preventing regressions in core functionality.

### Validating Stories
```bash
npm run validate-story examples/interrogation.yaml
```

### Documentation
```bash
# Serve documentation with Mermaid diagrams
npm run docs:serve

# View documentation at http://localhost:8080
npm run docs:dev
```

## 📖 Story Format

Stories are written in YAML using our Format v2 specification. Here's a minimal example:

```yaml
title: "My Adventure"
author: "Your Name"
version: "2.0"

metadata:
  setting:
    time: "Present day"
    place: "A mysterious house"
  tone:
    overall: "Suspenseful"
    narrative_voice: "Second person, present tense"
  themes:
    - "Mystery"
    - "Discovery"

characters:
  - id: "player"
    name: "Player"
    traits: ["curious", "brave"]
    description: "An intrepid explorer"

locations:
  - id: "entrance"
    name: "Front Door"
    connections: ["hallway"]
    description: |
      You stand before an **old wooden door**. The brass handle 
      gleams in the moonlight.

# Format v2: Success conditions define story outcomes
success_conditions:
  - id: "discovery_ending"
    description: "Player discovers the secret"
    requires: ["found_key", "opened_door"]
    ending: |
      Congratulations! You've uncovered the mystery and completed your adventure.

flows:
  - id: "start"
    type: "narrative"
    name: "Beginning"
    content: |
      Your adventure begins here! You notice a [item:golden key] 
      glinting in the grass nearby.
      
      [!warning] Something feels different about this place.

start:
  text: |
    **Welcome to your adventure!**
    
    The night air is *crisp* and full of *possibilities*.
  location: "entrance"
  first_flow: "start"

# Format v2: LLM story guidelines for intelligent behavior
llm_story_guidelines: |
  This is a mystery adventure. Guide the player to explore and discover secrets.
  Set knowledge flags when the player finds items or solves puzzles.
  Maintain an atmosphere of suspense and discovery.
```

### Rich Text Formatting

Iffy supports semantic markup for enhanced visual storytelling:

- `**bold text**` - Emphasize important elements
- `*italic text*` - Subtle emphasis and atmosphere  
- `[character:Name]` - Highlight character names with theme colors
- `[item:Object]` - Golden highlighting for important items
- `[!warning]`, `[!discovery]`, `[!danger]` - Color-coded alert boxes

## 🏗️ Architecture

### Modular UI Architecture

The UI layer is organized into focused manager classes for maintainability:

- **MessageDisplay** (`src/ui/MessageDisplay.ts`): Output management with rich text rendering
- **LoadMenuManager** (`src/ui/LoadMenuManager.ts`): Story loading with bundled examples gallery
- **SettingsManager** (`src/ui/SettingsManager.ts`): API key and configuration management
- **CommandProcessor** (`src/ui/CommandProcessor.ts`): Input handling and command processing
- **GameManager** (`src/ui/GameManager.ts`): Save/load functionality with auto-generated filenames

### Core Engine Components

- **Story Parser** (`src/engine/storyParser.ts`): Validates and parses YAML stories with Format v2 support
- **Game Engine** (`src/engine/gameEngine.ts`): Manages game state, LLM integration, and success conditions
- **Anthropic Service** (`src/services/anthropicService.ts`): LLM integration for natural language processing

### Build System

- **Example Bundling** (`scripts/bundle-examples.ts`): Validates and bundles stories at build time
- **Story Validation** (`scripts/validate-story.ts`): Comprehensive story structure validation
- **Type Safety**: Full TypeScript compilation with strict checking

### Development Phases

1. **Phase 1** ✅ - Basic scaffolding, story parsing, UI foundation
2. **Phase 2** ✅ - LLM integration, rich formatting, conversation memory
3. **Phase 3** ✅ - Modular architecture, bundled examples, comprehensive documentation
4. **Phase 4** 📋 - Extended tooling, community features

## 📚 Documentation

### 📖 **Comprehensive Architecture Documentation**

Browse the complete documentation with interactive Mermaid diagrams:

```bash
npm run docs:serve
```

#### Core Documentation
- **[Architecture Overview](./docs/architecture.md)** - Complete system design with component diagrams
- **[UI Components](./docs/ui-components.md)** - Detailed UI architecture and manager pattern
- **[Story Engine](./docs/story-engine.md)** - Format v2, LLM integration, and engine mechanics  
- **[Development Guide](./docs/development-guide.md)** - Comprehensive developer workflow and standards

#### Legacy Documentation
- **[Story Format Specification](./docs/format.md)** - Complete YAML format reference
- **[Project Requirements](./docs/requirements.md)** - Technical specifications
- **[MVP Documentation](./docs/mvp.md)** - Minimum Viable Product specifications

### 🎯 Design Proposals

The [`docs/proposals/`](./docs/proposals/) directory contains detailed design documents:

- **[Format v2](./docs/proposals/format-v2.md)** - LLM-driven simplicity with success conditions (✅ Implemented)
- **[Dialogue System v2](./docs/proposals/dialogue-v2.md)** - Enhanced conversation system (✅ Implemented)
- **[Rich Output Formatting](./docs/proposals/rich-output-formatting.md)** - Visual enhancement system (✅ Implemented)
- **[Conversation Memory](./docs/proposals/conversation-memory.md)** - AI memory and context system (✅ Implemented)  
- **[Fuzzy Flows](./docs/proposals/fuzzy-flows.md)** - Flexible story progression system (✅ Implemented)

### 🚀 Getting Started with Documentation

1. **For Players**: Just click "Load" in the app and try the example stories
2. **For Authors**: Start with the [Story Format Specification](./docs/format.md) and [Story Engine guide](./docs/story-engine.md)
3. **For Developers**: Check out the [Architecture Overview](./docs/architecture.md) and [Development Guide](./docs/development-guide.md)

## 🎮 Example Stories

Try our showcase stories demonstrating Format v2 capabilities:

### 🕵️ **The Interrogation** (`interrogation.yaml`)
A serious crime drama exploring themes of desperation and moral complexity. Features:
- Multiple ending paths based on knowledge gained
- Success conditions with requires: `["learned child sick", "learned child died", "prisoner opened up"]`
- Professional detective vs. broken parent character dynamics
- Realistic dialogue with emotional authenticity

### 🥪 **The Great Sandwich Crisis v2** (`sandwich_crisis_v2.yaml`)  
Over-the-top soap opera melodrama about making lunch. Demonstrates:
- Dramatic `[!danger]` and `[!discovery]` alerts
- Item transformation system (bread → toasted bread)
- Multiple success conditions (perfect, decent, mystery disaster)
- Comedy through formatting and dramatic contrast

### 🧪 **Simple Sandwich Test** (`sandwich_test_simple.yaml`)
Basic mechanics demonstration for testing success conditions and item interactions.

**Load any story directly from the app's example gallery!**

## 🛠️ Development Tools

### Story Validator
Use the built-in validator to check story files for errors:

```bash
npm run validate-story examples/interrogation.yaml
```

The validator checks for:
- YAML syntax errors
- Missing required fields  
- Invalid references between flows, locations, and characters
- Success condition requirements validation
- Item transformation chains
- Unreachable flows and common authoring mistakes

### Example Story Bundling
Stories are automatically validated and bundled during build:

```bash
npm run bundle-examples
```

This creates `src/bundled-examples.ts` with all validated stories for the gallery.

### Documentation Server
Serve documentation with rendered Mermaid diagrams:

```bash
npm run docs:serve
```

## 🤝 Contributing

Iffy is actively developed and welcomes contributions! Areas where help is especially appreciated:

- **📖 Story Creation**: Write showcase stories demonstrating Format v2 features
- **🎨 UI/UX Improvements**: Enhance the visual design and user experience  
- **🧠 AI Integration**: Improve LLM prompt engineering and response handling
- **📚 Documentation**: Expand guides for authors and developers
- **🐛 Bug Reports**: Test the engine and report issues
- **💡 Feature Ideas**: Propose new capabilities via GitHub issues

### Development Workflow
1. Read the [Development Guide](./docs/development-guide.md)
2. Browse the [Architecture Documentation](./docs/architecture.md)
3. Check the [UI Components guide](./docs/ui-components.md) for frontend work
4. Review existing [proposals](./docs/proposals/) for planned features

## 📄 License

[Add license information]

---

**Ready to create or play interactive fiction?** Load the app, try the example stories, and dive into the comprehensive documentation to get started! 🎮✨