import { ImpressionistEngine } from '../../../../src/engine/impressionistEngine';
import { ImpressionistParser } from '../../../../src/engine/impressionistParser';
import { MultiModelService } from '../../../../src/services/multiModelService';
import { LLMPlayer } from './LLMPlayer';
import { InteractionLogger } from '../utils/InteractionLogger';
import { TestObserver, ConsoleTestObserver, NullTestObserver } from '../observers/TestObserver';
import { 
  TestScenario, 
  TestResult, 
  InteractionLog, 
  GoalStatus,
  GameState,
  EndingAssessment,
  StyleAssessment 
} from './types';
import { EndingAssessor } from '../assessors/EndingAssessor';
import { StyleAssessor } from '../assessors/StyleAssessor';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { configureMultiModelService, preparePlayerModelConfig, validateTestConfiguration, TestConfiguration } from '../utils/modelConfig';
import { CostTracker } from '../utils/costTracker';
import { generateTimestamp } from '../utils/cliUtils';

export class TestRunner {
  private scenario: TestScenario;
  private engine?: ImpressionistEngine;
  private player?: LLMPlayer;
  private logger?: InteractionLogger;
  private observer: TestObserver;
  private goalStatuses: GoalStatus[];
  private skipPauses: boolean = false;
  private costTracker: CostTracker = new CostTracker();

  constructor(options: {
    scenario: TestScenario;
    observer?: TestObserver;
    logger?: InteractionLogger;
    autoMode?: boolean;
  }) {
    this.scenario = options.scenario;
    this.observer = options.observer || new NullTestObserver();
    this.logger = options.logger;
    
    // Set skipPauses if auto mode is enabled
    if (options.autoMode) {
      this.skipPauses = true;
    }
    
    this.goalStatuses = this.scenario.goals.map(goal => ({
      goal,
      achieved: false
    }));
  }

  async execute(): Promise<TestResult> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;
    let turnsPlayed = 0;
    let finalState: GameState | undefined;

    try {
      // Initialize components
      await this.initialize();
      
      // Run the game loop
      turnsPlayed = await this.runGameLoop();
      
      // Evaluate success
      success = this.evaluateSuccess();
      
      // Get final state
      finalState = await this.getCurrentGameState();
      
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Test execution failed:', error);
    }

    // Perform post-game assessments if we have logs and a story
    let assessment: EndingAssessment | undefined;
    let styleAssessment: StyleAssessment | undefined;
    
    if (this.logger && this.engine) {
      const gameHistory = this.logger.getAllLogs();
      const story = this.engine.getCurrentStory();
      const engineState = this.engine.getGameState();
      
      if (gameHistory.length > 0 && story) {
        const playerModelConfig = preparePlayerModelConfig(this.scenario.playerModel!);
        
        // Run ending assessment
        try {
          const assessor = new EndingAssessor(playerModelConfig);
          assessment = await assessor.assessEnding(
            story,
            gameHistory,
            engineState.endingId || null
          );
          
          // Override success based on assessment
          if (assessment.recommendedAction === 'FAIL') {
            success = false;
            if (!errorMessage) {
              errorMessage = `Post-game assessment failed: ${assessment.reasoning}`;
            }
          }
          
          console.log(`🔍 Ending Assessment: ${assessment.recommendedAction} - ${assessment.reasoning}`);
        } catch (error) {
          console.warn('Post-game ending assessment failed:', error);
        }
        
        // Run style assessment if configured
        if (this.scenario.styleAssessment) {
          try {
            const styleAssessor = new StyleAssessor(playerModelConfig);
            styleAssessment = await styleAssessor.assessStyleAdaptation(
              gameHistory,
              this.scenario.styleAssessment.expectedStyleName,
              this.scenario.styleAssessment.expectedStyleCharacteristics
            );
            
            // Override success based on style assessment
            if (styleAssessment.recommendedAction === 'FAIL') {
              success = false;
              if (!errorMessage) {
                errorMessage = `Style assessment failed: ${styleAssessment.reasoning}`;
              }
            }
            
            console.log(`🎭 Style Assessment: ${styleAssessment.recommendedAction} - Score: ${styleAssessment.overallScore}/10`);
          } catch (error) {
            console.warn('Post-game style assessment failed:', error);
          }
        }
      }
    }

    const result: TestResult = {
      success,
      scenario: this.scenario.name,
      turnsPlayed,
      goalsAchieved: [...this.goalStatuses],
      finalState: finalState || {
        currentScene: 'unknown',
        availableActions: [],
        visibleText: 'Test failed to complete'
      },
      errorMessage,
      duration: Date.now() - startTime,
      logPath: this.logger ? this.logger['logDir'] : undefined,
      assessment,
      styleAssessment,
      costs: this.costTracker.getCostBreakdown()
    };

    // Save logs
    if (this.logger) {
      await this.logger.save(this.scenario, result);
    }

    // Notify observer
    this.observer.onTestComplete(success, errorMessage);

