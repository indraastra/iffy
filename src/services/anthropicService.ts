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
    this.apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || localStorage.getItem('iffy_api_key');
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
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        // Use JSON mode for more reliable parsing
        system: "You must respond with valid JSON only. Do not include any text before or after the JSON object."
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
    return `You are an interactive fiction game interpreter processing natural language commands.

STORY: ${story.title} | ${story.metadata.tone.overall} | ${story.metadata.tone.narrative_voice}

STATE:
Location: ${currentLocation?.name || 'Unknown'} | Exits: ${currentLocation?.connections?.join(', ') || 'None'}
Inventory: ${gameState.inventory?.length > 0 ? gameState.inventory.join(', ') : 'Empty'}
Flow: ${gameState.currentFlow || 'None'} | Status: ${gameState.gameEnded ? 'COMPLETED' : 'ACTIVE'}

LOCATIONS:
${story.locations?.map((loc: any) => {
  let info = `${loc.name} (${loc.id})`;
  
  const itemsHere = story.items?.filter((item: any) => item.location === loc.id) || [];
  const discoverableHere = story.items?.filter((item: any) => item.discoverable_in === loc.id) || [];
  
  if (itemsHere.length > 0) {
    info += ` | Items: ${itemsHere.map((item: any) => item.name).join(', ')}`;
  }
  if (discoverableHere.length > 0) {
    info += ` | Discoverable: ${discoverableHere.map((item: any) => `${item.name} (search: ${item.discovery_objects?.join('/') || 'any'})`).join(', ')}`;
  }
  
  return info;
}).join('\n') || 'None'}

CHARACTERS: ${story.characters?.map((char: any) => char.name).join(', ') || 'None'}

${story.flows?.length > 0 ? `FLOWS: ${story.flows.map((flow: any) => `${flow.name}${flow.ends_game ? ' [END]' : ''}`).join(', ')}` : ''}

CURRENT FLOW CONTEXT:
${this.getCurrentFlowContext(story, gameState)}

CONVERSATION MEMORY:
${this.getConversationContext(gameState)}

DISCOVERY STATUS: Based on recent interactions, analyze if player has already examined/opened/checked containers or objects that would reveal items.

${gameState.gameEnded ? this.getEndingContext(story, gameState) : ''}

MARKUP: Use [character:Name] for characters, [item:Name] for items, **bold** for emphasis, [!warning]/[!discovery]/[!danger] for alerts.
Characters: ${story.characters?.map((char: any) => char.name).join(', ') || 'None'}

PLAYER COMMAND: "${command}"

CRITICAL: You must respond with valid JSON only. No text before or after the JSON object.

Use this exact format with properly escaped strings for multiline content:
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
  "response": "The narrative response to show the player. Use \\n for line breaks, escape quotes as \\\", and ensure all strings are properly JSON-formatted."
}

RULES:
1. Interpret natural language commands flexibly - the whole point is to avoid rigid syntax
2. Allow reasonable interactions with objects/appliances even if not explicitly defined (like using appliances, opening containers, etc.)
3. Items in discoverable_in locations can be taken if player has examined/opened/checked discovery_objects OR explicitly searched
4. Discovery commands (examine/search/look/check/open) reveal items and make them available for taking
5. Taking commands (take/grab) add to inventory - allow if item is accessible in current location
6. Use natural language understanding for actions like "cook X with Y", "put X in Y", "use X on Y"
7. Movement commands change location, but be flexible about phrasing
8. If game COMPLETED, allow reflection but no major state changes
9. Be permissive with item discovery - if player has clearly interacted with containers/objects, items inside are available
10. NEVER demand specific syntax - interpret intent and respond naturally`;
  }

  private parseResponse(responseText: string): LLMResponse {
    try {
      console.log('Raw LLM response:', responseText); // Debug log
      
      // With JSON mode, the response should be pure JSON
      const trimmedResponse = responseText.trim();
      
      // Direct JSON parsing since we're using JSON mode
      const parsed = JSON.parse(trimmedResponse);
      console.log('Parsed JSON:', parsed); // Debug log
      
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
      
      // Log the specific parsing error for debugging
      if (error instanceof SyntaxError) {
        console.error('JSON Syntax Error:', error.message);
        // Try to identify the problem area
        const lines = responseText.split('\n');
        console.error('Response has', lines.length, 'lines');
        lines.forEach((line, i) => {
          if (line.includes('"') && !line.includes('\\"')) {
            console.warn(`Potential unescaped quote on line ${i + 1}: ${line}`);
          }
        });
      }
      
      // Never show raw JSON to the user - always provide a clean error message
      return {
        action: 'other',
        reasoning: 'Failed to parse LLM response',
        stateChanges: {},
        response: 'I had trouble understanding that command. The AI system seems to be having formatting issues. Could you try rephrasing your request?'
      };
    }
  }

  private getEndingContext(story: any, gameState: any): string {
    if (!gameState.endingId) return '';
    
    const ending = story.endings?.find((ending: any) => ending.id === gameState.endingId);
    if (!ending) return 'GAME COMPLETED: Unknown ending reached';
    
    return `GAME COMPLETED:
Ending Achieved: ${ending.name}
Ending Description: This ending was triggered by meeting the requirements: ${ending.requires?.join(', ') || 'None'}
The player has successfully concluded this story path.`;
  }

  private getCurrentFlowContext(story: any, gameState: any): string {
    if (!gameState.currentFlow) return 'No active flow';
    
    const currentFlow = story.flows?.find((flow: any) => flow.id === gameState.currentFlow);
    if (!currentFlow) return 'Flow not found';
    
    let context = `Active Flow: ${currentFlow.name} (${currentFlow.type})`;
    
    if (currentFlow.content) {
      context += `\nFlow Content: ${currentFlow.content}`;
    }
    
    if (currentFlow.player_goal) {
      context += `\nPlayer Goal: ${currentFlow.player_goal}`;
    }
    
    if (currentFlow.hint) {
      context += `\nHint: ${currentFlow.hint}`;
    }
    
    if (currentFlow.participants) {
      context += `\nParticipants: ${currentFlow.participants.join(', ')}`;
    }
    
    if (currentFlow.exchanges && currentFlow.exchanges.length > 0) {
      context += `\nDialogue Context: ${currentFlow.exchanges.length} exchanges available`;
    }
    
    return context;
  }

  private getConversationContext(gameState: any): string {
    if (!gameState.conversationMemory?.immediateContext?.recentInteractions?.length) {
      return 'No recent conversation history.';
    }

    const interactions = gameState.conversationMemory.immediateContext.recentInteractions;
    let context = `Recent Conversation History (last ${interactions.length} interactions):\n`;
    
    interactions.forEach((interaction: any, index: number) => {
      const timeAgo = this.getTimeAgo(new Date(interaction.timestamp));
      context += `\n${index + 1}. [${timeAgo}] Player: "${interaction.playerInput}"\n`;
      context += `   Response: "${interaction.llmResponse}"\n`;
      if (interaction.importance !== 'low') {
        context += `   [Importance: ${interaction.importance}]\n`;
      }
    });

    // Add any significant memories (Phase 2+ feature, placeholder for now)
    if (gameState.conversationMemory.significantMemories?.length > 0) {
      context += `\nSignificant Memories: ${gameState.conversationMemory.significantMemories.length} stored\n`;
    }

    return context;
  }

  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  }

}