/**
 * LLM Director - Handles natural language interpretation and scene painting
 * 
 * Manages minimal context assembly and response parsing with clear signals.
 */

import { DirectorContext, DirectorResponse, DirectorSignals } from '@/types/impressionistStory';
import { MultiModelService } from '@/services/multiModelService';

export class LLMDirector {
  private multiModelService: MultiModelService;
  private debugPane?: any;
  
  // Configuration constants
  private static readonly POST_ENDING_INTERACTION_LIMIT = 5;
  private static readonly REGULAR_INTERACTION_LIMIT = 10;

  constructor(multiModelService?: MultiModelService) {
    this.multiModelService = multiModelService || new MultiModelService();
  }

  /**
   * Process player input with impressionistic approach
   */
  async processInput(input: string, context: DirectorContext): Promise<DirectorResponse> {
    if (!this.multiModelService.isConfigured()) {
      return {
        narrative: "🔑 API key required. Please configure your LLM provider in Settings to play.",
        signals: { error: "API key not configured" }
      };
    }

    try {
      const startTime = performance.now();
      const prompt = this.buildPrompt(input, context);
      
      // Log raw prompt to console
      console.log('📤 Raw LLM Prompt:', prompt);
      
      const response = await this.multiModelService.makeRequestWithUsage(prompt);
      const latencyMs = performance.now() - startTime;
      
      // Log raw LLM response to console
      console.log('🤖 Raw LLM Response:', response.content);
      
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
   * Build consolidated high-to-low level prompt for LLM with improved structure
   */
  private buildPrompt(input: string, context: DirectorContext): string {
    // Use simplified prompt for post-ending interactions
    if (context.storyComplete) {
      return this.buildPostEndingPrompt(input, context);
    }
    
    let prompt = '';

    // === IDENTITY & ROLE ===
    prompt += `You are the director of an impressionistic interactive fiction story. Paint scenes from minimal sketches and respond naturally to player actions.

`;

    // === GLOBAL STORY CONTEXT & RULES ===
    prompt += `STORY PREMISE: ${context.storyContext}

`;

    // Narrative Style
    if (context.narrative) {
      const parts = [];
      if (context.narrative.voice) parts.push(`  Voice: ${context.narrative.voice}`);
      if (context.narrative.tone) parts.push(`  Tone: ${context.narrative.tone}`);
      if (context.narrative.themes) {
        parts.push(`  Themes: ${context.narrative.themes.join(', ')}`);
      }
      
      if (parts.length > 0) {
        prompt += `NARRATIVE STYLE:
${parts.join('\n')}

`;
      }
    }

    // Global Story Guidance
    prompt += `GLOBAL STORY GUIDANCE:
${context.guidance}

`;

    // World Elements
    const worldParts = [];
    
    // Characters with full details
    if (context.activeCharacters && context.activeCharacters.length > 0) {
      const characterDetails = context.activeCharacters.map(c => {
        let charInfo = `    ${c.name}`;
        if (c.sketch) charInfo += ` - ${c.sketch}`;
        if (c.voice) charInfo += `\n      Voice: ${c.voice}`;
        if (c.arc) charInfo += `\n      Arc: ${c.arc}`;
        return charInfo;
      }).join('\n');
      worldParts.push(`  CHARACTERS:\n${characterDetails}`);
    }
    
    // Location context
    if (context.location) {
      const locationContext = this.buildLocationContext(context.location, context);
      if (locationContext) {
        worldParts.push(`  LOCATIONS:\n    ${locationContext.replace(/\n/g, '\n    ')}`);
      }
    }
    
    // Items with full details and descriptions
    if (context.discoverableItems && context.discoverableItems.length > 0) {
      const itemDetails = context.discoverableItems.map(item => {
        let itemInfo = `    ${item.name}`;
        if (item.sketch) itemInfo += `: ${item.sketch}`;
        if (item.reveals) itemInfo += `\n      Reveals: ${item.reveals}`;
        return itemInfo;
      }).join('\n');
      worldParts.push(`  ITEMS:\n${itemDetails}`);
    }
    
    if (worldParts.length > 0) {
      prompt += `WORLD ELEMENTS:
${worldParts.join('\n\n')}

`;
    }

    // === AI STATE MANAGEMENT & BEHAVIOR ===
    prompt += `INTERACTION PRINCIPLES:
- If player takes an action, describe only the outcome of that action; let them decide what to do next
- Let the player drive the pacing and sequence of events
- Build naturally from the current scene sketch, adding atmosphere and detail
- Only trigger transitions when the player's actions genuinely satisfy the conditions

SKETCH INTERPRETATION:
- Use the provided 'Current Scene Sketch' as your foundation, expanding it with rich sensory details
- Think of sketches as impressionist paintings - add color, texture, and emotion to the basic outline
- Incorporate scene transitions only when their REQUIRES conditions are naturally met by player actions

MEMORY GENERATION:
- Extract 0-3 NEW, factual memories from each interaction
- Capture key player decisions, plot developments, and revealed information
- Examples: "player activated device", "character departed", "player discovered secret area"
- For risky decisions: "player took risky action: [specific behavior]"

`;

    // === CURRENT GAME STATE ===
    prompt += `CURRENT SCENE SKETCH:
${context.currentSketch}

`;

    // Add scene-specific guidance if available
    if (context.sceneGuidance) {
      prompt += `CURRENT SCENE GUIDANCE:
${context.sceneGuidance}

`;
    }

    // Scene Transitions
    if (context.currentTransitions && Object.keys(context.currentTransitions).length > 0) {
      prompt += `POSSIBLE SCENE TRANSITIONS:
${Object.entries(context.currentTransitions)
  .map(([sceneId, data]) => `  - ${sceneId}:\n      REQUIRES: ${data.condition}\n      SKETCH: ${data.sketch}`)
  .join('\n\n')}

`;
    }

    // Recent Context
    if (context.recentInteractions && context.recentInteractions.length > 0) {
      const recentDialogue = context.recentInteractions
        .slice(-LLMDirector.REGULAR_INTERACTION_LIMIT)
        .flatMap(interaction => [
          `Player: ${interaction.playerInput}`,
          `Response: ${interaction.llmResponse}`
        ]);
      
      prompt += `RECENT CONVERSATION (oldest to newest):
${recentDialogue.join('\n')}

`;
    }

    // Recent Memory
    if (context.activeMemory && context.activeMemory.length > 0) {
      prompt += `RECENT MEMORY (oldest to newest):
${context.activeMemory.join('\n')}

`;
    }

    // Player Action
    prompt += `PLAYER ACTION: "${input}"

`;

    // === ENDING LOGIC ===
    if (context.availableEndings && context.availableEndings.variations.length > 0) {
      if (context.availableEndings.when) {
        const globalConditions = Array.isArray(context.availableEndings.when) 
          ? context.availableEndings.when.join(' AND ') 
          : context.availableEndings.when;
        prompt += `GLOBAL ENDING CONDITIONS (at least one must be met for ANY ending to be possible):
${globalConditions}

`;
      }
      
      prompt += `POSSIBLE ENDING VARIATIONS:
${context.availableEndings.variations
  .map(ending => {
    let conditionText;
    if (Array.isArray(ending.when)) {
      if (ending.when.some(condition => Array.isArray(condition))) {
        conditionText = ending.when
          .map(condition => Array.isArray(condition) ? `(${condition.join(' AND ')})` : condition)
          .join(' OR ');
      } else {
        conditionText = ending.when.join(' OR ');
      }
    } else {
      conditionText = ending.when;
    }
    return `  - ${ending.id}:\n      SPECIFIC REQUIRES: ${conditionText}\n      SKETCH: ${ending.sketch}`;
  })
  .join('\n\n')}

ENDING TRIGGER VERIFICATION (CRITICAL - Perform these checks in order):
1. Have ANY of the GLOBAL ENDING CONDITIONS been met? (YES/NO)
2. If YES to #1, check if the SPECIFIC REQUIRES for a particular ending variation have ALL been satisfied (YES/NO)
3. If both #1 and #2 are YES for an ending, trigger that ending. Otherwise, DO NOT trigger an ending and continue the current scene

`;
    }

    // === REQUIRED JSON OUTPUT FORMAT ===
    prompt += `REQUIRED JSON OUTPUT FORMAT:
{
  "narrative": "Your descriptive response. Use \\n for line breaks, escape quotes as \\", and ensure all strings are properly JSON-formatted.",
  "importance": 1-10,
  "reasoning": "Explain your decision-making process, especially for transitions and endings",
  "memories": ["new memory 1", "new memory 2"],
  "signals": {
    "transition": "ending:ACTUAL_ENDING_ID" OR "scene:ACTUAL_SCENE_ID"
  }
}

- For story endings: "transition": "ending:ACTUAL_ENDING_ID"
- For scene changes: "transition": "scene:ACTUAL_SCENE_ID"  
- ONLY use ending/scene IDs that actually exist in the current story
- Importance scale: 1-3 routine, 4-6 meaningful, 7-9 major moments, 10 story-defining
- Memories: Extract 0-3 NEW, factual memories from this interaction
- Reasoning: Always explain why you chose this response, especially if triggering transitions

RESPOND WITH ONLY THE JSON OBJECT. NO ADDITIONAL TEXT OR EXPLANATION OUTSIDE THIS JSON OBJECT.`;

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
      const reasoning = parsed.reasoning || "No reasoning provided";
      const signals: DirectorSignals = {};
      
      // Log reasoning for debugging
      console.log('🧠 LLM Reasoning:', reasoning);
      
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
      
      // Extract memories if present
      let memories: string[] | undefined;
      if (parsed.memories && Array.isArray(parsed.memories)) {
        memories = parsed.memories
          .filter((memory: any) => typeof memory === 'string' && memory.trim().length > 0)
          .map((memory: any) => String(memory).trim())
          .slice(0, 3); // Limit to max 3 memories as suggested in prompt
        
        if (memories && memories.length === 0) {
          memories = undefined;
        }
      }
      
      // Log to debug pane if available
      if (this.debugPane) {
        this.debugPane.logLlmCall({
          prompt: { text: `Player: ${input}`, tokenCount: this.estimateTokens(context) },
          response: { 
            narrative, 
            signals,
            reasoning,
            memories,
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
        importance,
        memories
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
   * Build smart location context with minimal token overhead
   */
  private buildLocationContext(location: any, context: DirectorContext): string {
    if (!location) return '';
    
    // Check if this is a new location compared to previous
    const isNewLocation = !context.previousLocation || context.previousLocation !== location.name;
    
    if (isNewLocation) {
      // New location - include key details with proper formatting
      let locationContext = `${location.name}`;
      
      // Add description/sketch
      if (location.sketch) {
        locationContext += ` - ${location.sketch}`;
      } else if (location.description) {
        locationContext += ` - ${location.description}`;
      }
      
      // Add atmosphere with proper formatting
      if (location.atmosphere && location.atmosphere.length > 0) {
        locationContext += `\n      Atmosphere: ${location.atmosphere.slice(0, 5).join(', ')}`;
      }
      
      // Add what the location contains
      if (location.contains && location.contains.length > 0) {
        locationContext += `\n      Contains: ${location.contains.slice(0, 5).join(', ')}`;
      }
      
      // Add location guidance if available
      if (location.guidance) {
        locationContext += `\n      Guidance: ${location.guidance}`;
      }
      
      return locationContext;
    } else {
      // Same location - minimal reminder only
      return `${location.name} (current setting)`;
    }
  }

  /**
   * Set debug pane for logging
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
  }
}