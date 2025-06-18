import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionClassifier, ClassificationContext } from '@/engine/actionClassifier';

// Mock MultiModelService
vi.mock('@/services/multiModelService');

describe('ActionClassifier', () => {
  let classifier: ActionClassifier;
  let mockMultiModelService: any;

  beforeEach(() => {
    mockMultiModelService = {
      isConfigured: vi.fn().mockReturnValue(true),
      makeStructuredRequest: vi.fn()
    };
    
    classifier = new ActionClassifier(mockMultiModelService);
    vi.clearAllMocks();
  });

  describe('Context Building', () => {
    it('should build prompt with all context fields including conversation history', async () => {
      const context: ClassificationContext = {
        playerAction: 'open the door',
        currentSceneTransitions: [
          { id: 'hallway', condition: 'when player opens door' },
          { id: 'window', condition: 'when player looks through window' }
        ],
        availableEndings: {
          globalConditions: ['player has key'],
          variations: [
            { id: 'escape', conditions: ['door is open'] }
          ]
        },
        recentMemories: ['Found a key', 'Door is locked'],
        recentInteractions: [
          { playerInput: 'examine room', llmResponse: 'You see a locked door and a window.' },
          { playerInput: 'take key', llmResponse: 'You pick up the rusty key.' }
        ],
        activeMemory: ['Has rusty key', 'Door is locked', 'Window is sealed'],
        currentState: {
          sceneSketch: 'room',
          isEnded: false
        }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'T0', reasoning: 'Player opened door with key' },
        usage: { input_tokens: 100, output_tokens: 20 }
      });

      await classifier.classify(context);

      // Verify the prompt includes all context sections
      const promptCall = mockMultiModelService.makeStructuredRequest.mock.calls[0];
      const prompt = promptCall[0];

      // Check for main sections
      expect(prompt).toContain('**TASK:** Evaluate player action against current scene state');
      expect(prompt).toContain('**SCENE:**');
      expect(prompt).toContain('room'); // Scene sketch content
      
      // Check for conversation history
      expect(prompt).toContain('**Recent Dialogue:**');
      expect(prompt).toContain('Player: examine room');
      expect(prompt).toContain('Response: You see a locked door and a window.');
      expect(prompt).toContain('Player: take key');
      expect(prompt).toContain('Response: You pick up the rusty key.');
      
      // Check for memories
      expect(prompt).toContain('**Memories:**');
      expect(prompt).toContain('- Has rusty key');
      expect(prompt).toContain('- Door is locked');
      expect(prompt).toContain('- Window is sealed');
      
      // Check for transitions in new format
      expect(prompt).toContain('**TRANSITIONS:**');
      expect(prompt).toContain('**T0:**');
      expect(prompt).toContain('**PREREQUISITES:**');
      expect(prompt).toContain('`when player opens door`');
      expect(prompt).toContain('`when player looks through window`');
      expect(prompt).toContain('`player has key AND door is open`');
      
      // Check for input action
      expect(prompt).toContain('**ACTION:**');
      expect(prompt).toContain('`open the door`');
      
      // Check for evaluation rules
      expect(prompt).toContain('**EVALUATION RULES:**');
      expect(prompt).toContain('**RESPONSE FORMAT:**');
    });

    it('should handle missing recentInteractions gracefully', async () => {
      const context: ClassificationContext = {
        playerAction: 'look around',
        currentSceneTransitions: [],
        recentMemories: ['In a room'],
        // No recentInteractions or activeMemory
        currentState: {
          sceneSketch: 'room',
          isEnded: false
        }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'continue', reasoning: 'No transitions available' },
        usage: { input_tokens: 50, output_tokens: 10 }
      });

      await classifier.classify(context);

      const prompt = mockMultiModelService.makeStructuredRequest.mock.calls[0][0];
      
      // Should use recentMemories as fallback
      expect(prompt).toContain('**Memories:**');
      expect(prompt).toContain('- In a room');
      expect(prompt).not.toContain('**Recent Dialogue:**');
    });

    it('should show "None" when no memories are available', async () => {
      const context: ClassificationContext = {
        playerAction: 'start',
        currentSceneTransitions: [],
        recentMemories: [],
        currentState: {
          sceneSketch: 'intro',
          isEnded: false
        }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'continue', reasoning: 'Starting game' },
        usage: { input_tokens: 30, output_tokens: 10 }
      });

      await classifier.classify(context);

      const prompt = mockMultiModelService.makeStructuredRequest.mock.calls[0][0];
      expect(prompt).toContain('**Memories:**\n- None');
    });
  });

  describe('Format Conversion', () => {
    it('should convert "continue" to action mode', async () => {
      const context: ClassificationContext = {
        playerAction: 'look at painting',
        currentSceneTransitions: [{ id: 'next', condition: 'when door opens' }],
        recentMemories: [],
        currentState: { sceneSketch: 'gallery', isEnded: false }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'continue', reasoning: 'Just examining environment' },
        usage: { input_tokens: 50, output_tokens: 10 }
      });

      const result = await classifier.classify(context);

      expect(result.mode).toBe('action');
      expect(result.targetId).toBeUndefined();
      expect(result.reasoning).toBe('Just examining environment');
      expect(result.confidence).toBe(0.9);
    });

    it('should convert T0 to sceneTransition with correct ID', async () => {
      const context: ClassificationContext = {
        playerAction: 'open door',
        currentSceneTransitions: [
          { id: 'hallway', condition: 'door opens' },
          { id: 'cellar', condition: 'trapdoor opens' }
        ],
        recentMemories: [],
        currentState: { sceneSketch: 'room', isEnded: false }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'T0', reasoning: 'Door opened' },
        usage: { input_tokens: 60, output_tokens: 10 }
      });

      const result = await classifier.classify(context);

      expect(result.mode).toBe('sceneTransition');
      expect(result.targetId).toBe('hallway');
      expect(result.reasoning).toBe('Door opened');
      expect(result.confidence).toBe(0.95);
    });

    it('should convert T2 to ending when it references an ending', async () => {
      const context: ClassificationContext = {
        playerAction: 'escape through door',
        currentSceneTransitions: [
          { id: 'hallway', condition: 'door opens' }
        ],
        availableEndings: {
          globalConditions: ['has key'],
          variations: [
            { id: 'freedom', conditions: ['door is open'] }
          ]
        },
        recentMemories: ['Has key'],
        currentState: { sceneSketch: 'room', isEnded: false }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'T1', reasoning: 'Escaped to freedom' },
        usage: { input_tokens: 80, output_tokens: 15 }
      });

      const result = await classifier.classify(context);

      expect(result.mode).toBe('ending');
      expect(result.targetId).toBe('freedom');
      expect(result.reasoning).toBe('Escaped to freedom');
    });

    it('should handle invalid T-index gracefully with retries', async () => {
      const context: ClassificationContext = {
        playerAction: 'do something',
        currentSceneTransitions: [{ id: 'only', condition: 'condition' }],
        recentMemories: [],
        currentState: { sceneSketch: 'room', isEnded: false }
      };

      // First attempt fails with invalid index
      mockMultiModelService.makeStructuredRequest
        .mockResolvedValueOnce({
          data: { result: 'T5', reasoning: 'Invalid index' },
          usage: { input_tokens: 40, output_tokens: 10 }
        })
        .mockResolvedValueOnce({
          data: { result: 'continue', reasoning: 'Corrected response' },
          usage: { input_tokens: 50, output_tokens: 12 }
        });

      const result = await classifier.classify(context);

      expect(mockMultiModelService.makeStructuredRequest).toHaveBeenCalledTimes(2);
      expect(result.mode).toBe('action');
      expect(result.reasoning).toBe('Corrected response');
    });
  });

  describe('Validation and Retry', () => {
    it('should retry when scene transition ID is invalid', async () => {
      const context: ClassificationContext = {
        playerAction: 'go north',
        currentSceneTransitions: [
          { id: 'south', condition: 'go south' },
          { id: 'east', condition: 'go east' }
        ],
        recentMemories: [],
        currentState: { sceneSketch: 'crossroads', isEnded: false }
      };

      // First attempt returns invalid transition
      mockMultiModelService.makeStructuredRequest
        .mockResolvedValueOnce({
          data: { result: 'T2', reasoning: 'Going north (invalid)' },
          usage: { input_tokens: 60, output_tokens: 10 }
        })
        .mockResolvedValueOnce({
          data: { result: 'continue', reasoning: 'No north exit' },
          usage: { input_tokens: 80, output_tokens: 12 }
        });

      const result = await classifier.classify(context);

      expect(mockMultiModelService.makeStructuredRequest).toHaveBeenCalledTimes(2);
      expect(result.mode).toBe('action');
      expect(result.reasoning).toBe('No north exit');
      
      // Check retry prompt includes error feedback
      const retryPrompt = mockMultiModelService.makeStructuredRequest.mock.calls[1][0];
      expect(retryPrompt).toContain('**RETRY NOTES:**');
    });

    it('should fall back to action mode after max retries', async () => {
      const context: ClassificationContext = {
        playerAction: 'use magic',
        currentSceneTransitions: [{ id: 'portal', condition: 'cast spell' }],
        recentMemories: [],
        currentState: { sceneSketch: 'chamber', isEnded: false }
      };

      // All attempts fail
      for (let i = 0; i < 3; i++) {
        mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
          data: { result: 'T99', reasoning: `Invalid attempt ${i + 1}` },
          usage: { input_tokens: 60 + i * 20, output_tokens: 10 }
        });
      }

      const result = await classifier.classify(context);

      expect(mockMultiModelService.makeStructuredRequest).toHaveBeenCalledTimes(3);
      expect(result.mode).toBe('action');
      expect(result.reasoning).toContain('Fallback to action mode');
      expect(result.confidence).toBe(0.1);
    });
  });

  describe('Error Handling', () => {
    it('should handle unconfigured MultiModelService', async () => {
      mockMultiModelService.isConfigured.mockReturnValue(false);

      const context: ClassificationContext = {
        playerAction: 'test',
        currentSceneTransitions: [],
        recentMemories: [],
        currentState: { sceneSketch: 'test', isEnded: false }
      };

      const result = await classifier.classify(context);

      expect(result.mode).toBe('action');
      expect(result.reasoning).toContain('MultiModelService not configured');
      expect(result.confidence).toBe(0.1);
      expect(mockMultiModelService.makeStructuredRequest).not.toHaveBeenCalled();
    });

    it('should handle API errors with retry', async () => {
      const context: ClassificationContext = {
        playerAction: 'move forward',
        currentSceneTransitions: [],
        recentMemories: [],
        currentState: { sceneSketch: 'path', isEnded: false }
      };

      // First attempt throws error
      mockMultiModelService.makeStructuredRequest
        .mockRejectedValueOnce(new Error('API timeout'));

      // Retry succeeds
      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'continue', reasoning: 'Moving forward' },
        usage: { input_tokens: 50, output_tokens: 10 }
      });

      const result = await classifier.classify(context);

      expect(mockMultiModelService.makeStructuredRequest).toHaveBeenCalledTimes(2);
      expect(result.mode).toBe('action');
      expect(result.reasoning).toBe('Moving forward');
    });
  });

  describe('Transition Building', () => {
    it('should combine scene and ending transitions with proper indexing', async () => {
      const context: ClassificationContext = {
        playerAction: 'final action',
        currentSceneTransitions: [
          { id: 'scene1', condition: 'condition 1' },
          { id: 'scene2', condition: 'condition 2' }
        ],
        availableEndings: {
          globalConditions: ['game complete'],
          variations: [
            { id: 'good', conditions: ['helped everyone'] },
            { id: 'bad', conditions: ['hurt someone'] }
          ]
        },
        recentMemories: [],
        currentState: { sceneSketch: 'final', isEnded: false }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'continue', reasoning: 'Not ready' },
        usage: { input_tokens: 100, output_tokens: 15 }
      });

      await classifier.classify(context);

      const prompt = mockMultiModelService.makeStructuredRequest.mock.calls[0][0];
      
      // Check transitions are properly indexed in new format
      expect(prompt).toContain('**T0:**');
      expect(prompt).toContain('`condition 1`');
      expect(prompt).toContain('**T1:**');
      expect(prompt).toContain('`condition 2`');
      expect(prompt).toContain('**T2:**');
      expect(prompt).toContain('`game complete AND helped everyone`');
      expect(prompt).toContain('**T3:**');
      expect(prompt).toContain('`game complete AND hurt someone`');
    });

    it('should handle empty transitions gracefully', async () => {
      const context: ClassificationContext = {
        playerAction: 'wait',
        currentSceneTransitions: [],
        availableEndings: undefined,
        recentMemories: [],
        currentState: { sceneSketch: 'void', isEnded: false }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValueOnce({
        data: { result: 'continue', reasoning: 'Nothing to do' },
        usage: { input_tokens: 30, output_tokens: 10 }
      });

      await classifier.classify(context);

      const prompt = mockMultiModelService.makeStructuredRequest.mock.calls[0][0];
      expect(prompt).toContain('**T0:** None available');
    });
  });
});