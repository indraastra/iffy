## **Rich Text Markup & UI Theming System**

### **System Overview**

This system provides **rich narrative markup** combined with **comprehensive UI theming** that allows story authors to create immersive, visually cohesive experiences while maintaining robust engine reliability.

**Core Components:**
1. **Rich Text Markup** - Enhanced narrative presentation with interactive elements
2. **UI Theme System** - Complete visual theming for game interface chrome
3. **Story-Level Themes** - Authors can specify themes in story files
4. **User Preferences** - Players can override with preferred themes

### **Rich Text Markup Format**

Uses a **JSON wrapper with enhanced narrative markup** for optimal balance of functionality and reliability:

```json
{
  "narrative": "[Sarah](character:sarah) examines the **[ancient tome](item:spell_book)** in the **[library](location:old_library)**.\n\n[!discovery] The pages glow with magical text!",
  "importance": 7,
  "memories": ["Sarah discovered magical tome", "Ancient spells revealed"],
  "signals": {"scene": "magic_revealed"},
  "reasoning": "Discovery of magic shifts story direction"
}
```

**Design Rationale:**
- **JSON wrapper** provides reliable parsing, type safety, and structured metadata
- **Rich narrative markup** enhances player experience with styled text and interactive elements
- **Clear separation** between presentation (narrative) and logic (metadata fields)
- **Vanilla JS/TS implementation** - no framework dependencies, works with existing architecture

### **Supported Markup Types**

#### **1. Character References**
```
[Display Name](character:id)
```
**Examples:**
- `[Inspector Whitmore](character:player)` 
- `[Sarah](character:sarah)`
- `[The Old Merchant](character:merchant_npc)`

**Purpose:** Style character names consistently, enable character interaction/info popups

#### **2. Item References**
```
[Display Text](item:id)
```
**Examples:**
- `[golden key](item:key)`
- `[mysterious tome](item:ancient_book)`
- `[your father's watch](item:pocket_watch)`

**Purpose:** Highlight interactive objects, enable item examination/use

#### **3. Location References**
```
[Display Name](location:id)
```
**Examples:**
- `[the ancient library](location:library)`
- `[Town Square](location:main_square)`
- `[your childhood bedroom](location:bedroom)`

**Purpose:** Style location names consistently, enable location interaction/navigation, show area details

#### **4. Text Emphasis**
```
**text** for strong emphasis
*text* for atmospheric emphasis
```
**Examples:**
- `**important discovery**` - Key story moments
- `**dramatic moment**` - Climactic events
- `*whispered words*` - Atmospheric details
- `*eerie silence*` - Mood setting

#### **5. Alert Boxes**
```
[!type] content
```
**Supported Types:**
- `[!warning] content` - Cautions, risks, time pressure
- `[!discovery] content` - Found items, learned secrets, breakthroughs  
- `[!danger] content` - Immediate threats, critical situations

**Examples:**
- `[!discovery] You found something important!`
- `[!warning] Your torch is burning low - only minutes of light remain.`
- `[!danger] The floor begins to crumble beneath your feet!`

#### **6. Nested Markup**
All markup types can be combined:
```
**The [golden key](item:key) opens the door to the [secret chamber](location:hidden_room)**
[!discovery] [Sarah](character:sarah) found the entrance to **[the catacombs](location:underground)**!
```

### **Important Design Principles**

#### **Presentation Only**
- Markup is for **styling and interaction** only
- **Does not change game state**
- State changes go in separate JSON fields (`memories`, `signals`, etc.)

#### **JSON + Markdown Hybrid Benefits**
- **Reliable parsing** - JSON structure prevents parsing failures
- **Rich presentation** - Markdown enhances player experience
- **Type safety** - Structured metadata fields with validation
- **Extensibility** - Can add new JSON fields without affecting markup
- **Tool compatibility** - Standard JSON works with all tooling

### **Implementation Specifications**

#### **Parsing Patterns**
```typescript
const markupPatterns = {
  character: /\[(.*?)\]\(character:(.*?)\)/g,
  item: /\[(.*?)\]\(item:(.*?)\)/g,
  location: /\[(.*?)\]\(location:(.*?)\)/g,
  bold: /\*\*(.*?)\*\*/g,
  italic: /\*(.*?)\*/g,
  alert: /\[!(warning|discovery|danger)\]\s*(.*?)(?=\n\n|\n$|$)/g
};
```

