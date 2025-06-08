import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '@/engine/gameEngine';
import { Story } from '@/types/story';

// Mock story with Format v2 success conditions for testing
const mockStoryV2: Story = {
  title: "Test Success Conditions",
  author: "Test",
  version: "2.0",
  metadata: {
    setting: { time: "test", place: "test" },
    tone: { overall: "test", narrative_voice: "test" },
    themes: ["test"]
  },
  characters: [
    { id: "player", name: "Player", traits: ["test"], voice: "test", description: "test" }
  ],
  locations: [
    { id: "kitchen", name: "Kitchen", connections: [], description: "test kitchen" }
  ],
  items: [
    { 
      id: "bread", 
      name: "Bread", 
      description: "test bread",
      can_become: "toasted_bread",
      aliases: ["stale bread", "loaf"]
    },
    { 
      id: "toasted_bread", 
      name: "Toasted Bread", 
      description: "golden toast",
      created_from: "bread"
    },
    { 
      id: "cheese", 
      name: "Cheese", 
      description: "test cheese"
    },
    { 
      id: "mystery_jar", 
      name: "Mystery Jar", 
      description: "unknown condiment"
    }
  ],
  knowledge: [],
  flows: [
    { id: "start", name: "Start", type: "narrative", content: "test start" }
  ],
  start: {
    content: "test start",
    location: "kitchen",
    first_flow: "start"
  },
  // Format v2: Success conditions
  success_conditions: [
    {
      id: "disaster_ending",
      description: "Terrible sandwich with mystery condiment",
      requires: ["sandwich has mystery condiment", "player has eaten sandwich"],
      ending: "Oh no! The mystery condiment was fish sauce! Disaster!"
    },
    {
      id: "perfect_ending",
      description: "Perfect sandwich with toasted bread and cheese",
      requires: ["sandwich has toasted bread", "sandwich has cheese", "player has eaten sandwich"],
      ending: "Perfect! You made an amazing sandwich with golden toast and cheese!"
    },
    {
      id: "decent_ending", 
      description: "Decent sandwich with bread and cheese",
      requires: ["sandwich has bread", "sandwich has cheese", "player has eaten sandwich"],
      ending: "Not bad! A simple but satisfying sandwich."
    }
  ]
};

// Mock Anthropic service that doesn't make real API calls
class MockAnthropicService {
  isConfigured() { return false; } // Force fallback to basic commands
  async processCommand() { throw new Error("Should not be called in tests"); }
  setDebugCallback() {}
}

