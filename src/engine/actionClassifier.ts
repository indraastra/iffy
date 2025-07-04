/**
 * ActionClassifier - Determines if player actions trigger scene transitions or story endings
 * 
 * Uses a cheaper model to classify player intent before expensive narrative generation.
 * Implements retry logic for invalid targets and graceful fallback to action mode.
 */

import { MultiModelService } from '@/services/multiModelService';
import { z } from 'zod';

export interface SceneTransition {
  id: string;
  condition: string;
  sketch?: string;
}

export interface EndingVariation {
  id: string;
  conditions: string[]; // AND logic - all must be true
  sketch?: string;
}

export interface ClassificationContext {
  playerAction: string;
  currentSceneTransitions: SceneTransition[];
  availableEndings?: {
    globalConditions: string[]; // Must be met for ANY ending to be possible
    variations: EndingVariation[];
  };
  recentMemories: string[];
  recentInteractions?: Array<{
    playerInput: string;
    llmResponse: string;
  }>;
  activeMemory?: string[];
  currentState: {
    sceneSketch: string;
    isEnded?: boolean;
  };
}

export interface ClassificationResult {
  mode: 'action' | 'sceneTransition' | 'ending';
  targetId?: string;
  reasoning: string;
  confidence: number;
}

interface ValidationIssue {
  type: 'invalid_scene' | 'invalid_ending' | 'missing_target';
  message: string;
  invalidValue?: string;
}

const ClassificationResultSchema = z.object({
  result: z.string(), // "continue" or "T0", "T1", etc.
  reasoning: z.string()
});

export class ActionClassifier {
  private static readonly MAX_RETRIES = 3;
  private debugPane?: any;
  
  constructor(
    private multiModelService: MultiModelService
  ) {}

