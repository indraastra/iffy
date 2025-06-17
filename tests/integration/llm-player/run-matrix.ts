#!/usr/bin/env tsx
import { MatrixTestRunner } from './runners/MatrixTestRunner';
import { MatrixReporter } from './reporters/MatrixReporter';
import { ConsoleTestObserver } from './observers/TestObserver';
import { resolve, join } from 'node:path';
import { initializeCLI, generateTimestamp, printHeader, exitWithResult, formatDuration } from './utils/cliUtils';

// Initialize CLI environment
initializeCLI();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  try {
    const config = parseArgs(args);
    
    printHeader('Matrix Test Runner');
    
    console.log(`📋 Scenarios: ${config.scenarios.length} file(s)`);
    if (config.testSuite) {
      console.log(`📦 Test Suite: ${config.testSuite}`);
    } else {
      console.log(`🏗️  Engine Profiles: ${config.engineProfiles?.join(', ') || 'none'}`);
      console.log(`🤖 Player Profiles: ${config.playerProfiles?.join(', ') || 'none'}`);
    }
    console.log(`⚡ Parallel: ${config.parallel || 1}`);
    console.log('');

    // Create observer for console output
    const observer = new ConsoleTestObserver({ 
      clearScreen: false,
      colorized: true 
    });

    // Run tests
    const runner = new MatrixTestRunner(config, observer);
    const result = await runner.execute();

    // Generate reports
    const timestamp = generateTimestamp();
    const resultsDir = config.resultsDir || './tests/results';
    const reportBasePath = join(resultsDir, `matrix-${timestamp}`);

    const reporter = new MatrixReporter();
    
    // Generate markdown report
    await reporter.generateReport(result, `${reportBasePath}.md`, 'markdown');
    console.log(`📄 Markdown report: ${reportBasePath}.md`);

    // Generate JSON report if requested
    if (config.outputFormat === 'json' || config.outputFormat === 'detailed') {
      await reporter.generateReport(result, `${reportBasePath}.json`, 'json');
      console.log(`📄 JSON report: ${reportBasePath}.json`);
    }

    // Generate HTML report
    await reporter.generateReport(result, `${reportBasePath}.html`, 'html');
    console.log(`📄 HTML report: ${reportBasePath}.html`);

    // Print summary to console
    printSummary(result);
    
    exitWithResult(result.summary.failed === 0);
    
  } catch (error) {
    exitWithResult(false, `Matrix test failed: ${error instanceof Error ? error.message : error}`);
  }
}

function parseArgs(args: string[]) {
  const config: any = {
    scenarios: [],
    parallel: 1,
    outputFormat: 'summary'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--scenarios':
      case '--scenario':
        config.scenarios = args[++i].split(',').map(s => resolve(s.trim()));
        break;
        
      case '--engine-profiles':
        config.engineProfiles = args[++i].split(',').map(s => s.trim());
        break;
        
      case '--player-profiles':
        config.playerProfiles = args[++i].split(',').map(s => s.trim());
        break;
        
      case '--suite':
        config.testSuite = args[++i];
        break;
        
      case '--parallel':
        config.parallel = parseInt(args[++i]);
        break;
        
      case '--output-format':
        config.outputFormat = args[++i];
        break;
        
      case '--results-dir':
        config.resultsDir = resolve(args[++i]);
        break;
        
      case '--profiles-path':
        config.profilesPath = resolve(args[++i]);
        break;
        
      default:
        if (!arg.startsWith('--')) {
          // Treat as scenario file
          config.scenarios.push(resolve(arg));
        }
        break;
    }
  }

  // Validate configuration
  if (config.scenarios.length === 0) {
    throw new Error('No scenario files specified');
  }

  if (!config.testSuite && (!config.engineProfiles || !config.playerProfiles)) {
    throw new Error('Must specify either --suite or both --engine-profiles and --player-profiles');
  }

  return config;
}

function printUsage() {
  console.log(`Usage: npm run test:matrix [options] [scenario-files...]

Options:
  --scenarios <files>         Comma-separated list of scenario files or glob patterns
  --scenario <file>           Single scenario file (alias for --scenarios)
  --suite <name>              Use predefined test suite (quick, standard, comprehensive, full)
  --engine-profiles <names>   Comma-separated engine profiles to test
  --player-profiles <names>   Comma-separated player profiles to test
  --parallel <number>         Number of parallel tests (default: 1)
  --output-format <format>    Output format: summary, detailed, json (default: summary)
  --results-dir <path>        Directory for results (default: ./tests/results)
  --profiles-path <path>      Path to profiles config (default: tests/config/model-profiles.yaml)
  --help, -h                  Show this help

Examples:
  # Run single scenario with quick test suite
  npm run test:matrix -- --scenario tests/scenarios/friday-night-rain-connection.yaml --suite quick

  # Run all Friday Night Rain scenarios with specific profiles
  npm run test:matrix -- --scenarios "tests/scenarios/friday-night-rain-*.yaml" \\
    --engine-profiles anthropic,google --player-profiles standard

  # Run comprehensive test suite
  npm run test:matrix -- tests/scenarios/*.yaml --suite comprehensive --parallel 2

  # Custom configuration with JSON output
  npm run test:matrix -- tests/scenarios/test-chamber-*.yaml \\
    --engine-profiles anthropic --player-profiles basic,standard \\
    --output-format json
`);
}

function printSummary(result: any) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MATRIX TEST RESULTS');
  console.log('='.repeat(60));
  
  const { summary } = result;
  const successRate = summary.totalTests > 0 ? (summary.passed / summary.totalTests * 100).toFixed(1) : '0.0';
  
  console.log(`📈 Overall: ${summary.passed}/${summary.totalTests} passed (${successRate}%)`);
  console.log(`⏱️  Duration: ${formatDuration(summary.duration)}`);
  console.log(`💰 Total Cost: $${summary.totalCost.total.toFixed(4)}`);
  
  // Show engine profile results
  console.log('\n🏗️  Engine Profile Results:');
  for (const [profile, stats] of Object.entries(result.byEngineProfile)) {
    const rate = (stats as any).successRate.toFixed(1);
    const cost = (stats as any).avgCost.total.toFixed(4);
    console.log(`   ${profile}: ${(stats as any).passed}/${(stats as any).tests} (${rate}%) - $${cost}/test`);
  }
  
  // Show failures if any
  if (result.failures.length > 0) {
    console.log('\n❌ Failures:');
    for (const failure of result.failures) {
      console.log(`   ${failure.scenario} [${failure.engineProfile}/${failure.playerProfile}]: ${failure.error}`);
    }
  }
  
  console.log('');
}

// formatDuration is now imported from cliUtils

main().catch(console.error);