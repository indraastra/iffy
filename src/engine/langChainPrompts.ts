/**
 * LangChain Prompt Templates for Scene Transitions
 * 
 * Specialized prompts for action processing and scene transition rendering
 */

import { DirectorContext } from '@/types/impressionistStory';
import type { FlagManager } from './FlagManager';

export class LangChainPrompts {

  /**
   * Build context preamble with FlagManager (preferred method)
   * Organized for optimal prefix caching: static content first, dynamic content last
   */
  static buildContextWithFlagManager(context: DirectorContext, flagManager: FlagManager): string {
    // Start with static preamble (cacheable)
    const progressionGuidance = flagManager.generateFlagProgressionGuidance();
    let prompt = this.buildActionContextPreamble(context, progressionGuidance);
    
    // Add current flag state at the end (changes frequently - not cacheable)
    prompt += flagManager.generateFlagStateSection();
    
    return prompt;
  }

  /**
   * Build action instructions with detailed flag management guidance
   */
  static buildActionInstructionsWithFlagGuidance(context: DirectorContext, flagManager: FlagManager): string {
    const baseInstructions = this.buildActionInstructions(context);
    const flagInstructions = flagManager.generateFlagManagementInstructions();
    
    return `${baseInstructions}

${flagInstructions}

${this.getStructuredResponseInstructions()}`;
  }


