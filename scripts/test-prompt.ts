#!/usr/bin/env tsx
/**
 * Simple Prompt Test Script
 * 
 * Run any prompt through a model and see the raw output.
 * 
 * Usage:
 *   npm run test-prompt
 * 
 * Make sure to set your API key in environment variables:
 *   export ANTHROPIC_API_KEY=your_key_here
 *   # or
 *   export OPENAI_API_KEY=your_key_here
 *   # or
 *   export GOOGLE_API_KEY=your_key_here
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';

// =============================================================================
// CONFIGURATION - Modify these values to test different scenarios
// =============================================================================

const CONFIG = {
  // Model settings
  // model: 'gemini-2.5-flash-preview-05-20', // Change this to test different models
  model: 'claude-3-5-haiku-latest',
  // model: 'claude-3-5-sonnet-latest',
  // model: 'gpt-4o-mini',
  // model: 'gpt-4o',
  // model: 'gemini-2.0-flash',
  // model: 'gemini-1.5-flash',
  // model: 'gemini-1.5-pro',
  
  temperature: 0.7,
  maxTokens: 2000,
};

// Your test prompt - modify this to test whatever you want
const TEST_PROMPT = `**ROLE:** You are the **Game Director** for an interactive text-based story. Your primary goal is to **narrate the story** based on player actions.

**STORY CONTEXT:**
Your usual Friday evening at the café. Alex seems different tonight.

**GLOBAL STORY GUIDANCE:**
Alex has been in love with the player for months and tonight plans to confess.
The player should discover this gradually through Alex's behavior and dialogue.

PRONOUN HANDLING:
1. Always start with they/them for Alex
2. Listen for player cues: if they say "She's nervous" or "He seems quiet", immediately adopt those pronouns
3. Once established, maintain consistency - this should feel natural, not forced
4. Example: Player says "She looks sad" → Use she/her for Alex from that point forward

Track Alex's emotional state:
- Nervous energy when player shows interest
- Relief when player creates safe space
- Retreat if player seems dismissive
- Joy if feelings are reciprocated

Small gestures matter. Silences speak volumes. Let the rain and music mirror the emotional weather.

**NARRATIVE STYLE:**
* Voice: Intimate, present tense, focused on emotional nuance
* Tone: Tender, emotionally charged, hopeful
* Themes: change, vulnerability, things left unsaid

**WORLD ELEMENTS:**
**NON-PLAYER CHARACTERS (NPCs):**
  * Alex (NPC) - Your Friday night companion, unusually restless and fidgeting with mug of cold coffee
    * Voice: Measured speech with hidden currents
    * Arc: searching for words, wrestling with change

**LOCATIONS:**
  * Grounded Café - Modern urban café with corner booths, large windows, and soft jazz playing through speakers
    * Atmosphere: intimate, contemplative, rain-soaked
    * Guidance: This is the player and Alex's regular Friday evening spot - familiar yet charged with unspoken feelings

**CURRENT SCENE DESCRIPTION:**
Rain streaks the café window, fracturing the neon outside into pink and blue. 
You're in your usual corner booth at Grounded, where Chet Baker loops endlessly 
through the speakers.

Alex sits across from you, half-lit by the window's glow, fingers tracing circles 
on a cold coffee mug. In the glass, your reflections overlap with the city lights - two 
ghosts watching each other.

You've shared a hundred Friday evenings here, but tonight the silence between you 
has weight. Something unspoken hums in the amber air.

[What crosses your mind as you study Alex in the half-light?]

**RECENT DIALOGUE:**
Player: how beautiful she looks, my alex
Response: Your gaze lingers on **Alex**, tracing the soft line of her jaw, the way the café lights catch the curve of her eyelashes. She must feel the weight of your attention, for a subtle tremor goes through her shoulders. Her fingers, which were idly tracing patterns on the *cold coffee mug*, now grip it a little tighter, her knuckles turning faintly white. The jazz music seems to swell, then recede, leaving a heightened silence in its wake. **Alex** doesn't meet your eyes, instead focusing intently on the condensation beading on the glass. A faint flush rises on her cheeks, betraying the quiet storm inside her. The air between you crackles, thick with unspoken words, as the rain continues its relentless drumming against the windowpane.
Player: Take the mug gently from her hands and ask if she wants a refresh
Response: You reach across the small table, your fingers gently closing around the *cold coffee mug* that **Alex** has been clutching. Her hand, still wrapped around the ceramic, hesitates for a moment, then softens under your touch. Her gaze, which had been fixed on the condensation, slowly lifts to meet yours. There's a flicker of surprise in her eyes, quickly followed by something else—a subtle softening, a release of the tension that had been coiling in her shoulders. The faint flush on her cheeks deepens just a shade, but her grip on the mug is gone. "Do you want a refresh?" you ask, your voice a quiet counterpoint to the distant jazz. For a beat, **Alex** simply looks at you, her mouth slightly ajar, as if the question has disarmed her. The rain continues its steady rhythm against the window, a gentle backdrop to the sudden, fragile intimacy of the moment.

**KEY MEMORIES:**
Alex's pronouns are she/her.
Player is romantically interested in Alex.
Alex is nervous around the player.
Alex has romantic feelings for the player.



**PLAYER ACTION:** "Alex?"

**TASK:**
* Process ONLY the player's exact action - do not take additional actions on their behalf
* If the player's action is dialogue directed at an NPC, ensure the NPC responds verbally in a way that is true to their character and current emotional state (e.g., hesitant, soft-spoken, etc.).
* Focus purely on narrative response - transitions/endings are handled separately
* Rate the significance of this interaction (1-10, default 5)

**RESPONSE GUIDELINES:**
* Adhere to the global and scene directives given by the story author
* Advance the narrative based on on how the scene, world, or characters react to the action
* End your narrative in a way that invites further player action
* VARIETY: Vary sentence structure, descriptive details, and phrasing between responses
* Avoid repetitive patterns or formulaic descriptions

**CRITICAL INTERACTIVE FICTION RULES:**
* Player controls PLAYER CHARACTER exclusively - never make them speak or act beyond their input
* You control all NPCs - let them respond naturally to player actions
* Process only the player's exact action (e.g., "examine door" ≠ "open door")
* If dialogue is initiated, NPCs must reply but wait for player's next input to continue



**FORMATTING INSTRUCTIONS:**
* Use **bold text** for emphasis and important elements
* Use *italic text* for thoughts, whispers, or subtle emphasis
* Use character names in **bold** when they speak or are introduced
* Use item names in *italics* when they're significant to the scene
* Break longer responses into paragraphs for readability
* Use atmospheric details and sensory descriptions
* Maintain consistent narrative voice and tone throughout

**RESPONSE FORMAT:**
* reasoning: Concise evaluation of player's action and its immediate effects (2-3 sentences max)
* narrative: Your narrative response with rich formatting
* memories: Array of important details to remember: discoveries, changes to the world, or new knowledge the player has gained
* importance: Rate the significance of this interaction (1-10, default 5)
* signals: Leave empty {} for action responses - transitions handled separately`;

// =============================================================================
// SCRIPT LOGIC
// =============================================================================

interface ModelResponse {
  content: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  latency: number;
}

async function callModel(prompt: string): Promise<ModelResponse> {
  const isAnthropic = CONFIG.model.includes('claude');
  const isOpenAI = CONFIG.model.includes('gpt');
  const isGoogle = CONFIG.model.includes('gemini');
  
  let model;
  let apiKey: string | undefined;
  
  if (isAnthropic) {
    apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude models');
    }
    model = new ChatAnthropic({
      apiKey,
      model: CONFIG.model,
      maxTokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
    });
  } else if (isOpenAI) {
    apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for GPT models');
    }
    model = new ChatOpenAI({
      apiKey,
      model: CONFIG.model,
      maxTokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
    });
  } else if (isGoogle) {
    apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required for Gemini models');
    }
    model = new ChatGoogleGenerativeAI({
      apiKey,
      model: CONFIG.model,
      maxOutputTokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
    });
  } else {
    throw new Error(`Unsupported model: ${CONFIG.model}`);
  }
  
  console.log(`🤖 Calling ${CONFIG.model}...`);
  console.log(`⚙️  Settings: temp=${CONFIG.temperature}, maxTokens=${CONFIG.maxTokens}`);
  
  const startTime = Date.now();
  const response = await model.invoke([new HumanMessage(prompt)]);
  const latency = Date.now() - startTime;
  
  return {
    content: response.content as string,
    usage: (response as any).usage_metadata || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    latency
  };
}

async function main(): Promise<void> {
  console.log('🧪 Simple Prompt Test');
  console.log('=====================\n');
  
  console.log(`📋 Model: ${CONFIG.model}`);
  console.log(`📝 Prompt length: ${TEST_PROMPT.length} characters\n`);
  
  console.log('📤 PROMPT:');
  console.log('─'.repeat(80));
  console.log(TEST_PROMPT);
  console.log('─'.repeat(80));
  
  try {
    const result = await callModel(TEST_PROMPT);
    
    console.log(`\n📥 RAW RESPONSE:`);
    console.log('─'.repeat(80));
    console.log(result.content);
    console.log('─'.repeat(80));
    
    console.log(`\n📊 STATS:`);
    console.log(`   Input tokens: ${result.usage.input_tokens || result.usage.prompt_tokens || 'unknown'}`);
    console.log(`   Output tokens: ${result.usage.output_tokens || result.usage.completion_tokens || 'unknown'}`);
    console.log(`   Total tokens: ${result.usage.total_tokens || 'unknown'}`);
    console.log(`   Latency: ${result.latency}ms`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    if (error && typeof error === 'object' && 'response' in error) {
      const errorResponse = error as any;
      console.error('   Response status:', errorResponse.response?.status);
      console.error('   Response data:', errorResponse.response?.data);
    }
    process.exit(1);
  }
}

main();