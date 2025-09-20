/**
 * Tests for unplanned ending detection via game_over signal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LangChainDirector } from '@/engine/langChainDirector';
import { DirectorContext } from '@/types/impressionistStory';

// Mock MultiModelService
const mockMultiModelService = {
  isConfigured: vi.fn().mockReturnValue(true),
  makeStructuredRequest: vi.fn()
};

// Mock FlagManager
const mockFlagManager = {
  getAllFlags: vi.fn().mockReturnValue({}),
  getStoryFlags: vi.fn().mockReturnValue({}),
  checkConditions: vi.fn().mockReturnValue(false),
  applyChanges: vi.fn(),
  setLocationFlag: vi.fn(),
  clearLocationFlags: vi.fn(),
  getDebugString: vi.fn().mockReturnValue(''),
  generateFlagProgressionGuidance: vi.fn().mockReturnValue(''),
  generateFlagStateSection: vi.fn().mockReturnValue(''),
  generateFlagContext: vi.fn().mockReturnValue(''),
  generateFlagManagementInstructions: vi.fn().mockReturnValue('')
};

vi.mock('@/engine/FlagManager', () => ({
  FlagManager: vi.fn().mockImplementation(() => mockFlagManager)
}));

describe('Unplanned Ending Detection', () => {
  let director: LangChainDirector;
  let mockContext: DirectorContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    director = new LangChainDirector(mockMultiModelService as any, {
      debugMode: false
    });
    
    director.initializeFlags({ flags: {} } as any);

    mockContext = {
      storyContext: "A story about choices and departures",
      guidance: "Focus on emotional weight",
      currentSketch: "Standing at the crossroads",
      sceneGuidance: "Make it meaningful",
      currentTransitions: {},
      availableEndings: {
        variations: [
          {
            id: "planned_ending",
            requires: { all_of: ["specific_flag"] },
            sketch: "A planned ending"
          }
        ]
      },
      recentInteractions: [],
      activeMemory: ["Previous moment of doubt"],
      narrative: {
        voice: "Contemplative",
        tone: "Melancholic",
        themes: ["departure", "finality"]
      }
    };
  });

  it('should detect game_over signal in response', async () => {
    const mockResponse = {
      data: {
        narrativeParts: ["You turn away, knowing you'll never return."],
        memories: ["Final departure"],
        importance: 9,
        flagChanges: {},
        signals: {
          game_over: true
        }
      },
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
    };

    mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

    const result = await director.processInputStreaming(mockContext, "walk away forever");

    expect(result.narrative).toEqual(["You turn away, knowing you'll never return."]);
    expect(result.signals?.game_over).toBe(true);
  });

  it('should not set game_over for temporary actions', async () => {
    const mockResponse = {
      data: {
        narrativeParts: ["You step outside for some fresh air."],
        memories: ["Went outside briefly"],
        importance: 3,
        flagChanges: {},
        signals: {}
      },
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
    };

    mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

    const result = await director.processInputStreaming(mockContext, "step outside");

    expect(result.narrative).toEqual(["You step outside for some fresh air."]);
    expect(result.signals?.game_over).toBeUndefined();
  });

  it('should handle game_over with other signals', async () => {
    const mockResponse = {
      data: {
        narrativeParts: ["You pick up the locket and walk away forever."],
        memories: ["Found locket", "Left permanently"],
        importance: 10,
        flagChanges: {
          found_locket: true
        },
        signals: {
          discover: "locket",
          game_over: true
        }
      },
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
    };

    mockMultiModelService.makeStructuredRequest.mockResolvedValue(mockResponse);

    const result = await director.processInputStreaming(mockContext, "take the locket and leave forever");

    expect(result.signals?.discover).toBe("locket");
    expect(result.signals?.game_over).toBe(true);
    expect(mockFlagManager.applyChanges).toHaveBeenCalledWith({
      found_locket: true
    });
  });
});