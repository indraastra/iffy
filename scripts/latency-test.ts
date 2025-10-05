#!/usr/bin/env tsx

/**
 * Latency Testing Script for Interactive Fiction Models
 * 
 * Tests realistic game engine scenarios across different AI providers and models
 * to measure response latency, token usage, and performance characteristics.
 */

import * as dotenv from 'dotenv';
import { MultiModelService } from '../src/services/multiModelService';
import type { LLMConfig } from '../src/services/llm/types';
import { ImpressionistEngine } from '../src/engine/impressionistEngine';
import { loadStoryContent } from '../src/examples-metadata';
import type { PlayerAction, GameResponse } from '../src/types/impressionistStory';

// Load environment variables
dotenv.config();

interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  displayName: string;
  tier: 'quality' | 'cost';
}

interface LatencyResult {
  modelConfig: ModelConfig;
  results: {
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    success: boolean;
    error?: string;
  }[];
  statistics: {
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    p95Latency: number;
    successRate: number;
    avgInputTokens: number;
    avgOutputTokens: number;
    totalCost: number;
  };
}

// Test model configurations - balanced selection of quality and cost models
const TEST_MODELS: ModelConfig[] = [
  // Anthropic models
  { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', displayName: 'Claude Sonnet 4.5', tier: 'quality' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku', tier: 'cost' },
  
  // OpenAI models
  { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', tier: 'quality' },
  { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o Mini', tier: 'cost' },
  
  // Google models
  { provider: 'google', model: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', tier: 'quality' },
  { provider: 'google', model: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', tier: 'cost' },
];

// Realistic test actions that represent typical gameplay
const TEST_ACTIONS = [
  "look around",
  "walk over and say hello", 
  "ask about the weather",
  "examine the room carefully",
  "say \"I need to think about this\""
];

class LatencyTester {
  private multiModelService: MultiModelService;
  private testStory: string = 'intermission_side_a.yaml'; // Use a standard test story

  constructor() {
    this.multiModelService = new MultiModelService();
  }

  async runLatencyTest(numActions: number = 5): Promise<LatencyResult[]> {
    console.log(`🏃 Starting latency test with ${numActions} actions per model...`);
    console.log(`📖 Using test story: ${this.testStory}`);
    console.log(`🤖 Testing ${TEST_MODELS.length} models:`);
    
    TEST_MODELS.forEach(model => {
      console.log(`   • ${model.displayName} (${model.tier})`);
    });
    console.log();

    const results: LatencyResult[] = [];

    for (const modelConfig of TEST_MODELS) {
      console.log(`🔄 Testing ${modelConfig.displayName}...`);
      
      const result = await this.testModel(modelConfig, numActions);
      results.push(result);
      
      // Brief pause between models to avoid rate limiting
      await this.sleep(1000);
    }

    return results;
  }

  private async testModel(modelConfig: ModelConfig, numActions: number): Promise<LatencyResult> {
    const apiKey = this.getApiKey(modelConfig.provider);
    if (!apiKey) {
      return this.createFailedResult(modelConfig, `No API key found for ${modelConfig.provider}`);
    }

    // Configure the model
    const config: LLMConfig = {
      provider: modelConfig.provider,
      model: modelConfig.model,
      apiKey: apiKey,
    };

    try {
      this.multiModelService.setConfig(config);
    } catch (error) {
      return this.createFailedResult(modelConfig, `Failed to configure model: ${error}`);
    }

    const results: LatencyResult['results'] = [];
    
    // Test with fresh game state for each model
    for (let i = 0; i < numActions; i++) {
      const action = TEST_ACTIONS[i % TEST_ACTIONS.length];
      console.log(`   Action ${i + 1}/${numActions}: "${action}"`);
      
      try {
        const engine = await this.createFreshEngine();
        const startTime = Date.now();
        
        const response = await engine.processAction({ input: action } as PlayerAction);
        
        const endTime = Date.now();
        const latencyMs = endTime - startTime;

        // Extract token usage if available from the response
        const inputTokens = (response as any)?.usage?.inputTokens || 0;
        const outputTokens = (response as any)?.usage?.outputTokens || 0;
        
        results.push({
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          success: true
        });

        console.log(`     ✅ ${latencyMs}ms (${inputTokens} + ${outputTokens} tokens)`);
        
      } catch (error) {
        console.log(`     ❌ Error: ${error}`);
        results.push({
          latencyMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          success: false,
          error: String(error)
        });
      }

      // Small delay between actions
      await this.sleep(500);
    }

    return {
      modelConfig,
      results,
      statistics: this.calculateStatistics(results, modelConfig)
    };
  }

  private async createFreshEngine(): Promise<ImpressionistEngine> {
    // Load the test story
    const storyContent = await loadStoryContent(this.testStory);
    const engine = new ImpressionistEngine();
    
    // Parse the YAML story and load it
    const yamlParser = await import('js-yaml');
    const parsedStory = yamlParser.load(storyContent) as any;
    
    const result = engine.loadStory(parsedStory);
    if (!result.success) {
      throw new Error(`Failed to load story: ${result.error}`);
    }
    
    return engine;
  }

  private calculateStatistics(results: LatencyResult['results'], modelConfig: ModelConfig): LatencyResult['statistics'] {
    const successfulResults = results.filter(r => r.success);
    const latencies = successfulResults.map(r => r.latencyMs);
    
    if (latencies.length === 0) {
      return {
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        p95Latency: 0,
        successRate: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        totalCost: 0
      };
    }

    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    
    const totalInputTokens = successfulResults.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = successfulResults.reduce((sum, r) => sum + r.outputTokens, 0);
    
    // Calculate cost using current pricing
    const totalCost = this.calculateCost(totalInputTokens, totalOutputTokens, modelConfig.model);

    return {
      avgLatency: Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p95Latency: latencies[p95Index] || 0,
      successRate: (successfulResults.length / results.length) * 100,
      avgInputTokens: Math.round(totalInputTokens / successfulResults.length),
      avgOutputTokens: Math.round(totalOutputTokens / successfulResults.length),
      totalCost: totalCost
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    // Use the pricing from our model configuration
    const pricing = this.multiModelService.calculateCost(
      { inputTokens, outputTokens },
      model
    );
    return pricing;
  }

  private createFailedResult(modelConfig: ModelConfig, error: string): LatencyResult {
    return {
      modelConfig,
      results: [],
      statistics: {
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        p95Latency: 0,
        successRate: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        totalCost: 0
      }
    };
  }

  private getApiKey(provider: string): string | undefined {
    switch (provider) {
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY;
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'google':
        return process.env.GOOGLE_API_KEY;
      default:
        return undefined;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  displayResults(results: LatencyResult[]): void {
    console.log('\n' + '='.repeat(120));
    console.log('🏁 LATENCY TEST RESULTS');
    console.log('='.repeat(120));

    // Create a formatted table
    const tableRows: string[] = [];
    
    // Header
    tableRows.push(
      '| Model                  | Tier    | Avg (ms) | Min (ms) | Max (ms) | P95 (ms) | Success % | Tokens In/Out | Cost ($) |'
    );
    tableRows.push(
      '|------------------------|---------|----------|----------|----------|----------|-----------|---------------|----------|'
    );

    // Sort by average latency
    const sortedResults = results
      .filter(r => r.statistics.successRate > 0)
      .sort((a, b) => a.statistics.avgLatency - b.statistics.avgLatency);

    // Add rows
    for (const result of sortedResults) {
      const stats = result.statistics;
      const model = result.modelConfig;
      
      const row = [
        model.displayName.padEnd(22),
        model.tier.padEnd(7),
        stats.avgLatency.toString().padStart(8),
        stats.minLatency.toString().padStart(8),
        stats.maxLatency.toString().padStart(8),
        stats.p95Latency.toString().padStart(8),
        `${stats.successRate.toFixed(1)}%`.padStart(9),
        `${stats.avgInputTokens}/${stats.avgOutputTokens}`.padEnd(13),
        `$${stats.totalCost.toFixed(4)}`.padStart(8)
      ].join(' | ');
      
      tableRows.push('| ' + row + ' |');
    }

    // Add failed models
    const failedResults = results.filter(r => r.statistics.successRate === 0);
    if (failedResults.length > 0) {
      tableRows.push('|------------------------|---------|----------|----------|----------|----------|-----------|---------------|----------|');
      for (const result of failedResults) {
        const model = result.modelConfig;
        const row = [
          model.displayName.padEnd(22),
          model.tier.padEnd(7),
          'FAILED'.padStart(8),
          '-'.padStart(8),
          '-'.padStart(8),
          '-'.padStart(8),
          '0.0%'.padStart(9),
          '-'.padEnd(13),
          '$0.0000'.padStart(8)
        ].join(' | ');
        
        tableRows.push('| ' + row + ' |');
      }
    }

    // Display the table
    tableRows.forEach(row => console.log(row));

    // Summary statistics
    console.log('\n📊 SUMMARY:');
    const successfulResults = sortedResults.filter(r => r.statistics.successRate > 0);
    
    if (successfulResults.length > 0) {
      const fastest = successfulResults[0];
      const slowest = successfulResults[successfulResults.length - 1];
      const totalCost = successfulResults.reduce((sum, r) => sum + r.statistics.totalCost, 0);
      
      console.log(`🏆 Fastest: ${fastest.modelConfig.displayName} (${fastest.statistics.avgLatency}ms avg)`);
      console.log(`🐌 Slowest: ${slowest.modelConfig.displayName} (${slowest.statistics.avgLatency}ms avg)`);
      console.log(`💰 Total Cost: $${totalCost.toFixed(4)}`);
      console.log(`✅ Overall Success Rate: ${((successfulResults.length / results.length) * 100).toFixed(1)}%`);
    }

    // Quality vs Cost analysis
    console.log('\n📈 TIER ANALYSIS:');
    const qualityModels = successfulResults.filter(r => r.modelConfig.tier === 'quality');
    const costModels = successfulResults.filter(r => r.modelConfig.tier === 'cost');
    
    if (qualityModels.length > 0) {
      const avgQualityLatency = qualityModels.reduce((sum, r) => sum + r.statistics.avgLatency, 0) / qualityModels.length;
      console.log(`🎯 Quality Models Average: ${Math.round(avgQualityLatency)}ms`);
    }
    
    if (costModels.length > 0) {
      const avgCostLatency = costModels.reduce((sum, r) => sum + r.statistics.avgLatency, 0) / costModels.length;
      console.log(`💸 Cost Models Average: ${Math.round(avgCostLatency)}ms`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  let numActions = 5;

  // Parse command line arguments
  const numActionsArg = args.find(arg => arg.startsWith('--actions='));
  if (numActionsArg) {
    numActions = parseInt(numActionsArg.split('=')[1], 10);
    if (isNaN(numActions) || numActions < 1) {
      console.error('❌ Invalid number of actions. Must be a positive integer.');
      process.exit(1);
    }
  }

  // Help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Latency Testing Script for Interactive Fiction Models

Usage: tsx scripts/latency-test.ts [options]

Options:
  --actions=N     Number of actions to test per model (default: 5)
  --help, -h      Show this help message

Environment Variables Required:
  ANTHROPIC_API_KEY    For Claude models
  OPENAI_API_KEY      For GPT models  
  GOOGLE_API_KEY      For Gemini models

The script will test realistic game scenarios across different AI providers
and generate a comprehensive latency and performance report.
`);
    process.exit(0);
  }

  console.log('🧪 Interactive Fiction Model Latency Test');
  console.log(`⚡ Testing ${numActions} actions per model\n`);

  const tester = new LatencyTester();
  
  try {
    const results = await tester.runLatencyTest(numActions);
    tester.displayResults(results);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { LatencyTester, type LatencyResult };