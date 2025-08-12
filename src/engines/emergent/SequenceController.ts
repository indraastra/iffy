import { StateManager } from './StateManager.js';
import { ConditionEvaluator } from './ConditionEvaluator.js';
import { EffectApplicator } from './EffectApplicator.js';
import { BlueprintGenerator } from './BlueprintGenerator.js';
import { SceneGenerator } from './SceneGenerator.js';
import { BeatGenerator } from './BeatGenerator.js';
import { 
  NarrativeOutline,
  StoryScene,
  StoryBeat,
  Choice,
  EmergentGameSession
} from '../../types/emergentStory.js';

// The main orchestrator for the emergent narrative engine.
export class SequenceController {
  private stateManager?: StateManager;
  private conditionEvaluator?: ConditionEvaluator;
  private effectApplicator?: EffectApplicator;
  private blueprintGenerator: BlueprintGenerator;
  private sceneGenerator: SceneGenerator;
  private beatGenerator: BeatGenerator;
  
  private session?: EmergentGameSession;
  private loadedScene: StoryScene | null = null;
  private fulfilledRequirements: string[] = [];

  constructor(
    blueprintGenerator: BlueprintGenerator,
    sceneGenerator: SceneGenerator,
    beatGenerator: BeatGenerator
  ) {
    this.blueprintGenerator = blueprintGenerator;
    this.sceneGenerator = sceneGenerator;
    this.beatGenerator = beatGenerator;
  }

  /**
   * Starts a new game session by generating a blueprint from a narrative outline.
   */
  async startNewGame(narrativeOutline: NarrativeOutline): Promise<void> {
    console.log('SequenceController: startNewGame called');
    const blueprint = await this.blueprintGenerator.generateBlueprint(narrativeOutline);
    console.log('SequenceController: Blueprint generated', blueprint);
    
    this.stateManager = new StateManager({});
    this.conditionEvaluator = new ConditionEvaluator(this.stateManager.getState());
    this.effectApplicator = new EffectApplicator(this.stateManager);

    this.session = {
      blueprint,
      currentState: this.stateManager.getState(),
      currentSceneId: blueprint.scene_sequence[0].id,
      history: [],
      isComplete: false,
    };
    console.log('SequenceController: Session initialized', this.session);

    await this.loadCurrentScene();
    console.log('SequenceController: Initial scene loaded', this.loadedScene);
  }

  /**
   * Fetches the next playable story beat for the current scene.
   */
  async getNextBeat(): Promise<StoryBeat | null> {
    console.log('SequenceController: getNextBeat called');
    if (!this.session || this.session.isComplete || !this.loadedScene) {
      console.log('SequenceController: getNextBeat returning null (session not ready or complete)');
      return null;
    }

    // Priority 1: Check for unfilled blanks
    const unfilledBlanks = this.loadedScene.blanks.filter(
      blank => !(blank in this.session.currentState)
    );
    console.log('SequenceController: Scene blanks:', this.loadedScene.blanks);
    console.log('SequenceController: Current state keys:', Object.keys(this.session.currentState));
    console.log('SequenceController: unfilledBlanks', unfilledBlanks);

    if (unfilledBlanks.length > 0) {
      // Generate blank-filling beat
      const blankToFill = unfilledBlanks[0];
      console.log('SequenceController: Generating blank-filling beat for', blankToFill);
      
      const beat = await this.beatGenerator.generateBlankFillingBeat({
        blueprint: this.session.blueprint,
        scene: this.loadedScene,
        blankToFill: blankToFill,
        currentState: this.session.currentState,
        sessionHistory: this.session.history
      });
      
      console.log('SequenceController: Beat generated', beat);
      return beat;
    }

    // Priority 2: Work on scene requirements after all blanks are filled
    const nextRequirement = this.loadedScene.requirements.find(
      req => !this.fulfilledRequirements.includes(req.key_to_update)
    );
    console.log('SequenceController: nextRequirement', nextRequirement);

    if (!nextRequirement) {
      console.log(`SequenceController: All requirements for scene ${this.session.currentSceneId} fulfilled.`);
      return null; 
    }

    const beat = await this.beatGenerator.generateBeat({
      blueprint: this.session.blueprint,
      scene: this.loadedScene,
      requirement: nextRequirement,
      currentState: this.session.currentState,
      sessionHistory: this.session.history
    });
    console.log('SequenceController: Beat generated', beat);

    return beat;
  }

  /**
   * Records a completed turn in the session history.
   */
  recordTurn(beat: StoryBeat, choice: Choice): void {
    if (!this.session) {
      throw new Error('Session not initialized. Cannot record turn.');
    }
    
    this.session.history.push({
      beat,
      choice,
      timestamp: new Date().toISOString()
    });
    console.log('SequenceController: Turn recorded', { beat: beat.narrative_text, choice: choice.text });
  }