  /**
   * Build context preamble for action processing (excludes transitions/endings)
   * Reorganized for optimal caching with static content first
   */
  static buildActionContextPreamble(context: DirectorContext, flagProgressionGuidance?: string): string {
    // STATIC/SEMI-STATIC PREFIX - Content that remains stable for the story/scene duration
    // This organization benefits Gemini's automatic context caching and Anthropic's prompt caching
    let prompt = `**ROLE:** You are a **Narrative Architect** specializing in interactive fiction. You craft living stories that respond dynamically to player choices while maintaining narrative coherence, emotional resonance, and world authenticity. Your expertise encompasses both the technical systems of interactive storytelling (flags, character states, memory) and the artistic craft of emergent narrative.\n\n`;

    // Story context (static for story duration)
    if (context.storyContext) {
      prompt += `**STORY CONTEXT:**\n${context.storyContext}\n\n`;
    }

    // Global guidance (static for story duration)
    if (context.guidance) {
      prompt += `**GLOBAL STORY GUIDANCE:**\n${context.guidance}\n\n`;
    }

    // Flag progression guidance (static for story duration)
    if (flagProgressionGuidance) {
      prompt += `**${flagProgressionGuidance}**\n\n`;
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

    // World Elements (static for story duration)
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
        characterSections.push(`**PLAYER CHARACTER:**\n${playerInfo}`);
      }
      
      // NPCs section
      if (npcs.length > 0) {
        const npcDetails = npcs.map(c => {
          let charInfo = `  * ${c.name} (NPC)`;
          if (c.sketch) charInfo += ` - ${c.sketch}`;
          if (c.voice) charInfo += `\n    * Voice: ${c.voice}`;
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

    // Available transitions (semi-static - stable for scene duration)
    if (context.currentTransitions && Object.keys(context.currentTransitions).length > 0) {
      prompt += `**SCENE TRANSITION RULES:**\n`;
      Object.entries(context.currentTransitions).forEach(([sceneId, data]) => {
        prompt += `* ${sceneId}: REQUIRES ${data.condition}\n`;
      });
      prompt += '\n';
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
    let prompt = `**ROLE:** You are a **Narrative Architect** specializing in interactive fiction. You craft living stories that respond dynamically to player choices while maintaining narrative coherence, emotional resonance, and world authenticity. Your expertise encompasses both the technical systems of interactive storytelling (flags, character states, memory) and the artistic craft of emergent narrative.\n\n`;

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
        characterSections.push(`**PLAYER CHARACTER:**\n${playerInfo}`);
      }
      
      // NPCs section
      if (npcs.length > 0) {
        const npcDetails = npcs.map(c => {
          let charInfo = `  * ${c.name} (NPC)`;
          if (c.sketch) charInfo += ` - ${c.sketch}`;
          if (c.voice) charInfo += `\n    * Voice: ${c.voice}`;
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
   * Generate static instructions for action processing (no classification logic)
   * Returns only the static content that should be cached
   */
  static buildActionInstructions(context: DirectorContext): string {
    // STATIC PREFIX - Core response guidelines that remain constant
    let instructions = `${this.getCoreResponseGuidelines()}

${this.getStructuredResponseInstructions()}`;
    
    // SEMI-DYNAMIC CONTENT - Changes based on story state (but not per action)
    // Post-ending context if story is complete (only appears when story ends)
    if (context.storyComplete) {
      instructions = `**POST-ENDING NARRATIVE MODE:**
The story has reached its conclusion, but the narrative continues. Players may explore the aftermath, 
revisit moments, or imagine extensions to the story. Continue as the story director, maintaining 
the same narrative voice and immersive storytelling approach. Respond to player actions as if 
they're exploring this world and these characters beyond the formal ending.
Since the story is complete, transitions are handled automatically by the flag system.

${instructions}`;
    }

    return instructions;
  }

  /**
   * Generate mode-specific instructions for scene transitions
   * Structured to let story-specific guidance override generic instructions
   */
  static buildTransitionInstructions(
    targetSceneId: string, 
    sceneSketch: string, 
    playerAction: string
  ): string {
    // DYNAMIC CONTENT - Changes per transition
    let instructions = `**SCENE TRANSITION IN PROGRESS**

You are transitioning to scene: ${targetSceneId}

**PLAYER ACTION:** ${playerAction}

**TARGET SCENE DESCRIPTION** (use as foundation):
${sceneSketch}


**SCENE TRANSITION STORYTELLING:**
* Follow the GLOBAL STORY GUIDANCE above - it takes priority over any generic instructions
* Weave the player's action into the scene transition
* Present the scene content using the storytelling method specified in the story guidance
* Honor the story's established narrative voice, tone, and format requirements
* Add atmospheric context only when it enhances rather than replaces the core content
* Maintain consistency with the story's distinctive storytelling approach
* RESPECT THE STORY'S PRIMARY STORYTELLING METHOD established in the guidance above

${this.getStructuredResponseInstructions()}`;

    return instructions;
  }

  /**
   * Generate mode-specific instructions for ending transitions
   * Structured to let story-specific guidance override generic instructions
   */
  static buildEndingInstructions(endingId: string, endingSketch: string, playerAction: string): string {
    // DYNAMIC CONTENT - Changes per ending
    return `**STORY ENDING IN PROGRESS**

You are concluding the story with ending: ${endingId}

**PLAYER ACTION:** ${playerAction}

**ENDING DESCRIPTION** (use as foundation):
${endingSketch}

**STORY CONCLUSION STORYTELLING:**
* Follow the GLOBAL STORY GUIDANCE above - it takes priority over any generic instructions
* Weave the player's action into the story's natural culmination
* Present the ending content using the story's established storytelling method
* Create closure that honors the story's themes and distinctive voice
* Focus on the emotional and thematic weight of this conclusion
* Maintain the story's narrative format and approach through to the ending
* RESPECT THE STORY'S PRIMARY STORYTELLING METHOD throughout the ending
* Endings are handled automatically by the flag system

${this.getStructuredResponseInstructions()}`;
  }

  /**
   * Generate mode-specific instructions for initial scene establishment
   * Structured to let story-specific guidance override generic instructions
   */
  static buildInitialSceneInstructions(sceneId: string, sceneSketch: string): string {
    // DYNAMIC CONTENT - Changes per scene
    return `**INITIAL SCENE ESTABLISHMENT**

You are establishing the opening scene of the story: ${sceneId}

**SCENE DESCRIPTION** (use as foundation):
${sceneSketch}

**OPENING SCENE STORYTELLING:**
* Follow the GLOBAL STORY GUIDANCE above - it takes priority over any generic instructions
* Present the opening scene using the story's established storytelling method
* Establish the world, mood, and characters using the story's distinctive voice
* Create an engaging opening that draws players into this story world
* Honor the story's specified narrative format and approach from the beginning
* Focus on scene establishment following the story's format and style requirements
* RESPECT THE STORY'S PRIMARY STORYTELLING METHOD from the first response

${this.getStructuredResponseInstructions()}`;
  }

  /**
   * Rich text formatting instructions for narrative responses
   */
  static getRichTextFormattingInstructions(): string {
    return `
**FORMATTING & MARKUP:**
* **Bold** for emphasis, *italics* for thoughts/whispers
* "Double quotes" for all dialogue (never single quotes)
* 1-2 sentences per paragraph for pacing
* Atmospheric details and sensory descriptions

**INTERACTIVE MARKUP (use sparingly):**
* [Character](character:id) for important NPCs
* [Item](item:id) for examinable objects
* [Location](location:id) for visitable places
* [!warning] / [!discovery] / [!danger] for significant moments
* Use only when adding meaningful interactivity - prefer **bold** and *italic* for most emphasis`;
  }

  /**
   * Core response guidelines for action processing
   * These are static and benefit from caching
   */
  static getCoreResponseGuidelines(): string {
    return `**STORYTELLING:**
* Respond to player's exact action with atmospheric narrative
* Never control the player character - only NPCs and environment
* Show consequences and invite natural next actions
* Honor story voice and tone
* Create moments that breathe with life - conversations, shifting atmospheres, emerging possibilities

**NARRATIVE CONTINUITY:**
* Weave key memories naturally into current responses - they inform character knowledge and emotional state
* Reference previous story beats when relevant to create narrative cohesion
* Let accumulated experiences shape how NPCs react and what they remember about the player
* Build on established relationship dynamics from past interactions
* Use memory context to create believable character growth and story progression`;
  }

  /**
   * Instructions for structured response (used with Zod schema)
   * These are static and benefit from caching
   */
  static getStructuredResponseInstructions(): string {
    return `
${this.getRichTextFormattingInstructions()}

**RESPONSE FORMAT:**
* reasoning: Brief evaluation of player's action and its effects (2-3 sentences max)
* narrativeParts: Array of paragraph strings, each containing 1-2 sentences with rich formatting
* memories: Array of strings with important details to remember: discoveries, changes, or new knowledge gained
* importance: Rate the significance of this interaction (1-10, default 5)
* flagChanges: Object with 'set' and 'unset' arrays listing flag IDs to change based on this interaction

**CRITICAL FORMAT REQUIREMENTS:**
* narrativeParts MUST be an array of strings (e.g., ["First paragraph.", "Second paragraph."]), NOT a JSON-encoded string
* memories MUST be an array of strings, not a JSON-encoded string
* flagChanges.set and flagChanges.unset MUST be arrays of flag IDs
* Set flags conservatively - only when the action clearly warrants the change

**FLAG MANAGEMENT:**
Use the flag system to track story state changes and character developments. Set flags when significant events occur that affect the story world or character relationships.`;
  }
}