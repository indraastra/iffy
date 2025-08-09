import { MultiModelService } from '../../services/multiModelService.js';
import { StoryCompiler } from './StoryCompiler.js';
import { SequenceController } from './SequenceController.js';
import { EmergentContentGenerator } from './EmergentContentGenerator.js';
import { DebugTracker } from './DebugTracker.js';
import { 
  NarrativeOutline, 
  CompiledStoryStructure,
  EmergentGameSession, 
  GeneratedContent 
} from '../../types/emergentStory.js';

export interface EmergentEngineEvents {
  onCompilationStart?: () => void;
  onCompilationComplete?: (structure: CompiledStoryStructure) => void;
  onContentGenerated?: (content: GeneratedContent) => void;
  onStateChange?: (state: any) => void;
  onSceneAdvanced?: (sceneIndex: number, sceneName: string) => void;
  onGameComplete?: (endingId: string) => void;
  onError?: (error: Error) => void;
}

export class EmergentEngine {
  private storyCompiler: StoryCompiler;
  private contentGenerator: EmergentContentGenerator;
  private sequenceController: SequenceController | null = null;
  private currentContent: GeneratedContent | null = null;
  private events: EmergentEngineEvents;
  private debugTracker: DebugTracker;

  constructor(llmService: MultiModelService, events: EmergentEngineEvents = {}) {
    this.debugTracker = new DebugTracker();
    this.storyCompiler = new StoryCompiler(llmService, this.debugTracker);
    this.contentGenerator = new EmergentContentGenerator(llmService, this.debugTracker);
    this.events = events;
  }

  // Load and compile a narrative outline into a playable game
  async loadNarrative(narrativeOutline: NarrativeOutline): Promise<void> {
    try {
      // Phase 1: Compilation (LLM as Architect)
      if (this.events.onCompilationStart) {
        this.events.onCompilationStart();
      }

      const compiledStructure = await this.storyCompiler.compileStory(narrativeOutline);
      
      if (this.events.onCompilationComplete) {
        this.events.onCompilationComplete(compiledStructure);
      }

      // Phase 2: Initialize Runtime (Engine as Executor)
      this.sequenceController = new SequenceController(narrativeOutline, compiledStructure, this.debugTracker);

      // Phase 3: Generate Initial Content (LLM as Narrator)
      await this.generateCurrentSceneContent();

    } catch (error) {
      const engineError = error instanceof Error ? error : new Error('Unknown error loading narrative');
      if (this.events.onError) {
        this.events.onError(engineError);
      }
      throw engineError;
    }
  }

  // Make a choice and advance the game
  async makeChoice(choiceIndex: number): Promise<GeneratedContent | null> {
    if (!this.sequenceController || !this.currentContent) {
      throw new Error('No narrative loaded. Call loadNarrative() first.');
    }

    try {
      // Apply choice effects
      const result = this.sequenceController.applyChoice(choiceIndex, this.currentContent);

      // Emit state change
      if (this.events.onStateChange) {
        this.events.onStateChange(result.newState);
      }

      // Emit scene advancement
      if (result.sceneAdvanced && this.events.onSceneAdvanced) {
        const currentScene = this.sequenceController.getCurrentScene();
        this.events.onSceneAdvanced(
          this.sequenceController.getSession().currentSceneIndex, 
          currentScene?.id || 'unknown'
        );
      }

      // Handle game completion
      if (result.isComplete) {
        if (this.events.onGameComplete && result.endingTriggered) {
          this.events.onGameComplete(result.endingTriggered);
        }
        
        // Generate ending content
        await this.generateEndingContent(result.endingTriggered);
        if (this.events.onContentGenerated) {
          this.events.onContentGenerated(this.currentContent);
        }
        
        return this.currentContent;
      }

      // Generate next scene content if game continues
      if (this.sequenceController.canContinue()) {
        await this.generateCurrentSceneContent();
      }

      return this.currentContent;

    } catch (error) {
      const engineError = error instanceof Error ? error : new Error('Unknown error making choice');
      if (this.events.onError) {
        this.events.onError(engineError);
      }
      throw engineError;
    }
  }

  // Generate content for current scene
  private async generateCurrentSceneContent(): Promise<void> {
    if (!this.sequenceController) return;

    const context = this.sequenceController.getContentGenerationContext();
    if (!context) {
      // No more scenes - this shouldn't happen but handle gracefully
      await this.generateEndingContent('natural_conclusion');
      return;
    }

    this.currentContent = await this.contentGenerator.generateContent(context);
    
    if (this.events.onContentGenerated) {
      this.events.onContentGenerated(this.currentContent);
    }

    if (this.events.onStateChange) {
      this.events.onStateChange(this.sequenceController.getSession().currentState);
    }
  }

  // Generate ending content
  private async generateEndingContent(endingId?: string): Promise<void> {
    const session = this.sequenceController?.getSession();
    const ending = session?.compiledStructure.endings.find(e => e.id === endingId);
    
    if (!session || !ending) {
      this.currentContent = {
        narrative: 'The story has reached its conclusion.',
        scene_complete: true,
        choices: [
          { text: "Play again with a new story structure", effects: {} },
          { text: "Load a different narrative", effects: {} }
        ]
      };
      return;
    }

    try {
      // Generate proper ending narrative using the LLM
      const context = this.sequenceController!.getContentGenerationContext();
      if (!context) {
        throw new Error('No content generation context available');
      }

      // Build ending-specific context
      const endingContext = {
        ...context,
        isEnding: true,
        triggeredEnding: ending,
        finalState: session.currentState,
        storyHistory: session.history
      };

      const endingContent = await this.contentGenerator.generateEndingContent(endingContext);
      this.currentContent = endingContent;
      
    } catch (error) {
      console.error('Failed to generate ending content:', error);
      this.currentContent = {
        narrative: `The story concludes with a ${ending.tone} ending. Though the details escape us now, your choices have led to this moment of resolution.`,
        scene_complete: true,
        choices: [
          { text: "Play again with a new story structure", effects: {} },
          { text: "Load a different narrative", effects: {} }
        ]
      };
    }
  }

  // Get current content
  getCurrentContent(): GeneratedContent | null {
    return this.currentContent;
  }

  // Get current game session
  getSession(): EmergentGameSession | null {
    return this.sequenceController?.getSession() || null;
  }

  // Restart with same narrative (will recompile for new structure)
  async restart(): Promise<void> {
    const session = this.getSession();
    if (!session) {
      throw new Error('No narrative loaded. Call loadNarrative() first.');
    }

    // Recompile the same narrative for a new unique structure
    await this.loadNarrative(session.narrativeOutline);
  }

  // Get debug information
  getDebugInfo(): any {
    return this.sequenceController?.getDebugInfo() || null;
  }

  // Get debug tracker for UI integration
  getDebugTracker(): DebugTracker {
    return this.debugTracker;
  }

  // Test LLM connection
  async testConnection(): Promise<boolean> {
    try {
      return await this.contentGenerator.testConnection();
    } catch {
      return false;
    }
  }

  // Parse narrative from Markdown string
  static parseMarkdown(markdown: string): NarrativeOutline {
    return StoryCompiler.parseMarkdown(markdown);
  }

  // Load narrative from file
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

  // Load narrative from URL
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