import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnthropicService } from '../services/anthropicService'
import { GamePromptBuilder } from '../engine/gamePromptBuilder'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              action: 'examine',
              reasoning: 'Player wants to look at something',
              stateChanges: {
                newLocation: null,
                addToInventory: [],
                removeFromInventory: [],
                setFlags: [],
                unsetFlags: [],
                addKnowledge: []
              },
              response: 'You examine the object carefully.'
            })
          }]
        })
      }
    }))
  }
})

describe('AnthropicService', () => {
  let service: AnthropicService
  let promptBuilder: GamePromptBuilder
  let mockStory: any
  let mockGameState: any
  let mockLocation: any

  beforeEach(() => {
    service = new AnthropicService()
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

  describe('Configuration', () => {
    it('should start unconfigured', () => {
      expect(service.isConfigured()).toBe(false)
    })

    it('should configure with API key', () => {
      service.setApiKey('test-api-key')
      expect(service.isConfigured()).toBe(true)
    })

    it('should store API key in localStorage', () => {
      service.setApiKey('test-api-key')
      expect(localStorage.setItem).toHaveBeenCalledWith('iffy_api_key', 'test-api-key')
    })
  })

  describe('Generic API Integration', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key')
    })

    it('should send prompts and return responses', async () => {
      const response = await service.sendPrompt('test prompt')
      expect(response).toBeDefined()
      expect(typeof response).toBe('string')
    })

    it('should process commands with prompt builder and parser', async () => {
      const result = await service.processCommand(
        'examine the room',
        mockGameState,
        mockStory,
        mockLocation,
        promptBuilder,
        promptBuilder
      )

      expect(result).toBeDefined()
      expect(result.action).toBe('examine')
      expect(result.response).toBe('You examine the object carefully.')
    })

    it('should handle API errors gracefully', async () => {
      const unconfiguredService = new AnthropicService()
      
      const result = await unconfiguredService.processCommand(
        'test command',
        mockGameState,
        mockStory,
        mockLocation,
        promptBuilder,
        promptBuilder
      )

      expect(result.action).toBe('error')
      expect(result.error).toBeDefined()
    })
  })

  describe('Debug Callback', () => {
    it('should call debug callback when set', async () => {
      const mockCallback = vi.fn()
      service.setDebugCallback(mockCallback)
      service.setApiKey('test-api-key')
      
      await service.processCommand(
        'test command',
        mockGameState,
        mockStory,
        mockLocation,
        promptBuilder,
        promptBuilder
      )
      
      expect(mockCallback).toHaveBeenCalled()
    })
  })
})