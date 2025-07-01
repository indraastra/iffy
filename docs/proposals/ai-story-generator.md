# AI Story Generator: In-Browser Story Creation

**Status:** 💡 New Proposal  
**Priority:** High (Creator Empowerment Feature)  
**Motivation:** Enable users to create playable stories through natural language prompts without YAML knowledge  
**GitHub Issue:** TBD

## Problem Statement

Currently, creating stories for Iffy requires:
- **Technical Knowledge**: Understanding YAML syntax and story format structure
- **Manual Setup**: Writing detailed character sketches, scene descriptions, and ending conditions
- **Development Workflow**: External editing, validation, and testing cycles
- **Barrier to Entry**: Non-technical users cannot easily create content

This limits story creation to developers and technically-minded writers, preventing the broader community from contributing creative content.

## Vision: Natural Language Story Creation

**🌟 What if anyone could create a playable story by describing what they want?**

Imagine a user typing: *"Create a mystery story where I'm a detective investigating a haunted lighthouse. The ghost is actually an AI that's been trapped there for decades."* - and within minutes having a fully playable interactive fiction experience.

### Core Principles

1. **Natural Language Input**: Users describe stories in plain English
2. **Immediate Playability**: Generated stories load directly into the engine
3. **Iterative Refinement**: Users can modify and regenerate specific elements
4. **No Technical Barriers**: No YAML, no file editing, no development tools
5. **Quality Assurance**: Automatic validation and error correction

## User Experience Flow

### 1. Story Creation Interface

```
┌─────────────────────────────────────────────────────────────┐
│ Create Your Story                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Describe your story idea:                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ A cozy mystery set in a small bookshop where the       │ │
│ │ player is a new employee who discovers that certain    │ │
│ │ books contain real magic. When a customer goes         │ │
│ │ missing after checking out a particularly dangerous    │ │
│ │ grimoire, the player must solve the mystery using      │ │
│ │ both detective skills and newfound magical abilities.  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Story Style (optional):                                     │
│ ○ Mystery/Detective  ○ Romance  ○ Horror  ○ Sci-Fi         │
│ ○ Fantasy  ○ Literary  ○ Comedy  ○ Let AI Decide           │
│                                                             │
│ Tone (optional):                                            │
│ ○ Light & Playful  ○ Serious & Dramatic  ○ Dark & Moody   │
│ ○ Cozy & Intimate  ○ Epic & Grand  ○ Let AI Decide         │
│                                                             │
│ Length Preference:                                          │
│ ○ Short (10-15 minutes)  ○ Medium (20-30 minutes)         │
│ ○ Long (45+ minutes)                                       │
│                                                             │
│ [Generate Story]  [Use Example Prompts]                    │
└─────────────────────────────────────────────────────────────┘
```

### 2. Example Prompts Library

Pre-written prompts to inspire users and demonstrate capabilities:

```typescript
const EXAMPLE_PROMPTS = [
  {
    category: "Mystery",
    title: "The Midnight Librarian",
    prompt: "I'm a night security guard at an ancient library where books start glowing and whispering after midnight. I discover that some books are alive and contain trapped souls. When the head librarian goes missing, I must navigate both the physical library and the magical realm within the books to rescue them.",
    tags: ["supernatural", "mystery", "books", "night shift"]
  },
  
  {
    category: "Romance", 
    title: "Coffee Shop Time Loop",
    prompt: "Every morning I relive the same day working at a coffee shop, but I'm the only one who remembers. I keep trying different approaches to ask out my coworker, but the day always resets at midnight. Eventually I realize the time loop might not be about romance at all, but about preventing a tragedy.",
    tags: ["time loop", "coffee shop", "romance", "groundhog day"]
  },
  
  {
    category: "Sci-Fi",
    title: "Memory Thief",
    prompt: "In a future where memories can be extracted and sold, I work as a memory detective investigating stolen experiences. When my own childhood memories get stolen, I must navigate a black market of human experiences to reclaim my identity while questioning which memories are truly mine.",
    tags: ["cyberpunk", "memory", "identity", "detective"]
  },
  
  {
    category: "Fantasy",
    title: "Dragon Accountant", 
    prompt: "I'm an accountant who accidentally becomes the financial advisor to a dragon. The dragon's hoard is actually an investment portfolio, and various fantasy creatures keep coming to us for financial advice. When the kingdom's economy starts collapsing, we must solve the crisis using both magic and mathematics.",
    tags: ["comedy", "dragon", "modern fantasy", "economics"]
  },
  
  {
    category: "Horror",
    title: "The House Remembers",
    prompt: "I inherit a house that remembers everything that happened in it. The house communicates through creaking floors, changing room layouts, and objects that appear and disappear. As I learn the house's tragic history, I realize I must help it process its trauma or become trapped in its memories forever.",
    tags: ["psychological horror", "haunted house", "memory", "healing"]
  }
];
```

