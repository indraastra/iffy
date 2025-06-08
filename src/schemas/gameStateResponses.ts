import { z } from 'zod';

/**
 * Schemas for game state LLM interactions.
 * These are specifically for the interactive fiction game engine's 
 * command processing and state management.
 */

// Schema for game state changes that occur during player interactions
export const GameStateChangesSchema = z.object({
  newLocation: z.string().nullable().optional(),
  addToInventory: z.array(z.string()).optional().default([]),
  removeFromInventory: z.array(z.string()).optional().default([]),
  setFlags: z.array(z.string()).optional().default([]),
  unsetFlags: z.array(z.string()).optional().default([])
});

// Schema for LLM responses to game commands (main game state interaction format)
export const GameStateResponseSchema = z.object({
  action: z.enum(['look', 'move', 'take', 'drop', 'talk', 'examine', 'help', 'inventory', 'other']),
  reasoning: z.string().optional().default(''),
  stateChanges: GameStateChangesSchema,
  response: z.string(),
  error: z.string().optional()
});

// Schema for game action interpretation (useful for more granular parsing)
export const GameActionInterpretationSchema = z.object({
  action: z.enum(['take', 'examine', 'use', 'go', 'talk', 'wait', 'look', 'drop', 'help', 'inventory', 'other']),
  target: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

// Schema for multiple game action interpretations when player input is ambiguous
export const MultipleGameActionInterpretationsSchema = z.object({
  interpretations: z.array(GameActionInterpretationSchema),
  needsClarification: z.boolean(),
  clarificationMessage: z.string().optional()
});

// Schema for narrative game state updates (alternative to structured state changes)
export const GameNarrativeStateUpdateSchema = z.object({
  type: z.enum(['inventory_change', 'location_change', 'flag_change', 'knowledge_gain', 'dialogue']),
  description: z.string(),
  changes: GameStateChangesSchema
});

// Type inference for TypeScript
export type GameStateChanges = z.infer<typeof GameStateChangesSchema>;
export type GameStateResponse = z.infer<typeof GameStateResponseSchema>;
export type GameActionInterpretation = z.infer<typeof GameActionInterpretationSchema>;
export type MultipleGameActionInterpretations = z.infer<typeof MultipleGameActionInterpretationsSchema>;
export type GameNarrativeStateUpdate = z.infer<typeof GameNarrativeStateUpdateSchema>;

// Utility schemas for validation of common game data types
export const LocationIdSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Location ID must be alphanumeric");
export const ItemIdSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Item ID must be alphanumeric");
export const FlagNameSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Flag name must be alphanumeric");

// Enhanced schemas with stricter validation for game state interactions
export const ValidatedGameStateChangesSchema = GameStateChangesSchema.extend({
  newLocation: LocationIdSchema.nullable().optional(),
  addToInventory: z.array(ItemIdSchema).optional().default([]),
  removeFromInventory: z.array(ItemIdSchema).optional().default([]),
  setFlags: z.array(FlagNameSchema).optional().default([]),
  unsetFlags: z.array(FlagNameSchema).optional().default([])
});

export const ValidatedGameStateResponseSchema = GameStateResponseSchema.extend({
  stateChanges: ValidatedGameStateChangesSchema,
  response: z.string().min(1, "Response cannot be empty")
});

export type ValidatedGameStateResponse = z.infer<typeof ValidatedGameStateResponseSchema>;