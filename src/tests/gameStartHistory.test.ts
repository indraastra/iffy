import { describe, it, expect } from 'vitest'
import { GameEngine } from '../engine/gameEngine'
import { StoryParser } from '../engine/storyParser'

describe('Game Start History', () => {
  it('should track start text in conversation memory', () => {
    const gameEngine = new GameEngine()
    
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
    const gameEngine = new GameEngine()
    
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
knowledge: []
flows: []

start:
  content: "Welcome to the test story! This is the beginning."
  location: "test_room"
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
    const gameEngine = new GameEngine()
    
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