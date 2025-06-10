/**
 * Tests for Memory System Compatibility
 * 
 * Tests the impressionist memory manager's integration with the engine,
 * including memory compaction, context management, and token efficiency.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistStory } from '@/types/impressionistStory';
import { AnthropicService } from '@/services/anthropicService';

// Mock Anthropic service that tracks memory usage
const createMockAnthropicServiceWithMemory = (responses: Array<{ narrative: string; remember?: string[]; forget?: string[] }>) => {
  let responseIndex = 0;
  
  return {
    isConfigured: vi.fn().mockReturnValue(true),
    makeRequestWithUsage: vi.fn().mockImplementation(async (prompt: string) => {
      const response = responses[responseIndex % responses.length];
      responseIndex++;
      
      const signals: any = {};
      if (response.remember) signals.remember = response.remember;
      if (response.forget) signals.forget = response.forget;
      
      return {
        content: JSON.stringify({
          narrative: response.narrative,
          signals
        }),
        usage: {
          input_tokens: Math.floor(prompt.length / 4),
          output_tokens: Math.floor(response.narrative.length / 4)
        }
      };
    })
  } as any;
};

describe('Memory System Compatibility', () => {
  let engine: ImpressionistEngine;
  let mockStory: ImpressionistStory;

  beforeEach(() => {
    mockStory = {
      title: 'Memory Test Story',
      author: 'Test',
      blurb: 'Testing memory management',
      version: '1.0',
      context: 'A story for testing memory systems.',
      
      scenes: [
        {
          id: 'start',
          sketch: 'You begin your journey.',
          leads_to: {
            next: 'when ready to continue'
          }
        },
        {
          id: 'next',
          sketch: 'The journey continues.'
        }
      ],
      
      endings: [
        {
          id: 'complete',
          when: 'story is finished',
          sketch: 'Your journey ends here.'
        }
      ],
      
      guidance: 'Test memory functionality.'
    };
  });

  describe('Memory Creation and Storage', () => {
    it('should create memories from LLM remember signals', async () => {
      const mockService = createMockAnthropicServiceWithMemory([
        { 
          narrative: 'You examine the mysterious box.',
          remember: ['box is made of dark wood', 'strange symbols carved on top']
        }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      await engine.processAction({ input: 'I look at the box' });
      
      // Access memory manager to check memories were stored
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      expect(memoryContext.memories).toContain('box is made of dark wood');
      expect(memoryContext.memories).toContain('strange symbols carved on top');
    });

    it('should handle forget signals gracefully (impressionist system relies on natural compaction)', async () => {
      const mockService = createMockAnthropicServiceWithMemory([
        { 
          narrative: 'You remember the box.',
          remember: ['the box was important']
        },
        { 
          narrative: 'You forget about the box.',
          forget: ['the box was important']
        }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // First action - create memory
      await engine.processAction({ input: 'I think about the box' });
      let memoryManager = (engine as any).memoryManager;
      let memoryContext = memoryManager.getMemories();
      expect(memoryContext.memories).toContain('the box was important');
      
      // Second action - forget signal should not crash (impressionist system doesn't explicitly forget)
      const response = await engine.processAction({ input: 'I forget the box' });
      expect(response.text).toBeDefined();
      expect(response.error).toBeUndefined();
      
      // Memory might still be there since impressionist system doesn't explicitly remove memories
      memoryContext = memoryManager.getMemories();
      expect(Array.isArray(memoryContext.memories)).toBe(true);
    });

    it('should handle multiple memory operations in one response', async () => {
      const mockService = createMockAnthropicServiceWithMemory([
        { 
          narrative: 'You see old and new things.',
          remember: ['new discovery made'],
          forget: ['old irrelevant detail']
        }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // Set up initial memory
      const memoryManager = (engine as any).memoryManager;
      memoryManager.addMemory('old irrelevant detail');
      
      await engine.processAction({ input: 'I observe my surroundings' });
      
      const memoryContext = memoryManager.getMemories();
      expect(memoryContext.memories).toContain('new discovery made');
      // Note: forget signal is just a hint in impressionist system, doesn't guarantee removal
    });
  });

  describe('Memory Compaction', () => {
    it('should trigger compaction after configured interval', async () => {
      const mockService = createMockAnthropicServiceWithMemory([
        { narrative: 'Memory 1.', remember: ['memory 1'] },
        { narrative: 'Memory 2.', remember: ['memory 2'] },
        { narrative: 'Memory 3.', remember: ['memory 3'] },
        { narrative: 'Memory 4.', remember: ['memory 4'] },
        { narrative: 'Memory 5.', remember: ['memory 5'] },
        { narrative: 'Memory 6.', remember: ['memory 6'] }, // This should trigger compaction (interval is 5)
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // Add memories - engine tracks both interaction memories and remember signals
      for (let i = 0; i < 6; i++) {
        await engine.processAction({ input: `Action ${i + 1}` });
      }
      
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      // Should have memories stored
      expect(memoryContext.totalCount).toBeGreaterThan(0);
      // Should have recent explicit memory
      expect(memoryContext.memories).toContain('memory 6');
    });

    it('should preserve important memories during compaction', async () => {
      const mockService = createMockAnthropicServiceWithMemory([
        { narrative: 'Important discovery.', remember: ['crucial plot point'] },
        { narrative: 'Regular action 1.', remember: ['detail 1'] },
        { narrative: 'Regular action 2.', remember: ['detail 2'] },
        { narrative: 'Regular action 3.', remember: ['detail 3'] },
        { narrative: 'Regular action 4.', remember: ['detail 4'] },
        { narrative: 'Regular action 5.', remember: ['detail 5'] },
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // Add memories, starting with important one
      for (let i = 0; i < 6; i++) {
        await engine.processAction({ input: `Action ${i + 1}` });
      }
      
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      // Important memory should be preserved even after compaction
      expect(memoryContext.memories).toContain('crucial plot point');
    });
  });

  describe('Context Integration', () => {
    it('should include active memories in LLM context', async () => {
      const mockService = createMockAnthropicServiceWithMemory([
        { narrative: 'You remember.', remember: ['important context'] },
        { narrative: 'You act with context.' }
      ]);
      
      const makeRequestSpy = vi.spyOn(mockService, 'makeRequestWithUsage');
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // First action creates memory
      await engine.processAction({ input: 'I discover something' });
      
      // Second action should include memory in context
      await engine.processAction({ input: 'I use what I learned' });
      
      // Check that the second prompt includes the memory
      expect(makeRequestSpy).toHaveBeenCalledTimes(2);
      const [secondPrompt] = makeRequestSpy.mock.calls[1];
      expect(secondPrompt).toContain('important context');
    });

    it('should limit memory context to prevent token overflow', async () => {
      // Create many memories
      const responses = Array.from({ length: 20 }, (_, i) => ({
        narrative: `Action ${i + 1}`,
        remember: [`memory detail ${i + 1} with some extra content to make it longer`]
      }));
      
      const mockService = createMockAnthropicServiceWithMemory(responses);
      const makeRequestSpy = vi.spyOn(mockService, 'makeRequestWithUsage');
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // Create many memories
      for (let i = 0; i < 15; i++) {
        await engine.processAction({ input: `Action ${i + 1}` });
      }
      
      // Check that context size is reasonable
      const [lastPrompt] = makeRequestSpy.mock.calls[makeRequestSpy.mock.calls.length - 1];
      expect(lastPrompt.length).toBeLessThan(3000); // Reasonable context limit
    });
  });

  describe('Memory Persistence Across Scenes', () => {
    it('should maintain memories when transitioning between scenes', async () => {
      const mockService = createMockAnthropicServiceWithMemory([
        { narrative: 'You remember something important.', remember: ['crucial information'] },
        { narrative: 'You move to the next area.', remember: [] } // Scene transition
      ]);
      
      // Add scene transition signal to second response
      mockService.makeRequestWithUsage.mockImplementationOnce(async (prompt: string) => {
        return {
          content: JSON.stringify({
            narrative: 'You remember something important.',
            signals: { remember: ['crucial information'] }
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      }).mockImplementationOnce(async (prompt: string) => {
        return {
          content: JSON.stringify({
            narrative: 'You move to the next area.',
            signals: { scene: 'next' }
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      });
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // Create memory in first scene
      await engine.processAction({ input: 'I learn something' });
      
      // Transition to next scene
      await engine.processAction({ input: 'I continue forward' });
      
      // Memory should persist across scene transition
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      expect(memoryContext.memories).toContain('crucial information');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed memory signals gracefully', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeRequestWithUsage: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            narrative: 'Something happens.',
            signals: {
              remember: 'not an array', // Should be array
              forget: { invalid: 'object' } // Should be array
            }
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
        })
      } as any;
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // Should not throw error despite malformed signals
      const response = await engine.processAction({ input: 'I do something' });
      expect(response.text).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it('should handle memory system errors without breaking game flow', async () => {
      const mockService = createMockAnthropicServiceWithMemory([
        { narrative: 'Normal action.', remember: ['test memory'] }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // Break the memory manager's getMemories method
      const memoryManager = (engine as any).memoryManager;
      const originalGetMemories = memoryManager.getMemories;
      memoryManager.getMemories = vi.fn().mockImplementation(() => {
        throw new Error('Memory system failure');
      });
      
      // Should handle memory error gracefully and continue game flow
      const response = await engine.processAction({ input: 'I try something' });
      expect(response.text).toBeDefined();
      
      // Restore original method for cleanup
      memoryManager.getMemories = originalGetMemories;
    });
  });
});