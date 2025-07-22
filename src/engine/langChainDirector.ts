/**
 * LangChain Director - Handles scene transitions using flag-based state management
 * 
 * PUBLIC API METHODS (use these):
 * - processInputStreaming() - Main entry point for all player input (streaming)
 * - processInitialSceneEstablishment() - For story opening scenes
 * 
 * INTERNAL METHODS (don't call directly):
 * - processAction() - Handles player actions and extracts flag changes
 * - processSceneTransition() - Establishes new scenes based on flags
 * - processPostEndingInput() - Handles post-story reflection/exploration
 */

import { DirectorContext, DirectorResponse } from '@/types/impressionistStory';
import { LangChainPrompts } from './langChainPrompts';
import { MultiModelService } from '@/services/multiModelService';
import { DirectorResponseSchema } from '@/schemas/directorSchemas';
import { FlagManager, FlagChange } from './FlagManager';
// StoryData type is now imported via FlagManager

export interface TransitionCallbacks {
  onActionComplete?: (response: DirectorResponse) => void;
  onTransitionStart?: (targetSceneId: string) => void;
  onTransitionComplete?: (response: DirectorResponse) => void;
}

export interface LangChainDirectorOptions {
  enableStreaming?: boolean;
  debugMode?: boolean;
}

export class LangChainDirector {
  private multiModelService: MultiModelService;
  private options: LangChainDirectorOptions;
  private debugPane?: any;
  private flagManager?: FlagManager;

  constructor(
    multiModelService?: MultiModelService, 
    options: LangChainDirectorOptions = {}
  ) {
    this.options = {
      enableStreaming: false,
      debugMode: false,
      ...options
    };
    
    // Use options for future extensibility
    if (this.options.debugMode) {
      console.log('LangChain Director initialized in debug mode');
    }

    this.multiModelService = multiModelService || new MultiModelService();
  }

  /**
   * Initialize flag system with story data
   */
  initializeFlags(story: any): void {
    this.flagManager = new FlagManager(story);
    
    // Update debug pane with initial flag states
    if (this.debugPane && this.debugPane.updateFlagStates) {
      try {
        this.debugPane.updateFlagStates(this.flagManager?.getAllFlags() || {});
      } catch (error) {
        console.log('Error updating debug pane flag states during initialization:', error);
      }
    }
  }

  /**
   * Set debug pane for logging (optional)
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
    
    // Update debug pane with current flag states if flag manager exists
    if (this.flagManager && this.debugPane && this.debugPane.updateFlagStates) {
      try {
        this.debugPane.updateFlagStates(this.flagManager?.getAllFlags() || {});
      } catch (error) {
        console.log('Error updating debug pane flag states when setting debug pane:', error);
      }
    }
  }

  /**
   * Check if the director is properly configured
   */
  isConfigured(): boolean {
    return this.multiModelService.isConfigured();
  }

  /**
   * Common method to handle LLM requests with consistent error handling and logging
   */
  private async makeLLMRequest(
    promptBuilder: () => string,
    logLabel: string,
    contextInfo: { scene: string; memories: number; transitions: number },
    defaultImportance: number = 5
  ): Promise<DirectorResponse> {
    if (!this.isConfigured()) {
      return {
        narrative: ["🔑 API key required. Please configure your LLM provider in Settings to play."],
        memories: [],
        importance: 1,
        signals: { error: "API key not configured" }
      };
    }

    const startTime = performance.now();
    const fullPrompt = promptBuilder();
    
    console.log(`📝 ${logLabel} Prompt:`, fullPrompt);
    
    // Use structured output with creative temperature for narrative generation
    const result = await this.multiModelService.makeStructuredRequest(
      fullPrompt,
      DirectorResponseSchema,
      { temperature: 0.7 } // Higher temperature for creative storytelling
    );

    const latencyMs = performance.now() - startTime;
    
    console.log(`📝 ${logLabel} Response:`, result.data);

    // Handle narrativeParts - check for double-encoded JSON
    let narrativeArray: string[];
    const rawNarrativeParts = result.data.narrativeParts;
    
    // If narrativeParts is a string that looks like a JSON array, try to parse it
    if (typeof rawNarrativeParts === 'string' && 
        rawNarrativeParts.trim().startsWith('[') && 
        rawNarrativeParts.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(rawNarrativeParts);
        if (Array.isArray(parsed)) {
          console.log('📝 Detected double-encoded narrativeParts, parsing JSON array');
          narrativeArray = parsed;
        } else {
          narrativeArray = [rawNarrativeParts];
        }
      } catch (e) {
        // Not valid JSON, treat as single paragraph
        console.log('📝 NarrativeParts looks like JSON but failed to parse, wrapping in array');
        narrativeArray = [rawNarrativeParts];
      }
    } else if (typeof rawNarrativeParts === 'string') {
      // Single string, wrap in array
      narrativeArray = [rawNarrativeParts];
    } else if (Array.isArray(rawNarrativeParts)) {
      // Already an array
      narrativeArray = rawNarrativeParts;
    } else {
      // Fallback - ensure we always have an array
      console.warn('📝 Unexpected narrativeParts type, using fallback');
      narrativeArray = ['An error occurred processing the narrative.'];
    }

