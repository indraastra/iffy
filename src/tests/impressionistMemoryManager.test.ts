/**
 * Tests for the Impressionist Memory Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistMemoryManager } from '@/engine/impressionistMemoryManager';

// Mock Anthropic service
const mockAnthropicService = {
  isConfigured: vi.fn().mockReturnValue(false),
  makeRequest: vi.fn().mockResolvedValue(JSON.stringify({
    compactedMemories: [
      { content: "Compacted memory 1", importance: 8 },
      { content: "Compacted memory 2", importance: 6 }
    ]
  }))
};

describe('ImpressionistMemoryManager', () => {
  let memoryManager: ImpressionistMemoryManager;

  beforeEach(() => {
    memoryManager = new ImpressionistMemoryManager(mockAnthropicService as any);
    vi.clearAllMocks();
  });

  describe('addMemory', () => {
    it('should add memory with default importance', () => {
      memoryManager.addMemory('Test memory');
      
      const memories = memoryManager.getAllMemories();
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe('Test memory');
      expect(memories[0].importance).toBe(5);
    });

    it('should add memory with custom importance', () => {
      memoryManager.addMemory('Important memory', 9);
      
      const memories = memoryManager.getAllMemories();
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe('Important memory');
      expect(memories[0].importance).toBe(9);
    });

    it('should clamp importance values', () => {
      memoryManager.addMemory('Test 1', -5);
      memoryManager.addMemory('Test 2', 15);
      
      const memories = memoryManager.getAllMemories();
      expect(memories[0].importance).toBe(1); // Clamped from -5
      expect(memories[1].importance).toBe(10); // Clamped from 15
    });

    it('should ignore empty or whitespace-only memories', () => {
      memoryManager.addMemory('');
      memoryManager.addMemory('   ');
      memoryManager.addMemory('\n\t  ');
      
      const memories = memoryManager.getAllMemories();
      expect(memories).toHaveLength(0);
    });

    it('should trim memory content', () => {
      memoryManager.addMemory('  Test memory  ');
      
      const memories = memoryManager.getAllMemories();
      expect(memories[0].content).toBe('Test memory');
    });
  });

  describe('getMemories', () => {
    beforeEach(() => {
      // Add some test memories with different importance levels
      memoryManager.addMemory('Low importance', 2);
      memoryManager.addMemory('Medium importance', 5);
      memoryManager.addMemory('High importance', 9);
      memoryManager.addMemory('Very high importance', 10);
    });

    it('should return memories sorted by importance and recency', () => {
      const context = memoryManager.getMemories();
      
      expect(context.memories).toHaveLength(4);
      expect(context.totalCount).toBe(4);
      // Should be sorted by importance (highest first)
      expect(context.memories[0]).toBe('Very high importance');
      expect(context.memories[1]).toBe('High importance');
    });

    it('should respect custom limit', () => {
      const context = memoryManager.getMemories(2);
      
      expect(context.memories).toHaveLength(2);
      expect(context.totalCount).toBe(4);
    });

    it('should return empty context when no memories', () => {
      const emptyManager = new ImpressionistMemoryManager();
      const context = emptyManager.getMemories();
      
      expect(context.memories).toHaveLength(0);
      expect(context.totalCount).toBe(0);
      expect(context.lastCompactionTime).toBeNull();
    });
  });

  describe('compaction', () => {
    it('should not trigger compaction when LLM is not configured', () => {
      mockAnthropicService.isConfigured.mockReturnValue(false);
      
      // Add enough memories to trigger compaction
      for (let i = 0; i < 10; i++) {
        memoryManager.addMemory(`Memory ${i}`);
      }
      
      expect(mockAnthropicService.makeRequest).not.toHaveBeenCalled();
    });

    it('should set compaction interval', () => {
      memoryManager.setCompactionInterval(3);
      
      const stats = memoryManager.getStats();
      expect(stats.compactionInterval).toBe(3);
    });

    it('should ignore invalid compaction intervals', () => {
      const originalInterval = memoryManager.getStats().compactionInterval;
      
      memoryManager.setCompactionInterval(-1);
      memoryManager.setCompactionInterval(25);
      
      const stats = memoryManager.getStats();
      expect(stats.compactionInterval).toBe(originalInterval);
    });
  });

  describe('state management', () => {
    beforeEach(() => {
      memoryManager.addMemory('Memory 1', 7);
      memoryManager.addMemory('Memory 2', 4);
    });

    it('should export state correctly', () => {
      const state = memoryManager.exportState();
      
      expect(state.memories).toHaveLength(2);
      expect(state.memories[0].content).toBe('Memory 1');
      expect(state.memories[1].content).toBe('Memory 2');
      expect(state.memoriesSinceLastCompaction).toBe(2);
    });

    it('should import state correctly', () => {
      const state = memoryManager.exportState();
      const newManager = new ImpressionistMemoryManager();
      
      newManager.importState(state);
      
      const newMemories = newManager.getAllMemories();
      expect(newMemories).toHaveLength(2);
      expect(newMemories[0].content).toBe('Memory 1');
      expect(newMemories[1].content).toBe('Memory 2');
    });

    it('should handle invalid import state gracefully', () => {
      const newManager = new ImpressionistMemoryManager();
      
      // Should not throw on invalid state
      newManager.importState({});
      newManager.importState({ memories: 'invalid' });
      newManager.importState(null);
      
      expect(newManager.getAllMemories()).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('should clear all memories and reset state', () => {
      memoryManager.addMemory('Memory 1');
      memoryManager.addMemory('Memory 2');
      
      expect(memoryManager.getAllMemories()).toHaveLength(2);
      
      memoryManager.reset();
      
      expect(memoryManager.getAllMemories()).toHaveLength(0);
      const stats = memoryManager.getStats();
      expect(stats.totalMemories).toBe(0);
      expect(stats.memoriesSinceLastCompaction).toBe(0);
      expect(stats.isProcessing).toBe(false);
      expect(stats.lastCompactionTime).toBeNull();
    });
  });

  describe('stats', () => {
    it('should provide accurate statistics', () => {
      memoryManager.addMemory('Memory 1');
      memoryManager.addMemory('Memory 2');
      
      const stats = memoryManager.getStats();
      
      expect(stats.totalMemories).toBe(2);
      expect(stats.memoriesSinceLastCompaction).toBe(2);
      expect(stats.compactionInterval).toBe(5); // Default
      expect(stats.isProcessing).toBe(false);
      expect(stats.lastCompactionTime).toBeNull();
    });
  });
});