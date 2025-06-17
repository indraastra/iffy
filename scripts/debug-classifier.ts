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
  model: 'claude-3-5-haiku-latest', // Anthropic cost model
  // model: 'claude-3-5-sonnet-latest', // Anthropic quality model
  // model: 'gpt-4o-mini', // OpenAI cost model
  // model: 'gpt-4o', // OpenAI quality model
  // model: 'gemini-2.0-flash', // Google experimental model
  // model: 'gemini-1.5-flash', // Google cost model
  // model: 'gemini-1.5-pro', // Google quality model
  
  maxTokens: 1000,
  
  // Test configuration for temperature analysis
  temperatures: [0.1, 0.4, 0.7], // Range of temperatures to test
  repetitions: 5, // Number of times to test each temperature
};

// The original markdown prompt
const MARKDOWN_PROMPT = `**ROLE:** You are a meticulous logic engine for an interactive fiction game. Your task is to evaluate the player's action against the current game state and the requirements for all possible outcomes. You must follow the evaluation process exactly.

**PLAYER INPUT:**
* **Action:** \`Oh Alex, I love you too. Lean over the table and kiss her teary cheek\`

**GAME STATE:**
* **Scene Description:** Rain streaks the café window, fracturing the neon outside into pink and blue. 
You're in your usual corner booth at Grounded, where Chet Baker loops endlessly 
through the speakers.

Alex sits across from you, half-lit by the window's glow, fingers tracing circles 
on a cold coffee mug. In the glass, your reflections overlap with the city lights - two 
ghosts watching each other.

You've shared a hundred Friday evenings here, but tonight the silence between you 
has weight. Something unspoken hums in the amber air.

[What crosses your mind as you study Alex in the half-light?]
* **Current State Facts:**
    * \`Alex is a female character who uses she/her pronouns\`
    * \`Alex and player share deep emotional and physical intimacy\`
    * \`Alex is preparing to reveal something critically important about their relationship\`
    * \`Alex has romantic feelings for the player, previously thought one-sided\`
    * \`Alex fears potentially losing their current friendship\`

**POSSIBLE OUTCOMES:**
* **Scene Transitions:** None
* **Endings:**
    * **Global requirements:** conversation has concluded AND the player and/or Alex leaves the cafe
    * **ID:** \`new_beginnings\`
        * **Conditions:** player and Alex leave the café together
    * **ID:** \`missed_chance\`
        * **Conditions:** player lets Alex leave without resolution AND conversation spirals into hurt
    * **ID:** \`friendship_preserved\`
        * **Conditions:** player acknowledges the moment but chooses friendship

**EVALUATION & RESPONSE INSTRUCTIONS:**
1. **Analyze the Input:** First, look at the player's Action and the Current State Facts.
2. **Ending Conditions Criteria:** 
   - CRITICAL: Ending conditions MUST BE FULLY AND EXPLICITLY MET
   - Potential or implied conditions are NOT sufficient
   - Conditions require CONCRETE, OBSERVABLE ACTIONS that completely satisfy ALL stated requirements

3. **Ending Evaluation Process:**
   - For EACH ending, perform a STRICT, BINARY check
   - ALL listed conditions must be 100% satisfied
   - If ANY condition is not fully met, the ending is INVALID
   - Partial matches or potential matches are NOT accepted

4. **Default Mechanism:**
   - If NO ending has ALL its conditions strictly met
   - DEFAULT to 'action' mode
   - 'action' mode represents continuing the current scene interaction

5. **Reasoning Requirements:**
   - Provide EXPLICIT proof for why conditions are/are not met
   - Use PRECISE language
   - Highlight EXACTLY which conditions fail verification
**JSON RESPONSE FORMAT:**
\`\`\`json
{
  "mode": "action|sceneTransition|ending",
  "targetId": "scene/ending ID if applicable",
  "reasoning": "For each transition and ending, a one-sentence explanation of which outcome was selected and why.",
  "confidence": 0.99
}
\`\`\``;

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
  mode: string;
  targetId?: string;
  confidence: number;
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
    
    console.log(`✅ ${parsedJson.mode}${parsedJson.targetId ? ` → ${parsedJson.targetId}` : ''}`);
    
    return {
      temperature,
      attempt,
      mode: parsedJson.mode || 'unknown',
      targetId: parsedJson.targetId,
      confidence: parsedJson.confidence || 0,
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
    
    // Count outcomes
    const outcomes = tempResults.reduce((acc, result) => {
      const key = result.targetId ? `${result.mode} → ${result.targetId}` : result.mode;
      acc[key] = (acc[key] || 0) + 1;
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
    const avgConfidence = tempResults.reduce((sum, r) => sum + r.confidence, 0) / tempResults.length;
    
    console.log(`   Avg latency: ${avgLatency.toFixed(0)}ms`);
    console.log(`   Avg confidence: ${avgConfidence.toFixed(2)}`);
    console.log('');
  }
  
  // Overall consistency analysis
  console.log('🎯 CONSISTENCY ANALYSIS:');
  
  for (const temp of MODEL_CONFIG.temperatures) {
    const tempResults = byTemperature[temp] || [];
    if (tempResults.length === 0) continue;
    
    const modes = tempResults.map(r => r.mode);
    const uniqueModes = new Set(modes);
    const consistency = ((modes.length - uniqueModes.size + 1) / modes.length * 100);
    
    console.log(`   T=${temp}: ${consistency.toFixed(1)}% consistent (${uniqueModes.size} different outcomes)`);
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