/**
 * Memory System Schemas - Zod schemas for memory management
 */

import { z } from 'zod';

// Schema for a single compacted memory
export const CompactedMemorySchema = z.object({
  content: z.string().describe('The consolidated memory content'),
  importance: z.number().min(1).max(10).describe('Importance rating from 1-10')
});

// Schema for memory compaction response
export const CompactionResponseSchema = z.object({
  compactedMemories: z.array(CompactedMemorySchema).describe('Array of compacted memories')
});

// Type exports for TypeScript inference
export type CompactedMemory = z.infer<typeof CompactedMemorySchema>;
export type CompactionResponse = z.infer<typeof CompactionResponseSchema>;