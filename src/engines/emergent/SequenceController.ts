import { StateManager } from './StateManager.js';
import { ConditionEvaluator } from './ConditionEvaluator.js';
import { EffectApplicator } from './EffectApplicator.js';
import { 
  CompiledStoryStructure, 
  EmergentGameSession, 
  GeneratedContent, 
  GameTurn,
  ContentGenerationContext,
  SceneDefinition,
  NarrativeOutline
} from '../../types/emergentStory.js';
import { DebugTracker } from './DebugTracker.js';

export class SequenceController {
  private stateManager: StateManager;
  private conditionEvaluator: ConditionEvaluator;
  private effectApplicator: EffectApplicator;
  private session: EmergentGameSession;
  private debugTracker?: DebugTracker;

  constructor(
    narrativeOutline: NarrativeOutline,
    compiledStructure: CompiledStoryStructure,
    debugTracker?: DebugTracker
  ) {
    // Initialize state management
    this.stateManager = new StateManager(compiledStructure.initial_state);
    this.conditionEvaluator = new ConditionEvaluator(this.stateManager.getState());
    this.effectApplicator = new EffectApplicator(this.stateManager);
    this.debugTracker = debugTracker;

    // Initialize game session
    this.session = {
      narrativeOutline,
      compiledStructure,
      currentState: this.stateManager.getState(),
      currentSceneIndex: 0,
      history: [],
      isComplete: false
    };
    
    // Add scene progression info to initial state
    this.addSceneProgressionToState();
    
    // Track initial state
    this.debugTracker?.trackStateChange(
      'initialization',
      {},
      this.session.currentState
    );
  }

  // Get current game session
  getSession(): EmergentGameSession {
    return { ...this.session };
  }

  // Get current scene definition
  getCurrentScene(): SceneDefinition | null {
    if (this.session.currentSceneIndex >= this.session.compiledStructure.scene_sequence.length) {
      return null;
    }
    return this.session.compiledStructure.scene_sequence[this.session.currentSceneIndex];
  }

  // Check if we should advance to next scene
  shouldAdvanceScene(content: GeneratedContent): boolean {
    return content.scene_complete === true;
  }

  // Advance to next scene in sequence
  advanceToNextScene(): boolean {
    if (this.session.currentSceneIndex < this.session.compiledStructure.scene_sequence.length - 1) {
      this.session.currentSceneIndex++;
      // Update scene progression info in state
      this.addSceneProgressionToState();
      return true;
    }
    return false; // No more scenes
  }

  // Add scene progression information to the game state
  private addSceneProgressionToState(): void {
    const currentScene = this.getCurrentScene();
    const totalScenes = this.session.compiledStructure.scene_sequence.length;
    
    // Add scene tracking variables that ending conditions can reference
    this.stateManager.setValue('scene_count', this.session.currentSceneIndex + 1);
    this.stateManager.setValue('scenes_completed', this.session.currentSceneIndex);
    this.stateManager.setValue('total_scenes', totalScenes);
    this.stateManager.setValue('current_scene_id', currentScene?.id || 'unknown');
    
    // Add boolean flags for major progression milestones
    this.stateManager.setValue('in_opening_act', this.session.currentSceneIndex === 0);
    this.stateManager.setValue('past_opening', this.session.currentSceneIndex > 0);
    this.stateManager.setValue('in_middle_act', this.session.currentSceneIndex > 0 && this.session.currentSceneIndex < totalScenes - 1);
    this.stateManager.setValue('in_final_act', this.session.currentSceneIndex === totalScenes - 1);
    this.stateManager.setValue('story_nearly_complete', this.session.currentSceneIndex >= Math.max(1, totalScenes - 2));
    
    // Update session state reference
    this.session.currentState = this.stateManager.getState();
    this.conditionEvaluator.updateState(this.session.currentState);
  }

