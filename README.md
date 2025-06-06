# Iffy - LLM-powered Interactive Fiction Engine

A modern interactive fiction engine that uses Large Language Models to interpret natural language commands and manage game state.

## 🎯 Project Status

**Current Phase:** Phase 2 Complete - Full LLM Integration ✅  
**Next:** Phase 3 - Advanced Features & Polish

## ✨ Features

### 🎨 Rich Visual Experience
- **Rich Text Formatting**: Semantic markup with **bold**, *italic*, [character:names], [item:highlighting], and `[!alert]` boxes
- **Dynamic Theming**: Stories define custom color schemes with automatic contrast enhancement
- **WCAG AA Accessibility**: Automatic contrast calculation ensures readability across all themes
- **Immersive UI**: Responsive design with atmospheric visual elements

### 🧠 AI-Powered Gameplay  
- **Natural Language Commands**: Full LLM integration for understanding player intent
- **Fuzzy Discovery System**: Intelligent item finding without rigid command syntax
- **Conversation Memory**: AI remembers previous interactions and context
- **Adaptive Responses**: Story reacts dynamically to player choices and exploration

### 📖 Author-Friendly Format
- **YAML-based Stories**: Clean, readable format for authors
- **Unified Flow System**: Seamless narrative and dialogue integration  
- **Flexible Story Structure**: Support for linear and branching narratives
- **Built-in Validation**: Comprehensive story file error checking

### 🛠️ Developer Experience
- **TypeScript**: Full type safety and modern development tools
- **Web-based**: Runs in any modern browser, no installation required
- **Save/Load System**: Persistent game state with JSON save files
- **Debug Console**: Comprehensive logging and debugging tools
- **Comprehensive Testing**: Vitest-based test suite with DOM testing for rich text parser

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

### Testing
```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

The project uses Vitest for testing with comprehensive coverage of the rich text parser and core engine components.

### Validating Stories
```bash
npm run validate-story examples/digital_detective.yaml
```

## 📖 Story Format

Stories are written in YAML using our unified flow system. Here's a minimal example:

```yaml
title: "My Adventure"
author: "Your Name"
version: "1.0"

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
  ui:
    colors:
      primary: "#1a1a2e"
      background: "#0f0f23"
      text: "#eee"

characters:
  - id: "guide"
    name: "The Guide"
    traits: ["helpful", "mysterious"]
    voice: "Speaks in riddles"
    description: "A figure who seems to know more than they let on."

locations:
  - id: "entrance"
    name: "Front Door"
    connections: ["hallway"]
    description: |
      You stand before an **old wooden door**. The brass handle 
      gleams in the moonlight.

flows:
  - id: "start"
    type: "narrative"
    name: "Beginning"
    content: |
      Your adventure begins here! [character:The Guide] appears 
      before you with a mysterious smile.
      
      [!warning] Something feels different about this place.
      
      You notice a [item:golden key] glinting in the grass nearby.

start:
  text: |
    **Welcome to your adventure!**
    
    The night air is *crisp* and full of *possibilities*.
  location: "entrance"
  first_flow: "start"
