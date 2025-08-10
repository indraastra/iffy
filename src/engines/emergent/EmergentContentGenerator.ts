import { MultiModelService } from '../../services/multiModelService.js';
import { 
  ContentGenerationContext, 
  GeneratedContent, 
  Choice 
} from '../../types/emergentStory.js';
import { DebugTracker } from './DebugTracker.js';

export class EmergentContentGenerator {
  private llmService: MultiModelService;
  private debugTracker?: DebugTracker;

  constructor(llmService: MultiModelService, debugTracker?: DebugTracker) {
    this.llmService = llmService;
    this.debugTracker = debugTracker;
  }

  // Generate content for current scene (LLM as Narrator)
  async generateContent(context: ContentGenerationContext): Promise<GeneratedContent> {
    const prompt = this.buildNarrationPrompt(context);
    const startTime = performance.now();
    
    try {
      const response = await this.llmService.makeRequest(prompt);
      const processingTime = performance.now() - startTime;
      
      // Track successful LLM interaction
      this.debugTracker?.trackLLMInteraction(
        'content_generation',
        'narrator',
        prompt,
        response,
        true,
        processingTime
      );
      
      return this.parseResponse(response);
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Track failed LLM interaction
      this.debugTracker?.trackLLMInteraction(
        'content_generation',
        'narrator',
        prompt,
        '',
        false,
        processingTime,
        errorMessage
      );
      
      throw new Error(`Content generation failed: ${errorMessage}`);
    }
  }

  // Build LLM prompt for content generation (Narrator role)
  private buildNarrationPrompt(context: ContentGenerationContext): string {
    const { compiledStructure, currentScene, currentState, history, sceneIndex } = context;
    
    // Scene progress context
    const sceneProgress = `Scene ${sceneIndex + 1} of ${compiledStructure.scene_sequence.length}`;
    const isLastScene = sceneIndex === compiledStructure.scene_sequence.length - 1;
    
    // Recent history context
    const recentHistory = history.slice(-2);
    const historyText = recentHistory.length > 0 
      ? recentHistory.map(turn => `Previous: ${turn.content.narrative} | Player chose: ${turn.content.choices[turn.choiceIndex].text}`).join('\n')
      : 'This is the beginning of the story.';

    // Current state summary
    const stateText = Object.entries(currentState)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    // Ending conditions for context
    const endingContext = compiledStructure.endings
      .map(ending => `- ${ending.id}: ${ending.condition} (${ending.tone})`)
      .join('\n');

    // Style guidelines context
    const guidelines = compiledStructure.guidelines;
    const narrativeStyle = guidelines?.narrative || 'default narrative style';
    const choiceStyle = guidelines?.choices || 'explicit-effects, actions';
    const toneStyle = guidelines?.tone || 'neutral';

    return `You are the narrator for "${compiledStructure.title}". 

STORY STRUCTURE:
Original narrative: ${context.compiledStructure.title}
${sceneProgress} | Current Scene: ${currentScene.id}
Scene Goal: ${currentScene.goal}

STYLE GUIDELINES:
Narrative: ${narrativeStyle}
Choices: ${choiceStyle}
Tone: ${toneStyle}

CURRENT STATE:
${stateText}

RECENT HISTORY:
${historyText}

AVAILABLE ENDINGS:
${endingContext}

SCENE CONTEXT:
${isLastScene ? 'This is the FINAL SCENE - build toward resolution and ending conditions.' : 'This is a progression scene - develop the story toward the scene goal.'}

${this.generateEnvironmentalContext(currentScene)}

${this.generateRequirementsGuidance(currentScene, context.currentState)}

INSTRUCTIONS:
Generate a narrative beat (2-4 sentences) that:
1. Advances the scene goal: "${currentScene.goal}"
2. Reflects current state naturally in the story
3. Uses the specified narrative style: ${narrativeStyle}
4. Maintains the specified tone: ${toneStyle}
5. Creates meaningful choice opportunities
6. ${isLastScene ? 'Builds toward ending conditions and resolution' : 'Progresses the story logically'}

Then provide exactly 3 choices that:
1. Have clear different impacts on state variables
2. Move toward fulfilling the scene goal
3. Follow the choice style: ${choiceStyle}
4. Use appropriate state effects (+1, -1, true, false, or direct values)
5. ${isLastScene ? 'Can trigger ending conditions' : 'Develop characters and advance the plot'}

Mark the content as "scene_complete: true" if the scene goal has been fulfilled and the story should advance to the next scene.

RESPONSE FORMAT (JSON):
{
  "narrative": "Your narrative text here...",
  "scene_complete": false,
  "choices": [
    {
      "text": "Choice option 1",
      "effects": {"state_var": "+1", "flag": true}
    },
    {
      "text": "Choice option 2", 
      "effects": {"state_var": "-1", "different_flag": false}
    },
    {
      "text": "Choice option 3",
      "effects": {"new_var": "value", "counter": "+2"}
    }
  ]
}

Generate content now:`;
  }

