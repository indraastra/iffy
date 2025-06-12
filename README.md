# Iffy - Impressionistic Fiction Engine

Create stories that come alive through natural conversation. Iffy lets you sketch story worlds that adapt and respond to player creativity while maintaining your narrative vision.

**Perfect for creators**: Writers, game designers, and storytellers who want to create interactive fiction where players can type anything—not just choose from options—without learning any programming.

**Perfect for players**: Story-driven game lovers who want the freedom to interact naturally—typing whatever comes to mind for truly emergent storytelling instead of clicking predetermined choices.

## What Makes This Special?

### Impressionist Storytelling
- **Sketch-Based Design**: Write minimal story outlines, let AI paint the details
- **Natural Language**: Players converse naturally - no command memorization
- **Emergent Narrative**: Stories adapt to player creativity while staying true to your vision

### No Programming Required
Writers focus on storytelling, not code. Define your world with simple YAML sketches—the AI handles all the complex natural language processing and dynamic responses.

### True Player Freedom
No multiple choice menus or rigid commands. Players type naturally and the AI responds intelligently while staying true to your story's world and characters.

## Quick Start

### Play Stories Now
Visit [https://indraastra.github.io/iffy-impressionist/](https://indraastra.github.io/iffy-impressionist/) to try example stories instantly. No installation required!

### Create Your First Story
1. **Get an API Key**: Sign up for a free [Anthropic API key](https://console.anthropic.com)
2. **Write Your Story**: Use simple YAML to sketch characters, scenes, and story beats—no programming knowledge needed
3. **Test and Play**: Load your story and watch players explore it through completely natural conversation

## The Impressionist Format

Sketch out your story world and let the AI paint the details. Perfect for writers who want emergence without losing narrative control:

```yaml
title: "The Locked Door"
context: "You need to get through a locked door."

scenes:
  - id: "locked_door"
    sketch: |
      You stand before a heavy wooden door, its surface worn smooth 
      by countless hands. The iron handle refuses to budge - definitely 
      locked. The keyhole stares at you like a dark eye, taunting in 
      its simplicity. There must be a way through.
    leads_to:
      found_solution: "when the player finds a way through"

endings:
  variations:
    - id: "success"
      when: "player exits through the unlocked door"
      sketch: "You step into the unknown."
```

Players can type anything they want—"examine the keyhole," "break down the door," "look for another way around"—and the AI responds intelligently while maintaining your story's atmosphere and direction.

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