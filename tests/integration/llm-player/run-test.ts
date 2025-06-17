#!/usr/bin/env tsx
import { TestRunner } from './core/TestRunner';
import { InteractionLogger } from './utils/InteractionLogger';
import { ConsoleTestObserver } from './observers/TestObserver';
import { loadScenario } from './utils/scenarioLoader';
import { TestScenario } from './core/matrix-types';
import { loadScenario as loadMatrixScenario, expandTestCombination } from './utils/matrixScenarioLoader';
import { loadProfiles } from './utils/profileLoader';
import { resolve, join } from 'node:path';
import { initializeCLI, generateTimestamp, exitWithResult, formatDuration } from './utils/cliUtils';

// Initialize CLI environment
initializeCLI();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run test:llm-player [--auto] <scenario-file>');
    console.log('Options:');
    console.log('  --auto    Run in non-interactive mode (full auto)');
    console.log('');
    console.log('Examples:');
    console.log('  npm run test:llm-player tests/scenarios/friday-night-rain-connection.yaml');
    console.log('  npm run test:llm-player --auto tests/scenarios/test-chamber-perfect-exit.yaml');
    process.exit(1);
  }

  // Parse command line arguments
  let autoMode = false;
  let scenarioPath = '';
  
  for (const arg of args) {
    if (arg === '--auto') {
      autoMode = true;
    } else if (!arg.startsWith('--')) {
      scenarioPath = resolve(arg);
    }
  }
  
  if (!scenarioPath) {
    console.log('Error: No scenario file specified');
    process.exit(1);
  }
  
  try {
    console.log(`📋 Loading scenario: ${scenarioPath}`);
    
    // Try to load as matrix scenario first (supports profiles)
    let scenario: TestScenario;
    try {
      const matrixScenario = await loadMatrixScenario(scenarioPath);
      if (matrixScenario.engineProfile && matrixScenario.playerProfile) {
        // This is a profile-based scenario, expand it
        const profiles = await loadProfiles();
        const combination = expandTestCombination(matrixScenario, profiles);
        scenario = {
          ...combination.scenario,
          engineModels: combination.engineModels,
          playerModel: combination.playerModel
        };
      } else {
        // Legacy format, use as-is
        scenario = matrixScenario;
      }
    } catch (error) {
      // Fallback to legacy loader
      scenario = await loadScenario(scenarioPath);
    }
    
    // Override interactive mode if --auto flag is used
    if (autoMode) {
      console.log('🤖 Running in auto mode (non-interactive)');
    }
    
    // Create log directory with timestamp
    const timestamp = generateTimestamp();
    const logDir = join(
      scenario.logging?.logDirectory || './reports',
      `${timestamp}-${scenario.name.toLowerCase().replace(/\s+/g, '-')}`
    );

    // Set up test runner
    const observer = new ConsoleTestObserver({ 
      clearScreen: true,
      colorized: true 
    });
    observer.setScenario(scenario); // Set scenario after auto mode modification
    
    // Create logger if needed
    const logger = scenario.logging?.saveTranscript || scenario.logging?.saveDebugInfo
      ? new InteractionLogger({
          logDir,
          formats: [
            ...(scenario.logging.saveTranscript ? ['markdown' as const] : []),
            ...(scenario.logging.saveDebugInfo ? ['json' as const, 'summary' as const] : [])
          ]
        })
      : undefined;
    
    const runner = new TestRunner({
      scenario,
      observer,
      autoMode, // Pass the auto mode flag directly
      logger
    });

    console.log(`🎮 Starting test: ${scenario.name}`);
    console.log(`📝 Story file: ${scenario.storyFile}`);
    
    // Show model configuration
    if (scenario.engineModels?.qualityModel && scenario.engineModels?.costModel) {
      console.log(`🏗️  Engine: ${scenario.engineModels.qualityModel.model} (generation), ${scenario.engineModels.costModel.model} (classification)`);
    }
    
    console.log(`🤖 Player model: ${scenario.playerModel?.model || 'default'}`);
    console.log(`🎯 Goals: ${scenario.goals.map(g => `${g.type}:${g.target}`).join(', ')}`);
    console.log('');
    
    const result = await runner.execute();
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Test Result: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`⏱️  Duration: ${formatDuration(result.duration)}`);
    console.log(`🎮 Turns played: ${result.turnsPlayed}`);
    
    if (result.costs) {
      console.log(`💰 Total Cost: $${result.costs.total.toFixed(4)}`);
      console.log(`   - Engine: $${result.costs.engine.total.toFixed(4)} (Classification: $${result.costs.engine.classification.toFixed(4)}, Generation: $${result.costs.engine.generation.toFixed(4)})`);
      console.log(`   - Player: $${result.costs.player.toFixed(4)}`);
    }
    
    if (result.logPath) {
      console.log(`📁 Logs saved to: ${result.logPath}`);
    }
    
    if (result.errorMessage) {
      console.log(`❌ Error: ${result.errorMessage}`);
    }
    
    console.log('\nGoals Achievement:');
    result.goalsAchieved.forEach(status => {
      const icon = status.achieved ? '✅' : '❌';
      const turn = status.achievedAtTurn ? ` (turn ${status.achievedAtTurn})` : '';
      console.log(`  ${icon} ${status.goal.type}: ${status.goal.target}${turn}`);
    });

    if (result.assessment) {
      console.log('\nPost-Game Assessment:');
      console.log(`  📋 Ending Reached: ${result.assessment.endingReached || 'None'}`);
      console.log(`  ✅ Conditions Met: ${result.assessment.conditionsMet ? 'Yes' : 'No'}`);
      console.log(`  🔍 Recommendation: ${result.assessment.recommendedAction}`);
      console.log(`  💭 Reasoning: ${result.assessment.reasoning}`);
      
      if (result.assessment.evidenceFromHistory.length > 0) {
        console.log('  📜 Evidence:');
        result.assessment.evidenceFromHistory.forEach(evidence => {
          console.log(`    - ${evidence}`);
        });
      }
    }
    
    exitWithResult(result.success, result.errorMessage);
    
  } catch (error) {
    exitWithResult(false, `Test runner failed: ${error instanceof Error ? error.message : error}`);
  }
}

main().catch(console.error);