  // Generate guidance for scene requirements
  private generateRequirementsGuidance(currentScene: any, currentState: any): string {
    if (!currentScene.requirements || currentScene.requirements.length === 0) {
      return '';
    }

    // Find unset requirements
    const unsetRequirements = currentScene.requirements.filter((req: any) => {
      const value = currentState[req.stateKey];
      return value === undefined || value === null || value === '';
    });

    if (unsetRequirements.length === 0) {
      return 'SCENE REQUIREMENTS: All required state variables have been established. Scene is ready to advance when narratively complete.';
    }

    // Generate diegetic guidance for unset requirements
    const nextRequirement = unsetRequirements[0];
    let guidance = `SCENE REQUIREMENTS - MISSING STATE:\n`;
    guidance += `PRIORITY: Establish "${nextRequirement.stateKey}" (${nextRequirement.description})`;
    
    if (nextRequirement.validValues && nextRequirement.validValues.length > 0) {
      guidance += `\nValid values: ${nextRequirement.validValues.join(', ')}`;
      guidance += `\n\nDIEGETIC CHOICE GUIDANCE:`;
      guidance += `\nCreate choices where the TEXT ITSELF establishes ${nextRequirement.stateKey} through pronouns, memories, and context.`;
      
      // Generate templated examples based on valid values
      const examples = this.generateDiegeticExamples(nextRequirement.stateKey, nextRequirement.validValues);
      if (examples.length > 0) {
        guidance += `\nExamples: ${examples.join(', ')}`;
      }
    }
    
    guidance += `\nThe scene cannot advance until this state variable is established through player choice.`;
    
    if (unsetRequirements.length > 1) {
      guidance += `\nRemaining requirements: ${unsetRequirements.slice(1).map((req: any) => req.stateKey).join(', ')}`;
    }

    return guidance;
  }

  // Generate environmental context for the scene
  private generateEnvironmentalContext(currentScene: any): string {
    if (!currentScene.environment) {
      return '';
    }

    const env = currentScene.environment;
    let context = 'ENVIRONMENTAL CONTEXT:\n';
    
    if (env.setting) {
      context += `Setting: ${env.setting}\n`;
    }
    
    if (env.atmosphere) {
      context += `Atmosphere: ${env.atmosphere}\n`;
    }
    
    if (env.timeOfDay) {
      context += `Time: ${env.timeOfDay}\n`;
    }
    
    if (env.details && env.details.length > 0) {
      context += `Details: ${env.details.join(', ')}\n`;
    }
    
    context += '\nWeave this environmental context into your narrative and ensure choices feel grounded in this setting.';
    
    return context;
  }

  // Generate templated diegetic choice examples
  private generateDiegeticExamples(stateKey: string, validValues: string[]): string[] {
    // Generic templated examples that work for any state variable
    const examples: string[] = [];
    
    // Take first few values as examples
    const exampleValues = validValues.slice(0, 3);
    
    // Generic diegetic patterns using the actual state key and values
    exampleValues.forEach(value => {
      examples.push(`'Remember when [specific memory related to ${value}]...' (sets ${stateKey}: "${value}")`);
    });
    
    return examples;
  }

  // Parse LLM response into structured content
  private parseResponse(response: string): GeneratedContent {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.narrative || !parsed.choices || !Array.isArray(parsed.choices)) {
        throw new Error('Invalid response structure');
      }

      if (parsed.choices.length !== 3) {
        throw new Error(`Expected 3 choices, got ${parsed.choices.length}`);
      }

      // Validate each choice
      for (let i = 0; i < parsed.choices.length; i++) {
        const choice = parsed.choices[i];
        if (!choice.text || choice.effects === undefined) {
          throw new Error(`Choice ${i + 1} missing required fields`);
        }
        // Ensure effects is an object
        if (typeof choice.effects !== 'object') {
          choice.effects = {};
        }
      }

