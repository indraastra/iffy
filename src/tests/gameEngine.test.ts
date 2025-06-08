import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../engine/gameEngine'
import { StoryParser } from '../engine/storyParser'
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
        }
      ],
      flows: [
        {
          id: "start",
          name: "Opening",
          type: "narrative",
          location: "start_room",
          content: "Welcome to the test story! This is where your adventure begins."
        }
      ]
    }
  })

  describe('Core Functionality', () => {
    it('should initialize with empty state', () => {
      const gameState = gameEngine.getGameState()
      
      expect(gameState.currentLocation).toBe('')
      expect(gameState.inventory).toEqual([])
      expect(gameState.flags.size).toBe(0)
      expect(gameState.gameStarted).toBe(false)
      expect(gameState.gameEnded).toBe(false)
    })

    it('should load a story successfully', () => {
      const result = gameEngine.loadStory(mockStory)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      const gameState = gameEngine.getGameState()
      expect(gameState.currentLocation).toBe('start_room')
      expect(gameState.gameStarted).toBe(true)
      expect(gameState.currentFlow).toBe('start')
    })

    it('should handle story without flows', () => {
      const badStory = { ...mockStory, flows: [] }
      const result = gameEngine.loadStory(badStory)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('missing required field')
    })

    it('should set starting location from first flow', () => {
      const result = gameEngine.loadStory(mockStory)
      expect(result.success).toBe(true)
      
      const gameState = gameEngine.getGameState()
      expect(gameState.currentLocation).toBe('start_room')
    })

    it('should fallback to first location if flow has no location', () => {
      const storyWithoutFlowLocation = {
        ...mockStory,
        flows: [{
          id: "start",
          name: "Opening", 
          type: "narrative" as const,
          content: "Welcome!"
        }]
      }
      
      const result = gameEngine.loadStory(storyWithoutFlowLocation)
      expect(result.success).toBe(true)
      
      const gameState = gameEngine.getGameState()
      expect(gameState.currentLocation).toBe('start_room') // First location
    })
  })

  describe('State Management', () => {
    beforeEach(() => {
      gameEngine.loadStory(mockStory)
    })

    it('should return current game state', () => {
      const gameState = gameEngine.getGameState()
      
      expect(gameState).toBeDefined()
      expect(gameState.currentLocation).toBe('start_room')
      expect(gameState.gameStarted).toBe(true)
      expect(Array.isArray(gameState.inventory)).toBe(true)
      expect(gameState.flags instanceof Set).toBe(true)
    })

    it('should track game state properties', () => {
      const gameState = gameEngine.getGameState()
      
      expect(gameState.gameStarted).toBe(true)
      expect(gameState.currentLocation).toBe('start_room')
      expect(gameState.currentFlow).toBe('start')
    })
  })

  describe('Initial Text Handling', () => {
    it('should return story content when loaded', () => {
      const testStory = {
        title: "Test Story",
        author: "Test",
        version: "1.0",
        metadata: { 
          setting: { time: "test", place: "test" },
          tone: { overall: "test", narrative_voice: "test" },
          themes: ["test"]
        },
        characters: [],
        locations: [{ id: "test", name: "Test", connections: [], description: "Test location" }],
        items: [],
        flows: [{
          id: "start",
          name: "Opening",
          type: "narrative" as const,
          location: "test",
          content: "Welcome to the test story!"
        }]
      };

      const result = gameEngine.loadStory(testStory);
      expect(result.success).toBe(true);

      const initialText = gameEngine.getInitialText();
      expect(initialText).toContain('Welcome to the test story!');
    });
  })

  describe('Game Start History', () => {
    it('should track start text in conversation memory', () => {
      // Track some start text
      const startText = "Welcome to the game! This is the beginning of your adventure."
      gameEngine.trackStartText(startText)
      
      // Get the game state
      const gameState = gameEngine.getGameState()
      
      // Check that conversation memory was created
      expect(gameState.conversationMemory).toBeDefined()
      expect(gameState.conversationMemory?.immediateContext.recentInteractions).toBeDefined()
      
      // Check that start text was added as the first interaction
      const interactions = gameState.conversationMemory!.immediateContext.recentInteractions
      expect(interactions).toHaveLength(1)
      expect(interactions[0].playerInput).toBe('[STORY START]')
      expect(interactions[0].llmResponse).toBe(startText)
      expect(interactions[0].importance).toBe('high')
    })

    it('should include start text in conversation context', () => {
      // Load a simple story
      const testStory = `
title: "Test Story"
author: "Test"
version: "1.0"

metadata:
  setting:
    time: "Present"
    place: "Test"
  tone:
    overall: "neutral"
    narrative_voice: "second person"
  themes: []
  ui:
    colors:
      primary: "#000"
      background: "#fff"
      text: "#333"

characters: []
locations:
  - id: "test_room"
    name: "Test Room"
    description: "A test room"
    connections: []

items: []

flows:
  - id: "start"
    name: "Opening"
    type: "narrative"
    location: "test_room"
    content: "Welcome to the test story! This is the beginning."
`
      
      const story = StoryParser.parseFromYaml(testStory)
      gameEngine.loadStory(story)
      
      // Track the start text
      const startText = gameEngine.getInitialText()
      gameEngine.trackStartText(startText)
      
      // Verify the start text was tracked
      const gameState = gameEngine.getGameState()
      const interactions = gameState.conversationMemory!.immediateContext.recentInteractions
      
      expect(interactions).toHaveLength(1)
      expect(interactions[0].llmResponse).toBe(startText)
      expect(interactions[0].playerInput).toBe('[STORY START]')
    })

    it('should maintain start text at beginning of interactions list', () => {
      // Track start text first
      const startText = "This is the start of the story."
      gameEngine.trackStartText(startText)
      
      // Add some regular interactions (simulating normal game play)
      const gameState = gameEngine.getGameState()
      gameState.conversationMemory!.immediateContext.recentInteractions.push({
        playerInput: "look around",
        llmResponse: "You see a room.",
        timestamp: new Date(),
        importance: 'low'
      })
      
      // Start text should still be first
      const interactions = gameState.conversationMemory!.immediateContext.recentInteractions
      expect(interactions[0].playerInput).toBe('[STORY START]')
      expect(interactions[0].llmResponse).toBe(startText)
      expect(interactions[1].playerInput).toBe("look around")
    })
  })

  describe('Initial Text', () => {
    it('should provide initial text from loaded story', () => {
      const result = gameEngine.loadStory(mockStory)
      expect(result.success).toBe(true)
      
      const initialText = gameEngine.getInitialText()
      expect(initialText).toBeDefined()
      expect(typeof initialText).toBe('string')
      expect(initialText.length).toBeGreaterThan(0)
    })

    it('should return message when no story loaded', () => {
      const emptyEngine = new GameEngine()
      const initialText = emptyEngine.getInitialText()
      expect(initialText).toContain('No story loaded')
    })
  })
})