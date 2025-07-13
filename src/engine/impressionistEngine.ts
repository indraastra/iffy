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
  ImpressionistInteraction,
  FormatterRule
} from '@/types/impressionistStory';
import { MultiModelService } from '@/services/multiModelService';
import { LangChainDirector } from './langChainDirector';
import { MetricsCollector } from './metricsCollector';
import { ImpressionistMemoryManager } from './impressionistMemoryManager';
import { normalizeYamlText } from '@/utils/textNormalization';
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer';

/**
 * Convert narrative from string[] to string, optionally applying formatters per-element
 */
function normalizeNarrative(narrative: string | string[], formatters?: FormatterRule[]): string {
  if (!Array.isArray(narrative)) {
    return narrative;
  }
  
  // If formatters are provided, apply them to each element individually before joining
  if (formatters && formatters.length > 0) {
    const { renderMarkup } = useMarkdownRenderer();
    return renderMarkup(narrative, formatters);
  }
  
  // Otherwise, just join the array
  return narrative.join('\n\n');
}

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
  private readonly CONTEXT_MEMORIES_LIMIT = 25; // memories passed to LLM context
  private readonly MEMORY_COMPACTION_FREQUENCY = 5; // compact every N memories
  private readonly INTERACTION_ROLLING_WINDOW = 20; // max interactions stored in state
  
  private story: ImpressionistStory | null = null;
  private gameState: ImpressionistState = this.createInitialState();
  private director: LangChainDirector;
  private metrics: MetricsCollector;
  private memoryManager: ImpressionistMemoryManager;
  private multiModelService?: MultiModelService;
  private previousLocation?: string; // For smart location context
  
  // Callbacks for UI integration
  private uiResetCallback?: () => void;
  private uiRestoreCallback?: (gameState: any, conversationHistory?: any[]) => void;
  private uiAddMessageCallback?: (text: string, type: string) => void;
  private uiShowTypingCallback?: () => void;
  private uiHideTypingCallback?: () => void;

  constructor(multiModelService?: MultiModelService) {
    this.multiModelService = multiModelService;
    this.director = new LangChainDirector(multiModelService);
    this.metrics = new MetricsCollector();
    this.memoryManager = new ImpressionistMemoryManager(multiModelService);
    
    // Wire up MultiModelService to metrics collector for accurate pricing
    if (multiModelService) {
      this.metrics.setMultiModelService(multiModelService);
    }
    
    // Configure memory manager with our compaction frequency
    this.memoryManager.setCompactionInterval(this.MEMORY_COMPACTION_FREQUENCY);
  }

  /**
   * Load a story in impressionist format
   */
  loadStory(story: ImpressionistStory): ImpressionistResult<ImpressionistState> {
    try {
      // Basic validation
      if (!story || !story.title || !story.scenes || Object.keys(story.scenes).length === 0) {
        return {
          success: false,
          error: 'Invalid story: missing required fields (title, scenes)'
        };
      }

      // Reset everything for new game
      this.resetForNewGame();

      this.story = story;
      
      // Initialize flag system with the story
      this.director.initializeFlags(story);
      
      // Set initial scene (first scene key is entry point)
      const sceneKeys = Object.keys(story.scenes);
      if (sceneKeys.length > 0) {
        this.gameState.currentScene = sceneKeys[0];
      } else {
        throw new Error('Story has no scenes');
      }

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
   * Get initial story text - returns null if LLM processing needed
   */
  getInitialText(): string | null {
    if (!this.story) return 'No story loaded. Please load a story to begin.';
    
    const sceneKeys = Object.keys(this.story.scenes);
    if (sceneKeys.length === 0) {
      return 'Story loaded, but no scenes available.';
    }
    
    const firstScene = this.story.scenes[sceneKeys[0]];
    if (!firstScene?.sketch) {
      return 'Story loaded, but no initial content available.';
    }
    
    // If scene should be processed through LLM, return null to indicate processing needed
    if (firstScene.process_sketch !== false) {
      return null; // Signal that LLM processing is required
    }
    
    // Normalize YAML content for browser display
    return normalizeYamlText(firstScene.sketch);
  }

  /**
   * Process initial scene through LLM if needed
   */
  async processInitialScene(): Promise<GameResponse> {
    if (!this.story) {
      throw new Error('No story loaded');
    }
    
    const sceneKeys = Object.keys(this.story.scenes);
    if (sceneKeys.length === 0) {
      throw new Error('No scenes available');
    }
    
    // Set the current scene if not already set
    if (!this.gameState.currentScene) {
      this.gameState.currentScene = sceneKeys[0];
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

      // Build context for initial scene establishment
      const context = this.buildDirectorContext('<BEGIN STORY>', currentScene);
      
      // Process initial scene as a transition/establishment rather than an action
      const response = await this.director.processInitialSceneEstablishment(
        this.gameState.currentScene,
        currentScene.sketch,
        context
      );
      
      // Log the response for debugging (same as regular actions)
      console.log('📝 Initial scene response ready:', normalizeNarrative(response.narrative));
      
      // Track this initial scene processing in memory
      this.trackInteraction('<BEGIN STORY>', normalizeNarrative(response.narrative), {
        initialScene: true,
        llmImportance: response.importance,
        memories: response.memories
      });

      return {
        text: normalizeNarrative(response.narrative),
        gameState: { ...this.gameState },
        error: response.signals?.error
      };
    } catch (error) {
      // If the request was cancelled (e.g., due to loading a new game), silently return
      if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('Aborted'))) {
        return {
          text: '',
          gameState: this.gameState,
          error: undefined
        };
      }
      
      console.error('Error processing initial scene:', error);
      return {
        text: 'Sorry, I had trouble setting up the initial scene.',
        gameState: this.gameState,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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
        // Use streaming even for post-ending, but consume all responses
        const responseGenerator = this.director.processInputStreaming(action.input, context);
        let finalResponse: DirectorResponse | undefined;
        
        for await (const response of responseGenerator) {
          finalResponse = response;
          
          // For post-ending, still update UI immediately for consistency
          if (this.uiAddMessageCallback) {
            const formatters = this.story?.ui?.formatters || [];
            this.uiAddMessageCallback(normalizeNarrative(response.narrative, formatters), 'story');
          }
        }
        
        if (!finalResponse) {
          throw new Error('No response received from director');
        }
        
        // Track this post-ending interaction
        this.trackInteraction(action.input, normalizeNarrative(finalResponse.narrative), {
          postEnding: true,
          llmImportance: finalResponse.importance,
          memories: finalResponse.memories
        });
        
        return {
          text: normalizeNarrative(finalResponse.narrative),
          gameState: { ...this.gameState },
          error: finalResponse.signals?.error
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
      
      // Get LLM response with transition streaming for immediate UI updates
      const responseGenerator = this.director.processInputStreaming(action.input, context);
      let finalResponse: DirectorResponse | undefined;
      let partCount = 0;
      let hasDisplayedFirstPart = false;
      const allResponses: DirectorResponse[] = [];

      for await (const partialResponse of responseGenerator) {
        partCount++;
        console.log(`📝 Response part ${partCount} ready:`, normalizeNarrative(partialResponse.narrative));
        
        // Collect each response for separate tracking
        allResponses.push(partialResponse);
        
        // Display each part immediately via UI callback
        if (this.uiAddMessageCallback) {
          if (!hasDisplayedFirstPart) {
            // Hide the initial loading indicator from processInput before showing first response
            if (this.uiHideTypingCallback) {
              this.uiHideTypingCallback();
            }
            
            // First part - display immediately
            const formatters = this.story?.ui?.formatters || [];
            this.uiAddMessageCallback(normalizeNarrative(partialResponse.narrative, formatters), 'story');
            hasDisplayedFirstPart = true;
            
            // If there will be more parts (i.e., a scene or ending transition), show new loading indicator
            // We can detect this by checking if this response has a scene or ending signal
            if ((partialResponse.signals?.scene || partialResponse.signals?.ending) && this.uiShowTypingCallback) {
              const transitionType = partialResponse.signals?.scene ? 'scene transition' : 'story ending';
              console.log(`📝 Showing loading indicator for upcoming ${transitionType}`);
              this.uiShowTypingCallback();
            }
          } else {
            // Hide any loading indicator before showing subsequent parts
            if (this.uiHideTypingCallback) {
              this.uiHideTypingCallback();
            }
            // Subsequent parts - display
            const formatters = this.story?.ui?.formatters || [];
            this.uiAddMessageCallback(normalizeNarrative(partialResponse.narrative, formatters), 'story');
          }
        }
        
        finalResponse = partialResponse; // Keep track of the final response for state management
      }

      // Ensure we have a response
      if (!finalResponse || allResponses.length === 0) {
        throw new Error('No response received from director');
      }
      
      // Track metrics for each response part
      for (const response of allResponses) {
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
      }
      
      // Apply any signals from the final response (but don't trigger ending callback yet)
      this.applyDirectorSignals(finalResponse);
      
      // Check if an ending was actually triggered after applying signals (not just if signal existed)
      const isEndingTriggered = this.gameState.isEnded;
      
      // Track each response as a separate interaction
      for (let i = 0; i < allResponses.length; i++) {
        const response = allResponses[i];
        const isFirstPart = i === 0;
        const isTransitionPart = i > 0;
        
        // For multi-part responses, modify the input to indicate the part
        let interactionInput = action.input;
        if (allResponses.length > 1) {
          if (isFirstPart) {
            interactionInput = `${action.input} [Action Phase]`;
          } else {
            // Determine if this is a scene transition or ending transition
            const phaseType = allResponses[0].signals?.ending ? 'Ending Phase' : 'Transition Phase';
            interactionInput = `${action.input} [${phaseType}]`;
          }
        }
        
        this.trackInteraction(interactionInput, normalizeNarrative(response.narrative), {
          usage: (response as any).usage,
          latencyMs: (response as any).latencyMs,
          signals: response.signals,
          llmImportance: response.importance,
          memories: response.memories,
          isTransitionPart
        });
      }

      // Return empty text since streaming callback handled the display
      return {
        text: hasDisplayedFirstPart ? '' : normalizeNarrative(finalResponse.narrative), // Fallback if no callback set
        gameState: { ...this.gameState },
        error: finalResponse.signals?.error,
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
    return this.story.scenes[this.gameState.currentScene] || null;
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
      guidance: this.story!.guidance,
      sceneGuidance: currentScene.guidance
    };

    // Available transitions (~100 tokens)
    if (currentScene.leads_to) {
      context.currentTransitions = {};
      for (const [sceneId, condition] of Object.entries(currentScene.leads_to)) {
        const targetScene = this.story!.scenes[sceneId];
        if (targetScene) {
          context.currentTransitions[sceneId] = {
            condition: condition as string,
            sketch: targetScene.sketch
          };
        }
      }
    }

    // Available endings (~100 tokens) - required for ActionClassifier
    if (this.story!.endings) {
      context.availableEndings = this.story!.endings;
    }

    // Narrative metadata (~50 tokens if defined)
    if (this.story!.narrative) {
      context.narrative = this.story!.narrative;
    }

    // Optional enrichment (~200 tokens)
    if (this.story!.world) {
      // Add smart location context based on scene location reference
      if (currentScene.location && this.story!.world.locations) {
        const location = this.story!.world.locations[currentScene.location];
        if (location) {
          context.location = location;
          context.previousLocation = this.previousLocation;
        }
      }

      // Add discoverable items in current scene's location
      if (currentScene.location && this.story!.world.items) {
        context.discoverableItems = Object.values(this.story!.world.items)
          .filter(item => item.found_in === currentScene.location);
      }

      // Add active characters
      if (this.story!.world.characters) {
        context.activeCharacters = Object.values(this.story!.world.characters);
      }
    }

    return context;
  }


  /**
   * Check if a signal value is valid (not null, 'null', 'none', or empty)
   */
  private isValidSignal(signal: string | undefined | null): signal is string {
    return signal != null && 
           signal !== 'null' && 
           signal !== 'none' && 
           signal.trim() !== '';
  }

  /**
   * Apply signals from LLM Director response without triggering ending callback
   */
  private applyDirectorSignals(response: DirectorResponse) {
    if (!response.signals) return;

    // Scene transitions
    if (this.isValidSignal(response.signals.scene)) {
      this.transitionToScene(response.signals.scene);
    }

    // Ending triggers (but don't call callback)
    if (this.isValidSignal(response.signals.ending)) {
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

    const targetScene = this.story.scenes[sceneId];
    if (targetScene) {
      console.log(`Scene transition: ${this.gameState.currentScene} -> ${sceneId}`);
      
      // Track location changes for smart context
      const currentScene = this.story.scenes[this.gameState.currentScene];
      if (currentScene?.location !== targetScene.location) {
        this.previousLocation = currentScene?.location;
      }
      
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

    // Add specific memories to memory manager if LLM provided them
    if (metadata?.memories && Array.isArray(metadata.memories)) {
      metadata.memories.forEach((memory: string) => {
        this.memoryManager.addMemory(memory, importance);
      });
      console.log(`💭 Stored ${metadata.memories.length} specific memories from LLM (importance: ${importance})`);
    } else {
      // Fallback: store full interaction as before when no specific memories provided
      const interactionMemory = `Player: ${playerInput}\nResponse: ${llmResponse}`;
      this.memoryManager.addMemory(interactionMemory, importance);
      console.log(`💭 Stored full interaction as memory (importance: ${importance})`);
    }

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

  setUIAddMessageCallback(callback: (text: string, type: string) => void): void {
    this.uiAddMessageCallback = callback;
  }

  setUIShowTypingCallback(callback: () => void): void {
    this.uiShowTypingCallback = callback;
  }

  setUIHideTypingCallback(callback: () => void): void {
    this.uiHideTypingCallback = callback;
  }


  setLoadingStateCallback(_callback: (message: string) => void): void {
    // Not implemented in impressionist engine yet
  }

  setDebugPane(debugPane: any): void {
    this.director.setDebugPane(debugPane);
    this.metrics.setDebugPane(debugPane);
    this.memoryManager.setDebugPane(debugPane);
    
    // Also pass memory manager to debug pane for tools
    debugPane.setMemoryManager(this.memoryManager);
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
          llmResponse: Array.isArray(interaction.llmResponse) 
            ? interaction.llmResponse.join('\n\n') 
            : interaction.llmResponse,
          timestamp: interaction.timestamp.toISOString()
        }))
      },
      memoryManagerState: this.memoryManager.exportState(),
      storyTitle: this.story?.title,
      storyVersion: this.story?.version,
      saveTimestamp: new Date().toISOString()
    });
  }

  loadGame(saveData: string): ImpressionistResult<ImpressionistState> {
    try {
      // Cancel any outstanding requests (like initial scene processing)
      if (this.multiModelService) {
        this.multiModelService.cancelActiveRequests();
      }
      
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
          llmResponse: Array.isArray(interaction.llmResponse) 
            ? interaction.llmResponse.join('\n\n') 
            : interaction.llmResponse,
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