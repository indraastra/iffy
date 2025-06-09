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

## 🤔 Why Iffy Instead of ChatGPT/Claude/Gemini?

**Fair question!** Modern AI chat products are powerful and stateful. Here's what Iffy offers that's different:

### 📦 **Shareable, Reproducible Stories**
- **Iffy:** Authors write once → thousands play the exact same story with consistent rules
- **Chat products:** Each player needs the full story setup and results vary between sessions

### 🎯 **Guaranteed Story Structure**
- **Iffy:** The mystery jar is ALWAYS fish sauce, endings trigger predictably
- **Chat products:** Even with instructions, outcomes and story elements can vary

### 🎮 **Zero Fiction Maintenance**
- **Iffy:** Players just type "examine the desk" - no prompt engineering needed
- **Chat products:** Players must actively maintain the fiction and remember game rules

### ✨ **Purpose-Built Features**
- **Iffy:** Rich text rendering, save/load system, inventory display, validated state changes
- **Chat products:** Everything lives in chat bubbles, no specialized IF features

**Bottom line:** Iffy is for **creating and distributing** interactive fiction. It's not about what's impossible elsewhere - it's about what's **friction-free and purpose-built** for IF authors and players.

## 🎯 What Makes Iffy Special

### ✨ **Key Features**
- **🤖 Natural Language** - Type "examine the door" instead of rigid commands
- **📚 Perfect for Fan Fiction** - Create interactive stories in any universe you love
- **🎨 Rich Formatting** - **Bold**, *italics*, [character:names], and `[!alerts]`
- **💾 Save/Load** - Never lose progress, restore conversation history
- **🌟 Emergent Storytelling** - AI responds to unexpected actions, creates surprise moments
- **✍️ Simple Creation** - Write stories in YAML, no programming required

## 🚀 Get Started

1. **🎮 [Play Stories](https://indraastra.github.io/iffy/)** - Try example stories instantly (no setup required)
2. **🤖 Enable AI** - Get a free [Anthropic API key](https://console.anthropic.com) for natural language commands  
3. **✍️ Create Stories** - Use our [Story Creation Guide](./docs/format.md) to write your own adventures

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

## 🌟 Inspiration & Acknowledgments

Iffy stands on the shoulders of giants in interactive fiction and AI storytelling:

### **Inkle's Ink**
The brilliant [Ink narrative scripting language](https://www.inklestudios.com/ink/) showed us how powerful a purpose-built language for interactive stories could be. While Iffy uses YAML for accessibility, Ink's approach to branching narratives and state management deeply influenced our design philosophy.

### **AI Dungeon**
[AI Dungeon](https://aidungeon.io/) pioneered AI-driven interactive storytelling, proving that language models could create compelling emergent narratives. Iffy builds on this foundation by adding structured authorship - giving writers control while preserving the magic of AI-powered natural language understanding.

Together, these inspirations led to Iffy's unique approach: **structured stories with emergent gameplay**, where authors define the world and AI brings it to life through natural conversation.

### **Built with Claude**
Iffy itself was developed in collaboration with Claude (Anthropic's AI assistant). This meta approach - using AI to build an AI-powered storytelling engine - allowed for rapid prototyping, thoughtful architecture decisions, and iterative improvements based on real-time testing. The development process showcased how AI can be a powerful programming partner, not just for playing stories but for creating the tools that enable them.

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

MIT License - see [LICENSE](./LICENSE) file for details.

This project is open source and welcomes contributions from the community!

---

**Ready to create or play interactive fiction?** 

🌐 **[Start Playing Now](https://indraastra.github.io/iffy/)** - No installation required!

Create stories that respond to natural language, build fan fiction that readers can interact with, and explore the future of narrative gaming. The only limit is your imagination! 🎮✨