### 3. Generation Process

```
User Input → AI Processing → Validation → Refinement → Play

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Story Prompt│───▶│ LLM Analysis│───▶│ YAML        │───▶│ Validation  │
│ + Preferences│    │ + Generation│    │ Generation  │    │ + Error Fix │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                 │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│ Load & Play │◀───│ Save Story  │◀───│ Success!    │◀────────────┘
│ Immediately │    │ (if desired)│    │ Story Ready │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Technical Architecture

### 1. Story Generator Component

```typescript
interface StoryGenerationRequest {
  prompt: string;
  style?: StoryStyle;
  tone?: StoryTone;
  length?: StoryLength;
  additionalConstraints?: string[];
}

interface StoryGenerationResult {
  story: ImpressionistStory;
  metadata: {
    generatedAt: Date;
    prompt: string;
    generationId: string;
    validationAttempts: number;
  };
}

class AIStoryGenerator {
  async generateStory(request: StoryGenerationRequest): Promise<StoryGenerationResult> {
    // Phase 1: Analyze prompt and plan story structure
    const storyPlan = await this.planStory(request);
    
    // Phase 2: Generate full YAML story
    const storyYaml = await this.generateYAML(storyPlan, request);
    
    // Phase 3: Validate and fix
    const validatedStory = await this.validateAndFix(storyYaml);
    
    // Phase 4: Parse and return
    return {
      story: this.parseStory(validatedStory),
      metadata: {
        generatedAt: new Date(),
        prompt: request.prompt,
        generationId: this.generateId(),
        validationAttempts: this.lastValidationAttempts
      }
    };
  }
  
  private async planStory(request: StoryGenerationRequest): Promise<StoryPlan> {
    const planningPrompt = this.buildPlanningPrompt(request);
    const plan = await this.llmService.makeStructuredRequest(planningPrompt, StoryPlanSchema);
    return plan.data;
  }
  
  private async generateYAML(plan: StoryPlan, request: StoryGenerationRequest): Promise<string> {
    const generationPrompt = this.buildGenerationPrompt(plan, request);
    const yaml = await this.llmService.makeRequest(generationPrompt);
    return yaml;
  }
  
