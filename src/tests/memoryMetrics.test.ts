/**
 * Tests for Memory Metrics Collection
 * 
 * Validates that the memory system properly tracks LLM usage
 * separately from the main game engine metrics.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryMetricsCollector } from '@/engine/memoryMetricsCollector';
import { ImpressionistMemoryManager } from '@/engine/impressionistMemoryManager';

describe('Memory Metrics Collection', () => {
  let memoryMetrics: MemoryMetricsCollector;
  let memoryManager: ImpressionistMemoryManager;

  beforeEach(() => {
    memoryMetrics = new MemoryMetricsCollector();
    
    // Create memory manager with mock service that won't actually make calls
    const mockService = {
      isConfigured: vi.fn().mockReturnValue(false), // Prevents actual API calls
      makeRequestWithUsage: vi.fn()
    } as any;
    
    memoryManager = new ImpressionistMemoryManager(mockService);
  });

  describe('Memory Metrics Tracking', () => {
    it('should track compaction operation metrics', () => {
      memoryMetrics.trackMemoryRequest(
        'compaction',
        150,  // input tokens
        50,   // output tokens  
        1200, // latency ms
        'claude-3-5-haiku-latest',
        25,   // memories input
        15,   // memories output
        true  // success
      );

      const latest = memoryMetrics.getLatest();
      expect(latest).toBeDefined();
      expect(latest!.operation).toBe('compaction');
      expect(latest!.inputTokens).toBe(150);
      expect(latest!.outputTokens).toBe(50);
      expect(latest!.totalTokens).toBe(200);
      expect(latest!.latencyMs).toBe(1200);
      expect(latest!.memoriesInput).toBe(25);
      expect(latest!.memoriesOutput).toBe(15);
      expect(latest!.compressionRatio).toBeCloseTo(0.6); // 15/25
      expect(latest!.success).toBe(true);
    });

    it('should track extraction operation metrics', () => {
      memoryMetrics.trackMemoryRequest(
        'extraction',
        200,  // input tokens
        80,   // output tokens
        800,  // latency ms
        'claude-3-5-haiku-latest',
        10,   // memories input
        12,   // memories output (extraction can increase)
        true
      );

      const latest = memoryMetrics.getLatest();
      expect(latest!.operation).toBe('extraction');
      expect(latest!.compressionRatio).toBeCloseTo(1.2); // 12/10 (expansion)
    });

    it('should track failed operations with error messages', () => {
      memoryMetrics.trackMemoryRequest(
        'compaction',
        100,
        0,
        5000,
        'claude-3-5-haiku-latest',
        20,
        20, // No change due to error
        false,
        'API timeout error'
      );

      const latest = memoryMetrics.getLatest();
      expect(latest!.success).toBe(false);
      expect(latest!.errorMessage).toBe('API timeout error');
      expect(latest!.compressionRatio).toBe(1); // No compression due to error
    });
  });

  describe('Session Statistics', () => {
    it('should calculate session statistics correctly', () => {
      // Add multiple operations
      memoryMetrics.trackMemoryRequest('compaction', 150, 50, 1200, 'haiku', 25, 15, true);
      memoryMetrics.trackMemoryRequest('extraction', 200, 80, 800, 'haiku', 10, 12, true);
      memoryMetrics.trackMemoryRequest('compaction', 180, 60, 1500, 'haiku', 30, 18, true);

      const stats = memoryMetrics.getSessionStats();
      
      expect(stats.totalCalls).toBe(3);
      expect(stats.compactionCalls).toBe(2);
      expect(stats.extractionCalls).toBe(1);
      expect(stats.avgInputTokens).toBeCloseTo(176.67, 1); // (150+200+180)/3
      expect(stats.avgOutputTokens).toBeCloseTo(63.33, 1); // (50+80+60)/3
      expect(stats.avgLatency).toBeCloseTo(1166.67, 1); // (1200+800+1500)/3
      expect(stats.totalMemoriesCompacted).toBe(55); // 25+30 from compactions
      expect(stats.lastCompactionTime).toBeDefined();
      
      // Average compression from successful compactions: (15/25 + 18/30) / 2 = (0.6 + 0.6) / 2 = 0.6
      expect(stats.avgCompressionRatio).toBeCloseTo(0.6, 1);
    });

    it('should handle empty metrics gracefully', () => {
      const stats = memoryMetrics.getSessionStats();
      
      expect(stats.totalCalls).toBe(0);
      expect(stats.compactionCalls).toBe(0);
      expect(stats.extractionCalls).toBe(0);
      expect(stats.avgInputTokens).toBe(0);
      expect(stats.avgOutputTokens).toBe(0);
      expect(stats.avgLatency).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.avgCompressionRatio).toBe(1);
      expect(stats.totalMemoriesCompacted).toBe(0);
      expect(stats.lastCompactionTime).toBeNull();
    });
  });

  describe('Cost Calculation', () => {
    it('should return zero cost when no MultiModelService is available', () => {
      // Add operation with known token counts
      memoryMetrics.trackMemoryRequest('compaction', 1000, 500, 1000, 'haiku', 20, 12, true);
      
      const stats = memoryMetrics.getSessionStats();
      
      // Should be zero since no MultiModelService is configured in test
      expect(stats.totalCost).toBe(0);
    });
    
    it('should calculate costs using MultiModelService when available', () => {
      // Mock MultiModelService with calculateMemoryCost method
      const mockMultiModelService = {
        calculateMemoryCost: vi.fn().mockReturnValue(0.0028)
      };
      
      memoryMetrics.setMultiModelService(mockMultiModelService);
      memoryMetrics.trackMemoryRequest('compaction', 1000, 500, 1000, 'haiku', 20, 12, true);
      
      const stats = memoryMetrics.getSessionStats();
      
      expect(mockMultiModelService.calculateMemoryCost).toHaveBeenCalledWith(1000, 500);
      expect(stats.totalCost).toBe(0.0028);
    });
  });

  describe('Compression Analysis', () => {
    it('should analyze compression efficiency', () => {
      // Add various compaction results
      memoryMetrics.trackMemoryRequest('compaction', 150, 50, 1200, 'haiku', 20, 10, true); // 50% compression
      memoryMetrics.trackMemoryRequest('compaction', 180, 60, 1500, 'haiku', 30, 20, true); // 67% compression  
      memoryMetrics.trackMemoryRequest('compaction', 200, 80, 2000, 'haiku', 40, 25, true); // 62.5% compression
      memoryMetrics.trackMemoryRequest('compaction', 100, 0, 5000, 'haiku', 15, 15, false); // Failed

      const analysis = memoryMetrics.getCompressionAnalysis();
      
      expect(analysis.totalCompactions).toBe(4);
      expect(analysis.successfulCompactions).toBe(3);
      expect(analysis.bestCompression).toBeCloseTo(0.5, 2); // Best ratio (most compression)
      expect(analysis.worstCompression).toBeCloseTo(0.667, 2); // Worst ratio (least compression) - 20/30
      expect(analysis.totalMemoriesSaved).toBe(35); // (20-10) + (30-20) + (40-25) = 10 + 10 + 15 = 35
      
      // Average: (0.5 + 0.667 + 0.625) / 3 ≈ 0.597
      expect(analysis.avgCompressionRatio).toBeCloseTo(0.597, 2);
    });
  });

  describe('Warning System', () => {
    it('should generate appropriate warnings', () => {
      // Add a failed operation
      memoryMetrics.trackMemoryRequest('compaction', 100, 0, 6000, 'haiku', 20, 20, false, 'Timeout');
      
      const warnings = memoryMetrics.getMemoryWarnings();
      
      expect(warnings).toContain('🔴 Last memory operation failed');
      expect(warnings).toContain('⚠️ Memory operations taking longer than 5 seconds');
    });

    it('should warn about poor compression efficiency', () => {
      // Add operations with poor compression
      memoryMetrics.trackMemoryRequest('compaction', 150, 50, 1000, 'haiku', 20, 19, true); // 95% ratio (poor)
      memoryMetrics.trackMemoryRequest('compaction', 180, 60, 1200, 'haiku', 30, 28, true); // 93% ratio (poor)

      const warnings = memoryMetrics.getMemoryWarnings();
      
      expect(warnings).toContain('⚠️ Memory compaction not achieving significant compression');
    });

    it('should warn about high costs', () => {
      // Mock MultiModelService with high cost calculation
      const mockMultiModelService = {
        calculateMemoryCost: vi.fn().mockReturnValue(0.30) // Each call returns $0.30
      };
      
      memoryMetrics.setMultiModelService(mockMultiModelService);
      memoryMetrics.trackMemoryRequest('compaction', 100000, 50000, 1000, 'haiku', 50, 30, true);
      memoryMetrics.trackMemoryRequest('compaction', 100000, 50000, 1200, 'haiku', 40, 25, true);

      const warnings = memoryMetrics.getMemoryWarnings();
      
      expect(warnings).toContain('💰 Memory system costs above $0.50 this session');
    });
  });

  describe('Integration with Memory Manager', () => {
    it('should provide access to memory metrics from memory manager', () => {
      const metrics = memoryManager.getMemoryMetrics();
      
      expect(metrics).toBeInstanceOf(MemoryMetricsCollector);
      
      // Should start with empty stats
      const stats = metrics.getSessionStats();
      expect(stats.totalCalls).toBe(0);
    });

    it('should reset memory metrics when memory manager resets', () => {
      const metrics = memoryManager.getMemoryMetrics();
      
      // Add some fake metrics
      metrics.trackMemoryRequest('compaction', 100, 50, 1000, 'haiku', 10, 8, true);
      expect(metrics.getSessionStats().totalCalls).toBe(1);
      
      // Reset should clear metrics
      memoryManager.reset();
      expect(metrics.getSessionStats().totalCalls).toBe(0);
    });
  });

  describe('Export and Analysis', () => {
    it('should export metrics for analysis', () => {
      memoryMetrics.trackMemoryRequest('compaction', 150, 50, 1200, 'haiku', 20, 12, true);
      memoryMetrics.trackMemoryRequest('extraction', 200, 80, 800, 'haiku', 5, 8, true);

      const exported = memoryMetrics.exportMetrics();
      const parsed = JSON.parse(exported);
      
      expect(parsed.memoryMetrics).toHaveLength(2);
      expect(parsed.sessionStats.totalCalls).toBe(2);
      expect(parsed.compressionAnalysis.totalCompactions).toBe(1);
      expect(parsed.exportTime).toBeDefined();
    });
  });
});