#### **Component Rendering**
```typescript
const CharacterName = ({ name, id }: {name: string, id: string}) => (
  <span 
    className={`character-ref character-${id}`}
    onClick={() => showCharacterDetails(id)}
  >
    {name}
  </span>
);

const ItemReference = ({ text, id }: {text: string, id: string}) => (
  <span 
    className={`item-ref item-${id}`}
    onClick={() => examineItem(id)}
    title={getItemDescription(id)}
  >
    {text}
  </span>
);

const LocationReference = ({ text, id }: {text: string, id: string}) => (
  <span 
    className={`location-ref location-${id}`}
    onClick={() => showLocationDetails(id)}
  >
    {text}
  </span>
);
```

### **Usage Guidelines for LLMs**

#### **JSON Structure Usage**
- **narrative**: Rich text with markup for player presentation
- **importance**: Numeric rating (1-10) for scene significance
- **memories**: Array of factual story developments to remember
- **signals**: Object containing scene transitions, state changes, etc.
- **reasoning**: Explanation of LLM decision-making process

#### **When to Use Each Markup Type**
- **Character markup**: First mentions, important actions, significant moments
- **Item markup**: Interactive objects, story-important items, items being used
- **Location markup**: Significant places, destinations, atmospheric locations
- **Bold emphasis**: Key story moments, important discoveries, strong emotions
- **Italic emphasis**: Atmospheric details, whispered speech, internal thoughts
- **Alerts**: Time pressure, discoveries, immediate dangers

---

## **UI Theming System**

### **Theme Definition Format**

Stories can specify themes in their YAML files using a comprehensive theming format:

```yaml
# In story file (e.g., gothic_mystery.yaml)
title: "The Haunted Manor"
author: "Gothic Stories Inc"

# Theme specification (optional)
theme:
  name: "Gothic Horror"
  id: "gothic_horror"
  
  # Core color palette
  colors:
    primary: "#2c1810"        # Dark brown
    secondary: "#8b0000"      # Dark red
    accent: "#c9b037"         # Gold
    background: "#1a1a1a"     # Near black
    surface: "#2d2d2d"        # Dark gray
    text:
      primary: "#e8e8e8"      # Light gray
      secondary: "#b8b8b8"    # Medium gray
      accent: "#c9b037"       # Gold
    
    # Markup-specific colors
    markup:
      character:
        player: "#c9b037"     # Gold for player
        npc: "#8b0000"        # Dark red for NPCs
        hover: "#ffd700"      # Bright gold on hover
      item:
        primary: "#800080"    # Purple
        interactive: "#9932cc"
        important: "#8b008b"
        hover: "#aa44aa"
      location:
        primary: "#2f4f4f"    # Dark slate gray
        current: "#556b2f"    # Dark olive
        accessible: "#696969"
        hover: "#1c1c1c"
      alerts:
        warning: 
          bg: "#3d2914"
          border: "#8b6914"
          text: "#ffd700"
        discovery:
          bg: "#1a3d1a"
          border: "#4caf50"
          text: "#90ee90"
        danger:
          bg: "#3d1414"
          border: "#8b0000"
          text: "#ff6b6b"

  # Typography
  typography:
    fonts:
      primary: "'Crimson Text', 'Times New Roman', serif"
      secondary: "'Cinzel', 'Georgia', serif"
      monospace: "'Courier New', monospace"
    sizes:
      small: "0.875rem"
      normal: "1rem"
      large: "1.25rem"
      heading: "1.5rem"
    weights:
      normal: "400"
      medium: "500"
      bold: "700"

  # UI Chrome styling
  interface:
    panels:
      background: "rgba(45, 45, 45, 0.95)"
      border: "1px solid #555"
      borderRadius: "8px"
      shadow: "0 4px 12px rgba(0, 0, 0, 0.5)"
    buttons:
      background: "#2c1810"
      backgroundHover: "#3d2414"
      border: "1px solid #8b0000"
      borderRadius: "4px"
      text: "#e8e8e8"
      textHover: "#c9b037"
    inputs:
      background: "#1a1a1a"
      border: "1px solid #555"
      borderFocus: "1px solid #c9b037"
      text: "#e8e8e8"
      placeholder: "#888"
    scrollbars:
      track: "#2d2d2d"
      thumb: "#555"
      thumbHover: "#777"

  # Visual effects
  effects:
    transitions:
      fast: "0.15s ease"
      normal: "0.3s ease"
      slow: "0.5s ease"
    animations:
      fadeIn: "fadeIn 0.5s ease"
      slideIn: "slideInUp 0.3s ease"
      pulse: "pulse 2s infinite"
    shadows:
      subtle: "0 2px 4px rgba(0, 0, 0, 0.1)"
      medium: "0 4px 8px rgba(0, 0, 0, 0.2)"
      strong: "0 8px 16px rgba(0, 0, 0, 0.3)"

# Rest of story content...
scenes:
  # ...
```

