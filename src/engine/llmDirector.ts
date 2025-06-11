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
      return this.handleFallbackResponse(input, context);
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
  .map(([sceneId, condition]) => `- To "${sceneId}" when: ${condition}`)
  .join('\n')}

`;
    }

    // Add available endings
    if (context.availableEndings && context.availableEndings.length > 0) {
      prompt += `POSSIBLE ENDINGS:
${context.availableEndings
  .map(ending => `- "${ending.id}" when: ${Array.isArray(ending.when) ? ending.when.join(' OR ') : ending.when}`)
  .join('\n')}

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

PLAYER ACTION: "${input}"

Respond with a JSON object containing your narrative response and any signals. Paint the scene with detail while staying true to the impressionistic sketch.

Response format:
{
  "narrative": "Your descriptive response to the player's action",
  "signals": {
    "scene": "scene_id",           // Optional: transition to new scene
    "ending": "ending_id",         // Optional: trigger story ending
    "remember": ["impression1"],   // Optional: add to memory
    "forget": ["impression2"],     // Optional: remove from memory
    "discover": "item_id"          // Optional: discover an item
  }
}

Example response:
{
  "narrative": "You approach the heavy door and examine the lock. The metal is old but sturdy, and you notice scratches around the keyhole suggesting frequent use.",
  "signals": {
    "remember": ["door has been used recently"]
  }
}

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
      
      // Extract signals if present
      if (parsed.signals && typeof parsed.signals === 'object') {
        if (parsed.signals.scene) signals.scene = String(parsed.signals.scene);
        if (parsed.signals.ending) signals.ending = String(parsed.signals.ending);
        if (parsed.signals.discover) signals.discover = String(parsed.signals.discover);
        
        if (Array.isArray(parsed.signals.remember)) {
          signals.remember = parsed.signals.remember.map(String);
        } else if (parsed.signals.remember) {
          signals.remember = [String(parsed.signals.remember)];
        }
        
        if (Array.isArray(parsed.signals.forget)) {
          signals.forget = parsed.signals.forget.map(String);
        } else if (parsed.signals.forget) {
          signals.forget = [String(parsed.signals.forget)];
        }
      }
      
      // Log to debug pane if available
      if (this.debugPane) {
        this.debugPane.logLlmCall({
          prompt: { text: `Player: ${input}`, tokenCount: this.estimateTokens(context) },
          response: { 
            narrative, 
            signals,
            tokenCount: this.estimateTokens({ text: rawResponse })
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
        signals: Object.keys(signals).length > 0 ? signals : undefined
      };
      
    } catch (error) {
      console.error('Failed to parse LLM JSON response:', error);
      console.error('Raw response:', rawResponse);
      
      // Fallback to text parsing for backwards compatibility
      return this.parseTextResponse(rawResponse, input, context);
    }
  }
  
  /**
   * Fallback text-based parsing for backwards compatibility
   */
  private parseTextResponse(rawResponse: string, input: string, context: DirectorContext): DirectorResponse {
    const lines = rawResponse.split('\n');
    const narrativeLines: string[] = [];
    const signals: DirectorSignals = {};

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('SCENE:')) {
        signals.scene = trimmed.substring(6).trim();
      } else if (trimmed.startsWith('ENDING:')) {
        signals.ending = trimmed.substring(7).trim();
      } else if (trimmed.startsWith('REMEMBER:')) {
        if (!signals.remember) signals.remember = [];
        signals.remember.push(trimmed.substring(9).trim());
      } else if (trimmed.startsWith('FORGET:')) {
        if (!signals.forget) signals.forget = [];
        signals.forget.push(trimmed.substring(7).trim());
      } else if (trimmed.startsWith('DISCOVER:')) {
        signals.discover = trimmed.substring(9).trim();
      } else if (trimmed && !trimmed.startsWith('SCENE:') && !trimmed.startsWith('ENDING:') && 
                 !trimmed.startsWith('REMEMBER:') && !trimmed.startsWith('FORGET:') && 
                 !trimmed.startsWith('DISCOVER:')) {
        narrativeLines.push(line);
      }
    }

    const narrative = narrativeLines.join('\n').trim();

    // Log to debug pane if available
    if (this.debugPane) {
      this.debugPane.logLlmCall({
        prompt: { text: `Player: ${input}`, tokenCount: this.estimateTokens(context) },
        response: { 
          narrative, 
          signals,
          tokenCount: this.estimateTokens({ text: rawResponse })
        },
        context: {
          scene: context.currentSketch,
          memories: context.activeMemory?.length || 0,
          transitions: Object.keys(context.currentTransitions || {}).length
        }
      });
    }

    return {
      narrative: narrative || "I'm not sure how to respond to that right now.",
      signals: Object.keys(signals).length > 0 ? signals : undefined
    };
  }

  /**
   * Fallback response when LLM is not available
   */
  private handleFallbackResponse(input: string, context: DirectorContext): DirectorResponse {
    // Simple keyword-based responses for basic functionality
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('look') || inputLower.includes('examine')) {
      return {
        narrative: `You are in: ${context.currentSketch}\n\n🔑 This response is basic. Set up your Anthropic API key for natural language understanding.`
      };
    }
    
    if (inputLower.includes('help')) {
      return {
        narrative: `Available basic commands: look, examine, help\n\n🔑 For full natural language support, configure your Anthropic API key in Settings.`
      };
    }

    // Check for simple scene transitions
    if (context.currentTransitions) {
      for (const [sceneId, condition] of Object.entries(context.currentTransitions)) {
        if (inputLower.includes(condition.toLowerCase().split(' ')[0])) {
          return {
            narrative: `You ${condition}`,
            signals: { scene: sceneId }
          };
        }
      }
    }

    return {
      narrative: `You try to ${input}, but nothing happens.\n\n🔑 Set up your Anthropic API key for intelligent responses.`
    };
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