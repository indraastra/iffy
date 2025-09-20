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
import { FlagManager } from './FlagManager';
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
        // Debug pane update failed - continue silently
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
        // Debug pane update failed - continue silently
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
   * Extract the malformed response text from parsing errors
   */
  private extractResponseFromError(error: any): string {
    // Try to extract the raw response from various error formats
    if (error.message && error.message.includes('Text: ')) {
      const match = error.message.match(/Text: "(.*?)"\. Error:/s);
      if (match) {
        return match[1];
      }
    }
    
    // Fallback - return error message
    return error.message || 'Unknown malformed response';
  }

  /**
   * Attempt to repair malformed JSON output and retry parsing
   */
  private async repairAndRetryStructuredRequest(malformedResponse: string, logLabel: string): Promise<any> {
    const repairPrompt = `The following JSON response has formatting errors. Please fix it to match this exact schema:

{
  "reasoning": "string",
  "narrativeParts": ["array", "of", "strings"],
  "memories": ["array", "of", "strings"],
  "importance": number,
  "flagChanges": {
    "values": { "flag_name": "value" }
  }
}

CRITICAL: 
- flagChanges MUST be an object mapping flag names directly to values
- narrativeParts MUST be an array of strings
- Do NOT include any explanation, just return the corrected JSON

Original malformed response to fix:
${malformedResponse}`;

    try {
      const repairResult = await this.multiModelService.makeStructuredRequest(
        repairPrompt,
        DirectorResponseSchema,
        { temperature: 0.1 } // Lower temperature for more precise correction
      );
      console.log(`📝 ${logLabel} repair successful`);
      return repairResult;
    } catch (repairError) {
      console.error(`📝 ${logLabel} repair also failed:`, repairError);
      // Return a safe fallback response
      return {
        data: {
          reasoning: "Response parsing failed, using fallback",
          narrativeParts: ["I need a moment to process what you said."],
          memories: [],
          importance: 5,
          flagChanges: undefined
        }
      };
    }
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
    let result;
    try {
      result = await this.multiModelService.makeStructuredRequest(
        fullPrompt,
        DirectorResponseSchema,
        { temperature: 0.7 } // Higher temperature for creative storytelling
      );
    } catch (error) {
      // If structured parsing fails, try to repair the output
      console.log(`📝 ${logLabel} initial parsing failed, attempting repair...`);
      // Extract the malformed response from the error
      const malformedResponse = this.extractResponseFromError(error);
      result = await this.repairAndRetryStructuredRequest(malformedResponse, logLabel);
    }

    const latencyMs = performance.now() - startTime;
    
    console.log(`📝 ${logLabel} Response:`, result.data);

    // Handle narrativeParts - check for double-encoded JSON
    let narrativeArray: string[];
    const rawNarrativeParts = result.data.narrativeParts;
    
    // If narrativeParts is a string that looks like a JSON array, try to parse it
    if (typeof rawNarrativeParts === 'string') {
      const trimmed = rawNarrativeParts.trim();
      
      // Check if it's a JSON array string
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            console.log('📝 Successfully parsed double-encoded narrativeParts');
            narrativeArray = parsed;
          } else {
            // Parsed but not an array
            narrativeArray = [rawNarrativeParts];
          }
        } catch (e) {
          // JSON parse failed - try to extract array elements manually
          // This handles cases where the string contains escaped quotes
          try {
            // Remove outer brackets and split by comma, handling quoted strings
            const innerContent = trimmed.slice(1, -1);
            const elements: string[] = [];
            let current = '';
            let inString = false;
            let escapeNext = false;
            
            for (let i = 0; i < innerContent.length; i++) {
              const char = innerContent[i];
              
              if (escapeNext) {
                current += char;
                escapeNext = false;
              } else if (char === '\\') {
                escapeNext = true;
                // Don't add the escape character itself
              } else if (char === '"') {
                if (inString) {
                  // End of string - check if we should add this element
                  let j = i + 1;
                  while (j < innerContent.length && innerContent[j] === ' ') j++;
                  if (j >= innerContent.length || innerContent[j] === ',') {
                    elements.push(current);
                    current = '';
                    i = j; // Skip to comma or end
                  }
                }
                inString = !inString;
              } else if (inString) {
                current += char;
              }
            }
            
            // Add any remaining content
            if (current.trim()) {
              elements.push(current);
            }
            
            if (elements.length > 0) {
              console.log('📝 Successfully extracted array elements from malformed JSON string');
              narrativeArray = elements;
            } else {
              console.log('📝 Failed to extract array elements, treating as single narrative');
              narrativeArray = [rawNarrativeParts];
            }
          } catch (extractError) {
            console.log('📝 Manual extraction failed, treating as single narrative');
            narrativeArray = [rawNarrativeParts];
          }
        }
      } else {
        // Regular string, wrap in array
        narrativeArray = [rawNarrativeParts];
      }
    } else if (Array.isArray(rawNarrativeParts)) {
      // Already an array - this is the expected format
      narrativeArray = rawNarrativeParts;
    } else {
      // Fallback - ensure we always have an array
      console.warn('📝 Unexpected narrativeParts type:', typeof rawNarrativeParts);
      narrativeArray = ['An error occurred processing the narrative.'];
    }

    // Convert structured data to DirectorResponse
    const response: DirectorResponse = {
      narrative: narrativeArray,  // Keep as array to support per-element formatter processing
      memories: result.data.memories || [],
      importance: result.data.importance || defaultImportance,
      signals: result.data.signals || {},
      actualFlags: result.data.flagChanges || {}
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
          // Debug pane log failed - continue silently
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
          // Debug pane logLlmCall failed - continue silently
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
    playerInput: string
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
    if (response.actualFlags && Object.keys(response.actualFlags).length > 0) {
      this.flagManager?.applyChanges(response.actualFlags);
      
      // Update debug pane with current flag states
      if (this.debugPane && this.debugPane.updateFlagStates) {
        try {
          this.debugPane.updateFlagStates(this.flagManager?.getAllFlags() || {});
        } catch (error) {
          // Debug pane flag update failed - continue silently
        }
      }
    }

    // Transition and ending checking is now handled by the engine after flag changes are applied
    // This allows for proper sequence: action -> flag changes -> automatic transitions/endings

    // Debug logging
    if (this.debugPane && this.debugPane.log) {
      try {
        this.debugPane.log(`=== Action Processing ===`);
        this.debugPane.log(`Player: "${playerInput}"`);
        
        if (response.actualFlags && Object.keys(response.actualFlags.values).length > 0) {
          this.debugPane.log(`Flag changes from narrative:`);
          const valueEntries = Object.entries(response.actualFlags.values).map(([k, v]) => {
            if (typeof v === 'boolean') {
              return `${k}: ${v}`;
            } else if (typeof v === 'string') {
              return `${k}: "${v}"`;
            } else {
              return `${k}: ${JSON.stringify(v)}`;
            }
          });
          this.debugPane.log(`  ${valueEntries.join(', ')}`);
        }
        
        this.debugPane.log(`Current flags: ${this.flagManager?.getDebugString() || 'none'}`);
        this.debugPane.log('---');
      } catch (error) {
        // Debug pane log failed - continue silently
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
        scene: context.currentSceneId || 'unknown',
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      5 // Standard importance
    );
  }

  /**
   * Process a scene transition with narrative generation
   */
  async processSceneTransition(
    context: DirectorContext,
    targetSceneId: string,
    targetSceneSketch: string,
    playerAction: string = '',
    previousActionResponse?: string[]
  ): Promise<DirectorResponse> {
    const promptBuilder = () => {
      const contextPreamble = this.flagManager 
        ? LangChainPrompts.buildContextWithFlagManager(context, this.flagManager)
        : LangChainPrompts.buildActionContextPreamble(context, '');
      const instructions = LangChainPrompts.buildTransitionInstructions(
        targetSceneId,
        targetSceneSketch,
        playerAction,
        previousActionResponse
      );
      
      return `${contextPreamble}

${instructions}`;
    };

    return this.makeLLMRequest(
      promptBuilder,
      'Scene Transition',
      {
        scene: `${context.currentSceneId} -> ${targetSceneId}`,
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      7 // High importance for transitions
    );
  }

  /**
   * Process an action that triggers an ending
   */
  async processEndingAction(
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
        scene: context.currentSceneId || 'unknown',
        memories: context.activeMemory?.length || 0,
        transitions: Object.keys(context.currentTransitions || {}).length
      },
      8 // Highest importance for endings
    );

    // Mark story as ended and include ending ID in signals
    response.signals = {
      ...response.signals,
      endStory: true,
      endingId: endingInfo.id
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
   * Get flag manager for condition evaluation
   */
  getFlagManager(): FlagManager | undefined {
    return this.flagManager;
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