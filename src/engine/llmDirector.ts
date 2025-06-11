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
   * Build minimal context prompt for LLM
   */
  private buildPrompt(input: string, context: DirectorContext): string {
    let prompt = `You are the director of an impressionistic interactive fiction story. Paint scenes from minimal sketches and respond naturally to player actions.

STORY CONTEXT:
${context.storyContext}

CURRENT SCENE:
${context.currentSketch}

RECENT CONVERSATION:
${this.formatRecentDialogue(context.recentDialogue)}

RELEVANT MEMORIES:
${this.formatActiveMemory(context.activeMemory)}

`;

    // Add narrative metadata if available
    if (context.narrative) {
      prompt += `NARRATIVE STYLE:
`;
      if (context.narrative.voice) prompt += `Voice: ${context.narrative.voice}\n`;
      if (context.narrative.tone) prompt += `Tone: ${context.narrative.tone}\n`;
      if (context.narrative.setting) prompt += `Setting: ${context.narrative.setting}\n`;
      if (context.narrative.themes) prompt += `Themes: ${context.narrative.themes.join(', ')}\n`;
      prompt += '\n';
    }

    // Add available transitions
    if (context.currentTransitions) {
      prompt += `POSSIBLE SCENE TRANSITIONS:
${Object.entries(context.currentTransitions)
  .map(([sceneId, info]) => `- To "${sceneId}" when: ${info.condition}`)
  .join('\n')}

SCENE SKETCHES:
${Object.entries(context.currentTransitions)
  .map(([sceneId, info]) => `[${sceneId}]: ${info.sketch}`)
  .join('\n\n')}

`;
    }

    // Add available endings
    if (context.availableEndings && context.availableEndings.length > 0) {
      prompt += `POSSIBLE ENDINGS:
${context.availableEndings
  .map(ending => `- "${ending.id}" when: ${Array.isArray(ending.when) ? ending.when.join(' OR ') : ending.when}`)
  .join('\n')}

ENDING SKETCHES:
${context.availableEndings
  .map(ending => `[${ending.id}]: ${ending.sketch}`)
  .join('\n\n')}

`;
    }

    // Add world context if available
    if (context.location) {
      prompt += `CURRENT LOCATION:
${context.location.description}
${context.location.contains ? `Contains: ${context.location.contains.join(', ')}` : ''}

`;
    }

    if (context.activeCharacters && context.activeCharacters.length > 0) {
      prompt += `CHARACTERS PRESENT:
${context.activeCharacters
  .map(char => `- ${char.name}: ${char.essence}${char.voice ? ` (speaks: ${char.voice})` : ''}`)
  .join('\n')}

`;
    }

    if (context.discoverableItems && context.discoverableItems.length > 0) {
      prompt += `DISCOVERABLE ITEMS:
${context.discoverableItems
  .map(item => `- ${item.name}: ${item.description}${item.hidden ? ' (hidden)' : ''}`)
  .join('\n')}

`;
    }

    // Add guidance
    prompt += `GUIDANCE:
${context.guidance}

When transitioning to a new scene or ending:
1. Begin incorporating the sketch naturally into your narrative
2. Expand and paint the sketch with rich detail
3. Make transitions seamless - blend them into the ongoing narrative
4. Only signal the transition after you've started using the sketch
5. IMPORTANT: Never signal both "scene" and "ending" in the same response
6. Scene transitions move the story forward; endings conclude it
7. Be precise about which condition was actually met

PLAYER ACTION: "${input}"

Respond with a JSON object containing your narrative response and any signals. Paint the scene with detail while staying true to the impressionistic sketch.

Response format:
{
  "narrative": "Your descriptive response to the player's action",
  "importance": 5,               // Rate 1-10: How significant is this interaction to the story?
  "signals": {
    "scene": "scene_id",           // Optional: transition to new scene
    "ending": "ending_id",         // Optional: trigger story ending
    "discover": "item_id"          // Optional: discover an item
  }
}

Importance guidelines:
1-3: Routine actions (looking around, simple movement)
4-6: Meaningful interactions (conversations, discoveries, problem-solving)
7-9: Major story moments (revelations, key decisions, emotional climaxes)
10: Story-defining moments (endings, major plot twists)

Example responses:
- Normal action: {"narrative": "You examine the lock closely...", "importance": 4}
- Scene transition: {"narrative": "The door swings open revealing...", "importance": 7, "signals": {"scene": "next_room"}}
- Story ending: {"narrative": "You step into the light and...", "importance": 10, "signals": {"ending": "victory"}}

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
   * Format recent dialogue for prompt
   */
  private formatRecentDialogue(dialogue: string[]): string {
    if (!dialogue || dialogue.length === 0) {
      return 'No recent conversation.';
    }
    
    // Take last 6 exchanges (12 lines)
    const recent = dialogue.slice(-12);
    return recent.join('\n');
  }

  /**
   * Format active memory for prompt
   */
  private formatActiveMemory(memory: string[]): string {
    if (!memory || memory.length === 0) {
      return 'No relevant memories.';
    }
    
    return memory.map(impression => `- ${impression}`).join('\n');
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