    return result;
  }

  private async initialize(): Promise<void> {
    // Initialize logger
    if (this.logger) {
      await this.logger.initialize();
    }

    // Initialize game engine
    const modelService = new MultiModelService();
    
    // Convert scenario to test configuration and validate
    const testConfig: TestConfiguration = {
      engineModels: (this.scenario as any).engineModels,
      engineModel: this.scenario.engineModel,
      playerModel: this.scenario.playerModel!
    };
    
    // Validate configuration before proceeding
    validateTestConfiguration(testConfig);
    
    // Configure the model service
    configureMultiModelService(modelService, testConfig);
    
    // Set up metrics tracking for cost calculation
    modelService.setMetricsHandler((metrics) => {
      // Track engine usage - we need to determine if this is cost or quality model
      if (testConfig.engineModels) {
        // For dual-model setup, we'll need to check which model is being used
        if (metrics.model === testConfig.engineModels.costModel.model) {
          this.costTracker.recordEngineCostUsage(
            testConfig.engineModels.costModel,
            metrics.promptTokens,
            metrics.completionTokens
          );
        } else if (metrics.model === testConfig.engineModels.qualityModel.model) {
          this.costTracker.recordEngineQualityUsage(
            testConfig.engineModels.qualityModel,
            metrics.promptTokens,
            metrics.completionTokens
          );
        }
      } else if (testConfig.engineModel) {
        // Legacy single model - treat as quality model
        this.costTracker.recordEngineQualityUsage(
          testConfig.engineModel,
          metrics.promptTokens,
          metrics.completionTokens
        );
      }
    });
    
    // Read and parse story file
    const storyContent = await readFile(this.scenario.storyFile, 'utf-8');
    const parser = new ImpressionistParser();
    const parseResult = parser.parseFromYaml(storyContent);
    
    if (!parseResult.story) {
      throw new Error(`Failed to parse story: ${parseResult.errors.join(', ')}`);
    }
    
    this.engine = new ImpressionistEngine(modelService);
    const loadResult = this.engine.loadStory(parseResult.story);
    
    if (!loadResult.success) {
      throw new Error(`Failed to load story: ${loadResult.error}`);
    }
    
    // Check if we need to process the initial scene through the LLM
    const initialText = this.engine.getInitialText();
    
    if (initialText === null) {
      // Scene needs LLM processing
      console.log('🎬 Processing initial scene through LLM...');
      const openingResponse = await this.engine.processInitialScene();
      console.log('🎬 Opening narrative established:', openingResponse.text?.substring(0, 100) + '...');
    } else {
      // Scene can use raw text
      console.log('🎬 Using raw initial text:', initialText.substring(0, 100) + '...');
    }

    // Initialize player
    const playerModelConfig = preparePlayerModelConfig(this.scenario.playerModel!);
    this.player = new LLMPlayer({
      goals: this.scenario.goals,
      modelConfig: playerModelConfig,
      costTracker: this.costTracker // Pass cost tracker to player
    });
  }

  private async runGameLoop(): Promise<number> {
    let turn = 0;
    const maxTurns = this.scenario.maxTurns || 50;

    while (turn < maxTurns) {
      turn++;
      
      // Get current game state
      const gameState = await this.getCurrentGameState();
      
      // Notify observer
      this.observer.onTurnStart(turn, this.scenario.maxTurns);
      this.observer.onGameState(gameState);

      // Check if game has ended
      if (this.isGameEnded(gameState)) {
        break;
      }

      // Player chooses action
      const turnsRemaining = this.scenario.maxTurns ? this.scenario.maxTurns - turn : undefined;
      const playerDecision = await this.player!.chooseAction(gameState, turnsRemaining);
      
      this.observer.onPlayerThinking(playerDecision.thinking || '');
      this.observer.onActionChosen(playerDecision.action, playerDecision.responseTime);

      // Execute action in engine
      const engineResponse = await this.executeAction(playerDecision.action);
      
      this.observer.onEngineResponse(engineResponse);

      // Record turn
      this.player!.recordTurn(playerDecision.action, engineResponse.narrative);

      // Update goal progress
      await this.updateGoalProgress();
      
      // Log interaction
      const log: InteractionLog = {
        turnNumber: turn,
        timestamp: generateTimestamp(),
        gameState,
        player: {
          thinking: playerDecision.thinking,
          chosenAction: playerDecision.action,
          modelUsed: this.scenario.playerModel?.model || 'default',
          responseTime: playerDecision.responseTime
        },
        engineResponse,
        goalProgress: {
          goalsStatus: [...this.goalStatuses],
          isComplete: this.areAllRequiredGoalsComplete()
        }
      };
      
      this.logger?.addInteraction(log);
      this.observer.onGoalProgress(log.goalProgress);

      // Check if all required goals are complete
      if (this.areAllRequiredGoalsComplete()) {
        break;
      }

      // Wait for user input if interactive
      if (!this.skipPauses) {
        const input = await this.observer.waitForInput();
        if (input === 'q') {
          throw new Error('Test aborted by user');
        } else if (input === 's') {
          this.skipPauses = true;
        }
      }
    }

    return turn;
  }

  private async getCurrentGameState(): Promise<GameState> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    const engineState = this.engine.getGameState();
    const story = this.engine.getCurrentStory();
    const currentScene = story?.scenes[engineState.currentScene];
    
    // Get the current scene content from the latest narrative
    let visibleText = '';
    
    // Get the last interaction's response if any
    const interactions = engineState.interactions || [];
    if (interactions.length > 0) {
      const lastInteraction = interactions[interactions.length - 1];
      visibleText = lastInteraction.narrative || '';
    } else if (currentScene) {
      // No interactions yet, use scene description or sketch
      visibleText = currentScene.description || currentScene.sketch || '';
      console.log('🎭 Using scene content for initial state:', visibleText?.substring(0, 100) + '...');
    }

    return {
      currentScene: engineState.currentScene || 'unknown',
      availableActions: [], // Not used by ImpressionistEngine
      visibleText,
      inventory: [], // ImpressionistEngine doesn't track inventory directly
      flags: {} // ImpressionistEngine doesn't use flags
    };
  }
  

  private async executeAction(action: string): Promise<InteractionLog['engineResponse']> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    try {
      // Get the response from the engine
      const response = await this.engine.processAction({ input: action });
      
      // Get updated state to check for scene changes
      const newState = this.engine.getGameState();
      const oldScene = this.goalStatuses.length > 0 ? 
        this.logger?.getLatestLog()?.gameState.currentScene : undefined;
      
      return {
        narrative: response.text || 'No response',
        newScene: oldScene !== newState.currentScene ? newState.currentScene : undefined,
        stateChanges: {
          // ImpressionistEngine doesn't track these directly
        },
        errors: response.error ? [response.error] : undefined
      };
    } catch (error) {
      return {
        narrative: 'The action could not be processed.',
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private async updateGoalProgress(): Promise<void> {
    const state = await this.getCurrentGameState();
    const engineState = this.engine!.getGameState();
    const story = this.engine!.getCurrentStory();

    for (const status of this.goalStatuses) {
      if (status.achieved) continue;

      switch (status.goal.type) {
        case 'reach_ending':
          // Check if the story has ended with the target ending
          if (engineState.isEnded && engineState.endingId === status.goal.target) {
            status.achieved = true;
            status.achievedAtTurn = this.logger?.getAllLogs().length || 0;
            console.log(`🎉 Goal achieved: ${status.goal.target} ending reached!`);
          }
          break;
          
        case 'visit_scene':
          if (state.currentScene === status.goal.target) {
            status.achieved = true;
            status.achievedAtTurn = this.logger?.getAllLogs().length || 0;
          }
          break;
          
        case 'set_flag':
          // Check if the target flag is set to true in engine state
          const currentFlags = (this.engine as any).director?.getCurrentFlags();
          if (currentFlags && currentFlags[status.goal.target] === true) {
            status.achieved = true;
            status.achievedAtTurn = this.logger?.getAllLogs().length || 0;
            console.log(`🎉 Goal achieved: ${status.goal.target} flag set!`);
          }
          break;
          
        case 'avoid_flag':
          // Check if the target flag has been set to true (goal failed)
          const currentFlagsForAvoid = (this.engine as any).director?.getCurrentFlags();
          if (currentFlagsForAvoid && currentFlagsForAvoid[status.goal.target] === true) {
            // Flag was set - goal failed, mark as not achieved
            status.achieved = false;
          } else if (!status.achieved) {
            // Flag remains false - goal achieved
            status.achieved = true;
            status.achievedAtTurn = this.logger?.getAllLogs().length || 0;
            console.log(`🎉 Goal achieved: ${status.goal.target} flag avoided!`);
          }
          break;
          
        case 'collect_item':
          // ImpressionistEngine doesn't track inventory directly
          // Would need to parse from narrative or scene state
          break;
          
        case 'unlock_achievement':
          // ImpressionistEngine doesn't track achievements
          break;
      }
    }
  }

  private isGameEnded(state: GameState): boolean {
    const engineState = this.engine?.getGameState();
    // Check if engine marked as ended or we're in an ending scene
    return engineState?.isEnded || 
           state.currentScene.includes('ending') || 
           false; // ImpressionistEngine doesn't have "no actions" state
  }

  private areAllRequiredGoalsComplete(): boolean {
    return this.goalStatuses
      .filter(s => s.goal.priority === 'required')
      .every(s => s.achieved);
  }

  private evaluateSuccess(): boolean {
    const criteria = this.scenario.successCriteria;
    
    if (criteria.allRequiredGoals) {
      if (!this.areAllRequiredGoalsComplete()) {
        return false;
      }
    }
    
    if (criteria.withinTurnLimit && this.scenario.maxTurns) {
      const turnsPlayed = this.logger?.getAllLogs().length || 0;
      if (turnsPlayed > this.scenario.maxTurns) {
        return false;
      }
    }
    
    if (criteria.customValidator) {
      const finalState = this.getCurrentGameState();
      return criteria.customValidator(finalState as any);
    }
    
    return true;
  }
  
}