/**
 * Tests for the Impressions Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
      endings: [
        {
          id: 'victory',
          when: 'player succeeds',
          sketch: 'You have won!'
        }
      ],
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

    it('should update recent dialogue', async () => {
      await engine.processAction({ input: 'test command' });
      const gameState = engine.getGameState();
      
      expect(gameState.recentDialogue.length).toBeGreaterThan(0);
      expect(gameState.recentDialogue.some(line => line.includes('test command'))).toBe(true);
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
      expect(restoredState.recentDialogue).toEqual(originalState.recentDialogue);
    });

    it('should reject saves from different stories', () => {
      const saveData = engine.saveGame();
      
      const differentStory = { ...mockStory, title: 'Different Story' };
      engine.loadStory(differentStory);
      
      const loadResult = engine.loadGame(saveData);
      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toContain('current story');
    });
  });

  describe('memory management', () => {
    beforeEach(() => {
      engine.loadStory(mockStory);
    });

    it('should initialize with empty dialogue', () => {
      const gameState = engine.getGameState();
      
      expect(gameState.recentDialogue).toEqual([]);
    });

    it('should track dialogue in recent history', async () => {
      await engine.processAction({ input: 'first action' });
      await engine.processAction({ input: 'second action' });
      
      const gameState = engine.getGameState();
      expect(gameState.recentDialogue.length).toBeGreaterThan(0);
      expect(gameState.recentDialogue.some(line => line.includes('first action'))).toBe(true);
      expect(gameState.recentDialogue.some(line => line.includes('second action'))).toBe(true);
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
  });
});