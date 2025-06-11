# Architecture Overview

Iffy Impressionist is built as a modern web application that brings AI-powered interactive fiction to life. Here's how it all works together.

## The Big Picture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your Story    │    │   Iffy Engine    │    │  Anthropic AI   │
│   (YAML file)   │───▶│   (TypeScript)   │───▶│   (Claude API)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Web Browser    │
                       │  (Interactive    │
                       │   Experience)    │
                       └──────────────────┘
```

**Simple flow**: You write a story → Iffy loads it → Players interact through natural language → AI responds within your story's world.

## Core Components

### 1. Story Formats
Two ways to write interactive fiction, same powerful engine:

**Impressionist Format** (Sketch-based)
- Define scenes with atmospheric descriptions
- Let AI interpret player actions naturally
- Perfect for emergent, creative storytelling

**Traditional Format** (Flow-based)  
- Structured dialogue trees and narrative beats
- Precise control over branching and choices
- Ideal for complex, branching narratives

### 2. Game Engine
The heart of Iffy that makes everything work:

- **Story Parser**: Reads your YAML and validates it
- **Game State Manager**: Tracks what's happened, where players are, what they have
- **AI Director**: Sends context to Claude API and interprets responses
- **Memory System**: Remembers the entire conversation for consistent storytelling

### 3. User Interface
Clean, focused interface for storytelling:

- **Message Display**: Rich text with formatting, character highlighting, alerts
- **Command Input**: Natural language processing with helpful suggestions
- **Save System**: Auto-save, manual saves, and crash recovery
- **Story Loader**: Import stories from files or choose built-in examples

## How Player Actions Work

1. **Player types**: "examine the mysterious door"
2. **Engine processes**: Combines current story state with player input
3. **AI interprets**: Claude understands the action within story context  
4. **Response generated**: AI creates appropriate narrative response
5. **State updates**: Engine tracks changes (location, inventory, flags)
6. **Display updated**: Player sees rich, formatted response

## Memory and Context Management

Iffy maintains rich context for consistent storytelling:

**What the AI Always Knows:**
- Complete story definition (characters, locations, tone)
- Full conversation history 
- Current game state (location, inventory, completed events)
- Story format guidelines and rules

**Smart Memory Management:**
- Recent interactions kept in full detail
- Older interactions summarized to key events
- Character personalities and story tone preserved
- Critical story beats never forgotten

## File Structure

```
src/
├── engine/           # Core game logic
│   ├── gameEngine.ts           # Main engine orchestration
│   ├── impressionistEngine.ts  # Sketch-based story handling
│   ├── storyParser.ts          # YAML story validation
│   └── memoryManager.ts        # Context and history management
├── ui/               # User interface components  
│   ├── GameManager.ts          # Main game controller
│   ├── MessageDisplay.ts       # Rich text rendering
│   └── SaveManager.ts          # Save/load functionality
├── services/         # External integrations
│   └── anthropicService.ts     # Claude API communication
└── types/            # TypeScript definitions
    ├── story.ts                # Traditional format types
    └── impressionistStory.ts   # Impressionist format types
```

## Key Technologies

**Frontend**: Pure TypeScript with modern web APIs
**AI**: Anthropic's Claude API for natural language understanding  
**Bundling**: Vite for fast development and optimized builds
**Testing**: Vitest for comprehensive test coverage
**Deployment**: Static site hosting (GitHub Pages)

## Performance Characteristics

- **Bundle Size**: ~200KB compressed
- **Load Time**: Under 2 seconds on average connections
- **Memory Usage**: Efficient context management keeps memory low
- **Responsiveness**: UI updates happen instantly, AI responses typically under 3 seconds

## Security & Privacy

**Client-Side First**: Everything runs in your browser - no server required
**API Key Control**: You control your own Anthropic API key
**No Data Collection**: Stories and saves stay on your device
**Content Validation**: All story content validated before execution

## Development Workflow

```bash
# Start development server
npm run dev

# Run story validation
npm run validate-story examples/my_story.yaml

# Run tests  
npm run test

# Build for production
npm run build
```

## Extending Iffy

Want to add new features or story mechanics?

**Story Formats**: Easy to extend with new YAML structures
**UI Components**: Modular design makes adding features straightforward  
**AI Integration**: Well-defined interfaces for adding new AI providers
**Save Formats**: Extensible save system for new data types

## Questions?

The architecture is designed to be approachable for both story writers and developers. Each component has a clear responsibility, making the system easy to understand and modify.

**For story writers**: Focus on the YAML formats - the engine handles the complexity.
**For developers**: Check out the TypeScript interfaces and modular component design.