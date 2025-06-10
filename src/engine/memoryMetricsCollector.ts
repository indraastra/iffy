/**
 * Memory Metrics Collector - Tracks memory system LLM usage separately from gameplay
 * 
 * Provides specialized monitoring for memory compaction operations and efficiency.
 */

export interface MemoryMetric {
  requestId: string;
  timestamp: Date;
  operation: 'compaction' | 'extraction' | 'relevance_check';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  modelUsed: string;
  
  // Memory-specific metrics
  memoriesInput: number;
  memoriesOutput: number;
  compressionRatio: number; // memoriesOutput / memoriesInput
  
  // Optional details
  success: boolean;
  errorMessage?: string;
}

export interface MemorySessionStats {
  totalCalls: number;
  successfulCalls: number;
  compactionCalls: number;
  extractionCalls: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatency: number;
  totalCost: number;
  avgCompressionRatio: number;
  totalMemoriesCompacted: number;
  lastCompactionTime: Date | null;
}

export class MemoryMetricsCollector {
  private metrics: MemoryMetric[] = [];
  private debugPane?: any;

  // Memory model pricing (cheaper than main models)
  private readonly HAIKU_INPUT_COST_PER_1K = 0.0025;   // $2.50 per million input tokens
  private readonly HAIKU_OUTPUT_COST_PER_1K = 0.0125;  // $12.50 per million output tokens

  /**
   * Track a memory operation request
   */
  trackMemoryRequest(
    operation: 'compaction' | 'extraction' | 'relevance_check',
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
    modelUsed: string,
    memoriesInput: number,
    memoriesOutput: number,
    success: boolean = true,
    errorMessage?: string
  ): void {
    const metric: MemoryMetric = {
      requestId: this.generateRequestId(),
      timestamp: new Date(),
      operation,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs,
      modelUsed,
      memoriesInput,
      memoriesOutput,
      compressionRatio: memoriesInput > 0 ? memoriesOutput / memoriesInput : 1,
      success,
      errorMessage
    };

    this.metrics.push(metric);
    this.logMemoryMetric(metric);
    
    // Keep only last 50 memory operations to avoid bloat
    if (this.metrics.length > 50) {
      this.metrics = this.metrics.slice(-50);
    }

    // Update debug pane if available
    if (this.debugPane) {
      this.debugPane.updateMemoryMetrics(this.getSessionStats());
    }
  }

  /**
   * Get latest memory metric
   */
  getLatest(): MemoryMetric | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get memory session statistics
   */
  getSessionStats(): MemorySessionStats {
    if (this.metrics.length === 0) {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        compactionCalls: 0,
        extractionCalls: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        avgLatency: 0,
        totalCost: 0,
        avgCompressionRatio: 1,
        totalMemoriesCompacted: 0,
        lastCompactionTime: null
      };
    }

    const totalCalls = this.metrics.length;
    const successfulCalls = this.metrics.filter(m => m.success).length;
    const compactionMetrics = this.metrics.filter(m => m.operation === 'compaction');
    const extractionMetrics = this.metrics.filter(m => m.operation === 'extraction');
    
    const avgInputTokens = this.average(m => m.inputTokens);
    const avgOutputTokens = this.average(m => m.outputTokens);
    const totalInputTokens = this.sum(m => m.inputTokens);
    const totalOutputTokens = this.sum(m => m.outputTokens);
    const avgLatency = this.average(m => m.latencyMs);
    const totalCost = this.calculateTotalCost();
    
    // Compression efficiency from successful compactions
    const successfulCompactions = compactionMetrics.filter(m => m.success);
    const avgCompressionRatio = successfulCompactions.length > 0 
      ? successfulCompactions.reduce((sum, m) => sum + m.compressionRatio, 0) / successfulCompactions.length
      : 1;

    const totalMemoriesCompacted = compactionMetrics.reduce((sum, m) => sum + m.memoriesInput, 0);
    
    const lastCompactionTime = compactionMetrics.length > 0 
      ? compactionMetrics[compactionMetrics.length - 1].timestamp
      : null;

