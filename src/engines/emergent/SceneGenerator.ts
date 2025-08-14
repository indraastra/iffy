import { MultiModelService } from '../../services/multiModelService.js';
import { 
  StoryBlueprint,
  BlueprintScene,
  StoryScene,
  GameState,
  GameTurn
} from '../../types/emergentStory.js';
import { DebugTracker } from './DebugTracker.js';

export interface SceneGeneratorContext {
  blueprint: StoryBlueprint;
  blueprintScene: BlueprintScene;
  currentState: GameState;
  sessionHistory: GameTurn[];
}

export class SceneGenerator {
  private llmService: MultiModelService;
  private debugTracker?: DebugTracker;

  constructor(llmService: MultiModelService, debugTracker?: DebugTracker) {
    this.llmService = llmService;
    this.debugTracker = debugTracker;
  }

  async generateScene(context: SceneGeneratorContext): Promise<StoryScene> {
    const prompt = this.buildScenePrompt(context);
    const startTime = performance.now();
    
    try {
      const response = await this.llmService.makeRequestWithUsage(prompt, { temperature: 0.6 });
      const processingTime = performance.now() - startTime;
      
      this.debugTracker?.trackLLMInteraction(
        'scene_generation',
        'director', 
        prompt, 
        response.content, 
        true, 
        processingTime
      );
      
      return this.parseSceneResponse(response.content, context);
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.debugTracker?.trackLLMInteraction(
        'scene_generation',
        'director', 
        prompt, 
        '', 
        false, 
        processingTime,
        errorMessage
      );
      
      throw new Error(`Scene generation failed: ${errorMessage}`);
    }
  }

  private buildScenePrompt(context: SceneGeneratorContext): string {
    const { blueprint, blueprintScene, currentState, sessionHistory } = context;

    return `You are an experienced dramatic director who specializes in translating broad story concepts into precise, playable moments. You've directed hundreds of interactive scenes, from intimate character studies to sweeping adventures, and you understand exactly how to balance narrative momentum with meaningful player agency.

Your gift is taking a scene's emotional goal - "build trust," "reveal a secret," "force a difficult choice" - and crafting the specific dramatic beats that will make players lean forward in their chairs. You think in terms of what the audience needs to feel, what information must be revealed, and what decisions will define character. Every scene you direct has clear objectives and multiple paths forward.

STORY BLUEPRINT CONTEXT:
Title: ${blueprint.title}
Setting: ${blueprint.setting.world} (${blueprint.setting.tone})
Potential Endings: ${blueprint.potential_endings.map(e => `- ${e.title}: ${e.description}`).join('\n')}
Blanks for Players to Fill: ${blueprint.blanks.join(', ')}

CURRENT SCENE:
Goal: "${blueprintScene.goal}"
Narrative: "${blueprintScene.narrative}"
Location: "${blueprintScene.location}"
Characters: ${blueprintScene.characters.join(', ')}
Dramatic Function: ${blueprintScene.dramatic_function}

ALL SCENES:
${blueprint.scene_sequence.map((scene, i) => `${i + 1}. ${scene.id}: ${scene.goal}`).join('\n')}

STORY SO FAR:
${this.formatNarrativeHistory(sessionHistory)}

CURRENT GAME STATE:
${JSON.stringify(currentState, null, 2)}

Generate a JSON scene definition with requirements, blanks, and transitions:

**Requirements** (scene progression goals): Focus on dramatic needs like trust building, tension creation, information gathering. Each needs key_to_update and description.

**Blanks** (player-defined elements): Include relevant blueprint blanks (${blueprint.blanks.join(', ')}) plus any scene-specific elements players should define.

**Transitions**: Must include one with condition "continue" for default progression. Other conditions can reference variables from current game state${this.getAvailableVariables(context) !== 'none (use only "continue" for default transition)' ? ` (${this.getAvailableVariables(context)})` : ''} or scene requirements. Target scene/ending IDs from blueprint above.

RESPONSE FORMAT (JSON ONLY):
{
  "id": "${blueprintScene.id}",
  "goal": "${blueprintScene.goal}",
  "requirements": [
    {
      "key_to_update": "trust_established",
      "description": "Build initial trust through the player's approach and demeanor to enable deeper conversation."
    },
    {
      "key_to_update": "tension_acknowledged",
      "description": "Establish awareness of the danger and urgency that surrounds this meeting."
    }
  ],
  "blanks": ["appearance", "demeanor", "emotional_connection"],
  "transitions": [
    {
      "target": "ending_premature_reveal", 
      "condition": "trust_established == 'hostile'"
    },
    {
      "target": "careful_revelation",
      "condition": "continue"
    }
  ]
}

Generate the scene specification now:`;
  }

  private parseSceneResponse(response: string, context: SceneGeneratorContext): StoryScene {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in scene response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      this.validateSceneStructure(parsed, context);

      return {
        id: parsed.id || context.blueprintScene.id,
        goal: parsed.goal || context.blueprintScene.goal,
        requirements: parsed.requirements,
        blanks: parsed.blanks || [],
        transitions: parsed.transitions,
      };

    } catch (error) {
      console.error('Scene response parsing failed:', error);
      console.error('Raw response:', response);
      throw new Error(`Failed to parse scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateSceneStructure(parsed: any, _context: SceneGeneratorContext): void {
    if (!parsed.id || !parsed.goal || !parsed.requirements || !parsed.transitions) {
      throw new Error('Scene missing one or more root keys: id, goal, requirements, transitions');
    }
    if (!Array.isArray(parsed.requirements)) {
      throw new Error('Scene requirements must be an array.');
    }
    if (!Array.isArray(parsed.transitions) || parsed.transitions.length === 0) {
      throw new Error('Scene transitions must be a non-empty array.');
    }
    if (!parsed.transitions.some((t: any) => t.condition === 'continue')) {
      throw new Error('Scene transitions must include one default transition with condition "continue".');
    }
    
    // Validate that all requirements have valid key_to_update
    for (const req of parsed.requirements) {
      if (!req.key_to_update || typeof req.key_to_update !== 'string') {
        throw new Error(`Requirement missing or invalid key_to_update: ${JSON.stringify(req)}`);
      }
    }
    
    // Basic validation of transition conditions (graceful handling of unknown variables in ConditionEvaluator)
    for (const transition of parsed.transitions) {
      if (transition.condition !== 'continue') {
        if (typeof transition.condition !== 'string' || transition.condition.trim().length === 0) {
          throw new Error(`Invalid transition condition: ${transition.condition}`);
        }
        // Unknown variables will be handled gracefully by ConditionEvaluator as undefined
        // Blanks and requirements can be referenced before they're established
      }
    }
  }


  private formatNarrativeHistory(sessionHistory: GameTurn[]): string {
    if (!sessionHistory || sessionHistory.length === 0) {
      return "This is the first scene.";
    }
    
    return sessionHistory.map((turn, index) => {
      return `Beat ${index + 1}: ${turn.beat.narrative_text}\nPlayer choice: "${turn.choice.text}"`;
    }).join('\n\n');
  }

  private getAvailableVariables(context: SceneGeneratorContext): string {
    const currentStateVars = Object.keys(context.currentState);
    return currentStateVars.length > 0 ? currentStateVars.join(', ') : 'none (use only "continue" for default transition)';
  }
}