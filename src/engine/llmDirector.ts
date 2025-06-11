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
        .slice(-10) // Last 10 interactions
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

Respond with JSON containing narrative and signals. Rate importance 1-10.

Response format:
{
  "narrative": "Your descriptive response",
  "importance": 5,
  "signals": {
    "scene": "scene_id",     // Optional: transition to new scene
    "ending": "ending_id",   // Optional: trigger story ending  
    "discover": "item_id"    // Optional: discover an item
  }
}

Importance scale: 1-3 routine, 4-6 meaningful, 7-9 major moments, 10 story-defining.
Paint scenes with rich detail while staying true to impressionistic sketches.

Your JSON response:`;

    return prompt;
  }

  /**
   * Parse JSON LLM response and extract signals
   */
  private parseJsonResponse(rawResponse: string, input: string, context: DirectorContext): DirectorResponse {
    try {
      const parsed = JSON.parse(rawResponse);
      
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
        if (parsed.signals.scene) signals.scene = String(parsed.signals.scene);
        if (parsed.signals.ending) signals.ending = String(parsed.signals.ending);
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