#!/usr/bin/env tsx
import { TestRunner } from './core/TestRunner';
import { InteractionLogger } from './utils/InteractionLogger';
import { ConsoleTestObserver } from './observers/TestObserver';
import { loadScenario } from './utils/scenarioLoader';
import { resolve, join } from 'node:path';
import { initializeCLI, generateTimestamp } from './utils/cliUtils';

// Initialize CLI environment
initializeCLI();

async function debugAssessor() {
  const scenarioPath = resolve('../../../tests/scenarios/test-chamber-perfect-exit.yaml');
  
  try {
    console.log('🔍 Loading scenario...');
    const scenario = await loadScenario(scenarioPath);
    
    // Force non-interactive mode
    scenario.observability = {
      ...scenario.observability,
      interactive: false
    };
    
    // Create log directory
    const timestamp = generateTimestamp();
    const logDir = join('./tests/debug-logs', `${timestamp}-assessor-debug`);

    // Set up test runner
    const observer = new ConsoleTestObserver({ 
      clearScreen: false,
      colorized: true 
    });
    observer.setScenario(scenario);
    
    const logger = new InteractionLogger({
      logDir,
      formats: ['json', 'summary']
    });
    
    const runner = new TestRunner({
      scenario,
      observer,
      logger,
      autoMode: true
    });

    console.log('🎮 Starting test...');
    const result = await runner.execute();
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 ASSESSOR DEBUG ANALYSIS');
    console.log('='.repeat(60));
    
    // Check what the logger captured
    const gameHistory = logger.getAllLogs();
    console.log(`📚 Game history length: ${gameHistory.length}`);
    
    // Also check if the TestRunner itself has access to the history
    const runnerLogger = (runner as any).logger;
    if (runnerLogger) {
      const runnerHistory = runnerLogger.getAllLogs();
      console.log(`📚 Runner's game history length: ${runnerHistory.length}`);
      
      if (runnerHistory.length > 0 && gameHistory.length === 0) {
        console.log('⚠️  WARNING: Runner has history but our reference is empty!');
      }
    }
    
    if (gameHistory.length > 0) {
      console.log('📜 First interaction:');
      console.log(`   Turn: ${gameHistory[0].turnNumber}`);
      console.log(`   Action: ${gameHistory[0].player.chosenAction}`);
      console.log(`   Response: ${gameHistory[0].engineResponse.narrative.substring(0, 100)}...`);
      
      console.log('📜 Last interaction:');
      const lastLog = gameHistory[gameHistory.length - 1];
      console.log(`   Turn: ${lastLog.turnNumber}`);
      console.log(`   Action: ${lastLog.player.chosenAction}`);
      console.log(`   Response: ${lastLog.engineResponse.narrative.substring(0, 100)}...`);
      
      // Check goal achievements
      console.log('🎯 Goal progress in last turn:');
      lastLog.goalProgress.goalsStatus.forEach(goal => {
        console.log(`   ${goal.achieved ? '✅' : '❌'} ${goal.goal.type}: ${goal.goal.target}`);
      });
    } else {
      console.log('❌ No game history found!');
    }
    
    // Check engine state
    console.log('\n🔧 Engine state:');
    const engine = (runner as any).engine;
    if (engine) {
      const engineState = engine.getGameState();
      console.log(`   Current scene: ${engineState.currentScene}`);
      console.log(`   Is ended: ${engineState.isEnded}`);
      console.log(`   Ending ID: ${engineState.endingId || 'null'}`);
      console.log(`   Interactions count: ${engineState.interactions?.length || 0}`);
      
      // Check flags
      const director = (engine as any).director;
      if (director) {
        const flags = director.getCurrentFlags();
        console.log(`   Current flags: ${JSON.stringify(flags)}`);
        
        // Check ending detection manually
        const story = engine.getCurrentStory();
        if (story && story.endings) {
          console.log('\n🎯 Manual ending check:');
          console.log(`   Available endings: ${story.endings.variations.map((e: any) => e.id).join(', ')}`);
          
          for (const ending of story.endings.variations) {
            console.log(`   Checking "${ending.id}":`);
            if (ending.requires) {
              const flagManager = (director as any).flagManager;
              if (flagManager) {
                try {
                  const conditionsMet = flagManager.checkConditions(ending.requires);
                  console.log(`     Conditions: ${JSON.stringify(ending.requires)}`);
                  console.log(`     Met: ${conditionsMet}`);
                  
                  // Check each individual condition
                  if (ending.requires.all_of) {
                    console.log(`     Checking all_of conditions:`);
                    for (const cond of ending.requires.all_of) {
                      const met = flagManager.evaluateCondition ? flagManager.evaluateCondition(cond) : 'method not found';
                      console.log(`       "${cond}": ${met}`);
                    }
                  }
                } catch (error) {
                  console.log(`     ERROR: ${error}`);
                }
              } else {
                console.log(`     No flag manager found`);
              }
            } else {
              console.log(`     No requires conditions`);
            }
          }
        }
      } else {
        console.log('   No director found');
      }
    } else {
      console.log('   No engine found');
    }
    
    // Check test result
    console.log('\n📊 Test result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Turns played: ${result.turnsPlayed}`);
    console.log(`   Error: ${result.errorMessage || 'none'}`);
    
    if (result.assessment) {
      console.log('\n🎯 Assessment received:');
      console.log(`   Ending reached: ${result.assessment.endingReached || 'null'}`);
      console.log(`   Conditions met: ${result.assessment.conditionsMet}`);
      console.log(`   Recommendation: ${result.assessment.recommendedAction}`);
      console.log(`   Evidence count: ${result.assessment.evidenceFromHistory.length}`);
    } else {
      console.log('\n❌ No assessment received');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📁 Debug logs saved to: ${logDir}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

debugAssessor().catch(console.error);