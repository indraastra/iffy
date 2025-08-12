import { MultiModelService } from '../../services/multiModelService.js';
import { 
  NarrativeOutline, 
  StoryBlueprint,
  StorySetting,
  BlueprintScene,
  PotentialEnding
} from '../../types/emergentStory.js';
import { DebugTracker } from './DebugTracker.js';

export class BlueprintGenerator {
  private llmService: MultiModelService;
  private debugTracker?: DebugTracker;

  constructor(llmService: MultiModelService, debugTracker?: DebugTracker) {
    this.llmService = llmService;
    this.debugTracker = debugTracker;
  }

  async generateBlueprint(narrativeOutline: NarrativeOutline): Promise<StoryBlueprint> {
    const prompt = this.buildBlueprintPrompt(narrativeOutline);
    const startTime = performance.now();
    
    try {
      const response = await this.llmService.makeRequestWithUsage(prompt, { temperature: 0.8 });
      const processingTime = performance.now() - startTime;
      
      this.debugTracker?.trackLLMInteraction(
        'blueprint_generation',
        'architect', 
        prompt, 
        response.content, 
        true, 
        processingTime
      );
      
      return this.parseBlueprintResponse(response.content, narrativeOutline.title);
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.debugTracker?.trackLLMInteraction(
        'blueprint_generation',
        'architect', 
        prompt, 
        '', 
        false, 
        processingTime,
        errorMessage
      );
      
      throw new Error(`Blueprint generation failed: ${errorMessage}`);
    }
  }

