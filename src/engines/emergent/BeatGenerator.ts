import { MultiModelService } from '../../services/multiModelService.js';
import { 
  StoryBlueprint,
  StoryScene,
  Requirement,
  StoryBeat,
  GameState,
  GameTurn
} from '../../types/emergentStory.js';
import { DebugTracker } from './DebugTracker.js';

export interface BeatGeneratorContext {
  blueprint: StoryBlueprint;
  scene: StoryScene;
  requirement: Requirement;
  currentState: GameState;
  sessionHistory: GameTurn[];
}

export interface BlankFillingContext {
  blueprint: StoryBlueprint;
  scene: StoryScene;
  blankToFill: string;
  currentState: GameState;
  sessionHistory: GameTurn[];
}

export class BeatGenerator {
  private llmService: MultiModelService;
  private debugTracker?: DebugTracker;

  constructor(llmService: MultiModelService, debugTracker?: DebugTracker) {
    this.llmService = llmService;
    this.debugTracker = debugTracker;
  }

  async generateBeat(context: BeatGeneratorContext): Promise<StoryBeat> {
    const prompt = this.buildBeatPrompt(context);
    const startTime = performance.now();
    
    try {
      // Use a lower temperature for more focused, deterministic output
      const response = await this.llmService.makeRequestWithUsage(prompt, { temperature: 0.4 });
      const processingTime = performance.now() - startTime;
      
      this.debugTracker?.trackLLMInteraction(
        'content_generation',
        'writer', 
        prompt, 
        response.content, 
        true, 
        processingTime
      );
      
      return this.parseBeatResponse(response.content);
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.debugTracker?.trackLLMInteraction(
        'content_generation',
        'writer', 
        prompt, 
        '', 
        false, 
        processingTime,
        errorMessage
      );
      
      throw new Error(`Beat generation failed: ${errorMessage}`);
    }
  }

  async generateBlankFillingBeat(context: BlankFillingContext): Promise<StoryBeat> {
    const prompt = this.buildBlankFillingPrompt(context);
    const startTime = performance.now();
    
    try {
      const response = await this.llmService.makeRequestWithUsage(prompt, { temperature: 0.4 });
      const processingTime = performance.now() - startTime;
      
      this.debugTracker?.trackLLMInteraction(
        'blank_filling_generation',
        'writer', 
        prompt, 
        response.content, 
        true, 
        processingTime
      );
      
      return this.parseBeatResponse(response.content);
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.debugTracker?.trackLLMInteraction(
        'blank_filling_generation',
        'writer', 
        prompt, 
        '', 
        false, 
        processingTime,
        errorMessage
      );
      
      throw new Error(`Blank-filling beat generation failed: ${errorMessage}`);
    }
  }

  private buildBeatPrompt(context: BeatGeneratorContext): string {
    const { blueprint, scene, requirement, currentState, sessionHistory } = context;
    
    // Check if this requirement is for filling in a blank from the blueprint
    const isBlankRequirement = blueprint.blanks.includes(requirement.key_to_update);
    
    let specialInstructions = '';
    let jsonExample = '';
    
    if (isBlankRequirement) {
      specialInstructions = `
BLANK FILLING: Use placeholder language. Let players define "${requirement.key_to_update}" through choices without making assumptions.`;

      jsonExample = `{
      "narrative_text": "Your companion stands in the doorway, and you find yourself studying them carefully after all these years apart. Time has left its mark, but you're not sure yet what story those changes tell.",
      "choices": [
        {
          "text": "Notice how their posture has changed - they carry themselves with new wariness",
          "effects": { "${requirement.key_to_update}": "cautious_bearing" }
        },
        {
          "text": "Focus on their eyes - still familiar, but holding secrets you don't recognize",
          "effects": { "${requirement.key_to_update}": "guarded_expression" }
        },
        {
          "text": "Observe their hands - restless now, where they once were steady",
          "effects": { "${requirement.key_to_update}": "nervous_habits" }
        }
      ]
    }`;
    } else {
      jsonExample = `{
      "narrative_text": "The stranger shivers, pulling a thin cloak tighter. They glance at the warm fire, then back at you, their eyes full of apprehension. 'I... I don't mean to be a bother,' they stammer.",
      "choices": [
        {
          "text": "Gesture to the chair closest to the hearth. 'Don't be silly. Come, warm yourself.'",
          "effects": { "${requirement.key_to_update}": 1 }
        },
        {
          "text": "Nod. 'Just stay out of the way.'",
          "effects": { "${requirement.key_to_update}": -1 }
        },
        {
          "text": "Ignore them and continue stoking the fire.",
          "effects": { "${requirement.key_to_update}": 0 }
        }
      ]
    }`;
    }

    return `You are a master of the crucial moment - the writer who crafts the exact instant when everything hangs in the balance. You specialize in taking dramatic tension and crystallizing it into a single, perfect beat where the player's choice will reshape everything that follows.

You understand that great interactive storytelling lives in these micro-moments: the pause before someone speaks, the choice of which door to open, the decision to trust or doubt. You create beats that feel inevitable in retrospect but unpredictable in the moment.

CREATE A STORY BEAT THAT FULFILLS: "${requirement.description}"

CONTEXT: ${blueprint.title} - ${blueprint.setting.world} (${blueprint.setting.tone})
SCENE: ${scene.goal} at ${this.getBlueprintSceneForId(blueprint, scene.id)?.location || 'Unknown location'}

STORY SO FAR: ${this.formatNarrativeHistory(sessionHistory)}

ESTABLISHED ELEMENTS: ${this.formatEstablishedState(currentState)}
${specialInstructions}

Generate JSON with narrative_text and 2-4 choices. Each choice sets "${requirement.key_to_update}" to a different value.

RESPONSE FORMAT (JSON ONLY):
${jsonExample}

Generate the story beat now:`;
  }

