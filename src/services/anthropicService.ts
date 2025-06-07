import Anthropic from '@anthropic-ai/sdk';

export interface LLMResponse {
  action: string;
  reasoning: string;
  stateChanges: {
    newLocation?: string;
    addToInventory?: string[];
    removeFromInventory?: string[];
    setFlags?: string[];
    unsetFlags?: string[];
    addKnowledge?: string[];
  };
  response: string;
  error?: string;
}

/**
 * Generic LLM service for communicating with Anthropic's Claude API.
 * This service is agnostic to the specific prompt format or response parsing logic.
 */
export class AnthropicService {
  private client: Anthropic | null = null;
  private apiKey: string | null = null;
  private debugCallback?: (prompt: string, response: string) => void;

  constructor() {
    this.loadApiKey();
  }

  /**
   * Set debug callback for logging prompts and responses
   */
  public setDebugCallback(callback: (prompt: string, response: string) => void): void {
    this.debugCallback = callback;
  }

  /**
   * Load API key from environment or localStorage
   */
  private loadApiKey(): void {
    // Try environment variable first, then fall back to localStorage
    this.apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || localStorage.getItem('iffy_api_key');
    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // Enable browser usage
      });
    }
  }

  /**
   * Set API key and initialize client
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem('iffy_api_key', apiKey);
    this.client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  /**
   * Check if the service is configured with a valid API key
   */
  public isConfigured(): boolean {
    return this.client !== null && this.apiKey !== null;
  }

  /**
   * Send a prompt to the LLM and get the raw response text.
   * This method is agnostic to prompt format and response parsing.
   */
  public async sendPrompt(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic API not configured. Please set your API key in settings.');
    }

    try {
      // Log prompt to debug callback
      if (this.debugCallback) {
        this.debugCallback(prompt, '');
      }
      
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        // Use JSON mode for more reliable parsing
        system: "You must respond with valid JSON only. Do not include any text before or after the JSON object."
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from API');
      }

      // Log response to debug callback
      if (this.debugCallback) {
        this.debugCallback('', content.text);
      }

      return content.text;
    } catch (error) {
      console.error('Anthropic API error:', error);
      
      let errorMessage = 'Sorry, I\'m having trouble processing that command.';
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'API key is invalid. Please check your Anthropic API key in Settings.';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'API rate limit exceeded. Please wait a moment before trying again.';
        } else if (error.message.includes('402') || error.message.includes('insufficient')) {
          errorMessage = 'API quota exceeded. Please check your Anthropic account billing.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Process a command using a provided prompt builder and response parser.
   * This allows different game systems to use different prompt formats.
   */
  public async processCommand(
    command: string,
    gameState: any,
    story: any,
    currentLocation: any,
    promptBuilder: { buildPrompt: (command: string, gameState: any, story: any, currentLocation: any) => string },
    responseParser: { parseResponse: (responseText: string) => LLMResponse }
  ): Promise<LLMResponse> {
    try {
      const prompt = promptBuilder.buildPrompt(command, gameState, story, currentLocation);
      const responseText = await this.sendPrompt(prompt);
      return responseParser.parseResponse(responseText);
    } catch (error) {
      console.error('Command processing error:', error);
      
      // Return a structured error response
      return {
        action: 'error',
        reasoning: 'API call failed',
        stateChanges: {},
        response: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}