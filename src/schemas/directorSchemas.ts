/**
 * Zod schemas for Director responses
 * Used for structured output with LangChain
 */

import { z } from 'zod';

/**
 * Schema for flag changes that can be output by the LLM
 */
export const FlagChangesSchema = z.object({
  set: z.array(z.string()).default([]).describe('Array of flag IDs to set to true'),
  unset: z.array(z.string()).default([]).describe('Array of flag IDs to set to false')
}).describe('Flag changes resulting from the narrative response');

/**
 * Simplified signals for specific engine actions (scene/ending transitions handled by flags)
 */
export const DirectorSignalsSchema = z.object({
  discover: z.string().optional().describe('Item ID to discover and add to inventory'),
  error: z.string().optional().describe('Error message if something went wrong')
}).describe('Discovery and error signals (transitions handled automatically by flags)');

/**
 * Main director response schema for all response types
 * (actions, transitions, initial scenes, endings)
 */
export const DirectorResponseSchema = z.object({
  reasoning: z.string().describe('Your step-by-step reasoning for this response'),
  narrativeParts: z.union([z.array(z.string()), z.string()]).describe('Array of paragraph strings, each containing one narrative paragraph'),
  memories: z.array(z.string()).default([]).describe('Important details to remember: discoveries, changes to the world, or new knowledge the player has gained'),
  importance: z.number().min(1).max(10).default(5).describe('How important this interaction is (1-10)'),
  flagChanges: FlagChangesSchema.default({ set: [], unset: [] }).describe('Flag changes to apply based on this interaction'),
  signals: DirectorSignalsSchema.optional().describe('Discovery and error signals only (transitions handled automatically by flags)')
}).describe('Complete response to player action or scene establishment');

/**
 * Type inference for TypeScript
 */
export type DirectorResponseData = z.infer<typeof DirectorResponseSchema>;
export type DirectorSignalsData = z.infer<typeof DirectorSignalsSchema>;