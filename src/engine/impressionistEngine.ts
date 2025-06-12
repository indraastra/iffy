/**
 * Impressionist Engine - Core engine for impressionistic interactive fiction
 * 
 * Replaces the traditional state machine approach with scene-based navigation
 * and natural language condition evaluation.
 */

import { 
  ImpressionistStory, 
  ImpressionistState, 
  ImpressionistResult,
  DirectorContext,
  DirectorResponse,
  ImpressionistInteraction
} from '@/types/impressionistStory';
import { AnthropicService } from '@/services/anthropicService';
import { LLMDirector } from './llmDirector';
import { MetricsCollector } from './metricsCollector';
import { ImpressionistMemoryManager } from './impressionistMemoryManager';

export interface PlayerAction {
  input: string;
}

export interface GameResponse {
  text: string;
  gameState: ImpressionistState;
  error?: string;
  endingTriggered?: boolean;
}

export class ImpressionistEngine {
  // Configuration constants
  private readonly CONTEXT_MEMORIES_LIMIT = 10; // memories passed to LLM context
  private readonly MEMORY_COMPACTION_FREQUENCY = 5; // compact every N memories
  private readonly INTERACTION_ROLLING_WINDOW = 20; // max interactions stored in state
  
  private story: ImpressionistStory | null = null;
  private gameState: ImpressionistState = this.createInitialState();
  private director: LLMDirector;
  private metrics: MetricsCollector;
  private memoryManager: ImpressionistMemoryManager;
  
  // Callbacks for UI integration
  private uiResetCallback?: () => void;
  private uiRestoreCallback?: (gameState: any, conversationHistory?: any[]) => void;

  constructor(anthropicService?: AnthropicService) {
    this.director = new LLMDirector(anthropicService);
    this.metrics = new MetricsCollector();
    this.memoryManager = new ImpressionistMemoryManager(anthropicService);
    
    // Configure memory manager with our compaction frequency
    this.memoryManager.setCompactionInterval(this.MEMORY_COMPACTION_FREQUENCY);
  }

