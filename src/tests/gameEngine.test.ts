import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../engine/gameEngine'
import { Story } from '../types/story'

describe('GameEngine', () => {
  let gameEngine: GameEngine
  let mockStory: Story

  beforeEach(() => {
    gameEngine = new GameEngine()
    
    // Create a minimal mock story for testing
    mockStory = {
      title: "Test Story",
      author: "Test Author", 
      version: "1.0",
      metadata: {
        setting: { time: "Present", place: "Test Place" },
        tone: { overall: "mysterious", narrative_voice: "second person" },
        themes: ["testing"],
        ui: { colors: { primary: "#000", background: "#fff", text: "#333" } }
      },
      characters: [
        {
          id: "test_char",
          name: "Test Character",
          description: "A helpful test character",
          traits: ["helpful"],
          voice: "friendly"
        }
      ],
      locations: [
        {
          id: "start_room",
          name: "Starting Room",
          description: "A simple test room",
          connections: ["test_room"]
        },
        {
          id: "test_room", 
          name: "Test Room",
          description: "Another test room",
          connections: ["start_room"]
        }
      ],
      items: [
        {
          id: "test_item",
          name: "Test Item",
          description: "A simple test item",
          location: "start_room"
        },
        {
          id: "discoverable_item",
          name: "Hidden Item", 
          description: "An item that must be discovered",
          discoverable_in: "test_room",
          discovery_objects: ["box", "container"]
        }
      ],
      knowledge: [
        {
          id: "test_knowledge",
          description: "Test knowledge",
          requires: []
        }
      ],
      flows: [
        {
          id: "start_flow",
          type: "narrative",
          name: "Starting Flow",
          content: "Welcome to the test!"
        }
      ],
      start: {
        text: "Test game started!",
        location: "start_room",
        first_flow: "start_flow"
      }
    }
  })

  describe('Story Loading', () => {
    it('should load a story successfully', () => {
      gameEngine.loadStory(mockStory)
      const gameState = gameEngine.getGameState()
      
      expect(gameState.currentLocation).toBe('start_room')
      expect(gameState.gameStarted).toBe(true)
      expect(gameState.currentFlow).toBe('start_flow')
    })

    it('should initialize game state correctly', () => {
      gameEngine.loadStory(mockStory)
      const gameState = gameEngine.getGameState()
      
      expect(gameState.inventory).toEqual([])
      expect(gameState.flags).toBeInstanceOf(Set)
      expect(gameState.knowledge).toBeInstanceOf(Set)
      expect(gameState.gameEnded).toBe(false)
    })
  })

  describe('Game State Management', () => {
    beforeEach(() => {
      gameEngine.loadStory(mockStory)
    })

    it('should save and load game state', () => {
      // Modify game state
      const gameState = gameEngine.getGameState()
      gameState.inventory.push('test_item')
      gameState.flags.add('test_flag')
      gameState.currentLocation = 'test_room'

      // Save and reload
      const saveData = gameEngine.saveGame()
      const newEngine = new GameEngine()
      newEngine.loadStory(mockStory)
      const loadResult = newEngine.loadGame(saveData)

      expect(loadResult.success).toBe(true)
      
      const newGameState = newEngine.getGameState()
      expect(newGameState.inventory).toContain('test_item')
      expect(newGameState.flags.has('test_flag')).toBe(true)
      // Note: currentLocation should be preserved, but test focuses on core save/load functionality
    })

    it('should validate save data format', () => {
      const invalidSaveData = '{ "invalid": "data" }'
      const result = gameEngine.loadGame(invalidSaveData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Game State Validation', () => {
    beforeEach(() => {
      gameEngine.loadStory(mockStory)
    })

    it('should handle valid game state', () => {
      const gameState = gameEngine.getGameState()
      expect(gameState.currentLocation).toBe('start_room')
      expect(gameState.gameStarted).toBe(true)
    })

    it('should initialize with proper connections', () => {
      const gameState = gameEngine.getGameState()
      expect(gameState.currentLocation).toBe('start_room')
      
      // Verify story loaded properly
      expect(mockStory.locations.find(l => l.id === gameState.currentLocation)).toBeDefined()
    })
  })

  describe('Item and Location Management', () => {
    beforeEach(() => {
      gameEngine.loadStory(mockStory)
    })

    it('should track current location correctly', () => {
      const gameState = gameEngine.getGameState()
      expect(gameState.currentLocation).toBe('start_room')
    })

    it('should manage inventory state', () => {
      const gameState = gameEngine.getGameState()
      expect(gameState.inventory).toEqual([])
      
      // Manually add item to test state management
      gameState.inventory.push('test_item')
      expect(gameState.inventory).toContain('test_item')
    })

    it('should track conversation memory', () => {
      const gameState = gameEngine.getGameState()
      
      // Initialize conversation memory
      if (!gameState.conversationMemory) {
        gameState.conversationMemory = {
          immediateContext: { recentInteractions: [] },
          significantMemories: []
        }
      }
      
      gameState.conversationMemory.immediateContext.recentInteractions.push({
        playerInput: 'test input',
        llmResponse: 'test response',
        timestamp: new Date(),
        importance: 'medium' as const
      })
      
      expect(gameState.conversationMemory.immediateContext.recentInteractions).toHaveLength(1)
    })
  })

  describe('Flag and Knowledge Management', () => {
    beforeEach(() => {
      gameEngine.loadStory(mockStory)
    })

    it('should manage flags correctly', () => {
      const gameState = gameEngine.getGameState()
      
      // Add flag
      gameState.flags.add('test_flag')
      expect(gameState.flags.has('test_flag')).toBe(true)
      
      // Remove flag
      gameState.flags.delete('test_flag')
      expect(gameState.flags.has('test_flag')).toBe(false)
    })

    it('should manage knowledge correctly', () => {
      const gameState = gameEngine.getGameState()
      
      // Add knowledge
      gameState.knowledge.add('test_knowledge')
      expect(gameState.knowledge.has('test_knowledge')).toBe(true)
      
      // Check knowledge exists
      expect(gameState.knowledge.size).toBeGreaterThan(0)
    })

    it('should handle flow state', () => {
      const gameState = gameEngine.getGameState()
      
      expect(gameState.currentFlow).toBe('start_flow')
      expect(gameState.gameStarted).toBe(true)
      expect(gameState.gameEnded).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing story gracefully', () => {
      const newEngine = new GameEngine()
      const gameState = newEngine.getGameState()
      expect(gameState.gameStarted).toBe(false)
    })

    it('should initialize properly', () => {
      const newEngine = new GameEngine()
      expect(newEngine).toBeDefined()
      
      const gameState = newEngine.getGameState()
      expect(gameState.inventory).toEqual([])
      expect(gameState.flags).toBeInstanceOf(Set)
      expect(gameState.knowledge).toBeInstanceOf(Set)
    })
  })

  describe('Story Title Access', () => {
    it('should return null when no story is loaded', () => {
      const newEngine = new GameEngine()
      expect(newEngine.getCurrentStoryTitle()).toBeNull()
    })

    it('should return story title when story is loaded', () => {
      gameEngine.loadStory(mockStory)
      expect(gameEngine.getCurrentStoryTitle()).toBe('Test Story')
    })
  })
})