/**
 * Tests for Natural Language Condition Evaluation
 * 
 * Tests the impressionist engine's ability to evaluate natural language
 * conditions for scene transitions and endings using LLM reasoning.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistStory } from '@/types/impressionistStory';
import { AnthropicService } from '@/services/anthropicService';

// Mock Anthropic service for predictable testing
const createMockAnthropicService = (mockResponses: Array<{ condition: string; result: boolean; narrative: string }>) => {
  let responseIndex = 0;
  
  return {
    isConfigured: vi.fn().mockReturnValue(true),
    makeRequest: vi.fn().mockImplementation(async (prompt: string) => {
      const response = mockResponses[responseIndex % mockResponses.length];
      responseIndex++;
      
      // Simulate LLM response with signals based on test expectations
      const signals: any = {};
      
      if (response.result) {
        // If condition should be true, include appropriate signals
        if (prompt.includes('ending')) {
          signals.ending = 'test_ending';
        } else if (prompt.includes('scene')) {
          signals.scene = 'next_scene';
        }
      }
      
      return JSON.stringify({
        narrative: response.narrative,
        signals
      });
    }),
    makeRequestWithUsage: vi.fn().mockImplementation(async (prompt: string) => {
      const response = mockResponses[responseIndex % mockResponses.length];
      responseIndex++;
      
      // Simulate LLM response with signals based on test expectations
      const signals: any = {};
      
      if (response.result) {
        // If condition should be true, include appropriate signals
        if (prompt.includes('ending')) {
          signals.ending = 'test_ending';
        } else if (prompt.includes('scene')) {
          signals.scene = 'next_scene';
        }
      }
      
      return {
        content: JSON.stringify({
          narrative: response.narrative,
          signals
        }),
        usage: {
          input_tokens: Math.floor(prompt.length / 4), // Rough estimate
          output_tokens: Math.floor(response.narrative.length / 4)
        }
      };
    })
  } as any;
};

describe('Natural Language Condition Evaluation', () => {
  let engine: ImpressionistEngine;
  let mockStory: ImpressionistStory;

  beforeEach(() => {
    mockStory = {
      title: 'Condition Test Story',
      author: 'Test',
      blurb: 'Testing natural language conditions',
      version: '1.0',
      context: 'A test scenario for evaluating conditions.',
      
      scenes: [
        {
          id: 'start',
          sketch: 'You stand at a crossroads.',
          leads_to: {
            forest: 'when the player goes into the woods',
            town: 'if the player heads toward civilization',
            mountain: 'when the player chooses the upward path'
          }
        },
        {
          id: 'forest',
          sketch: 'Dark trees surround you.'
        },
        {
          id: 'town',
          sketch: 'Buildings come into view.'
        },
        {
          id: 'mountain',
          sketch: 'The path climbs steeply.'
        }
      ],
      
      endings: [
        {
          id: 'peaceful',
          when: 'player finds inner calm',
          sketch: 'A sense of peace washes over you.'
        },
        {
          id: 'adventure',
          when: ['player seeks excitement', 'dangerous path chosen'],
          sketch: 'Your heart races with anticipation.'
        },
        {
          id: 'lost',
          when: 'player becomes confused or disoriented',
          sketch: 'You wander in circles, completely lost.'
        }
      ],
      
      guidance: 'Respond to player actions naturally and evaluate conditions based on narrative context.'
    };
  });

  describe('Scene Transition Conditions', () => {
    it('should evaluate simple spatial movement conditions', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'goes into the woods', result: true, narrative: 'You step into the forest.' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'I walk into the forest' });
      
      expect(response.text).toContain('forest');
      expect(mockService.makeRequestWithUsage).toHaveBeenCalled();
    });

    it('should handle ambiguous movement descriptions', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'heads toward civilization', result: true, narrative: 'You see buildings ahead.' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'I need to find people' });
      
      expect(response.text).toBeDefined();
      expect(mockService.makeRequestWithUsage).toHaveBeenCalled();
    });

    it('should evaluate metaphorical conditions', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'chooses the upward path', result: true, narrative: 'You begin climbing.' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'I want to challenge myself and climb higher' });
      
      expect(response.text).toBeDefined();
      expect(mockService.makeRequestWithUsage).toHaveBeenCalled();
    });
  });

  describe('Ending Condition Evaluation', () => {
    it('should recognize emotional state conditions', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'finds inner calm', result: true, narrative: 'Peace fills your heart.' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'I sit quietly and meditate' });
      
      expect(response.text).toBeDefined();
      expect(mockService.makeRequestWithUsage).toHaveBeenCalled();
    });

    it('should handle multiple condition arrays', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'seeks excitement', result: true, narrative: 'Adventure awaits!' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'I want danger and excitement!' });
      
      expect(response.text).toBeDefined();
      expect(mockService.makeRequestWithUsage).toHaveBeenCalled();
    });

    it('should evaluate complex behavioral conditions', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'becomes confused or disoriented', result: true, narrative: 'Everything looks the same.' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'Where am I? Nothing makes sense anymore!' });
      
      expect(response.text).toBeDefined();
      expect(mockService.makeRequestWithUsage).toHaveBeenCalled();
    });
  });

  describe('Context-Aware Evaluation', () => {
    it('should consider previous actions in condition evaluation', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'normal action', result: false, narrative: 'You continue on.' },
        { condition: 'finds inner calm', result: true, narrative: 'After your earlier meditation, peace comes easily.' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // First action - should not trigger calm ending
      await engine.processAction({ input: 'I look around' });
      
      // Second action - should trigger calm ending due to context
      const response = await engine.processAction({ input: 'I continue my meditation practice' });
      
      expect(response.text).toBeDefined();
      expect(mockService.makeRequestWithUsage).toHaveBeenCalledTimes(2);
    });

    it('should use scene context in condition evaluation', async () => {
      // Load story and advance to forest scene first
      const mockService = createMockAnthropicService([
        { condition: 'goes into woods', result: true, narrative: 'You enter the dark forest.' },
        { condition: 'becomes confused', result: true, narrative: 'The trees all look the same.' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      // Move to forest
      await engine.processAction({ input: 'I go into the forest' });
      
      // Being lost should be more likely in forest context
      const response = await engine.processAction({ input: 'I try to find my way' });
      
      expect(response.text).toBeDefined();
      expect(mockService.makeRequestWithUsage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle conditions with no clear mapping', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'unclear', result: false, narrative: 'Nothing particular happens.' }
      ]);
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'banana telephone purple' });
      
      expect(response.text).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it('should gracefully handle LLM service errors', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeRequestWithUsage: vi.fn().mockRejectedValue(new Error('API Error'))
      } as any;
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'I do something' });
      
      expect(response.error).toBeDefined();
      expect(response.text).toContain('trouble understanding');
    });

    it('should handle malformed LLM responses', async () => {
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeRequestWithUsage: vi.fn().mockResolvedValue({ content: 'invalid json{', usage: { input_tokens: 10, output_tokens: 5 } })
      } as any;
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      const response = await engine.processAction({ input: 'I do something' });
      
      // With JSON fallback to text parsing, malformed responses should still work
      expect(response.text).toBeDefined();
      expect(response.text).toContain('invalid json{'); // Falls back to treating as text
    });
  });

  describe('Performance and Token Efficiency', () => {
    it('should keep context prompts concise', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'test', result: false, narrative: 'Test response.' }
      ]);
      
      // Spy on the actual prompt sent
      const makeRequestSpy = vi.spyOn(mockService, 'makeRequestWithUsage');
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      await engine.processAction({ input: 'I test the system' });
      
      // Check that the prompt is not excessively long
      expect(makeRequestSpy).toHaveBeenCalled();
      const [prompt] = makeRequestSpy.mock.calls[0];
      expect(prompt.length).toBeLessThan(3000); // Reasonable context limit
    });

    it('should include essential context elements', async () => {
      const mockService = createMockAnthropicService([
        { condition: 'test', result: false, narrative: 'Test response.' }
      ]);
      
      const makeRequestSpy = vi.spyOn(mockService, 'makeRequestWithUsage');
      
      engine = new ImpressionistEngine(mockService);
      engine.loadStory(mockStory);
      
      await engine.processAction({ input: 'I test the system' });
      
      expect(makeRequestSpy).toHaveBeenCalled();
      const [prompt] = makeRequestSpy.mock.calls[0];
      
      // Verify essential context is included
      expect(prompt).toContain(mockStory.context);
      expect(prompt).toContain(mockStory.guidance);
      expect(prompt).toContain('crossroads'); // Current scene
    });
  });
});