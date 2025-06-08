import { GameStateResponseParser } from '@/utils/gameStateResponseParser';
import type { GameStateResponse } from '@/schemas/gameStateResponses';
import { TextFormatter, formatList, formatStructuredList, formatKeyValue, formatRequirements, formatAliases, formatTraits } from '@/utils/textFormatting';

export type { GameStateResponse } from '@/schemas/gameStateResponses';

/**
 * Handles building prompts and parsing responses for the Iffy game engine.
 * This separates game-specific logic from the generic LLM service.
 */
export class GamePromptBuilder {
  /**
   * Build a comprehensive prompt for the LLM based on current game state
   */
  buildPrompt(
    command: string,
    gameState: any,
    story: any,
    currentLocation: any
  ): string {
    return `You are an interactive fiction game interpreter processing natural language commands.

STORY: ${story.title} | ${story.metadata.tone.overall} | ${story.metadata.tone.narrative_voice}

STATE:
Location: ${currentLocation?.name || 'Unknown'} | ${formatKeyValue('Exits', currentLocation?.connections)}
Inventory: ${this.getInventoryDisplay(gameState, story)}
Flow: ${gameState.currentFlow || 'None'} | Status: ${gameState.gameEnded ? 'COMPLETED' : 'ACTIVE'}

LOCATIONS:
${formatStructuredList(story.locations, {
  transform: (loc: any) => {
    let info = `${loc.name} (${loc.id})`;
    
    const itemsHere = story.items?.filter((item: any) => item.location === loc.id) || [];
    const discoverableHere = story.items?.filter((item: any) => item.discoverable_in === loc.id) || [];
    
    if (itemsHere.length > 0) {
      info += ` | ${formatKeyValue('Items', itemsHere.map((item: any) => item.name))}`;
    }
    if (discoverableHere.length > 0) {
      info += ` | ${formatKeyValue('Discoverable', discoverableHere.map((item: any) => 
        `${item.name} (search: ${formatList(item.discovery_objects, { separator: '/', fallback: 'any' })})`
      ))}`;
    }
    
    return info;
  }
})}

ITEMS & TRANSFORMATIONS:
${formatStructuredList(story.items, {
  transform: (item: any) => {
    let info = `${item.name} (${item.id})`;
    if (item.can_become) {
      info += ` → can become: ${item.can_become}`;
    }
    if (item.created_from) {
      info += ` ← created from: ${item.created_from}`;
    }
    const aliases = formatAliases(item.aliases);
    if (aliases) {
      info += ` | ${aliases}`;
    }
    return info;
  }
})}

${TextFormatter.formatSection('SUCCESS CONDITIONS', story.success_conditions, {
  transform: (sc: any) => `${sc.id}: ${sc.description}\n  ${formatRequirements(sc.requires)}`
})}

PLAYER CHARACTER: ${this.getPlayerCharacterInfo(story)}

NPC CHARACTERS: ${this.getNPCCharacterInfo(story)}

${formatKeyValue('FLOWS', story.flows?.map((flow: any) => `${flow.name}${flow.ends_game ? ' [END]' : ''}`) || [])}

CURRENT FLOW CONTEXT:
${this.getCurrentFlowContext(story, gameState)}

${story.llm_guidelines ? `LLM STORY GUIDELINES:
${story.llm_guidelines}` : ''}

CONVERSATION MEMORY:
${this.getConversationContext(gameState)}

DISCOVERY STATUS: Based on recent interactions, analyze if player has already examined/opened/checked containers or objects that would reveal items.

${gameState.gameEnded ? this.getEndingContext(story, gameState) : ''}

MARKUP: Use [character:Name] for characters, [item:item_id] for items (use the item's ID, not name), **bold** for emphasis, [!warning]/[!discovery]/[!danger] for alerts. Do NOT use [location:Name] markup - just use the location name directly.

IMPORTANT: The player IS the player character. Do NOT treat the player character as a separate NPC they can talk to. When players try to "talk to" or interact with the player character, explain that they ARE that character.

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
  "response": "The narrative response to show the player. Use \\n for line breaks, escape quotes as \\", and ensure all strings are properly JSON-formatted."
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
10. NEVER demand specific syntax - interpret intent and respond naturally
11. CRITICAL: The player IS the player character. If they try to "talk to" or interact with the player character, explain that they ARE that character - don't treat it as a separate NPC conversation
12. ITEM TRANSFORMATIONS: When players perform actions that logically transform items, intelligently create the new item. For example, if "bread" can_become "toasted bread" and player toasts it, remove "bread" from inventory and add "toasted bread".
13. SUCCESS CONDITION AWARENESS: Understand story goals from success conditions and guide players toward meaningful achievements.
14. FLEXIBLE TRANSFORMATION METHODS: Be creative about how transformations can occur - "toast bread" could use toaster, oven, pan, fire, etc. Focus on logical outcomes, not rigid methods.
15. NATURAL ITEM RELATIONSHIPS: When items have can_become/created_from relationships, understand these as logical possibilities, not rigid requirements.
16. STORY GOAL GUIDANCE: Use success conditions and LLM guidelines to understand the story's intended experience and help guide players toward meaningful interactions.`;
  }

