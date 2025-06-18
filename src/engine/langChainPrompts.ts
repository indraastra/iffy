/**
 * LangChain Prompt Templates for Scene Transitions
 * 
 * Specialized prompts for action processing and scene transition rendering
 */

import { DirectorContext } from '@/types/impressionistStory';

export class LangChainPrompts {

  /**
   * Build context preamble for action processing (excludes transitions/endings)
   * Reorganized for optimal caching with static content first
   */
  static buildActionContextPreamble(context: DirectorContext): string {
    // STATIC/SEMI-STATIC PREFIX - Content that remains stable for the story/scene duration
    // This organization benefits Gemini's automatic context caching and Anthropic's prompt caching
    let prompt = `**ROLE:** You are the **Game Director** for an interactive text-based story. Your primary goal is to **narrate the story** based on player actions.\n\n`;

    // Story context (static for story duration)
    if (context.storyContext) {
      prompt += `**STORY CONTEXT:**\n${context.storyContext}\n\n`;
    }

    // Global guidance (static for story duration)
    if (context.guidance) {
      prompt += `**GLOBAL STORY GUIDANCE:**\n${context.guidance}\n\n`;
    }

    // Narrative Style (static for story duration)
    if (context.narrative) {
      const parts = [];
      if (context.narrative.voice) parts.push(`* Voice: ${context.narrative.voice}`);
      if (context.narrative.tone) parts.push(`* Tone: ${context.narrative.tone}`);
      if (context.narrative.themes) {
        parts.push(`* Themes: ${context.narrative.themes.join(', ')}`);
      }

      if (parts.length > 0) {
        prompt += `**NARRATIVE STYLE:**\n${parts.join('\n')}\n\n`;
      }
    }

    // World Elements (relatively static)
    const worldParts = [];

    // Characters with full details - separate player character from NPCs
    if (context.activeCharacters && context.activeCharacters.length > 0) {
      const playerCharacter = context.activeCharacters.find(c => c.id === 'player');
      const npcs = context.activeCharacters.filter(c => c.id !== 'player');
      
      const characterSections = [];
      
      // Player character section
      if (playerCharacter) {
        let playerInfo = `  * ${playerCharacter.name} (PLAYER CHARACTER)`;
        if (playerCharacter.sketch) playerInfo += ` - ${playerCharacter.sketch}`;
        if (playerCharacter.voice) playerInfo += `\n    * Voice: ${playerCharacter.voice}`;
        if (playerCharacter.arc) playerInfo += `\n    * Arc: ${playerCharacter.arc}`;
        characterSections.push(`**PLAYER CHARACTER:**\n${playerInfo}`);
      }
      
      // NPCs section
      if (npcs.length > 0) {
        const npcDetails = npcs.map(c => {
          let charInfo = `  * ${c.name} (NPC)`;
          if (c.sketch) charInfo += ` - ${c.sketch}`;
          if (c.voice) charInfo += `\n    * Voice: ${c.voice}`;
          if (c.arc) charInfo += `\n    * Arc: ${c.arc}`;
          return charInfo;
        }).join('\n');
        characterSections.push(`**NON-PLAYER CHARACTERS (NPCs):**\n${npcDetails}`);
      }
      
      worldParts.push(...characterSections);
    }

    // Location context (static for scene duration)
    if (context.location) {
      let locationContext = `  * ${context.location.name}`;
      if (context.location.sketch) {
        locationContext += ` - ${context.location.sketch}`;
      }
      if (context.location.atmosphere && context.location.atmosphere.length > 0) {
        locationContext += `\n    * Atmosphere: ${context.location.atmosphere.slice(0, 5).join(', ')}`;
      }
      if (context.location.contains && context.location.contains.length > 0) {
        locationContext += `\n    * Contains: ${context.location.contains.slice(0, 5).join(', ')}`;
      }
      if (context.location.guidance) {
        locationContext += `\n    * Guidance: ${context.location.guidance}`;
      }
      worldParts.push(`**LOCATIONS:**\n${locationContext}`);
    }

    // Items with full details and descriptions (static for story duration)
    if (context.discoverableItems && context.discoverableItems.length > 0) {
      const itemDetails = context.discoverableItems.map(item => {
        let itemInfo = `  * ${item.name}`;
        if (item.sketch) itemInfo += `: ${item.sketch}`;
        if (item.reveals) itemInfo += `\n    * Reveals: ${item.reveals}`;
        return itemInfo;
      }).join('\n');
      worldParts.push(`**ITEMS:**\n${itemDetails}`);
    }

    if (worldParts.length > 0) {
      prompt += `**WORLD ELEMENTS:**\n${worldParts.join('\n\n')}\n\n`;
    }

    // Current scene (semi-static - stable for scene duration)
    if (context.currentSketch) {
      prompt += `**CURRENT SCENE DESCRIPTION:**\n${context.currentSketch}\n\n`;
    }

    // Scene-specific guidance (semi-static - stable for scene duration)
    if (context.sceneGuidance) {
      prompt += `**CURRENT SCENE DIRECTIVES:**\n${context.sceneGuidance}\n\n`;
    }

    // DYNAMIC CONTENT - Changes frequently during gameplay
    // Recent interactions (dynamic - changes with every player action)
    if (context.recentInteractions && context.recentInteractions.length > 0) {
      const recentDialogue = context.recentInteractions
        .slice(-5)
        .flatMap(interaction => [
          `Player: ${interaction.playerInput}`,
          `Response: ${interaction.llmResponse}`
        ]);

      prompt += `**RECENT DIALOGUE:**\n${recentDialogue.join('\n')}\n\n`;
    }

    // Recent memory (dynamic - changes during gameplay)
    if (context.activeMemory && context.activeMemory.length > 0) {
      prompt += `**KEY MEMORIES:**\n${context.activeMemory.join('\n')}\n\n`;
    }

    return prompt;
  }

