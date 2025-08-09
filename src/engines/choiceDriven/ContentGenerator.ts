import { MultiModelService } from '../../services/multiModelService.js';
import { 
  ContentGenerationContext, 
  GeneratedContent, 
  Choice
} from '../../types/choiceDrivenStory.js';

export class ContentGenerator {
  private llmService: MultiModelService;

  constructor(llmService: MultiModelService) {
    this.llmService = llmService;
  }

  // Generate narrative and choices for a scene
  async generateContent(context: ContentGenerationContext): Promise<GeneratedContent> {
    const prompt = this.buildPrompt(context);
    
    try {
      const response = await this.llmService.makeRequest(prompt);
      return this.parseResponse(response);
    } catch (error) {
      throw new Error(`Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Build the LLM prompt for content generation
  private buildPrompt(context: ContentGenerationContext): string {
    const { story, currentState, sceneId, scene, history } = context;
    
    // Recent history context (last 2 turns)
    const recentHistory = history.slice(-2);
    const historyText = recentHistory.length > 0 
      ? recentHistory.map(turn => `Previous: ${turn.content.narrative} | Player chose: ${turn.content.choices[turn.choiceIndex].text}`).join('\n')
      : 'This is the beginning of the story.';

    // Current state summary
    const stateText = Object.entries(currentState)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    return `You are generating content for an interactive story called "${story.title}".

STORY SUMMARY:
${story.summary}

CURRENT SCENE: ${sceneId}
Scene Purpose: ${scene.purpose}

CURRENT STATE:
${stateText}

RECENT HISTORY:
${historyText}

INSTRUCTIONS:
Generate a narrative paragraph (2-4 sentences) that:
1. Fits the scene purpose and current story context
2. Reflects the current state values naturally in the narrative
3. Sets up meaningful choices for the player
4. Maintains narrative continuity from recent history

Then provide exactly 3 choices that:
1. Have clear, different emotional/strategic directions
2. Include specific state effects that make sense
3. Use appropriate effect operations (+1, -1, true, false, or direct values)
4. Have a "next" field indicating flow direction ("continue", "escalate", "resolve", etc.)

RESPONSE FORMAT (JSON):
{
  "narrative": "Your narrative text here...",
  "choices": [
    {
      "text": "Choice option 1",
      "effects": {"state_key": "+1", "another_key": true},
      "next": "continue"
    },
    {
      "text": "Choice option 2", 
      "effects": {"state_key": "-1", "different_key": "new_value"},
      "next": "escalate"
    },
    {
      "text": "Choice option 3",
      "effects": {"state_key": "0", "flag_key": false},
      "next": "resolve"
    }
  ]
}

Generate content now:`;
  }

  // Parse LLM response into structured content
  private parseResponse(response: string): GeneratedContent {
    try {
      // Try to extract JSON from response (handle potential markdown formatting)
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
        if (!choice.text || !choice.effects || !choice.next) {
          throw new Error(`Choice ${i + 1} missing required fields`);
        }
      }

      return {
        narrative: parsed.narrative,
        choices: parsed.choices as Choice[]
      };

    } catch (error) {
      // Fallback content if parsing fails
      console.error('Failed to parse LLM response:', error);
      console.error('Raw response:', response);
      
      return this.generateFallbackContent(response);
    }
  }

  // Generate fallback content when parsing fails
  private generateFallbackContent(_rawResponse: string): GeneratedContent {
    return {
      narrative: "Something unexpected happens in the story. The narrative continues, but the details are unclear.",
      choices: [
        {
          text: "Continue cautiously",
          effects: {},
          next: "continue"
        },
        {
          text: "Take bold action", 
          effects: {},
          next: "escalate"
        },
        {
          text: "Step back and observe",
          effects: {},
          next: "observe"
        }
      ]
    };
  }

  // Test method to validate LLM service is working
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.llmService.makeRequest('Respond with "OK" if you can see this message.');
      return response.toLowerCase().includes('ok');
    } catch {
      return false;
    }
  }
}