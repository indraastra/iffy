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
  FormatterRule,
  ImpressionistCharacter
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
  // Convert to string first
  let text: string;
  if (Array.isArray(narrative)) {
    text = narrative.join('\n\n');
  } else {
    text = narrative;
  }
  
  // Apply text preprocessing to fix common formatting issues
  // Add spaces around em-dashes for better readability
  text = text.replace(/(\w)—(\w)/g, '$1 — $2');  // word—word becomes word — word
  text = text.replace(/(\w)—(\s)/g, '$1 —$2');   // word— space becomes word — space
  text = text.replace(/(\s)—(\w)/g, '$1— $2');   // space —word becomes space — word
  
  // If formatters are provided and narrative was an array, apply them
  if (formatters && formatters.length > 0 && Array.isArray(narrative)) {
    const { renderMarkup } = useMarkdownRenderer();
    return renderMarkup(text, formatters);
  }
  
  return text;
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
  // private uiShowTypingCallback?: () => void; // Removed for flag system
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
        context,
        this.gameState.currentScene,
        currentScene.sketch
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
        // Process post-ending input with flag system
        const finalResponse = await this.director.processInputStreaming(context, action.input);
        
        // For post-ending, still update UI immediately for consistency
        if (this.uiAddMessageCallback) {
          const formatters = this.story?.ui?.formatters || [];
          this.uiAddMessageCallback(normalizeNarrative(finalResponse.narrative, formatters), 'story');
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
      
      // Get LLM response with flag-based processing
      const finalResponse = await this.director.processInputStreaming(context, action.input);
      
      console.log('📝 Response ready:', normalizeNarrative(finalResponse.narrative));
      
      // Ensure we have a response
      if (!finalResponse) {
        throw new Error('No response received from director');
      }
      
      // Track metrics
      if ((finalResponse as any).usage) {
        const usage = (finalResponse as any).usage;
        this.metrics.trackRequest(
          usage.input_tokens,
          usage.output_tokens,
          (finalResponse as any).latencyMs || 0,
          (finalResponse as any).contextSize || 0,
          context.activeMemory?.length || 0,
          this.gameState.currentScene
        );
      }
      
      // Apply any signals from the final response (but don't trigger ending callback yet)
      this.applyDirectorSignals(finalResponse);
      
      // Check for automatic scene transitions after applying flag changes
      const transitionTriggered = this.checkAutomaticTransitions();
      
      let finalNarrative: string;
      let displayResponse = finalResponse;
      
      if (transitionTriggered) {
        // Generate transition narrative with action response handoff
        const targetScene = this.story?.scenes[transitionTriggered];
        if (targetScene) {
          const transitionResponse = await this.director.processSceneTransition(
            context,
            transitionTriggered,
            targetScene.sketch,
            action.input,
            Array.isArray(finalResponse.narrative) ? finalResponse.narrative : [finalResponse.narrative] // Pass action response for narrative handoff
          );
          
          // Use transition response instead of action response
          displayResponse = transitionResponse;
          finalNarrative = normalizeNarrative(transitionResponse.narrative);
          
          // Store transition memories
          if (transitionResponse.memories) {
            transitionResponse.memories.forEach(memory => {
              this.memoryManager.addMemory(memory, transitionResponse.importance || 7);
            });
          }
        } else {
          finalNarrative = normalizeNarrative(finalResponse.narrative);
        }
        
        // Update scene state
        this.handleSceneTransition(transitionTriggered);
      } else {
        // No transition - use original action response
        finalNarrative = normalizeNarrative(finalResponse.narrative);
      }

      // Display final response via UI callback (only once - either action or transition)
      if (this.uiAddMessageCallback) {
        // Hide the initial loading indicator
        if (this.uiHideTypingCallback) {
          this.uiHideTypingCallback();
        }
        
        // Display the final response (action or transition)
        this.uiAddMessageCallback(finalNarrative, 'story');
      }
      
      // Check for automatic endings after applying flag changes
      const endingTriggered = this.checkAutomaticEndings();
      if (endingTriggered) {
        // Generate ending narrative through director
        const endingInfo = this.story?.endings?.variations.find(e => e.id === endingTriggered);
        if (endingInfo) {
          const endingResponse = await this.director.processEndingAction(
            context, 
            action.input, 
            { id: endingTriggered, content: endingInfo.sketch }
          );
          
          // Update the display response with ending narrative
          displayResponse.narrative = endingResponse.narrative;
          displayResponse.memories = [...(displayResponse.memories || []), ...(endingResponse.memories || [])];
          displayResponse.signals = { ...displayResponse.signals, ...endingResponse.signals };
        }
        
        this.gameState.isEnded = true;
        this.gameState.endingId = endingTriggered;
      }
      
      // Check if an ending was actually triggered after applying signals (not just if signal existed)
      const isEndingTriggered = this.gameState.isEnded;
      
      // Track the interaction (using the response that was actually displayed)
      this.trackInteraction(action.input, finalNarrative, {
        usage: (displayResponse as any).usage,
        latencyMs: (displayResponse as any).latencyMs,
        signals: displayResponse.signals,
        llmImportance: displayResponse.importance,
        memories: displayResponse.memories,
        isTransitionPart: transitionTriggered ? true : false
      });

      // Return empty text since UI callback handled the display
      return {
        text: this.uiAddMessageCallback ? '' : finalNarrative, // Fallback if no callback set
        gameState: { ...this.gameState },
        error: displayResponse.signals?.error,
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
      currentSceneId: this.gameState.currentScene, // Add current scene ID for transition handling
      
      // Recent activity (~300 tokens) 
      recentInteractions: this.gameState.interactions,
      activeMemory: this.getRelevantMemories(input),
      
      // Guidance (~100 tokens)
      guidance: this.story!.guidance,
      sceneGuidance: currentScene.guidance
    };

    // Available transitions (~100 tokens)
    context.currentTransitions = {};
    
    // Modern flag-based transitions
    if (currentScene.transitions) {
      for (const [sceneId, transition] of Object.entries(currentScene.transitions)) {
        const targetScene = this.story!.scenes[sceneId];
        if (targetScene) {
          // Convert flag conditions to readable description
          let conditionDesc = (transition as any).when || 'flag conditions met';
          if ((transition as any).requires) {
            const requires = (transition as any).requires;
            const parts: string[] = [];
            if (requires.all_of) parts.push(`ALL: ${requires.all_of.join(', ')}`);
            if (requires.any_of) parts.push(`ANY: ${requires.any_of.join(', ')}`);
            if (requires.none_of) parts.push(`NONE: ${requires.none_of.join(', ')}`);
            conditionDesc = parts.join(' AND ');
          }
          
          context.currentTransitions[sceneId] = {
            condition: conditionDesc,
            sketch: targetScene.sketch
          };
        }
      }
    }
    
    // Legacy leads_to support
    if (currentScene.leads_to) {
      for (const [sceneId, condition] of Object.entries(currentScene.leads_to)) {
        const targetScene = this.story!.scenes[sceneId];
        if (targetScene && !context.currentTransitions[sceneId]) { // Don't override modern transitions
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

      // Add active characters with evaluated behaviors
      if (this.story!.world.characters) {
        context.activeCharacters = Object.values(this.story!.world.characters)
          .map(character => this.evaluateCharacterBehavior(character));
      }
    }

    return context;
  }

  /**
   * Evaluate character behavior based on current flag states
   */
  private evaluateCharacterBehavior(character: ImpressionistCharacter): ImpressionistCharacter {
    const flagManager = this.director.getFlagManager();
    if (!character.behaviors || !flagManager) {
      return character;
    }

    // Start with base behavior
    let currentBehavior = character.behaviors.base;
    
    // Evaluate conditional behaviors and layer them
    if (character.behaviors.states) {
      for (const behaviorState of character.behaviors.states) {
        if (behaviorState.when && flagManager.checkConditions(behaviorState.when)) {
          // Found an active behavior - use it (later behaviors override earlier ones)
          currentBehavior = behaviorState.description;
        }
      }
    }

    // Return character with evaluated behavior as the sketch
    return {
      ...character,
      sketch: currentBehavior
    };
  }



  /**
   * Apply signals from LLM Director response
   */
  private applyDirectorSignals(response: DirectorResponse) {
    if (!response.signals) return;

    // Item discovery
    if (response.signals.discover) {
      this.handleItemDiscovery(response.signals.discover);
    }

    // Scene transition
    if (response.signals.transition) {
      this.handleSceneTransition(response.signals.transition);
    }

    // Story ending
    if (response.signals.endStory) {
      this.gameState.isEnded = true;
      if (response.signals.endingId) {
        this.gameState.endingId = response.signals.endingId;
      }
    }
  }

  /**
   * Check for automatic scene transitions based on current flags
   */
  private checkAutomaticTransitions(): string | undefined {
    if (!this.story) return undefined;
    
    const flagManager = this.director.getFlagManager();
    if (!flagManager) return undefined;
    
    const currentScene = this.getCurrentScene();
    if (!currentScene?.transitions) return undefined;
    
    // Check flag-based transitions
    for (const [sceneId, transition] of Object.entries(currentScene.transitions)) {
      if (transition.requires && flagManager.checkConditions(transition.requires)) {
        return sceneId;
      }
    }
    
    return undefined;
  }

  /**
   * Check for automatic story endings based on current flags
   */
  private checkAutomaticEndings(): string | undefined {
    if (!this.story?.endings) return undefined;
    
    const flagManager = this.director.getFlagManager();
    if (!flagManager) return undefined;
    
    // Check global ending conditions first
    if (this.story.endings.requires && !flagManager.checkConditions(this.story.endings.requires)) {
      return undefined; // Global conditions not met
    }
    
    // Check individual ending conditions
    for (const ending of this.story.endings.variations) {
      if (ending.requires && flagManager.checkConditions(ending.requires)) {
        return ending.id;
      }
    }
    
    return undefined;
  }

  /**
   * Handle scene transition
   */
  private handleSceneTransition(targetSceneId: string) {
    if (!this.story?.scenes[targetSceneId]) {
      console.warn(`Cannot transition to unknown scene: ${targetSceneId}`);
      return;
    }

    const previousScene = this.gameState.currentScene;
    this.gameState.currentScene = targetSceneId;
    
    // Update location if the new scene has a location
    const newScene = this.story.scenes[targetSceneId];
    if (newScene.location) {
      this.director.setLocationFlag(newScene.location);
      this.previousLocation = this.story.scenes[previousScene]?.location;
    }

    console.log(`🎬 Scene transition: ${previousScene} -> ${targetSceneId}`);
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
      // Only log high-importance memory storage
      if (importance >= 8) {
        console.log(`💭 Stored high-importance interaction as memory (importance: ${importance})`);
      }
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
    
    // Clean up flag manager before loading new story
    this.director.resetFlags();
    
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

  setUIShowTypingCallback(_callback: () => void): void {
    // No longer used in flag system
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
        this.uiRestoreCallback(this.gameState, []);
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