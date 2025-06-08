import { describe, it, expect } from 'vitest';
import { GameStateResponseParser } from '../utils/gameStateResponseParser';
import { 
  GameStateResponseSchema,
  ValidatedGameStateResponseSchema,
  GameActionInterpretationSchema,
  MultipleGameActionInterpretationsSchema,
  GameStateChangesSchema,
  LocationIdSchema,
  ItemIdSchema,
  FlagNameSchema
} from '../schemas/gameStateResponses';

describe('Game State', () => {
  describe('GameStateResponseParser', () => {
    describe('safeParse', () => {
      it('should parse valid LLM response successfully', () => {
        const validResponse = JSON.stringify({
          action: 'examine',
          reasoning: 'Player wants to examine an object',
          stateChanges: {
            newLocation: null,
            addToInventory: [],
            removeFromInventory: [],
            setFlags: ['examined_table'],
            unsetFlags: [],
          },
          response: 'You examine the wooden table carefully.'
        });

        const result = GameStateResponseParser.safeParse(validResponse);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.action).toBe('examine');
        expect(result.data?.reasoning).toBe('Player wants to examine an object');
        expect(result.data?.response).toBe('You examine the wooden table carefully.');
      });

      it('should handle invalid JSON gracefully', () => {
        const invalidJson = '{ "action": "examine", "reasoning": "test" '; // Missing closing brace
        
        const result = GameStateResponseParser.safeParse(invalidJson);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid JSON format');
        expect(result.fallback).toBe('narrative_mode');
      });

      it('should handle missing required fields', () => {
        const incompleteResponse = JSON.stringify({
          action: 'examine',
          reasoning: 'Player examining',
          // Missing response field
          stateChanges: {}
        });

        const result = GameStateResponseParser.safeParse(incompleteResponse);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should handle invalid action type', () => {
        const invalidActionResponse = JSON.stringify({
          action: 'invalid_action',
          reasoning: 'Test reasoning',
          stateChanges: {},
          response: 'Test response'
        });

        const result = GameStateResponseParser.safeParse(invalidActionResponse);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });

      it('should use validated schema when requested', () => {
        const responseWithInvalidIds = JSON.stringify({
          action: 'take',
          reasoning: 'Taking an item',
          stateChanges: {
            addToInventory: ['123invalid-id'], // Invalid ID format
          },
          response: 'You take the item.'
        });

        // Should pass with basic schema
        const basicResult = GameStateResponseParser.safeParse(responseWithInvalidIds, false);
        expect(basicResult.success).toBe(true);

        // Should fail with validated schema
        const validatedResult = GameStateResponseParser.safeParse(responseWithInvalidIds, true);
        expect(validatedResult.success).toBe(false);
      });
    });

    describe('parseWithFallback', () => {
      it('should return parsed data on success', () => {
        const validResponse = JSON.stringify({
          action: 'look',
          reasoning: 'Player is looking around',
          stateChanges: {},
          response: 'You look around the room.'
        });

        const result = GameStateResponseParser.parseWithFallback(validResponse);
        
        expect(result.action).toBe('look');
        expect(result.response).toBe('You look around the room.');
      });

      it('should return fallback response on parsing failure', () => {
        const invalidResponse = 'not json at all';
        
        const result = GameStateResponseParser.parseWithFallback(invalidResponse);
        
        expect(result.action).toBe('other');
        expect(result.reasoning).toBe('Failed to parse LLM response');
        expect(result.response).toContain('trouble understanding');
        expect(result.stateChanges).toEqual({
          newLocation: null,
          addToInventory: [],
          removeFromInventory: [],
          setFlags: [],
          unsetFlags: [],
        });
      });

      it('should provide specific error messages for action validation failures', () => {
        const invalidActionResponse = JSON.stringify({
          action: 'jump', // Invalid action
          reasoning: 'Player wants to jump',
          stateChanges: {},
          response: 'You jump.'
        });

        const result = GameStateResponseParser.parseWithFallback(invalidActionResponse);
        
        expect(result.action).toBe('other');
        // The fallback should include helpful guidance about valid actions
        expect(result.response).toContain('valid action');
      });
    });

    describe('validateParsedObject', () => {
      it('should validate pre-parsed objects', () => {
        const validObject = {
          action: 'inventory',
          reasoning: 'Player checking inventory',
          stateChanges: {
            addToInventory: ['sword']
          },
          response: 'You check your inventory.'
        };

        const result = GameStateResponseParser.validateParsedObject(validObject);
        
        expect(result.success).toBe(true);
        expect(result.data?.action).toBe('inventory');
      });

      it('should reject invalid objects', () => {
        const invalidObject = {
          action: 'invalid',
          // Missing required fields
        };

        const result = GameStateResponseParser.validateParsedObject(invalidObject);
        
        expect(result.success).toBe(false);
      });
    });

    describe('parseWithSchema', () => {
      it('should parse with custom schemas', () => {
        const actionResponse = JSON.stringify({
          action: 'take',
          target: 'sword',
          confidence: 0.9
        });

        const result = GameStateResponseParser.parseWithSchema(actionResponse, GameActionInterpretationSchema);
        
        expect(result.success).toBe(true);
        expect(result.data?.action).toBe('take');
        expect(result.data?.target).toBe('sword');
        expect(result.data?.confidence).toBe(0.9);
      });

      it('should handle custom schema validation failures', () => {
        const invalidActionResponse = JSON.stringify({
          action: 'take',
          confidence: 1.5 // Invalid confidence (> 1)
        });

        const result = GameStateResponseParser.parseWithSchema(invalidActionResponse, GameActionInterpretationSchema);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Schema validation failed');
      });
    });

    describe('Error handling edge cases', () => {
      it('should handle empty strings', () => {
        const result = GameStateResponseParser.safeParse('');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid JSON format');
      });

      it('should handle whitespace-only strings', () => {
        const result = GameStateResponseParser.safeParse('   \n\t   ');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid JSON format');
      });

      it('should handle null values gracefully', () => {
        const responseWithNull = JSON.stringify({
          action: 'look',
          reasoning: null, // Should be string
          stateChanges: {},
          response: 'Test response'
        });

        const result = GameStateResponseParser.safeParse(responseWithNull);
        
        expect(result.success).toBe(false);
      });

      it('should handle deeply nested invalid data', () => {
        const responseWithInvalidNested = JSON.stringify({
          action: 'move',
          reasoning: 'Moving to location',
          stateChanges: {
            newLocation: { invalid: 'object' }, // Should be string
            addToInventory: 'not_an_array'      // Should be array
          },
          response: 'You move.'
        });

        const result = GameStateResponseParser.safeParse(responseWithInvalidNested);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
      });
    });

    describe('State changes validation', () => {
      it('should accept valid state changes', () => {
        const validStateChanges = JSON.stringify({
          action: 'take',
          reasoning: 'Taking multiple items',
          stateChanges: {
            newLocation: 'kitchen',
            addToInventory: ['apple', 'knife'],
            removeFromInventory: ['old_key'],
            setFlags: ['has_apple', 'visited_kitchen'],
            unsetFlags: ['hungry'],
          },
          response: 'You take the items and move to the kitchen.'
        });

        const result = GameStateResponseParser.safeParse(validStateChanges);
        
        expect(result.success).toBe(true);
        expect(result.data?.stateChanges.addToInventory).toEqual(['apple', 'knife']);
        expect(result.data?.stateChanges.setFlags).toEqual(['has_apple', 'visited_kitchen']);
      });

      it('should handle empty arrays in state changes', () => {
        const emptyStateChanges = JSON.stringify({
          action: 'look',
          reasoning: 'Just looking',
          stateChanges: {
            addToInventory: [],
            removeFromInventory: [],
            setFlags: [],
            unsetFlags: [],
          },
          response: 'You look around.'
        });

        const result = GameStateResponseParser.safeParse(emptyStateChanges);
        
        expect(result.success).toBe(true);
        expect(result.data?.stateChanges.addToInventory).toEqual([]);
      });

      it('should handle optional state change fields', () => {
        const minimalStateChanges = JSON.stringify({
          action: 'help',
          reasoning: 'Showing help',
          stateChanges: {},
          response: 'Here are the available commands...'
        });

        const result = GameStateResponseParser.safeParse(minimalStateChanges);
        
        expect(result.success).toBe(true);
        expect(result.data?.stateChanges.addToInventory).toEqual([]);
        expect(result.data?.stateChanges.setFlags).toEqual([]);
      });
    });
  })

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
  })
})