  private async validateAndFix(yaml: string, maxAttempts = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Validate YAML syntax and story structure
        const validation = await this.storyValidator.validate(yaml);
        if (validation.isValid) {
          return yaml;
        }
        
        // Generate fix based on validation errors
        yaml = await this.fixValidationErrors(yaml, validation.errors);
        
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Failed to generate valid story after ${maxAttempts} attempts`);
        }
        yaml = await this.fixSyntaxErrors(yaml, error);
      }
    }
    
    this.lastValidationAttempts = maxAttempts;
    throw new Error('Story generation failed validation');
  }
}
```

### 2. LLM Prompt Engineering

#### Story Planning Prompt
```typescript
const STORY_PLANNING_PROMPT = `
You are an expert interactive fiction designer. Analyze this story prompt and create a structured plan.

USER PROMPT: "${userPrompt}"
PREFERENCES: Style: ${style}, Tone: ${tone}, Length: ${length}

Create a story plan with these elements:

STORY STRUCTURE:
- Title and one-sentence blurb
- Main character (player) role and motivation
- Setting (time, place, atmosphere)
- Central conflict or mystery
- 3-5 key scenes that advance the story
- 2-3 possible ending variations

CHARACTERS:
- Player character definition
- 2-3 supporting characters with distinct personalities
- Character relationships and conflicts

WORLD ELEMENTS:
- Primary location(s) with atmospheric details
- Important objects/items that drive plot
- World rules (magical, technological, social)

INTERACTION DESIGN:
- Key decision points for player agency
- Ending conditions (what choices lead where)
- Tone and voice consistency

Respond with structured JSON matching StoryPlanSchema.
`;
```

#### YAML Generation Prompt
```typescript
const YAML_GENERATION_PROMPT = `
You are creating a complete Iffy story file in YAML format. Use this story plan and follow the exact format.

STORY PLAN:
${JSON.stringify(storyPlan, null, 2)}

REFERENCE EXAMPLE (use as format template):
${REFERENCE_STORY_YAML}

IFFY STORY FORMAT SPECIFICATION:
${STORY_FORMAT_DOCS}

GENERATION REQUIREMENTS:
1. Follow YAML syntax exactly - proper indentation, quotes, lists
2. Include all required sections: title, author, narrative, world, scenes, endings
3. Create rich, atmospheric descriptions using the specified tone
4. Design meaningful player choices that affect story direction
5. Ensure ending conditions are clear and achievable
6. Use character markup: [Character Name](character:character_id)
7. Include discovery/warning alerts: [!discovery] and [!warning]

Generate the complete YAML story file:
`;
```

### 3. Validation and Error Correction

```typescript
interface ValidationError {
  type: 'syntax' | 'structure' | 'logic' | 'format';
  message: string;
  line?: number;
  suggestion?: string;
}

class StoryValidator {
  async validate(yamlContent: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    try {
      // Parse YAML
      const story = yaml.parse(yamlContent);
      
      // Validate structure
      errors.push(...this.validateStructure(story));
      
      // Validate story logic
      errors.push(...this.validateLogic(story));
      
      // Validate format compliance
      errors.push(...this.validateFormat(story));
      
    } catch (syntaxError) {
      errors.push({
        type: 'syntax',
        message: syntaxError.message,
        line: syntaxError.mark?.line
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateStructure(story: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Required fields
    const required = ['title', 'author', 'narrative', 'scenes'];
    for (const field of required) {
      if (!story[field]) {
        errors.push({
          type: 'structure',
          message: `Missing required field: ${field}`,
          suggestion: `Add ${field} section to story`
        });
      }
    }
    
    // Character references
    if (story.world?.characters) {
      const characterIds = Object.keys(story.world.characters);
      const referencedChars = this.findCharacterReferences(story);
      
      for (const charRef of referencedChars) {
        if (!characterIds.includes(charRef)) {
          errors.push({
            type: 'logic',
            message: `Referenced character '${charRef}' not defined`,
            suggestion: `Add character definition or fix reference`
          });
        }
      }
    }
    
    return errors;
  }
}
```

### 4. Error Correction Prompts

```typescript
const ERROR_CORRECTION_PROMPT = `
The generated story has validation errors. Fix these issues while preserving the story's intent:

ORIGINAL YAML:
${originalYaml}

VALIDATION ERRORS:
${errors.map(e => `- ${e.type}: ${e.message}`).join('\n')}

CORRECTIONS NEEDED:
1. Fix all syntax errors (indentation, quotes, colons)
2. Add missing required fields
3. Ensure character references match definitions
4. Validate ending condition logic
5. Maintain story coherence and quality

Return the corrected YAML:
`;
```

## User Interface Design

### 1. Generation Progress

```
┌─────────────────────────────────────────────────────────────┐
│ Generating Your Story...                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓ Analyzing story prompt and preferences                    │
│ ✓ Planning story structure and characters                   │
│ ⏳ Generating story content...                              │
│ ○ Validating story format                                   │
│ ○ Loading story into engine                                 │
│                                                             │
│ [████████████████░░░░] 75%                                  │
│                                                             │
│ This usually takes 30-60 seconds...                        │
└─────────────────────────────────────────────────────────────┘
```

### 2. Story Management

```
┌─────────────────────────────────────────────────────────────┐
│ My Generated Stories                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📚 The Midnight Librarian                                  │
│     Mystery • Created today • 25 min                       │
│     [Play] [Edit Prompt] [Download] [Delete]               │
│                                                             │
│ 🏠 The House Remembers                                      │
│     Horror • Created yesterday • 35 min                    │
│     [Play] [Edit Prompt] [Download] [Delete]               │
│                                                             │
│ ➕ Generate New Story                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Story Refinement

```
┌─────────────────────────────────────────────────────────────┐
│ Refine Your Story                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Current Story: The Midnight Librarian                      │
│                                                             │
│ What would you like to adjust?                              │
│                                                             │
│ ○ Make it more mysterious and atmospheric                   │
│ ○ Add more character interactions                           │
│ ○ Change the ending to be more dramatic                     │
│ ○ Reduce the story length                                   │
│ ○ Custom adjustment: ________________________              │
│                                                             │
│ [Regenerate with Changes] [Keep Original]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Persistent Storage Integration

### 1. Generated Story Storage

```typescript
interface GeneratedStoryMetadata {
  id: string;
  title: string;
  author: string; // Always "Generated by AI"
  generatedAt: Date;
  prompt: string;
  preferences: StoryGenerationRequest;
  yamlContent: string;
  isCustom: true; // Flag for save system
}

class GeneratedStoryManager {
  // Save generated story to browser storage
  async saveGeneratedStory(story: ImpressionistStory, metadata: GeneratedStoryMetadata): Promise<string> {
    const storyData = {
      ...metadata,
      yamlContent: this.serializeToYAML(story)
    };
    
    const storyId = `generated_${metadata.id}`;
    localStorage.setItem(`iffy_generated_${storyId}`, JSON.stringify(storyData));
    
    // Add to generated stories index
    this.addToGeneratedIndex(storyId, metadata);
    
    return storyId;
  }
  
  // Load generated story
  async loadGeneratedStory(storyId: string): Promise<ImpressionistStory> {
    const storyData = localStorage.getItem(`iffy_generated_${storyId}`);
    if (!storyData) {
      throw new Error(`Generated story ${storyId} not found`);
    }
    
    const metadata: GeneratedStoryMetadata = JSON.parse(storyData);
    return this.parseYAMLToStory(metadata.yamlContent);
  }
  
  // List all generated stories
  getGeneratedStories(): GeneratedStoryMetadata[] {
    const index = localStorage.getItem('iffy_generated_index');
    return index ? JSON.parse(index) : [];
  }
}
```

### 2. Save Game Integration

```typescript
interface ExtendedGameSave {
  // Existing save data
  gameState: GameState;
  storyMetadata: StoryMetadata;
  timestamp: Date;
  
  // New fields for generated stories
  isGeneratedStory: boolean;
  generatedStoryId?: string;
  originalPrompt?: string;
}

class SaveGameManager {
  async saveGame(gameState: GameState, storyInfo: StoryInfo): Promise<string> {
    const saveData: ExtendedGameSave = {
      gameState,
      storyMetadata: storyInfo.metadata,
      timestamp: new Date(),
      isGeneratedStory: storyInfo.isGenerated || false,
      generatedStoryId: storyInfo.generatedStoryId,
      originalPrompt: storyInfo.originalPrompt
    };
    
    const saveId = this.generateSaveId();
    localStorage.setItem(`iffy_save_${saveId}`, JSON.stringify(saveData));
    
    return saveId;
  }
  
  async loadGame(saveId: string): Promise<{gameState: GameState, story: ImpressionistStory}> {
    const saveData: ExtendedGameSave = JSON.parse(
      localStorage.getItem(`iffy_save_${saveId}`)!
    );
    
    let story: ImpressionistStory;
    
    if (saveData.isGeneratedStory && saveData.generatedStoryId) {
      // Load generated story from generated story storage
      story = await this.generatedStoryManager.loadGeneratedStory(saveData.generatedStoryId);
    } else {
      // Load bundled story normally
      story = await this.storyLoader.loadStory(saveData.storyMetadata.filename);
    }
    
    return {
      gameState: saveData.gameState,
      story
    };
  }
}
```

## Example Generation Flow

### User Input
```
"Create a cozy mystery set in a magical bookshop where I'm the new employee. 
When a customer disappears after checking out a dangerous grimoire, I must 
solve the mystery using both detective skills and newfound magical abilities."

Style: Mystery
Tone: Cozy & Intimate  
Length: Medium (20-30 minutes)
```

### Generated Story Structure
```yaml
title: "The Gilded Page Mystery"
author: "Generated by AI"
blurb: "Your first week at the magical bookshop takes a mysterious turn when a customer vanishes with a dangerous grimoire."

narrative:
  voice: "Cozy mystery with gentle magical realism"
  tone: "Warm but curious, like investigating with a cup of tea"
  
world:
  characters:
    owner:
      name: "Elderoak"
      sketch: "The enigmatic bookshop owner who speaks in riddles and always knows more than they let on"
      
    missing_customer:
      name: "Professor Winters" 
      sketch: "An anxious academic who was researching something urgent"

scenes:
  opening:
    sketch: |
      Your third day at The Gilded Page, and you're still discovering books that 
      whisper when opened. [Elderoak](character:owner) watches Professor Winters 
      hurry out with a leather-bound grimoire, their face pale with worry.
      
      "That book chooses its readers," Elderoak murmurs. "And not always wisely."
      
      When Professor Winters doesn't return the grimoire by closing time, 
      Elderoak's concern becomes yours to carry.

endings:
  variations:
  - id: "rescue_success"
    when: "player solves the mystery and rescues Professor Winters"
  - id: "book_sealed"  
    when: "player seals the dangerous grimoire but cannot save the professor"
  - id: "mystery_deepens"
    when: "player uncovers larger magical conspiracy"
```

## Implementation Benefits

### For Users
- **Accessibility**: No technical knowledge required
- **Immediate Gratification**: Play custom stories within minutes
- **Creative Freedom**: Unlimited story concepts
- **Iterative Design**: Refine and regenerate as needed

### For Platform
- **Content Generation**: Endless stream of new stories
- **User Engagement**: Interactive creation process
- **Community Building**: Users share prompts and generated stories
- **Learning Tool**: Demonstrates story structure through examples

### For Ecosystem
- **Creative Education**: Users learn storytelling through AI collaboration
- **Format Evolution**: User feedback informs story format improvements
- **Quality Baseline**: AI-generated content maintains structural consistency
- **Scalability**: Platform grows through user-generated content

## Technical Considerations

### Cost Management
- Use cost-effective models for generation (Claude Haiku, GPT-3.5)
- Implement generation quotas or usage limits
- Cache common story patterns and templates
- Optional premium tier for unlimited generation

### Quality Assurance
- Multi-stage validation pipeline
- Human review for featured generated stories
- User rating system for generated content
- Automatic detection of inappropriate content

### Performance
- Async generation with progress indicators
- Chunked processing for better UX
- Local storage for generated stories
- Background regeneration for refinements

## Future Enhancements

### Advanced Features
- **Collaborative Generation**: Multiple users contribute to same story
- **Style Transfer**: Apply the style of existing stories to new prompts
- **Character Templates**: Pre-made character archetypes users can reference
- **Setting Libraries**: Rich location templates for common genres

### Integration Possibilities
- **Image Generation**: AI-created story artwork and scenes
- **Voice Acting**: Generated character voices for audio playback
- **Music Generation**: Atmospheric soundtracks matching story tone
- **Translation**: Multi-language story generation

This feature transforms Iffy from a story player into a creative platform, democratizing interactive fiction creation while maintaining the quality and structure that makes stories engaging.