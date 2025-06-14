## **Rich Text Markup Proposal**

### **Format Structure**

This system uses a **JSON wrapper with enhanced narrative markup** for optimal balance of functionality and reliability:

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
- **Each format does what it's best at** - JSON for data, markup for text enhancement

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

This hybrid approach provides **rich player experience** through enhanced narrative presentation while maintaining **robust engine reliability** through structured JSON metadata.