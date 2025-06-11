import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMDirector } from '@/engine/llmDirector';
import { DirectorContext } from '@/types/impressionistStory';

describe('LLMDirector', () => {
  let director: LLMDirector;
  let mockAnthropicService: any;
  let mockContext: DirectorContext;

  beforeEach(() => {
    mockAnthropicService = {
      isConfigured: () => true,
      makeRequestWithUsage: vi.fn()
    };
    
    director = new LLMDirector(mockAnthropicService);
    
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
        signals: { scene: 'next_scene' }
      });
      
      mockAnthropicService.makeRequestWithUsage.mockResolvedValue({
        content: cleanJson,
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('test input', mockContext);
      
      expect(response.narrative).toBe('Test response');
      expect(response.importance).toBe(5);
      expect(response.signals?.scene).toBe('next_scene');
    });

    it('should extract JSON when LLM adds explanation after', async () => {
      const jsonWithExplanation = `{
  "narrative": "You carefully extract the brass key from its newspaper cocoon.",
  "importance": 7,
  "signals": {
    "discover": "brass_key"
  }
}

The high importance (7) reflects this being a major puzzle-solving moment.`;
      
      mockAnthropicService.makeRequestWithUsage.mockResolvedValue({
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
        signals: {
          scene: 'finale',
          ending: 'victory'
        }
      });
      
      mockAnthropicService.makeRequestWithUsage.mockResolvedValue({
        content: nestedJson + '\n\nThis demonstrates nested signals.',
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('win game', mockContext);
      
      expect(response.narrative).toBe('Complex response');
      expect(response.signals?.scene).toBe('finale');
      expect(response.signals?.ending).toBe('victory');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockAnthropicService.makeRequestWithUsage.mockResolvedValue({
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
      
      mockAnthropicService.makeRequestWithUsage.mockResolvedValue({
        content: incompleteJson,
        usage: { input_tokens: 100, output_tokens: 50 }
      });
      
      const response = await director.processInput('test', mockContext);
      
      expect(response.narrative).toContain('trouble understanding');
      expect(response.signals?.error).toContain('Unmatched braces');
    });
  });
});