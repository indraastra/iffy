import { GameState, Goal, ModelConfig } from './types';
import { PlayerStrategy } from '../strategies/PlayerStrategy';
import { SimpleGoalStrategy } from '../strategies/SimpleGoalStrategy';

export class LLMPlayer {
  private strategy: PlayerStrategy;
  private goals: Goal[];
  private gameHistory: Array<{ action: string; response: string }> = [];
  private modelConfig: ModelConfig;

  constructor(options: {
    goals: Goal[];
    modelConfig?: ModelConfig;
    strategy?: PlayerStrategy;
  }) {
    this.goals = options.goals;
    this.modelConfig = options.modelConfig || {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229'
    };
    
    this.strategy = options.strategy || new SimpleGoalStrategy(this.modelConfig);
  }

  async chooseAction(
    gameState: GameState,
    turnsRemaining?: number
  ): Promise<{
    action: string;
    thinking?: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    const decision = await this.strategy.decideAction({
      goals: this.goals,
      gameHistory: this.gameHistory,
      currentState: gameState,
      turnsRemaining
    });

    const responseTime = Date.now() - startTime;

    return {
      action: decision.action,
      thinking: decision.thinking,
      responseTime
    };
  }

  recordTurn(action: string, response: string): void {
    this.gameHistory.push({ action, response });
  }

  getHistory(): Array<{ action: string; response: string }> {
    return [...this.gameHistory];
  }

  reset(): void {
    this.gameHistory = [];
  }
}