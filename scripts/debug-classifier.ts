#!/usr/bin/env tsx
/**
 * ActionClassifier Debug Script
 * 
 * This script allows you to test ActionClassifier prompts directly against models
 * to debug poor classification results.
 * 
 * Usage:
 *   npm run debug-classifier
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

const MODEL_CONFIG = {
  // Model settings - modify these to test different scenarios
  // model: 'claude-3-5-haiku-latest', // Anthropic cost model
  // model: 'claude-3-5-sonnet-latest', // Anthropic quality model
  // model: 'gpt-4o-mini', // OpenAI cost model
  // model: 'gpt-4o', // OpenAI quality model
  // model: 'gemini-2.5-flash-preview-05-20', // Google experimental model
  model: 'gemini-2.5-flash-lite-preview-06-17', // Google experimental model
  // model: 'gemini-1.5-flash', // Google cost model
  // model: 'gemini-1.5-pro', // Google quality model
  
  maxTokens: 1000,
  
  // Test configuration for temperature analysis
  temperatures: [0.1, 0.4, 0.7], // Range of temperatures to test
  repetitions: 5, // Number of times to test each temperature
};

// Updated prompt to match current ActionClassifier format
const MARKDOWN_PROMPT = `**TASK:** Evaluate player action against current scene state and determine next transition. Your primary function is to be a strict, logical gatekeeper.

**EVALUATION RULES:**
1. **MANDATORY PREREQUISITES FIRST:** You MUST check if the hard PREREQUISITES of a transition are met step-by-step. If these are not met, you must ignore the DESCRIPTION entirely.
2. **STRICT LOGIC:** A transition is triggered ONLY if ALL of its PREREQUISITES are explicitly satisfied.
3. **NO PARTIAL CREDIT:** Partial or implied satisfaction is an immediate failure. A character thinking about leaving is not a match for \`left location\`.
4. **DEFAULT TO CONTINUE:** If no single transition has all PREREQUISITES met, your only valid response is "continue". Do not attempt to find a "best fit".

**RESPONSE FORMAT:**
\`\`\`json
{
  "result": "continue" | "T0" | "T1" | "T2" ...,
  "reasoning": "Brief explanation (1-2 sentences max)"
}
\`\`\`

**SCENE:**
2:47 AM becomes 9:23 PM becomes this moment, always. Rain against glass, 
the same Chet Baker track on repeat. You know this booth, these shadows.

Alex's reflection doubles in the window - one facing you, one watching the street. 
The coffee has gone cold again. It always goes cold.

You've been here before. You'll be here again. But tonight feels different, 
like a film running at the wrong speed, frames dropping into silence.

[What crosses your mind as you study Alex in the half-light?]

**TRANSITIONS:**

**T0:**
* **PREREQUISITES:**
    * \`the player or Alex exit the cafe AND player and Alex leave the café together\`
* **DESCRIPTION:** Alex's hand finds yours as you leave the café. 'Thank you for not giving up on me.'

**T1:**
* **PREREQUISITES:**
    * \`the player or Alex exit the cafe AND (player lets Alex leave without resolution OR player hurts Alex)\`
* **DESCRIPTION:** You watch Alex disappear into the rain. The barista starts
stacking chairs. Another chance lost to fear.

**T2:**
* **PREREQUISITES:**
    * \`the player or Alex exit the cafe AND player acknowledges the moment but chooses friendship\`
* **DESCRIPTION:** Alex smiles - genuine but careful. "We're good, right?"
Some things are worth more than the risk.

**EXAMPLES OF CORRECT EVALUATION:**

1. **ACTION:** \`Player examines the locked door carefully.\`
   **SCENE:** A small room with a heavy wooden door.
   **TRANSITION T0 PREREQUISITES:** \`player opens the door\`
   **CORRECT RESPONSE:**
   \`\`\`json
   {
     "result": "continue",
     "reasoning": "Prerequisites not met: player examined the door but did not open it."
   }
   \`\`\`

2. **ACTION:** \`Push open the heavy wooden door and step through.\`
   **SCENE:** A small room with a heavy wooden door.
   **TRANSITION T0 PREREQUISITES:** \`player opens the door\`
   **CORRECT RESPONSE:**
   \`\`\`json
   {
     "result": "T0",
     "reasoning": "Prerequisites met: player opened the door by pushing it open."
   }
   \`\`\`

**Recent Dialogue:**
Player: Hey, Alex. You've been so quiet tonight. Is everything ok at work?
Response: **Alex**'s reflection in the glass blurs as she turns her head slowly from the street. Her eyes, usually so direct, seem to catch on something just past you, or perhaps within you.

A small, almost imperceptible tremor runs through her hand as she finally picks up the *cold mug*. "Work?" she repeats, the word a soft echo in the quiet café, as if testing its shape.

She doesn't meet your gaze fully, her eyes drifting to the condensation beading on the glass. "It's… fine. Always the same, isn't it?" Her voice is a low current, barely disturbing the jazz.
Player: Ah, well, what's on your mind? I feel like you've been slowly drifting away these last few weeks and, well, I'm worried. Is it something I said or did?
Response: **Alex**'s grip tightens imperceptibly on the cold mug, her knuckles momentarily white against the ceramic. The jazz drifts, a familiar, distant hum, as she finally turns her gaze fully to you.

Her eyes, usually so clear, are clouded, like the condensation on the windowpane. A soft, almost inaudible sigh escapes her. "No," she murmurs, her voice a fragile thing, "It's not you. Never you."

She looks away again, towards the street, where the rain continues its quiet descent. "It's just…" Her words trail off, leaving a silence that feels heavier than before, thick with unspoken things. She seems to gather her thoughts, or perhaps, her courage.
Player: "You can tell me. Or don't. But know that I'm here. This Friday, and the next, and the one after that."
Response: **Alex** looks at you, really looks at you, for the first time tonight. Her reflection in the window still watches the street, but her eyes, now, are fixed on yours.

The jazz loops, a familiar refrain, as she slowly, almost reverently, sets down the *cold mug* on the condensation ring it leaves behind.

A breath, held for too long, escapes her. The air between you feels lighter, or perhaps, just more fragile.

She reaches out, her fingers hovering for a moment, then resting gently on the back of your hand. Her touch is cool, like the glass, but steady.

Her voice, when it comes, is a whisper against the quiet hum of the café. "Always… here?"

**Memories:**
- Alex's pronouns are she/her.
- Alex appears beautiful but distant.
- Alex is focused on something outside.
- Alex acknowledged player's concern.
- Alex is nervous and deflecting questions.
- Player expressed worry about Alex's distance.
- Player asked if they caused Alex's distance.
- Alex denied player caused her quietness.
- Alex struggles to articulate her feelings.
- Alex is beginning to open up due to the player's empathy.
- Alex touched the player's hand.
- Alex whispered "Always... here?"

**ACTION:**
\`Put my other hand on hers and say , "Always."\`

EVALUATE NOW.`;

// **EVALUATION & RESPONSE INSTRUCTIONS:**
// 1. **Analyze the Input:** First, look at the player's \`Action\` and the \`Current State Facts\`.
// 2. **Evaluate Endings:** Evaluate the \`Conditions\` for each ending one by one, in the order they are listed.
// 3. **Think Step-by-Step:** For each ending, verbalize your reasoning. Check if the player's \`Action\` satisfy conditions along with \`Current State Facts\`.
// 4. **Select the First Match:** The correct outcome is the *first one* whose conditions are all met.
// 5. **Default to Action:** If no scene transitions or endings have their conditions met, the mode must be \`action\`.
// 6. **Format Response:** Provide your final answer in the specified JSON format. The \`reasoning\` field should be a brief one-sentence explanation.

// Choose which prompt to test
const PROMPT_TO_USE = 'MARKDOWN';
const TEST_PROMPT =  MARKDOWN_PROMPT;

// =============================================================================
// SCRIPT LOGIC - You shouldn't need to modify below this line
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

async function callModel(prompt: string, temperature: number): Promise<ModelResponse> {
  const isAnthropic = MODEL_CONFIG.model.includes('claude');
  const isOpenAI = MODEL_CONFIG.model.includes('gpt');
  const isGoogle = MODEL_CONFIG.model.includes('gemini');
  
  let model;
  let apiKey: string | undefined;
  
  if (isAnthropic) {
    apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude models');
    }
    model = new ChatAnthropic({
      apiKey,
      model: MODEL_CONFIG.model,
      maxTokens: MODEL_CONFIG.maxTokens,
      temperature,
    });
  } else if (isOpenAI) {
    apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for GPT models');
    }
    model = new ChatOpenAI({
      apiKey,
      model: MODEL_CONFIG.model,
      maxTokens: MODEL_CONFIG.maxTokens,
      temperature,
    });
  } else if (isGoogle) {
    apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required for Gemini models');
    }
    model = new ChatGoogleGenerativeAI({
      apiKey,
      model: MODEL_CONFIG.model,
      maxOutputTokens: MODEL_CONFIG.maxTokens,
      temperature,
    });
  } else {
    throw new Error(`Unsupported model: ${MODEL_CONFIG.model}`);
  }
  
  const startTime = Date.now();
  const response = await model.invoke([new HumanMessage(prompt)]);
  const latency = Date.now() - startTime;
  
  return {
    content: response.content as string,
    usage: (response as any).usage_metadata || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    latency
  };
}

function parseJsonResponse(content: string): any {
  try {
    // Look for JSON block in markdown
    const jsonMatch = content.match(/```json\s*(.*?)\s*```/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to parse the whole content as JSON
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

interface TestResult {
  temperature: number;
  attempt: number;
  result: string;  // "continue", "T0", "T1", etc.
  reasoning: string;
  latency: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

async function runSingleTest(temperature: number, attempt: number): Promise<TestResult | null> {
  try {
    process.stdout.write(`🧪 T=${temperature} #${attempt}... `);
    
    const result = await callModel(TEST_PROMPT, temperature);
    const parsedJson = parseJsonResponse(result.content);
    
    if (!parsedJson) {
      console.log('❌ Failed to parse JSON');
      return null;
    }
    
    console.log(`✅ ${parsedJson.result}`);
    
    return {
      temperature,
      attempt,
      result: parsedJson.result || 'unknown',
      reasoning: parsedJson.reasoning || '',
      latency: result.latency,
      tokenUsage: {
        input: result.usage.input_tokens || result.usage.prompt_tokens || 0,
        output: result.usage.output_tokens || result.usage.completion_tokens || 0,
        total: result.usage.total_tokens || 0
      }
    };
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function analyzeResults(results: TestResult[]): void {
  console.log('\n📊 ANALYSIS SUMMARY');
  console.log('===================\n');
  
  // Group by temperature
  const byTemperature = results.reduce((acc, result) => {
    if (!acc[result.temperature]) {
      acc[result.temperature] = [];
    }
    acc[result.temperature].push(result);
    return acc;
  }, {} as Record<number, TestResult[]>);
  
  // Analyze each temperature
  for (const temp of MODEL_CONFIG.temperatures) {
    const tempResults = byTemperature[temp] || [];
    
    console.log(`🌡️ Temperature ${temp}:`);
    console.log(`   Total attempts: ${tempResults.length}`);
    
    if (tempResults.length === 0) {
      console.log('   No successful results\n');
      continue;
    }
    
    // Count outcomes by classification result
    const outcomes = tempResults.reduce((acc, result) => {
      acc[result.result] = (acc[result.result] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Outcomes:');
    Object.entries(outcomes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([outcome, count]) => {
        const percentage = ((count / tempResults.length) * 100).toFixed(1);
        console.log(`     ${outcome}: ${count}/${tempResults.length} (${percentage}%)`);
      });
    
    // Average stats
    const avgLatency = tempResults.reduce((sum, r) => sum + r.latency, 0) / tempResults.length;
    
    console.log(`   Avg latency: ${avgLatency.toFixed(0)}ms`);
    console.log('');
  }
  
  // Overall consistency analysis
  console.log('🎯 CONSISTENCY ANALYSIS:');
  
  for (const temp of MODEL_CONFIG.temperatures) {
    const tempResults = byTemperature[temp] || [];
    if (tempResults.length === 0) continue;
    
    const results = tempResults.map(r => r.result);
    const uniqueResults = new Set(results);
    const consistency = ((results.length - uniqueResults.size + 1) / results.length * 100);
    
    console.log(`   T=${temp}: ${consistency.toFixed(1)}% consistent (${uniqueResults.size} different outcomes)`);
  }
}

async function main(): Promise<void> {
  console.log('🎯 ActionClassifier Temperature Analysis');
  console.log('========================================\n');
  
  console.log(`📋 Model: ${MODEL_CONFIG.model}`);
  console.log(`📝 Prompt format: ${PROMPT_TO_USE}`);
  console.log(`📝 Prompt length: ${TEST_PROMPT.length} characters`);
  console.log(`🌡️ Temperatures: ${MODEL_CONFIG.temperatures.join(', ')}`);
  console.log(`🔁 Repetitions per temperature: ${MODEL_CONFIG.repetitions}\n`);
  
  const allResults: TestResult[] = [];
  
  try {
    for (const temperature of MODEL_CONFIG.temperatures) {
      console.log(`\n🌡️ Testing temperature ${temperature}:`);
      
      for (let attempt = 1; attempt <= MODEL_CONFIG.repetitions; attempt++) {
        const result = await runSingleTest(temperature, attempt);
        if (result) {
          allResults.push(result);
        }
        
        // Brief pause between requests to be respectful
        if (attempt < MODEL_CONFIG.repetitions) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    analyzeResults(allResults);
    
  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();