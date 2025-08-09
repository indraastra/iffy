import { StateManager } from './StateManager.js';
import { ConditionEvaluator } from './ConditionEvaluator.js';
import { ContentGenerator } from './ContentGenerator.js';
import { EffectApplicator } from './EffectApplicator.js';
import { 
  ChoiceDrivenStory, 
  GameSession, 
  GeneratedContent, 
  GameTurn,
  ContentGenerationContext
} from '../../types/choiceDrivenStory.js';

export class FlowController {
  private stateManager: StateManager;
  private conditionEvaluator: ConditionEvaluator;
  private contentGenerator: ContentGenerator;
  private effectApplicator: EffectApplicator;
  private session: GameSession;

  constructor(
    story: ChoiceDrivenStory,
    contentGenerator: ContentGenerator
  ) {
    // Initialize state management
    this.stateManager = new StateManager(story.initial_state);
    this.conditionEvaluator = new ConditionEvaluator(this.stateManager.getState());
    this.effectApplicator = new EffectApplicator(this.stateManager);
    this.contentGenerator = contentGenerator;

    // Initialize game session
    this.session = {
      story,
      currentState: this.stateManager.getState(),
      history: [],
      isComplete: false
    };
  }

  // Get current game session state
  getSession(): GameSession {
    return { ...this.session };
  }

  // Start or continue the game - returns content for current scene
  async playTurn(): Promise<GeneratedContent> {
    if (this.session.isComplete) {
      throw new Error('Game is already complete');
    }

    // Check for ending conditions first
    const endingId = this.checkEndingConditions();
    if (endingId) {
      return this.triggerEnding(endingId);
    }

    // Determine available scenes
    const availableScenes = this.getAvailableScenes();
    if (availableScenes.length === 0) {
      // Force ending if no scenes available
      return this.forceEnding();
    }

    // Select the most appropriate scene (for now, just use the first available)
    const selectedSceneId = this.selectScene(availableScenes);
    this.session.currentScene = selectedSceneId;

    // Generate content for the scene
    const context: ContentGenerationContext = {
      story: this.session.story,
      currentState: this.session.currentState,
      sceneId: selectedSceneId,
      scene: this.session.story.scenes[selectedSceneId],
      history: this.session.history
    };

    const content = await this.contentGenerator.generateContent(context);
    return content;
  }

  // Apply a choice and advance the game state
  async makeChoice(choiceIndex: number, currentContent: GeneratedContent): Promise<{ newState: any; isComplete: boolean; endingTriggered?: string }> {
    if (this.session.isComplete) {
      throw new Error('Game is already complete');
    }

    if (choiceIndex < 0 || choiceIndex >= currentContent.choices.length) {
      throw new Error(`Invalid choice index: ${choiceIndex}`);
    }

    const choice = currentContent.choices[choiceIndex];

    // Apply choice effects to state
    const newState = this.effectApplicator.applyChoice(choice);
    this.session.currentState = newState;

    // Update condition evaluator with new state
    this.conditionEvaluator.updateState(newState);

    // Record this turn in history
    const turn: GameTurn = {
      sceneId: this.session.currentScene || 'unknown',
      content: currentContent,
      choiceIndex,
      stateAfter: newState,
      timestamp: new Date()
    };
    this.session.history.push(turn);

    // Check for ending conditions after choice
    const endingId = this.checkEndingConditions();
    if (endingId) {
      this.session.isComplete = true;
      this.session.endingTriggered = endingId;
      return { newState, isComplete: true, endingTriggered: endingId };
    }

    return { newState, isComplete: false };
  }

  // Get available scenes based on current state
  private getAvailableScenes(): string[] {
    const available: string[] = [];

    for (const [sceneId, scene] of Object.entries(this.session.story.scenes)) {
      try {
        if (this.conditionEvaluator.evaluate(scene.available_when)) {
          available.push(sceneId);
        }
      } catch (error) {
        console.warn(`Error evaluating condition for scene ${sceneId}:`, error);
      }
    }

    return available;
  }

  // Select the most appropriate scene from available options
  private selectScene(availableScenes: string[]): string {
    // For MVP, just return the first available scene
    // In a full implementation, you might use LLM to select the most narratively appropriate
    return availableScenes[0];
  }

  // Check if any ending conditions are met
  private checkEndingConditions(): string | null {
    for (const [endingId, ending] of Object.entries(this.session.story.endings)) {
      try {
        if (this.conditionEvaluator.evaluate(ending.condition)) {
          return endingId;
        }
      } catch (error) {
        console.warn(`Error evaluating ending condition for ${endingId}:`, error);
      }
    }
    return null;
  }

  // Generate ending content
  private async triggerEnding(endingId: string): Promise<GeneratedContent> {
    this.session.isComplete = true;
    this.session.endingTriggered = endingId;

    const ending = this.session.story.endings[endingId];
    
    // Generate ending narrative
    const endingNarrative = `The story concludes with a ${ending.tone} ending. Your choices have led to: ${endingId}`;

    return {
      narrative: endingNarrative,
      choices: [
        {
          text: "Start over",
          effects: {},
          next: "restart"
        },
        {
          text: "End game",
          effects: {},
          next: "end"
        }
      ]
    };
  }

  // Force an ending when no scenes are available
  private async forceEnding(): Promise<GeneratedContent> {
    this.session.isComplete = true;
    this.session.endingTriggered = 'forced_ending';

    return {
      narrative: "The story reaches an unexpected conclusion. No more scenes are available to continue the narrative.",
      choices: [
        {
          text: "Start over",
          effects: {},
          next: "restart"
        }
      ]
    };
  }

  // Reset the game to initial state
  restart(): void {
    this.stateManager.reset(this.session.story.initial_state);
    this.session.currentState = this.stateManager.getState();
    this.conditionEvaluator.updateState(this.session.currentState);
    this.session.history = [];
    this.session.isComplete = false;
    this.session.endingTriggered = undefined;
    this.session.currentScene = undefined;
  }

  // Get debug information
  getDebugInfo(): {
    currentState: any;
    availableScenes: string[];
    endingConditions: { [key: string]: boolean };
    history: GameTurn[];
  } {
    const availableScenes = this.getAvailableScenes();
    const endingConditions: { [key: string]: boolean } = {};
    
    for (const [endingId, ending] of Object.entries(this.session.story.endings)) {
      try {
        endingConditions[endingId] = this.conditionEvaluator.evaluate(ending.condition);
      } catch {
        endingConditions[endingId] = false;
      }
    }

    return {
      currentState: this.session.currentState,
      availableScenes,
      endingConditions,
      history: this.session.history
    };
  }
}