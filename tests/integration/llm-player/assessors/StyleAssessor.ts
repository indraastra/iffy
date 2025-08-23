import { MultiModelService } from '../../../../src/services/multiModelService';
import { ModelConfig, InteractionLog } from '../core/types';
import { z } from 'zod';

const StyleAssessmentSchema = z.object({
  styleConsistency: z.number().min(0).max(10).describe('How consistently the narrative matched the expected style throughout (0-10)'),
  characterVoiceAlignment: z.number().min(0).max(10).describe('How well character dialogue matched the expected style (0-10)'),
  narrativeElementsAlignment: z.number().min(0).max(10).describe('How well narrative descriptions matched the expected style (0-10)'),
  adaptationEvidence: z.array(z.string()).describe('Specific examples from the game history that demonstrate style adaptation'),
  styleViolations: z.array(z.string()).describe('Instances where the narrative broke from the expected style'),
  overallScore: z.number().min(0).max(10).describe('Overall assessment of how well the adaptive style system worked'),
  recommendedAction: z.enum(['PASS', 'FAIL']).describe('Whether the test should pass based on style consistency'),
  reasoning: z.string().describe('Detailed explanation of the assessment')
});

export interface StyleAssessment {
  styleConsistency: number;
  characterVoiceAlignment: number;
  narrativeElementsAlignment: number;
  adaptationEvidence: string[];
  styleViolations: string[];
  overallScore: number;
  recommendedAction: 'PASS' | 'FAIL';
  reasoning: string;
}

export class StyleAssessor {
  private modelService: MultiModelService;

  constructor(modelConfig?: ModelConfig) {
    this.modelService = new MultiModelService();
    
    if (modelConfig) {
      this.modelService.setConfig({
        provider: modelConfig.provider,
        model: modelConfig.model,
        apiKey: modelConfig.apiKey || process.env[`${modelConfig.provider.toUpperCase()}_API_KEY`] || ''
      });
    }
  }

  async assessStyleAdaptation(
    gameHistory: InteractionLog[],
    expectedStyleName: string,
    expectedStyleCharacteristics: string[]
  ): Promise<StyleAssessment> {
    const prompt = this.buildStyleAssessmentPrompt(gameHistory, expectedStyleName, expectedStyleCharacteristics);
    
    console.log(`🎭 Assessing narrative style adaptation for: ${expectedStyleName}`);
    
    try {
      const result = await this.modelService.makeStructuredRequest(
        prompt,
        StyleAssessmentSchema,
        { temperature: 0.1 } // Low temperature for analytical consistency
      );
      
      return result.data;
    } catch (error) {
      console.error('Error during style assessment:', error);
      return {
        styleConsistency: 0,
        characterVoiceAlignment: 0,
        narrativeElementsAlignment: 0,
        adaptationEvidence: [],
        styleViolations: [`Assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        overallScore: 0,
        recommendedAction: 'FAIL',
        reasoning: `Style assessment could not be completed due to technical error.`
      };
    }
  }

  private buildStyleAssessmentPrompt(
    gameHistory: InteractionLog[],
    expectedStyleName: string,
    expectedStyleCharacteristics: string[]
  ): string {
    return `You are a literary expert analyzing whether an interactive narrative successfully adapted its style to match a specific writing style or genre.

EXPECTED STYLE: ${expectedStyleName}

EXPECTED STYLE CHARACTERISTICS:
${expectedStyleCharacteristics.map(char => `- ${char}`).join('\n')}

COMPLETE GAME HISTORY TO ANALYZE:
${this.formatGameHistoryForStyleAnalysis(gameHistory)}

ASSESSMENT CRITERIA:

1. STYLE CONSISTENCY (0-4 points):
   - How consistently did the narrative voice match the expected style?
   - Were sentence structures, rhythms, and pacing appropriate?
   - Did the tone remain consistent throughout?
   - Was the vocabulary and register appropriate for the style?

2. CHARACTER VOICE ALIGNMENT (0-3 points):
   - Did character dialogue match the expected style?
   - Was the speaking style (formal/informal, poetic/plain, etc.) appropriate?
   - Did characters express themselves in a way consistent with the style?

3. NARRATIVE ELEMENTS ALIGNMENT (0-3 points):
   - Did scene descriptions match the style?
   - Were metaphors and imagery consistent with the expected approach?
   - Did the overall atmosphere and mood reflect the style?

SCORING GUIDELINES:
- 9-10: Exceptional adaptation, captures the essence of the target style beautifully
- 7-8: Strong adaptation with clear stylistic alignment and only minor inconsistencies
- 5-6: Moderate adaptation, recognizable style elements but with noticeable inconsistencies
- 3-4: Weak adaptation, some attempts at style matching but many violations
- 1-2: Minimal adaptation, mostly generic narrative with occasional stylistic elements
- 0: No apparent adaptation or complete failure to match the expected style

SPECIFIC EVIDENCE REQUIREMENTS:
- Quote specific phrases, sentences, or exchanges that demonstrate successful style adaptation
- Identify moments where the narrative successfully captures the target style
- Note any significant departures from the expected style
- Compare different parts of the narrative to show consistency or inconsistency patterns

Your assessment should determine whether the adaptive narrative system successfully transformed its voice to match the target style.`;
  }

  private formatGameHistoryForStyleAnalysis(gameHistory: InteractionLog[]): string {
    if (gameHistory.length === 0) {
      return 'No game history available for analysis.';
    }

    let result = '';
    
    for (const log of gameHistory) {
      result += `\n--- Turn ${log.turnNumber} ---\n`;
      result += `Player Action: "${log.player.chosenAction}"\n`;
      result += `Narrative Response: "${log.engineResponse.narrative}"\n`;
      
      if (log.engineResponse.newScene) {
        result += `Scene: ${log.engineResponse.newScene}\n`;
      }
      
      // Include any character dialogue or special stylistic elements
      if (log.engineResponse.stateChanges) {
        result += `State Changes: ${JSON.stringify(log.engineResponse.stateChanges, null, 2)}\n`;
      }
    }

    return result;
  }
}