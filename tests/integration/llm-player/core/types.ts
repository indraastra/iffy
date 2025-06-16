export interface ModelConfig {
  provider: 'anthropic' | 'gemini' | 'openai';
  model: string;
  apiKey?: string; // Optional, can use env vars
}

export interface Goal {
  type: 'reach_ending' | 'collect_item' | 'visit_scene' | 'unlock_achievement';
  target: string;
  priority?: 'required' | 'optional';
  description?: string; // Optional human-readable description of what achieving this goal means
}

export interface SuccessCriteria {
  allRequiredGoals: boolean;
  withinTurnLimit?: boolean;
  customValidator?: (finalState: GameState) => boolean;
}

export interface TestScenario {
  name: string;
  storyFile: string;
  playerModel?: ModelConfig;
  engineModel?: ModelConfig;
  goals: Goal[];
  maxTurns?: number;
  successCriteria: SuccessCriteria;
  observability?: {
    interactive?: boolean;
    showThinking?: boolean;
    verbosity?: 'quiet' | 'normal' | 'debug';
  };
  logging?: {
    saveTranscript?: boolean;
    saveDebugInfo?: boolean;
    logDirectory?: string;
  };
}

export interface GameState {
  currentScene: string;
  availableActions: string[];
  visibleText: string;
  inventory?: string[];
  flags?: Record<string, any>;
}

export interface GoalStatus {
  goal: Goal;
  achieved: boolean;
  achievedAtTurn?: number;
}

export interface InteractionLog {
  turnNumber: number;
  timestamp: string;
  gameState: GameState;
  player: {
    thinking?: string;
    chosenAction: string;
    modelUsed: string;
    responseTime: number;
    prompt?: string;
    rawResponse?: string;
  };
  engineResponse: {
    narrative: string;
    newScene?: string;
    stateChanges?: any;
    errors?: string[];
  };
  goalProgress: {
    goalsStatus: GoalStatus[];
    isComplete: boolean;
  };
}

export interface EndingAssessment {
  endingReached: string | null;
  conditionsMet: boolean;
  reasoning: string;
  evidenceFromHistory: string[];
  recommendedAction: 'PASS' | 'FAIL';
}

export interface TestResult {
  success: boolean;
  scenario: string;
  turnsPlayed: number;
  goalsAchieved: GoalStatus[];
  finalState: GameState;
  errorMessage?: string;
  logPath?: string;
  duration: number;
  assessment?: EndingAssessment;
}