import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMDirector } from '@/engine/llmDirector';
import { DirectorContext } from '@/types/impressionistStory';

describe('LLMDirector', () => {
  let director: LLMDirector;
  let mockMultiModelService: any;
  let mockContext: DirectorContext;

  beforeEach(() => {
    mockMultiModelService = {
      isConfigured: () => true,
      makeRequestWithUsage: vi.fn()
    };
    
    director = new LLMDirector(mockMultiModelService);
    
    mockContext = {
      storyContext: 'Test story context',
      currentSketch: 'Test scene sketch',
      recentInteractions: [],
      activeMemory: [],
      guidance: 'Test guidance'
    };
  });

  describe('JSON response parsing', () => {
    it('should parse clean JSON response', async () => {
      const cleanJson = JSON.stringify({
        narrative: 'Test response',
        importance: 5,
        reasoning: 'Test reasoning',
        signals: { transition: 'scene:next_scene' }
      });
      
      mockMultiModelService.makeRequestWithUsage.mockResolvedValue({
        content: cleanJson,
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('test input', mockContext);
      
      expect(response.narrative).toBe('Test response');
      expect(response.importance).toBe(5);
      expect(response.signals?.scene).toBe('next_scene');
    });

    it('should parse memories from JSON response', async () => {
      const jsonWithMemories = JSON.stringify({
        narrative: 'You find a key and unlock the door.',
        importance: 7,
        reasoning: 'Player discovered key and progressed',
        memories: ['Player found brass key', 'Door was unlocked', 'Room is now accessible']
      });
      
      mockMultiModelService.makeRequestWithUsage.mockResolvedValue({
        content: jsonWithMemories,
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('take key', mockContext);
      
      expect(response.narrative).toBe('You find a key and unlock the door.');
      expect(response.importance).toBe(7);
      expect(response.memories).toEqual(['Player found brass key', 'Door was unlocked', 'Room is now accessible']);
    });

    it('should handle empty or invalid memories array', async () => {
      const jsonWithEmptyMemories = JSON.stringify({
        narrative: 'Nothing significant happens.',
        importance: 2,
        reasoning: 'Routine action',
        memories: []
      });
      
      mockMultiModelService.makeRequestWithUsage.mockResolvedValue({
        content: jsonWithEmptyMemories,
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('look around', mockContext);
      
      expect(response.narrative).toBe('Nothing significant happens.');
      expect(response.memories).toBeUndefined(); // Empty arrays should become undefined
    });

    it('should extract JSON when LLM adds explanation after', async () => {
      const jsonWithExplanation = `{
  "narrative": "You carefully extract the brass key from its newspaper cocoon.",
  "importance": 7,
  "reasoning": "This is a key moment in the puzzle",
  "signals": {
    "discover": "brass_key"
  }
}

The high importance (7) reflects this being a major puzzle-solving moment.`;
      
      mockMultiModelService.makeRequestWithUsage.mockResolvedValue({
        content: jsonWithExplanation,
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('take key', mockContext);
      
      expect(response.narrative).toBe('You carefully extract the brass key from its newspaper cocoon.');
      expect(response.importance).toBe(7);
      expect(response.signals?.discover).toBe('brass_key');
    });

    it('should handle nested objects in JSON', async () => {
      const nestedJson = JSON.stringify({
        narrative: 'Complex response',
        importance: 8,
        reasoning: 'Time for the finale!',
        signals: {
          transition: 'scene:finale',
          discover: 'secret'
        }
      });
      
      mockMultiModelService.makeRequestWithUsage.mockResolvedValue({
        content: nestedJson + '\n\nThis demonstrates nested signals.',
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('win game', mockContext);
      
      expect(response.narrative).toBe('Complex response');
      expect(response.signals?.scene).toBe('finale');
      expect(response.signals?.discover).toBe('secret');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockMultiModelService.makeRequestWithUsage.mockResolvedValue({
        content: 'This is not JSON at all',
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('test', mockContext);
      
      expect(response.narrative).toContain('trouble understanding');
      expect(response.signals?.error).toBeDefined();
    });

    it('should handle incomplete JSON', async () => {
      const incompleteJson = `{
  "narrative": "Test response",
  "importance": 5`;
      
      mockMultiModelService.makeRequestWithUsage.mockResolvedValue({
        content: incompleteJson,
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('test', mockContext);
      
      expect(response.narrative).toContain('trouble understanding');
      expect(response.signals?.error).toContain('Unmatched braces');
    });
  });
});