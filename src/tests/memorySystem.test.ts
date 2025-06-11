/**
 * Tests for Memory System Compatibility
 * 
 * Tests the impressionist memory manager's automatic interaction capture
 * and smart compaction functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistStory } from '@/types/impressionistStory';

describe('Memory System Compatibility', () => {
  let engine: ImpressionistEngine;
  let mockStory: ImpressionistStory;

  beforeEach(() => {
    mockStory = {
      title: 'Memory Test Story',
      author: 'Test',
      blurb: 'A story for testing memory systems.',
      version: '1.0',
      context: 'A story for testing memory systems.',
      
      scenes: [
        {
          id: 'start',
          sketch: 'You begin your journey.',
          leads_to: { next: 'when ready to continue' }
        },
        {
          id: 'end',
          sketch: 'Your journey ends here.'
        }
      ],
      
      endings: [
        {
          id: 'complete',
          when: 'story is finished',
          sketch: 'The story concludes.'
        }
      ],
      
      guidance: 'Test memory functionality.'
    };
  });

  describe('Automatic Memory Creation', () => {
    it('should automatically capture interactions as memories', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeRequestWithUsage: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            narrative: 'You examine the mysterious box. It appears to be made of dark wood.',
            importance: 6
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
        })
      };
      
      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      await engine.processAction({ input: 'I look at the box' });
      
      // Access memory manager to check interaction was stored
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      // Should contain the interaction as a memory
      expect(memoryContext.memories.length).toBeGreaterThan(0);
      expect(memoryContext.memories.some((memory: any) => 
        memory.includes('I look at the box') && memory.includes('dark wood')
      )).toBe(true);
    });

    it('should capture multiple interactions', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeRequestWithUsage: vi.fn().mockImplementation(async (prompt: string) => ({
          content: JSON.stringify({
            narrative: prompt.includes('box') ? 'You see a wooden box.' : 'You move forward.',
            importance: 5
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
        }))
      };
      
      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      await engine.processAction({ input: 'I examine the box' });
      await engine.processAction({ input: 'I walk north' });
      
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      expect(memoryContext.memories.length).toBe(2);
      expect(memoryContext.memories.some((memory: any) => memory.includes('examine the box'))).toBe(true);
      expect(memoryContext.memories.some((memory: any) => memory.includes('walk north'))).toBe(true);
    });
  });

  describe('Memory Compaction', () => {
    it('should trigger compaction after configured interval', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeRequestWithUsage: vi.fn().mockImplementation(async (prompt: string) => {
          // Mock compaction response when compaction is triggered
          if (prompt.includes('compacting memories')) {
            return {
              content: JSON.stringify({
                compactedMemories: [
                  { content: 'Player explored several areas and found items', importance: 7 }
                ]
              }),
              usage: { input_tokens: 200, output_tokens: 100 }
            };
          }
          
          // Regular interaction responses
          return {
            content: JSON.stringify({
              narrative: `You perform action ${Math.floor(Math.random() * 100)}.`,
              importance: 5
            }),
            usage: { input_tokens: 100, output_tokens: 50 }
          };
        })
      };
      
      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      // Trigger multiple actions to reach compaction threshold
      for (let i = 0; i < 6; i++) {
        await engine.processAction({ input: `action ${i}` });
      }
      
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      // Should have memories (possibly compacted)
      expect(memoryContext.totalCount).toBeGreaterThan(0);
    });
  });

  describe('Context Integration', () => {
    it('should include captured memories in LLM context', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeRequestWithUsage: vi.fn().mockImplementation(async (prompt: string) => ({
          content: JSON.stringify({
            narrative: 'You act on your knowledge.',
            importance: 5
          }),
          usage: { input_tokens: prompt.length / 4, output_tokens: 50 }
        }))
      };
      
      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      // First action creates a memory
      await engine.processAction({ input: 'I discover something important' });
      
      // Second action should have access to first memory
      await engine.processAction({ input: 'I use what I learned' });
      
      expect(mockService.makeRequestWithUsage).toHaveBeenCalledTimes(2);
      const [, secondCall] = mockService.makeRequestWithUsage.mock.calls;
      const [secondPrompt] = secondCall;
      
      // The second prompt should include memory from the first interaction
      expect(secondPrompt).toContain('discover something important');
    });
  });

  describe('Memory Persistence Across Scenes', () => {
    it('should maintain memories when transitioning between scenes', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeRequestWithUsage: vi.fn().mockImplementation(async () => ({
          content: JSON.stringify({
            narrative: 'You remember your journey as you continue.',
            importance: 6,
            signals: { scene: 'end' }
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
        }))
      };
      
      engine = new ImpressionistEngine(mockService as any);
      engine.loadStory(mockStory);
      
      // Action in first scene
      await engine.processAction({ input: 'I learn crucial information' });
      
      // Action that triggers scene transition
      await engine.processAction({ input: 'I move to the next area' });
      
      // Check that memories persist across scenes
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      expect(memoryContext.memories.some((memory: any) => 
        memory.includes('crucial information')
      )).toBe(true);
    });
  });
});