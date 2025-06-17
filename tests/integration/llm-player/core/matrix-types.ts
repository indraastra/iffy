/**
 * Types for the matrix testing framework
 */

import { ModelConfig, Goal, GameState, GoalStatus } from './types';

// Profile configuration types
export interface EngineProfile {
  costModel: ModelConfig;
  qualityModel: ModelConfig;
  description?: string;
}

export interface PlayerProfile extends ModelConfig {
  description?: string;
  temperature?: number;
}

export interface ModelProfiles {
  engineProfiles: Record<string, EngineProfile>;
  playerProfiles: Record<string, PlayerProfile>;
  testSuites: Record<string, TestSuite>;
}

export interface TestSuite {
  engineProfiles: string[];
  playerProfiles: string[];
  description?: string;
}

// Test execution types
export interface TestCombination {
  scenario: TestScenario;
  engineProfile: string;
  playerProfile: string;
  engineModels: {
    costModel: ModelConfig;
    qualityModel: ModelConfig;
  };
  playerModel: ModelConfig;
}

export interface TestScenario {
  name: string;
  storyFile: string;
  goals: Goal[];
  maxTurns?: number;
  successCriteria: {
    allRequiredGoals: boolean;
    withinTurnLimit?: boolean;
  };
  // Profile references (new)
  engineProfile?: string;
  playerProfile?: string;
  // Direct model specification (legacy support)
  engineModels?: {
    costModel?: ModelConfig;
    qualityModel?: ModelConfig;
  };
  playerModel?: ModelConfig;
  // Additional settings
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

// Results types
export interface SingleTestResult {
  combination: TestCombination;
  success: boolean;
  turnsPlayed: number;
  duration: number;
  goalsAchieved: GoalStatus[];
  finalState: GameState;
  endingReached?: string;
  errorMessage?: string;
  costs: {
    engine: {
      classification: number;
      generation: number;
      total: number;
    };
    player: number;
    total: number;
  };
  metrics: {
    classificationCalls: number;
    generationCalls: number;
    playerCalls: number;
  };
  logPath?: string;
}

export interface MatrixTestResult {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
    timestamp: string;
    totalCost: {
      byProvider: Record<string, number>;
      total: number;
    };
  };
  
  byEngineProfile: Record<string, {
    tests: number;
    passed: number;
    failed: number;
    avgTurns: number;
    avgDuration: number;
    successRate: number;
    avgCost: {
      classification: number;
      generation: number;
      total: number;
    };
  }>;
  
  byPlayerProfile: Record<string, {
    tests: number;
    passed: number;
    failed: number;
    avgTurns: number;
    successRate: number;
    avgCost: number;
  }>;
  
  byScenario: Record<string, {
    results: Array<{
      engineProfile: string;
      playerProfile: string;
      success: boolean;
      turns: number;
      duration: number;
      endingReached?: string;
      errorMessage?: string;
      cost: {
        engine: { classification: number; generation: number };
        player: number;
        total: number;
      };
    }>;
  }>;
  
  failures: Array<{
    scenario: string;
    engineProfile: string;
    playerProfile: string;
    error: string;
    logPath?: string;
  }>;
  
  modelPerformance: {
    classificationAccuracy: Record<string, {
      correct: number;
      total: number;
      accuracy: number;
    }>;
  };
  
  detailedResults: SingleTestResult[];
}

// Configuration types
export interface MatrixTestConfig {
  scenarios: string[];  // Paths to scenario files
  engineProfiles?: string[];  // Specific engine profiles to test
  playerProfiles?: string[];  // Specific player profiles to test
  testSuite?: string;  // Or use a predefined test suite
  parallel?: number;  // Number of parallel tests (default: 1)
  outputFormat?: 'summary' | 'detailed' | 'json';
  resultsDir?: string;
  profilesPath?: string;  // Path to profiles config (default: tests/config/model-profiles.yaml)
}