    // Convert structured data to DirectorResponse
    const response: DirectorResponse = {
      narrative: narrativeArray,  // Keep as array to support per-element formatter processing
      memories: result.data.memories || [],
      importance: result.data.importance || defaultImportance,
      signals: result.data.signals || {},
      actualFlags: {
        set: result.data.flagChanges?.set || [],
        unset: result.data.flagChanges?.unset || []
      }
    };

    // Extract usage information for logging and metadata
    const usage = result.usage;

    // Log to debug pane if available
    if (this.debugPane) {
      // General debug logging
      if (this.debugPane.log) {
        try {
          this.debugPane.log(`=== ${logLabel} ===`);
          this.debugPane.log(`Scene: ${contextInfo.scene}`);
          this.debugPane.log(`Context: ${contextInfo.memories} memories, ${contextInfo.transitions} transitions`);
          this.debugPane.log(`Latency: ${latencyMs.toFixed(0)}ms`);
          if (usage) {
            this.debugPane.log(`Usage: ${usage.input_tokens} prompt + ${usage.output_tokens} completion = ${usage.total_tokens} total`);
          }
          this.debugPane.log(`Narrative (${narrativeArray.length} parts):`);
          this.debugPane.log(narrativeArray.join('\n\n'));
          if (response.memories && response.memories.length > 0) {
            this.debugPane.log(`Memories: ${response.memories.join(', ')}`);
          }
          if (response.signals && Object.keys(response.signals).length > 0) {
            this.debugPane.log(`Signals: ${JSON.stringify(response.signals)}`);
          }
          this.debugPane.log('---');
        } catch (error) {
          console.log('Error calling debug pane log:', error);
        }
      }

      // LLM interaction logging
      if (this.debugPane.logLlmCall) {
        try {
          this.debugPane.logLlmCall({
            prompt: { 
              text: fullPrompt.length > 200 ? fullPrompt.substring(0, 200) + '...' : fullPrompt,
              tokenCount: usage?.input_tokens || Math.ceil(fullPrompt.length / 4)
            },
            response: { 
              narrative: narrativeArray.join(' '),
              memories: response.memories,
              importance: response.importance,
              tokenCount: usage?.output_tokens || Math.ceil(narrativeArray.join(' ').length / 4)
            },
            context: { 
              scene: contextInfo.scene,
              memories: contextInfo.memories,
              transitions: contextInfo.transitions
            }
          });
        } catch (error) {
          console.log('Error calling debug pane logLlmCall:', error);
        }
      }
    }

