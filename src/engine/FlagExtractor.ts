import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { FlagChange, FlagTrigger, BehaviorPattern } from './FlagManager';

// Schema for flag extraction output
const FlagExtractionSchema = z.object({
  set: z.array(z.string()).describe("Flags to set (e.g., 'alex_confessed', 'location=outside')"),
  clear: z.array(z.string()).describe("Flags to clear/set to false"),
  behaviors_observed: z.array(z.string()).describe("Behavior patterns observed in this interaction")
});

export type FlagExtractionResult = z.infer<typeof FlagExtractionSchema>;

export class FlagExtractor {
  private llm: BaseLanguageModel;
  private outputParser: JsonOutputParser<FlagExtractionResult>;

  constructor(llm: BaseLanguageModel) {
    this.llm = llm;
    this.outputParser = new JsonOutputParser<FlagExtractionResult>();
  }

  async extractFlags(
    playerAction: string,
    narrative: string,
    currentFlags: Record<string, any>,
    flagTriggers: FlagTrigger[],
    behaviorPatterns: Record<string, BehaviorPattern>
  ): Promise<FlagChange> {
    const prompt = PromptTemplate.fromTemplate(`
You are analyzing a player's action and the narrative response to determine what story flags should be updated.

CURRENT FLAGS:
{currentFlags}

FLAG TRIGGERS (patterns to watch for):
{flagTriggers}

BEHAVIOR PATTERNS (to detect):
{behaviorPatterns}

PLAYER ACTION:
{playerAction}

NARRATIVE RESPONSE:
{narrative}

Analyze the player action and narrative to determine:
1. Which flag triggers have been activated
2. Which behavior patterns are exhibited
3. What flags should be set or cleared

Rules:
- Only set flags when their trigger patterns clearly match
- Behavior flags accumulate - set them when patterns are observed
- Location flags should update when the narrative indicates movement
- Event flags (like alex_confessed) should only be set when that event explicitly occurs
- Check "requires" conditions before setting dependent flags

{formatInstructions}

Output the flags to update:
`);

    const response = await this.llm.invoke(
      await prompt.format({
        currentFlags: JSON.stringify(currentFlags, null, 2),
        flagTriggers: JSON.stringify(flagTriggers, null, 2),
        behaviorPatterns: JSON.stringify(behaviorPatterns, null, 2),
        playerAction,
        narrative,
        formatInstructions: this.outputParser.getFormatInstructions()
      }),
      // { temperature: 0.1 } // Temperature not supported in this context
    );

    try {
      const result = await this.outputParser.parse(response.content as string);
      return {
        set: result.set || [],
        clear: result.clear || [],
        behaviors_observed: result.behaviors_observed || []
      };
    } catch (error) {
      console.error('Failed to parse flag extraction result:', error);
      // Return empty changes on parse error
      return {
        set: [],
        clear: [],
        behaviors_observed: []
      };
    }
  }
}