  /**
   * Parse game state LLM response text into structured GameStateResponse object using Zod validation
   */
  parseResponse(responseText: string): GameStateResponse {
    // Use the safe parser with automatic fallback
    return GameStateResponseParser.parseWithFallback(responseText);
  }

  /**
   * Parse game state LLM response with detailed error information (for debugging)
   */
  parseResponseDetailed(responseText: string, useValidation: boolean = false) {
    return GameStateResponseParser.safeParse(responseText, useValidation);
  }

  /**
   * Get context information about game ending state
   */
  private getEndingContext(story: any, gameState: any): string {
    if (!gameState.endingId) return '';
    
    // Format v2: Check for success condition ending first
    const successCondition = story.success_conditions?.find((sc: any) => sc.id === gameState.endingId);
    if (successCondition) {
      return `GAME COMPLETED:
Success Condition Achieved: ${successCondition.description}
${formatRequirements(successCondition.requires, { keyValueSeparator: 'Requirements Met: ' })}
The player has successfully achieved this story goal.`;
    }
    
    // Fallback to traditional ending
    const ending = story.endings?.find((ending: any) => ending.id === gameState.endingId);
    if (!ending) return 'GAME COMPLETED: Unknown ending reached';
    
    return `GAME COMPLETED:
Ending Achieved: ${ending.name}
Ending Description: This ending was triggered by meeting the requirements: ${formatList(ending.requires)}
The player has successfully concluded this story path.`;
  }

  /**
   * Get context information about the current story flow
   */
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
      context += `\n${formatKeyValue('Participants', currentFlow.participants)}`;
    }
    
    if (currentFlow.exchanges && currentFlow.exchanges.length > 0) {
      context += `\nDialogue Context: ${currentFlow.exchanges.length} exchanges available`;
    }
    
    return context;
  }

  /**
   * Get conversation history context
   */
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

  /**
   * Calculate time ago string for conversation history
   */
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

  /**
   * Get player character information for prompt
   */
  private getPlayerCharacterInfo(story: any): string {
    const playerChar = story.characters?.find((char: any) => char.id === 'player');
    if (!playerChar) {
      return 'Not defined';
    }
    
    return `${playerChar.name} - ${playerChar.description || 'No description'} ${formatTraits(playerChar.traits)}`;
  }

  /**
   * Get NPC character information for prompt
   */
  private getNPCCharacterInfo(story: any): string {
    const npcs = story.characters?.filter((char: any) => char.id !== 'player') || [];
    return formatList(npcs, {
      transform: (char: any) => `${char.name} - ${char.description || 'No description'}`
    });
  }

  /**
   * Get formatted inventory display for prompt
   */
  private getInventoryDisplay(gameState: any, story: any): string {
    return formatList(gameState.inventory, {
      fallback: 'Empty',
      transform: (itemId: string) => {
        const item = story.items?.find((i: any) => i.id === itemId);
        if (!item) return itemId; // Fallback to ID if item not found
        
        let display = `${item.name} (${itemId})`;
        
        // Add aliases for LLM understanding
        const aliases = formatAliases(item.aliases);
        if (aliases) {
          display += ` ${aliases}`;
        }
        
        // Add transformation info
        if (item.can_become) {
          display += ` [can become: ${item.can_become}]`;
        }
        
        return display;
      }
    });
  }
}