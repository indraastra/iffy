import { describe, it, expect, vi } from 'vitest';
import { EmergentEngine } from '../engines/emergent/EmergentEngine.js';
import { 
  NarrativeOutline, 
  StoryBlueprint, 
  StoryScene, 
  StoryBeat 
} from '../types/emergentStory.js';

// --- Mocks for the three-tier generator system ---

const mockBlueprint: StoryBlueprint = {
  title: 'Mock Story',
  setting: { world: 'A mock world', tone: 'mocking', time_period: 'mock o\'clock' },
  scene_sequence: [
    { 
      id: 'scene_1', 
      goal: 'Start the story', 
      narrative: 'The adventure begins with our hero facing a choice',
      location: 'Starting location',
      characters: ['hero'],
      dramatic_function: 'exposition' 
    },
    { 
      id: 'scene_2', 
      goal: 'End the story', 
      narrative: 'The adventure concludes with resolution',
      location: 'Ending location', 
      characters: ['hero'],
      dramatic_function: 'resolution' 
    },
  ],
  potential_endings: [
    { id: 'ending_good', title: 'Good Ending', description: 'You did it!', tone: 'happy' },
  ],
  blanks: ['character_identity', 'background_story'],
};

const mockScene1: StoryScene = {
  id: 'scene_1',
  goal: 'Start the story',
  requirements: [
    { key_to_update: 'progress', description: 'Make some progress' },
  ],
  blanks: ['character_identity'],
  transitions: [
    { target: 'scene_2', condition: 'progress >= 1' },
    { target: 'scene_2', condition: 'continue' },
  ],
};

const mockBeat1: StoryBeat = {
  narrative_text: 'This is the first beat.',
  choices: [
    { text: 'Make progress', effects: { progress: 1 } },
    { text: 'Do nothing', effects: { progress: 0 } },
  ],
};

const mockScene2: StoryScene = {
  id: 'scene_2',
  goal: 'End the story',
  requirements: [],
  blanks: [],
  transitions: [
    { target: 'ending_good', condition: 'continue' },
  ],
};

// Mock the generators
vi.mock('../engines/emergent/BlueprintGenerator.js', () => ({
  BlueprintGenerator: vi.fn().mockImplementation(() => ({
    generateBlueprint: vi.fn().mockResolvedValue(mockBlueprint),
  })),
}));

vi.mock('../engines/emergent/SceneGenerator.js', () => ({
  SceneGenerator: vi.fn().mockImplementation(() => ({
    generateScene: vi.fn()
      .mockImplementation((context) => {
        if (context.blueprintScene.id === 'scene_1') return Promise.resolve(mockScene1);
        if (context.blueprintScene.id === 'scene_2') return Promise.resolve(mockScene2);
        return Promise.reject(new Error('Unknown mock scene'));
      }),
  })),
}));

vi.mock('../engines/emergent/BeatGenerator.js', () => ({
  BeatGenerator: vi.fn().mockImplementation(() => ({
    generateBeat: vi.fn().mockResolvedValue(mockBeat1),
    generateBlankFillingBeat: vi.fn().mockResolvedValue(mockBeat1),
  })),
}));

describe('Refactored EmergentEngine', () => {

  const mockLlmService = {} as any; // No longer needs to be a full mock
  const mockNarrative: NarrativeOutline = { title: 'Test', markdown: '' };

  it('should initialize and generate the first beat', async () => {
    const onBeatReady = vi.fn();
    const engine = new EmergentEngine(mockLlmService, { onBeatReady });

    await engine.startNewGame(mockNarrative);

    expect(onBeatReady).toHaveBeenCalledOnce();
    expect(onBeatReady).toHaveBeenCalledWith(mockBeat1);

    const session = engine.getSession();
    expect(session?.currentSceneId).toBe('scene_1');
    expect(session?.currentState).toEqual({});
  });

  it('should process a choice, update state, and get the next beat', async () => {
    const onBeatReady = vi.fn();
    const engine = new EmergentEngine(mockLlmService, { onBeatReady });
    await engine.startNewGame(mockNarrative);

    // Player makes the first choice
    const choice = mockBeat1.choices[0]; // The one that sets progress to 1
    await engine.makeChoice(choice);

    const session = engine.getSession();
    expect(session?.currentState.progress).toBe(1);
    
    // Since progress is now 1, the transition to scene_2 should have happened.
    expect(session?.currentSceneId).toBe('scene_2');

    // The engine should have automatically fetched the first beat of the new scene.
    // In this test, mockScene2 has no requirements, so no new beat is generated.
    // We can verify that the onBeatReady was not called a second time for the empty scene.
    expect(onBeatReady).toHaveBeenCalledOnce(); 
  });

  it('should trigger a game complete event when an ending is reached', async () => {
    const onGameComplete = vi.fn();
    const engine = new EmergentEngine(mockLlmService, { onGameComplete });
    await engine.startNewGame(mockNarrative);

    // 1. Make choice to advance to scene 2
    const choice1 = mockBeat1.choices[0];
    await engine.makeChoice(choice1);
    let session = engine.getSession();
    expect(session?.currentSceneId).toBe('scene_2');

    // 2. Scene 2 has no requirements, so the next call to makeChoice with a null/system choice
    // should trigger the default 'continue' transition to the ending.
    await engine.makeChoice({ text: 'Continue', effects: {} }); // Simulate a continue action

    session = engine.getSession();
    expect(onGameComplete).toHaveBeenCalledOnce();
    expect(onGameComplete).toHaveBeenCalledWith('ending_good', session);
    expect(session?.isComplete).toBe(true);
    expect(session?.endingTriggered).toBe('ending_good');
  });

  it('should handle errors gracefully', async () => {
    const onError = vi.fn();
    
    // Create a separate engine with a mock that throws an error
    const errorMockLlmService = {} as any;
    
    const errorSequenceController = {
      startNewGame: vi.fn().mockRejectedValue(new Error('Blueprint Failed'))
    };
    
    // Mock the SequenceController constructor to throw an error
    const originalConsole = console.error;
    console.error = vi.fn(); // Suppress error logging for this test
    
    const engine = new EmergentEngine(errorMockLlmService, { onError });
    
    // Replace the sequence controller with one that will fail
    (engine as any).sequenceController = errorSequenceController;

    await engine.startNewGame(mockNarrative);

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toBe('Blueprint Failed');
    
    console.error = originalConsole; // Restore console
  });
});