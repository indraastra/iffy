# Iffy Impressionist - AI-Powered Interactive Fiction

Create stories that come alive through natural conversation. Iffy combines the best of traditional interactive fiction with modern AI, letting players explore your worlds through natural language while keeping your story structure intact.

**Perfect for writers who want to create interactive stories without losing creative control.**

## What Makes This Special?

### Two Story Formats, One Engine
- **Traditional Format**: Structured flows and precise branching for classic IF experiences
- **Impressionist Format**: Sketch-based storytelling that adapts naturally to player creativity
- **Same Engine**: Both formats run on the same powerful AI-driven foundation

### Natural Language Gaming
Type "examine the mysterious door" or "ask the detective about the case" - no memorizing command lists or rigid syntax. The AI understands what you mean and responds authentically within your story's world.

### Creative Freedom with Structure
Authors define the world, characters, and story beats. The AI handles the conversation, bringing your vision to life while respecting your narrative boundaries.

## Quick Start

### Play Stories Now
Visit [https://indraastra.github.io/iffy-impressionist/](https://indraastra.github.io/iffy-impressionist/) to try example stories instantly. No installation required!

### Create Your First Story
1. **Get an API Key**: Sign up for a free [Anthropic API key](https://console.anthropic.com)
2. **Choose Your Format**: 
   - Start with **Impressionist** format for sketch-based storytelling
   - Use **Traditional** format for detailed branching narratives
3. **Write Your Story**: Use simple YAML to define characters, locations, and scenes
4. **Test and Play**: Load your story and watch it come alive

## Story Formats Explained

### Impressionist Format (Recommended for Beginners)
Sketch out scenes and let the AI fill in the details naturally:

```yaml
title: "The Detective's Office"
context: "A noir mystery in 1940s Los Angeles"

scenes:
  - id: "office_investigation"
    sketch: |
      The private detective's office is dimly lit, papers scattered 
      across the desk. A half-empty bottle of whiskey catches the 
      streetlight. Something important is hidden here.
    leads_to:
      found_clue: "when the player discovers the hidden evidence"
```

Perfect for emergent storytelling where player creativity drives the narrative forward.

### Traditional Format (For Detailed Control)
Define exact flows, character dialogue, and branching paths:

```yaml
title: "The Mansion Mystery"
characters:
  - id: "butler"
    name: "James"
    traits: ["formal", "secretive"]

flows:
  - id: "meet_butler"
    type: "dialogue"
    participants: ["butler", "player"]
    exchanges:
      - speaker: "butler"
        text: "Good evening. I'm afraid the master is not receiving visitors."
```

Ideal for authors who want precise control over dialogue and story branching.

## What You Can Build

### Interactive Fiction Classics
- **Mystery Stories**: Let players investigate clues, interview suspects, solve cases
- **Fantasy Adventures**: Explore magical worlds, collect items, battle creatures  
- **Horror Experiences**: Build tension through atmospheric exploration
- **Romance Narratives**: Character-driven stories with meaningful choices

### Modern Interactive Experiences
- **Fan Fiction**: Bring beloved characters and worlds to interactive life
- **Educational Stories**: Teaching through engaging narrative experiences
- **Experimental Fiction**: Push the boundaries of what storytelling can be
- **Personal Narratives**: Interactive memoirs, therapy tools, creative exercises

## Why Iffy Instead of ChatGPT?

Great question! While AI assistants are powerful, Iffy offers something different:

**Shareable Stories**: Write once, share with thousands. Your story maintains consistency across all players.

**No Prompt Engineering**: Players just play - they don't need to maintain the fiction or remember complex rules.

**Purpose-Built Features**: Save/load systems, rich text formatting, inventory tracking, and specialized IF interfaces.

**Guaranteed Outcomes**: That locked door opens when players find the key, every time. Story beats happen when they should.

**Community and Sharing**: Export stories, share creations, and build on others' work.

## Get Started Today

Ready to create your first interactive story?

1. **[Try the Examples](https://indraastra.github.io/iffy-impressionist/)** - Experience both story formats
2. **Read the [Story Format Guide](docs/STORY_FORMAT.md)** - Learn to write engaging interactive fiction
3. **Check the [Architecture Overview](docs/ARCHITECTURE.md)** - Understand how the engine works
4. **Join the Community** - Share your stories and get feedback

## For Developers

Want to contribute or run Iffy locally?

```bash
git clone https://github.com/indraastra/iffy-impressionist.git
cd iffy-impressionist
npm install
npm run dev
```

Open http://localhost:3000 and start creating!

**Full setup guide**: See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for development details.

## Support the Project

If you enjoy Iffy and want to support its development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/indraastra)

Your support helps keep the project growing and enables new features for the interactive fiction community!

## License

MIT License - see [LICENSE](LICENSE) file for details.

This project is open source and welcomes contributions from writers, developers, and storytellers of all kinds.

---

**Ready to bring your stories to life?**

🌐 **[Start Creating Now](https://indraastra.github.io/iffy-impressionist/)**

The only limit is your imagination.