  /**
   * Build comprehensive context preamble for transition/ending scenarios
   * Reorganized for optimal caching with static content first
   */
  static buildContextPreamble(context: DirectorContext): string {
    // STATIC/SEMI-STATIC PREFIX - Content that remains stable for the story/scene duration
    // This organization benefits Gemini's automatic context caching and Anthropic's prompt caching
    let prompt = `**ROLE:** You are the **Game Director** for an interactive text-based story. Your primary goal is to **narrate the story and manage its progression** based on player actions and predefined game logic.\n\n`;

    // Story context (static for story duration)
    if (context.storyContext) {
      prompt += `**STORY CONTEXT:**\n${context.storyContext}\n\n`;
    }

    // Global guidance (static for story duration)
    if (context.guidance) {
      prompt += `**GLOBAL STORY GUIDANCE:**\n${context.guidance}\n\n`;
    }

    // Narrative Style (static for story duration)
    if (context.narrative) {
      const parts = [];
      if (context.narrative.voice) parts.push(`* Voice: ${context.narrative.voice}`);
      if (context.narrative.tone) parts.push(`* Tone: ${context.narrative.tone}`);
      if (context.narrative.themes) {
        parts.push(`* Themes: ${context.narrative.themes.join(', ')}`);
      }

      if (parts.length > 0) {
        prompt += `**NARRATIVE STYLE:**\n${parts.join('\n')}\n\n`;
      }
    }

    // World Elements
    const worldParts = [];

    // Characters with full details - separate player character from NPCs
    if (context.activeCharacters && context.activeCharacters.length > 0) {
      const playerCharacter = context.activeCharacters.find(c => c.id === 'player');
      const npcs = context.activeCharacters.filter(c => c.id !== 'player');
      
      const characterSections = [];
      
      // Player character section
      if (playerCharacter) {
        let playerInfo = `  * ${playerCharacter.name} (PLAYER CHARACTER)`;
        if (playerCharacter.sketch) playerInfo += ` - ${playerCharacter.sketch}`;
        if (playerCharacter.voice) playerInfo += `\n    * Voice: ${playerCharacter.voice}`;
        if (playerCharacter.arc) playerInfo += `\n    * Arc: ${playerCharacter.arc}`;
        characterSections.push(`**PLAYER CHARACTER:**\n${playerInfo}`);
      }
      
      // NPCs section
      if (npcs.length > 0) {
        const npcDetails = npcs.map(c => {
          let charInfo = `  * ${c.name} (NPC)`;
          if (c.sketch) charInfo += ` - ${c.sketch}`;
          if (c.voice) charInfo += `\n    * Voice: ${c.voice}`;
          if (c.arc) charInfo += `\n    * Arc: ${c.arc}`;
          return charInfo;
        }).join('\n');
        characterSections.push(`**NON-PLAYER CHARACTERS (NPCs):**\n${npcDetails}`);
      }
      
      worldParts.push(...characterSections);
    }

    // Location context
    if (context.location) {
      let locationContext = `  * ${context.location.name}`;
      if (context.location.sketch) {
        locationContext += ` - ${context.location.sketch}`;
      }
      if (context.location.atmosphere && context.location.atmosphere.length > 0) {
        locationContext += `\n    * Atmosphere: ${context.location.atmosphere.slice(0, 5).join(', ')}`;
      }
      if (context.location.contains && context.location.contains.length > 0) {
        locationContext += `\n    * Contains: ${context.location.contains.slice(0, 5).join(', ')}`;
      }
      if (context.location.guidance) {
        locationContext += `\n    * Guidance: ${context.location.guidance}`;
      }
      worldParts.push(`**LOCATIONS:**\n${locationContext}`);
    }

    // Items with full details and descriptions
    if (context.discoverableItems && context.discoverableItems.length > 0) {
      const itemDetails = context.discoverableItems.map(item => {
        let itemInfo = `  * ${item.name}`;
        if (item.sketch) itemInfo += `: ${item.sketch}`;
        if (item.reveals) itemInfo += `\n    * Reveals: ${item.reveals}`;
        return itemInfo;
      }).join('\n');
      worldParts.push(`**ITEMS:**\n${itemDetails}`);
    }

    if (worldParts.length > 0) {
      prompt += `**WORLD ELEMENTS:**\n${worldParts.join('\n\n')}\n\n`;
    }

    // Current scene
    if (context.currentSketch) {
      prompt += `**CURRENT SCENE DESCRIPTION:**\n${context.currentSketch}\n\n`;
    }

    // Scene-specific guidance
    if (context.sceneGuidance) {
      prompt += `**CURRENT SCENE DIRECTIVES:**\n${context.sceneGuidance}\n\n`;
    }

    // Available transitions (semi-static - stable for scene duration)
    if (context.currentTransitions && Object.keys(context.currentTransitions).length > 0) {
      prompt += `**SCENE TRANSITION RULES:**\n`;
      Object.entries(context.currentTransitions).forEach(([sceneId, data]) => {
        prompt += `* ${sceneId}: REQUIRES ${data.condition}\n`;
      });
      prompt += '\n';
    }

    // ENDING LOGIC (semi-static - stable for story duration)
    if (context.availableEndings && context.availableEndings.variations.length > 0) {
      if (context.availableEndings.when) {
        const globalConditions = Array.isArray(context.availableEndings.when)
          ? context.availableEndings.when.join(' AND ')
          : context.availableEndings.when;
        prompt += `**STORY ENDING CONDITIONS** (at least one must be met for ANY ending to be possible):\n${globalConditions}\n\n`;
      }

      prompt += `**AVAILABLE ENDING VARIATIONS:**\n`;
      context.availableEndings.variations.forEach(ending => {
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
        prompt += `* ${ending.id}: REQUIRES ${conditionText}\n`;
      });
      prompt += '\n';
    }

    // DYNAMIC CONTENT - Changes frequently during gameplay
    // Recent interactions (dynamic - changes with every player action)
    if (context.recentInteractions && context.recentInteractions.length > 0) {
      const recentDialogue = context.recentInteractions
        .slice(-5) // Limit for action processing
        .flatMap(interaction => [
          `Player: ${interaction.playerInput}`,
          `Response: ${interaction.llmResponse}`
        ]);

      prompt += `**RECENT DIALOGUE:**\n${recentDialogue.join('\n')}\n\n`;
    }

    // Recent memory (dynamic - changes during gameplay)
    if (context.activeMemory && context.activeMemory.length > 0) {
      prompt += `**KEY MEMORIES:**\n${context.activeMemory.join('\n')}\n\n`;
    }

    return prompt;
  }

