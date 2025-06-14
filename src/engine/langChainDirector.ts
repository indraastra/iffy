/**
 * LangChain Director - Handles scene transitions using structured output
 * 
 * PUBLIC API METHODS (use these):
 * - processInput() - Main entry point for all player input
 * - processInputWithTransition() - Same as above but with transition callbacks
 * - processInputStreaming() - Streaming version that yields intermediate results
 * - processInitialSceneEstablishment() - For story opening scenes
 * 
 * INTERNAL METHODS (don't call directly):
 * - processAction() - Phase 1: handles player actions, detects transitions
 * - processSceneTransition() - Phase 2: establishes new scenes
 * - processPostEndingInput() - Handles post-story reflection/exploration
 */

import { DirectorContext, DirectorResponse } from '@/types/impressionistStory';
import { LangChainPrompts } from './langChainPrompts';
import { MultiModelService } from '@/services/multiModelService';
import { DirectorResponseSchema } from '@/schemas/directorSchemas';

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
        narrative: "🔑 API key required. Please configure your LLM provider in Settings to play.",
        memories: [],
        importance: 1,
        signals: { error: "API key not configured" }
      };
    }

    const startTime = performance.now();
    const fullPrompt = promptBuilder();
    
    console.log(`📝 ${logLabel} Prompt:`, fullPrompt);
    
    // Use structured output
    const result = await this.multiModelService.makeStructuredRequest(
      fullPrompt,
      DirectorResponseSchema
    );

    const latencyMs = performance.now() - startTime;
    
    console.log(`📝 ${logLabel} Response:`, result.data);

    // Convert structured data to DirectorResponse
    const response: DirectorResponse = {
      narrative: result.data.narrative,
      memories: result.data.memories || [],
      importance: result.data.importance || defaultImportance,
      signals: result.data.signals || {}
    };

    // Extract usage information for logging and metadata
    const usage = result.usage;

    // Log to debug pane if available
    if (this.debugPane && this.debugPane.logLlmCall) {
      this.debugPane.logLlmCall({
        prompt: { text: logLabel, tokenCount: usage.input_tokens },
        response: { 
          narrative: response.narrative, 
          reasoning: result.data.reasoning,
          signals: response.signals,
          memories: response.memories,
          tokenCount: usage.output_tokens,
          importance: response.importance
        },
        context: contextInfo
      });
    }

    // Add metrics metadata for engine tracking
    (response as any).usage = usage;
    (response as any).latencyMs = latencyMs;
    (response as any).contextSize = fullPrompt.length;

    return response;
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================

  /**
   * Main entry point for all player input processing
   * Automatically handles post-ending vs normal gameplay
   */
  async processInput(input: string, context: DirectorContext): Promise<DirectorResponse> {
    // Use simplified prompt for post-ending interactions
    if (context.storyComplete) {
      return this.processPostEndingInput(input, context);
    }
    
    return this.processInputWithTransition(input, context);
  }

  /**
   * Process input with transition callbacks for fine-grained control
   * Use this when you need to react to specific transition events
   */
  async processInputWithTransition(
    input: string, 
    context: DirectorContext,
    callbacks?: TransitionCallbacks
  ): Promise<DirectorResponse> {
    if (!this.isConfigured()) {
      return {
        narrative: "🔑 API key required. Please configure your LLM provider in Settings to play.",
        memories: [],
        importance: 1,
        signals: { error: "API key not configured" }
      };
    }

    try {
      // Phase 1: Process action
      const actionResponse = await this.processAction(input, context);
      
      // Phase 2: Handle scene transition if needed
      if (actionResponse.signals?.scene) {
        const targetSceneId = actionResponse.signals.scene;
        
        // Notify transition starting
        if (callbacks?.onTransitionStart) {
          callbacks.onTransitionStart(targetSceneId);
        }

        const transitionResponse = await this.processSceneTransition(
          targetSceneId, 
          context, 
          actionResponse.narrative
        );

        // Notify transition complete
        if (callbacks?.onTransitionComplete) {
          callbacks.onTransitionComplete(transitionResponse);
        }

        // For non-streaming, we DO want to combine the responses since they're displayed as one unit
        // However, if the LLM already repeated the action content in the transition, we should avoid double display
        const hasRepeatedContent = transitionResponse.narrative.includes(actionResponse.narrative.substring(0, 100));
        
        return {
          narrative: hasRepeatedContent 
            ? transitionResponse.narrative 
            : `${actionResponse.narrative}\n\n${transitionResponse.narrative}`,
          memories: [...(actionResponse.memories || []), ...(transitionResponse.memories || [])],
          importance: Math.max(actionResponse.importance || 5, transitionResponse.importance || 5),
          signals: {
            ...actionResponse.signals,
            ...transitionResponse.signals
          }
        };
      }

      // Notify action complete for non-transition actions
      if (callbacks?.onActionComplete) {
        callbacks.onActionComplete(actionResponse);
      }

      return actionResponse;

    } catch (error) {
      console.error('LangChain Director error:', error);
      return {
        narrative: 'Sorry, I had trouble processing that command. Try something else.',
        signals: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Process player action (Phase 1)
   */
  private async processAction(input: string, context: DirectorContext): Promise<DirectorResponse> {
    return this.makeLLMRequest(
      () => {
        const contextPreamble = LangChainPrompts.buildContextPreamble(context);
        const modeSpecificInstructions = LangChainPrompts.buildActionInstructions(input, context);
        return `${contextPreamble}\n\n${modeSpecificInstructions}`;
      },
      `Player: ${input}`,
      {
        scene: context.currentSketch || '',
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      5
    );
  }

  /**
   * Process scene transition (Phase 2)
   */
  private async processSceneTransition(
    targetSceneId: string,
    context: DirectorContext,
    transitionContext: string
  ): Promise<DirectorResponse> {
    // Find target scene information
    const targetTransition = context.currentTransitions?.[targetSceneId];
    if (!targetTransition) {
      throw new Error(`Target scene ${targetSceneId} not found in transitions`);
    }

    const response = await this.makeLLMRequest(
      () => {
        const contextPreamble = LangChainPrompts.buildContextPreamble(context);
        const modeSpecificInstructions = LangChainPrompts.buildTransitionInstructions(
          targetSceneId, 
          targetTransition.sketch, 
          transitionContext
        );
        return `${contextPreamble}\n\n${modeSpecificInstructions}`;
      },
      `Transition to: ${targetSceneId}`,
      {
        scene: targetTransition.sketch,
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      6
    );
    
    // Ensure scene signal is set correctly for transitions
    response.signals = response.signals || {};
    response.signals.scene = targetSceneId;

    return response;
  }

  /**
   * Process ending transition (Phase 2 of ending flow)
   */
  private async processEndingTransition(
    endingId: string,
    context: DirectorContext,
    transitionContext: string
  ): Promise<DirectorResponse> {
    // Find the ending details
    const targetEnding = context.availableEndings?.variations.find(e => e.id === endingId);
    if (!targetEnding) {
      throw new Error(`Unknown ending: ${endingId}`);
    }

    const response = await this.makeLLMRequest(
      () => {
        const contextPreamble = LangChainPrompts.buildContextPreamble(context);
        const modeSpecificInstructions = LangChainPrompts.buildEndingInstructions(
          endingId,
          targetEnding.sketch,
          transitionContext
        );
        return `${contextPreamble}\n\n${modeSpecificInstructions}`;
      },
      `Ending: ${endingId}`,
      {
        scene: targetEnding.sketch,
        memories: context.activeMemory?.length || 0,
        transitions: 0
      },
      8
    );
    
    // Ensure ending signal is set correctly for endings
    response.signals = response.signals || {};
    response.signals.ending = endingId;

    return response;
  }


  /**
   * Streaming version that yields responses as they complete
   * Yields action response first, then transition response if needed
   */
  async* processInputStreaming(input: string, context: DirectorContext): AsyncGenerator<DirectorResponse, void, unknown> {
    // Use simplified prompt for post-ending interactions
    if (context.storyComplete) {
      const response = await this.processPostEndingInput(input, context);
      yield response;
      return; // Exit generator after yielding
    }

    try {
      // Phase 1: Process action
      const actionResponse = await this.processAction(input, context);
      
      // Yield the action response immediately for display
      yield actionResponse;
      
      // Phase 2: Handle scene or ending transition if needed
      if (actionResponse.signals?.scene) {
        const targetSceneId = actionResponse.signals.scene;

        const transitionResponse = await this.processSceneTransition(
          targetSceneId, 
          context, 
          actionResponse.narrative
        );

        // Yield the transition response independently 
        yield transitionResponse;
        return; // Exit generator
      } else if (actionResponse.signals?.ending) {
        const endingId = actionResponse.signals.ending;

        const endingResponse = await this.processEndingTransition(
          endingId, 
          context, 
          actionResponse.narrative
        );

        // Yield the ending response independently 
        yield endingResponse;
        return; // Exit generator
      }

      // No transition needed - action response was already yielded above
      return; // Exit generator

    } catch (error) {
      console.error('LangChain Director streaming error:', error);
      yield {
        narrative: 'Sorry, I had trouble processing that command. Try something else.',
        signals: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
      return; // Exit generator
    }
  }

  /**
   * Process initial scene establishment for story opening
   * Use this to establish the opening scene with atmospheric details
   */
  async processInitialSceneEstablishment(
    sceneId: string,
    sceneSketch: string,
    context: DirectorContext
  ): Promise<DirectorResponse> {
    return this.makeLLMRequest(
      () => {
        const contextPreamble = LangChainPrompts.buildContextPreamble(context);
        const modeSpecificInstructions = LangChainPrompts.buildInitialSceneInstructions(
          sceneId, 
          sceneSketch
        );
        return `${contextPreamble}\n\n${modeSpecificInstructions}`;
      },
      `Initial Scene: ${sceneId}`,
      {
        scene: sceneSketch,
        memories: context.activeMemory?.length || 0,
        transitions: 0
      },
      7
    );
  }

  /**
   * Handle post-ending interactions (reflection, questions, exploration)
   */
  private async processPostEndingInput(input: string, context: DirectorContext): Promise<DirectorResponse> {
    try {
      return await this.makeLLMRequest(
        () => {
          const contextPreamble = LangChainPrompts.buildContextPreamble(context);
          const modeSpecificInstructions = LangChainPrompts.buildActionInstructions(input, context);
          return `${contextPreamble}\n\n${modeSpecificInstructions}`;
        },
        `Post-ending: ${input}`,
        {
          scene: context.currentSketch || 'Post-ending',
          memories: context.activeMemory?.length || 0,
          transitions: 0
        },
        5
      );
    } catch (error) {
      console.error('LangChain Director post-ending error:', error);
      return {
        narrative: "I'm having trouble understanding that right now. Please try rephrasing.",
        signals: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

}