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
Current Flow: ${gameState.currentFlow || 'None'}
Knowledge: ${gameState.knowledge?.size > 0 ? Array.from(gameState.knowledge).join(', ') : 'None'}
Game Status: ${gameState.gameEnded ? `COMPLETED (Ending: ${gameState.endingId || 'Unknown'})` : 'IN PROGRESS'}

WORLD MODEL:
${story.locations?.map((loc: any) => {
  let locationInfo = `📍 ${loc.name} (${loc.id}): ${loc.description}`;
  
  // Show location objects
  if (loc.objects && loc.objects.length > 0) {
    locationInfo += `\n  🔧 Objects in this location:`;
    loc.objects.forEach((obj: any) => {
      locationInfo += `\n    - ${obj.name}: ${obj.description}`;
    });
  }
  
  // Show items directly in this location
  const itemsHere = story.items?.filter((item: any) => item.location === loc.id) || [];
  if (itemsHere.length > 0) {
    locationInfo += `\n  📦 Items visible here:`;
    itemsHere.forEach((item: any) => {
      locationInfo += `\n    - ${item.name} (${item.id}): ${item.description}`;
      if (item.aliases && item.aliases.length > 0) {
        locationInfo += ` [Also called: ${item.aliases.join(', ')}]`;
      }
    });
  }
  
  // Show discoverable items and what to search
  const discoverableHere = story.items?.filter((item: any) => item.discoverable_in === loc.id) || [];
  if (discoverableHere.length > 0) {
    locationInfo += `\n  🔍 Items discoverable here:`;
    discoverableHere.forEach((item: any) => {
      locationInfo += `\n    - ${item.name} (${item.id}): ${item.description}`;
      if (item.discovery_objects && item.discovery_objects.length > 0) {
        locationInfo += `\n      ➤ Found by searching: ${item.discovery_objects.join(', ')}`;
      }
      if (item.aliases && item.aliases.length > 0) {
        locationInfo += ` [Also called: ${item.aliases.join(', ')}]`;
      }
    });
  }
  
  return locationInfo;
}).join('\n\n') || 'None defined'}

CHARACTERS:
${story.characters?.map((char: any) => `- ${char.name} (${char.id}): ${char.description} [Voice: ${char.voice}] [Traits: ${char.traits?.join(', ') || 'None'}]`).join('\n') || 'None defined'}

STORY FLOWS:
${story.flows?.map((flow: any) => `- ${flow.name} (${flow.id}): ${flow.type} ${flow.requirements ? `[Requires: ${flow.requirements.join(', ')}]` : ''}${flow.ends_game ? ' [ENDS GAME]' : ''}`).join('\n') || 'None defined'}

STORY ENDINGS:
${story.endings?.map((ending: any) => `- ${ending.name} (${ending.id}): ${ending.requires ? `[Requires: ${ending.requires.join(', ')}]` : 'No requirements'}`).join('\n') || 'Defined as narrative flows with ends_game=true'}

CURRENT FLOW CONTEXT:
${this.getCurrentFlowContext(story, gameState)}

CONVERSATION MEMORY:
${this.getConversationContext(gameState)}

${gameState.gameEnded ? this.getEndingContext(story, gameState) : ''}

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

CRITICAL RULES:
1. If your narrative describes moving to a different location, set "newLocation" to the exact location ID
2. ITEM DISCOVERY CONSTRAINTS ARE ABSOLUTE:
   - Items with "discoverable_in" can ONLY be found in that specific location, nowhere else
   - Items with "discovery_objects" can ONLY be found by searching those exact objects
   - If player searches wrong location/object for a discoverable item, they find NOTHING
   - Example: item_x discoverable_in "location_a" via "object_y" → searching location_b finds NOTHING
   - Be firm: "You search thoroughly but find nothing" - do NOT improvise alternate locations
3. DISCOVERY vs TAKING - CRITICAL DISTINCTION:
   - DISCOVERY commands (check, examine, inspect, search, look, rummage): ONLY describe finding/spotting items
   - NEVER automatically take items during discovery - STOP at "you spot", "you notice", "you see"
   - Example: "examine object_y" → "You spot item_x among the object_y" (NO inventory change)
   - TAKING commands (take, grab, pick up, get, collect): Add items to inventory
   - Example: "take item_x" → "You grab the item_x" (WITH inventory change)
4. DISCOVERY IS MANDATORY: When players search correct objects in correct locations, you MUST find the item
   - Use discovery language: "you spot", "you notice", "you see", "you find" 
   - STOP THERE - do not continue with taking actions
   - Let the player decide their next action after discovery
5. DO NOT ASSUME PLAYER INTENT - PERFORM ONLY THE REQUESTED ACTION:
   - If player says "go to location_a", ONLY move there - do not search, examine, or take anything
   - If player says "check object_y", ONLY examine it - do not take anything found
   - If player says "examine item_x", ONLY look at it - do not use or manipulate it
   - NEVER chain multiple actions together - each command is one specific action
   - Do not anticipate what the player "probably wants" based on story context
6. MOVEMENT COMMANDS ARE LOCATION-ONLY:
   - "go to", "move to", "enter", "leave" should ONLY change location
   - Describe the new location but do NOT perform searches or interactions
   - Let the player explicitly request any searches or examinations after moving
7. Use exact location and item IDs from the story data
8. Only allow actions valid for current location and inventory
9. Maintain the story's tone and be concise but atmospheric

ENDGAME HANDLING:
- If Game Status is COMPLETED, the story has concluded and no major actions should change the world state
- Allow reflective interactions: examining the final state, discussing the outcome, asking "what if" questions
- Respond to questions about the story, characters, or player choices made during the game  
- Don't allow actions that would fundamentally change the concluded narrative
- Maintain the celebratory or reflective tone appropriate to the ending achieved
- Players can still look around, check inventory, or discuss what happened`;
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