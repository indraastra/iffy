import { ZodSchema, ZodError } from 'zod';
import { 
  GameStateResponseSchema, 
  ValidatedGameStateResponseSchema,
  type GameStateResponse,
  type ValidatedGameStateResponse
} from '../schemas/gameStateResponses';

/**
 * Result type for safe parsing operations
 */
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: string;
}

/**
 * Safe parsing utility for game state LLM responses with comprehensive error handling.
 * This parser is specifically designed for interactive fiction game command processing.
 */
export class GameStateResponseParser {
  /**
   * Safely parse a game state response string into a validated GameStateResponse object
   */
  static safeParse(responseText: string, useValidation: boolean = false): ParseResult<GameStateResponse | ValidatedGameStateResponse> {
    try {
      console.log('Raw LLM response:', responseText);
      
      // Clean and prepare the response text
      const trimmedResponse = responseText.trim();
      
      // Try to parse as JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmedResponse);
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        return {
          success: false,
          error: 'Invalid JSON format in LLM response',
          fallback: 'narrative_mode'
        };
      }
      
      // Validate using the appropriate schema
      const schema = useValidation ? ValidatedGameStateResponseSchema : GameStateResponseSchema;
      const result = schema.safeParse(parsed);
      
      if (result.success) {
        console.log('Successfully parsed and validated LLM response:', result.data);
        return {
          success: true,
          data: result.data
        };
      } else {
        console.error('Schema validation failed:', result.error);
        return this.handleValidationError(result.error, parsed);
      }
      
    } catch (error) {
      console.error('Unexpected error during parsing:', error);
      return {
        success: false,
        error: `Unexpected parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fallback: 'narrative_mode'
      };
    }
  }
  
  /**
   * Handle validation errors and provide helpful fallbacks
   */
  private static handleValidationError(zodError: ZodError, _parsedData: unknown): ParseResult<never> {
    const issues = zodError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    
    // Try to provide a more specific error message based on the validation issues
    let fallbackType = 'narrative_mode';
    
    // Check for specific validation patterns
    if (zodError.issues.some(issue => issue.path.includes('action'))) {
      fallbackType = 'action_error';
    } else if (zodError.issues.some(issue => issue.path.includes('response'))) {
      fallbackType = 'response_error';
    }
    
    return {
      success: false,
      error: `Validation failed: ${issues}`,
      fallback: fallbackType
    };
  }
  
  /**
   * Parse with automatic fallback to a safe default response
   */
  static parseWithFallback(responseText: string): GameStateResponse {
    const result = this.safeParse(responseText);
    
    if (result.success && result.data) {
      return result.data as GameStateResponse;
    }
    
    // Return a safe fallback response
    console.warn('Using fallback response due to parsing failure:', result.error);
    return this.createFallbackResponse(result.error || 'Unknown parsing error', result.fallback);
  }
  
  /**
   * Create a safe fallback response when parsing fails
   */
  private static createFallbackResponse(_error: string, fallbackType?: string): GameStateResponse {
    let response: string;
    
    switch (fallbackType) {
      case 'action_error':
        response = 'I couldn\'t identify a valid action in your command. Try using actions like "examine", "take", "go", or "talk".';
        break;
      case 'response_error':
        response = 'The AI system had trouble generating a proper response. Please try your command again.';
        break;
      default:
        response = 'I had trouble understanding that command. The AI system seems to be having formatting issues. Could you try rephrasing your request?';
    }
    
    return {
      action: 'other',
      reasoning: 'Failed to parse LLM response',
      stateChanges: {
        newLocation: null,
        addToInventory: [],
        removeFromInventory: [],
        setFlags: [],
        unsetFlags: []
      },
      response
    };
  }
  
  /**
   * Validate a parsed object against the game state response schema without JSON parsing
   */
  static validateParsedObject(obj: unknown, useValidation: boolean = false): ParseResult<GameStateResponse | ValidatedGameStateResponse> {
    const schema = useValidation ? ValidatedGameStateResponseSchema : GameStateResponseSchema;
    const result = schema.safeParse(obj);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      return this.handleValidationError(result.error, obj);
    }
  }
  
  /**
   * Parse with custom schema for specialized use cases
   */
  static parseWithSchema<T>(responseText: string, schema: ZodSchema<T>): ParseResult<T> {
    try {
      const trimmedResponse = responseText.trim();
      const parsed = JSON.parse(trimmedResponse);
      const result = schema.safeParse(parsed);
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        const issues = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        return {
          success: false,
          error: `Schema validation failed: ${issues}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}