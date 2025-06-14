/**
 * Zod schemas for Director responses
 * Used for structured output with LangChain
 */

import { z } from 'zod';

/**
 * Signals that can be returned by the director
 */
export const DirectorSignalsSchema = z.object({
  scene: z.string().optional().describe('Target scene ID for transitions'),
  ending: z.string().optional().describe('Ending ID if story should conclude')
}).describe('Scene transitions and other signals');

/**
 * Main director response schema for all response types
 * (actions, transitions, initial scenes, endings)
 */
export const DirectorResponseSchema = z.object({
  reasoning: z.string().describe('Your step-by-step reasoning for checking conditions and determining any signals'),
  narrative: z.string().describe('The narrative response with rich text formatting'),
  memories: z.array(z.string()).default([]).describe('Important details to remember: discoveries, changes to the world, or new knowledge the player has gained'),
  importance: z.number().min(1).max(10).default(5).describe('How important this interaction is (1-10)'),
  signals: DirectorSignalsSchema.optional().describe('Optional signals for scene transitions or endings')
}).describe('Complete response to player action or scene establishment');

/**
 * Type inference for TypeScript
 */
export type DirectorResponseData = z.infer<typeof DirectorResponseSchema>;
export type DirectorSignalsData = z.infer<typeof DirectorSignalsSchema>;