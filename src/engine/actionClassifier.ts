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
  mode: z.enum(['action', 'sceneTransition', 'ending']),
  targetId: z.string().optional(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1)
});

export class ActionClassifier {
  private static readonly MAX_RETRIES = 3;
  private debugPane?: any;
  
  constructor(
    private multiModelService: MultiModelService,
    private options: { debugMode?: boolean } = {}
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
      
      if (this.options.debugMode) {
        console.log(`🎯 ActionClassifier Prompt (attempt ${attemptNumber + 1}):`);
        console.log('─'.repeat(80));
        console.log(prompt);
        console.log('─'.repeat(80));
      }

      const result = await this.multiModelService.makeStructuredRequest(
        prompt,
        ClassificationResultSchema,
        { useCostModel: true, temperature: 0.1 } // Low temperature for deterministic classification
      );

      const latencyMs = performance.now() - startTime;

      // Log the classification result with reasoning
      console.log(`🎯 ActionClassifier Result:`);
      console.log(`   Mode: ${result.data.mode}${result.data.targetId ? ` → ${result.data.targetId}` : ''}`);
      console.log(`   Confidence: ${(result.data.confidence * 100).toFixed(0)}%`);
      console.log(`   Reasoning: ${result.data.reasoning}`);

      // Track metrics for classifier calls
      if ((result as any).usage) {
        const usage = (result as any).usage;
        console.log(`   Tokens: ${usage.input_tokens}→${usage.output_tokens}, Latency: ${latencyMs.toFixed(0)}ms`);

        // Log to debug pane if available
        if (this.debugPane && this.debugPane.logLlmCall) {
          this.debugPane.logLlmCall({
            prompt: { 
              text: `ActionClassifier: ${context.playerAction}`, 
              tokenCount: usage.input_tokens 
            },
            response: { 
              narrative: `Mode: ${result.data.mode}${result.data.targetId ? ` → ${result.data.targetId}` : ''}`,
              reasoning: result.data.reasoning,
              signals: { mode: result.data.mode, targetId: result.data.targetId },
              memories: [], // Classifier doesn't generate memories
              tokenCount: usage.output_tokens,
              importance: Math.round(result.data.confidence * 10) // Convert confidence to importance scale
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

      // Validate the classification result
      const validationIssues = this.validateClassificationResult(result.data, context);
      
      if (validationIssues.length > 0) {
        if (attemptNumber < ActionClassifier.MAX_RETRIES - 1) {
          console.warn(`🔄 ActionClassifier retry ${attemptNumber + 1} due to validation issues:`, validationIssues);
          return await this.classifyWithRetries(context, attemptNumber + 1, validationIssues);
        } else {
          console.warn('🚨 ActionClassifier max retries exceeded, falling back to action mode');
          return this.createFallbackResult(validationIssues);
        }
      }

      if (this.options.debugMode) {
        console.log(`✅ ActionClassifier success on attempt ${attemptNumber + 1}:`, result.data);
      }

      return result.data;
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
    let prompt = `**ROLE:** You are a meticulous logic engine for an interactive fiction game. Your task is to evaluate the player's action against the current game state and the requirements for all possible outcomes. You must follow the evaluation process exactly.

**PLAYER INPUT:**
* **Action:** \`${context.playerAction}\`

**GAME STATE:**
* **Scene Description:** ${context.currentState.sceneId}
* **Current State Facts:**${context.recentMemories.length > 0 ? context.recentMemories.slice(0, 5).map(memory => `\n    * \`${memory}\``).join('') : '\n    * None'}

**POSSIBLE OUTCOMES:**
${this.buildSceneTransitionSection(context)}
${this.buildEndingSection(context)}`;

    // Add retry context if this is a retry attempt
    if (previousErrors.length > 0) {
      prompt += `\n\n**PREVIOUS ERRORS TO FIX:**`;
      previousErrors.forEach(error => {
        prompt += `\n* ${error.message}`;
      });
      
      const invalidScenes = previousErrors.filter(e => e.type === 'invalid_scene');
      const invalidEndings = previousErrors.filter(e => e.type === 'invalid_ending');
      
      if (invalidScenes.length > 0) {
        prompt += `\n* Valid scene IDs: ${context.currentSceneTransitions.map(t => t.id).join(', ')}`;
      }
      if (invalidEndings.length > 0) {
        prompt += `\n* Valid ending IDs: ${context.availableEndings?.variations.map(v => v.id).join(', ') || 'none'}`;
      }
    }

    prompt += `\n\n**EVALUATION & RESPONSE INSTRUCTIONS:**
1. **Analyze the Input:** First, look at the player's \`Action\` and the \`Current State Facts\`.
2. **Evaluate Endings:** Evaluate the \`Conditions\` for each ending one by one, in the order they are listed.
3. **Think Step-by-Step:** For each ending, verbalize your reasoning. Check if the player's \`Action\` matches conditions. Then, check if the \`Current State Facts\` satisfy the conditions.
4. **Select the First Match:** The correct outcome is the *first one* whose conditions are all met.
5. **Default to Action:** If no scene transitions or endings have their conditions met, the mode must be \`action\`.
6. **Format Response:** Provide your final answer in the specified JSON format. The \`reasoning\` field should be a brief one-sentence explanation.

**JSON RESPONSE FORMAT:**
\`\`\`json
{
  "mode": "action|sceneTransition|ending",
  "targetId": "scene/ending ID if applicable",
  "reasoning": "Step-by-step explanation of which outcome was selected and why.",
  "confidence": 0.99
}
\`\`\``;

    return prompt;
  }

  private buildSceneTransitionSection(context: ClassificationContext): string {
    if (!context.currentSceneTransitions || context.currentSceneTransitions.length === 0) {
      return '* **Scene Transitions:** None';
    }

    const transitions = context.currentSceneTransitions
      .map(t => `    * **ID:** \`${t.id}\`\n        * **Conditions:** ${t.condition}`)
      .join('\n');

    return `* **Scene Transitions:**\n${transitions}`;
  }

  private buildEndingSection(context: ClassificationContext): string {
    if (!context.availableEndings) {
      return '* **Endings:** None';
    }

    let section = '* **Endings:**';
    
    if (context.availableEndings.globalConditions.length > 0) {
      section += `\n    * **Global requirements:** ${context.availableEndings.globalConditions.join(' AND ')}`;
    }

    const variations = context.availableEndings.variations
      .map(v => `    * **ID:** \`${v.id}\`\n        * **Conditions:** ${v.conditions.join(' AND ')}`)
      .join('\n');

    if (variations) {
      section += `\n${variations}`;
    }

    return section;
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