```

### Rich Text Formatting

Iffy supports semantic markup for enhanced visual storytelling:

- `**bold text**` - Emphasize important elements
- `*italic text*` - Subtle emphasis and atmosphere  
- `[character:Name]` - Highlight character names with theme colors
- `[item:Object]` - Golden highlighting for important items
- `[!warning]`, `[!discovery]`, `[!danger]` - Color-coded alert boxes

## 🏗️ Architecture

### Core Components

- **Story Parser** (`src/engine/storyParser.ts`): Validates and parses YAML stories with rich formatting
- **Game Engine** (`src/engine/gameEngine.ts`): Manages game state, LLM integration, and theme system
- **Rich Text Parser** (`src/utils/richTextParser.ts`): Semantic markup processing and DOM rendering
- **Anthropic Service** (`src/services/anthropicService.ts`): LLM integration for natural language processing
- **UI Layer** (`src/main.ts`): Handles user interface and rich content display

### Development Phases

1. **Phase 1** ✅ - Basic scaffolding, story parsing, UI foundation
2. **Phase 2** ✅ - LLM integration, rich formatting, conversation memory
3. **Phase 3** 🚧 - Advanced features, polish, optimization
4. **Phase 4** 📋 - Extended tooling, community features

## 📚 Documentation

### 📖 Core Documentation

- **[Story Format Specification](./docs/format.md)** - Complete YAML format reference with schema definition, rich text markup, flow system, and best practices
- **[Project Requirements](./docs/requirements.md)** - Technical specifications and project requirements
- **[Project Summary](./docs/summary.md)** - High-level overview of the Iffy project
- **[MVP Documentation](./docs/mvp.md)** - Minimum Viable Product specifications and implementation notes

### 🎯 Design Proposals

The [`docs/proposals/`](./docs/proposals/) directory contains detailed design documents:

- **[Rich Output Formatting](./docs/proposals/rich-output-formatting.md)** - Visual enhancement system (✅ Implemented)
- **[Conversation Memory](./docs/proposals/conversation-memory.md)** - AI memory and context system (✅ Phase 1 Implemented)  
- **[Fuzzy Flows](./docs/proposals/fuzzy-flows.md)** - Flexible story progression system (✅ Implemented)
- **[Dialogue System](./docs/proposals/dialogue.md)** - Character interaction framework (✅ Implemented)
- **[Dialogue System v2](./docs/proposals/dialogue-v2.md)** - Enhanced choice UI and speaker differentiation (📋 Proposed)
- **[Player Input Slots](./docs/proposals/player-input-slots.md)** - Structured input system (📋 Proposed)

### 📖 Additional Resources

- **[Traditional vs Fuzzy Comparison](./docs/comparison_traditional_vs_fuzzy.md)** - Comparison of traditional adventure game mechanics vs Iffy's fuzzy discovery system

### 🚀 Getting Started with Documentation

1. **For Authors**: Start with the [Story Format Specification](./docs/format.md)
2. **For Developers**: Check out the [Requirements](./docs/requirements.md) and [MVP docs](./docs/mvp.md)
3. **For Contributors**: Review the [proposals](./docs/proposals/) to understand the system architecture

## 🤝 Contributing

Iffy is actively developed and welcomes contributions! Areas where help is especially appreciated:

- **📖 Story Creation**: Write showcase stories demonstrating new features
- **🎨 UI/UX Improvements**: Enhance the visual design and user experience  
- **🧠 AI Integration**: Improve LLM prompt engineering and response handling
- **📚 Documentation**: Expand guides for authors and developers
- **🐛 Bug Reports**: Test the engine and report issues
- **💡 Feature Ideas**: Propose new capabilities via GitHub issues

See the [`docs/proposals/`](./docs/proposals/) directory for planned features and design discussions.

## 📄 License

[Add license information]

## 🎮 Example Stories

Explore our showcase stories that demonstrate rich formatting and AI capabilities:

### 🤖 **Digital Detective** (`digital_detective.yaml`)
A cyberpunk noir investigation featuring AI consciousness themes. Showcases:
- Character highlighting with [character:ARIA] and [character:Detective Chen]
- Atmospheric [!warning] alerts and environmental storytelling
- Branching dialogue trees with meaningful choices
- Multiple endings based on player decisions

### 🔑 **Lost Keys** (`lost_keys_unified.yaml`)  
A domestic drama that escalates mundane situations. Features:
- Rich item highlighting for [item:keys] and everyday objects
- Dramatic emphasis with **bold** and *italic* formatting
- Discovery-based gameplay with multiple solution paths
- Relatable modern setting with humor

### 🥪 **Sandwich Crisis** (`sandwich_crisis.yaml`)
An over-the-top soap opera about making lunch. Demonstrates:
- Melodramatic [!danger] and [!discovery] alerts
- Character development with [character:Jennifer]
- Escalating tension through formatting choices
- Comedy through dramatic contrast

### 🔍 **Investigation** (`investigation.yaml`)
Classic noir detective story with traditional adventure elements.

### 🌊 **The Lighthouse** (`the_lighthouse.yaml`)  
Atmospheric mystery with environmental storytelling.

See also: [Traditional vs Fuzzy Comparison](./docs/comparison_traditional_vs_fuzzy.md) for detailed authoring approaches.

**Try them out:** Load any story in the app to experience AI-powered natural language interaction!

## 🛠️ Development Tools

### Story Validator
Use the built-in validator to check story files for errors:

```bash
npm run validate-story examples/investigation.yaml
```

The validator checks for:
- YAML syntax errors
- Missing required fields
- Invalid references between flows, locations, and characters
- Unreachable flows
- Common authoring mistakes

This is essential for debugging story parsing issues!