    return {
      totalCalls,
      successfulCalls,
      compactionCalls: compactionMetrics.length,
      extractionCalls: extractionMetrics.length,
      avgInputTokens,
      avgOutputTokens,
      totalInputTokens,
      totalOutputTokens,
      avgLatency,
      totalCost,
      avgCompressionRatio,
      totalMemoriesCompacted,
      lastCompactionTime
    };
  }

  /**
   * Get memory system warnings
   */
  getMemoryWarnings(): string[] {
    const warnings: string[] = [];
    const stats = this.getSessionStats();
    const latest = this.getLatest();

    if (latest && !latest.success) {
      warnings.push('🔴 Last memory operation failed');
    }

    if (stats.avgCompressionRatio > 0.9) {
      warnings.push('⚠️ Memory compaction not achieving significant compression');
    }

    if (stats.avgLatency > 5000) {
      warnings.push('⚠️ Memory operations taking longer than 5 seconds');
    }

    if (stats.totalCost > 0.50) {
      warnings.push('💰 Memory system costs above $0.50 this session');
    }

    // Check if compaction frequency is appropriate
    const now = new Date();
    if (stats.lastCompactionTime) {
      const timeSinceLastCompaction = now.getTime() - stats.lastCompactionTime.getTime();
      const minutesSinceCompaction = timeSinceLastCompaction / (1000 * 60);
      
      if (minutesSinceCompaction > 30) {
        warnings.push('⏰ No memory compaction in over 30 minutes');
      }
    }

    return warnings;
  }

  /**
   * Get metrics for specific operation type
   */
  getMetricsByOperation(operation: 'compaction' | 'extraction' | 'relevance_check'): MemoryMetric[] {
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * Get compression efficiency analysis
   */
  getCompressionAnalysis(): {
    totalCompactions: number;
    successfulCompactions: number;
    avgCompressionRatio: number;
    bestCompression: number;
    worstCompression: number;
    totalMemoriesSaved: number;
  } {
    const compactions = this.metrics.filter(m => m.operation === 'compaction');
    const successful = compactions.filter(m => m.success);
    
    if (successful.length === 0) {
      return {
        totalCompactions: compactions.length,
        successfulCompactions: 0,
        avgCompressionRatio: 1,
        bestCompression: 1,
        worstCompression: 1,
        totalMemoriesSaved: 0
      };
    }

    const ratios = successful.map(m => m.compressionRatio);
    const avgCompressionRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    const bestCompression = Math.min(...ratios);
    const worstCompression = Math.max(...ratios);
    
    const totalMemoriesSaved = successful.reduce((sum, m) => {
      return sum + (m.memoriesInput - m.memoriesOutput);
    }, 0);

    return {
      totalCompactions: compactions.length,
      successfulCompactions: successful.length,
      avgCompressionRatio,
      bestCompression,
      worstCompression,
      totalMemoriesSaved
    };
  }

  /**
   * Export memory metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      memoryMetrics: this.metrics,
      sessionStats: this.getSessionStats(),
      compressionAnalysis: this.getCompressionAnalysis(),
      exportTime: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Reset all memory metrics
   */
  reset(): void {
    this.metrics = [];
    console.log('🔄 Memory metrics collector reset');
  }

  /**
   * Set debug pane for real-time updates
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
  }

  // Private helper methods

  private logMemoryMetric(metric: MemoryMetric): void {
    const status = metric.success ? '✅' : '❌';
    const cost = this.calculateRequestCost(metric);
    const compression = metric.operation === 'compaction' 
      ? ` (${metric.memoriesInput}→${metric.memoriesOutput}, ${(metric.compressionRatio * 100).toFixed(0)}%)`
      : '';
    
    console.log(
      `🧠 ${status} ${metric.operation}${compression}: ` +
      `${metric.inputTokens}→${metric.outputTokens} tokens, ` +
      `${metric.latencyMs.toFixed(0)}ms, $${cost.toFixed(5)}`
    );
  }

  private generateRequestId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private average(selector: (metric: MemoryMetric) => number): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, m) => acc + selector(m), 0);
    return sum / this.metrics.length;
  }

  private sum(selector: (metric: MemoryMetric) => number): number {
    return this.metrics.reduce((acc, m) => acc + selector(m), 0);
  }

  private calculateRequestCost(metric: MemoryMetric): number {
    // Use Haiku pricing as default (most memory operations use this model)
    const inputCost = (metric.inputTokens / 1000) * this.HAIKU_INPUT_COST_PER_1K;
    const outputCost = (metric.outputTokens / 1000) * this.HAIKU_OUTPUT_COST_PER_1K;
    return inputCost + outputCost;
  }

  private calculateTotalCost(): number {
    return this.metrics.reduce((sum, metric) => sum + this.calculateRequestCost(metric), 0);
  }
}

// Debug pane integration for memory metrics
export interface MemoryMetricsDebugDisplay {
  updateMemoryMetrics(stats: MemorySessionStats): void;
  showMemoryWarnings(warnings: string[]): void;
  logMemoryMetric(metric: MemoryMetric): void;
}