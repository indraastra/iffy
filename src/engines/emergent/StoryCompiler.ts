import { MultiModelService } from '../../services/multiModelService.js';
import { 
  NarrativeOutline, 
  CompiledStoryStructure
} from '../../types/emergentStory.js';
import { DebugTracker } from './DebugTracker.js';

export class StoryCompiler {
  private llmService: MultiModelService;
  private debugTracker?: DebugTracker;

  constructor(llmService: MultiModelService, debugTracker?: DebugTracker) {
    this.llmService = llmService;
    this.debugTracker = debugTracker;
  }

  // Main compilation method - transforms Markdown to unique JSON structure
  async compileStory(narrativeOutline: NarrativeOutline): Promise<CompiledStoryStructure> {
    const prompt = this.buildCompilationPrompt(narrativeOutline);
    const startTime = performance.now();
    
    try {
      const response = await this.llmService.makeRequest(prompt);
      const processingTime = performance.now() - startTime;
      
      // Track successful LLM interaction
      this.debugTracker?.trackLLMInteraction(
        'compilation',
        'architect', 
        prompt, 
        response, 
        true, 
        processingTime
      );
      
      return this.parseCompilationResponse(response, narrativeOutline.title);
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Track failed LLM interaction
      this.debugTracker?.trackLLMInteraction(
        'compilation',
        'architect', 
        prompt, 
        '', 
        false, 
        processingTime,
        errorMessage
      );
      
      throw new Error(`Story compilation failed: ${errorMessage}`);
    }
  }

  // Build LLM prompt for story compilation
  private buildCompilationPrompt(narrativeOutline: NarrativeOutline): string {
    return `You are a story architect. Read the following narrative outline and generate a complete, unique story structure for a single playthrough.

NARRATIVE OUTLINE:
${narrativeOutline.markdown}

COMPILATION INSTRUCTIONS:
Generate a JSON structure with exactly these components:

1. **initial_state**: Define 3-5 state variables that capture key story elements. Prefer boolean flags for major story beats, meaningful counters for relationships/progress, and strings for status tracking. Use emergent, story-relevant names.

2. **scene_sequence**: Create an ordered sequence of 3-5 scenes. Each scene should have:
   - "id": A unique identifier (lowercase, underscores)  
   - "goal": A clear narrative goal that explains what this scene accomplishes
   - "requirements": (optional) Array of state variables that must be established in this scene. Each requirement should have:
     * "stateKey": The state variable name (e.g., "relationship_type", "alliance_status")
     * "validValues": (optional) Array of acceptable values for this state
     * "description": Human-readable description of what this represents
   - "environment": (optional) Environmental context to ground the scene atmosphere. Should have:
     * "setting": Physical location and situation (e.g., "lighthouse keeper's quarters during storm")
     * "atmosphere": Mood, weather, sensory details (e.g., "rain lashing windows, thunder rumbling")
     * "timeOfDay": (optional) Time context if relevant (e.g., "late night", "approaching dawn")
     * "details": (optional) Array of specific environmental elements (e.g., ["wind howling", "fire crackling"])

3. **endings**: Based on the "Potential Endings" section, define 2-4 possible endings. Each should have:
   - "id": Unique identifier for this ending
   - "tone": The emotional tone/feeling of this ending  
   - "condition": A logical expression that represents STORY COMPLETION, not arbitrary thresholds

CRITICAL REQUIREMENTS FOR ENDING CONDITIONS:
- Endings must be SCENE-AWARE: they should require progression through multiple scenes
- Use boolean flags for major story milestones: "discovered_truth && confronted_villain"
- If using numeric variables, require SUBSTANTIAL progress (e.g., trust >= 8, progress >= 12)
- Combine multiple conditions to ensure story depth: "final_scene_reached && (alliance_formed || enemy_defeated)"
- NEVER allow endings to trigger in early scenes - they represent story COMPLETION
- Each ending should require a different path through the narrative choices

EXAMPLES OF GOOD ENDING CONDITIONS:
- "in_final_act && truth_revealed && chose_sacrifice" (requires late-game progression + story beats)
- "story_nearly_complete && relationship_status === 'trusted'" (near completion + character development)  
- "scenes_completed >= 2 && final_confrontation && (diplomacy_attempted || force_used)" (substantial progress + endgame event + meaningful choice)
- "past_opening && major_decision_made && consequences_faced" (ensures early-game completion is avoided)

AVAILABLE SCENE PROGRESSION VARIABLES:
The engine automatically provides these variables for ending conditions:
- scene_count: Current scene number (1-based)
- scenes_completed: Number of scenes completed (0-based)
- in_opening_act, past_opening, in_middle_act, in_final_act: Boolean flags for story acts
- story_nearly_complete: True when approaching the end
- current_scene_id: The ID of the current scene

SCENE REQUIREMENTS GUIDANCE:
Add scene requirements when the narrative explicitly mentions state that must be established:
- Look for phrases like "establish the relationship", "determine the alliance", "identify the threat"
- Common first scene requirement: relationship/character establishment
- Requirements should focus on critical story state, not minor details
- Only add requirements when the narrative specifically emphasizes establishing certain information

ENVIRONMENTAL CONTEXT GUIDANCE:
Add environmental context to scenes when the narrative mentions specific settings, weather, or atmosphere:
- Extract physical locations, weather conditions, time of day from the summary and key elements
- Look for atmospheric details like "storm", "candlelit room", "dawn breaking", "bustling marketplace"
- Include sensory details mentioned in the narrative (sounds, lighting, physical sensations)
- Focus on elements that ground the scene and create immersion for the player

STYLE GUIDELINES INTERPRETATION:
If the narrative contains a "Style Guidelines" or "Style & Tone Guidelines" section, interpret it into a guidelines object:
- "narrative": voice and perspective style (e.g., "second-person, contemplative")
- "choices": presentation and transparency preferences (e.g., "hidden-effects, internal-thoughts") 
- "tone": atmospheric keywords (e.g., "mysterious, melancholic")

RESPONSE FORMAT (JSON only):
{
  "title": "Story Title",
  "guidelines": {
    "narrative": "second-person, contemplative",
    "choices": "hidden-effects, internal-thoughts",
    "tone": "mysterious, melancholic"
  },
  "initial_state": {
    "variable_name": 0,
    "another_variable": false,
    "string_variable": "value"
  },
  "scene_sequence": [
    { 
      "id": "scene_id", 
      "goal": "What this scene accomplishes narratively",
      "requirements": [
        {
          "stateKey": "relationship_type",
          "validValues": ["child", "spouse", "partner"],
          "description": "Player's relationship to the visitor"
        }
      ],
      "environment": {
        "setting": "lighthouse keeper's quarters during storm",
        "atmosphere": "rain lashing windows, thunder rumbling, wind howling",
        "timeOfDay": "late night",
        "details": ["fire crackling", "lighthouse beam rotating", "visitor seeking shelter"]
      }
    },
    { "id": "next_scene", "goal": "Next narrative goal" }
  ],
  "endings": [
    { "id": "ending_id", "tone": "emotional tone", "condition": "logical expression" },
    { "id": "other_ending", "tone": "different tone", "condition": "different condition" }
  ]
}

Generate the JSON structure now:`;
  }

