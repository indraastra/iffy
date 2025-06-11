/**
 * Tests for the Impressions Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistStory } from '@/types/impressionistStory';

describe('ImpressionistEngine', () => {
  let engine: ImpressionistEngine;
  let mockStory: ImpressionistStory;

  beforeEach(() => {
    engine = new ImpressionistEngine();
    
    mockStory = {
      title: 'Test Story',
      author: 'Test Author',
      blurb: 'A test story',
      version: '1.0',
      context: 'A test context for our story',
      scenes: [
        {
          id: 'start',
          sketch: 'You are at the beginning.',
          leads_to: {
            middle: 'when player progresses'
          }
        },
        {
          id: 'middle',
          sketch: 'You are in the middle of the story.'
        }
      ],
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
      const invalidStory = { ...mockStory, scenes: [] };
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
    it('should return initial scene sketch', () => {
      engine.loadStory(mockStory);
      const text = engine.getInitialText();
      
      expect(text).toBe('You are at the beginning.');
    });

    it('should handle no story loaded', () => {
      const text = engine.getInitialText();
      
      expect(text).toContain('No story loaded');
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
      // Mock Anthropic service
      const mockAnthropicService = {
        isConfigured: () => true,
        makeRequestWithUsage: vi.fn()
          .mockResolvedValueOnce({
            content: JSON.stringify({ narrative: 'First response', importance: 7 }),
            usage: { input_tokens: 100, output_tokens: 50 }
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({ narrative: 'Second response', importance: 5 }),
            usage: { input_tokens: 120, output_tokens: 60 }
          })
      };

      const testEngine = new (ImpressionistEngine as any)(mockAnthropicService);
      testEngine.loadStory(mockStory);
      
      // Create multiple interactions
      await testEngine.processAction({ input: 'first action' });
      await testEngine.processAction({ input: 'second action' });
      
      // Save game
      const saveData = testEngine.saveGame();
      const parsedSave = JSON.parse(saveData);
      
      // Verify saved interactions
      expect(parsedSave.gameState.interactions).toHaveLength(2);
      expect(parsedSave.gameState.interactions[0].playerInput).toBe('first action');
      expect(parsedSave.gameState.interactions[0].importance).toBe(7);
      expect(parsedSave.gameState.interactions[1].playerInput).toBe('second action');
      expect(parsedSave.gameState.interactions[1].importance).toBe(5);
      
      // Load into new engine
      const newEngine = new (ImpressionistEngine as any)(mockAnthropicService);
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
      expect(restoredDialogue).toHaveLength(4); // 2 interactions = 4 dialogue lines
      expect(restoredDialogue[0]).toContain('test action one');
      expect(restoredDialogue[2]).toContain('test action two');
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
      // Mock Anthropic service for this test
      const mockAnthropicService = {
        isConfigured: () => true,
        makeRequestWithUsage: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            narrative: 'Test response',
            importance: 5
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
        })
      };

      const engineWithMock = new (ImpressionistEngine as any)(mockAnthropicService);
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
        makeRequestWithUsage: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            narrative: 'Test response',
            importance: 7
          }),
          usage: { input_tokens: 100, output_tokens: 50 }
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
});