import { GameStateResponseParser } from '@/utils/gameStateResponseParser';
import type { GameStateResponse } from '@/schemas/gameStateResponses';
import { formatList, formatKeyValue, formatRequirements, formatAliases, formatTraits, formatSectionContent } from '@/utils/textFormatting';

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
    currentLocation: any,
    memoryContext?: any,
    potentialChanges?: { transitions: any[], endings: any[] }
  ): string {
    return `You are an interactive fiction game interpreter processing natural language commands.

STORY: ${story.title} | ${story.metadata.tone.overall} | ${story.metadata.tone.narrative_voice}

STATE:
Location: ${currentLocation?.name || 'Unknown'} | ${formatKeyValue('Exits', currentLocation?.connections)}
Inventory: ${this.getInventoryDisplay(gameState, story)}
Flow: ${gameState.currentFlow || 'None'} | Status: ${gameState.gameEnded ? 'COMPLETED' : 'ACTIVE'}

${this.getLocationContext(story, currentLocation, gameState)}

${this.getInventoryAndTransformations(story, gameState)}

SUCCESS CONDITIONS:
${formatSectionContent(story.success_conditions, {
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
${memoryContext ? this.formatMemoryContext(memoryContext) : this.getConversationContext(gameState)}

DISCOVERY STATUS: Based on recent interactions, analyze if player has already examined/opened/checked containers or objects that would reveal items.

${gameState.gameEnded ? this.getEndingContext(story, gameState) : ''}

${potentialChanges ? this.getNarrativeChangesContext(potentialChanges) : ''}

MARKUP SYNTAX:
- Characters: [Display Name](character:id) - e.g., [Inspector Whitmore](character:player), [Sarah](character:sarah)
- Items: [Display Text](item:id) - e.g., [golden key](item:key), [mysterious tome](item:ancient_book)
- Bold: **text** for emphasis - e.g., **important discovery**, **dramatic moment**
- Italic: *text* for atmosphere - e.g., *whispered words*, *eerie silence*
- Alerts: [!type] content - [!warning], [!discovery], [!danger] - e.g., [!discovery] You found something important!
- Nested markup works: **The [golden key](item:key) glows brightly** or [!warning] Be careful with the **dangerous** [poison](item:toxin)!
- Do NOT use [location:Name] markup - just use location names directly

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
    "unsetFlags": ["flag_name1"] or []
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
11. The player IS the player character. If they try to "talk to" or interact with the player character, explain that they ARE that character - don't treat it as a separate NPC conversation
12. ITEM TRANSFORMATIONS: When players perform actions that logically transform items, intelligently create the new item. For example, if "bread" can_become "toasted bread" and player toasts it, remove "bread" from inventory and add "toasted bread".
13. SUCCESS CONDITION AWARENESS: Understand story goals from success conditions and guide players toward meaningful achievements.
14. FLEXIBLE TRANSFORMATION METHODS: Be creative about how transformations can occur - "toast bread" could use toaster, oven, pan, fire, etc. Focus on logical outcomes, not rigid methods.
15. NATURAL ITEM RELATIONSHIPS: When items have can_become/created_from relationships, understand these as logical possibilities, not rigid requirements.
16. STORY GOAL GUIDANCE: Use success conditions and LLM guidelines to understand the story's intended experience and help guide players toward meaningful interactions.`;
  }

  /**
   * Get prompt sections as structured data for debug visibility
   */
  getSections(
    command: string,
    gameState: any,
    story: any,
    currentLocation: any,
    memoryContext?: any,
    potentialChanges?: { transitions: any[], endings: any[] }
  ): Record<string, string> {
    const sections: Record<string, string> = {};

    sections['STORY'] = `${story.title} | ${story.metadata.tone.overall} | ${story.metadata.tone.narrative_voice}`;

    sections['STATE'] = `Location: ${currentLocation?.name || 'Unknown'} | ${formatKeyValue('Exits', currentLocation?.connections)}
Inventory: ${this.getInventoryDisplay(gameState, story)}
Flow: ${gameState.currentFlow || 'None'} | Status: ${gameState.gameEnded ? 'COMPLETED' : 'ACTIVE'}`;

    // Use the new consolidated location context
    const locationContext = this.getLocationContext(story, currentLocation, gameState);
    // Split the location context into sections since getSections expects individual keys
    const locationLines = locationContext.split('\n');
    let currentSection = '';
    let currentKey = '';
    
    for (const line of locationLines) {
      if (line.match(/^(CURRENT LOCATION|OTHER LOCATIONS):$/)) {
        // Save previous section if exists
        if (currentKey && currentSection) {
          sections[currentKey] = currentSection.trim();
        }
        // Start new section
        currentKey = line.replace(':', '');
        currentSection = '';
      } else {
        currentSection += line + '\n';
      }
    }
    
    // Save final section
    if (currentKey && currentSection) {
      sections[currentKey] = currentSection.trim();
    }

    // Add inventory and transformations using the new scoped approach
    const inventoryContext = this.getInventoryAndTransformations(story, gameState);
    const inventoryLines = inventoryContext.split('\n');
    let currentInventorySection = '';
    let currentInventoryKey = '';
    
    for (const line of inventoryLines) {
      if (line.match(/^(INVENTORY ITEMS|ITEM TRANSFORMATIONS):$/)) {
        // Save previous section if exists
        if (currentInventoryKey && currentInventorySection) {
          sections[currentInventoryKey] = currentInventorySection.trim();
        }
        // Start new section
        currentInventoryKey = line.replace(':', '');
        currentInventorySection = '';
      } else {
        currentInventorySection += line + '\n';
      }
    }
    
    // Save final inventory section
    if (currentInventoryKey && currentInventorySection) {
      sections[currentInventoryKey] = currentInventorySection.trim();
    }

    if (story.success_conditions) {
      sections['SUCCESS CONDITIONS'] = formatSectionContent(story.success_conditions, {
        transform: (sc: any) => `${sc.id}: ${sc.description}\n  ${formatRequirements(sc.requires)}`
      });
    }

    sections['PLAYER CHARACTER'] = this.getPlayerCharacterInfo(story);
    sections['NPC CHARACTERS'] = this.getNPCCharacterInfo(story);
    sections['FLOWS'] = formatList(story.flows?.map((flow: any) => `${flow.name}${flow.ends_game ? ' [END]' : ''}`) || []);
    sections['CURRENT FLOW CONTEXT'] = this.getCurrentFlowContext(story, gameState);

    if (story.llm_guidelines) {
      sections['LLM STORY GUIDELINES'] = story.llm_guidelines;
    }

    sections['CONVERSATION MEMORY'] = memoryContext ? this.formatMemoryContext(memoryContext) : this.getConversationContext(gameState);
    sections['DISCOVERY STATUS'] = 'Based on recent interactions, analyze if player has already examined/opened/checked containers or objects that would reveal items.';

    if (gameState.gameEnded) {
      sections['GAME COMPLETED'] = this.getEndingContext(story, gameState);
    }

    if (potentialChanges) {
      sections['POTENTIAL NARRATIVE CHANGES'] = this.getNarrativeChangesContext(potentialChanges);
    }

    sections['MARKUP'] = `SYNTAX:
- Characters: [Display Name](character:id) - e.g., [Inspector](character:player), [Sarah](character:sarah)
- Items: [Display Text](item:id) - e.g., [golden key](item:key), [ancient tome](item:book)
- Bold: **text** for emphasis, Italic: *text* for atmosphere
- Alerts: [!warning]/[!discovery]/[!danger] content
- Nested markup works: **The [golden key](item:key) glows** or [!warning] **Dangerous** [poison](item:toxin)!
- Do NOT use [location:Name] markup`;
    sections['PLAYER COMMAND'] = `"${command}"`;
    sections['CRITICAL'] = 'You must respond with valid JSON only. No text before or after the JSON object.';

    sections['FORMAT'] = `Use this exact format with properly escaped strings for multiline content:
{
  "action": "look|move|take|drop|talk|examine|help|inventory|other",
  "reasoning": "Brief explanation of what the player is trying to do",
  "stateChanges": {
    "newLocation": "location_id or null",
    "addToInventory": ["item_id1", "item_id2"] or [],
    "removeFromInventory": ["item_id1"] or [],
    "setFlags": ["flag_name1"] or [],
    "unsetFlags": ["flag_name1"] or []
  },
  "response": "The narrative response to show the player. Use \\n for line breaks, escape quotes as \\", and ensure all strings are properly JSON-formatted."
}`;

    sections['RULES'] = `1. Interpret natural language commands flexibly - the whole point is to avoid rigid syntax
2. Allow reasonable interactions with objects/appliances even if not explicitly defined (like using appliances, opening containers, etc.)
3. Items in discoverable_in locations can be taken if player has examined/opened/checked discovery_objects OR explicitly searched
4. Discovery commands (examine/search/look/check/open) reveal items and make them available for taking
5. Taking commands (take/grab) add to inventory - allow if item is accessible in current location
6. Use natural language understanding for actions like "cook X with Y", "put X in Y", "use X on Y"
7. Movement commands change location, but be flexible about phrasing
8. If game COMPLETED, allow reflection but no major state changes
9. Be permissive with item discovery - if player has clearly interacted with containers/objects, items inside are available
10. NEVER demand specific syntax - interpret intent and respond naturally
11. The player IS the player character. If they try to "talk to" or interact with the player character, explain that they ARE that character - don't treat it as a separate NPC conversation
12. ITEM TRANSFORMATIONS: When players perform actions that logically transform items, intelligently create the new item. For example, if "bread" can_become "toasted bread" and player toasts it, remove "bread" from inventory and add "toasted bread".
13. SUCCESS CONDITION AWARENESS: Understand story goals from success conditions and guide players toward meaningful achievements.
14. FLEXIBLE TRANSFORMATION METHODS: Be creative about how transformations can occur - "toast bread" could use toaster, oven, pan, fire, etc. Focus on logical outcomes, not rigid methods.
15. NATURAL ITEM RELATIONSHIPS: When items have can_become/created_from relationships, understand these as logical possibilities, not rigid requirements.
16. STORY GOAL GUIDANCE: Use success conditions and LLM guidelines to understand the story's intended experience and help guide players toward meaningful interactions.`;

    return sections;
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
    
    // Include transition information for LLM to understand flow progression
    if (currentFlow.transitions && currentFlow.transitions.length > 0) {
      context += `\n\nFLOW TRANSITIONS: This flow can transition when conditions are met:`;
      for (const transition of currentFlow.transitions) {
        const requirementsList = transition.requires.join(', ');
        context += `\n  → ${transition.to_flow} when: [${requirementsList}]`;
        if (transition.description) {
          context += ` (${transition.description})`;
        }
      }
      context += `\n\nIMPORTANT: Set appropriate flags in your response to enable flow transitions when story beats are hit!`;
    }
    
    // Legacy support for old completion_transitions
    if (currentFlow.completion_transitions && currentFlow.completion_transitions.length > 0) {
      context += `\n\nLEGACY TRANSITIONS: This flow can transition when conditions are met:`;
      for (const transition of currentFlow.completion_transitions) {
        context += `\n  → ${transition.to_flow} when: ${transition.condition}`;
      }
    }
    
    return context;
  }

  /**
   * Format memory context from MemoryManager
   */
  private formatMemoryContext(memoryContext: any): string {
    let context = memoryContext.recentInteractions;
    
    if (memoryContext.significantMemories && memoryContext.significantMemories !== 'No significant memories stored.') {
      context += `\n\n${memoryContext.significantMemories}`;
    }
    
    context += `\n\nMemory Stats: ${memoryContext.stats.recentCount} recent interactions, ${memoryContext.stats.significantCount} significant memories`;
    
    return context;
  }

  /**
   * Get conversation history context (fallback for old system)
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

  /**
   * Generate context for potential narrative changes (transitions and endings)
   */
  private getNarrativeChangesContext(potentialChanges: { transitions: any[], endings: any[] }): string {
    const sections: string[] = [];

    // Handle flow transitions
    if (potentialChanges.transitions.length > 0) {
      sections.push('FLOW TRANSITION ALERTS:');
      potentialChanges.transitions.forEach(change => {
        const likelihood = change.isLikely ? 'very likely' : 'possible';
        sections.push(`
→ ${change.targetFlow.name} (${change.targetFlow.id}) - ${likelihood} to occur
  TYPE: ${change.targetFlow.type}
  CONTENT: ${change.content || 'No specific content'}`);
      });
    }

    // Handle story endings
    if (potentialChanges.endings.length > 0) {
      sections.push('\nSTORY ENDING ALERTS:');
      potentialChanges.endings.forEach(ending => {
        const likelihood = ending.isLikely ? 'very likely' : 'possible';
        sections.push(`
→ ${ending.condition.id} - ${likelihood} to trigger
  DESCRIPTION: ${ending.condition.description}
  ENDING CONTENT: ${ending.content}`);
      });
    }

    if (sections.length > 0) {
      sections.push(`
CRITICAL INSTRUCTIONS: If this player action triggers any of the above changes, naturally incorporate the associated content into your response. DO NOT simply output the content verbatim.

For FLOW TRANSITIONS:
- Acknowledge the player's action first
- Describe the natural consequence/reaction 
- Smoothly weave in the flow content
- Make it feel like one coherent narrative

For STORY ENDINGS:
- Acknowledge the player's action that completes the story
- Naturally incorporate the ending content as the culmination
- Let the ending feel like a natural conclusion to your response

GOAL: Create seamless narrative experiences where pre-written content enhances rather than replaces contextual responses.`);
    }

    return sections.join('\n');
  }

  /**
   * Get items relevant to current context (location + inventory scoped)
   */
  private getRelevantItems(story: any, currentLocation: any, gameState: any): any[] {
    const inventoryIds = new Set(gameState.inventory || []);
    
    return story.items?.filter((item: any) => {
      // Current location items
      if (item.location === currentLocation?.id) return true;
      
      // Discoverable in current location  
      if (item.discoverable_in === currentLocation?.id) return true;
      
      // In inventory
      if (inventoryIds.has(item.id)) return true;
      
      // Transformation relationships with inventory items
      if (item.can_become && inventoryIds.has(item.id)) return true;
      if (item.created_from && inventoryIds.has(item.created_from)) return true;
      
      return false;
    }) || [];
  }

  /**
   * Generate detailed location context with expanded current location view
   */
  private getLocationContext(story: any, currentLocation: any, gameState: any): string {
    if (!story.locations || story.locations.length === 0) {
      return 'LOCATIONS: None defined';
    }

    const sections: string[] = [];
    const otherLocations: any[] = [];
    const relevantItems = this.getRelevantItems(story, currentLocation, gameState);

    // Process current location with full details
    if (currentLocation) {
      sections.push('CURRENT LOCATION:');
      sections.push(`${currentLocation.name} (${currentLocation.id}) | ${formatKeyValue('Exits', currentLocation.connections)}`);
      
      // Add full description if available
      if (currentLocation.description) {
        sections.push('');
        sections.push(`Description: ${currentLocation.description}`);
      }
      
      // Add detailed object descriptions using item lookups
      if (currentLocation.objects && currentLocation.objects.length > 0) {
        sections.push('');
        sections.push('Objects:');
        currentLocation.objects.forEach((objId: string) => {
          // Look up object in relevant items
          const item = relevantItems.find(item => item.id === objId);
          if (item) {
            let objectLine = `  • ${item.name}: ${item.description}`;
            
            // Add aliases if available
            if (item.aliases && item.aliases.length > 0) {
              objectLine += ` [aliases: ${item.aliases.join(', ')}]`;
            }
            
            // Add transformation info if available
            if (item.can_become) {
              objectLine += ` [can become: ${item.can_become}]`;
            }
            
            sections.push(objectLine);
          } else {
            // Emergent object - let LLM handle it
            sections.push(`  • ${objId}: [No description - describe based on context and story needs]`);
          }
        });
      }
      
      // Add discoverable items for this location
      const discoverableHere = relevantItems.filter((item: any) => item.discoverable_in === currentLocation.id);
      if (discoverableHere.length > 0) {
        sections.push('');
        const discoverableList = discoverableHere.map((item: any) => {
          const searchObjects = formatList(item.discovery_objects, { separator: '/', fallback: 'any' });
          return `${item.name} (search: ${searchObjects})`;
        }).join(', ');
        sections.push(`Discoverable Items: ${discoverableList}`);
      }
      
      // Collect other locations for summary
      story.locations.forEach((loc: any) => {
        if (loc.id !== currentLocation.id) {
          otherLocations.push(loc);
        }
      });
    } else {
      // If no current location, show all locations normally
      otherLocations.push(...story.locations);
    }

    // Add other locations in compact format
    if (otherLocations.length > 0) {
      sections.push('');
      sections.push('OTHER LOCATIONS:');
      otherLocations.forEach((loc: any) => {
        let info = `${loc.name} (${loc.id})`;
        
        // Add exits
        if (loc.connections && loc.connections.length > 0) {
          info += ` | ${formatKeyValue('Exits', loc.connections)}`;
        }
        
        // Add items summary using scoped items
        const itemsHere = relevantItems.filter((item: any) => item.location === loc.id);
        if (itemsHere.length > 0) {
          info += ` | ${formatKeyValue('Items', itemsHere.map((item: any) => item.name))}`;
        }
        
        // Add discoverable items summary using scoped items
        const discoverableHere = relevantItems.filter((item: any) => item.discoverable_in === loc.id);
        if (discoverableHere.length > 0) {
          const discoverableList = discoverableHere.map((item: any) => {
            const searchObjects = formatList(item.discovery_objects, { separator: '/', fallback: 'any' });
            return `${item.name} (search: ${searchObjects})`;
          });
          info += ` | ${formatKeyValue('Discoverable', discoverableList)}`;
        }
        
        sections.push(info);
      });
    }

    return sections.join('\n');
  }

  /**
   * Generate inventory and transformation context using scoped items
   */
  private getInventoryAndTransformations(story: any, gameState: any): string {
    const inventoryIds = new Set(gameState.inventory || []);
    const sections: string[] = [];
    
    // Get all items that have transformation relationships or are in inventory
    const relevantItems = story.items?.filter((item: any) => {
      return inventoryIds.has(item.id) || 
             item.can_become || 
             item.created_from ||
             (item.can_become && inventoryIds.has(item.id));
    }) || [];
    
    // Show inventory items with full details
    const inventoryItems = relevantItems.filter((item: any) => inventoryIds.has(item.id));
    if (inventoryItems.length > 0) {
      sections.push('INVENTORY ITEMS:');
      inventoryItems.forEach((item: any) => {
        let itemLine = `${item.name} (${item.id})`;
        
        if (item.description) {
          itemLine += ` - ${item.description}`;
        }
        
        if (item.aliases && item.aliases.length > 0) {
          itemLine += ` | ${formatAliases(item.aliases)}`;
        }
        
        if (item.can_become) {
          itemLine += ` | can become: ${item.can_become}`;
        }
        
        sections.push(itemLine);
      });
    }
    
    // Show transformation relationships
    const transformableItems = relevantItems.filter((item: any) => 
      item.can_become || item.created_from
    );
    
    if (transformableItems.length > 0) {
      sections.push('');
      sections.push('ITEM TRANSFORMATIONS:');
      transformableItems.forEach((item: any) => {
        if (item.can_become) {
          sections.push(`${item.name} → ${item.can_become}`);
        }
        if (item.created_from) {
          sections.push(`${item.created_from} → ${item.name}`);
        }
      });
    }
    
    return sections.join('\n');
  }
}