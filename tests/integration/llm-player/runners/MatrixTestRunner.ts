import { TestRunner } from '../core/TestRunner';
import { InteractionLogger } from '../utils/InteractionLogger';
import { TestObserver } from '../observers/TestObserver';
import { join } from 'node:path';
import { 
  MatrixTestConfig, 
  MatrixTestResult, 
  SingleTestResult, 
  TestCombination,
  ModelProfiles 
} from '../core/matrix-types';
import { 
  loadProfiles, 
  getTestSuite 
} from '../utils/profileLoader';
import { 
  generateTestCombinations 
} from '../utils/matrixScenarioLoader';
import { generateTimestamp } from '../utils/cliUtils';
import { glob } from 'glob';

export class MatrixTestRunner {
  private config: MatrixTestConfig;
  private profiles: ModelProfiles;
  private observer?: TestObserver;

  constructor(config: MatrixTestConfig, observer?: TestObserver) {
    this.config = config;
    this.observer = observer;
  }

  async execute(): Promise<MatrixTestResult> {
    // Load profiles
    this.profiles = await loadProfiles(this.config.profilesPath);

    // Expand scenario paths (support globs)
    const scenarioPaths = await this.expandScenarioPaths(this.config.scenarios);

    // Determine which profiles to use
    let engineProfiles = this.config.engineProfiles;
    let playerProfiles = this.config.playerProfiles;

    if (this.config.testSuite) {
      const suite = getTestSuite(this.profiles, this.config.testSuite);
      engineProfiles = engineProfiles || suite.engineProfiles;
      playerProfiles = playerProfiles || suite.playerProfiles;
    }

    if (!engineProfiles || !playerProfiles) {
      throw new Error('Must specify either engineProfiles/playerProfiles or a testSuite');
    }

    // Generate all test combinations
    const combinations = await generateTestCombinations(
      scenarioPaths,
      engineProfiles,
      playerProfiles,
      this.config.profilesPath
    );

    // Execute tests
    const startTime = Date.now();
    const results = await this.executeCombinations(combinations);
    const duration = Date.now() - startTime;

    // Aggregate results
    return this.aggregateResults(results, duration);
  }