  // Apply choice effects and update state
  applyChoice(choiceIndex: number, currentContent: GeneratedContent): { 
    newState: any; 
    sceneAdvanced: boolean; 
    isComplete: boolean; 
    endingTriggered?: string 
  } {
    if (this.session.isComplete) {
      throw new Error('Game is already complete');
    }

    if (choiceIndex < 0 || choiceIndex >= currentContent.choices.length) {
      throw new Error(`Invalid choice index: ${choiceIndex}`);
    }

    const choice = currentContent.choices[choiceIndex];
    const previousState = this.session.currentState;

    // Apply choice effects
    const newState = this.effectApplicator.applyChoice(choice);
    this.session.currentState = newState;
    this.conditionEvaluator.updateState(newState);

    // Track state change
    this.debugTracker?.trackStateChange(
      'choice',
      previousState,
      newState,
      choice.effects,
      choice.text
    );

    // Record turn in history
    const currentScene = this.getCurrentScene();
    const turn: GameTurn = {
      sceneIndex: this.session.currentSceneIndex,
      sceneId: currentScene?.id || 'unknown',
      content: currentContent,
      choiceIndex,
      stateAfter: newState,
      timestamp: new Date()
    };
    this.session.history.push(turn);

    // Check for ending conditions
    const endingId = this.checkEndingConditions();
    if (endingId) {
      this.session.isComplete = true;
      this.session.endingTriggered = endingId;
      return { newState, sceneAdvanced: false, isComplete: true, endingTriggered: endingId };
    }

    // Check if scene should advance
    let sceneAdvanced = false;
    if (this.shouldAdvanceScene(currentContent)) {
      sceneAdvanced = this.advanceToNextScene();
      
      // If no more scenes, force ending
      if (!sceneAdvanced) {
        this.session.isComplete = true;
        return { newState, sceneAdvanced: false, isComplete: true, endingTriggered: 'natural_conclusion' };
      }
    }

    return { newState, sceneAdvanced, isComplete: false };
  }

  // Check if any ending conditions are met
  private checkEndingConditions(): string | null {
    for (const ending of this.session.compiledStructure.endings) {
      try {
        if (this.conditionEvaluator.evaluate(ending.condition)) {
          return ending.id;
        }
      } catch (error) {
        console.warn(`Error evaluating ending condition for ${ending.id}:`, error);
      }
    }
    return null;
  }

  // Get content generation context for current scene
  getContentGenerationContext(): ContentGenerationContext | null {
    const currentScene = this.getCurrentScene();
    if (!currentScene) return null;

    return {
      compiledStructure: this.session.compiledStructure,
      currentScene,
      currentState: this.session.currentState,
      history: this.session.history,
      sceneIndex: this.session.currentSceneIndex
    };
  }

  // Restart with same compiled structure
  restart(): void {
    const previousState = this.session.currentState;
    
    this.stateManager.reset(this.session.compiledStructure.initial_state);
    this.session.currentState = this.stateManager.getState();
    this.conditionEvaluator.updateState(this.session.currentState);
    this.session.currentSceneIndex = 0;
    this.session.history = [];
    this.session.isComplete = false;
    this.session.endingTriggered = undefined;
    
    // Track restart state change
    this.debugTracker?.trackStateChange(
      'restart',
      previousState,
      this.session.currentState
    );
  }

  // Get debug information
  getDebugInfo(): {
    currentState: any;
    currentSceneIndex: number;
    currentScene: SceneDefinition | null;
    totalScenes: number;
    endingConditions: { [key: string]: boolean };
    compiledStructure: CompiledStoryStructure;
  } {
    const endingConditions: { [key: string]: boolean } = {};
    
    for (const ending of this.session.compiledStructure.endings) {
      try {
        endingConditions[ending.id] = this.conditionEvaluator.evaluate(ending.condition);
      } catch {
        endingConditions[ending.id] = false;
      }
    }

    return {
      currentState: this.session.currentState,
      currentSceneIndex: this.session.currentSceneIndex,
      currentScene: this.getCurrentScene(),
      totalScenes: this.session.compiledStructure.scene_sequence.length,
      endingConditions,
      compiledStructure: this.session.compiledStructure
    };
  }

  // Check if game can continue
  canContinue(): boolean {
    return !this.session.isComplete && this.getCurrentScene() !== null;
  }
}