### **Built-in Theme Presets**

The engine provides several built-in themes that authors can reference:

```yaml
# Reference a built-in theme
theme: "classic"  # or "gothic", "cyberpunk", "minimal", etc.

# Or extend a built-in theme
theme:
  extends: "gothic"
  colors:
    accent: "#ff6b6b"  # Override just the accent color
```

**Available Presets:**
- **`classic`** - Traditional interactive fiction styling
- **`gothic`** - Dark, atmospheric horror theming
- **`cyberpunk`** - Neon colors with futuristic styling
- **`minimal`** - Clean, distraction-free design
- **`steampunk`** - Victorian-era inspired browns and brass
- **`modern`** - Contemporary, flat design aesthetic

### **Theme Scope & Boundaries**

**Themed Elements (Story-controlled):**
- Main game narrative area
- Input/action areas
- Story-specific UI panels
- Rich text markup styling
- Game background and chrome
- Player interaction elements

**Fixed Elements (System-controlled):**
- Debug panels and developer tools
- Settings/preferences menus
- Error messages and system dialogs
- Engine status indicators
- File loading/saving interfaces

---

## **Implementation Architecture**

### **1. Theme Management System**

```typescript
// /src/theming/ThemeManager.ts
export interface GameTheme {
  name: string;
  id: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  interface: InterfaceTheme;
  effects: ThemeEffects;
}

export class ThemeManager {
  private currentTheme: GameTheme;
  private userOverrides: Partial<GameTheme>;
  private cssVariables: Map<string, string>;

  constructor() {
    this.currentTheme = BUILT_IN_THEMES.classic;
    this.userOverrides = this.loadUserPreferences();
    this.cssVariables = new Map();
  }

  // Apply theme from story specification
  applyStoryTheme(storyTheme?: GameTheme | string): void {
    if (!storyTheme) return;
    
    const theme = typeof storyTheme === 'string' 
      ? this.getBuiltInTheme(storyTheme)
      : storyTheme;
      
    this.currentTheme = this.mergeThemes(theme, this.userOverrides);
    this.updateCSSVariables();
    this.applyToDOM();
  }

  // User preference overrides
  setUserOverride(path: string, value: string): void {
    this.setNestedProperty(this.userOverrides, path, value);
    this.saveUserPreferences();
    this.applyStoryTheme(this.currentTheme);
  }

  private updateCSSVariables(): void {
    this.cssVariables.clear();
    
    // Generate CSS custom properties from theme
    this.generateCSSVariables(this.currentTheme);
  }

  private applyToDOM(): void {
    const root = document.documentElement;
    
    // Apply CSS variables to root
    this.cssVariables.forEach((value, property) => {
      root.style.setProperty(property, value);
    });
    
    // Add theme class to body for CSS targeting
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .trim() + ` theme-${this.currentTheme.id}`;
  }
}
```

### **2. Markup Rendering System**

```typescript
// /src/markup/MarkupRenderer.ts
export class MarkupRenderer {
  private parser: MarkupParser;
  private resolver: MarkupEntityResolver;
  private interactionHandler: MarkupInteractionHandler;

  constructor(context: MarkupContext) {
    this.parser = new MarkupParser();
    this.resolver = new MarkupEntityResolver(context);
    this.interactionHandler = new DefaultInteractionHandler(this.resolver);
  }

  render(narrative: string): HTMLElement {
    const nodes = this.parser.parse(narrative);
    const container = document.createElement('div');
    container.className = 'markup-content';
    
    nodes.forEach(node => {
      const element = this.renderNode(node);
      container.appendChild(element);
    });
    
    return container;
  }

  private renderNode(node: MarkupNode): HTMLElement {
    switch (node.type) {
      case 'character':
        return this.createCharacterElement(node);
      case 'item':
        return this.createItemElement(node);
      case 'location':
        return this.createLocationElement(node);
      case 'bold':
        return this.createBoldElement(node);
      case 'italic':
        return this.createItalicElement(node);
      case 'alert':
        return this.createAlertElement(node);
      default:
        return this.createTextElement(node);
    }
  }

  private createCharacterElement(node: MarkupNode): HTMLElement {
    const { name, id } = node.props!;
    const character = this.resolver.resolveCharacter(id);
    
    const span = document.createElement('span');
    span.className = `markup-character ${
      id === 'player' ? 'markup-character--player' : 'markup-character--npc'
    }`;
    span.textContent = name;
    span.setAttribute('data-character-id', id);
    
    if (character?.sketch) {
      span.title = character.sketch;
    }
    
    span.addEventListener('click', () => {
      this.interactionHandler.onCharacterClick?.(id, character);
    });
    
    return span;
  }

  // ... other element creation methods
}
```

