import { describe, it, expect } from 'vitest';
import { GameStateResponseParser } from '@/utils/gameStateResponseParser';
import { 
  GameActionInterpretationSchema
} from '@/schemas/gameStateResponses';

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
          addKnowledge: ['table_description']
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
        addKnowledge: []
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
          addKnowledge: ['kitchen_layout']
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
          addKnowledge: []
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
});