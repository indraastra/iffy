/**
 * Metrics Collector - Tracks token usage, latency, and performance
 * 
 * Provides real-time monitoring and session analytics for the impressionist engine.
 */

import { ImpressionistMetrics } from '@/types/impressionistStory';

export interface SessionStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatency: number;
  totalCost: number;
  contextEfficiency: number; // % of requests under 900 tokens
  sessionStartTime: Date;
  lastCallTime: Date | null;
  fastestResponse: number;
  slowestResponse: number;
}

export class MetricsCollector {
  private metrics: ImpressionistMetrics[] = [];
  private debugPane?: any;
  private sessionStartTime: Date = new Date();
  private successfulCalls: number = 0;
  private failedCalls: number = 0;
  private multiModelService?: any; // Optional reference for accurate pricing

  /**
   * Track a new API request
   */
  trackRequest(
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
    contextSize: number,
    memoryCount: number,
    sceneId: string,
    success: boolean = true
  ): void {
    const metric: ImpressionistMetrics = {
      requestId: this.generateRequestId(),
      timestamp: new Date(),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs,
      contextSize,
      memoryCount,
      sceneId
    };

    this.metrics.push(metric);
    this.logMetric(metric);
    
    // Track success/failure
    if (success) {
      this.successfulCalls++;
    } else {
      this.failedCalls++;
    }
    
    // Keep only last 100 requests to avoid memory bloat
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Update debug pane if available
    if (this.debugPane) {
      console.log('📊 Updating debug pane session stats');
      const stats = this.getSessionStats();
      console.log('📊 Session stats:', stats);
      this.debugPane.updateSessionStats(stats);
    } else {
      console.log('⚠️ Debug pane not available in metrics collector');
    }
  }

  /**
   * Get latest metrics entry
   */
  getLatest(): ImpressionistMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): SessionStats {
    if (this.metrics.length === 0) {
      return {
        totalCalls: 0,
        successfulCalls: this.successfulCalls,
        failedCalls: this.failedCalls,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        avgLatency: 0,
        totalCost: 0,
        contextEfficiency: 100,
        sessionStartTime: this.sessionStartTime,
        lastCallTime: null,
        fastestResponse: 0,
        slowestResponse: 0
      };
    }

    const totalCalls = this.metrics.length;
    const avgInputTokens = this.average(m => m.inputTokens);
    const avgOutputTokens = this.average(m => m.outputTokens);
    const totalInputTokens = this.sum(m => m.inputTokens);
    const totalOutputTokens = this.sum(m => m.outputTokens);
    const avgLatency = this.average(m => m.latencyMs);
    const totalCost = this.calculateTotalCost();
    
    // Context efficiency: % of requests under 900 input tokens
    const efficientRequests = this.metrics.filter(m => m.inputTokens < 900).length;
    const contextEfficiency = (efficientRequests / totalCalls) * 100;
    
    // Performance stats
    const latencies = this.metrics.map(m => m.latencyMs);
    const fastestResponse = Math.min(...latencies);
    const slowestResponse = Math.max(...latencies);
    const lastCallTime = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].timestamp : null;

    return {
      totalCalls,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      avgInputTokens,
      avgOutputTokens,
      totalInputTokens,
      totalOutputTokens,
      avgLatency,
      totalCost,
      contextEfficiency,
      sessionStartTime: this.sessionStartTime,
      lastCallTime,
      fastestResponse,
      slowestResponse
    };
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsInRange(startTime: Date, endTime: Date): ImpressionistMetrics[] {
    return this.metrics.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Get performance warnings
   */
  getWarnings(): string[] {
    const latest = this.getLatest();
    const warnings: string[] = [];

    if (latest) {
      if (latest.inputTokens > 900) {
        warnings.push('⚠️ Context approaching token limit');
      }
      if (latest.latencyMs > 3000) {
        warnings.push('⚠️ High latency detected');
      }
      if (latest.memoryCount > 40) {
        warnings.push('⚠️ Memory approaching compaction threshold');
      }
    }

    const stats = this.getSessionStats();
    if (stats.contextEfficiency < 80) {
      warnings.push('⚠️ Context efficiency below 80%');
    }
    if (stats.avgLatency > 2000) {
      warnings.push('⚠️ Average latency above 2 seconds');
    }

    return warnings;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      sessionStats: this.getSessionStats(),
      exportTime: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    console.log('🔄 Metrics collector reset');
  }

  /**
   * Set debug pane for real-time updates
   */
  setDebugPane(debugPane: any): void {
    console.log('📊 MetricsCollector.setDebugPane called with:', debugPane);
    this.debugPane = debugPane;
    
    // Test immediate update
    if (this.debugPane && this.debugPane.updateSessionStats) {
      console.log('📊 Testing immediate session stats update');
      this.debugPane.updateSessionStats(this.getSessionStats());
    }
  }

  /**
   * Set MultiModelService for accurate pricing
   */
  setMultiModelService(multiModelService: any): void {
    this.multiModelService = multiModelService;
  }

  // Private helper methods

  private logMetric(metric: ImpressionistMetrics): void {
    const efficiency = metric.inputTokens < 900 ? '✅' : '⚠️';
    const cost = this.calculateRequestCost(metric);
    
    console.log(
      `${efficiency} ${metric.inputTokens}→${metric.outputTokens} tokens, ` +
      `${metric.latencyMs.toFixed(0)}ms, $${cost.toFixed(4)}`
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private average(selector: (metric: ImpressionistMetrics) => number): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, m) => acc + selector(m), 0);
    return sum / this.metrics.length;
  }

  private sum(selector: (metric: ImpressionistMetrics) => number): number {
    return this.metrics.reduce((acc, m) => acc + selector(m), 0);
  }

  private calculateRequestCost(metric: ImpressionistMetrics): number {
    if (!this.multiModelService?.calculateCost) {
      console.warn('No MultiModelService available for cost calculation');
      return 0;
    }
    
    return this.multiModelService.calculateCost(metric.inputTokens, metric.outputTokens);
  }

  private calculateTotalCost(): number {
    return this.metrics.reduce((sum, metric) => sum + this.calculateRequestCost(metric), 0);
  }
}

// Debug pane integration
export interface MetricsDebugDisplay {
  updateSessionStats(stats: SessionStats): void;
  showWarnings(warnings: string[]): void;
  logMetric(metric: ImpressionistMetrics): void;
}