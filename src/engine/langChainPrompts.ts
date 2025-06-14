/**
 * LangChain Prompt Templates for Scene Transitions
 * 
 * Specialized prompts for action processing and scene transition rendering
 */

import { DirectorContext } from '@/types/impressionistStory';

export class LangChainPrompts {

  /**
   * Build comprehensive context preamble for all scenarios
   */
  static buildContextPreamble(context: DirectorContext): string {
    let prompt = `ROLE: You are the **Game Director** for an interactive text-based story. Your primary goal is to **narrate the story and manage its progression** based on player actions and predefined game logic.\n\n`;

    // Story context
    if (context.storyContext) {
      prompt += `STORY CONTEXT:\n${context.storyContext}\n\n`;
    }

    // Global guidance
    if (context.guidance) {
      prompt += `GLOBAL STORY GUIDANCE:\n${context.guidance}\n\n`;
    }

    // Narrative Style
    if (context.narrative) {
      const parts = [];
      if (context.narrative.voice) parts.push(`  Voice: ${context.narrative.voice}`);
      if (context.narrative.tone) parts.push(`  Tone: ${context.narrative.tone}`);
      if (context.narrative.themes) {
        parts.push(`  Themes: ${context.narrative.themes.join(', ')}`);
      }

      if (parts.length > 0) {
        prompt += `NARRATIVE STYLE:\n${parts.join('\n')}\n\n`;
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
        let playerInfo = `    ${playerCharacter.name} (PLAYER CHARACTER)`;
        if (playerCharacter.sketch) playerInfo += ` - ${playerCharacter.sketch}`;
        if (playerCharacter.voice) playerInfo += `\n      Voice: ${playerCharacter.voice}`;
        if (playerCharacter.arc) playerInfo += `\n      Arc: ${playerCharacter.arc}`;
        characterSections.push(`  PLAYER CHARACTER:\n${playerInfo}`);
      }
      
      // NPCs section
      if (npcs.length > 0) {
        const npcDetails = npcs.map(c => {
          let charInfo = `    ${c.name} (NPC)`;
          if (c.sketch) charInfo += ` - ${c.sketch}`;
          if (c.voice) charInfo += `\n      Voice: ${c.voice}`;
          if (c.arc) charInfo += `\n      Arc: ${c.arc}`;
          return charInfo;
        }).join('\n');
        characterSections.push(`  NON-PLAYER CHARACTERS (NPCs):\n${npcDetails}`);
      }
      
      worldParts.push(...characterSections);
    }

    // Location context
    if (context.location) {
      let locationContext = `    ${context.location.name}`;
      if (context.location.sketch) {
        locationContext += ` - ${context.location.sketch}`;
      }
      if (context.location.atmosphere && context.location.atmosphere.length > 0) {
        locationContext += `\n      Atmosphere: ${context.location.atmosphere.slice(0, 5).join(', ')}`;
      }
      if (context.location.contains && context.location.contains.length > 0) {
        locationContext += `\n      Contains: ${context.location.contains.slice(0, 5).join(', ')}`;
      }
      if (context.location.guidance) {
        locationContext += `\n      Guidance: ${context.location.guidance}`;
      }
      worldParts.push(`  LOCATIONS:\n${locationContext}`);
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
      prompt += `WORLD ELEMENTS:\n${worldParts.join('\n\n')}\n\n`;
    }

    // Current scene
    if (context.currentSketch) {
      prompt += `CURRENT SCENE DESCRIPTION:\n${context.currentSketch}\n\n`;
    }

    // Scene-specific guidance
    if (context.sceneGuidance) {
      prompt += `CURRENT SCENE DIRECTIVES:\n${context.sceneGuidance}\n\n`;
    }

    // Available transitions
    if (context.currentTransitions && Object.keys(context.currentTransitions).length > 0) {
      prompt += `SCENE TRANSITION RULES:\n`;
      Object.entries(context.currentTransitions).forEach(([sceneId, data]) => {
        prompt += `  - ${sceneId}: REQUIRES ${data.condition}\n`;
      });
      prompt += '\n';
    }

    // Recent interactions
    if (context.recentInteractions && context.recentInteractions.length > 0) {
      const recentDialogue = context.recentInteractions
        .slice(-5) // Limit for action processing
        .flatMap(interaction => [
          `Player: ${interaction.playerInput}`,
          `Response: ${interaction.llmResponse}`
        ]);

      prompt += `RECENT DIALOGUE:\n${recentDialogue.join('\n')}\n\n`;
    }

    // Recent memory
    if (context.activeMemory && context.activeMemory.length > 0) {
      prompt += `KEY MEMORIES:\n${context.activeMemory.join('\n')}\n\n`;
    }

    // ENDING LOGIC (critical for story completion)
    if (context.availableEndings && context.availableEndings.variations.length > 0) {
      if (context.availableEndings.when) {
        const globalConditions = Array.isArray(context.availableEndings.when)
          ? context.availableEndings.when.join(' AND ')
          : context.availableEndings.when;
        prompt += `STORY ENDING CONDITIONS (at least one must be met for ANY ending to be possible):\n${globalConditions}\n\n`;
      }

      prompt += `AVAILABLE ENDING VARIATIONS:\n`;
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
        prompt += `  - ${ending.id}: REQUIRES ${conditionText}\n`;
      });

    }

    return prompt;
  }

  /**
   * Generate mode-specific instructions for action processing
   */
  static buildActionInstructions(playerInput: string, context: DirectorContext): string {
    let instructions = '';

    // Post-ending context if story is complete
    if (context.storyComplete) {
      instructions += `STORY COMPLETION CONTEXT:
This story has ended and the player is now reflecting, asking questions, or exploring what happened.
Respond thoughtfully to help them understand, reflect on, or explore the story they experienced.
You can answer questions, provide insights, discuss themes, explore "what if" scenarios, or clarify plot points.
Since the story is complete, do NOT use any transition signals.

`;
    }

    instructions += `PLAYER ACTION: "${playerInput}"

TRIGGER EVALUATION STEPS (CRITICAL - Document this process in your reasoning field):
1. **Scene Transition Check:**
   - Review 'SCENE TRANSITION RULES' above.
   - Check if the current player action meets any transition requirement.
   - If YES, identify the target scene ID.
   - If NO, proceed to Ending Check.
2. **Story Ending Check:**
   - First, verify if the current action ("${playerInput}") meets any 'STORY ENDING CONDITIONS'. (YES/NO)
   - If YES, for each 'AVAILABLE ENDING VARIATIONS', check if ALL parts of its condition are satisfied:
     * Look at KEY MEMORIES and RECENT DIALOGUE for past actions/state
     * Check if current action completes the final requirement
     * Conditions use simple AND logic - ALL parts must be true
   - If an ending's conditions are fully met, identify its ending ID.
   - If NO conditions are met, proceed to next step.
3. **Signal Output:**
   - If a Scene Transition was triggered in step 1, include "scene": "target_scene_id" in your signals.
   - If a Story Ending was triggered in step 2, include "ending": "ending_id" in your signals.
   - Prioritize ending over scene transition if both could apply.
   - Document your condition checking in the reasoning field.

${this.getCoreResponseGuidelines()}

${this.getStructuredResponseInstructions()}`;

    return instructions;
  }

  /**
   * Generate mode-specific instructions for scene transitions
   */
  static buildTransitionInstructions(targetSceneId: string, sceneSketch: string, transitionContext: string): string {
    return `SCENE TRANSITION IN PROGRESS

You are transitioning to scene: ${targetSceneId}

TARGET SCENE DESCRIPTION (use as foundation):
${sceneSketch}

PREVIOUS ACTION RESPONSE (this has already been shown to the player):
${transitionContext}

SCENE TRANSITION DIRECTIVES:
- DO NOT repeat the previous response - provide ONLY new content that continues from where it left off
- Use the scene description as your foundation - expand it with rich atmospheric details
- Smoothly flow from the previous action's immediate result to establishing this new scene
- Establish the new environment, mood, and any characters present
- Focus on sensory details and atmosphere that weren't covered in the action response
- This is scene establishment continuing from the action, not a separate narrative
- Maintain the story's narrative voice and tone throughout
- KEEP RESPONSE CONCISE: 50-150 words maximum, 1-3 paragraphs
- Record important details about the new scene or transition as memories
- Rate the importance of this transition (typically 6-8 for scene changes)

${this.getStructuredResponseInstructions()}`;
  }

  /**
   * Generate mode-specific instructions for ending transitions
   */
  static buildEndingInstructions(endingId: string, endingSketch: string, transitionContext: string): string {
    return `STORY ENDING IN PROGRESS

You are concluding the story with ending: ${endingId}

ENDING DESCRIPTION (use as foundation):
${endingSketch}

PREVIOUS ACTION RESPONSE (this has already been shown to the player):
${transitionContext}

STORY ENDING DIRECTIVES:
- DO NOT repeat the previous response - provide ONLY new content that continues from where it left off
- Use the ending description as your foundation - expand it with rich, conclusive details
- Smoothly flow from the previous action's immediate result to this story conclusion
- Provide emotional closure and resolution appropriate to the story's themes
- Focus on the significance and meaning of this ending that wasn't covered in the action response
- This should feel like a natural continuation that brings the story to a satisfying conclusion
- Maintain the story's narrative voice and tone throughout
- KEEP RESPONSE CONCISE: 150-250 words maximum, 1-3 paragraphs
- Record key conclusion details or emotional beats as memories
- Rate the importance of this ending (typically 8-10 for story endings)
- Include ending signal in your response

${this.getStructuredResponseInstructions()}`;
  }

  /**
   * Generate mode-specific instructions for initial scene establishment
   */
  static buildInitialSceneInstructions(sceneId: string, sceneSketch: string): string {
    return `INITIAL SCENE ESTABLISHMENT

You are establishing the opening scene of the story: ${sceneId}

SCENE DESCRIPTION (use as foundation):
${sceneSketch}

INITIAL SCENE DIRECTIVES:
- Use the scene description as your foundation - expand it with rich atmospheric details
- Establish the setting, mood, and any characters present for the story opening
- Create an engaging, immersive introduction that draws the reader in
- Focus on sensory details and atmosphere to set the tone
- This should feel like a compelling story opening
- Maintain the story's narrative voice and tone throughout
- Do NOT include any player actions or responses - this is pure scene establishment
- KEEP RESPONSE CONCISE: 100-250 words maximum, 1-3 paragraphs
- Record key setting details or initial atmosphere as memories
- Rate the importance of this opening (typically 7-8 for initial scenes)

${this.getStructuredResponseInstructions()}`;
  }

  /**
   * Rich text formatting instructions for narrative responses
   */
  static getRichTextFormattingInstructions(): string {
    return `
FORMATTING INSTRUCTIONS:
- Use **bold text** for emphasis and important elements
- Use *italic text* for thoughts, whispers, or subtle emphasis
- Use character names in **bold** when they speak or are introduced
- Use item names in *italics* when they're significant to the scene
- Break longer responses into paragraphs for readability
- Use atmospheric details and sensory descriptions
- Maintain consistent narrative voice and tone throughout`;
  }

  /**
   * Core response guidelines for action processing
   */
  static getCoreResponseGuidelines(): string {
    return `TASK:
- FIRST: Think through the player's action and the transition/ending conditions step-by-step
- Process the player's action and provide a narrative response based on the current scene and context
- Implement the 'TRIGGER EVALUATION STEPS' above to check for scene transitions and story endings
- Do NOT describe any transition or ending process in the narrative itself – just the immediate result of the action
- Keep the narrative response focused on the action's immediate consequences and the current scene
- Rate the significance of this interaction (1-10, default 5)

RESPONSE GUIDELINES:
- Adhere to the global and scene directives given by the story author
- End your response in a way that invites further player action (except for story endings)
- VARIETY: Vary sentence structure, descriptive details, and phrasing between responses
- Avoid repetitive patterns or formulaic descriptions

CRITICAL INTERACTIVE FICTION RULES:
- The PLAYER CHARACTER (marked above) is controlled exclusively by the player
- NEVER put words in the player character's mouth or make them speak without explicit player input
- NEVER have the player character perform actions they didn't request
- All NON-PLAYER CHARACTERS (NPCs) are controlled by you - let them speak and act naturally
- If an NPC is spoken to or addressed, they MUST reply as part of your response
- If dialogue is initiated, let NPCs respond but wait for the player's next input before continuing
- The player should feel complete agency over their character's words and actions at all times
- Maintain clear separation: Player controls the PLAYER CHARACTER, you control all NPCs`;
  }

  /**
   * Instructions for structured response (used with Zod schema)
   */
  static getStructuredResponseInstructions(): string {
    return `
${this.getRichTextFormattingInstructions()}

RESPONSE FORMAT:
- reasoning: Concise evaluation of player's action and interaction with transition conditions (2-3 sentences max)
- narrative: Your narrative response with rich formatting
- memories: Array of important details to remember: discoveries, changes to the world, or new knowledge the player has gained
- importance: Rate the significance of this interaction (1-10, default 5)
- signals: Include scene transitions or endings as needed`;
  }
}