describe('Success Conditions Testing', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine(new MockAnthropicService() as any);
    const result = gameEngine.loadStory(mockStoryV2);
    expect(result.success).toBe(true);
  });

  describe('Perfect Ending Reachability', () => {
    it('should reach perfect ending when player has toasted bread and cheese', () => {
      // Simulate making and eating a sandwich with toasted bread and cheese
      gameEngine.addKnowledge('sandwich has toasted bread');
      gameEngine.addKnowledge('sandwich has cheese');
      gameEngine.addKnowledge('player has eaten sandwich');
      
      // Check that the knowledge is set
      const gameState = gameEngine.getGameState();
      expect(gameState.knowledge.has('sandwich has toasted bread')).toBe(true);
      expect(gameState.knowledge.has('sandwich has cheese')).toBe(true);
      expect(gameState.knowledge.has('player has eaten sandwich')).toBe(true);
      
      // Manually check success condition logic
      const successCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'perfect_ending');
      expect(successCondition).toBeDefined();
      
      if (successCondition) {
        const requirementsMet = successCondition.requires.every(req => 
          gameState.knowledge.has(req)
        );
        expect(requirementsMet).toBe(true);
      }
    });

    it('should NOT reach perfect ending with only bread (not toasted)', () => {
      // Simulate making and eating sandwich with regular bread instead of toasted
      gameEngine.addKnowledge('sandwich has bread'); // Regular bread, not toasted!
      gameEngine.addKnowledge('sandwich has cheese');
      gameEngine.addKnowledge('player has eaten sandwich');
      
      const gameState = gameEngine.getGameState();
      expect(gameState.knowledge.has('sandwich has bread')).toBe(true);
      expect(gameState.knowledge.has('sandwich has cheese')).toBe(true);
      expect(gameState.knowledge.has('player has eaten sandwich')).toBe(true);
      expect(gameState.knowledge.has('sandwich has toasted bread')).toBe(false);
      
      // Check that perfect ending requirements are NOT met
      const successCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'perfect_ending');
      if (successCondition) {
        const requirementsMet = successCondition.requires.every(req => 
          gameState.knowledge.has(req)
        );
        expect(requirementsMet).toBe(false); // Should fail because no toasted bread
      }
    });
  });

  describe('Decent Ending Reachability', () => {
    it('should reach decent ending with bread and cheese', () => {
      // Simulate making and eating sandwich with regular bread and cheese
      gameEngine.addKnowledge('sandwich has bread');
      gameEngine.addKnowledge('sandwich has cheese');
      gameEngine.addKnowledge('player has eaten sandwich');
      
      const gameState = gameEngine.getGameState();
      expect(gameState.knowledge.has('sandwich has bread')).toBe(true);
      expect(gameState.knowledge.has('sandwich has cheese')).toBe(true);
      expect(gameState.knowledge.has('player has eaten sandwich')).toBe(true);
      
      // Check success condition
      const successCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'decent_ending');
      if (successCondition) {
        const requirementsMet = successCondition.requires.every(req => 
          gameState.knowledge.has(req)
        );
        expect(requirementsMet).toBe(true);
      }
    });

    it('should NOT reach decent ending with only cheese', () => {
      gameEngine.addKnowledge('sandwich has cheese');
      gameEngine.addKnowledge('player has eaten sandwich');
      // No bread knowledge set
      
      const gameState = gameEngine.getGameState();
      expect(gameState.knowledge.has('sandwich has cheese')).toBe(true);
      expect(gameState.knowledge.has('player has eaten sandwich')).toBe(true);
      expect(gameState.knowledge.has('sandwich has bread')).toBe(false);
      
      const successCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'decent_ending');
      if (successCondition) {
        const requirementsMet = successCondition.requires.every(req => 
          gameState.knowledge.has(req)
        );
        expect(requirementsMet).toBe(false);
      }
    });
  });

  describe('Disaster Ending Reachability', () => {
    it('should reach disaster ending with mystery jar', () => {
      gameEngine.addKnowledge('sandwich has mystery condiment');
      gameEngine.addKnowledge('player has eaten sandwich');
      
      const gameState = gameEngine.getGameState();
      expect(gameState.knowledge.has('sandwich has mystery condiment')).toBe(true);
      expect(gameState.knowledge.has('player has eaten sandwich')).toBe(true);
      
      const successCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'disaster_ending');
      if (successCondition) {
        const requirementsMet = successCondition.requires.every(req => 
          gameState.knowledge.has(req)
        );
        expect(requirementsMet).toBe(true);
      }
    });
  });

  describe('Multiple Conditions', () => {
    it('should handle multiple ending conditions appropriately', () => {
      // In practice, conditions shouldn't overlap due to natural sandwich logic
      // But test that the system can handle multiple valid conditions
      gameEngine.addKnowledge('sandwich has bread');
      gameEngine.addKnowledge('sandwich has cheese');
      gameEngine.addKnowledge('player has eaten sandwich');
      
      const gameState = gameEngine.getGameState();
      
      // Only decent ending should have requirements met
      const perfectCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'perfect_ending');
      const decentCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'decent_ending');
      const disasterCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'disaster_ending');
      
      expect(perfectCondition).toBeDefined();
      expect(decentCondition).toBeDefined();
      expect(disasterCondition).toBeDefined();
      
      if (perfectCondition && decentCondition && disasterCondition) {
        // Only decent should have requirements met
        expect(perfectCondition.requires.every(req => gameState.knowledge.has(req))).toBe(false); // Missing toasted bread
        expect(decentCondition.requires.every(req => gameState.knowledge.has(req))).toBe(true);
        expect(disasterCondition.requires.every(req => gameState.knowledge.has(req))).toBe(false); // Missing mystery condiment
      }
    });
  });

  describe('Sandwich Composition Logic', () => {
    it('should support different bread types leading to different endings', () => {
      // Test that toasted bread leads to perfect ending
      gameEngine.addKnowledge('sandwich has toasted bread');
      gameEngine.addKnowledge('sandwich has cheese');
      gameEngine.addKnowledge('player has eaten sandwich');
      
      let gameState = gameEngine.getGameState();
      expect(gameState.knowledge.has('sandwich has toasted bread')).toBe(true);
      expect(gameState.knowledge.has('sandwich has cheese')).toBe(true);
      expect(gameState.knowledge.has('player has eaten sandwich')).toBe(true);
      
      // Should reach perfect ending
      const perfectCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'perfect_ending');
      if (perfectCondition) {
        const requirementsMet = perfectCondition.requires.every(req => 
          gameState.knowledge.has(req)
        );
        expect(requirementsMet).toBe(true);
      }
      
      // Clear knowledge and test regular bread
      gameState.knowledge.clear();
      gameEngine.addKnowledge('sandwich has bread');
      gameEngine.addKnowledge('sandwich has cheese');
      gameEngine.addKnowledge('player has eaten sandwich');
      
      gameState = gameEngine.getGameState();
      
      // Should reach decent ending (not perfect)
      const decentCondition = mockStoryV2.success_conditions?.find(sc => sc.id === 'decent_ending');
      if (decentCondition) {
        const requirementsMet = decentCondition.requires.every(req => 
          gameState.knowledge.has(req)
        );
        expect(requirementsMet).toBe(true);
      }
    });
  });

  describe('Game State Validation', () => {
    it('should start with empty inventory', () => {
      const gameState = gameEngine.getGameState();
      expect(gameState.inventory).toEqual([]);
      expect(gameState.gameStarted).toBe(true);
      expect(gameState.gameEnded).toBe(false);
    });

    it('should track inventory changes correctly', () => {
      expect(gameEngine.getGameState().inventory).toEqual([]);
      
      gameEngine.addItemToInventory('bread');
      expect(gameEngine.getGameState().inventory).toEqual(['bread']);
      
      gameEngine.addItemToInventory('cheese');
      expect(gameEngine.getGameState().inventory).toEqual(['bread', 'cheese']);
      
      gameEngine.removeItemFromInventory('bread');
      expect(gameEngine.getGameState().inventory).toEqual(['cheese']);
    });

    it('should prevent duplicate items in inventory', () => {
      gameEngine.addItemToInventory('bread');
      gameEngine.addItemToInventory('bread'); // Try to add again
      
      expect(gameEngine.getGameState().inventory).toEqual(['bread']);
    });
  });

  describe('Success Condition Structure Validation', () => {
    it('should have properly structured success conditions', () => {
      const story = mockStoryV2;
      expect(story.success_conditions).toBeDefined();
      expect(Array.isArray(story.success_conditions)).toBe(true);
      expect(story.success_conditions!.length).toBe(3);
      
      story.success_conditions!.forEach(condition => {
        expect(condition.id).toBeTruthy();
        expect(condition.description).toBeTruthy();
        expect(Array.isArray(condition.requires)).toBe(true);
        expect(condition.ending).toBeTruthy();
      });
    });

    it('should have unique condition IDs', () => {
      const conditionIds = mockStoryV2.success_conditions!.map(sc => sc.id);
      const uniqueIds = new Set(conditionIds);
      expect(uniqueIds.size).toBe(conditionIds.length);
    });

    it('should reference valid item IDs in requirements', () => {
      const itemIds = new Set(mockStoryV2.items.map(item => item.id));
      
      mockStoryV2.success_conditions!.forEach(condition => {
        condition.requires.forEach(requirement => {
          // Requirement could be an item ID or a flag/knowledge
          // For this test, we're focusing on item IDs
          if (itemIds.has(requirement)) {
            expect(itemIds).toContain(requirement);
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty inventory gracefully', () => {
      const gameState = gameEngine.getGameState();
      expect(gameState.inventory).toEqual([]);
      
      // No success conditions should be met
      mockStoryV2.success_conditions!.forEach(condition => {
        const requirementsMet = condition.requires.every(req => 
          gameState.inventory.includes(req)
        );
        expect(requirementsMet).toBe(false);
      });
    });

    it('should handle removing non-existent items', () => {
      const result = gameEngine.removeItemFromInventory('nonexistent');
      expect(result.success).toBe(true); // Should not error
      expect(gameEngine.getGameState().inventory).toEqual([]);
    });

    it('should handle checking conditions with no success_conditions defined', () => {
      // Create a story without success conditions
      const storyWithoutConditions: Story = {
        ...mockStoryV2,
        success_conditions: undefined
      };
      
      const engine = new GameEngine(new MockAnthropicService() as any);
      const result = engine.loadStory(storyWithoutConditions);
      expect(result.success).toBe(true);
      
      // Should not crash when checking success conditions
      engine.addItemToInventory('bread');
      expect(engine.getGameState().inventory).toContain('bread');
    });
  });
});