  /**
   * Set debug pane for logging (optional)
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
  }

  async classify(context: ClassificationContext): Promise<ClassificationResult> {
    return await this.classifyWithRetries(context, 0, []);
  }

  private async classifyWithRetries(
    context: ClassificationContext, 
    attemptNumber: number,
    previousErrors: ValidationIssue[]
  ): Promise<ClassificationResult> {
    const startTime = performance.now();
    
    
    // Check if MultiModelService is configured
    if (!this.multiModelService.isConfigured()) {
      return {
        mode: 'action',
        reasoning: 'ActionClassifier: MultiModelService not configured, defaulting to action mode',
        confidence: 0.1
      };
    }
    
    try {
      const prompt = this.buildClassifierPrompt(context, previousErrors);
      

      const rawResult = await this.multiModelService.makeStructuredRequest(
        prompt,
        ClassificationResultSchema,
        { useCostModel: true, temperature: 0.1 } // Low temperature for deterministic classification
      );

      const latencyMs = performance.now() - startTime;

      // Convert the new format to the existing ClassificationResult format
      const result = this.convertToLegacyFormat(rawResult.data, context);

      // Log the complete classification input and output  
      if (this.debugPane) {
        console.log(`🎯 ActionClassifier Request (useCostModel: true, should be temperature 0.1):`);
        console.log('─'.repeat(80));
        console.log(prompt);
        console.log('─'.repeat(80));
        console.log(`🎯 ActionClassifier Raw Output:`);
        console.log(`   Result: ${rawResult.data.result}`);
        console.log(`   Reasoning: ${rawResult.data.reasoning}`);
        console.log(`🎯 ActionClassifier Converted Result:`);
        console.log(`   Mode: ${result.mode}${result.targetId ? ` → ${result.targetId}` : ''}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
        console.log(`   Reasoning: ${result.reasoning}`);
      }

      // Track metrics for classifier calls
      if ((rawResult as any).usage) {
        const usage = (rawResult as any).usage;
        console.log(`   Tokens: ${usage.input_tokens}→${usage.output_tokens}, Latency: ${latencyMs.toFixed(0)}ms`);

        // Log to debug pane if available
        if (this.debugPane && this.debugPane.logLlmCall) {
          this.debugPane.logLlmCall({
            prompt: { 
              text: `ActionClassifier: ${context.playerAction}`, 
              tokenCount: usage.input_tokens 
            },
            response: { 
              narrative: `Mode: ${result.mode}${result.targetId ? ` → ${result.targetId}` : ''}`,
              reasoning: result.reasoning,
              signals: { mode: result.mode, targetId: result.targetId },
              memories: [], // Classifier doesn't generate memories
              tokenCount: usage.output_tokens,
              importance: Math.round(result.confidence * 10) // Convert confidence to importance scale
            },
            context: {
              scene: context.currentState.sceneSketch,
              memories: context.recentMemories.length,
              transitions: context.currentSceneTransitions.length,
              classifier: true // Flag to identify classifier calls
            }
          });
        }
      }

      // Validate the converted classification result
      const validationIssues = this.validateClassificationResult(result, context);
      
      
      if (validationIssues.length > 0) {
        if (attemptNumber < ActionClassifier.MAX_RETRIES - 1) {
          console.warn(`🔄 ActionClassifier retry ${attemptNumber + 1} due to validation issues:`, validationIssues);
          return await this.classifyWithRetries(context, attemptNumber + 1, validationIssues);
        } else {
          console.warn('🚨 ActionClassifier max retries exceeded, falling back to action mode');
          return this.createFallbackResult(validationIssues);
        }
      }


      return result;
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      console.warn(`🔍 ActionClassifier error after ${latencyMs.toFixed(0)}ms:`, error);
      
      if (attemptNumber < ActionClassifier.MAX_RETRIES - 1) {
        console.warn(`🔄 ActionClassifier retry ${attemptNumber + 1} due to error:`, error);
        const errorIssue: ValidationIssue = {
          type: 'missing_target',
          message: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        return await this.classifyWithRetries(context, attemptNumber + 1, [errorIssue]);
      } else {
        console.warn('🚨 ActionClassifier max retries exceeded due to errors, falling back to action mode');
        return this.createFallbackResult([{
          type: 'missing_target',
          message: `All classification attempts failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]);
      }
    }
  }

  private buildClassifierPrompt(context: ClassificationContext, previousErrors: ValidationIssue[] = []): string {
    // Build context sections
    const transitions = this.buildTransitionsSection(context);
    const memoriesSection = this.buildMemoriesSection(context);
    
    // STATIC PREFIX - Content that remains stable throughout a scene
    // This organization benefits Gemini's automatic context caching and Anthropic's prompt caching
    let prompt = `**TASK:** Evaluate player action against current scene state and determine next step. Your primary function is to be a strict, logical gatekeeper.

**EVALUATION RULES:**
1. **CHECK ALL CONDITIONS:** Every clause in the PREREQUISITES must be explicitly satisfied. If ANY part fails, the entire transition fails.
2. **AND MEANS ALL:** When you see "A AND B", BOTH A and B must be true. If only A is true, the transition fails.
3. **NO INFERENCE:** Only evaluate what explicitly happened. Don't infer, assume, or interpret intentions.
4. **CONTINUE BY DEFAULT:** If ANY condition is not met, return "continue". Never try to find a "close enough" match.

**RESPONSE FORMAT:**
\`\`\`json
{
  "reasoning": "Justification for each clause met or not met (1-2 sentences max)",
  "result": "continue" | "T0" | "T1" | "T2" ...
}
\`\`\`

**SCENE:**
${context.currentState.sceneSketch}

**TRANSITIONS:**

${transitions}

**EXAMPLES OF CORRECT EVALUATION:**

1. **ACTION:** \`Player examines the locked door carefully.\`
   **SCENE:** A small room with a heavy wooden door.
   **TRANSITION T0 PREREQUISITES:** \`player opens the door\`
   **CORRECT RESPONSE:**
   \`\`\`json
   {
     "reasoning": "Prerequisites not met: player examined the door but did not open it.",
     "result": "continue"
   }
   \`\`\`

2. **ACTION:** \`Push open the heavy wooden door and step through.\`
   **SCENE:** A small room with a heavy wooden door.
   **TRANSITION T0 PREREQUISITES:** \`player opens the door\`
   **CORRECT RESPONSE:**
   \`\`\`json
   {
     "reasoning": "Prerequisites met: player opened the door by pushing it open.",
     "result": "T0"
   }
   \`\`\`

3. **ACTION:** \`Character reveals the secret password.\`
   **SCENE:** A character stands before a locked vault.
   **TRANSITION T0 PREREQUISITES:** \`character enters vault AND character has key\`
   **CORRECT RESPONSE:**
   \`\`\`json
   {
     "reasoning": "Prerequisites not met: character revealed password but doesn't have the key yet.",
     "result": "continue"
   }
   \`\`\``;

    // DYNAMIC CONTENT - Changes during the scene
    // Memories and conversation history are dynamic and should not be cached
    prompt += `\n\n${memoriesSection}`;

    // Add retry context if this is a retry attempt (dynamic - only appears on retries)
    if (previousErrors.length > 0) {
      prompt += `\n\n**RETRY NOTES:**`;
      previousErrors.forEach(error => {
        prompt += `\n- ${error.message}`;
      });
    }

    // Player input - always dynamic
    prompt += `\n\n**ACTION:**
\`${context.playerAction}\`

EVALUATE NOW.`;

    return prompt;
  }

  private buildMemoriesSection(context: ClassificationContext): string {
    const sections: string[] = [];
    
    // Recent dialogue (most important for classification)
    if (context.recentInteractions && context.recentInteractions.length > 0) {
      const recentDialogue = context.recentInteractions
        .slice(-3) // Last 3 interactions for context
        .flatMap(interaction => [
          `Player: ${interaction.playerInput}`,
          `Response: ${interaction.llmResponse}`
        ]);
      sections.push(`**Recent Dialogue:**\n${recentDialogue.join('\n')}`);
    }
    
    // Key memories (background context) - include all since they're compact
    if (context.activeMemory && context.activeMemory.length > 0) {
      const memories = context.activeMemory
        .map(memory => `- ${memory}`)
        .join('\n');
      sections.push(`**Memories:**\n${memories}`);
    }
    
    // Fallback to recentMemories if new fields not available (backward compatibility)
    if (sections.length === 0 && context.recentMemories && context.recentMemories.length > 0) {
      const memories = context.recentMemories
        .map(memory => `- ${memory}`)
        .join('\n');
      sections.push(`**Memories:**\n${memories}`);
    }
    
    return sections.length > 0 ? sections.join('\n\n') : '**Memories:**\n- None';
  }

  private convertToLegacyFormat(rawResult: { result: string; reasoning: string }, context: ClassificationContext): ClassificationResult {
    // Handle "continue" case
    if (rawResult.result === 'continue') {
      return {
        mode: 'action',
        reasoning: rawResult.reasoning,
        confidence: 0.9
      };
    }
    
    // Handle "T0", "T1", etc. format
    const transitionMatch = rawResult.result.match(/^T(\d+)$/);
    if (transitionMatch) {
      const transitionIndex = parseInt(transitionMatch[1], 10);
      
      // Build the combined transitions list (same as in buildTransitionsSection)
      const allTransitions: Array<{ id: string; type: 'scene' | 'ending' }> = [];
      
      // Add scene transitions first
      if (context.currentSceneTransitions) {
        context.currentSceneTransitions.forEach(t => {
          allTransitions.push({ id: t.id, type: 'scene' });
        });
      }
      
      // Add ending transitions
      if (context.availableEndings) {
        context.availableEndings.variations.forEach(e => {
          allTransitions.push({ id: e.id, type: 'ending' });
        });
      }
      
      // Find the transition at the specified index
      if (transitionIndex < allTransitions.length) {
        const transition = allTransitions[transitionIndex];
        return {
          mode: transition.type === 'scene' ? 'sceneTransition' : 'ending',
          targetId: transition.id,
          reasoning: rawResult.reasoning,
          confidence: 0.95
        };
      } else {
        // Index out of bounds - return invalid transition that will be caught by validation
        // This allows retry logic to work properly
        
        // Determine if this would be a scene transition or ending based on the combined list
        const sceneTransitionCount = context.currentSceneTransitions.length;
        const totalTransitions = allTransitions.length;
        
        if (transitionIndex < sceneTransitionCount) {
          // Should be a scene transition but index is somehow invalid
          return {
            mode: 'sceneTransition',
            targetId: `invalid_T${transitionIndex}`,
            reasoning: rawResult.reasoning,
            confidence: 0.95
          };
        } else if (context.availableEndings && transitionIndex < totalTransitions) {
          // Would be an ending but index is invalid
          return {
            mode: 'ending', 
            targetId: `invalid_T${transitionIndex}`,
            reasoning: rawResult.reasoning,
            confidence: 0.95
          };
        } else {
          // Completely out of bounds - default to scene transition for retry logic
          return {
            mode: 'sceneTransition',
            targetId: `invalid_T${transitionIndex}`,
            reasoning: rawResult.reasoning,
            confidence: 0.95
          };
        }
      }
    }
    
    // Fallback for completely invalid format (not T<number>)
    console.warn(`ActionClassifier: Invalid result format "${rawResult.result}", falling back to action mode`);
    return {
      mode: 'action',
      reasoning: `Invalid result format "${rawResult.result}": ${rawResult.reasoning}`,
      confidence: 0.1
    };
  }

  private buildTransitionsSection(context: ClassificationContext): string {
    const allTransitions: Array<{ id: string; conditions: string[]; sketch?: string; type: 'scene' | 'ending' }> = [];
    
    // Add scene transitions
    if (context.currentSceneTransitions) {
      context.currentSceneTransitions.forEach(t => {
        allTransitions.push({ 
          id: t.id, 
          conditions: [t.condition], // Wrap single condition in array
          sketch: t.sketch,
          type: 'scene' 
        });
      });
    }
    
    // Add ending transitions
    if (context.availableEndings) {
      context.availableEndings.variations.forEach(e => {
        const globalConditions = context.availableEndings!.globalConditions;
        const endingConditions = e.conditions;
        
        // Combine all conditions as separate clauses (all must be met)
        const allConditions = [...globalConditions, ...endingConditions];
        
        allTransitions.push({ 
          id: e.id, 
          conditions: allConditions,
          sketch: e.sketch,
          type: 'ending' 
        });
      });
    }
    
    if (allTransitions.length === 0) {
      return '**T0:** None available';
    }
    
    return allTransitions
      .map((t, index) => {
        let section = `**T${index}:**\n* **PREREQUISITES:**`;
        t.conditions.forEach(condition => {
          section += `\n    * \`${condition}\``;
        });
        
        if (t.sketch) {
          section += `\n* **DESCRIPTION:** ${t.sketch}`;
        }
        return section;
      })
      .join('\n\n');
  }


  private validateClassificationResult(result: ClassificationResult, context: ClassificationContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    

    // Check if targetId is required but missing
    if ((result.mode === 'sceneTransition' || result.mode === 'ending') && !result.targetId) {
      issues.push({
        type: 'missing_target',
        message: `Mode "${result.mode}" requires a targetId but none was provided`
      });
      return issues; // Early return since we can't validate targetId
    }

    // Check if targetId is provided when not needed
    if (result.mode === 'action' && result.targetId) {
      console.warn(`ActionClassifier: targetId "${result.targetId}" provided for action mode, ignoring`);
      // This is not a validation failure, just clean it up
      result.targetId = undefined;
    }

    // Validate scene transition targets
    if (result.mode === 'sceneTransition' && result.targetId) {
      const validSceneIds = context.currentSceneTransitions.map(t => t.id);
      if (!validSceneIds.includes(result.targetId)) {
        issues.push({
          type: 'invalid_scene',
          message: `Scene "${result.targetId}" is not available from current scene. Available: ${validSceneIds.join(', ')}`,
          invalidValue: result.targetId
        });
      }
    }

    // Validate ending targets
    if (result.mode === 'ending' && result.targetId && context.availableEndings) {
      const validEndingIds = context.availableEndings.variations.map(v => v.id);
      if (!validEndingIds.includes(result.targetId)) {
        issues.push({
          type: 'invalid_ending',
          message: `Ending "${result.targetId}" is not available in this story. Available: ${validEndingIds.join(', ')}`,
          invalidValue: result.targetId
        });
      }
    }

    return issues;
  }

  private createFallbackResult(issues: ValidationIssue[]): ClassificationResult {
    return {
      mode: 'action',
      reasoning: `Fallback to action mode due to validation issues: ${issues.map(i => i.message).join('; ')}`,
      confidence: 0.1
    };
  }
}