  /**
   * Generate instructions for action processing (no classification logic)
   * Organized for optimal caching with static content first
   */
  static buildActionInstructions(playerInput: string, context: DirectorContext): string {
    // STATIC PREFIX - Core response guidelines that remain constant
    let instructions = `${this.getCoreResponseGuidelines()}

${this.getStructuredResponseInstructions()}`;
    
    // DYNAMIC CONTENT - Changes based on story state and player input
    // Post-ending context if story is complete (dynamic - only appears when story ends)
    if (context.storyComplete) {
      instructions = `**STORY COMPLETION CONTEXT:**
This story has ended and the player is now reflecting, asking questions, or exploring what happened.
Respond thoughtfully to help them understand, reflect on, or explore the story they experienced.
You can answer questions, provide insights, discuss themes, explore "what if" scenarios, or clarify plot points.
Since the story is complete, do NOT use any transition signals.

${instructions}`;
    }

    // Player input - always dynamic
    instructions = `**PLAYER ACTION:** "${playerInput}"

${instructions}`;

    return instructions;
  }

  /**
   * Generate mode-specific instructions for scene transitions
   * Organized for optimal caching with static content first
   */
  static buildTransitionInstructions(targetSceneId: string, sceneSketch: string, playerAction: string): string {
    // STATIC PREFIX - Transition directives that remain constant
    let instructions = `**SCENE TRANSITION DIRECTIVES:**
* Incorporate the player's action into the transition narrative
* Show how the player's action leads to or causes the scene change
* Use the scene description as your foundation - expand it with rich atmospheric details
* Establish the new environment, mood, and any characters present
* Focus on sensory details and atmosphere
* Maintain the story's narrative voice and tone throughout
* KEEP RESPONSE CONCISE: 100-200 words maximum, 2-4 paragraphs
* Record important details about the new scene or transition as memories
* Rate the importance of this transition (typically 6-8 for scene changes)

${this.getStructuredResponseInstructions()}`;
    
    // DYNAMIC CONTENT - Changes per transition
    return `**SCENE TRANSITION IN PROGRESS**

You are transitioning to scene: ${targetSceneId}

**PLAYER ACTION THAT TRIGGERED THIS TRANSITION:** "${playerAction}"

**TARGET SCENE DESCRIPTION** (use as foundation):
${sceneSketch}

${instructions}`;
  }

