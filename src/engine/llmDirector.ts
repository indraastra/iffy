/**
 * LLM Director - Handles natural language interpretation and scene painting
 * 
 * Manages minimal context assembly and response parsing with clear signals.
 */

import { DirectorContext, DirectorResponse, DirectorSignals } from '@/types/impressionistStory';
import { AnthropicService } from '@/services/anthropicService';

export class LLMDirector {
  private anthropicService: AnthropicService;
  private debugPane?: any;
  
  // Configuration constants
  private static readonly POST_ENDING_INTERACTION_LIMIT = 5;
  private static readonly REGULAR_INTERACTION_LIMIT = 10;

  constructor(anthropicService?: AnthropicService) {
    this.anthropicService = anthropicService || new AnthropicService();
  }

  /**
   * Process player input with impressionistic approach
   */
  async processInput(input: string, context: DirectorContext): Promise<DirectorResponse> {
    if (!this.anthropicService.isConfigured()) {
      return {
        narrative: "🔑 Anthropic API key required. Please configure your API key in Settings to play.",
        signals: { error: "API key not configured" }
      };
    }

    try {
      const startTime = performance.now();
      const prompt = this.buildPrompt(input, context);
      const response = await this.anthropicService.makeRequestWithUsage(prompt);
      const latencyMs = performance.now() - startTime;
      
      const result = this.parseJsonResponse(response.content, input, context);
      
      // Add usage information to the result for metrics tracking
      (result as any).usage = response.usage;
      (result as any).latencyMs = latencyMs;
      (result as any).contextSize = prompt.length;
      
      return result;
    } catch (error) {
      console.error('LLM Director error:', error);
      return {
        narrative: "I'm having trouble understanding that right now. Please try rephrasing.",
        signals: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Build consolidated high-to-low level prompt for LLM
   */
  private buildPrompt(input: string, context: DirectorContext): string {
    // Use simplified prompt for post-ending interactions
    if (context.storyComplete) {
      return this.buildPostEndingPrompt(input, context);
    }
    let prompt = `You are the director of an impressionistic interactive fiction story. Paint scenes from minimal sketches and respond naturally to player actions.

STORY: "${context.storyContext.split('\n')[0] || 'Interactive Fiction'}"
${context.storyContext}

`;

    // Narrative Style
    if (context.narrative) {
      const parts = [];
      if (context.narrative.voice) parts.push(`Voice: ${context.narrative.voice}`);
      if (context.narrative.tone) parts.push(`Tone: ${context.narrative.tone}`);
      
      prompt += `NARRATIVE STYLE:
${parts.join(' | ')}
`;
      if (context.narrative.themes) {
        prompt += `Themes: ${context.narrative.themes.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Story Progression Guidance
    prompt += `STORY PROGRESSION GUIDANCE:
${context.guidance}

`;

    // World Context
    const worldParts = [];
    if (context.activeCharacters && context.activeCharacters.length > 0) {
      worldParts.push(`Characters: ${context.activeCharacters.map(c => `${c.name} - ${c.essence}`).join(' | ')}`);
    }
    if (context.location) {
      worldParts.push(`Location: ${context.location.description}`);
    }
    if (context.discoverableItems && context.discoverableItems.length > 0) {
      worldParts.push(`Available Items: ${context.discoverableItems.map(i => i.name).join(', ')}`);
    }
    
    if (worldParts.length > 0) {
      prompt += `WORLD CONTEXT:
${worldParts.join('\n')}

`;
    }

    // Endings
    if (context.availableEndings && context.availableEndings.variations.length > 0) {
      prompt += `ENDINGS:
`;
      
      if (context.availableEndings.when) {
        const globalConditions = Array.isArray(context.availableEndings.when) 
          ? context.availableEndings.when.join(' AND ') 
          : context.availableEndings.when;
        prompt += `Global Requirements: ${globalConditions}\n`;
      }
      
      prompt += `Variations:
${context.availableEndings.variations
  .map(ending => `• ${ending.id}: ${Array.isArray(ending.when) ? ending.when.join(' OR ') : ending.when} → ${ending.sketch}`)
  .join('\n')}

`;
    }

    // Current Scene
    prompt += `CURRENT SCENE: "${context.currentSketch.split('\n')[0] || 'current scene'}"
${context.currentSketch}

`;

    // Scene Transitions
    if (context.currentTransitions && Object.keys(context.currentTransitions).length > 0) {
      prompt += `SCENE TRANSITIONS:
${Object.entries(context.currentTransitions)
  .map(([sceneId, data]) => `• ${data.condition} → ${sceneId}\n  ${data.sketch}`)
  .join('\n')}

`;
    }

    // Recent Interactions
    if (context.recentInteractions && context.recentInteractions.length > 0) {
      const recentDialogue = context.recentInteractions
        .slice(-LLMDirector.REGULAR_INTERACTION_LIMIT)
        .flatMap(interaction => [
          `Player: ${interaction.playerInput}`,
          `Response: ${interaction.llmResponse}`
        ]);
      
      prompt += `RECENT CONVERSATION:
${recentDialogue.join('\n')}

`;
    }

    // Recent Memory
    if (context.activeMemory && context.activeMemory.length > 0) {
      prompt += `RECENT MEMORY:
${context.activeMemory.join('\n')}

`;
    }

    // Story State Context
    if (context.storyComplete) {
      prompt += `STORY STATUS: COMPLETE
The story has officially ended, but the player continues to explore, reflect, or ask questions.
Provide thoughtful responses about the story's events, characters, themes, or alternate possibilities.
Do not trigger new scene transitions or endings. Focus on reflection and exploration.

`;
    }

    // Player Action
    prompt += `PLAYER ACTION: "${input}"

Respond with ONLY a JSON object. No explanations or text after the JSON.

Response format:
{
  "narrative": "Your descriptive response",
  "importance": 5,
  "signals": {
    "transition": "scene:scene_id OR ending:ending_id",  // Optional: single transition
    "discover": "item_id"    // Optional: discover an item
  }
}

Importance scale: 1-3 routine, 4-6 meaningful, 7-9 major moments, 10 story-defining.
Paint scenes with rich detail while staying true to impressionistic sketches.

TRANSITION FORMAT:
- For scene changes: "scene:scene_id" (e.g., "scene:forest_clearing")
- For story endings: "ending:ending_id" (e.g., "ending:victory")
- If ending, fully flesh out the conclusion in your narrative
- If unknown ending_id, describe the natural conclusion - the engine will handle it as an impromptu ending

JSON only:`;

    return prompt;
  }

  /**
   * Build simplified prompt for post-ending interactions (reflection, questions, exploration)
   */
  private buildPostEndingPrompt(input: string, context: DirectorContext): string {
    let prompt = `You are helping a player reflect on a completed interactive fiction story. The story has ended and the player is now asking questions, reflecting, or exploring what happened.

STORY: "${context.storyContext.split('\n')[0] || 'Interactive Fiction'}"
${context.storyContext}

`;

    // Include ending information if available
    if (context.endingId && context.availableEndings) {
      const ending = context.availableEndings.variations.find(e => e.id === context.endingId);
      if (ending) {
        prompt += `STORY ENDING: "${context.endingId}"
${ending.sketch}

`;
      }
    }

    // Include recent interactions for context
    if (context.recentInteractions && context.recentInteractions.length > 0) {
      const recentDialogue = context.recentInteractions
        .slice(-LLMDirector.POST_ENDING_INTERACTION_LIMIT)
        .map(interaction => `${interaction.playerInput} → ${interaction.llmResponse}`)
        .join('\n');
        
      prompt += `RECENT CONVERSATION:
${recentDialogue}

`;
    }

    prompt += `PLAYER QUESTION/REFLECTION: "${input}"

Respond thoughtfully to help the player understand, reflect on, or explore the story they just experienced. You can:
- Answer questions about what happened
- Provide insights into character motivations
- Discuss themes and meanings
- Explore "what if" scenarios
- Clarify plot points

Since the story is complete, do NOT use any transition signals. Focus on meaningful dialogue.

Response format:
{
  "narrative": "Your thoughtful response",
  "importance": 5
}

JSON only:`;

    return prompt;
  }

  /**
   * Parse JSON LLM response and extract signals
   */
  private parseJsonResponse(rawResponse: string, input: string, context: DirectorContext): DirectorResponse {
    try {
      // Extract JSON from response - LLM sometimes adds explanation after the JSON
      let jsonString = rawResponse.trim();
      
      // Try to extract just the JSON if there's extra text
      if (jsonString.includes('\n\n')) {
        // Take everything before the first double newline
        jsonString = jsonString.split('\n\n')[0].trim();
      }
      
      // Find the last closing brace that matches the first opening brace
      const firstBrace = jsonString.indexOf('{');
      if (firstBrace === -1) {
        throw new Error('No JSON object found in response');
      }
      
      let braceCount = 0;
      let lastMatchingBrace = -1;
      
      for (let i = firstBrace; i < jsonString.length; i++) {
        if (jsonString[i] === '{') braceCount++;
        else if (jsonString[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastMatchingBrace = i;
            break;
          }
        }
      }
      
      if (lastMatchingBrace === -1) {
        throw new Error('Unmatched braces in JSON response');
      }
      
      jsonString = jsonString.substring(firstBrace, lastMatchingBrace + 1);
      const parsed = JSON.parse(jsonString);
      
      // Validate response structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Response is not a valid object');
      }
      
      const narrative = parsed.narrative || "I'm not sure how to respond to that right now.";
      const signals: DirectorSignals = {};
      
      // Extract importance score if present (1-10 scale)
      let importance: number | undefined;
      if (typeof parsed.importance === 'number') {
        importance = Math.max(1, Math.min(10, Math.round(parsed.importance)));
      }
      
      // Extract signals if present
      if (parsed.signals && typeof parsed.signals === 'object') {
        // Handle transition format
        if (parsed.signals.transition) {
          const transition = String(parsed.signals.transition);
          if (transition.startsWith('scene:')) {
            signals.scene = transition.substring(6); // Remove "scene:" prefix
          } else if (transition.startsWith('ending:')) {
            signals.ending = transition.substring(7); // Remove "ending:" prefix
          }
        }
        
        if (parsed.signals.discover) signals.discover = String(parsed.signals.discover);
      }
      
      // Log to debug pane if available
      if (this.debugPane) {
        this.debugPane.logLlmCall({
          prompt: { text: `Player: ${input}`, tokenCount: this.estimateTokens(context) },
          response: { 
            narrative, 
            signals,
            tokenCount: this.estimateTokens({ text: rawResponse }),
            importance
          },
          context: {
            scene: context.currentSketch,
            memories: context.activeMemory?.length || 0,
            transitions: Object.keys(context.currentTransitions || {}).length
          }
        });
      }
      
      return {
        narrative,
        signals: Object.keys(signals).length > 0 ? signals : undefined,
        importance
      };
      
    } catch (error) {
      console.error('Failed to parse LLM JSON response:', error);
      console.error('Raw response:', rawResponse);
      
      // Log additional context for JSON parsing errors
      if (error instanceof SyntaxError) {
        const preview = rawResponse.substring(0, 500);
        console.error('Response preview:', preview + (rawResponse.length > 500 ? '...' : ''));
        
        // Check if LLM added explanation after JSON
        if (rawResponse.includes('\n\nThe')) {
          console.warn('LLM appears to have added explanation after JSON. Consider adjusting prompt.');
        }
      }
      
      return {
        narrative: "I'm having trouble understanding that right now. Please try rephrasing.",
        signals: { error: error instanceof Error ? error.message : 'Unknown error' },
        importance: 4 // Default importance for parse errors
      };
    }
  }


  /**
   * Estimate token count for context optimization
   */
  private estimateTokens(content: any): number {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return Math.ceil(text.length / 4); // Rough estimate: 4 chars per token
  }

  /**
   * Set debug pane for logging
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
  }
}