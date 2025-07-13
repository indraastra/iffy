/**
 * Tests for LangChain Director
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LangChainDirector } from '@/engine/langChainDirector';
import { DirectorContext, DirectorResponse } from '@/types/impressionistStory';

// Mock the ActionClassifier module
const mockClassify = vi.fn();
const mockSetDebugPane = vi.fn();

vi.mock('@/engine/actionClassifier', () => ({
  ActionClassifier: vi.fn().mockImplementation(() => ({
    classify: mockClassify,
    setDebugPane: mockSetDebugPane
  }))
}));

// Mock MultiModelService
const mockMultiModelService = {
  isConfigured: vi.fn(),
  createChain: vi.fn(),
  executeChain: vi.fn(),
  makeStructuredRequest: vi.fn()
};

describe('LangChainDirector', () => {
  let director: LangChainDirector;
  let mockContext: DirectorContext;

  beforeEach(() => {
    // Setup chain mocks - need to reset on each test
    const mockChain = { call: vi.fn() };
    mockMultiModelService.createChain = vi.fn().mockReturnValue(mockChain);
    mockMultiModelService.executeChain = vi.fn();
    
    // Default mock setup - will be overridden in specific tests
    mockMultiModelService.makeStructuredRequest = vi.fn();
    mockMultiModelService.isConfigured = vi.fn().mockReturnValue(true);
    
    // Reset ActionClassifier mock to default action mode
    mockClassify.mockResolvedValue({
      mode: 'action',
      reasoning: 'Default action mode',
      confidence: 0.95
    });
    mockSetDebugPane.mockClear();
    
    director = new LangChainDirector(mockMultiModelService as any, {
      debugMode: false
    });

    mockContext = {
      storyContext: "Test story context",
      guidance: "Test guidance",
      currentSketch: "A simple room with a door",
      sceneGuidance: "Keep it simple",
      currentTransitions: {
        next_room: {
          condition: "when player opens door",
          sketch: "A bright hallway stretches ahead"
        }
      },
      activeMemory: ["Player entered the room"],
      recentInteractions: [
        {
          playerInput: "look around",
          llmResponse: "You see a simple room",
          timestamp: new Date(),
          sceneId: "test_scene",
          importance: 5
        }
      ]
    };

    vi.clearAllMocks();
  });

  // Helper function to set up ActionClassifier + Director mock sequence
  function setupMockSequence(classifierMode: 'action' | 'sceneTransition' | 'ending', targetId?: string, directorResponse?: any) {
    // Mock ActionClassifier response
    mockClassify.mockResolvedValueOnce({
      mode: classifierMode,
      targetId,
      reasoning: `Test classification: ${classifierMode}`,
      confidence: 0.9
    });

    const defaultDirectorResponse = {
      data: {
        narrativeParts: ["Mock response"],
        memories: ["Mock memory"],
        importance: 5,
        signals: {}
      },
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
    };

    // Mock Director response (only one call now)
    mockMultiModelService.makeStructuredRequest
      .mockResolvedValueOnce(directorResponse || defaultDirectorResponse);
  }

  // Helper function to get response from new flag-based method
  async function collectStreamingResponses(
    input: string, 
    context: DirectorContext
  ): Promise<DirectorResponse> {
    // Initialize flag system for tests
    const mockStory = {
      title: 'Test Story',
      flags: {
        test_flag: false
      }
    };
    director.initializeFlags(mockStory as any);
    
    // Call the new non-streaming method
    const response = await director.processInputStreaming(context, input);
    return response;
    
    if (responses.length === 1) {
      // For single responses that had an invalid scene transition or ending, clean up the signals
      const response = responses[0];
      const cleanedSignals = { ...response.signals };
      let needsCleaning = false;
      
      if (response.signals?.scene && !mockContext.currentTransitions?.[response.signals.scene]) {
        delete cleanedSignals.scene;
        needsCleaning = true;
      }
      
      if (response.signals?.ending && (!mockContext.availableEndings || 
          !mockContext.availableEndings.variations.find(e => e.id === response.signals!.ending))) {
        delete cleanedSignals.ending;
        needsCleaning = true;
      }
      
      if (needsCleaning) {
        return {
          ...response,
          signals: cleanedSignals
        };
      }
      return response;
    }
    
    // Combine multiple responses (action + transition)
    const [actionResponse, transitionResponse] = responses;
    return {
      narrative: `${actionResponse.narrative}\n\n${transitionResponse.narrative}`,
      memories: [...(actionResponse.memories || []), ...(transitionResponse.memories || [])],
      importance: Math.max(actionResponse.importance || 5, transitionResponse.importance || 5),
      signals: {
        ...actionResponse.signals,
        ...transitionResponse.signals
      }
    };
  }

  describe('Configuration', () => {
    it('should check if configured properly', () => {
      expect(director.isConfigured()).toBe(true);
    });

    it('should return error when not configured', async () => {
      mockMultiModelService.isConfigured.mockReturnValue(false);
      setupMockSequence('action'); // This won't be reached due to isConfigured check
      
      const result = await collectStreamingResponses("test input", mockContext);
      
      expect(Array.isArray(result.narrative) ? result.narrative.join(' ') : result.narrative).toContain("API key required");
      expect(result.signals?.error).toBe("API key not configured");
    });
  });

  describe('Action Processing (No Transition)', () => {
    it('should process action without transition', async () => {
      const mockDirectorResponse = {
        data: {
          narrativeParts: ["You examine the room carefully."],
          memories: ["Player looked around"],
          importance: 5,
          signals: {}
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };
      
      setupMockSequence('action', undefined, mockDirectorResponse);

      const result = await collectStreamingResponses("examine room", mockContext);

      expect(result.narrative).toEqual(["You examine the room carefully."]);
      expect(result.memories).toEqual(["Player looked around"]);
      expect(result.importance).toBe(5);
      expect(result.signals).toEqual({});
    });

    it('should handle structured output errors gracefully', async () => {
      // Test when structured output fails - classifier call fails
      mockMultiModelService.makeStructuredRequest.mockRejectedValue(new Error("Schema validation failed"));

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["Sorry, I had trouble processing that command. Try something else."]);
      expect(result.signals?.error).toBe("Schema validation failed");
    });
  });

  describe('Scene Transitions', () => {
    it('should process scene transition directly with ActionClassifier', async () => {
      // Mock ActionClassifier to return sceneTransition mode
      mockClassify.mockResolvedValueOnce({
        mode: 'sceneTransition',
        targetId: 'next_room',
        reasoning: 'Player opened door condition met',
        confidence: 0.95
      });

      // Mock single transition response (incorporates player action)
      const transitionResponse = {
        data: {
          narrativeParts: ["You push open the heavy door and step through. Light floods in as you enter a bright hallway.", "The walls gleam with polished marble, and distant echoes suggest vast spaces ahead."],
          memories: ["Player opened door", "Entered a bright marble hallway"],
          importance: 6,
          signals: {}
        },
        usage: { input_tokens: 120, output_tokens: 80, total_tokens: 200 }
      };

      mockMultiModelService.makeStructuredRequest
        .mockResolvedValueOnce(transitionResponse);  // Only one call now

      const result = await collectStreamingResponses("open door", mockContext);

      // Verify single integrated response
      const narrativeText = Array.isArray(result.narrative) ? result.narrative.join(' ') : result.narrative;
      expect(narrativeText).toContain("You push open the heavy door");
      expect(narrativeText).toContain("Light floods in");
      expect(result.memories).toContain("Player opened door");
      expect(result.memories).toContain("Entered a bright marble hallway");
      expect(result.signals?.scene).toBe("next_room");

      // Verify only one structured request was made (ActionClassifier + transition)
      expect(mockMultiModelService.makeStructuredRequest).toHaveBeenCalledTimes(1);
    });

    it('should gracefully ignore transition to unknown scene', async () => {
      const actionResponse = {
        data: {
          narrativeParts: ["You try something."],
          memories: [],
          importance: 5,
          signals: {
            scene: "unknown_scene"
          }
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValue(actionResponse);

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["You try something."]);
      expect(result.signals).toEqual({});
    });

    it('should gracefully ignore invalid ending signals', async () => {
      const actionResponse = {
        data: {
          narrativeParts: ["You trigger something."],
          memories: [],
          importance: 5,
          signals: {
            ending: "null"
          }
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValue(actionResponse);

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["You trigger something."]);
      expect(result.signals).toEqual({});
    });

    it('should gracefully ignore "none" signals', async () => {
      const actionResponse = {
        data: {
          narrativeParts: ["You do something else."],
          memories: [],
          importance: 5,
          signals: {
            ending: "none",
            scene: "none"
          }
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValue(actionResponse);

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["You do something else."]);
      expect(result.signals).toEqual({});
    });
  });

  describe('Context Building', () => {
    it('should include all context elements in action prompt', async () => {
      // Setup ActionClassifier to return action mode
      mockClassify.mockResolvedValueOnce({
        mode: 'action',
        reasoning: 'Regular action',
        confidence: 0.95
      });

      const mockResponse = {
        data: {
          narrativeParts: ["Test response"],
          memories: [],
          importance: 5,
          signals: {}
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };
      
      mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

      await collectStreamingResponses("test", mockContext);

      const callArgs = mockMultiModelService.makeStructuredRequest.mock.calls[0];
      const prompt = callArgs[0];
      
      // Verify context elements are included in the prompt (action processing uses simplified context)
      expect(prompt).toContain("Test story context");
      expect(prompt).toContain("Test guidance");
      expect(prompt).toContain("A simple room with a door");
      expect(prompt).toContain("Keep it simple");
      expect(prompt).toContain("Player entered the room");
      expect(prompt).toContain("look around");
      // Note: Transitions are NOT included in action processing prompts (handled by ActionClassifier)
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM call failures', async () => {
      mockMultiModelService.makeStructuredRequest.mockRejectedValue(
        new Error("Network error")
      );

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["Sorry, I had trouble processing that command. Try something else."]);
      expect(result.signals?.error).toBe("Network error");
    });

    it('should handle transition chain failures', async () => {
      // Mock ActionClassifier to return sceneTransition mode
      mockClassify.mockResolvedValueOnce({
        mode: 'sceneTransition',
        targetId: 'next_room',
        reasoning: 'Transition condition met',
        confidence: 0.95
      });

      // Mock the transition processing to fail
      mockMultiModelService.makeStructuredRequest
        .mockRejectedValueOnce(new Error("Transition failed"));

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["Sorry, I had trouble processing that command. Try something else."]);
      expect(result.signals?.error).toBe("Transition failed");
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with single-phase processing', async () => {
      const mockResponse = {
        data: {
          narrativeParts: ["Single phase response"],
          memories: [],
          importance: 5,
          signals: {}
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };
      
      mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["Single phase response"]);
      expect(mockMultiModelService.makeStructuredRequest).toHaveBeenCalledTimes(1);
    });
  });
});