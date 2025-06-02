# Iffy - LLM-powered Interactive Fiction Engine

A modern interactive fiction engine that uses Large Language Models to interpret natural language commands and manage game state.

## 🎯 Project Status

**Current Phase:** MVP Phase 1 Complete  
**Next:** Phase 2 - LLM Integration

## ✨ Features

- **YAML-based Story Format**: Author stories in a clean, readable YAML format
- **Unified Flow System**: Seamless integration between narrative and dialogue
- **Dynamic Theming**: Stories can define their own color schemes
- **Natural Language Ready**: Architecture designed for LLM-powered command interpretation
- **Web-based**: Runs in any modern browser, no installation required
- **Save/Load System**: Persistent game state with JSON save files

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

### Building
```bash
npm run build
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
    description: "You stand before an old wooden door."

flows:
  - id: "start"
    type: "narrative"
    name: "Beginning"
    content: "Your adventure begins here..."
    next:
      - type: "dialogue"
        trigger: "talk to guide"
        flow_id: "first_conversation"

start:
  text: "Welcome to your adventure!"
  location: "entrance"
  first_flow: "start"

endings:
  - id: "victory"
    name: "Success"
    requires: ["solved_mystery"]
    content: "You have solved the mystery!"
```

## 🏗️ Architecture

### Core Components

- **Story Parser** (`src/engine/storyParser.ts`): Validates and parses YAML stories
- **Game Engine** (`src/engine/gameEngine.ts`): Manages game state and processes actions
- **UI Layer** (`src/main.ts`): Handles user interface and interactions

### MVP Phases

1. **Phase 1** ✅ - Basic scaffolding, story parsing, UI foundation
2. **Phase 2** 🚧 - LLM integration for natural language processing
3. **Phase 3** 📋 - Full flow system with dialogue handling
4. **Phase 4** 📋 - Polish, save system, demo story

## 📚 Documentation

- [Story Format Specification](format.md)
- [MVP Implementation Plan](mvp.md)
- [Project Requirements](requirements.md)

## 🤝 Contributing

This is currently in MVP development. Contributions will be welcomed once Phase 1 is complete.

## 📄 License

[Add license information]

## 🎮 Example Stories

Check out the example stories in the `examples/` directory:
- `investigation.yaml` - A noir detective story
- `the_last_signal.yaml` - A sci-fi thriller

Load these in the app to see the engine in action!