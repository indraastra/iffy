import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnthropicService } from '../services/anthropicService'
import { GamePromptBuilder } from '../engine/gameEngineLlmAdapter'

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

    it('should send prompts and return raw text', async () => {
      const prompt = promptBuilder.buildPrompt(
        'examine the room',
        mockGameState,
        mockStory,
        mockLocation
      )
      
      const response = await service.sendPrompt(prompt)
      expect(response).toBeDefined()
      expect(typeof response).toBe('string')
      
      // Parse the response using the prompt builder
      const parsed = promptBuilder.parseResponse(response)
      expect(parsed.action).toBe('examine')
      expect(parsed.response).toBe('You examine the object carefully.')
    })

    it('should handle API errors gracefully', async () => {
      const unconfiguredService = new AnthropicService()
      
      try {
        await unconfiguredService.sendPrompt('test prompt')
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Anthropic API not configured')
      }
    })
  })

  describe('Debug Callback', () => {
    it('should call debug callback when set', async () => {
      const mockCallback = vi.fn()
      service.setDebugCallback(mockCallback)
      service.setApiKey('test-api-key')
      
      await service.sendPrompt('test prompt')
      
      expect(mockCallback).toHaveBeenCalled()
    })
  })
})