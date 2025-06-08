import { describe, it, expect, beforeEach } from 'vitest'
import { GamePromptBuilder } from '../engine/gameEngineLlmAdapter'

describe('GamePromptBuilder', () => {
  let promptBuilder: GamePromptBuilder
  let mockStory: any
  let mockGameState: any
  let mockLocation: any

  beforeEach(() => {
    promptBuilder = new GamePromptBuilder()
    
    mockStory = {
      title: "Test Story",
      author: "Test Author",
      metadata: {
        tone: { overall: "mysterious", narrative_voice: "second person" }
      },
      characters: [
        { id: "char1", name: "Test Character", traits: ["helpful"], voice: "friendly" }
      ],
      locations: [
        { 
          id: "room1", 
          name: "Test Room", 
          description: "A test room",
          connections: ["room2"]
        }
      ],
      items: [
        { 
          id: "item1", 
          name: "Test Item",
          location: "room1"
        },
        {
          id: "item2",
          name: "Hidden Item", 
          discoverable_in: "room1",
          discovery_objects: ["shelf", "box"]
        }
      ],
      flows: [
        { id: "flow1", name: "Test Flow", type: "narrative", ends_game: false }
      ]
    }

    mockGameState = {
      currentLocation: "room1",
      inventory: ["existing_item"],
      flags: new Set(["test_flag"]),
      knowledge: new Set(["test_knowledge"]),
      currentFlow: "flow1",
      gameStarted: true,
      gameEnded: false,
      conversationMemory: {
        immediateContext: {
          recentInteractions: [
            {
              playerInput: "look around",
              llmResponse: "You see a room",
              timestamp: new Date(),
              importance: "medium"
            }
          ]
        },
        significantMemories: []
      }
    }

    mockLocation = {
      id: "room1",
      name: "Test Room",
      connections: ["room2"]
    }
  })

  describe('Prompt Building', () => {
    it('should build comprehensive prompt', () => {
      const prompt = promptBuilder.buildPrompt(
        'examine the room',
        mockGameState,
        mockStory,
        mockLocation
      )

      // Check for all major sections
      expect(prompt).toContain('STORY: Test Story')
      expect(prompt).toContain('STATE:')
      expect(prompt).toContain('Location: Test Room')
      expect(prompt).toContain('Inventory: existing_item')
      expect(prompt).toContain('LOCATIONS:')
      expect(prompt).toContain('NPC CHARACTERS: Test Character')
      expect(prompt).toContain('CURRENT FLOW CONTEXT:')
      expect(prompt).toContain('CONVERSATION MEMORY:')
      expect(prompt).toContain('DISCOVERY STATUS:')
      expect(prompt).toContain('MARKUP:')
      expect(prompt).toContain('PLAYER COMMAND: "examine the room"')
      expect(prompt).toContain('RULES:')
    })

    it('should include natural language rules', () => {
      const prompt = promptBuilder.buildPrompt(
        'test command',
        mockGameState, 
        mockStory,
        mockLocation
      )

      expect(prompt).toContain('Interpret natural language commands flexibly')
      expect(prompt).toContain('NEVER demand specific syntax')
      expect(prompt).toContain('Allow reasonable interactions with objects/appliances')
    })

    it('should include discoverable items information', () => {
      const prompt = promptBuilder.buildPrompt(
        'test command',
        mockGameState,
        mockStory,
        mockLocation
      )

      expect(prompt).toContain('Discoverable: Hidden Item (search: shelf/box)')
    })

    it('should handle empty inventory', () => {
      mockGameState.inventory = []
      
      const prompt = promptBuilder.buildPrompt(
        'test command',
        mockGameState,
        mockStory,
        mockLocation
      )

      expect(prompt).toContain('Inventory: Empty')
    })

    it('should handle game completion state', () => {
      mockGameState.gameEnded = true
      mockGameState.endingId = 'test_ending'
      mockStory.endings = [
        { 
          id: 'test_ending', 
          name: 'Test Ending',
          requires: ['test_flag']
        }
      ]
      
      const prompt = promptBuilder.buildPrompt(
        'reflect on ending',
        mockGameState,
        mockStory,
        mockLocation
      )

      expect(prompt).toContain('GAME COMPLETED:')
      expect(prompt).toContain('Ending Achieved: Test Ending')
    })
  })

  describe('Response Parsing', () => {
    it('should parse valid JSON response', () => {
      const jsonResponse = JSON.stringify({
        action: 'look',
        reasoning: 'Player wants to examine',
        stateChanges: {
          newLocation: null,
          addToInventory: [],
          removeFromInventory: [],
          setFlags: ['examined_room'],
          unsetFlags: [],
          addKnowledge: []
        },
        response: 'You look around the room.'
      })

      const parsed = promptBuilder.parseResponse(jsonResponse)
      
      expect(parsed.action).toBe('look')
      expect(parsed.reasoning).toBe('Player wants to examine')
      expect(parsed.stateChanges.setFlags).toEqual(['examined_room'])
      expect(parsed.response).toBe('You look around the room.')
    })

    it('should handle malformed JSON gracefully', () => {
      const invalidJson = '{ "action": "look", invalid json }'
      
      const parsed = promptBuilder.parseResponse(invalidJson)
      
      // Should return a graceful error response instead of throwing
      expect(parsed.action).toBe('other')
      expect(parsed.response).toContain('trouble understanding')
    })

    it('should provide default values for optional fields', () => {
      const minimalResponse = JSON.stringify({
        action: 'look',
        response: 'You look around.',
        stateChanges: {} // Include minimal stateChanges
      })

      const parsed = promptBuilder.parseResponse(minimalResponse)
      
      expect(parsed.reasoning).toBe('')
      expect(parsed.stateChanges.addToInventory).toEqual([])
      expect(parsed.stateChanges.setFlags).toEqual([])
    })
  })

  describe('Conversation Context', () => {
    it('should format conversation memory', () => {
      const context = promptBuilder['getConversationContext'](mockGameState)
      
      expect(context).toContain('Recent Conversation History')
      expect(context).toContain('Player: "look around"')
      expect(context).toContain('Response: "You see a room"')
    })

    it('should handle missing conversation memory', () => {
      delete mockGameState.conversationMemory
      
      const context = promptBuilder['getConversationContext'](mockGameState)
      
      expect(context).toBe('No recent conversation history.')
    })

    it('should include importance markers', () => {
      mockGameState.conversationMemory.immediateContext.recentInteractions[0].importance = 'high'
      
      const context = promptBuilder['getConversationContext'](mockGameState)
      
      expect(context).toContain('[Importance: high]')
    })
  })

  describe('Flow Context', () => {
    it('should format current flow context', () => {
      const context = promptBuilder['getCurrentFlowContext'](mockStory, mockGameState)
      
      expect(context).toContain('Active Flow: Test Flow (narrative)')
    })

    it('should handle missing current flow', () => {
      mockGameState.currentFlow = null
      
      const context = promptBuilder['getCurrentFlowContext'](mockStory, mockGameState)
      
      expect(context).toBe('No active flow')
    })

    it('should handle dialogue flows', () => {
      mockStory.flows[0].type = 'dialogue'
      mockStory.flows[0].participants = ['char1']
      mockStory.flows[0].player_goal = 'Talk to character'
      
      const context = promptBuilder['getCurrentFlowContext'](mockStory, mockGameState)
      
      expect(context).toContain('Active Flow: Test Flow (dialogue)')
      expect(context).toContain('Participants: char1')
      expect(context).toContain('Player Goal: Talk to character')
    })
  })

  describe('Time Formatting', () => {
    it('should format recent timestamps', () => {
      const now = new Date()
      const result = promptBuilder['getTimeAgo'](now)
      expect(result).toBe('just now')
    })

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const result = promptBuilder['getTimeAgo'](fiveMinutesAgo)
      expect(result).toBe('5 mins ago')
    })

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const result = promptBuilder['getTimeAgo'](twoHoursAgo)
      expect(result).toBe('2 hours ago')
    })
  })
})