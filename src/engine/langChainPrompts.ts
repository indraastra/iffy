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
    let prompt = '';

    // Story context
    if (context.storyContext) {
      prompt += `STORY CONTEXT:\n${context.storyContext}\n\n`;
    }

    // Global guidance
    if (context.guidance) {
      prompt += `GLOBAL STORY INSTRUCTIONS:\n${context.guidance}\n\n`;
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
      prompt += `CURRENT SCENE SKETCH:\n${context.currentSketch}\n\n`;
    }

    // Scene-specific guidance
    if (context.sceneGuidance) {
      prompt += `CURRENT SCENE INSTRUCTIONS:\n${context.sceneGuidance}\n\n`;
    }

    // Available transitions
    if (context.currentTransitions && Object.keys(context.currentTransitions).length > 0) {
      prompt += `POSSIBLE SCENE TRANSITIONS:\n`;
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
      
      prompt += `RECENT CONVERSATION:\n${recentDialogue.join('\n')}\n\n`;
    }

    // Recent memory
    if (context.activeMemory && context.activeMemory.length > 0) {
      prompt += `RECENT MEMORY:\n${context.activeMemory.join('\n')}\n\n`;
    }

    // ENDING LOGIC (critical for story completion)
    if (context.availableEndings && context.availableEndings.variations.length > 0) {
      if (context.availableEndings.when) {
        const globalConditions = Array.isArray(context.availableEndings.when) 
          ? context.availableEndings.when.join(' AND ') 
          : context.availableEndings.when;
        prompt += `GLOBAL ENDING CONDITIONS (at least one must be met for ANY ending to be possible):\n${globalConditions}\n\n`;
      }
      
      prompt += `POSSIBLE ENDING VARIATIONS:\n`;
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
        prompt += `  - ${ending.id}:\n      SPECIFIC REQUIRES: ${conditionText}\n      SKETCH: ${ending.sketch}\n\n`;
      });

      prompt += `ENDING TRIGGER VERIFICATION (CRITICAL - Perform these checks in order):\n`;
      prompt += `1. Have ANY of the GLOBAL ENDING CONDITIONS been met? (YES/NO)\n`;
      prompt += `2. If YES to #1, check if the SPECIFIC REQUIRES for a particular ending variation have ALL been satisfied (YES/NO)\n`;
      prompt += `3. If both #1 and #2 are YES for an ending, trigger that ending. Otherwise, DO NOT trigger an ending and continue the current scene\n\n`;
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

RESPONSE INSTRUCTIONS:
- Adhere to the global and scene instructions given by the story author
- Process the player's action and provide narrative response
- Check if this action triggers any scene transitions based on the available transitions
- If a transition should occur, include "scene": "target_scene_id" in your signals
- Do NOT describe the transition itself - just the immediate result of the action
- Keep response focused on the action's immediate consequences

CRITICAL INTERACTIVE FICTION RULES:
- NEVER put words in the player's mouth or make them speak without explicit player input
- NEVER have the player perform actions they didn't request
- End your response in a way that invites further player action (except for story endings)
- Let other characters speak and act, but the player controls only their own character
- If an NPC is spoken to or addressed, they MUST reply as part of your response
- If dialogue is initiated, let NPCs respond but wait for the player's next input before continuing
- The player should feel agency over their character's words and actions at all times

${this.getStructuredResponseInstructions()}`;

    return instructions;
  }

  /**
   * Generate mode-specific instructions for scene transitions
   */
  static buildTransitionInstructions(targetSceneId: string, sceneSketch: string, transitionContext: string): string {
    return `SCENE TRANSITION IN PROGRESS

You are transitioning to scene: ${targetSceneId}

TARGET SCENE SKETCH (use as foundation):
${sceneSketch}

TRANSITION INSTRUCTIONS:
- Use the scene sketch as your foundation - expand it with rich atmospheric details
- Create a smooth transition from the previous action to this new scene
- Establish the new environment, mood, and any characters present
- Focus on sensory details and atmosphere rather than action
- This is scene establishment, not action processing
- Maintain the story's narrative voice and tone throughout
- KEEP RESPONSE CONCISE: 50-150 words maximum, 1-3 paragraphs
- Record important details about the new scene or transition as memories
- Rate the importance of this transition (typically 6-8 for scene changes)

Previous context: ${transitionContext}

${this.getStructuredResponseInstructions()}`;
  }

  /**
   * Generate mode-specific instructions for ending transitions
   */
  static buildEndingInstructions(endingId: string, endingSketch: string, transitionContext: string): string {
    return `STORY ENDING IN PROGRESS

You are concluding the story with ending: ${endingId}

ENDING SKETCH (use as foundation):
${endingSketch}

ENDING INSTRUCTIONS:
- Use the ending sketch as your foundation - expand it with rich, conclusive details
- Create a satisfying transition from the previous action to this story conclusion
- Provide emotional closure and resolution appropriate to the story's themes
- Focus on the significance and meaning of this ending
- This should feel like a natural, satisfying conclusion
- Maintain the story's narrative voice and tone throughout
- KEEP RESPONSE CONCISE: 150-250 words maximum, 1-3 paragraphs
- Record key conclusion details or emotional beats as memories
- Rate the importance of this ending (typically 8-10 for story endings)
- Include ending signal in your response

Previous context: ${transitionContext}

${this.getStructuredResponseInstructions()}`;
  }

  /**
   * Generate mode-specific instructions for initial scene establishment
   */
  static buildInitialSceneInstructions(sceneId: string, sceneSketch: string): string {
    return `INITIAL SCENE ESTABLISHMENT

You are establishing the opening scene of the story: ${sceneId}

SCENE SKETCH (use as foundation):
${sceneSketch}

INITIAL SCENE INSTRUCTIONS:
- Use the scene sketch as your foundation - expand it with rich atmospheric details
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
   * Instructions for structured response (used with Zod schema)
   */
  static getStructuredResponseInstructions(): string {
    return `
${this.getRichTextFormattingInstructions()}

RESPONSE FORMAT:
- narrative: Your narrative response with rich formatting
- memories: Array of important details to remember (optional)
- importance: Rate the significance of this interaction (1-10, default 5)
- signals: Include scene transitions, discoveries, or endings as needed`;
  }
}