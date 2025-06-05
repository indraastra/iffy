import Anthropic from '@anthropic-ai/sdk';

export interface LLMResponse {
  action: string;
  reasoning: string;
  stateChanges: {
    newLocation?: string;
    addToInventory?: string[];
    removeFromInventory?: string[];
    setFlags?: string[];
    unsetFlags?: string[];
    addKnowledge?: string[];
  };
  response: string;
  error?: string;
}

export class AnthropicService {
  private client: Anthropic | null = null;
  private apiKey: string | null = null;
  private debugCallback?: (prompt: string, response: string) => void;

  constructor() {
    this.loadApiKey();
  }

  public setDebugCallback(callback: (prompt: string, response: string) => void): void {
    this.debugCallback = callback;
  }

  private loadApiKey(): void {
    // Try environment variable first, then fall back to localStorage
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || localStorage.getItem('iffy_api_key');
    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // Enable browser usage
      });
    }
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('iffy_api_key', apiKey);
    this.client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  public isConfigured(): boolean {
    return this.client !== null && this.apiKey !== null;
  }

  public async processCommand(
    command: string,
    gameState: any,
    story: any,
    currentLocation: any
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error('Anthropic API not configured. Please set your API key in settings.');
    }

    try {
      const prompt = this.buildPrompt(command, gameState, story, currentLocation);
      
      // Log prompt to debug callback
      if (this.debugCallback) {
        this.debugCallback(prompt, '');
      }
      
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from API');
      }

      // Log response to debug callback
      if (this.debugCallback) {
        this.debugCallback('', content.text);
      }

      return this.parseResponse(content.text);
    } catch (error) {
      console.error('Anthropic API error:', error);
      
      let errorMessage = 'Sorry, I\'m having trouble processing that command.';
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'API key is invalid. Please check your Anthropic API key in Settings.';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'API rate limit exceeded. Please wait a moment before trying again.';
        } else if (error.message.includes('402') || error.message.includes('insufficient')) {
          errorMessage = 'API quota exceeded. Please check your Anthropic account billing.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      }
      
      return {
        action: 'error',
        reasoning: 'API call failed',
        stateChanges: {},
        response: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private buildPrompt(
    command: string,
    gameState: any,
    story: any,
    currentLocation: any
  ): string {
    return `You are an interactive fiction game interpreter. Your job is to:
1. Understand the player's natural language command
2. Determine what action they want to take
3. Check if the action is valid in the current context
4. Generate an appropriate response
5. Specify any state changes that should occur

STORY CONTEXT:
Title: ${story.title}
Setting: ${story.metadata.setting.time}, ${story.metadata.setting.place}
Tone: ${story.metadata.tone.overall}
Narrative Voice: ${story.metadata.tone.narrative_voice}

CURRENT GAME STATE:
Location: ${currentLocation?.name || 'Unknown'}
Location Description: ${currentLocation?.description || 'No description'}
Available Exits: ${currentLocation?.connections?.join(', ') || 'None'}
Inventory: ${gameState.inventory?.length > 0 ? gameState.inventory.join(', ') : 'Empty'}
Flags: ${gameState.flags?.size > 0 ? Array.from(gameState.flags).join(', ') : 'None'}

AVAILABLE LOCATIONS:
${story.locations?.map((loc: any) => `- ${loc.name} (${loc.id}): ${loc.description}`).join('\n') || 'None defined'}

AVAILABLE ITEMS:
${story.items?.map((item: any) => `- ${item.name} (${item.id}): ${item.description} [Location: ${item.location}]`).join('\n') || 'None defined'}

PLAYER COMMAND: "${command}"

Please respond with a JSON object in this exact format:
{
  "action": "look|move|take|drop|talk|examine|help|inventory|other",
  "reasoning": "Brief explanation of what the player is trying to do",
  "stateChanges": {
    "newLocation": "location_id or null",
    "addToInventory": ["item_id1", "item_id2"] or [],
    "removeFromInventory": ["item_id1"] or [],
    "setFlags": ["flag_name1"] or [],
    "unsetFlags": ["flag_name1"] or [],
    "addKnowledge": ["knowledge_id1"] or []
  },
  "response": "The narrative response to show the player, matching the story's tone and voice"
}

IMPORTANT RULES:
- Only allow valid actions based on current location and inventory
- Maintain the story's tone and narrative voice
- Keep responses concise but atmospheric
- If the action is impossible, explain why in a diegetic way
- Use the exact location IDs and item IDs from the story data
- Never break the fourth wall unless the story does
- For movement commands, check that the destination is in the current location's connections
- For taking items, check that they exist in the current location`;
  }

  private parseResponse(responseText: string): LLMResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.action || !parsed.response) {
        throw new Error('Invalid response format: missing required fields');
      }

      return {
        action: parsed.action || 'other',
        reasoning: parsed.reasoning || '',
        stateChanges: {
          newLocation: parsed.stateChanges?.newLocation || null,
          addToInventory: parsed.stateChanges?.addToInventory || [],
          removeFromInventory: parsed.stateChanges?.removeFromInventory || [],
          setFlags: parsed.stateChanges?.setFlags || [],
          unsetFlags: parsed.stateChanges?.unsetFlags || [],
          addKnowledge: parsed.stateChanges?.addKnowledge || []
        },
        response: parsed.response
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Raw response:', responseText);
      
      // Fallback: return the raw response as a generic action
      return {
        action: 'other',
        reasoning: 'Failed to parse structured response',
        stateChanges: {},
        response: responseText || 'I didn\'t understand that command. Could you try rephrasing it?'
      };
    }
  }
}