  private buildBlueprintPrompt(narrativeOutline: NarrativeOutline): string {
    return `You are a veteran story architect who has spent decades deconstructing narratives and rebuilding them as interactive experiences. Authors come to you with raw creative visions - fragments of plot, character sketches, thematic obsessions - and you transform them into living blueprints that can adapt and breathe through player choices.

Your expertise lies in seeing the essential dramatic skeleton beneath surface details, extracting the elements that must be preserved while identifying the spaces where players can make the story their own. You approach each manuscript like an archaeologist and engineer combined - carefully excavating every meaningful detail while constructing a framework robust enough to support infinite variations.

NARRATIVE OUTLINE:
${narrativeOutline.markdown}

TASK:
Design a story blueprint using a 4-5 scene structure based on Freytag's dramatic model. This blueprint must focus entirely on the high-level narrative flow, atmosphere, and thematic goals.

Generate a JSON object with the following components:

1.  **title**: The story title from the outline.

2.  **setting**: A description of the world, tone, and time period.
    - "world": The general environment (e.g., "an isolated lighthouse during a fierce storm").
    - "tone": The dominant emotional atmosphere (e.g., "intimate and tense with undercurrents of longing").
    - "time_period": The specific time context (e.g., "late night during a winter storm").

3.  **scene_sequence**: An array of 4-5 scenes. Each scene must include:
    - "id": A unique identifier (e.g., "arrival_in_storm").
    - "goal": What the beat generator should help the player work towards.
    - "narrative": What story is actually being told in this scene (extracted from the outline).
    - "location": Where this scene takes place (extracted from the outline or inferred).
    - "characters": Array of who is involved in this scene (extracted from the outline).
    - "dramatic_function": One of ["exposition", "rising_action", "climax", "falling_action", "resolution"].

4.  **potential_endings**: An array of 3-4 possible conclusions. Each ending must include:
    - "id": A unique identifier (e.g., "reconciliation").
    - "title": A brief, evocative title.
    - "description": A summary of the outcome.
    - "tone": The emotional feeling of the ending.

5.  **blanks**: Story elements for players to define. Look for elements to be established or revealed through player choices. Convert to simple identifiers.

Extract everything meaningful from the markdown - all details, characters, events, conflicts, themes, and plot points must be captured or they'll be lost.

The Scene and Beat generators will only have access to what you structure here. Do NOT define state variables, ending conditions, or specific choices, but DO capture all narrative content that should influence the story.

RESPONSE FORMAT (JSON ONLY):
{
  "title": "The Lighthouse Keeper",
  "setting": {
    "world": "isolated lighthouse during a fierce storm",
    "tone": "intimate and tense with undercurrents of longing",
    "time_period": "late night during a winter storm"
  },
  "scene_sequence": [
    {
      "id": "arrival_in_storm",
      "goal": "Let player establish visitor's identity through careful observation",
      "narrative": "During a fierce storm, someone pounds desperately at the lighthouse door. When you open it, you see a figure you recognize but who seems not to remember you—injured, exhausted, seeking only shelter from the tempest.",
      "location": "lighthouse entrance during a violent storm",
      "characters": ["lighthouse_keeper", "mysterious_visitor"],
      "dramatic_function": "exposition"
    },
    {
      "id": "shared_warmth",
      "goal": "Allow player to define the nature of past connection through careful revelation",
      "narrative": "Inside by the fire, conversation begins carefully. Both of you share details about yourselves while the visitor's memory seems clouded. The player can define the relationship through how they choose to interact and what they reveal.",
      "location": "lighthouse main room with fireplace",
      "characters": ["lighthouse_keeper", "mysterious_visitor"],
      "dramatic_function": "rising_action"
    },
    {
      "id": "moment_of_recognition",
      "goal": "Force decision about revealing identity and true relationship",
      "narrative": "Something triggers a moment of potential recognition—a gesture, phrase, or memory. The visitor's confusion wavers. This is the critical moment to decide whether to reveal the truth about who you are to each other.",
      "location": "lighthouse beacon room or by a meaningful object",
      "characters": ["lighthouse_keeper", "mysterious_visitor"],
      "dramatic_function": "climax"
    },
    {
      "id": "dawn_resolution", 
      "goal": "Resolve the consequences of identity revelation choices",
      "narrative": "As the storm clears and dawn approaches, the consequences of the night's choices become clear. The visitor must leave, but the nature of your parting depends entirely on what has been revealed and established between you.",
      "location": "lighthouse entrance as storm clears",
      "characters": ["lighthouse_keeper", "mysterious_visitor"],
      "dramatic_function": "resolution"
    }
  ],
  "potential_endings": [
    {
      "id": "reconciliation",
      "title": "Hopeful Reunion",
      "description": "Identity is revealed and trust is earned, leading to a renewed relationship.",
      "tone": "hopeful and healing"
    },
    {
      "id": "missed_chance",
      "title": "Silent Departure",
      "description": "Identity is kept secret, and the visitor leaves, unaware of the connection.",
      "tone": "melancholic and regretful"
    }
  ],
  "blanks": ["visitor_identity", "keeper_motivation", "shared_history"]
}

Generate the story blueprint now:`;
  }

  private parseBlueprintResponse(response: string, fallbackTitle: string): StoryBlueprint {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in blueprint response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      this.validateBlueprintStructure(parsed);

      return {
        title: parsed.title || fallbackTitle,
        setting: parsed.setting as StorySetting,
        scene_sequence: parsed.scene_sequence as BlueprintScene[],
        potential_endings: parsed.potential_endings as PotentialEnding[],
        blanks: parsed.blanks as string[] || [],
      };

    } catch (error) {
      console.error('Blueprint response parsing failed:', error);
      console.error('Raw response:', response);
      throw new Error(`Failed to parse blueprint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateBlueprintStructure(parsed: any): void {
    if (!parsed.title || !parsed.setting || !parsed.scene_sequence || !parsed.potential_endings) {
      throw new Error('Blueprint missing one or more root keys: title, setting, scene_sequence, potential_endings');
    }
    if (parsed.scene_sequence.length === 0) {
      throw new Error('Blueprint scene_sequence cannot be empty.');
    }
    if (parsed.potential_endings.length === 0) {
      throw new Error('Blueprint potential_endings cannot be empty.');
    }
  }

  static parseMarkdown(markdown: string): NarrativeOutline {
    const titleMatch = markdown.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Story';

    return {
      title,
      markdown: markdown.trim(),
    };
  }
}
