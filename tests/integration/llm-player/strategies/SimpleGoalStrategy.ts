import { PlayerStrategy, PlayerContext } from './PlayerStrategy';
import { ModelConfig } from '../core/types';
import { MultiModelService } from '../../../../src/services/multiModelService';
import { CostTracker } from '../utils/costTracker';
import { z } from 'zod';

const PlayerDecisionSchema = z.object({
  thinking: z.string().describe('Your reasoning about what to do next to advance your goals'),
  action: z.string().describe('What you say or do - dialogue, actions, or thoughts that feel natural for this moment')
});

export class SimpleGoalStrategy implements PlayerStrategy {
  private modelService: MultiModelService;
  private modelConfig: ModelConfig;
  private costTracker?: CostTracker;

  constructor(modelConfig: ModelConfig, costTracker?: CostTracker) {
    this.modelConfig = modelConfig;
    this.costTracker = costTracker;
    this.modelService = new MultiModelService();
    
    // Configure the model service
    this.modelService.setConfig({
      provider: modelConfig.provider,
      model: modelConfig.model,
      apiKey: modelConfig.apiKey || process.env[`${modelConfig.provider.toUpperCase()}_API_KEY`] || ''
    });
    
    // Set up cost tracking if available
    if (this.costTracker) {
      this.modelService.setMetricsHandler((metrics) => {
        this.costTracker!.recordPlayerUsage(
          this.modelConfig,
          metrics.promptTokens,
          metrics.completionTokens
        );
      });
    }
  }

  async decideAction(context: PlayerContext): Promise<{
    action: string;
    thinking?: string;
  }> {
    const prompt = this.buildPrompt(context);
    
    // Log the LLM player's prompt for debugging
    console.log('🧠 LLM Player Prompt:');
    console.log('─'.repeat(80));
    console.log(prompt);
    console.log('─'.repeat(80));
    
    const startTime = Date.now();
    
    try {
      const result = await this.modelService.makeStructuredRequest(
        prompt,
        PlayerDecisionSchema,
        { temperature: 0.7 }
      );
      
      const responseTime = Date.now() - startTime;
      
      return {
        action: result.data.action.trim(),
        thinking: result.data.thinking
      };
    } catch (error) {
      console.error('Error getting player decision:', error);
      // Fallback to simple action
      return {
        action: 'Continue with the story',
        thinking: 'Error occurred, choosing default action'
      };
    }
  }

  private buildPrompt(context: PlayerContext): string {
    let prompt = `You are playing an interactive story game. You should act like a real person would - use simple, natural language and make realistic choices.

CURRENT GOALS:
${context.goals.map(g => `- ${this.formatGoal(g)}`).join('\n')}

GAME HISTORY:
${this.formatGameHistory(context.gameHistory)}

CURRENT SCENE:
${context.currentState.visibleText}

${context.gameHistory.length === 0 ? 
  'This is the opening moment of the story. You should respond to the situation presented above.' : 
  ''}

${context.turnsRemaining ? `TURNS REMAINING: ${context.turnsRemaining}` : ''}

IMPORTANT: Respond like a normal person would. Use simple, direct language. For example:
- Say "I look at Alex" instead of "I study Alex's countenance with careful attention"
- Say "Hey, what's wrong?" instead of "I inquire about the source of your apparent distress"
- Say "I press the red button" instead of "I deliberately engage with the crimson activation mechanism"

Be concise and human. Keep your goals in mind but act naturally.

Respond with what you would naturally say or do in this situation. You can express dialogue, actions, or thoughts - whatever feels most appropriate for the moment.`;

    return prompt;
  }

  private formatGoal(goal: Goal): string {
    const priority = goal.priority === 'required' ? '🔴 REQUIRED' : '🟡 OPTIONAL';
    
    const baseDescription = (() => {
      switch (goal.type) {
        case 'reach_ending':
          return `Reach the ending: "${goal.target}"`;
        case 'collect_item':
          return `Collect the item: "${goal.target}"`;
        case 'visit_scene':
          return `Visit the scene: "${goal.target}"`;
        case 'unlock_achievement':
          return `Unlock achievement: "${goal.target}"`;
        default:
          return `${goal.type}: "${goal.target}"`;
      }
    })();
    
    const description = goal.description ? ` (${goal.description})` : '';
    return `${priority} ${baseDescription}${description}`;
  }

  private formatGameHistory(history: Array<{ action: string; response: string }>): string {
    if (history.length === 0) {
      return '[This is the beginning of the game]';
    }

    const recentHistory = history.slice(-5); // Last 5 turns
    return recentHistory.map((turn, i) => 
      `Turn ${history.length - recentHistory.length + i + 1}:
  You chose: ${turn.action}
  Result: ${turn.response}`
    ).join('\n\n');
  }

}