    return response;
  }

  /**
   * Process initial scene establishment (first response in a story)
   */
  async processInitialSceneEstablishment(
    context: DirectorContext, 
    sceneId: string, 
    sceneSketch: string
  ): Promise<DirectorResponse> {
    if (!this.flagManager) {
      throw new Error('FlagManager not initialized. Call initializeFlags() first.');
    }

    // Build the initial scene prompt
    const promptBuilder = () => {
      const contextPreamble = LangChainPrompts.buildContextWithFlagManager(context, this.flagManager!);
      const instructions = LangChainPrompts.buildInitialSceneInstructions(sceneId, sceneSketch);
      return `${contextPreamble}\n\n${instructions}`;
    };

    return this.makeLLMRequest(
      promptBuilder,
      'Initial Scene',
      {
        scene: sceneId,
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      7 // Higher importance for opening scenes
    );
  }

  /**
   * Main entry point for processing player input
   */
  async processInputStreaming(
    context: DirectorContext,
    playerInput: string,
    callbacks?: TransitionCallbacks
  ): Promise<DirectorResponse> {
    if (!this.flagManager) {
      throw new Error('Flag system not initialized. Call initializeFlags() first.');
    }

    // Handle post-ending mode separately
    if (context.storyComplete) {
      return this.processPostEndingInput(context, playerInput);
    }

    // Single-phase processing: Generate narrative with flag changes
    const response = await this.processAction(context, playerInput);

    // Apply flag changes from the narrative response
    if (response.actualFlags && (response.actualFlags.set.length > 0 || response.actualFlags.unset.length > 0)) {
      const flagChange: FlagChange = {
        set: response.actualFlags.set,
        clear: response.actualFlags.unset
      };
      this.flagManager?.applyChanges(flagChange);
      
      // Update debug pane with current flag states
      if (this.debugPane && this.debugPane.updateFlagStates) {
        try {
          this.debugPane.updateFlagStates(this.flagManager?.getAllFlags() || {});
        } catch (error) {
          console.log('Error updating debug pane flag states:', error);
        }
      }
    }

    // Check for transitions/endings after applying flags
    const transitionTriggered = this.checkTransitions(context);
    const endingTriggered = this.checkEndings(context);

    // If transition or ending is triggered, handle two-phase processing
    if (transitionTriggered) {
      callbacks?.onTransitionStart?.(transitionTriggered.targetScene);
      
      // Generate transition narrative
      const transitionResponse = await this.processTransitionAction(
        context,
        playerInput,
        transitionTriggered
      );
      
      // Transitions handled automatically by flag system
      // No need to add transition signals
      
      // Return transition response with flag-based handling
      callbacks?.onTransitionComplete?.(transitionResponse);
      return transitionResponse;
    }

    if (endingTriggered) {
      // Generate ending narrative
      const endingResponse = await this.processEndingAction(
        context,
        playerInput,
        endingTriggered
      );
      
      // Endings handled automatically by flag system
      // No need to add ending signals
      
      return endingResponse;
    }

    // Debug logging
    if (this.debugPane && this.debugPane.log) {
      try {
        this.debugPane.log(`=== Action Processing ===`);
        this.debugPane.log(`Player: "${playerInput}"`);
        
        if (response.actualFlags?.set.length || response.actualFlags?.unset.length) {
          this.debugPane.log(`Flag changes from narrative:`);
          if (response.actualFlags?.set.length) {
            this.debugPane.log(`  Set: ${response.actualFlags.set.join(', ')}`);
          }
          if (response.actualFlags?.unset.length) {
            this.debugPane.log(`  Unset: ${response.actualFlags.unset.join(', ')}`);
          }
        }
        
        this.debugPane.log(`Current flags: ${this.flagManager?.getDebugString() || 'none'}`);
        this.debugPane.log('---');
      } catch (error) {
        console.log('Error calling debug pane log:', error);
      }
    }

    return response;
  }

  /**
   * Process a regular action with flag changes
   */
  private async processAction(
    context: DirectorContext,
    playerInput: string
  ): Promise<DirectorResponse> {
    const promptBuilder = () => {
      const contextPreamble = this.flagManager 
        ? LangChainPrompts.buildContextWithFlagManager(context, this.flagManager)
        : LangChainPrompts.buildActionContextPreamble(context, '');
      const instructions = this.flagManager
        ? LangChainPrompts.buildActionInstructionsWithFlagGuidance(context, this.flagManager)
        : LangChainPrompts.buildActionInstructions(context);
      
      return `${contextPreamble}

${instructions}

**PLAYER ACTION:** ${playerInput}`;
    };

    return this.makeLLMRequest(
      promptBuilder,
      'Action',
      {
        scene: context.currentSketch ? 'current_scene' : 'unknown',
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      5 // Standard importance
    );
  }

  /**
   * Check if current flag state triggers any transitions
   */
  private checkTransitions(context: DirectorContext): { targetScene: string; content: string } | undefined {
    if (!context.currentTransitions || !this.flagManager) return undefined;

    for (const [sceneId, transitionData] of Object.entries(context.currentTransitions)) {
      if (transitionData.condition && this.flagManager.checkConditions(transitionData.condition)) {
        return {
          targetScene: sceneId,
          content: transitionData.sketch || `Transition to ${sceneId}`
        };
      }
    }

    return undefined;
  }

  /**
   * Check if current flag state triggers any endings
   */
  private checkEndings(context: DirectorContext): { id: string; content: string } | undefined {
    if (!context.availableEndings || !this.flagManager) return undefined;

    for (const ending of context.availableEndings.variations) {
      if (ending.requires && this.flagManager.checkConditions(ending.requires)) {
        return {
          id: ending.id,
          content: ending.sketch || `Ending: ${ending.id}`
        };
      }
    }

    return undefined;
  }



  /**
   * Process an action that triggers a transition
   */
  private async processTransitionAction(
    context: DirectorContext,
    playerInput: string,
    transitionInfo: { targetScene: string; content: string }
  ): Promise<DirectorResponse> {
    const promptBuilder = () => {
      const contextPreamble = this.flagManager 
        ? LangChainPrompts.buildContextWithFlagManager(context, this.flagManager)
        : LangChainPrompts.buildActionContextPreamble(context, '');
      const instructions = LangChainPrompts.buildTransitionInstructions(
        transitionInfo.targetScene,
        transitionInfo.content,
        playerInput
      );
      
      return `${contextPreamble}

${instructions}`;
    };

    const response = await this.makeLLMRequest(
      promptBuilder,
      'Transition',
      {
        scene: transitionInfo.targetScene,
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      6 // Higher importance for transitions
    );

    // Transitions handled automatically by flag system
    // No need to add transition signals

    return response;
  }

  /**
   * Process an action that triggers an ending
   */
  private async processEndingAction(
    context: DirectorContext,
    playerInput: string,
    endingInfo: { id: string; content: string }
  ): Promise<DirectorResponse> {
    const promptBuilder = () => {
      const contextPreamble = this.flagManager 
        ? LangChainPrompts.buildContextWithFlagManager(context, this.flagManager)
        : LangChainPrompts.buildActionContextPreamble(context, '');
      const instructions = LangChainPrompts.buildEndingInstructions(
        endingInfo.id,
        endingInfo.content,
        playerInput
      );
      
      return `${contextPreamble}

${instructions}`;
    };

    const response = await this.makeLLMRequest(
      promptBuilder,
      'Ending',
      {
        scene: context.currentSketch ? 'current_scene' : 'unknown',
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      8 // Highest importance for endings
    );

    // Endings handled automatically by flag system
    // No need to add ending signals

    return response;
  }





  /**
   * Handle post-ending input (exploration after story completes)
   */
  private async processPostEndingInput(
    context: DirectorContext,
    playerInput: string
  ): Promise<DirectorResponse> {
    const promptBuilder = () => {
      const contextPreamble = this.flagManager 
        ? LangChainPrompts.buildContextWithFlagManager(context, this.flagManager)
        : LangChainPrompts.buildActionContextPreamble(context, '');
      const instructions = LangChainPrompts.buildActionInstructions(context);
      
      return `${contextPreamble}

${instructions}

**PLAYER ACTION:** ${playerInput}

Continue the narrative exploration:`;
    };

    return this.makeLLMRequest(
      promptBuilder,
      'Post-Ending',
      {
        scene: 'post-ending',
        memories: context.activeMemory?.length || 0,
        transitions: 0
      },
      3 // Lower importance for post-ending
    );
  }

  /**
   * Get current flag state for debugging
   */
  getCurrentFlags(): Record<string, any> | undefined {
    return this.flagManager?.getAllFlags();
  }

  /**
   * Set location flag (used by engine during scene transitions)
   */
  setLocationFlag(location: string): void {
    this.flagManager?.setLocationFlag(location);
  }

  /**
   * Reset flag manager state (called when loading new story)
   */
  resetFlags(): void {
    this.flagManager = undefined;
  }
}