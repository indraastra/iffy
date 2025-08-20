import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistStory } from '@/types/impressionistStory';

describe('Transition Integration Test', () => {
  let engine: ImpressionistEngine;
  let mockService: any;
  let uiMessages: { text: string; type: string }[] = [];

  beforeEach(() => {
    uiMessages = [];
    
    // Mock LLM service to simulate realistic flag-setting responses
    let callCount = 0;
    mockService = {
      isConfigured: vi.fn().mockReturnValue(true),
      makeStructuredRequest: vi.fn().mockImplementation(() => {
        callCount++;
        
        if (callCount === 1) {
          // First call: "open door" - sets door_opened flag only
          return Promise.resolve({
            data: {
              reasoning: "Opening the door as requested",
              narrativeParts: ["You turn the handle and push the door open. It swings smoothly on its hinges."],
              memories: ["Player opened the door"],
              importance: 5,
              flagChanges: { set: ["door_opened"], unset: [] }
            }
          });
        } else if (callCount === 2) {
          // Second call: "get ready to leave" - sets ready_to_leave flag, triggers transition
          return Promise.resolve({
            data: {
              reasoning: "Player is getting ready to leave",
              narrativeParts: ["You take a moment to gather yourself and prepare to leave."],
              memories: ["Player is ready to leave"],
              importance: 5,
              flagChanges: { set: ["ready_to_leave"], unset: [] }
            }
          });
        } else if (callCount === 3) {
          // Third call: transition narrative (with handoff)
          return Promise.resolve({
            data: {
              reasoning: "Transitioning to hallway with narrative handoff",
              narrativeParts: [
                "You take a moment to gather yourself and prepare to leave.",
                "With the door open and your preparations complete, you step through the doorway.",
                "You find yourself in the hallway. The transition worked perfectly!"
              ],
              memories: ["Player successfully transitioned to hallway"],
              importance: 7,
              flagChanges: { set: [], unset: [] }
            }
          });
        }
        
        return Promise.resolve({
          data: {
            reasoning: "Fallback response",
            narrativeParts: ["Something happened."],
            memories: [],
            importance: 3,
            flagChanges: { set: [], unset: [] }
          }
        });
      })
    };

    engine = new ImpressionistEngine(mockService);
    
    // Capture UI messages
    engine.setUIAddMessageCallback((text: string, type: string) => {
      uiMessages.push({ text, type });
    });
  });

  it('should complete the transition test story with narrative handoff', async () => {
    // Load the transition test story
    const transitionStory: ImpressionistStory = {
      title: 'Transition Test',
      author: 'Test',
      blurb: 'Testing transitions',
      version: '1.0',
      context: 'Test context',
      guidance: 'Test guidance',
      flags: {
        door_opened: { default: false, description: 'when door is opened' },
        ready_to_leave: { default: false, description: 'when ready to leave' }
      },
      scenes: {
        room: {
          sketch: 'You are in a room with a door to the east.',
          transitions: {
            hallway: {
              requires: { all_of: ['door_opened', 'ready_to_leave'] }
            }
          }
        },
        hallway: {
          sketch: 'You are in the hallway. The transition worked!'
        }
      },
      endings: { variations: [] }
    };

    const loadResult = engine.loadStory(transitionStory);
    expect(loadResult.success).toBe(true);

    // Initial scene should be 'room'
    let gameState = engine.getGameState();
    expect(gameState.currentScene).toBe('room');

    // Action 1: "open door" - should set door_opened flag but NOT transition
    await engine.processAction({ input: 'open door' });
    
    gameState = engine.getGameState();
    expect(gameState.currentScene).toBe('room'); // Still in room
    expect(uiMessages).toHaveLength(1);
    expect(uiMessages[0].text).toContain('door open');

    // Verify LLM was called once for action
    expect(mockService.makeStructuredRequest).toHaveBeenCalledTimes(1);

    // Action 2: "get ready to leave" - should set ready_to_leave AND trigger transition
    await engine.processAction({ input: 'get ready to leave' });
    
    gameState = engine.getGameState();
    expect(gameState.currentScene).toBe('hallway'); // Should have transitioned!
    
    // Should have 2 UI messages total (first action + transition with handoff)
    expect(uiMessages).toHaveLength(2);
    
    // Second message should be the transition with narrative handoff
    expect(uiMessages[1].text).toContain('gather yourself');
    expect(uiMessages[1].text).toContain('step through');
    expect(uiMessages[1].text).toContain('hallway');
    
    // Verify LLM was called twice more (action + transition)
    expect(mockService.makeStructuredRequest).toHaveBeenCalledTimes(3);
    
    console.log('✅ Transition test completed successfully');
    console.log('Final scene:', gameState.currentScene);
    console.log('UI messages:', uiMessages.length);
    console.log('Message 1:', uiMessages[0]?.text.substring(0, 50) + '...');
    console.log('Message 2:', uiMessages[1]?.text.substring(0, 50) + '...');
  });

  it('should handle the complete flow with proper flag management', async () => {
    // This test ensures our flag requirements and narrative handoff work together
    const storyWithRequirements: ImpressionistStory = {
      title: 'Flag Requirements Test',
      author: 'Test',
      blurb: 'Testing flag requirements',
      version: '1.0',
      context: 'Test context',
      guidance: 'Test guidance',
      flags: {
        door_opened: { default: false, description: 'when door is opened' },
        ready_to_leave: { 
          default: false, 
          description: 'when ready to leave',
          requires: { all_of: ['door_opened'] } // Can only be ready if door is open
        }
      },
      scenes: {
        room: {
          sketch: 'Room with door',
          transitions: {
            hallway: {
              requires: { all_of: ['door_opened', 'ready_to_leave'] }
            }
          }
        },
        hallway: { sketch: 'Hallway' }
      },
      endings: { variations: [] }
    };

    engine.loadStory(storyWithRequirements);

    // Try to set ready_to_leave without door_opened first (should fail)
    await engine.processAction({ input: 'get ready to leave' });
    
    let gameState = engine.getGameState();
    expect(gameState.currentScene).toBe('room'); // Should still be in room
    
    // Now open door first
    await engine.processAction({ input: 'open door' });
    
    // Now try to get ready (should work and trigger transition)  
    await engine.processAction({ input: 'get ready to leave' });
    
    gameState = engine.getGameState();
    expect(gameState.currentScene).toBe('hallway'); // Should have transitioned
    
    console.log('✅ Flag requirements integration test completed');
  });
});