  /**
   * Generate mode-specific instructions for ending transitions
   * Organized for optimal caching with static content first
   */
  static buildEndingInstructions(endingId: string, endingSketch: string, playerAction: string): string {
    // STATIC PREFIX - Ending directives that remain constant
    let instructions = `**STORY ENDING DIRECTIVES:**
* Incorporate the player's action into the ending narrative
* Show how the player's action leads to or reveals this ending
* Use the ending description as your foundation - expand it with rich, conclusive details
* Provide emotional closure and resolution appropriate to the story's themes
* Focus on the significance and meaning of this ending
* This should feel like a natural progression from the player's action to story conclusion
* Maintain the story's narrative voice and tone throughout
* KEEP RESPONSE CONCISE: 150-250 words maximum, 2-4 paragraphs
* Record key conclusion details or emotional beats as memories
* Rate the importance of this ending (typically 8-10 for story endings)
* Include ending signal in your response

${this.getStructuredResponseInstructions()}`;
    
    // DYNAMIC CONTENT - Changes per ending
    return `**STORY ENDING IN PROGRESS**

You are concluding the story with ending: ${endingId}

**PLAYER ACTION THAT TRIGGERED THIS ENDING:** "${playerAction}"

**ENDING DESCRIPTION** (use as foundation):
${endingSketch}

${instructions}`;
  }

