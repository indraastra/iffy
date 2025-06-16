import { Goal, GameState } from '../core/types';

export interface PlayerContext {
  goals: Goal[];
  gameHistory: Array<{
    action: string;
    response: string;
  }>;
  currentState: GameState;
  turnsRemaining?: number;
}

export interface PlayerStrategy {
  decideAction(context: PlayerContext): Promise<{
    action: string;
    thinking?: string;
  }>;
}