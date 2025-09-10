/**
 * Tests for the Impressions Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistStory } from '@/types/impressionistStory';

// Mock ActionClassifier
const mockClassify = vi.fn();
vi.mock('@/engine/actionClassifier', () => ({
  ActionClassifier: vi.fn().mockImplementation(() => ({
    classify: mockClassify,
    setDebugPane: vi.fn()
  }))
}));

describe('ImpressionistEngine', () => {
  let engine: ImpressionistEngine;
  let mockStory: ImpressionistStory;

  beforeEach(() => {
    // Reset mock
    mockClassify.mockReset();
    mockClassify.mockResolvedValue({
      mode: 'action',
      reasoning: 'Processing action',
      confidence: 0.8
    });
    
    engine = new ImpressionistEngine();
    
    mockStory = {
      title: 'Test Story',
      author: 'Test Author',
      blurb: 'A test story',
      version: '1.0',
      context: 'A test context for our story',
      scenes: {
        start: {
          sketch: 'You are at the beginning.',
          leads_to: {
            middle: 'when player progresses'
          }
        },
        middle: {
          sketch: 'You are in the middle of the story.'
        }
      },
      endings: {
        variations: [
          {
            id: 'victory',
            when: 'player succeeds',
            sketch: 'You have won!'
          }
        ]
      },
      guidance: 'Be helpful and creative.'
    };
  });

  describe('loadStory', () => {
    it('should load a valid story successfully', () => {
      const result = engine.loadStory(mockStory);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.currentScene).toBe('start');
    });

    it('should reject invalid stories', () => {
      const invalidStory = { ...mockStory, scenes: {} };
      const result = engine.loadStory(invalidStory);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing required fields');
    });

    it('should set current scene to first scene', () => {
      engine.loadStory(mockStory);
      const gameState = engine.getGameState();
      
      expect(gameState.currentScene).toBe('start');
    });
  });

  describe('getInitialText', () => {
    it('should return null when scene needs LLM processing (default behavior)', () => {
      engine.loadStory(mockStory);
      const text = engine.getInitialText();
      
      expect(text).toBe(null); // Default process_sketch: true means LLM processing needed
    });

    it('should return initial scene sketch when process_sketch is false', () => {
      const storyWithVerbatimSketch = {
        ...mockStory,
        scenes: {
          start: {
            sketch: 'You are at the beginning.',
            process_sketch: false, // Explicitly set to false for verbatim display
            leads_to: {
              middle: 'when player progresses'
            }
          },
          middle: {
            sketch: 'You are in the middle of the story.'
          }
        }
      };
      
      engine.loadStory(storyWithVerbatimSketch);
      const text = engine.getInitialText();
      
      expect(text).toBe('You are at the beginning.');
    });

    it('should handle no story loaded', () => {
      const text = engine.getInitialText();
      
      expect(text).toContain('No story loaded');
    });

    it('should apply text normalization when process_sketch is false', () => {
      const storyWithFormattedText = {
        ...mockStory,
        scenes: {
          start: {
            sketch: `Welcome to the game!

Available options:
- Look around
- Take item

This is a paragraph that spans
multiple lines for readability.`,
            process_sketch: false
          }
        }
      };
      
      engine.loadStory(storyWithFormattedText);
      const text = engine.getInitialText();
      
      // Should use the text normalization utility
      expect(text).toContain('Welcome to the game!\n\n');
      expect(text).toContain('- Look around\n');
      expect(text).toContain('This is a paragraph that spans multiple lines for readability.');
    });
  });

  describe('processAction', () => {
    beforeEach(() => {
      engine.loadStory(mockStory);
    });

    it('should handle actions when no API key is configured', async () => {
      const response = await engine.processAction({ input: 'look around' });
      
      expect(response.text).toBeDefined();
      expect(response.gameState).toBeDefined();
      expect(response.gameState.currentScene).toBe('start');
    });

    it('should update recent interactions', async () => {
      await engine.processAction({ input: 'test command' });
      const gameState = engine.getGameState();
      
      expect(gameState.interactions.length).toBeGreaterThan(0);
      expect(gameState.interactions.some(interaction => interaction.playerInput.includes('test command'))).toBe(true);
    });

    it('should maintain scene state', async () => {
      const response = await engine.processAction({ input: 'examine surroundings' });
      
      expect(response.gameState.currentScene).toBe('start');
    });
  });

  describe('saveGame and loadGame', () => {
    beforeEach(() => {
      engine.loadStory(mockStory);
    });

    it('should save and restore game state', async () => {
      // Modify game state
      await engine.processAction({ input: 'test action' });
      const originalState = engine.getGameState();
      
      // Save game
      const saveData = engine.saveGame();
      expect(saveData).toBeDefined();
      
      // Create new engine and load story
      const newEngine = new ImpressionistEngine();
      newEngine.loadStory(mockStory);
      
      // Load save
      const loadResult = newEngine.loadGame(saveData);
      expect(loadResult.success).toBe(true);
      
      const restoredState = newEngine.getGameState();
      expect(restoredState.currentScene).toBe(originalState.currentScene);
      expect(restoredState.interactions).toEqual(originalState.interactions);
    });

    it('should reject saves from different stories', () => {
      const saveData = engine.saveGame();
      
      const differentStory = { ...mockStory, title: 'Different Story' };
      engine.loadStory(differentStory);
      
      const loadResult = engine.loadGame(saveData);
      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toContain('current story');
    });

    it('should save and restore all interactions with metadata', async () => {
      // Mock MultiModel service - just provide enough responses for all calls
      const mockMakeStructuredRequest = vi.fn()
        .mockResolvedValue({
          data: { narrative: 'Default response', memories: [], importance: 6, signals: {} },
          usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
        });
        
      const mockMultiModelService = {
        isConfigured: () => true,
        cancelActiveRequests: vi.fn(),
        makeStructuredRequest: mockMakeStructuredRequest
      };

      const testEngine = new (ImpressionistEngine as any)(mockMultiModelService);
      testEngine.loadStory(mockStory);
      
      // Create multiple interactions
      const firstResult = await testEngine.processAction({ input: 'first action' });
      const secondResult = await testEngine.processAction({ input: 'second action' });
      
      // Check that both calls succeeded
      expect(firstResult.error).toBeUndefined();
      expect(secondResult.error).toBeUndefined();
      
      // Save game
      const saveData = testEngine.saveGame();
      const parsedSave = JSON.parse(saveData);
      
      // We should have exactly 2 interactions from our 2 processAction calls
      expect(parsedSave.gameState.interactions.length).toBe(2);
      expect(parsedSave.gameState.interactions[0].playerInput).toBe('first action');
      expect(parsedSave.gameState.interactions[0].importance).toBe(6);
      expect(parsedSave.gameState.interactions[1].playerInput).toBe('second action');
      expect(parsedSave.gameState.interactions[1].importance).toBe(6);
      
      // Restore expecting 2 interactions now that we've fixed the test
      
      // Load into new engine
      const newEngine = new (ImpressionistEngine as any)(mockMultiModelService);
      newEngine.loadStory(mockStory);
      const loadResult = newEngine.loadGame(saveData);
      
      expect(loadResult.success).toBe(true);
      const restoredInteractions = newEngine.getStructuredInteractions();
      expect(restoredInteractions).toHaveLength(2);
      expect(restoredInteractions[0].timestamp).toBeInstanceOf(Date);
    });

    it('should save and restore memory manager state', async () => {
      // Get memory manager and add some memories
      const memoryManager = engine.getMemoryManager();
      memoryManager.addMemory('Important event happened', 8);
      memoryManager.addMemory('Less important detail', 3);
      
      // Save game
      const saveData = engine.saveGame();
      const parsedSave = JSON.parse(saveData);
      
      // Verify memory state is included
      expect(parsedSave.memoryManagerState).toBeDefined();
      
      // Create new engine and load
      const newEngine = new ImpressionistEngine();
      newEngine.loadStory(mockStory);
      newEngine.loadGame(saveData);
      
      // Verify memories are restored
      const newMemoryManager = newEngine.getMemoryManager();
      const restoredMemories = newMemoryManager.getMemories(10);
      expect(restoredMemories.memories.length).toBeGreaterThan(0);
    });

    it('should restore UI state through callback', async () => {
      // Setup UI restore callback
      let restoredGameState: any = null;
      let restoredDialogue: any[] = [];
      
      // Create interactions
      await engine.processAction({ input: 'test action one' });
      await engine.processAction({ input: 'test action two' });
      
      // Save game
      const saveData = engine.saveGame();
      
      // Create new engine with UI callback
      const newEngine = new ImpressionistEngine();
      newEngine.setUIRestoreCallback((gameState, conversationHistory) => {
        restoredGameState = gameState;
        restoredDialogue = conversationHistory || [];
      });
      
      newEngine.loadStory(mockStory);
      newEngine.loadGame(saveData);
      
      // Verify UI callback was called with correct data
      expect(restoredGameState).toBeDefined();
      expect(restoredGameState.currentScene).toBe('start');
      expect(restoredDialogue).toHaveLength(0); // No legacy dialogue format
    });

    it('should include save timestamp', () => {
      const beforeSave = new Date();
      const saveData = engine.saveGame();
      const afterSave = new Date();
      
      const parsedSave = JSON.parse(saveData);
      expect(parsedSave.saveTimestamp).toBeDefined();
      
      const saveTime = new Date(parsedSave.saveTimestamp);
      expect(saveTime.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(saveTime.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    it('should save all required fields in correct format', async () => {
      // Add some test data
      const memoryManager = engine.getMemoryManager();
      memoryManager.addMemory('Test memory', 5);
      
      await engine.processAction({ input: 'test action' });
      
      // Save and parse
      const saveData = engine.saveGame();
      const parsedSave = JSON.parse(saveData);
      
      // Verify structure
      expect(parsedSave).toHaveProperty('gameState');
      expect(parsedSave).toHaveProperty('memoryManagerState');
      expect(parsedSave).toHaveProperty('storyTitle');
      expect(parsedSave).toHaveProperty('saveTimestamp');
      
      // Verify gameState structure
      expect(parsedSave.gameState).toHaveProperty('currentScene');
      expect(parsedSave.gameState).toHaveProperty('interactions');
      expect(Array.isArray(parsedSave.gameState.interactions)).toBe(true);
      
      // Verify interaction structure
      if (parsedSave.gameState.interactions.length > 0) {
        const interaction = parsedSave.gameState.interactions[0];
        expect(interaction).toHaveProperty('playerInput');
        expect(interaction).toHaveProperty('llmResponse');
        expect(interaction).toHaveProperty('timestamp');
        expect(interaction).toHaveProperty('sceneId');
        expect(interaction).toHaveProperty('importance');
      }
    });
  });

  describe('memory management', () => {
    beforeEach(() => {
      engine.loadStory(mockStory);
    });

    it('should initialize with empty dialogue', () => {
      const gameState = engine.getGameState();
      
      expect(gameState.interactions).toEqual([]);
    });

    it('should track dialogue in recent history', async () => {
      await engine.processAction({ input: 'first action' });
      await engine.processAction({ input: 'second action' });
      
      const gameState = engine.getGameState();
      expect(gameState.interactions.length).toBeGreaterThan(0);
      expect(gameState.interactions.some(interaction => interaction.playerInput.includes('first action'))).toBe(true);
      expect(gameState.interactions.some(interaction => interaction.playerInput.includes('second action'))).toBe(true);
    });
  });

  describe('UI integration', () => {
    it('should call reset callback when loading new story', () => {
      let resetCalled = false;
      engine.setUIResetCallback(() => { resetCalled = true; });
      
      engine.loadStory(mockStory);
      
      expect(resetCalled).toBe(true);
    });

    it('should provide story title', () => {
      engine.loadStory(mockStory);
      
      expect(engine.getCurrentStoryTitle()).toBe('Test Story');
    });

    it('should return null title when no story loaded', () => {
      expect(engine.getCurrentStoryTitle()).toBeNull();
    });

    it('should track structured interactions', async () => {
      // Mock MultiModel service for this test
      const mockMultiModelService = {
        isConfigured: () => true,
        makeStructuredRequest: vi.fn().mockResolvedValue({
          data: {
            narrative: 'Test response',
            memories: ['Test memory'],
            importance: 5,
            signals: {}
          },
          usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
        })
      };

      const engineWithMock = new (ImpressionistEngine as any)(mockMultiModelService);
      engineWithMock.loadStory(mockStory);
      
      const response = await engineWithMock.processAction({ input: 'test action' });
      expect(response.error).toBeUndefined();
      
      const interactions = engineWithMock.getStructuredInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].playerInput).toBe('test action');
      expect(interactions[0].sceneId).toBe('start');
      expect(interactions[0].timestamp).toBeInstanceOf(Date);
      expect(interactions[0].importance).toBeGreaterThan(0);
    });

    it('should include interactions in save data', async () => {
      engine.loadStory(mockStory);
      await engine.processAction({ input: 'test action' });
      
      const saveData = engine.saveGame();
      const parsed = JSON.parse(saveData);
      
      expect(parsed.gameState.interactions).toHaveLength(1);
      expect(parsed.gameState.interactions[0].playerInput).toBe('test action');
    });

    it('should use LLM-provided importance when available', async () => {
      // Mock LLM response with importance
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeStructuredRequest: vi.fn().mockResolvedValue({
          data: {
            narrative: 'Test response',
            memories: ['Test memory'],
            importance: 7,
            signals: {}
          },
          usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 }
        })
      };
      
      const engineWithMock = new ImpressionistEngine(mockService as any);
      engineWithMock.loadStory(mockStory);
      
      await engineWithMock.processAction({ input: 'important action' });
      
      const interactions = engineWithMock.getStructuredInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].importance).toBe(7); // Should use LLM-provided importance
    });
  });

  describe('Scene Transition UI Display Bug', () => {
    it('should use narrative handoff to display only transition response incorporating action', async () => {
      // Create a story with flag-based transitions
      const transitionTestStory: ImpressionistStory = {
        title: 'Transition Test',
        author: 'Test',
        blurb: 'Testing transitions',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        flags: {
          door_opened: { default: false, description: 'when door is opened' },
          ready_to_leave: { default: false, description: 'when ready to leave' }
        },
        scenes: {
          room: {
            sketch: 'You are in a room',
            transitions: {
              hallway: {
                requires: { all_of: ['door_opened', 'ready_to_leave'] }
              }
            }
          },
          hallway: {
            sketch: 'You are in the hallway'
          }
        },
        endings: { variations: [] }
      };

      // Mock LLM service to simulate flag-setting responses
      let callCount = 0;
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeStructuredRequest: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call: action that sets both required flags
            return Promise.resolve({
              data: {
                narrativeParts: ['Action response: You are now ready'],
                memories: ['Player is ready'],
                importance: 5,
                flagChanges: { values: { door_opened: true, ready_to_leave: true } }
              }
            });
          } else {
            // Second call: transition narrative
            return Promise.resolve({
              data: {
                narrativeParts: ['Transition: You move to the hallway'],
                memories: ['Player moved to hallway'],
                importance: 7,
                flagChanges: { values: {} }
              }
            });
          }
        })
      };

      const engine = new ImpressionistEngine(mockService as any);
      
      // Capture UI callback messages
      const uiMessages: { text: string; type: string }[] = [];
      engine.setUIAddMessageCallback((text: string, type: string) => {
        uiMessages.push({ text, type });
      });

      engine.loadStory(transitionTestStory);
      
      // Process action that should trigger transition
      await engine.processAction({ input: 'get ready and open door' });

      // Verify the LLM was called twice (action + transition)
      expect(mockService.makeStructuredRequest).toHaveBeenCalledTimes(2);
      
      // Debug: Check what we actually captured
      console.log('UI Messages captured:', uiMessages.length, uiMessages);
      console.log('LLM call count:', mockService.makeStructuredRequest.mock.calls.length);
      
      // Verify the LLM was called twice (action + transition)
      expect(mockService.makeStructuredRequest).toHaveBeenCalledTimes(2);
      
      // Verify scene actually changed
      const gameState = engine.getGameState();
      expect(gameState.currentScene).toBe('hallway');
      
      // With narrative handoff, we should only get ONE UI message (the transition that incorporates the action)
      expect(uiMessages).toHaveLength(1);
      expect(uiMessages[0].text).toContain('Transition');
      expect(uiMessages[0].type).toBe('story');
    });

    it('should handle empty transition narratives gracefully', async () => {
      const transitionTestStory: ImpressionistStory = {
        title: 'Empty Transition Test',
        author: 'Test', 
        blurb: 'Testing empty transitions',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        flags: {
          trigger_flag: { default: false, description: 'trigger flag' }
        },
        scenes: {
          start: {
            sketch: 'Start scene',
            transitions: {
              end: { requires: { all_of: ['trigger_flag'] } }
            }
          },
          end: { sketch: 'End scene' }
        },
        endings: { variations: [] }
      };

      let callCount = 0;
      const mockService = {
        isConfigured: vi.fn().mockReturnValue(true),
        makeStructuredRequest: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              data: {
                narrativeParts: ['Action sets flag'],
                memories: [],
                importance: 5,
                flagChanges: { values: { trigger_flag: true } }
              }
            });
          } else {
            // Return empty narrative for transition
            return Promise.resolve({
              data: {
                narrativeParts: [],
                memories: [],
                importance: 5,
                flagChanges: { values: {} }
              }
            });
          }
        })
      };

      const engine = new ImpressionistEngine(mockService as any);
      
      const uiMessages: { text: string; type: string }[] = [];
      engine.setUIAddMessageCallback((text: string, type: string) => {
        uiMessages.push({ text, type });
      });

      engine.loadStory(transitionTestStory);
      await engine.processAction({ input: 'trigger transition' });

      // Should handle empty transition narrative without errors
      expect(uiMessages.length).toBeGreaterThan(0);
      console.log('UI Messages with empty transition:', uiMessages);
    });
  });
});