import { MultiModelService } from '../../services/multiModelService.js';
import { FlowController } from './FlowController.js';
import { ContentGenerator } from './ContentGenerator.js';
import { 
  ChoiceDrivenStory, 
  GameSession, 
  GeneratedContent 
} from '../../types/choiceDrivenStory.js';

export interface ChoiceDrivenEngineEvents {
  onStateChange?: (state: any) => void;
  onContentGenerated?: (content: GeneratedContent) => void;
  onGameComplete?: (endingId: string) => void;
  onError?: (error: Error) => void;
}

export class ChoiceDrivenEngine {
  private flowController: FlowController | null = null;
  private contentGenerator: ContentGenerator;
  private currentContent: GeneratedContent | null = null;
  private events: ChoiceDrivenEngineEvents;

  constructor(llmService: MultiModelService, events: ChoiceDrivenEngineEvents = {}) {
    this.contentGenerator = new ContentGenerator(llmService);
    this.events = events;
  }

  // Load a story and initialize the game
  async loadStory(story: ChoiceDrivenStory): Promise<void> {
    try {
      // Validate story structure
      this.validateStory(story);

      // Initialize flow controller with story
      this.flowController = new FlowController(story, this.contentGenerator);

      // Generate initial content
      this.currentContent = await this.flowController.playTurn();
      
      if (this.events.onContentGenerated) {
        this.events.onContentGenerated(this.currentContent);
      }

      if (this.events.onStateChange) {
        this.events.onStateChange(this.flowController.getSession().currentState);
      }

    } catch (error) {
      const engineError = error instanceof Error ? error : new Error('Unknown error loading story');
      if (this.events.onError) {
        this.events.onError(engineError);
      }
      throw engineError;
    }
  }

  // Make a choice and advance the game
  async makeChoice(choiceIndex: number): Promise<GeneratedContent | null> {
    if (!this.flowController || !this.currentContent) {
      throw new Error('No story loaded. Call loadStory() first.');
    }

    try {
      // Apply the choice
      const result = await this.flowController.makeChoice(choiceIndex, this.currentContent);

      // Emit state change event
      if (this.events.onStateChange) {
        this.events.onStateChange(result.newState);
      }

      // Check if game is complete
      if (result.isComplete) {
        if (this.events.onGameComplete && result.endingTriggered) {
          this.events.onGameComplete(result.endingTriggered);
        }
        
        // Generate ending content
        this.currentContent = await this.flowController.playTurn();
        if (this.events.onContentGenerated) {
          this.events.onContentGenerated(this.currentContent);
        }
        
        return this.currentContent;
      }

      // Generate next scene content
      this.currentContent = await this.flowController.playTurn();
      
      if (this.events.onContentGenerated) {
        this.events.onContentGenerated(this.currentContent);
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

  // Get current content
  getCurrentContent(): GeneratedContent | null {
    return this.currentContent;
  }

  // Get current game session
  getSession(): GameSession | null {
    return this.flowController?.getSession() || null;
  }

  // Restart the current story
  async restart(): Promise<GeneratedContent | null> {
    if (!this.flowController) {
      throw new Error('No story loaded. Call loadStory() first.');
    }

    try {
      this.flowController.restart();
      this.currentContent = await this.flowController.playTurn();

      if (this.events.onContentGenerated) {
        this.events.onContentGenerated(this.currentContent);
      }

      if (this.events.onStateChange) {
        this.events.onStateChange(this.flowController.getSession().currentState);
      }

      return this.currentContent;

    } catch (error) {
      const engineError = error instanceof Error ? error : new Error('Unknown error restarting');
      if (this.events.onError) {
        this.events.onError(engineError);
      }
      throw engineError;
    }
  }

  // Get debug information
  getDebugInfo(): any {
    if (!this.flowController) {
      return null;
    }
    return this.flowController.getDebugInfo();
  }

  // Test LLM connection
  async testLLMConnection(): Promise<boolean> {
    try {
      return await this.contentGenerator.testConnection();
    } catch {
      return false;
    }
  }

  // Load story from JSON string
  static parseStory(jsonString: string): ChoiceDrivenStory {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic validation - can be expanded
      if (!parsed.title || !parsed.summary || !parsed.initial_state || !parsed.scenes || !parsed.endings) {
        throw new Error('Invalid story format - missing required fields');
      }

      return parsed as ChoiceDrivenStory;
    } catch (error) {
      throw new Error(`Failed to parse story JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Load story from file path (browser)
  static async loadStoryFromFile(file: File): Promise<ChoiceDrivenStory> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const story = ChoiceDrivenEngine.parseStory(content);
          resolve(story);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Load story from URL
  static async loadStoryFromURL(url: string): Promise<ChoiceDrivenStory> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const jsonString = await response.text();
      return ChoiceDrivenEngine.parseStory(jsonString);
    } catch (error) {
      throw new Error(`Failed to load story from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate story structure
  private validateStory(story: ChoiceDrivenStory): void {
    const errors: string[] = [];

    // Check required fields
    if (!story.title) errors.push('Missing title');
    if (!story.summary) errors.push('Missing summary');
    if (!story.initial_state) errors.push('Missing initial_state');
    if (!story.scenes || Object.keys(story.scenes).length === 0) errors.push('Missing scenes');
    if (!story.endings || Object.keys(story.endings).length === 0) errors.push('Missing endings');

    // Check that at least one scene is always available
    const alwaysAvailableScenes = Object.entries(story.scenes)
      .filter(([_, scene]) => scene.available_when === 'always');
    
    if (alwaysAvailableScenes.length === 0) {
      errors.push('No scenes with "always" condition - game may not be startable');
    }

    if (errors.length > 0) {
      throw new Error(`Story validation failed: ${errors.join(', ')}`);
    }
  }
}