### **3. Integration with Game Manager**

```typescript
// /src/ui/ImpressionistGameManager.ts (modify existing)
export class ImpressionistGameManager {
  private themeManager: ThemeManager;
  private markupRenderer: MarkupRenderer;

  constructor() {
    // ... existing initialization
    
    this.themeManager = new ThemeManager();
    this.markupRenderer = new MarkupRenderer(this.getMarkupContext());
    
    this.initializeThemeSystem();
  }

  loadStory(story: ImpressionistStory): void {
    // ... existing story loading logic
    
    // Apply story theme if specified
    if (story.theme) {
      this.themeManager.applyStoryTheme(story.theme);
    }
    
    // Update markup context for new story
    this.markupRenderer = new MarkupRenderer(this.getMarkupContext());
  }

  private renderResponse(response: DirectorResponse): void {
    // Replace basic narrative rendering with markup rendering
    const narrativeElement = this.markupRenderer.render(response.narrative);
    
    const outputContainer = document.querySelector('.narrative-output');
    if (outputContainer) {
      outputContainer.innerHTML = '';
      outputContainer.appendChild(narrativeElement);
    }
  }

  private initializeThemeSystem(): void {
    // Add theme selector to settings
    this.addThemeSelector();
    
    // Set up theme customization if needed
    this.setupThemeCustomization();
  }
}
```

### **4. CSS Architecture**

```css
/* /src/theming/base.css - Core theme variable definitions */
:root {
  /* Default theme variables - overridden by ThemeManager */
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-accent: #f59e0b;
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  
  /* Markup-specific variables */
  --markup-character-player: var(--color-accent);
  --markup-character-npc: var(--color-secondary);
  --markup-character-hover: var(--color-primary);
  --markup-item-primary: #8b5cf6;
  --markup-item-hover: #7c3aed;
  --markup-location-primary: #059669;
  --markup-location-hover: #047857;
  
  /* Interface variables */
  --interface-panel-bg: var(--color-surface);
  --interface-panel-border: #e2e8f0;
  --interface-button-bg: var(--color-primary);
  --interface-button-text: #ffffff;
  --interface-input-bg: var(--color-background);
  --interface-input-border: #d1d5db;
  
  /* Typography variables */
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-secondary: Georgia, 'Times New Roman', serif;
  --font-size-normal: 1rem;
  --font-size-large: 1.25rem;
  --font-weight-normal: 400;
  --font-weight-bold: 700;
  
  /* Effect variables */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
  --shadow-subtle: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Theme-specific overrides applied via body classes */
.theme-gothic {
  --color-primary: #2c1810;
  --color-background: #1a1a1a;
  --color-text-primary: #e8e8e8;
  /* ... gothic-specific values */
}

.theme-cyberpunk {
  --color-primary: #00ffff;
  --color-background: #0a0a0a;
  --color-accent: #ff00ff;
  /* ... cyberpunk-specific values */
}
```

```css
/* /src/markup/markup.css - Markup-specific styling */
.markup-content {
  font-family: var(--font-primary);
  font-size: var(--font-size-normal);
  line-height: 1.6;
  color: var(--color-text-primary);
}

.markup-character {
  color: var(--markup-character-player);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  text-decoration: underline;
  text-decoration-style: dotted;
  transition: var(--transition-fast);
}

.markup-character--npc {
  color: var(--markup-character-npc);
}

.markup-character:hover {
  color: var(--markup-character-hover);
  text-shadow: var(--shadow-subtle);
}

.markup-item {
  color: var(--markup-item-primary);
  font-style: italic;
  cursor: pointer;
  transition: var(--transition-fast);
}

.markup-item:hover {
  color: var(--markup-item-hover);
}

.markup-location {
  color: var(--markup-location-primary);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: var(--transition-fast);
}

.markup-location:hover {
  color: var(--markup-location-hover);
}

.markup-alert {
  padding: 12px 16px;
  margin: 12px 0;
  border-radius: 6px;
  border-left: 4px solid;
  font-weight: var(--font-weight-bold);
}

.markup-alert--warning {
  background-color: var(--alert-warning-bg);
  border-color: var(--alert-warning-border);
  color: var(--alert-warning-text);
}

.markup-alert--discovery {
  background-color: var(--alert-discovery-bg);
  border-color: var(--alert-discovery-border);
  color: var(--alert-discovery-text);
}

.markup-alert--danger {
  background-color: var(--alert-danger-bg);
  border-color: var(--alert-danger-border);
  color: var(--alert-danger-text);
}
```

