#!/usr/bin/env tsx
import { TestRunner } from './core/TestRunner';
import { InteractionLogger } from './utils/InteractionLogger';
import { ConsoleTestObserver } from './observers/TestObserver';
import { loadScenario } from './utils/scenarioLoader';
import { resolve, join } from 'node:path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

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
    const scenario = await loadScenario(scenarioPath);
    
    // Override interactive mode if --auto flag is used
    if (autoMode) {
      console.log('🤖 Running in auto mode (non-interactive)');
    }
    
    // Create log directory with timestamp (local time)
    const now = new Date();
    const timestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + 'T' +
      String(now.getHours()).padStart(2, '0') + '-' +
      String(now.getMinutes()).padStart(2, '0') + '-' +
      String(now.getSeconds()).padStart(2, '0');
    const logDir = join(
      scenario.logging?.logDirectory || './tests/logs',
      `${timestamp}-${scenario.name.toLowerCase().replace(/\s+/g, '-')}`
    );

    // Set up test runner
    const observer = new ConsoleTestObserver({ 
      clearScreen: true,
      colorized: true 
    });
    observer.setScenario(scenario); // Set scenario after auto mode modification
    
    const runner = new TestRunner({
      scenario,
      observer,
      autoMode, // Pass the auto mode flag directly
      logger: scenario.logging?.saveTranscript || scenario.logging?.saveDebugInfo
        ? new InteractionLogger({
            logDir,
            formats: [
              ...(scenario.logging.saveTranscript ? ['markdown' as const] : []),
              ...(scenario.logging.saveDebugInfo ? ['json' as const, 'summary' as const] : [])
            ]
          })
        : undefined
    });

    console.log(`🎮 Starting test: ${scenario.name}`);
    console.log(`📝 Story file: ${scenario.storyFile}`);
    console.log(`🤖 Player model: ${scenario.playerModel?.model || 'default'}`);
    console.log(`🎯 Goals: ${scenario.goals.map(g => `${g.type}:${g.target}`).join(', ')}`);
    console.log('');
    
    const result = await runner.execute();
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Test Result: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`🎮 Turns played: ${result.turnsPlayed}`);
    
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
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);