  private async expandScenarioPaths(patterns: string[]): Promise<string[]> {
    const allPaths: string[] = [];
    
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const matches = await glob(pattern);
        allPaths.push(...matches);
      } else {
        allPaths.push(pattern);
      }
    }

    return [...new Set(allPaths)]; // Remove duplicates
  }

  private async executeCombinations(
    combinations: TestCombination[]
  ): Promise<SingleTestResult[]> {
    const results: SingleTestResult[] = [];
    const parallel = this.config.parallel || 1;

    // Execute in batches based on parallelization
    for (let i = 0; i < combinations.length; i += parallel) {
      const batch = combinations.slice(i, i + parallel);
      const batchResults = await Promise.all(
        batch.map(combination => this.executeSingleTest(combination))
      );
      results.push(...batchResults);
    }

    return results;
  }

  private async executeSingleTest(
    combination: TestCombination
  ): Promise<SingleTestResult> {
    const startTime = Date.now();
    const { scenario, engineProfile, playerProfile, engineModels, playerModel } = combination;

    try {
      // Create a unique log directory for this test
      const timestamp = generateTimestamp();
      const logDir = join(
        this.config.resultsDir || './reports',
        `${timestamp}-${scenario.name}-${engineProfile}-${playerProfile}`.toLowerCase().replace(/\s+/g, '-')
      );

      // Create a logger if needed
      const logger = new InteractionLogger({
        logDir,
        formats: ['markdown', 'json', 'summary']
      });

      // Create test configuration with the specific models
      const testConfig = {
        ...scenario,
        engineModels,
        playerModel,
        autoMode: true // Always run in auto mode for matrix tests
      };

      // Run the test
      const runner = new TestRunner({
        scenario: testConfig,
        observer: this.observer,
        autoMode: true,
        logger
      });

      const result = await runner.execute();

      // Use actual cost data from the test result
      const costs = result.costs || {
        engine: {
          classification: 0,
          generation: 0,
          total: 0
        },
        player: 0,
        total: 0
      };

      return {
        combination,
        success: result.success,
        turnsPlayed: result.turnsPlayed,
        duration: Date.now() - startTime,
        goalsAchieved: result.goalsAchieved,
        finalState: result.finalState,
        endingReached: result.assessment?.endingReached || undefined,
        errorMessage: result.errorMessage,
        costs,
        metrics: {
          classificationCalls: 0, // Would track actual calls
          generationCalls: 0,     // Would track actual calls
          playerCalls: result.turnsPlayed
        },
        logPath: result.logPath
      };
    } catch (error) {
      return {
        combination,
        success: false,
        turnsPlayed: 0,
        duration: Date.now() - startTime,
        goalsAchieved: [],
        finalState: {
          currentScene: 'unknown',
          availableActions: [],
          visibleText: ''
        },
        errorMessage: error instanceof Error ? error.message : String(error),
        costs: {
          engine: { classification: 0, generation: 0, total: 0 },
          player: 0,
          total: 0
        },
        metrics: {
          classificationCalls: 0,
          generationCalls: 0,
          playerCalls: 0
        }
      };
    }
  }

  private aggregateResults(
    results: SingleTestResult[],
    totalDuration: number
  ): MatrixTestResult {
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;

    // Calculate summary statistics
    const summary = {
      totalTests: results.length,
      passed,
      failed,
      duration: totalDuration,
      timestamp: generateTimestamp(),
      totalCost: this.calculateTotalCost(results)
    };

    // Aggregate by engine profile
    const byEngineProfile = this.aggregateByEngineProfile(results);

    // Aggregate by player profile
    const byPlayerProfile = this.aggregateByPlayerProfile(results);

    // Aggregate by scenario
    const byScenario = this.aggregateByScenario(results);

    // Collect failures
    const failures = results
      .filter(r => !r.success)
      .map(r => ({
        scenario: r.combination.scenario.name,
        engineProfile: r.combination.engineProfile,
        playerProfile: r.combination.playerProfile,
        error: r.errorMessage || 'Unknown error',
        logPath: r.logPath
      }));

    // Calculate model performance (placeholder)
    const modelPerformance = {
      classificationAccuracy: this.calculateClassificationAccuracy(results)
    };

    return {
      summary,
      byEngineProfile,
      byPlayerProfile,
      byScenario,
      failures,
      modelPerformance,
      detailedResults: results
    };
  }

  private calculateTotalCost(results: SingleTestResult[]): { byProvider: Record<string, number>; total: number } {
    const byProvider: Record<string, number> = {};
    let total = 0;

    for (const result of results) {
      total += result.costs.total;
      
      // Add to provider totals
      const engineProvider = result.combination.engineModels.costModel.provider;
      const playerProvider = result.combination.playerModel.provider;
      
      byProvider[engineProvider] = (byProvider[engineProvider] || 0) + result.costs.engine.total;
      byProvider[playerProvider] = (byProvider[playerProvider] || 0) + result.costs.player;
    }

    return { byProvider, total };
  }

  private aggregateByEngineProfile(results: SingleTestResult[]): MatrixTestResult['byEngineProfile'] {
    const grouped: Record<string, SingleTestResult[]> = {};

    // Group results by engine profile
    for (const result of results) {
      const profile = result.combination.engineProfile;
      if (!grouped[profile]) grouped[profile] = [];
      grouped[profile].push(result);
    }

    // Calculate statistics for each profile
    const aggregated: MatrixTestResult['byEngineProfile'] = {};
    
    for (const [profile, profileResults] of Object.entries(grouped)) {
      const passed = profileResults.filter(r => r.success).length;
      const totalTurns = profileResults.reduce((sum, r) => sum + r.turnsPlayed, 0);
      const totalDuration = profileResults.reduce((sum, r) => sum + r.duration, 0);
      const totalClassificationCost = profileResults.reduce((sum, r) => sum + r.costs.engine.classification, 0);
      const totalGenerationCost = profileResults.reduce((sum, r) => sum + r.costs.engine.generation, 0);

      aggregated[profile] = {
        tests: profileResults.length,
        passed,
        failed: profileResults.length - passed,
        avgTurns: profileResults.length > 0 ? totalTurns / profileResults.length : 0,
        avgDuration: profileResults.length > 0 ? totalDuration / profileResults.length : 0,
        successRate: profileResults.length > 0 ? (passed / profileResults.length) * 100 : 0,
        avgCost: {
          classification: profileResults.length > 0 ? totalClassificationCost / profileResults.length : 0,
          generation: profileResults.length > 0 ? totalGenerationCost / profileResults.length : 0,
          total: profileResults.length > 0 ? (totalClassificationCost + totalGenerationCost) / profileResults.length : 0
        }
      };
    }

    return aggregated;
  }

  private aggregateByPlayerProfile(results: SingleTestResult[]): MatrixTestResult['byPlayerProfile'] {
    const grouped: Record<string, SingleTestResult[]> = {};

    // Group results by player profile
    for (const result of results) {
      const profile = result.combination.playerProfile;
      if (!grouped[profile]) grouped[profile] = [];
      grouped[profile].push(result);
    }

    // Calculate statistics for each profile
    const aggregated: MatrixTestResult['byPlayerProfile'] = {};
    
    for (const [profile, profileResults] of Object.entries(grouped)) {
      const passed = profileResults.filter(r => r.success).length;
      const totalTurns = profileResults.reduce((sum, r) => sum + r.turnsPlayed, 0);
      const totalCost = profileResults.reduce((sum, r) => sum + r.costs.player, 0);

      aggregated[profile] = {
        tests: profileResults.length,
        passed,
        failed: profileResults.length - passed,
        avgTurns: profileResults.length > 0 ? totalTurns / profileResults.length : 0,
        successRate: profileResults.length > 0 ? (passed / profileResults.length) * 100 : 0,
        avgCost: profileResults.length > 0 ? totalCost / profileResults.length : 0
      };
    }

    return aggregated;
  }

  private aggregateByScenario(results: SingleTestResult[]): MatrixTestResult['byScenario'] {
    const grouped: Record<string, SingleTestResult[]> = {};

    // Group results by scenario
    for (const result of results) {
      const scenario = result.combination.scenario.name;
      if (!grouped[scenario]) grouped[scenario] = [];
      grouped[scenario].push(result);
    }

    // Transform to expected format
    const aggregated: MatrixTestResult['byScenario'] = {};
    
    for (const [scenario, scenarioResults] of Object.entries(grouped)) {
      aggregated[scenario] = {
        results: scenarioResults.map(r => ({
          engineProfile: r.combination.engineProfile,
          playerProfile: r.combination.playerProfile,
          success: r.success,
          turns: r.turnsPlayed,
          duration: r.duration,
          endingReached: r.endingReached,
          errorMessage: r.errorMessage,
          cost: {
            engine: {
              classification: r.costs.engine.classification,
              generation: r.costs.engine.generation
            },
            player: r.costs.player,
            total: r.costs.total
          }
        }))
      };
    }

    return aggregated;
  }

  private calculateClassificationAccuracy(results: SingleTestResult[]): Record<string, { correct: number; total: number; accuracy: number }> {
    // This is a placeholder - would need actual tracking of classification results
    const accuracy: Record<string, { correct: number; total: number; accuracy: number }> = {};
    
    // Group by classification model
    const modelGroups: Record<string, { correct: number; total: number }> = {};
    
    for (const result of results) {
      const model = result.combination.engineModels.costModel.model;
      if (!modelGroups[model]) {
        modelGroups[model] = { correct: 0, total: 0 };
      }
      
      // Placeholder logic - in reality would track actual classification results
      modelGroups[model].total += result.metrics.classificationCalls;
      if (result.success) {
        modelGroups[model].correct += result.metrics.classificationCalls;
      }
    }

    // Calculate accuracy percentages
    for (const [model, stats] of Object.entries(modelGroups)) {
      accuracy[model] = {
        correct: stats.correct,
        total: stats.total,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      };
    }

    return accuracy;
  }
}