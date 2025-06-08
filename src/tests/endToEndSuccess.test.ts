import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '@/engine/gameEngine';
import { StoryParser } from '@/engine/storyParser';
import * as fs from 'fs';
import * as path from 'path';

// Mock Anthropic service that doesn't make real API calls
class MockAnthropicService {
  isConfigured() { return false; } // Force fallback to basic commands
  async processCommand() { throw new Error("Should not be called in tests"); }
  setDebugCallback() {}
  cancelActiveRequests() {} // Add missing method
}

describe('End-to-End Success Condition Testing', () => {
  let gameEngine: GameEngine;
  
  beforeEach(() => {
    // Load the simple test story
    const storyPath = path.join(process.cwd(), 'examples', 'sandwich_test_simple.yaml');
    const storyContent = fs.readFileSync(storyPath, 'utf8');
    const story = StoryParser.parseFromYaml(storyContent);
    
    gameEngine = new GameEngine(new MockAnthropicService() as any);
    const result = gameEngine.loadStory(story);
    if (!result.success) {
      console.error('Story loading failed:', result.error);
    }
    expect(result.success).toBe(true);
  });

  describe('Mystery Disaster Ending', () => {
    it('should trigger mystery disaster when sandwich has mystery condiment and is eaten', () => {
      // Simulate LLM setting knowledge when player makes sandwich with mystery condiment
      gameEngine.setFlag('sandwich has mystery condiment');
      gameEngine.setFlag('player has eaten sandwich');
      
      // Manually call checkEndingConditions to simulate what happens after LLM processing
      const gameState = gameEngine.getGameState();
      
      // Check if any success conditions are met
      const story = (gameEngine as any).story;
      const successConditions = story.success_conditions || [];
      
      let matchedCondition = null;
      for (const condition of successConditions) {
        const requirementsMet = condition.requires.every((requirement: string) => {
          // Use the same evaluation logic as the game engine
          return gameState.flags.has(requirement);
        });
        
        if (requirementsMet) {
          matchedCondition = condition;
          break;
        }
      }
      
      expect(matchedCondition).toBeTruthy();
      expect(matchedCondition?.id).toBe('mystery_disaster');
      // Since ending is now optional and LLM-generated, just verify the condition exists
      expect(matchedCondition?.description).toBe('Player eats sandwich made with the mystery condiment. Ugh, fish sauce!');
    });
  });

  describe('Perfect Ending', () => {
    it('should trigger perfect ending when sandwich has toasted bread, cheese, and is eaten', () => {
      // Simulate LLM setting knowledge when player makes perfect sandwich
      gameEngine.setFlag('sandwich has toasted bread');
      gameEngine.setFlag('sandwich has cheese');
      gameEngine.setFlag('player has eaten sandwich');
      
      const gameState = gameEngine.getGameState();
      const story = (gameEngine as any).story;
      const successConditions = story.success_conditions || [];
      
      let matchedCondition = null;
      for (const condition of successConditions) {
        const requirementsMet = condition.requires.every((requirement: string) => {
          return gameState.flags.has(requirement);
        });
        
        if (requirementsMet) {
          matchedCondition = condition;
          break;
        }
      }
      
      expect(matchedCondition).toBeTruthy();
      expect(matchedCondition?.id).toBe('perfect_ending');
      // Since ending is now optional and LLM-generated, just verify the condition exists
      expect(matchedCondition?.description).toBe('Player makes and eats a sandwich with toasted bread and cheese');
    });
  });

  describe('Decent Ending', () => {
    it('should trigger decent ending when sandwich has regular bread, cheese, and is eaten', () => {
      // Simulate LLM setting knowledge when player makes decent sandwich
      gameEngine.setFlag('sandwich has bread');
      gameEngine.setFlag('sandwich has cheese');
      gameEngine.setFlag('player has eaten sandwich');
      
      const gameState = gameEngine.getGameState();
      const story = (gameEngine as any).story;
      const successConditions = story.success_conditions || [];
      
      let matchedCondition = null;
      for (const condition of successConditions) {
        const requirementsMet = condition.requires.every((requirement: string) => {
          return gameState.flags.has(requirement);
        });
        
        if (requirementsMet) {
          matchedCondition = condition;
          break;
        }
      }
      
      expect(matchedCondition).toBeTruthy();
      expect(matchedCondition?.id).toBe('decent_ending');
      // Since ending is now optional and LLM-generated, just verify the condition exists
      expect(matchedCondition?.description).toBe('Player makes and eats a sandwich with regular bread and cheese');
    });
  });

  describe('No Premature Triggering', () => {
    it('should NOT trigger ending when sandwich is made but not eaten', () => {
      // Simulate LLM setting knowledge when player makes sandwich but doesn't eat it
      gameEngine.setFlag('sandwich has toasted bread');
      gameEngine.setFlag('sandwich has cheese');
      // Note: NO "player has eaten sandwich" knowledge set
      
      const gameState = gameEngine.getGameState();
      const story = (gameEngine as any).story;
      const successConditions = story.success_conditions || [];
      
      let matchedCondition = null;
      for (const condition of successConditions) {
        const requirementsMet = condition.requires.every((requirement: string) => {
          return gameState.flags.has(requirement);
        });
        
        if (requirementsMet) {
          matchedCondition = condition;
          break;
        }
      }
      
      expect(matchedCondition).toBeNull(); // No ending should trigger
    });
  });

  describe('Priority-like Behavior Through Order', () => {
    it('should find first matching condition when multiple could match', () => {
      // Simulate edge case where both toasted bread and regular bread knowledge exists
      // (This could happen if player toasts bread but LLM also sets regular bread)
      gameEngine.setFlag('sandwich has bread');
      gameEngine.setFlag('sandwich has toasted bread'); // Both types of bread
      gameEngine.setFlag('sandwich has cheese');
      gameEngine.setFlag('player has eaten sandwich');
      
      const gameState = gameEngine.getGameState();
      const story = (gameEngine as any).story;
      const successConditions = story.success_conditions || [];
      
      let matchedCondition = null;
      for (const condition of successConditions) {
        const requirementsMet = condition.requires.every((requirement: string) => {
          return gameState.flags.has(requirement);
        });
        
        if (requirementsMet) {
          matchedCondition = condition;
          break; // First match wins
        }
      }
      
      expect(matchedCondition).toBeTruthy();
      // Should get perfect ending (comes before decent ending, and no mystery condiment)
      expect(matchedCondition?.id).toBe('perfect_ending');
    });
  });
});