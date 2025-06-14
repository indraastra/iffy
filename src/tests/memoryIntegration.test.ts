/**
 * Memory Integration Tests
 * 
 * Tests integration between the engine and memory manager:
 * - Automatic memory capture from interactions
 * - Memory inclusion in LLM context
 * - Memory persistence across saves/loads
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistStory } from '@/types/impressionistStory';

describe('Memory Integration', () => {
  let engine: ImpressionistEngine;
  let mockStory: ImpressionistStory;

  beforeEach(() => {
    mockStory = {
      title: 'Memory Test Story',
      author: 'Test',
      blurb: 'A story for testing memory systems.',
      version: '1.0',
      context: 'A test story context.',
      scenes: {
        start: {
          sketch: 'You begin your journey.',
          leads_to: { next: 'when ready to continue' }
        },
        next: {
          sketch: 'You continue your journey.'
        }
      },
      endings: {
        variations: [
          { id: 'end', when: 'story complete', sketch: 'The end.' }
        ]
      },
      guidance: 'Be helpful.'
    };
  });

  describe('Automatic Memory Capture', () => {
    it('should capture memories from interactions when API is configured', async () => {
      // Mock service that returns responses with memories
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeStructuredRequest: vi.fn().mockResolvedValue({
          data: {
            narrative: 'You look around the room.',
            memories: ['Player examined the room'],
            importance: 5,
            signals: {}
          },
          usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
        })
      };

      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      await engine.processAction({ input: 'look around' });
      
      // Check that memory manager received the memory
      const memoryManager = engine.getMemoryManager();
      const memoryContext = memoryManager.getMemories(10);
      
      expect(memoryContext.memories.length).toBeGreaterThan(0);
      expect(memoryContext.memories.some(memory => 
        memory.includes('examined the room')
      )).toBe(true);
    });

    it('should handle interactions without configured API', async () => {
      engine = new ImpressionistEngine(); // No API configured
      engine.loadStory(mockStory);
      
      await engine.processAction({ input: 'test action' });
      
      // Should still track the interaction even if API not configured
      const gameState = engine.getGameState();
      expect(gameState.interactions.length).toBe(1);
      expect(gameState.interactions[0].playerInput).toBe('test action');
    });
  });

  describe('Memory Context Integration', () => {
    it('should include memories in LLM context', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeStructuredRequest: vi.fn().mockResolvedValue({
          data: {
            narrative: 'You recall important information.',
            memories: ['Player remembered something important'],
            importance: 6,
            signals: {}
          },
          usage: { input_tokens: 120, output_tokens: 60, total_tokens: 180 }
        })
      };

      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      // Add some memories manually to test context inclusion
      const memoryManager = engine.getMemoryManager();
      memoryManager.addMemory('Important discovery was made', 8);
      memoryManager.addMemory('Key character was encountered', 7);
      
      await engine.processAction({ input: 'think about what happened' });
      
      // Verify the LLM was called with context that should include memories
      expect(mockService.makeStructuredRequest).toHaveBeenCalled();
      const callArgs = mockService.makeStructuredRequest.mock.calls[0];
      const prompt = callArgs[0];
      
      // The prompt should contain memory context
      expect(prompt).toContain('KEY MEMORIES');
    });
  });

  describe('Memory Compaction', () => {
    it('should trigger compaction when memory limit is reached', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeStructuredRequest: vi.fn()
          .mockResolvedValueOnce({
            data: { narrative: 'Response 1', memories: ['Memory 1'], importance: 5, signals: {} },
            usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
          })
          .mockResolvedValueOnce({
            data: {
              compactedMemories: [
                { content: 'Compacted important memory', importance: 8 }
              ]
            },
            usage: { input_tokens: 200, output_tokens: 100, total_tokens: 300 }
          })
      };

      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      const memoryManager = engine.getMemoryManager();
      memoryManager.setCompactionInterval(3); // Compact after 3 memories
      
      // Add enough memories to trigger compaction
      memoryManager.addMemory('Memory 1', 5);
      memoryManager.addMemory('Memory 2', 6);
      memoryManager.addMemory('Memory 3', 7); // Should trigger compaction
      
      // Give compaction a moment to potentially run
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats = memoryManager.getStats();
      expect(stats.totalMemories).toBeGreaterThan(0);
    });
  });

  describe('Multi-Part Response Tracking', () => {
    it('should track both action and transition phases separately', async () => {
      let callCount = 0;
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeStructuredRequest: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call: action response with scene transition
            return Promise.resolve({
              data: {
                narrative: 'You decide to move forward.',
                memories: ['Player moved forward'],
                importance: 6,
                signals: { scene: 'next' }
              },
              usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
            });
          } else {
            // Second call: transition response
            return Promise.resolve({
              data: {
                narrative: 'You find yourself in a new area.',
                memories: ['Player entered new area'],
                importance: 7,
                signals: { scene: 'next' }
              },
              usage: { input_tokens: 120, output_tokens: 60, total_tokens: 180 }
            });
          }
        })
      };

      // Create story with scene transitions
      const transitionStory = {
        ...mockStory,
        scenes: {
          start: {
            sketch: 'You are at the start.',
            leads_to: { next: 'when player progresses' }
          },
          next: {
            sketch: 'You have moved to the next scene.'
          }
        }
      };

      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(transitionStory);
      
      await engine.processAction({ input: 'move forward' });
      
      // Check that both phases were tracked
      const gameState = engine.getGameState();
      expect(gameState.interactions.length).toBe(2);
      
      const actionPhase = gameState.interactions[0];
      const transitionPhase = gameState.interactions[1];
      
      expect(actionPhase.playerInput).toBe('move forward [Action Phase]');
      expect(actionPhase.llmResponse).toBe('You decide to move forward.');
      expect(actionPhase.importance).toBe(6);
      
      expect(transitionPhase.playerInput).toBe('move forward [Transition Phase]');
      expect(transitionPhase.llmResponse).toBe('You find yourself in a new area.');
      expect(transitionPhase.importance).toBe(7);
      
      // Both should have different memories
      const memoryManager = engine.getMemoryManager();
      const memoryContext = memoryManager.getMemories(10);
      expect(memoryContext.memories.some(m => m.includes('moved forward'))).toBe(true);
      expect(memoryContext.memories.some(m => m.includes('entered new area'))).toBe(true);
    });
  });

  describe('Save/Load Persistence', () => {
    it('should persist memories across save/load cycles', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeStructuredRequest: vi.fn().mockResolvedValue({
          data: {
            narrative: 'Test response.',
            memories: ['Test memory'],
            importance: 5,
            signals: {}
          },
          usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
        })
      };

      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      // Create some memories
      const memoryManager = engine.getMemoryManager();
      memoryManager.addMemory('Important story event', 8);
      
      // Save the game
      const saveData = engine.saveGame();
      
      // Create new engine and load
      const newEngine = new ImpressionistEngine(mockService as any);
      newEngine.loadStory(mockStory);
      const loadResult = newEngine.loadGame(saveData);
      
      expect(loadResult.success).toBe(true);
      
      // Check that memories were restored
      const restoredMemoryManager = newEngine.getMemoryManager();
      const restoredMemories = restoredMemoryManager.getMemories(10);
      
      expect(restoredMemories.memories.some(memory => 
        memory.includes('Important story event')
      )).toBe(true);
    });
  });
});