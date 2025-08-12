import { MultiModelService } from '../../services/multiModelService.js';
import { BlueprintGenerator } from './BlueprintGenerator.js';
import { SceneGenerator } from './SceneGenerator.js';
import { BeatGenerator } from './BeatGenerator.js';
import { SequenceController } from './SequenceController.js';
import { DebugTracker } from './DebugTracker.js';
import { 
  NarrativeOutline, 
  StoryBeat,
  Choice,
  EmergentGameSession, 
} from '../../types/emergentStory.js';

export interface EmergentEngineEvents {
  onBlueprintStart?: () => void;
  onBlueprintComplete?: () => void;
  onSceneStart?: () => void;
  onSceneComplete?: () => void;
  onBeatStart?: () => void;
  onBeatReady?: (beat: StoryBeat) => void;
  onGameComplete?: (endingId: string, session: EmergentGameSession) => void;
  onError?: (error: Error) => void;
}

export class EmergentEngine {
  private sequenceController: SequenceController;
  private events: EmergentEngineEvents;
  private debugTracker: DebugTracker;
  private llmService: MultiModelService;
  private currentBeat: StoryBeat | null = null;

  constructor(llmService: MultiModelService, events: EmergentEngineEvents = {}) {
    this.llmService = llmService;
    this.debugTracker = new DebugTracker();
    this.events = events;

    // Instantiate the generator and controller hierarchy
    const blueprintGenerator = new BlueprintGenerator(this.llmService, this.debugTracker);
    const sceneGenerator = new SceneGenerator(this.llmService, this.debugTracker);
    const beatGenerator = new BeatGenerator(this.llmService, this.debugTracker);
    
    this.sequenceController = new SequenceController(
      blueprintGenerator,
      sceneGenerator,
      beatGenerator
    );
  }

  /**
   * Starts a new game from a narrative outline.
   * This will generate the blueprint and the first scene, and then generate the first beat.
   */
  async startNewGame(narrativeOutline: NarrativeOutline): Promise<void> {
    console.log('EmergentEngine: startNewGame called');
    try {
      // Stage 1: Blueprint Generation
      if (this.events.onBlueprintStart) {
        this.events.onBlueprintStart();
      }
      
      await this.sequenceController.startNewGame(narrativeOutline);
      
      if (this.events.onBlueprintComplete) {
        this.events.onBlueprintComplete();
      }
      
      // Stage 2: Beat Generation
      if (this.events.onBeatStart) {
        this.events.onBeatStart();
      }
      
      const firstBeat = await this.sequenceController.getNextBeat();
      console.log('EmergentEngine: firstBeat received', firstBeat);
      if (firstBeat) {
        this.currentBeat = firstBeat;
        if (this.events.onBeatReady) {
          console.log('EmergentEngine: Emitting onBeatReady');
          this.events.onBeatReady(firstBeat);
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Processes a player's choice and prepares the next beat.
   */
  async makeChoice(choice: Choice): Promise<void> {
    console.log('EmergentEngine: makeChoice called with', choice);
    try {
      // Record the completed turn before processing the choice
      if (this.currentBeat) {
        this.sequenceController.recordTurn(this.currentBeat, choice);
        this.currentBeat = null;
      }
      
      const nextSceneId = await this.sequenceController.applyChoice(choice);
      const session = this.getSession();

      if (session?.isComplete) {
        console.log('EmergentEngine: Game is complete');
        if (this.events.onGameComplete && session.endingTriggered) {
          this.events.onGameComplete(session.endingTriggered, session);
        }
        return; // Game is over
      }

      if (this.events.onBeatStart) {
        this.events.onBeatStart();
      }
      
      const nextBeat = await this.sequenceController.getNextBeat();
      console.log('EmergentEngine: nextBeat received', nextBeat);
      if (nextBeat) {
        this.currentBeat = nextBeat;
        if (this.events.onBeatReady) {
          console.log('EmergentEngine: Emitting onBeatReady for next beat');
          this.events.onBeatReady(nextBeat);
        }
      } else if (!nextBeat && nextSceneId) {
        console.log('EmergentEngine: Scene transitioned, getting first beat of new scene');
        // This can happen if a scene has no requirements and just transitions.
        // We need to get the first beat of the *new* scene.
        if (this.events.onBeatStart) {
          this.events.onBeatStart();
        }
        const firstBeatOfNewScene = await this.sequenceController.getNextBeat();
        console.log('EmergentEngine: firstBeatOfNewScene received', firstBeatOfNewScene);
        if (firstBeatOfNewScene && this.events.onBeatReady) {
          console.log('EmergentEngine: Emitting onBeatReady for first beat of new scene');
          this.events.onBeatReady(firstBeatOfNewScene);
        }
      }

    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): void {
    const engineError = error instanceof Error ? error : new Error('Unknown engine error');
    console.error('EmergentEngine ERROR:', engineError);
    if (this.events.onError) {
      this.events.onError(engineError);
    } else {
      // If no error handler is attached, re-throw to crash loudly
      throw engineError;
    }
  }

  // ~~~ Public Accessors ~~~

  getSession(): EmergentGameSession | null {
    return this.sequenceController.getSession();
  }

  getDebugTracker(): DebugTracker {
    return this.debugTracker;
  }

  // ~~~ Static Helpers ~~~

  static parseMarkdown(markdown: string): NarrativeOutline {
    return BlueprintGenerator.parseMarkdown(markdown);
  }

  static async loadFromFile(file: File): Promise<NarrativeOutline> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const narrative = EmergentEngine.parseMarkdown(content);
          resolve(narrative);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  static async loadFromURL(url: string): Promise<NarrativeOutline> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const markdown = await response.text();
      return EmergentEngine.parseMarkdown(markdown);
    } catch (error) {
      throw new Error(`Failed to load narrative from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}