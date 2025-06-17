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
}

export interface EndingVariation {
  id: string;
  conditions: string[]; // AND logic - all must be true
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
    sceneId: string;
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
              scene: context.currentState.sceneId,
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
    
    let prompt = `**TASK:** Evaluate player action against current state and determine next step.

**STATE:**
Scene: ${context.currentState.sceneId}

${memoriesSection}

**TRANSITIONS:**
${transitions}

**INPUT:**
Action: \`${context.playerAction}\`

**EVALUATION RULES:**
1. Check each transition condition against the current action and state
2. A condition is met ONLY if ALL requirements are explicitly satisfied
3. Partial or implied satisfaction = NOT MET
4. If no conditions are met, return "continue"

**RESPONSE:**
\`\`\`json
{
  "result": "continue" | "T0" | "T1" | "T2" ...,
  "reasoning": "Brief explanation (1-2 sentences max)"
}
\`\`\``;

    // Add retry context if this is a retry attempt
    if (previousErrors.length > 0) {
      prompt += `\n\n**RETRY NOTES:**`;
      previousErrors.forEach(error => {
        prompt += `\n- ${error.message}`;
      });
    }

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
      }
    }
    
    // Fallback for invalid format
    console.warn(`ActionClassifier: Invalid result format "${rawResult.result}", falling back to action mode`);
    return {
      mode: 'action',
      reasoning: `Invalid result format "${rawResult.result}": ${rawResult.reasoning}`,
      confidence: 0.1
    };
  }

  private buildTransitionsSection(context: ClassificationContext): string {
    const allTransitions: Array<{ id: string; condition: string; type: 'scene' | 'ending' }> = [];
    
    // Add scene transitions
    if (context.currentSceneTransitions) {
      context.currentSceneTransitions.forEach(t => {
        allTransitions.push({ id: t.id, condition: t.condition, type: 'scene' });
      });
    }
    
    // Add ending transitions
    if (context.availableEndings) {
      context.availableEndings.variations.forEach(e => {
        const conditions = [...context.availableEndings!.globalConditions, ...e.conditions];
        allTransitions.push({ 
          id: e.id, 
          condition: conditions.join(' AND '), 
          type: 'ending' 
        });
      });
    }
    
    if (allTransitions.length === 0) {
      return '- None';
    }
    
    return allTransitions
      .map((t, index) => `- T${index}: ${t.condition}`)
      .join('\n');
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