  private buildBlankFillingPrompt(context: BlankFillingContext): string {
    const { blueprint, scene, blankToFill, currentState, sessionHistory } = context;

    return `You are a skilled storyteller who specializes in creating natural moments of discovery where players define story elements through observation and choice. You craft beats that invite players to fill in important details organically, without feeling forced or artificial.

CREATE A BEAT FOR PLAYERS TO DEFINE: "${blankToFill}"

CONTEXT: ${blueprint.title} - ${blueprint.setting.world} (${blueprint.setting.tone})
SCENE: ${scene.goal} at ${this.getBlueprintSceneForId(blueprint, scene.id)?.location || 'Unknown location'}

STORY SO FAR: ${this.formatNarrativeHistory(sessionHistory)}

ESTABLISHED ELEMENTS: ${this.formatEstablishedState(currentState)}

Use placeholder language in narrative that invites observation. Create 3-4 choices that let players define different aspects of "${blankToFill}" through natural moments of discovery. Each choice establishes "${blankToFill}" as a specific, vivid detail.

RESPONSE FORMAT (JSON ONLY):
{
  "narrative_text": "Your companion stands in the doorway, and you find yourself studying them carefully after all these years apart. Time has left its mark, but you're not sure yet what story those changes tell.",
  "choices": [
    {
      "text": "Notice their striking green eyes and how silver threads through their dark hair",
      "effects": { "companion_appearance": "green_eyes_silver_hair" }
    },
    {
      "text": "Observe their weathered hands and the new scar across their left cheek",
      "effects": { "companion_appearance": "weathered_scarred" }
    },
    {
      "text": "Focus on their lean build and the way they favor their right leg slightly",
      "effects": { "companion_appearance": "lean_slight_limp" }
    }
  ]
}

Generate the blank-filling beat now:`;
  }

  private parseBeatResponse(response: string): StoryBeat {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in beat response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      this.validateBeatStructure(parsed);

      return parsed as StoryBeat;

    } catch (error) {
      console.error('Beat response parsing failed:', error);
      console.error('Raw response:', response);
      throw new Error(`Failed to parse beat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateBeatStructure(parsed: any): void {
    if (!parsed.narrative_text || !parsed.choices) {
      throw new Error('Beat missing root keys: narrative_text, choices');
    }
    if (!Array.isArray(parsed.choices) || parsed.choices.length < 2) {
      throw new Error('Beat must have at least 2 choices.');
    }
    for (const choice of parsed.choices) {
      if (!choice.text || !choice.effects) {
        throw new Error('Each choice must have a text and effects property.');
      }
      if (typeof choice.effects !== 'object') {
        throw new Error('Choice effects must be an object.');
      }
    }
  }

  private getBlueprintSceneForId(blueprint: StoryBlueprint, sceneId: string) {
    return blueprint.scene_sequence.find(scene => scene.id === sceneId);
  }

  private formatNarrativeHistory(sessionHistory: GameTurn[]): string {
    if (!sessionHistory || sessionHistory.length === 0) {
      return "This is the first beat.";
    }
    
    return sessionHistory.map((turn, index) => {
      return `Beat ${index + 1}: ${turn.beat.narrative_text}\nPlayer choice: "${turn.choice.text}"`;
    }).join('\n\n');
  }

  private formatEstablishedState(currentState: GameState): string {
    const entries = Object.entries(currentState);
    if (entries.length === 0) {
      return "- No story elements have been established yet";
    }
    
    return entries.map(([key, value]) => {
      return `- ${key}: ${value} (incorporate this naturally into narrative and character interactions)`;
    }).join('\n');
  }
}