  // Parse LLM response into structured format
  private parseCompilationResponse(response: string, fallbackTitle: string): CompiledStoryStructure {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in compilation response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required structure
      this.validateCompiledStructure(parsed);

      return {
        title: parsed.title || fallbackTitle,
        initial_state: parsed.initial_state,
        scene_sequence: parsed.scene_sequence,
        endings: parsed.endings,
        guidelines: parsed.guidelines
      };

    } catch (error) {
      console.error('Compilation response parsing failed:', error);
      console.error('Raw response:', response);
      
      // Fallback structure
      return this.generateFallbackStructure(fallbackTitle);
    }
  }

  // Validate compiled structure has required fields
  private validateCompiledStructure(parsed: any): void {
    const errors: string[] = [];

    if (!parsed.initial_state || typeof parsed.initial_state !== 'object') {
      errors.push('Missing or invalid initial_state');
    }

    if (!Array.isArray(parsed.scene_sequence) || parsed.scene_sequence.length === 0) {
      errors.push('Missing or empty scene_sequence');
    } else {
      parsed.scene_sequence.forEach((scene: any, index: number) => {
        if (!scene.id || !scene.goal) {
          errors.push(`Scene ${index + 1} missing id or goal`);
        }
      });
    }

    if (!Array.isArray(parsed.endings) || parsed.endings.length === 0) {
      errors.push('Missing or empty endings');
    } else {
      parsed.endings.forEach((ending: any, index: number) => {
        if (!ending.id || !ending.tone || !ending.condition) {
          errors.push(`Ending ${index + 1} missing id, tone, or condition`);
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Invalid compiled structure: ${errors.join(', ')}`);
    }
  }

  // Generate fallback structure when compilation fails
  private generateFallbackStructure(title: string): CompiledStoryStructure {
    return {
      title,
      initial_state: {
        progress: 0,
        relationship: 0,
        tension: false
      },
      scene_sequence: [
        { id: 'opening', goal: 'Establish the situation and characters' },
        { id: 'development', goal: 'Develop conflict and choices' },
        { id: 'climax', goal: 'Reach the critical decision point' },
        { id: 'resolution', goal: 'Resolve the story based on choices made' }
      ],
      endings: [
        { id: 'positive', tone: 'hopeful', condition: 'relationship >= 3' },
        { id: 'neutral', tone: 'contemplative', condition: 'progress >= 2' },
        { id: 'negative', tone: 'melancholic', condition: 'tension || relationship < 0' }
      ]
    };
  }

  // Parse Markdown narrative outline
  static parseMarkdown(markdown: string): NarrativeOutline {
    // Extract title from first heading
    const titleMatch = markdown.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Story';

    return {
      title,
      markdown: markdown.trim()
    };
  }

  // Test compilation with sample narrative
  async testCompilation(): Promise<boolean> {
    const testNarrative: NarrativeOutline = {
      title: 'Test Story',
      markdown: `# Test Story

## Summary
A simple test story to verify the compilation system works.

## Key Elements  
The story tests basic state management and ending conditions.

## Potential Endings
Success if things go well, failure if they don't.`
    };

    try {
      const compiled = await this.compileStory(testNarrative);
      return compiled.scene_sequence.length > 0 && compiled.endings.length > 0;
    } catch {
      return false;
    }
  }
}