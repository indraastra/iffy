# Iffy - Interactive Fiction Engine

An impressionistic and interpretive approach to interactive storytelling. Iffy lets you sketch story worlds that adapt and respond to player creativity through natural conversation, bringing fiction to life with AI-powered understanding.

**For creators**: Writers and storytellers who want to craft interactive experiences where players can type anything — not just choose from menus — without learning to code.

**For players**: Those who love story-driven games and want true freedom to interact naturally, typing whatever comes to mind instead of clicking predetermined choices.

## Quick Start

### Play Stories Now
Visit [https://indraastra.github.io/iffy/](https://indraastra.github.io/iffy/) to try example stories instantly. No installation required!

**Note**: You'll need an API key to play. Get started with a free tier:
- [Google AI Studio](https://makersuite.google.com/app/apikey) - Unlimited free access (rate limited)
- [Anthropic](https://console.anthropic.com) - $10 monthly free credits
- [OpenAI](https://platform.openai.com) - Paid service (free credits discontinued)

### Create Your First Story
1. **Get an API Key**: Sign up for an API key from [Google AI Studio](https://makersuite.google.com/app/apikey), [Anthropic](https://console.anthropic.com), or [OpenAI](https://platform.openai.com)
2. **Write Your Story**: Use simple YAML to sketch characters, scenes, and story beats — no programming knowledge needed. Use AI to brainstorm ideas, generate dialogue, or expand story concepts
3. **Test and Play**: Load your story and watch players explore it through completely natural conversation

## Why Use Iffy?

### Impressionistic & Interpretive
- **Sketch-Based Design**: Write story outlines as impressions; the AI interprets and renders the full experience
- **Natural Conversation**: Players interact through normal language — no command memorization
- **Emergent Narrative**: Stories adapt dynamically while maintaining narrative coherence

### No Programming Required
Define your world with simple YAML sketches. The AI handles natural language processing and dynamic responses, letting writers focus on storytelling. AI can also assist with story creation — brainstorm plots, develop characters, or generate dialogue.

### True Player Agency
No multiple-choice menus or rigid commands. Players type naturally and the system responds intelligently while respecting your story's boundaries and vision.

### Bring Your Own Model
Choose your preferred AI provider based on your priorities:

- **Anthropic** (Claude) - **Best narrative quality** with excellent creative writing and character development. Slower response times but superior storytelling.
- **Google** (Gemini) - **Fastest performance** with good quality and cost-effectiveness. Great for responsive gameplay.
- **OpenAI** (GPT-4) - Supported but not extensively tested yet.

**Performance Notes**: Based on our testing with Anthropic and Google models, Gemini provides the fastest response times for interactive gameplay, while Claude models produce the highest quality narrative prose and character interactions. The tradeoff is speed vs. storytelling excellence.

**Testing Framework**: We're actively developing comprehensive model testing. See our [development guide testing section](docs/DEVELOPMENT.md#running-tests) for automated story and engine performance testing across different model configurations.

Use your own API keys and control your costs. Mix and match models for different purposes — use powerful models for story generation and cheaper ones for background tasks.

### Why Not ChatGPT?

While AI assistants are powerful, Iffy offers something different:

**Shareable Stories**: Write once, share with thousands. Your story maintains consistency across all players.

**No Prompt Engineering**: Players just play — they don't need to maintain the fiction or coach the AI.

**Purpose-Built Features**: Save/load systems, rich text formatting, memory tracking, and specialized interactive fiction interfaces.

**Guaranteed Outcomes**: Key story beats happen when they should. That door opens when players solve the puzzle.

**Community Focus**: Export stories, share creations, and build on others' work.

## The Format

Sketch your story world and let the AI paint in the details. Perfect for writers who want emergence without losing narrative control.

Players can type anything they want — "examine the keyhole," "break down the door," "look for another way around" — and the AI responds intelligently while maintaining your story's atmosphere and direction.

**[Read the complete Story Format Guide →](docs/STORY_FORMAT.md)**

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

## Known Issues

### Action Classification Updates

The **ActionClassifier** component has been significantly improved with stricter prerequisite evaluation:

- **Improved Reliability**: Recent updates enforce strict PREREQUISITES checking before considering DESCRIPTION content, reducing false positive transitions.
- **Natural Language Conditions**: Transitions now use natural language conditions instead of artificial flags, making stories more readable and maintainable.
- **Model Recommendations**: 
  - **Gemini 2.5 Flash** provides an excellent balance of speed and quality for most use cases
  - **Gemini 2.5 Flash Lite** offers the fastest response times but may occasionally make incorrect classifications
  - **Claude models** remain the most accurate but slower for classification tasks
- **Temperature Optimization**: The classifier now uses temperature 0.1 for more consistent, deterministic results.

**Remaining Limitations**:
- Complex multi-condition logic may still challenge some models
- Gemini 2.5 Flash Lite, while fast, can occasionally misinterpret nuanced conditions
- Very abstract or metaphorical conditions work best with higher-tier models

**Authoring Tips**: Write clear, concrete transition conditions. Test critical story branches with your target model. Use the debug-classifier script to validate complex transitions.

## Get Started Today

Ready to create your first interactive story?

1. **[Try the Examples](https://indraastra.github.io/iffy/)** - Experience the impressionist approach
2. **Read the [Story Format Guide](docs/STORY_FORMAT.md)** - Learn to write engaging interactive fiction
3. **Check the [Architecture Overview](docs/ARCHITECTURE.md)** - Understand how the engine works
4. **Join the Community** - Share your stories and get feedback

## For Developers

Want to contribute or run Iffy locally?

```bash
git clone https://github.com/indraastra/iffy.git
cd iffy
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

🌐 **[Start Creating Now](https://indraastra.github.io/iffy/)**

The only limit is your imagination.