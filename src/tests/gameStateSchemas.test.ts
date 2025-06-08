import { describe, it, expect } from 'vitest';
import { 
  GameStateResponseSchema,
  ValidatedGameStateResponseSchema,
  GameActionInterpretationSchema,
  MultipleGameActionInterpretationsSchema,
  GameStateChangesSchema,
  LocationIdSchema,
  ItemIdSchema,
  FlagNameSchema
} from '@/schemas/gameStateResponses';

describe('Game State Response Schemas', () => {
  describe('GameStateResponseSchema', () => {
    it('should accept valid LLM responses', () => {
      const validResponse = {
        action: 'examine',
        reasoning: 'Player wants to examine something',
        stateChanges: {
          newLocation: null,
          addToInventory: ['key'],
          setFlags: ['examined_table']
        },
        response: 'You examine the table and find a key.'
      };

      const result = GameStateResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject responses with invalid actions', () => {
      const invalidResponse = {
        action: 'jump',
        reasoning: 'Player wants to jump',
        stateChanges: {},
        response: 'You jump high.'
      };

      const result = GameStateResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should require response field but allow missing reasoning', () => {
      const responseWithoutReasoning = {
        action: 'look',
        stateChanges: {},
        response: 'You look around.'
        // Missing reasoning (should be fine with default)
      };

      const result = GameStateResponseSchema.safeParse(responseWithoutReasoning);
      expect(result.success).toBe(true);
      expect(result.data?.reasoning).toBe('');
    });

    it('should require response field', () => {
      const incompleteResponse = {
        action: 'look',
        reasoning: 'Looking around',
        stateChanges: {}
        // Missing response
      };

      const result = GameStateResponseSchema.safeParse(incompleteResponse);
      expect(result.success).toBe(false);
    });

    it('should accept optional error field', () => {
      const responseWithError = {
        action: 'other',
        reasoning: 'Command failed',
        stateChanges: {},
        response: 'Something went wrong.',
        error: 'API error occurred'
      };

      const result = GameStateResponseSchema.safeParse(responseWithError);
      expect(result.success).toBe(true);
    });
  });

  describe('GameStateChangesSchema', () => {
    it('should accept valid state changes', () => {
      const validStateChanges = {
        newLocation: 'kitchen',
        addToInventory: ['apple', 'knife'],
        removeFromInventory: ['old_bread'],
        setFlags: ['visited_kitchen'],
        unsetFlags: ['hungry'],
        addKnowledge: ['kitchen_layout']
      };

      const result = GameStateChangesSchema.safeParse(validStateChanges);
      expect(result.success).toBe(true);
    });

    it('should provide defaults for missing arrays', () => {
      const minimalStateChanges = {
        newLocation: 'garden'
      };

      const result = GameStateChangesSchema.safeParse(minimalStateChanges);
      expect(result.success).toBe(true);
      expect(result.data?.addToInventory).toEqual([]);
      expect(result.data?.setFlags).toEqual([]);
    });

    it('should accept null for newLocation', () => {
      const stateChangesWithNull = {
        newLocation: null,
        addToInventory: ['item']
      };

      const result = GameStateChangesSchema.safeParse(stateChangesWithNull);
      expect(result.success).toBe(true);
    });

    it('should reject non-array values for array fields', () => {
      const invalidStateChanges = {
        addToInventory: 'not_an_array'
      };

      const result = GameStateChangesSchema.safeParse(invalidStateChanges);
      expect(result.success).toBe(false);
    });
  });

  describe('GameActionInterpretationSchema', () => {
    it('should accept valid action interpretations', () => {
      const validInterpretation = {
        action: 'take',
        target: 'sword',
        confidence: 0.85
      };

      const result = GameActionInterpretationSchema.safeParse(validInterpretation);
      expect(result.success).toBe(true);
    });

    it('should make target optional', () => {
      const interpretationWithoutTarget = {
        action: 'look',
        confidence: 0.9
      };

      const result = GameActionInterpretationSchema.safeParse(interpretationWithoutTarget);
      expect(result.success).toBe(true);
    });

    it('should validate confidence range', () => {
      const invalidConfidence = {
        action: 'examine',
        confidence: 1.5 // Invalid: > 1
      };

      const result = GameActionInterpretationSchema.safeParse(invalidConfidence);
      expect(result.success).toBe(false);
    });

    it('should reject negative confidence', () => {
      const negativeConfidence = {
        action: 'wait',
        confidence: -0.1
      };

      const result = GameActionInterpretationSchema.safeParse(negativeConfidence);
      expect(result.success).toBe(false);
    });
  });

  describe('MultipleGameActionInterpretationsSchema', () => {
    it('should accept multiple interpretations', () => {
      const multipleInterpretations = {
        interpretations: [
          { action: 'take', target: 'apple', confidence: 0.7 },
          { action: 'examine', target: 'apple', confidence: 0.6 }
        ],
        needsClarification: true,
        clarificationMessage: 'Did you want to take or examine the apple?'
      };

      const result = MultipleGameActionInterpretationsSchema.safeParse(multipleInterpretations);
      expect(result.success).toBe(true);
    });

    it('should require interpretations array', () => {
      const missingInterpretations = {
        needsClarification: false
      };

      const result = MultipleGameActionInterpretationsSchema.safeParse(missingInterpretations);
      expect(result.success).toBe(false);
    });

    it('should make clarificationMessage optional', () => {
      const withoutMessage = {
        interpretations: [
          { action: 'help', confidence: 0.9 }
        ],
        needsClarification: false
      };

      const result = MultipleGameActionInterpretationsSchema.safeParse(withoutMessage);
      expect(result.success).toBe(true);
    });
  });

  describe('ValidatedGameStateResponseSchema', () => {
    it('should enforce stricter validation', () => {
      const responseWithInvalidIds = {
        action: 'take',
        reasoning: 'Taking an item',
        stateChanges: {
          newLocation: '123invalid-location', // Invalid format
          addToInventory: ['valid_item', '456invalid-item']
        },
        response: 'You take the item.'
      };

      // Should pass basic schema
      const basicResult = GameStateResponseSchema.safeParse(responseWithInvalidIds);
      expect(basicResult.success).toBe(true);

      // Should fail validated schema
      const validatedResult = ValidatedGameStateResponseSchema.safeParse(responseWithInvalidIds);
      expect(validatedResult.success).toBe(false);
    });

    it('should reject empty responses', () => {
      const emptyResponse = {
        action: 'look',
        reasoning: 'Looking around',
        stateChanges: {},
        response: '' // Empty response
      };

      const result = ValidatedGameStateResponseSchema.safeParse(emptyResponse);
      expect(result.success).toBe(false);
    });

    it('should accept valid IDs', () => {
      const validResponse = {
        action: 'move',
        reasoning: 'Moving to kitchen',
        stateChanges: {
          newLocation: 'kitchen_area',
          addToInventory: ['cooking_knife'],
          setFlags: ['visited_kitchen']
        },
        response: 'You move to the kitchen area.'
      };

      const result = ValidatedGameStateResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('ID Validation Schemas', () => {
    describe('LocationIdSchema', () => {
      it('should accept valid location IDs', () => {
        const validIds = ['kitchen', 'main_hall', 'room-1', 'basement_Level2'];
        
        validIds.forEach(id => {
          const result = LocationIdSchema.safeParse(id);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid location IDs', () => {
        const invalidIds = ['123invalid', '-starts_with_dash', 'has spaces', 'has@symbol'];
        
        invalidIds.forEach(id => {
          const result = LocationIdSchema.safeParse(id);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('ItemIdSchema', () => {
      it('should accept valid item IDs', () => {
        const validIds = ['sword', 'magic_potion', 'key-1', 'healthPotion'];
        
        validIds.forEach(id => {
          const result = ItemIdSchema.safeParse(id);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid item IDs', () => {
        const invalidIds = ['9item', '_private', 'item$', ''];
        
        invalidIds.forEach(id => {
          const result = ItemIdSchema.safeParse(id);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('FlagNameSchema', () => {
      it('should accept valid flag names', () => {
        const validFlags = ['hasKey', 'door_opened', 'quest-complete', 'visited_Location'];
        
        validFlags.forEach(flag => {
          const result = FlagNameSchema.safeParse(flag);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid flag names', () => {
        const invalidFlags = ['0flag', '-flag', 'flag with spaces', 'flag!'];
        
        invalidFlags.forEach(flag => {
          const result = FlagNameSchema.safeParse(flag);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('Schema type inference', () => {
    it('should provide correct TypeScript types', () => {
      const validResponse = {
        action: 'examine' as const,
        reasoning: 'Player examining',
        stateChanges: {
          addToInventory: ['key']
        },
        response: 'You examine the object.'
      };

      const result = GameStateResponseSchema.parse(validResponse);
      
      // TypeScript should infer these types correctly
      expect(typeof result.action).toBe('string');
      expect(typeof result.reasoning).toBe('string');
      expect(typeof result.response).toBe('string');
      expect(Array.isArray(result.stateChanges.addToInventory)).toBe(true);
    });
  });
});