```css
/* /src/theming/interface.css - UI chrome styling */
.game-panel {
  background: var(--interface-panel-bg);
  border: var(--interface-panel-border);
  border-radius: 8px;
  box-shadow: var(--shadow-medium);
  padding: 16px;
}

.game-button {
  background: var(--interface-button-bg);
  color: var(--interface-button-text);
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: var(--transition-normal);
}

.game-button:hover {
  background: var(--interface-button-hover-bg);
}

.game-input {
  background: var(--interface-input-bg);
  border: 1px solid var(--interface-input-border);
  border-radius: 4px;
  padding: 8px 12px;
  font-family: var(--font-primary);
  font-size: var(--font-size-normal);
  color: var(--color-text-primary);
  transition: var(--transition-fast);
}

.game-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
}

/* System UI remains unthemed */
.debug-panel,
.settings-modal,
.system-dialog {
  /* Fixed styling for system elements */
  background: #ffffff !important;
  color: #000000 !important;
  border: 1px solid #ccc !important;
}
```

---

## **Implementation Phases**

### **Phase 1: Core Markup System**
**Timeline: 1-2 weeks**

- Implement `MarkupParser` class for text parsing
- Create `MarkupRenderer` for DOM element generation
- Add basic character, item, location, and emphasis markup
- Integrate with existing narrative rendering

**Deliverables:**
- Basic markup parsing and rendering
- Character/item/location click interactions
- Bold/italic text emphasis
- Integration with `ImpressionistGameManager`

### **Phase 2: Theme Foundation**
**Timeline: 1-2 weeks**

- Implement `ThemeManager` class
- Create CSS variable system
- Add built-in theme presets (classic, gothic, cyberpunk)
- Basic theme switching functionality

**Deliverables:**
- Theme management system
- CSS variable generation
- Theme presets
- Theme selector UI component

### **Phase 3: Story-Level Theming**
**Timeline: 1 week**

- Add theme specification to story YAML format
- Update `ImpressionistParser` to handle theme data
- Implement theme inheritance and merging
- Auto-apply story themes on load

**Deliverables:**
- Story theme specification support
- Theme parsing and validation
- Automatic theme application
- Theme inheritance system

### **Phase 4: UI Chrome Theming**
**Timeline: 1-2 weeks**

- Extend theming to all game UI elements
- Add interface styling variables
- Update existing UI components to use theme variables
- Ensure system elements remain unthemed

**Deliverables:**
- Complete UI theming coverage
- Interface component updates
- System/game UI separation
- Theme boundary enforcement

### **Phase 5: Advanced Features**
**Timeline: 1-2 weeks**

- User theme customization
- Theme export/import
- Advanced markup features (nested elements, custom styling)
- Performance optimizations

**Deliverables:**
- User customization interface
- Theme persistence
- Advanced markup capabilities
- Performance monitoring

### **Phase 6: Polish & Documentation**
**Timeline: 1 week**

- Comprehensive testing
- Documentation and examples
- Theme creation guide for authors
- Performance optimization

**Deliverables:**
- Full test coverage
- Author documentation
- Theme creation tools
- Performance benchmarks

---

## **Usage Guidelines**

### **For Story Authors**

**Basic Theme Usage:**
```yaml
# Use a built-in theme
theme: "gothic"

# Or define a custom theme
theme:
  name: "My Custom Theme"
  colors:
    primary: "#ff6b6b"
    background: "#2c3e50"
  # ... rest of theme
```

**Markup in LLM Prompts:**
```
When writing narrative responses, use markup to enhance the presentation:

- Reference characters: [Sarah](character:sarah) or [Inspector](character:player)
- Highlight items: [golden key](item:key) or [ancient tome](item:spell_book)  
- Mark locations: [library](location:old_library) or [town square](location:square)
- Add emphasis: **dramatic moments** and *atmospheric details*
- Use alerts: [!discovery] Important findings! or [!warning] Time pressure!
```

### **For Players**

Players can override story themes through the settings interface:
- Select preferred base theme
- Customize individual colors and elements
- Save personalized theme preferences
- Themes persist across different stories

### **For Developers**

The theming system provides clear separation between:
- **Game UI** (themed) - Narrative, interactions, game chrome
- **System UI** (fixed) - Debug panels, settings, file operations
- **Markup** (themed) - Rich text within narratives

This hybrid approach provides **rich, immersive player experiences** through comprehensive theming while maintaining **robust engine reliability** and **clear architectural boundaries**.