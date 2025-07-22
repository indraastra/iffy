/**
 * Tests for LangChain Director
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LangChainDirector } from '@/engine/langChainDirector';
import { DirectorContext, DirectorResponse } from '@/types/impressionistStory';

// Mock the FlagManager module
const mockFlagManager = {
  getAllFlags: vi.fn(),
  getStoryFlags: vi.fn(),
  checkConditions: vi.fn(),
  applyChanges: vi.fn(),
  setLocationFlag: vi.fn(),
  clearLocationFlags: vi.fn(),
  getDebugString: vi.fn(),
  generateFlagProgressionGuidance: vi.fn().mockReturnValue(''),
  generateFlagStateSection: vi.fn().mockReturnValue(''),
  generateFlagContext: vi.fn().mockReturnValue(''),
  generateFlagManagementInstructions: vi.fn().mockReturnValue('')
};

vi.mock('@/engine/FlagManager', () => ({
  FlagManager: vi.fn().mockImplementation(() => mockFlagManager)
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
    // Default mock setup
    mockMultiModelService.makeStructuredRequest = vi.fn();
    mockMultiModelService.isConfigured = vi.fn().mockReturnValue(true);
    
    // Reset FlagManager mock to default state
    mockFlagManager.getAllFlags.mockReturnValue({});
    mockFlagManager.getStoryFlags.mockReturnValue({});
    mockFlagManager.checkConditions.mockReturnValue(false);
    mockFlagManager.getDebugString.mockReturnValue('');
    mockFlagManager.generateFlagProgressionGuidance.mockReturnValue('');
    
    director = new LangChainDirector(mockMultiModelService as any, {
      debugMode: false
    });
    
    // Initialize the flag manager
    director.initializeFlags({ flags: {} } as any);

    mockContext = {
      storyContext: "Test story context",
      guidance: "Test guidance",
      currentSketch: "A simple room with a door",
      sceneGuidance: "Keep it simple",
      currentTransitions: {
        next_room: {
          condition: "door_opened",
          sketch: "A brighter room beyond the door"
        }
      },
      availableEndings: {
        variations: [
          {
            id: "test_ending",
            requires: { all_of: ["ending_flag"] },
            sketch: "The test ends here"
          }
        ]
      },
      recentInteractions: [],
      activeMemory: ["Test memory"],
      narrative: {
        voice: "Clear and direct",
        tone: "Descriptive",
        themes: ["exploration"]
      }
    };
  });

  // Helper function to simulate streaming response collection
  async function collectStreamingResponses(input: string, context: DirectorContext): Promise<DirectorResponse> {
    return await director.processInputStreaming(context, input);
  }

  describe('Action Processing (No Transition)', () => {
    it('should process basic action with narrative response', async () => {
      const mockResponse = {
        data: {
          narrativeParts: ["You examine the room carefully."],
          memories: ["Player looked around"],
          importance: 5,
          flagChanges: {
            set: [],
            unset: []
          }
        },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

      const result = await collectStreamingResponses("examine room", mockContext);

      expect(result.narrative).toEqual(["You examine the room carefully."]);
      expect(result.memories).toEqual(["Player looked around"]);
      expect(result.importance).toBe(5);
      expect(result.signals).toEqual({});
    });

    it('should handle structured output errors gracefully', async () => {
      // Test when structured output fails - LLM call fails
      mockMultiModelService.makeStructuredRequest.mockRejectedValue(new Error("Schema validation failed"));

      try {
        await collectStreamingResponses("test", mockContext);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Schema validation failed");
      }
    });
  });

  describe('Scene Transitions', () => {
    it('should process scene transition when flag conditions are met', async () => {
      // Mock flag manager to return true for transition condition
      mockFlagManager.checkConditions.mockReturnValueOnce(true);
      
      // Mock initial action response
      const actionResponse = {
        data: {
          narrativeParts: ["You push open the heavy door."],
          memories: ["Player opened door"],
          importance: 6,
          flagChanges: {
            set: ['door_opened'],
            unset: []
          }
        }
      };
      
      // Mock transition response
      const transitionResponse = {
        data: {
          narrativeParts: ["Light floods in as you enter a bright hallway.", "The walls gleam with polished marble, and distant echoes suggest vast spaces ahead."],
          memories: ["Entered a bright marble hallway"],
          importance: 6,
          flagChanges: {
            set: [],
            unset: []
          }
        }
      };

      mockMultiModelService.makeStructuredRequest
        .mockResolvedValueOnce(actionResponse)
        .mockResolvedValueOnce(transitionResponse);

      const result = await collectStreamingResponses("open door", mockContext);

      expect(result.narrative).toEqual(["Light floods in as you enter a bright hallway.", "The walls gleam with polished marble, and distant echoes suggest vast spaces ahead."]);
      expect(result.memories).toContain("Entered a bright marble hallway");
      // Transitions are now handled automatically by flag system, no signals needed
      expect(result.signals?.transition).toBeUndefined();

      // Verify flag changes were applied
      expect(mockFlagManager.applyChanges).toHaveBeenCalledWith({
        set: ['door_opened'],
        clear: []
      });
    });

    it('should handle transition to unknown scene', async () => {
      mockFlagManager.checkConditions.mockReturnValueOnce(true);
      
      const actionResponse = {
        data: {
          narrativeParts: ["You try something."],
          memories: [],
          importance: 5,
          flagChanges: {
            set: ['unknown_flag'],
            unset: []
          }
        }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValue(actionResponse);

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["You try something."]);
      // No transition should occur since we didn't mock checkConditions for a valid transition
    });

    it('should handle invalid ending signals gracefully', async () => {
      const mockResponse = {
        data: {
          narrativeParts: ["You trigger something."],
          memories: [],
          importance: 5,
          flagChanges: {
            set: [],
            unset: []
          }
        }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["You trigger something."]);
      expect(result.signals).toEqual({});
    });

    it('should handle "none" signals gracefully', async () => {
      const mockResponse = {
        data: {
          narrativeParts: ["You do something else."],
          memories: [],
          importance: 5,
          flagChanges: {
            set: [],
            unset: []
          }
        }
      };

      mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

      const result = await collectStreamingResponses("test", mockContext);

      expect(result.narrative).toEqual(["You do something else."]);
      expect(result.signals).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM call failures', async () => {
      mockMultiModelService.makeStructuredRequest.mockRejectedValue(
        new Error("Network error")
      );

      try {
        await collectStreamingResponses("test", mockContext);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });

    it('should handle transition chain failures', async () => {
      mockFlagManager.checkConditions.mockReturnValueOnce(true);
      
      const actionResponse = {
        data: {
          narrativeParts: ["You act."],
          memories: [],
          importance: 5,
          flagChanges: {
            set: ['some_flag'],
            unset: []
          }
        }
      };

      // Mock the action to succeed but transition to fail
      mockMultiModelService.makeStructuredRequest
        .mockResolvedValueOnce(actionResponse)
        .mockRejectedValueOnce(new Error("Transition failed"));

      try {
        await collectStreamingResponses("test", mockContext);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Transition failed");
      }
    });
  });
});