  /**
   * Generate mode-specific instructions for initial scene establishment
   * Organized for optimal caching with static content first
   */
  static buildInitialSceneInstructions(sceneId: string, sceneSketch: string): string {
    // STATIC PREFIX - Initial scene directives that remain constant
    let instructions = `**INITIAL SCENE DIRECTIVES:**
* Use the scene description as your foundation - expand it with rich atmospheric details
* Establish the setting, mood, and any characters present for the story opening
* Create an engaging, immersive introduction that draws the reader in
* Focus on sensory details and atmosphere to set the tone
* This should feel like a compelling story opening
* Maintain the story's narrative voice and tone throughout
* Do NOT include any player actions or responses - this is pure scene establishment
* KEEP RESPONSE CONCISE: 100-250 words maximum, 1-3 paragraphs
* Record key setting details or initial atmosphere as memories
* Rate the importance of this opening (typically 7-8 for initial scenes)

${this.getStructuredResponseInstructions()}`;
    
    // DYNAMIC CONTENT - Changes per scene
    return `**INITIAL SCENE ESTABLISHMENT**

You are establishing the opening scene of the story: ${sceneId}

**SCENE DESCRIPTION** (use as foundation):
${sceneSketch}

${instructions}`;
  }

  /**
   * Rich text formatting instructions for narrative responses
   */
  static getRichTextFormattingInstructions(): string {
    return `
**FORMATTING INSTRUCTIONS:**
* Use **bold text** for emphasis and important elements
* Use *italic text* for thoughts, whispers, or subtle emphasis
* Use character names in **bold** when they speak or are introduced
* Use item names in *italics* when they're significant to the scene
* Break longer responses into paragraphs for readability
* Use atmospheric details and sensory descriptions
* Maintain consistent narrative voice and tone throughout`;
  }

  /**
   * Core response guidelines for action processing
   * These are static and benefit from caching
   */
  static getCoreResponseGuidelines(): string {
    return `**TASK:**
* Process ONLY the player's exact action - do not take additional actions on their behalf
* Focus purely on narrative response - transitions/endings are handled separately
* Keep responses focused and well-structured for interactive fiction pacing
* Rate the significance of this interaction (1-10, default 5)

**RESPONSE GUIDELINES:**
* Incorporate the player's action naturally into your response, showing its immediate effects
* Adhere to the global and scene directives given by the story author  
* Advance the narrative based on how the scene, world, or characters react to the action
* End with meaningful opportunities for player interaction - avoid passive waiting states
* Give the player something significant they can say or do based on where your response leaves off
* FORMATTING: Break longer responses into paragraphs - use paragraph breaks for anything longer than 3 sentences
* VARIETY: Vary sentence structure, descriptive details, and phrasing between responses
* Avoid repetitive patterns or formulaic descriptions

**CRITICAL INTERACTIVE FICTION RULES:**
* Player controls PLAYER CHARACTER exclusively - never make them speak or act beyond their input
* You control all NPCs - let them respond naturally to player actions
* Process only the player's exact action (e.g., "examine door" ≠ "open door")`;
  }

  /**
   * Instructions for structured response (used with Zod schema)
   * These are static and benefit from caching
   */
  static getStructuredResponseInstructions(): string {
    return `
${this.getRichTextFormattingInstructions()}

**RESPONSE FORMAT:**
* reasoning: Concise evaluation of player's action and its immediate effects (2-3 sentences max)
* narrative: Your narrative response with rich formatting
* memories: Array of important details to remember: discoveries, changes to the world, or new knowledge the player has gained
* importance: Rate the significance of this interaction (1-10, default 5)
* signals: Leave empty {} for action responses - transitions handled separately`;
  }
}