      return {
        narrative: parsed.narrative,
        choices: parsed.choices as Choice[],
        scene_complete: Boolean(parsed.scene_complete)
      };

    } catch (error) {
      console.error('Failed to parse content generation response:', error);
      console.error('Raw response:', response);
      
      return this.generateFallbackContent();
    }
  }

  // Generate fallback content when parsing fails
  private generateFallbackContent(): GeneratedContent {
    return {
      narrative: "The story continues, though the exact details are unclear. You must make a choice about how to proceed.",
      scene_complete: false,
      choices: [
        {
          text: "Take a cautious approach",
          effects: { caution: "+1" }
        },
        {
          text: "Act boldly and decisively", 
          effects: { boldness: "+1" }
        },
        {
          text: "Wait and observe the situation",
          effects: { patience: "+1" }
        }
      ]
    };
  }

  // Generate ending content when story concludes
  async generateEndingContent(context: any): Promise<GeneratedContent> {
    const { triggeredEnding, finalState, storyHistory, compiledStructure } = context;
    
    const prompt = this.buildEndingPrompt(triggeredEnding, finalState, storyHistory, compiledStructure);
    const startTime = performance.now();
    
    try {
      const response = await this.llmService.makeRequest(prompt);
      const processingTime = performance.now() - startTime;
      
      // Track successful LLM interaction
      this.debugTracker?.trackLLMInteraction(
        'content_generation',
        'narrator',
        prompt,
        response,
        true,
        processingTime
      );
      
      return this.parseEndingResponse(response, triggeredEnding);
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Track failed LLM interaction
      this.debugTracker?.trackLLMInteraction(
        'content_generation',
        'narrator',
        prompt,
        '',
        false,
        processingTime,
        errorMessage
      );
      
      return this.createFallbackEndingContent(triggeredEnding);
    }
  }

  // Build prompt for ending generation
  private buildEndingPrompt(ending: any, finalState: any, history: any[], compiledStructure: any): string {
    const historyText = history.map(turn => 
      `${turn.content.narrative} | Player chose: ${turn.content.choices[turn.choiceIndex].text}`
    ).join('\n');
    
    // Style guidelines for ending
    const guidelines = compiledStructure.guidelines;
    const narrativeStyle = guidelines?.narrative || 'default narrative style';
    const toneStyle = guidelines?.tone || 'neutral';

    return `You are the narrator for "${compiledStructure.title}". The story has reached its conclusion with the "${ending.id}" ending (${ending.tone}).

STYLE GUIDELINES:
Narrative: ${narrativeStyle}
Tone: ${toneStyle}

STORY SUMMARY:
${historyText}

FINAL STATE:
${Object.entries(finalState).map(([key, value]) => `${key}: ${value}`).join(', ')}

ENDING DETAILS:
- ID: ${ending.id}
- Tone: ${ending.tone} 
- Condition: ${ending.condition}

INSTRUCTIONS:
Generate a satisfying conclusion that:
1. Reflects the ${ending.tone} tone appropriately
2. Shows the consequences of the player's choices throughout the story
3. Incorporates the final state values meaningfully
4. Provides narrative closure that feels earned
5. Is 3-6 sentences of rich, emotional conclusion

Respond in JSON format:
{
  "narrative": "Your concluding narrative here...",
  "scene_complete": true,
  "choices": [
    {"text": "Play again with a new story structure", "effects": {}},
    {"text": "Load a different narrative", "effects": {}}
  ]
}`;
  }

  // Parse ending response or provide fallback
  private parseEndingResponse(response: string, ending: any): GeneratedContent {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.narrative && typeof parsed.narrative === 'string') {
          return {
            narrative: parsed.narrative,
            scene_complete: true,
            choices: [
              { text: "Play again with a new story structure", effects: {} },
              { text: "Load a different narrative", effects: {} }
            ]
          };
        }
      }
    } catch (error) {
      console.warn('Failed to parse ending response:', error);
    }
    
    return this.createFallbackEndingContent(ending);
  }

  // Create fallback ending content
  private createFallbackEndingContent(ending: any): GeneratedContent {
    return {
      narrative: `The story reaches its ${ending.tone} conclusion. Though the path was winding, your choices have led to this meaningful resolution. The threads of the narrative come together in a way that honors the journey you've taken.`,
      scene_complete: true,
      choices: [
        { text: "Play again with a new story structure", effects: {} },
        { text: "Load a different narrative", effects: {} }
      ]
    };
  }

  // Test connection to LLM service
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.llmService.makeRequest('Respond with "OK" if you can see this message.');
      return response.toLowerCase().includes('ok');
    } catch {
      return false;
    }
  }
}