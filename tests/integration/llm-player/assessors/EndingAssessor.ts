import { MultiModelService } from '../../../../src/services/multiModelService';
import { EndingAssessment, ModelConfig, InteractionLog } from '../core/types';
import { z } from 'zod';

const AssessmentSchema = z.object({
  endingReached: z.string().nullable().describe('The ID of the ending that was reached, or null if no ending'),
  conditionsMet: z.boolean().describe('Whether the ending conditions were actually met based on the game history'),
  reasoning: z.string().describe('Detailed reasoning about whether the conditions were met'),
  evidenceFromHistory: z.array(z.string()).describe('Specific evidence from the game history that supports or contradicts the ending'),
  recommendedAction: z.enum(['PASS', 'FAIL']).describe('Whether the test should pass or fail based on this assessment')
});

export class EndingAssessor {
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

  async assessEnding(
    story: any,
    gameHistory: InteractionLog[],
    claimedEndingId: string | null
  ): Promise<EndingAssessment> {
    const prompt = this.buildAssessmentPrompt(story, gameHistory, claimedEndingId);
    
    console.log('🔍 Running post-game ending assessment...');
    
    try {
      const result = await this.modelService.makeStructuredRequest(
        prompt,
        AssessmentSchema,
        { temperature: 0.1 } // Low temperature for analytical task
      );
      
      return result.data;
    } catch (error) {
      console.error('Error during ending assessment:', error);
      return {
        endingReached: claimedEndingId,
        conditionsMet: false,
        reasoning: `Assessment failed due to error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        evidenceFromHistory: [],
        recommendedAction: 'FAIL'
      };
    }
  }

  private buildAssessmentPrompt(
    story: any,
    gameHistory: InteractionLog[],
    claimedEndingId: string | null
  ): string {
    return `You are a game testing analyst. Your job is to verify whether a story ending was correctly triggered based on the actual game history.

STORY ENDING CONDITIONS:
${this.formatEndingConditions(story)}

CLAIMED ENDING REACHED: ${claimedEndingId || 'None'}

COMPLETE GAME HISTORY:
${this.formatGameHistory(gameHistory)}

ANALYSIS TASK:
1. Examine the game history EXCLUDING the final ending narrative
2. Check if the conditions for "${claimedEndingId}" were already satisfied BEFORE the ending was triggered
3. Look for concrete evidence in the player actions and story responses that led up to the ending
4. Determine if the ending trigger was justified by the preceding game state

CRITICAL RULES:
- IGNORE the final ending narrative - endings often describe conditions being fulfilled
- Focus ONLY on what happened in the turns LEADING UP to the ending
- The conditions must be satisfied by player actions and story progression, not by the ending text itself
- Look for evidence that the required game state was achieved through gameplay
- If conditions mention things like "leaving together" or "conversation concluded", verify these states were reached through player choices and story responses BEFORE the ending triggered

Example: If ending requires "all buttons pressed", check that the player actually pressed all buttons in prior turns, not that the ending says "all buttons were pressed".

Your assessment validates whether the game engine correctly detected pre-existing conditions.`;
  }

  private formatEndingConditions(story: any): string {
    if (!story.endings || !story.endings.variations) {
      return 'No ending conditions found in story.';
    }

    let conditions = 'GLOBAL ENDING TRIGGERS:\n';
    if (story.endings.when) {
      story.endings.when.forEach((condition: string) => {
        conditions += `- ${condition}\n`;
      });
    }

    conditions += '\nSPECIFIC ENDING VARIATIONS:\n';
    story.endings.variations.forEach((ending: any) => {
      conditions += `\n"${ending.id}":\n`;
      if (typeof ending.when === 'string') {
        conditions += `  Condition: ${ending.when}\n`;
      } else if (Array.isArray(ending.when)) {
        ending.when.forEach((condition: string) => {
          conditions += `  Condition: ${condition}\n`;
        });
      }
      if (ending.sketch) {
        conditions += `  Description: ${ending.sketch.substring(0, 100)}...\n`;
      }
    });

    return conditions;
  }

  private formatGameHistory(gameHistory: InteractionLog[]): string {
    if (gameHistory.length === 0) {
      return 'No game history available.';
    }

    // Find the last turn where an ending was triggered by looking for ending goals being achieved
    let endingTurnIndex = -1;
    for (let i = gameHistory.length - 1; i >= 0; i--) {
      const log = gameHistory[i];
      if (log.goalProgress.goalsStatus.some(goal => goal.achieved && goal.goal.type === 'reach_ending')) {
        endingTurnIndex = i;
        break;
      }
    }

    let result = '';
    
    // Pre-ending turns (these are what we analyze)
    if (endingTurnIndex > 0) {
      result += 'PRE-ENDING GAME HISTORY (analyze these turns):\n';
      result += '=' .repeat(50) + '\n';
      
      for (let i = 0; i < endingTurnIndex; i++) {
        const log = gameHistory[i];
        result += `\nTurn ${log.turnNumber}:\n`;
        result += `Player Action: ${log.player.chosenAction}\n`;
        result += `Story Response: ${log.engineResponse.narrative}\n`;
        
        if (log.engineResponse.newScene) {
          result += `Scene Changed To: ${log.engineResponse.newScene}\n`;
        }
        
        if (log.engineResponse.errors && log.engineResponse.errors.length > 0) {
          result += `Errors: ${log.engineResponse.errors.join(', ')}\n`;
        }
      }
    }
    
    // Ending turn (for reference but don't analyze)
    if (endingTurnIndex >= 0) {
      const endingLog = gameHistory[endingTurnIndex];
      result += '\n\nENDING TURN (reference only - DO NOT use this to validate conditions):\n';
      result += '=' .repeat(50) + '\n';
      result += `Turn ${endingLog.turnNumber}:\n`;
      result += `Player Action: ${endingLog.player.chosenAction}\n`;
      result += `Story Response: [ENDING NARRATIVE - IGNORE FOR CONDITION VALIDATION]\n`;
    }

    return result;
  }
}