/**
 * Tests for LangChain Director
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LangChainDirector } from '@/engine/langChainDirector';
import { DirectorContext } from '@/types/impressionistStory';

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
    mockMultiModelService.makeStructuredRequest = vi.fn().mockResolvedValue({
      data: {
        narrative: "Mock response",
        memories: ["Mock memory"],
        importance: 5,
        signals: {}
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150
      }
    });
    mockMultiModelService.isConfigured = vi.fn().mockReturnValue(true);
    
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

  describe('Configuration', () => {
    it('should check if configured properly', () => {
      expect(director.isConfigured()).toBe(true);
    });

    it('should return error when not configured', async () => {
      mockMultiModelService.isConfigured.mockReturnValue(false);
      
      const result = await director.processInput("test input", mockContext);
      
      expect(result.narrative).toContain("API key required");
      expect(result.signals?.error).toBe("API key not configured");
    });
  });

  describe('Action Processing (No Transition)', () => {
    it('should process action without transition', async () => {
      // Mock structured request response
      const mockResponse = {
        data: {
          narrative: "You examine the room carefully.",
          memories: ["Player looked around"],
          importance: 5,
          signals: {}
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };
      
      mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

      const result = await director.processInput("examine room", mockContext);

      expect(result.narrative).toBe("You examine the room carefully.");
      expect(result.memories).toEqual(["Player looked around"]);
      expect(result.importance).toBe(5);
      expect(result.signals).toEqual({});
    });

    it('should handle structured output errors gracefully', async () => {
      // Test when structured output fails
      mockMultiModelService.makeStructuredRequest.mockRejectedValue(new Error("Schema validation failed"));

      const result = await director.processInput("test", mockContext);

      expect(result.narrative).toBe("Sorry, I had trouble processing that command. Try something else.");
      expect(result.signals?.error).toBe("Schema validation failed");
    });
  });

  describe('Scene Transitions', () => {
    it('should process action and scene transition in sequence', async () => {
      // Mock action response with transition signal
      const actionResponse = {
        data: {
          narrative: "You open the door.",
          memories: ["Player opened door"],
          importance: 6,
          signals: {
            scene: "next_room"
          }
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };

      // Mock transition response
      const transitionResponse = {
        data: {
          narrative: "Light floods through as you step into a bright hallway. The walls gleam with polished marble, and distant echoes suggest vast spaces ahead.",
          memories: ["Entered a bright marble hallway"],
          importance: 6,
          signals: {}
        },
        usage: { input_tokens: 120, output_tokens: 60, total_tokens: 180 }
      };

      mockMultiModelService.makeStructuredRequest
        .mockResolvedValueOnce(actionResponse)  // First call: action
        .mockResolvedValueOnce(transitionResponse);  // Second call: transition

      const callbacks = {
        onActionComplete: vi.fn(),
        onTransitionStart: vi.fn(),
        onTransitionComplete: vi.fn()
      };

      const result = await director.processInputWithTransition(
        "open door", 
        mockContext, 
        callbacks
      );

      // Verify callbacks were called (onActionComplete should NOT be called when there's a transition)
      expect(callbacks.onActionComplete).not.toHaveBeenCalled();
      expect(callbacks.onTransitionStart).toHaveBeenCalledWith("next_room");
      expect(callbacks.onTransitionComplete).toHaveBeenCalled();

      // Verify combined result
      expect(result.narrative).toContain("You open the door");
      expect(result.narrative).toContain("Light floods through");
      expect(result.memories).toContain("Player opened door");
      expect(result.memories).toContain("Entered a bright marble hallway");
      expect(result.signals?.scene).toBe("next_room");

      // Verify two structured requests were made
      expect(mockMultiModelService.makeStructuredRequest).toHaveBeenCalledTimes(2);
    });

    it('should handle transition to unknown scene', async () => {
      const actionResponse = {
        data: {
          narrative: "You try something.",
          memories: [],
          importance: 5,
          signals: {
            scene: "unknown_scene"
          }
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValue(actionResponse);

      const result = await director.processInputWithTransition("test", mockContext);

      expect(result.narrative).toBe("Sorry, I had trouble processing that command. Try something else.");
      expect(result.signals?.error).toContain("Target scene unknown_scene not found");
    });
  });

  describe('Context Building', () => {
    it('should include all context elements in action prompt', async () => {
      const mockResponse = {
        data: {
          narrative: "Test response",
          memories: [],
          importance: 5,
          signals: {}
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };
      
      mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

      await director.processInput("test", mockContext);

      const callArgs = mockMultiModelService.makeStructuredRequest.mock.calls[0];
      const prompt = callArgs[0];
      
      // Verify context elements are included in the prompt
      expect(prompt).toContain("Test story context");
      expect(prompt).toContain("Test guidance");
      expect(prompt).toContain("A simple room with a door");
      expect(prompt).toContain("Keep it simple");
      expect(prompt).toContain("next_room: REQUIRES when player opens door");
      expect(prompt).toContain("Player entered the room");
      expect(prompt).toContain("look around");
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM call failures', async () => {
      mockMultiModelService.makeStructuredRequest.mockRejectedValue(
        new Error("Network error")
      );

      const result = await director.processInput("test", mockContext);

      expect(result.narrative).toBe("Sorry, I had trouble processing that command. Try something else.");
      expect(result.signals?.error).toBe("Network error");
    });

    it('should handle transition chain failures', async () => {
      const actionResponse = {
        data: {
          narrative: "Action succeeded",
          memories: [],
          importance: 5,
          signals: { scene: "next_room" }
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };

      mockMultiModelService.makeStructuredRequest
        .mockResolvedValueOnce(actionResponse)
        .mockRejectedValueOnce(new Error("Transition failed"));

      const result = await director.processInputWithTransition("test", mockContext);

      expect(result.signals?.error).toBe("Transition failed");
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with single-phase processing', async () => {
      const mockResponse = {
        data: {
          narrative: "Single phase response",
          memories: [],
          importance: 5,
          signals: {}
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };
      
      mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

      const result = await director.processInput("test", mockContext);

      expect(result.narrative).toBe("Single phase response");
      expect(mockMultiModelService.makeStructuredRequest).toHaveBeenCalledTimes(1);
    });
  });
});