  /**
   * Load a story in impressionist format
   */
  loadStory(story: ImpressionistStory): ImpressionistResult<ImpressionistState> {
    try {
      // Basic validation
      if (!story || !story.title || !story.scenes || story.scenes.length === 0) {
        return {
          success: false,
          error: 'Invalid story: missing required fields (title, scenes)'
        };
      }

      // Reset everything for new game
      this.resetForNewGame();

      this.story = story;
      
      // Set initial scene (first scene is entry point)
      this.gameState.currentScene = story.scenes[0].id;

      return {
        success: true,
        data: { ...this.gameState }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load story: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get initial story text
   */
  getInitialText(): string {
    if (!this.story) return 'No story loaded. Please load a story to begin.';
    
    const firstScene = this.story.scenes[0];
    if (!firstScene?.sketch) {
      return 'Story loaded, but no initial content available.';
    }
    
    return firstScene.sketch;
  }

  /**
   * Process player action using impressionistic approach
   */
  async processAction(action: PlayerAction): Promise<GameResponse> {
    if (!this.story) {
      return {
        text: 'No story is currently loaded.',
        gameState: this.gameState,
        error: 'No story loaded'
      };
    }

    if (this.gameState.isEnded) {
      // Allow post-ending exploration - pass to LLM with special context
      const context = this.buildDirectorContext(action.input, this.getCurrentScene());
      context.storyComplete = true; // Signal that story has ended
      
      try {
        const response = await this.director.processInput(action.input, context);
        
        // Track this post-ending interaction
        this.trackInteraction(action.input, response.narrative, {
          postEnding: true,
          llmImportance: response.importance
        });
        
        return {
          text: response.narrative,
          gameState: { ...this.gameState },
          error: response.signals?.error
        };
      } catch (error) {
        return {
          text: 'The story has ended, but you can still reflect on your choices or ask questions about what happened.',
          gameState: this.gameState,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    try {
      // Get current scene
      const currentScene = this.getCurrentScene();
      if (!currentScene) {
        return {
          text: 'Story state is invalid - no current scene.',
          gameState: this.gameState,
          error: 'Invalid scene state'
        };
      }

      // Build context for LLM
      const context = this.buildDirectorContext(action.input, currentScene);
      
      // Get LLM response
      const response = await this.director.processInput(action.input, context);
      
      // Track metrics if usage information is available
      if ((response as any).usage) {
        const usage = (response as any).usage;
        this.metrics.trackRequest(
          usage.input_tokens,
          usage.output_tokens,
          (response as any).latencyMs || 0,
          (response as any).contextSize || 0,
          context.activeMemory?.length || 0,
          this.gameState.currentScene
        );
      }
      
      // Check for ending signals BEFORE applying them to determine if ending was triggered
      const isEndingTriggered = !!response.signals?.ending;
      
      // Apply any signals from the response (but don't trigger ending callback yet)
      this.applyDirectorSignals(response);
      
      // Track this interaction in memory with metadata
      this.trackInteraction(action.input, response.narrative, {
        usage: (response as any).usage,
        latencyMs: (response as any).latencyMs,
        signals: response.signals,
        llmImportance: response.importance
      });

      return {
        text: response.narrative,
        gameState: { ...this.gameState },
        error: response.signals?.error,
        endingTriggered: isEndingTriggered
      };
    } catch (error) {
      console.error('Error processing action:', error);
      return {
        text: 'Sorry, I had trouble processing that command. Try something else.',
        gameState: this.gameState,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current scene from story
   */
  private getCurrentScene() {
    if (!this.story) return null;
    return this.story.scenes.find(scene => scene.id === this.gameState.currentScene) || null;
  }

  /**
   * Build context for LLM Director
   */
  private buildDirectorContext(input: string, currentScene: any): DirectorContext {
    const context: DirectorContext = {
      // Core context (~200 tokens)
      storyContext: this.story!.context,
      currentSketch: currentScene.sketch,
      
      // Recent activity (~300 tokens) 
      recentInteractions: this.gameState.interactions,
      activeMemory: this.getRelevantMemories(input),
      
      // Guidance (~100 tokens)
      guidance: this.story!.guidance
    };

    // Available transitions (~100 tokens)
    if (currentScene.leads_to) {
      context.currentTransitions = {};
      for (const [sceneId, condition] of Object.entries(currentScene.leads_to)) {
        const targetScene = this.story!.scenes.find(s => s.id === sceneId);
        if (targetScene) {
          context.currentTransitions[sceneId] = {
            condition: condition as string,
            sketch: targetScene.sketch
          };
        }
      }
    }

    // Available endings (~100 tokens)
    if (this.story!.endings && this.story!.endings.variations.length > 0) {
      context.availableEndings = this.story!.endings;
    }

    // Narrative metadata (~50 tokens if defined)
    if (this.story!.narrative) {
      context.narrative = this.story!.narrative;
    }

    // Optional enrichment (~200 tokens)
    if (this.story!.world) {
      // Add location details if current scene has a location
      if (this.story!.world.locations) {
        // For now, assume scene ID might match location ID
        const location = this.story!.world.locations[currentScene.id];
        if (location) {
          context.location = location;
        }
      }

      // Add discoverable items in current area
      if (this.story!.world.items) {
        context.discoverableItems = Object.values(this.story!.world.items)
          .filter(item => item.found_in === currentScene.id);
      }

      // Add active characters
      if (this.story!.world.characters) {
        context.activeCharacters = Object.values(this.story!.world.characters);
      }
    }

    return context;
  }


  /**
   * Apply signals from LLM Director response without triggering ending callback
   */
  private applyDirectorSignals(response: DirectorResponse) {
    if (!response.signals) return;

    // Scene transitions
    if (response.signals.scene) {
      this.transitionToScene(response.signals.scene);
    }

    // Ending triggers (but don't call callback)
    if (response.signals.ending) {
      this.triggerEnding(response.signals.ending);
    }

    // Item discovery
    if (response.signals.discover) {
      this.handleItemDiscovery(response.signals.discover);
    }
  }

  /**
   * Transition to a new scene
   */
  private transitionToScene(sceneId: string) {
    if (!this.story) return;

    const targetScene = this.story.scenes.find(scene => scene.id === sceneId);
    if (targetScene) {
      console.log(`Scene transition: ${this.gameState.currentScene} -> ${sceneId}`);
      this.gameState.currentScene = sceneId;
    } else {
      console.warn(`Scene transition failed: scene ${sceneId} not found`);
    }
  }


  /**
   * Trigger a story ending without calling the callback (for deferred ending handling)
   */
  private triggerEnding(endingId: string) {
    if (!this.story) return;

    const ending = this.story.endings.variations.find(e => e.id === endingId);
    if (ending) {
      console.log(`Story ending triggered: ${endingId}`);
      this.gameState.isEnded = true;
      this.gameState.endingId = endingId;
    } else {
      // Handle impromptu/unexpected ending - LLM decided to end the story
      console.log(`Impromptu ending triggered: ${endingId}`);
      this.gameState.isEnded = true;
      this.gameState.endingId = endingId;
    }
  }

  /**
   * Handle item discovery
   */
  private handleItemDiscovery(itemId: string) {
    if (!this.story?.world?.items) return;

    const item = this.story.world.items[itemId];
    if (item && item.reveals) {
      // Add to impressionist memory manager with high importance (discovery is significant)
      this.memoryManager.addMemory(`Discovered ${itemId}: ${item.reveals}`, 7);
      
      console.log(`Item discovered: ${itemId}, revealed: ${item.reveals}`);
    }
  }

  /**
   * Get relevant memories for current context using ImpressionsMemoryManager
   */
  private getRelevantMemories(_input: string): string[] {
    // Get memories from the impressionist memory manager
    const memoryContext = this.memoryManager.getMemories(this.CONTEXT_MEMORIES_LIMIT);
    return memoryContext.memories;
  }

  /**
   * Track interaction in memory and game state
   */
  private trackInteraction(playerInput: string, llmResponse: string, metadata?: any) {
    // Create structured interaction using LLM-provided importance or fallback
    const llmImportance = metadata?.llmImportance;
    const importance = llmImportance || this.determineMemoryImportance(playerInput, llmResponse);
    
    const interaction: ImpressionistInteraction = {
      playerInput,
      llmResponse,
      timestamp: new Date(),
      sceneId: this.gameState.currentScene,
      importance,
      metadata: metadata ? {
        inputTokens: metadata.usage?.input_tokens,
        outputTokens: metadata.usage?.output_tokens,
        latencyMs: metadata.latencyMs,
        signals: metadata.signals
      } : undefined
    };

    // Add to game state interactions with rolling window limit
    this.gameState.interactions.push(interaction);
    if (this.gameState.interactions.length > this.INTERACTION_ROLLING_WINDOW) {
      this.gameState.interactions = this.gameState.interactions.slice(-this.INTERACTION_ROLLING_WINDOW);
    }

    // Add to memory manager for long-term storage
    const interactionMemory = `Player: ${playerInput}\nResponse: ${llmResponse}`;
    this.memoryManager.addMemory(interactionMemory, importance);

    const importanceSource = llmImportance ? 'LLM' : 'heuristic';
    console.log(`💭 Tracked interaction (importance: ${importance}/${importanceSource}): "${playerInput}" -> "${llmResponse.substring(0, 50)}..."`);
  }

  /**
   * Determine memory importance (fallback when LLM doesn't provide importance)
   */
  private determineMemoryImportance(_playerInput: string, llmResponse: string): number {
    // Simple fallback: longer responses tend to be more important
    return llmResponse.length > 200 ? 6 : 4;
  }

  /**
   * Reset game state for new game
   */
  private resetForNewGame() {
    this.gameState = this.createInitialState();
    this.memoryManager.reset();
    
    if (this.uiResetCallback) {
      this.uiResetCallback();
    }
  }

  /**
   * Create initial game state
   */
  private createInitialState(): ImpressionistState {
    return {
      currentScene: '',
      interactions: []
    };
  }

  // UI Integration methods (compatible with existing UI)
  setUIResetCallback(callback: () => void): void {
    this.uiResetCallback = callback;
  }

  setUIRestoreCallback(callback: (gameState: any, conversationHistory?: any[]) => void): void {
    this.uiRestoreCallback = callback;
  }


  setLoadingStateCallback(_callback: (message: string) => void): void {
    // Not implemented in impressionist engine yet
  }

  setDebugPane(debugPane: any): void {
    this.director.setDebugPane(debugPane);
    this.metrics.setDebugPane(debugPane);
    this.memoryManager.setDebugPane(debugPane);
  }

  // Compatibility methods for existing UI
  getGameState(): ImpressionistState {
    return { ...this.gameState };
  }

  getCurrentStoryTitle(): string | null {
    return this.story?.title || null;
  }

  getCurrentStory(): ImpressionistStory | null {
    return this.story;
  }

  getMetrics(): MetricsCollector {
    return this.metrics;
  }

  getMemoryManager(): ImpressionistMemoryManager {
    return this.memoryManager;
  }

  /**
   * Get structured interaction history
   */
  getStructuredInteractions(): ImpressionistInteraction[] {
    return [...this.gameState.interactions];
  }

  // Save/Load functionality
  saveGame(): string {
    return JSON.stringify({
      gameState: {
        ...this.gameState,
        interactions: this.gameState.interactions.map(interaction => ({
          ...interaction,
          timestamp: interaction.timestamp.toISOString()
        }))
      },
      memoryManagerState: this.memoryManager.exportState(),
      storyTitle: this.story?.title,
      saveTimestamp: new Date().toISOString()
    });
  }

  loadGame(saveData: string): ImpressionistResult<ImpressionistState> {
    try {
      if (!this.story) {
        return {
          success: false,
          error: 'No story loaded. Load a story before attempting to load a saved game.'
        };
      }
      
      const data = JSON.parse(saveData);
      
      if (data.storyTitle !== this.story.title) {
        return {
          success: false,
          error: `Save file is for "${data.storyTitle}" but current story is "${this.story.title}"`
        };
      }

      if (!data.gameState) {
        return {
          success: false,
          error: 'Invalid save file format: missing gameState'
        };
      }

      // Restore state with interaction timestamp conversion
      this.gameState = {
        ...data.gameState,
        interactions: data.gameState.interactions?.map((interaction: any) => ({
          ...interaction,
          timestamp: new Date(interaction.timestamp)
        })) || []
      };

      // Restore memory manager state if available
      if (data.memoryManagerState) {
        this.memoryManager.importState(data.memoryManagerState);
      }

      // Restore UI state
      if (this.uiRestoreCallback) {
        // Convert interactions back to legacy dialogue format for UI compatibility
        const recentDialogue = this.gameState.interactions.flatMap(interaction => [
          `Player: ${interaction.playerInput}`,
          `Response: ${interaction.llmResponse}`
        ]);
        this.uiRestoreCallback(this.gameState, recentDialogue);
      }

      return {
        success: true,
        data: { ...this.gameState }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load save file: ${error instanceof Error ? error.message : 'Invalid JSON format'}`
      };
    }
  }
}