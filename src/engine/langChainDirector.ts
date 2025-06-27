/**
 * LangChain Director - Handles scene transitions using structured output
 * 
 * PUBLIC API METHODS (use these):
 * - processInputStreaming() - Main entry point for all player input (streaming)
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
import { ActionClassifier, ClassificationContext, SceneTransition } from './actionClassifier';

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
  private actionClassifier: ActionClassifier;

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
    this.actionClassifier = new ActionClassifier(this.multiModelService);
  }

  /**
   * Set debug pane for logging (optional)
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
    this.actionClassifier.setDebugPane(debugPane);
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
      narrative: narrativeArray.join('\n\n'),  // Always join array of paragraphs
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
   * Build context for ActionClassifier from DirectorContext
   */
  private buildClassifierContext(input: string, context: DirectorContext): ClassificationContext {
    // Convert scene transitions from DirectorContext format
    const sceneTransitions: SceneTransition[] = [];
    if (context.currentTransitions) {
      for (const [sceneId, data] of Object.entries(context.currentTransitions)) {
        sceneTransitions.push({
          id: sceneId,
          condition: data.condition,
          sketch: data.sketch
        });
      }
    }

    // Convert endings from DirectorContext format
    let availableEndings;
    if (context.availableEndings) {
      const globalConditions = Array.isArray(context.availableEndings.when) 
        ? context.availableEndings.when 
        : context.availableEndings.when ? [context.availableEndings.when] : [];

      availableEndings = {
        globalConditions: globalConditions.filter(c => c.trim() !== ''),
        variations: context.availableEndings.variations.map(ending => ({
          id: ending.id,
          conditions: Array.isArray(ending.when) ? ending.when : [ending.when],
          sketch: ending.sketch
        }))
      };
    }

    return {
      playerAction: input,
      currentSceneTransitions: sceneTransitions,
      availableEndings,
      recentMemories: context.activeMemory || [],
      recentInteractions: context.recentInteractions?.map(interaction => ({
        playerInput: interaction.playerInput,
        llmResponse: interaction.llmResponse
      })) || [],
      activeMemory: context.activeMemory || [],
      currentState: {
        sceneSketch: context.currentSketch || 'unknown',
        isEnded: context.storyComplete
      }
    };
  }



  /**
   * Process player action (narrative only - no classification)
   */
  private async processAction(input: string, context: DirectorContext): Promise<DirectorResponse> {
    return this.makeLLMRequest(
      () => {
        // OPTIMAL CACHING ORDER: Static first, semi-static next, dynamic last
        const staticInstructions = LangChainPrompts.buildActionInstructions(context);
        const contextPreamble = LangChainPrompts.buildActionContextPreamble(context);
        const playerAction = `**PLAYER ACTION:** "${input}"`;
        
        return `${staticInstructions}\n\n${contextPreamble}\n\n${playerAction}`;
      },
      `Player: ${input}`,
      {
        scene: context.currentSketch || '',
        memories: context.activeMemory?.length || 0,
        transitions: 0 // No transition logic in action processing
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
    playerAction: string
  ): Promise<DirectorResponse> {
    // Find target scene information
    const targetTransition = context.currentTransitions?.[targetSceneId];
    if (!targetTransition) {
      throw new Error(`Target scene ${targetSceneId} not found in transitions`);
    }

    const response = await this.makeLLMRequest(
      () => {
        // Use simplified context for transitions - no need for scene conditions
        const contextPreamble = LangChainPrompts.buildActionContextPreamble(context);
        const modeSpecificInstructions = LangChainPrompts.buildTransitionInstructions(
          targetSceneId, 
          targetTransition.sketch, 
          playerAction
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
    playerAction: string
  ): Promise<DirectorResponse> {
    // Find the ending details
    const targetEnding = context.availableEndings?.variations.find(e => e.id === endingId);
    if (!targetEnding) {
      throw new Error(`Unknown ending: ${endingId}`);
    }

    const response = await this.makeLLMRequest(
      () => {
        // Use simplified context for endings - no need for scene conditions
        const contextPreamble = LangChainPrompts.buildActionContextPreamble(context);
        const modeSpecificInstructions = LangChainPrompts.buildEndingInstructions(
          endingId,
          targetEnding.sketch,
          playerAction
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
   * Streaming version using ActionClassifier for mode determination
   * Makes exactly one story LLM call based on classified mode
   */
  async* processInputStreaming(input: string, context: DirectorContext): AsyncGenerator<DirectorResponse, void, unknown> {
    // Use simplified prompt for post-ending interactions
    if (context.storyComplete) {
      const response = await this.processPostEndingInput(input, context);
      yield response;
      return;
    }

    try {
      // Phase 1: Classify the action using cheaper model
      const classifierContext = this.buildClassifierContext(input, context);
      const classification = await this.actionClassifier.classify(classifierContext);

      if (this.options.debugMode) {
        console.log(`🎯 Action classification: ${classification.mode}${classification.targetId ? ` → ${classification.targetId}` : ''} (confidence: ${classification.confidence})`);
        console.log(`📝 Director executing: ${classification.mode} mode`);
      }

      // Phase 2: Execute based on classification (single LLM call)
      switch (classification.mode) {
        case 'action':
          // Just process the action - no transitions
          console.log(`📝 Processing action only`);
          yield await this.processAction(input, context);
          break;

        case 'sceneTransition':
          // Skip action phase - go directly to transition with player action incorporated
          console.log(`📝 Processing scene transition to ${classification.targetId}`);
          yield await this.processSceneTransition(classification.targetId!, context, input);
          break;

        case 'ending':
          // Skip action phase - go directly to ending with player action incorporated
          console.log(`📝 Processing story ending ${classification.targetId}`);
          yield await this.processEndingTransition(classification.targetId!, context, input);
          break;
      }
    } catch (error) {
      console.error('LangChain Director streaming error:', error);
      yield {
        narrative: 'Sorry, I had trouble processing that command. Try something else.',
        signals: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
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
          // OPTIMAL CACHING ORDER: Static first, semi-static next, dynamic last  
          const staticInstructions = LangChainPrompts.buildActionInstructions(context);
          const contextPreamble = LangChainPrompts.buildContextPreamble(context);
          const playerAction = `**PLAYER ACTION:** "${input}"`;
          
          return `${staticInstructions}\n\n${contextPreamble}\n\n${playerAction}`;
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