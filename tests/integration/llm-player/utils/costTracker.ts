/**
 * Cost tracking utilities for test framework
 */

import { calculateRequestCost, LLMProvider } from '../../../../src/services/llm/types';
import { ModelConfig } from '../core/types';

export interface CostBreakdown {
  engine: {
    classification: number;
    generation: number;
    total: number;
  };
  player: number;
  total: number;
}

export interface ModelUsage {
  model: string;
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export class CostTracker {
  private engineCostUsage: ModelUsage[] = [];
  private engineQualityUsage: ModelUsage[] = [];
  private playerUsage: ModelUsage[] = [];

  /**
   * Record engine cost model usage (classification)
   */
  recordEngineCostUsage(
    modelConfig: ModelConfig,
    inputTokens: number,
    outputTokens: number
  ): void {
    this.addUsage(this.engineCostUsage, modelConfig, inputTokens, outputTokens);
  }

  /**
   * Record engine quality model usage (generation)
   */
  recordEngineQualityUsage(
    modelConfig: ModelConfig,
    inputTokens: number,
    outputTokens: number
  ): void {
    this.addUsage(this.engineQualityUsage, modelConfig, inputTokens, outputTokens);
  }

  /**
   * Record player model usage
   */
  recordPlayerUsage(
    modelConfig: ModelConfig,
    inputTokens: number,
    outputTokens: number
  ): void {
    this.addUsage(this.playerUsage, modelConfig, inputTokens, outputTokens);
  }

  /**
   * Get total cost breakdown
   */
  getCostBreakdown(): CostBreakdown {
    const classificationCost = this.calculateTotalCost(this.engineCostUsage);
    const generationCost = this.calculateTotalCost(this.engineQualityUsage);
    const playerCost = this.calculateTotalCost(this.playerUsage);

    return {
      engine: {
        classification: classificationCost,
        generation: generationCost,
        total: classificationCost + generationCost
      },
      player: playerCost,
      total: classificationCost + generationCost + playerCost
    };
  }

  /**
   * Get usage metrics for reporting
   */
  getUsageMetrics() {
    return {
      engineCost: {
        calls: this.engineCostUsage.reduce((sum, u) => sum + u.calls, 0),
        tokens: this.engineCostUsage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0)
      },
      engineQuality: {
        calls: this.engineQualityUsage.reduce((sum, u) => sum + u.calls, 0),
        tokens: this.engineQualityUsage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0)
      },
      player: {
        calls: this.playerUsage.reduce((sum, u) => sum + u.calls, 0),
        tokens: this.playerUsage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0)
      }
    };
  }

  /**
   * Reset all tracking
   */
  reset(): void {
    this.engineCostUsage = [];
    this.engineQualityUsage = [];
    this.playerUsage = [];
  }

  private addUsage(
    usageArray: ModelUsage[],
    modelConfig: ModelConfig,
    inputTokens: number,
    outputTokens: number
  ): void {
    const existing = usageArray.find(
      u => u.model === modelConfig.model && u.provider === modelConfig.provider
    );

    if (existing) {
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.calls += 1;
    } else {
      usageArray.push({
        model: modelConfig.model,
        provider: modelConfig.provider as LLMProvider,
        inputTokens,
        outputTokens,
        calls: 1
      });
    }
  }

  private calculateTotalCost(usageArray: ModelUsage[]): number {
    return usageArray.reduce((total, usage) => {
      const cost = calculateRequestCost(
        usage.model,
        usage.provider,
        usage.inputTokens,
        usage.outputTokens
      );
      return total + cost;
    }, 0);
  }
}