  /**
   * Processes a player's choice, updates the state, and checks for transitions.
   * Returns the ID of the next scene if a transition occurs, otherwise null.
   */
  async applyChoice(choice: Choice | null): Promise<string | null> {
    console.log('SequenceController: applyChoice called with', choice);
    if (!this.session || !this.effectApplicator || !this.conditionEvaluator) {
      throw new Error('Session not initialized. Call startNewGame first.');
    }
    if (this.session.isComplete) {
      throw new Error('Game is already complete.');
    }

    if (choice) {
      const newState = this.effectApplicator.applyChoice(choice);
      this.session.currentState = newState;
      this.conditionEvaluator.updateState(newState);
      // Track requirement fulfillment separately from blank filling
      const choiceKeys = Object.keys(choice.effects);
      for (const key of choiceKeys) {
        // Only track as fulfilled requirement if it matches a scene requirement
        if (this.loadedScene?.requirements.some(req => req.key_to_update === key)) {
          if (!this.fulfilledRequirements.includes(key)) {
            this.fulfilledRequirements.push(key);
          }
        }
        // Blanks are tracked automatically via game state existence check
      }
      console.log('SequenceController: State updated', this.session.currentState);
      console.log('SequenceController: Fulfilled requirements', this.fulfilledRequirements);
    }

    const endingId = this.checkEndingConditions();
    if (endingId) {
      this.session.isComplete = true;
      this.session.endingTriggered = endingId;
      console.log(`SequenceController: Ending triggered: ${endingId}`);
      return null;
    }

    const nextSceneId = this.checkSceneTransitions();
    if (nextSceneId) {
      // Check if the target is an ending
      if (this.isEndingId(nextSceneId)) {
        console.log(`SequenceController: Ending reached: ${nextSceneId}`);
        this.session.isComplete = true;
        this.session.endingTriggered = nextSceneId;
        return null; // No scene transition, game is complete
      }
      
      console.log(`SequenceController: Transitioning to scene: ${nextSceneId}`);
      this.session.currentSceneId = nextSceneId;
      await this.loadCurrentScene();
      return nextSceneId;
    }
    console.log('SequenceController: No transition, staying in current scene');
    return null;
  }

  private async loadCurrentScene(): Promise<void> {
    console.log('SequenceController: loadCurrentScene called');
    if (!this.session) {
      throw new Error('Session not initialized. Cannot load current scene.');
    }

    const blueprintScene = this.session.blueprint.scene_sequence.find(
      s => s.id === this.session!.currentSceneId
    );

    if (!blueprintScene) {
      this.session.isComplete = true;
      console.error(`SequenceController: Scene not found in blueprint: ${this.session.currentSceneId}`);
      return;
    }

    this.loadedScene = await this.sceneGenerator.generateScene({
      blueprint: this.session.blueprint,
      blueprintScene,
      currentState: this.session.currentState,
      sessionHistory: this.session.history
    });
    console.log('SequenceController: Scene generated', this.loadedScene);

    this.fulfilledRequirements = [];
  }

  private checkEndingConditions(): string | null {
    // Endings are handled via scene transitions to an ending ID.
    return null; 
  }

  private checkSceneTransitions(): string | null {
    console.log('SequenceController: checkSceneTransitions called');
    if (!this.loadedScene || !this.conditionEvaluator) return null;

    for (const transition of this.loadedScene.transitions) {
      console.log('SequenceController: Checking transition', transition);
      if (transition.condition === 'continue') continue;

      try {
        if (this.conditionEvaluator.evaluate(transition.condition)) {
          console.log(`SequenceController: Transition condition met: ${transition.condition}`);
          return transition.target;
        }
      } catch (error) {
        console.warn(`SequenceController: Error evaluating transition condition for ${transition.target}:`, error);
      }
    }

    const allRequirementsMet = this.loadedScene.requirements.every(
      req => this.fulfilledRequirements.includes(req.key_to_update)
    );
    console.log('SequenceController: All requirements met for default transition?', allRequirementsMet);

    if (allRequirementsMet) {
      const defaultTransition = this.loadedScene.transitions.find(t => t.condition === 'continue');
      console.log('SequenceController: Default transition', defaultTransition);
      return defaultTransition ? defaultTransition.target : null;
    }

    return null;
  }

  private isEndingId(targetId: string): boolean {
    if (!this.session) return false;
    return this.session.blueprint.potential_endings.some(ending => ending.id === targetId);
  }

  
  getSession(): EmergentGameSession | null {
    return this.session ? { ...this.session } : null;
  }
}