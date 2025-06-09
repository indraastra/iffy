# Iffy - Interactive Fiction for Everyone

Create and play interactive stories powered by AI. Write adventures, mysteries, romances, fan fiction, or any narrative you can imagine - then play them with natural language commands like "examine the mysterious door" or "ask the detective about the case."

**✨ Perfect for fan fiction writers, interactive storytellers, and anyone who loves choice-driven narratives!**

## 🎮 Try It Now

**No installation required!** Visit the live app and start playing stories immediately:

🌐 **[Play Iffy Stories](https://indraastra.github.io/iffy/)** (Click "Load" to try example stories)

## ⚠️ Important Notice: Dialogue Flows

**Current Limitation:** The dialogue flow system (`type: "dialogue"`) is currently broken and non-functional. While the story format supports dialogue flows, they do not properly trigger or execute in the current engine implementation.

**Workaround:** Use `type: "narrative"` flows instead. The AI naturally handles character conversations and dialogue through narrative flows, often creating more compelling interactions than rigid dialogue trees would provide.

**Status:** This is a **major TODO** item. See our [Dialogue System v2 Proposal](./docs/proposals/dialogue-v2.md) for the planned redesign that will address these issues and create a more elegant conversation system.

**Impact:** Most story types work perfectly (mysteries, adventures, explorations), but branching conversation stories may need to rely on narrative flow structure for now.

## 🎯 What Makes Iffy Special

### 🤖 **AI-Powered Natural Language**
Instead of typing rigid commands like "go north," you can write naturally:
- *"I want to examine that mysterious door more closely"*
- *"Ask the detective what they think happened here"*  
- *"Search around the room for anything useful"*
- *"Tell Alex how I really feel about them"*

The AI understands your intent and responds contextually to your story.

### 📚 **Perfect for Fan Fiction & Creative Writing**
- **Expand your favorite universes** - Write stories in any fictional world you love
- **Interactive romances** - Create choice-driven relationship stories  
- **Character exploration** - Let readers interact with beloved characters
- **"What if" scenarios** - Explore alternate storylines and endings
- **Collaborative storytelling** - Share interactive stories with your community

### 🎨 **Beautiful, Immersive Stories**
- **Rich text formatting** with **bold**, *italics*, [character:highlighting], and `[!alert]` boxes
- **Dynamic themes** - Stories can define their own color schemes and atmosphere
- **Save/load system** - Players never lose their progress
- **Conversation memory** - The AI remembers previous interactions for rich, continuous narratives

### 🌟 **Emergent Gameplay & Narrative**
- **Adaptive storytelling** - The AI responds to unexpected player actions
- **Dynamic character development** - Characters evolve based on player interactions
- **Emergent plot threads** - New story elements can emerge from player creativity
- **Open-ended exploration** - Players can discover content beyond what you explicitly wrote
- **Surprise interactions** - The AI can create meaningful moments you never anticipated

### ✍️ **Simple Story Creation**
Write stories in easy-to-read YAML format:
- **No programming required** - Just write your story content
- **Automatic validation** - Catch errors before publishing
- **Flexible structure** - Linear stories, branching narratives, or open exploration
- **Success conditions** - Define multiple endings based on player choices

## 🚀 Get Started in 3 Steps

### 🎮 **Step 1: Play Stories**
Visit the live app and try our example stories:
1. **Click "Load"** to see the story gallery
2. **Choose a story** that interests you:
   - **The Interrogation** - Serious crime drama about desperate choices
   - **Coffee Confessional** - Intimate conversation about unspoken feelings  
   - **The Great Sandwich Crisis** - Hilarious soap opera about making lunch
3. **Start playing** - Try typing naturally like "look around" or "ask about the case"

### 🤖 **Step 2: Enable AI (Recommended)**
For the full natural language experience:
1. **Get a free API key** from [Anthropic Console](https://console.anthropic.com) (free tier available)
2. **Click Settings** in the app and enter your key
3. **Now try natural language** like:
   - *"I want to examine that coffee cup more closely"*
   - *"Tell me what you're really thinking"*
   - *"Search the room for anything suspicious"*

**Note:** The app works without an API key using basic commands like `look`, `inventory`, `go north`.

### ✍️ **Step 3: Create Your Own Stories**
Ready to write? Check out our [Story Creation Guide](./docs/format.md) or see the simple example below!

---

## 🎭 Fan Fiction & Creative Communities

**Iffy is perfect for fan fiction writers and creative communities!**

### 📖 **Expand Your Favorite Worlds**
- **Harry Potter:** Create interactive adventures at Hogwarts
- **Marvel/DC:** Let readers become heroes in superhero stories  
- **Anime/Manga:** Build choice-driven stories in beloved universes
- **TV/Movies:** Explore "what if" scenarios with favorite characters
- **Books:** Continue stories beyond the original endings

### 💕 **Interactive Romance & Relationships**
- **Character dating sims** - Romance your favorite characters
- **Relationship building** - Develop meaningful connections through choices
- **Multiple endings** - Different relationship outcomes based on player actions
- **Emotional storytelling** - The AI creates nuanced, contextual responses

### 🌍 **Community Storytelling**
- **Share your creations** - Export stories as files to share with others
- **Collaborative writing** - Work together on interactive narratives  
- **Reader engagement** - Let your audience influence story direction
- **Feedback loops** - See how players interact with your characters

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

Make your stories visually compelling with simple markup:

- `**bold text**` - Emphasize important moments and discoveries
- `*italic text*` - Add atmosphere and subtle emphasis  
- `[character:Name]` - Character names get special highlighting
- `[item:Object]` - Important items shine with golden highlighting
- `[!warning]`, `[!discovery]`, `[!danger]` - Eye-catching alert boxes for dramatic moments

## 🎮 Example Stories

Try our showcase stories to see what's possible:

### 🕵️ **The Interrogation**
A serious crime drama about desperation and impossible choices. Features multiple endings based on how deeply you investigate and how much empathy you show. Can you uncover the full truth behind a desperate crime?

### 💕 **Coffee Confessional**  
An intimate conversation between friends where unspoken feelings hang in the air. Navigate the delicate dynamics of friendship and potential romance. Will you create a safe space for vulnerability, or will walls stay up?

### 🥪 **The Great Sandwich Crisis**
Hilariously over-the-top soap opera drama about making lunch. Every action is treated with EPIC IMPORTANCE and DRAMATIC CONSEQUENCES. Perfect for seeing how formatting and tone can create comedy.

**Load any story directly from the app's gallery!**

## 📚 Resources & Documentation

### 📖 **For Story Writers**
- **[Story Creation Guide](./docs/format.md)** - Complete YAML format reference and examples
- **[Story Engine Documentation](./docs/story-engine.md)** - How the AI system works with your stories
- **[Rich Text Formatting Guide](./docs/format.md#rich-text)** - Make your stories visually stunning

### 🎯 **Community & Inspiration**  
- **[Example Stories](./examples/)** - Study our showcase stories for inspiration
- **[Fan Fiction Ideas](./docs/fanfiction-guide.md)** - Tips for adapting existing worlds
- **Share your stories** - Export and share your creations with others

### 💻 **For Developers**
Want to contribute to Iffy or run it locally?
- **[Development Guide](./docs/development-guide.md)** - Complete developer setup and workflow
- **[Architecture Overview](./docs/architecture.md)** - System design and components
- **[Contributing Guidelines](./docs/development-guide.md#contributing-guidelines)** - How to contribute code or stories

## 💜 Support the Project

If you enjoy Iffy and want to support its development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/indraastra)

Your support helps keep the project growing and enables new features for the interactive fiction community!

## 🤝 Contributing & Community

Love interactive fiction? Here's how you can help make Iffy even better:

### 📖 **Story Creators Welcome!**
- **Write showcase stories** - Demonstrate creative uses of the engine
- **Share fan fiction** - Create interactive versions of your favorite stories
- **Test and feedback** - Try the engine and tell us what works (and what doesn't)
- **Documentation help** - Improve guides for new writers

### 💻 **Developers & Designers**
- **UI/UX improvements** - Make the experience even more beautiful
- **AI enhancements** - Improve how the system understands natural language
- **Bug reports & fixes** - Help us squash issues and improve reliability
- **Feature ideas** - Propose new capabilities via GitHub issues

**Get involved:** Check our [Contributing Guide](./docs/development-guide.md#contributing-guidelines) or just start by trying the app and sharing your thoughts!

---

## 🛠️ Developer Setup

Want to run Iffy locally or contribute code? 

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Quick Setup
```bash
git clone https://github.com/indraastra/iffy.git
cd iffy
npm install
npm run dev
```
Open http://localhost:3000 and you're ready to go!

**Full developer documentation:** [Development Guide](./docs/development-guide.md)

---

## 📄 License

[Add license information]

---

**Ready to create or play interactive fiction?** 

🌐 **[Start Playing Now](https://indraastra.github.io/iffy/)** - No installation required!

Create stories that respond to natural language, build fan fiction that readers can interact with, and explore the future of narrative gaming. The only limit is your imagination! 🎮✨