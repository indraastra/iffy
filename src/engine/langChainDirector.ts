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
import { FlagManager, FlagCondition } from './FlagManager';
import { FlagExtractor } from './FlagExtractor';
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
  private flagExtractor?: FlagExtractor;

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
  initializeFlags(story: ImpressionistStory): void {
    this.flagManager = new FlagManager(story);
    const llm = this.multiModelService.getModel();
    if (llm) {
      this.flagExtractor = new FlagExtractor(llm);
    }
  }

  /**
   * Set debug pane for logging (optional)
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
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
      signals: result.data.signals || {}
    };

    // Extract usage information for logging and metadata
    const usage = result.usage;

    // Log to debug pane if available
    if (this.debugPane) {
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
      const contextPreamble = LangChainPrompts.buildContextWithFlags(
        context, 
        this.flagManager!.getAllFlags()
      );
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
    if (!this.flagManager || !this.flagExtractor) {
      throw new Error('Flag system not initialized. Call initializeFlags() first.');
    }

    // Handle post-ending mode separately
    if (context.storyComplete) {
      return this.processPostEndingInput(context, playerInput);
    }

    // Phase 1: Process the action and generate narrative
    const actionResponse = await this.processAction(context, playerInput);
    callbacks?.onActionComplete?.(actionResponse);

    // Phase 2: Extract flag changes from the action and narrative
    const flagChanges = await this.flagExtractor.extractFlags(
      playerInput,
      Array.isArray(actionResponse.narrative) ? actionResponse.narrative.join('\n') : actionResponse.narrative,
      this.flagManager.getAllFlags(),
      this.flagManager.getFlagTriggers(),
      this.flagManager.getBehaviorPatterns()
    );

    // Apply flag changes
    this.flagManager.applyChanges(flagChanges);

    if (this.debugPane) {
      this.debugPane.log(`=== Flag Changes ===`);
      if (flagChanges.set.length > 0) {
        this.debugPane.log(`Set: ${flagChanges.set.join(', ')}`);
      }
      if (flagChanges.clear.length > 0) {
        this.debugPane.log(`Clear: ${flagChanges.clear.join(', ')}`);
      }
      if (flagChanges.behaviors_observed.length > 0) {
        this.debugPane.log(`Behaviors: ${flagChanges.behaviors_observed.join(', ')}`);
      }
      this.debugPane.log(`Current flags: ${this.flagManager.getDebugString()}`);
      this.debugPane.log('---');
    }

    // Phase 3: Check for transitions based on flags
    const transition = this.checkTransitions(context);
    if (transition) {
      callbacks?.onTransitionStart?.(transition.targetId);
      
      // Process the transition
      const transitionResponse = await this.processSceneTransition(
        context,
        transition.targetId,
        transition.sketch,
        playerInput
      );
      
      callbacks?.onTransitionComplete?.(transitionResponse);
      return transitionResponse;
    }

    // Phase 4: Check for endings based on flags
    const ending = this.checkEndings(context);
    if (ending) {
      return this.processEnding(context, ending.id, ending.sketch, playerInput);
    }

    return actionResponse;
  }

  /**
   * Phase 1: Process player action and generate narrative response
   */
  private async processAction(
    context: DirectorContext,
    playerInput: string
  ): Promise<DirectorResponse> {
    const promptBuilder = () => {
      const contextPreamble = LangChainPrompts.buildContextWithFlags(
        context,
        this.flagManager!.getAllFlags()
      );
      const instructions = LangChainPrompts.buildActionInstructions(context);
      
      return `${contextPreamble}

${instructions}

**PLAYER ACTION:** ${playerInput}

Respond to this action with immersive narrative:`;
    };

    return this.makeLLMRequest(
      promptBuilder,
      'Action Processing',
      {
        scene: 'unknown', // TODO: get current scene from context
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      }
    );
  }

  /**
   * Check if any transitions should trigger based on current flags
   */
  private checkTransitions(context: DirectorContext): { targetId: string; sketch: string } | null {
    if (!context.currentTransitions || !this.flagManager) {
      return null;
    }

    for (const [sceneId, transitionData] of Object.entries(context.currentTransitions)) {
      // Convert old condition format to flag condition
      const condition = this.parseCondition(transitionData.condition);
      if (this.flagManager.checkConditions(condition)) {
        return {
          targetId: sceneId,
          sketch: transitionData.sketch || ''
        };
      }
    }

    return null;
  }

  /**
   * Check if any endings should trigger based on current flags
   */
  private checkEndings(context: DirectorContext): { id: string; sketch: string } | null {
    if (!context.availableEndings || !this.flagManager) {
      return null;
    }

    // First check global ending conditions
    if (context.availableEndings.when) {
      const globalCondition = this.parseCondition(context.availableEndings.when);
      if (!this.flagManager.checkConditions(globalCondition)) {
        return null; // Global conditions not met
      }
    }

    // Check each ending variation
    for (const ending of context.availableEndings.variations) {
      const condition = this.parseCondition(ending.when);
      if (this.flagManager.checkConditions(condition)) {
        return {
          id: ending.id,
          sketch: ending.sketch || ''
        };
      }
    }

    return null;
  }

  /**
   * Parse legacy condition format to flag condition
   * This allows backwards compatibility during migration
   */
  private parseCondition(condition: any): FlagCondition | undefined {
    if (!condition) return undefined;

    // Already in new format
    if (condition.all_of || condition.any_of || condition.none_of) {
      return condition as FlagCondition;
    }

    // Array format - treat as any_of
    if (Array.isArray(condition)) {
      return { any_of: condition };
    }

    // String format - single condition
    if (typeof condition === 'string') {
      return { all_of: [condition] };
    }

    return undefined;
  }

  /**
   * Process a scene transition
   */
  private async processSceneTransition(
    context: DirectorContext,
    targetSceneId: string,
    sceneSketch: string,
    playerAction: string
  ): Promise<DirectorResponse> {
    const promptBuilder = () => {
      const contextPreamble = LangChainPrompts.buildContextWithFlags(
        context,
        this.flagManager!.getAllFlags()
      );
      const instructions = LangChainPrompts.buildTransitionInstructions(
        targetSceneId,
        sceneSketch,
        playerAction
      );
      
      return `${contextPreamble}\n\n${instructions}`;
    };

    const response = await this.makeLLMRequest(
      promptBuilder,
      'Scene Transition',
      {
        scene: targetSceneId,
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      6 // Slightly higher importance for transitions
    );

    // Add transition signal
    response.signals = {
      ...response.signals,
      transition: targetSceneId
    };

    return response;
  }

  /**
   * Process an ending
   */
  private async processEnding(
    context: DirectorContext,
    endingId: string,
    endingSketch: string,
    playerAction: string
  ): Promise<DirectorResponse> {
    const promptBuilder = () => {
      const contextPreamble = LangChainPrompts.buildContextWithFlags(
        context,
        this.flagManager!.getAllFlags()
      );
      const instructions = LangChainPrompts.buildEndingInstructions(
        endingId,
        endingSketch,
        playerAction
      );
      
      return `${contextPreamble}\n\n${instructions}`;
    };

    const response = await this.makeLLMRequest(
      promptBuilder,
      'Story Ending',
      {
        scene: 'ending',
        memories: context.activeMemory?.length || 0,
        transitions: 0
      },
      8 // High importance for endings
    );

    // Add ending signal
    response.signals = {
      ...response.signals,
      ending: endingId
    };

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
      const contextPreamble = LangChainPrompts.buildContextWithFlags(
        context,
        this.flagManager?.getAllFlags() || {}
      );
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
}