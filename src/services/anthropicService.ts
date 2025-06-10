import Anthropic from '@anthropic-ai/sdk';


/**
 * Generic LLM service for communicating with Anthropic's Claude API.
 * This service is agnostic to the specific prompt format or response parsing logic.
 */
export class AnthropicService {
  private client: Anthropic | null = null;
  private apiKey: string | null = null;
  private activeRequestController: AbortController | null = null;

  constructor() {
    this.loadApiKey();
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
   * Generic request method for custom prompts with options
   */
  public async makeRequest(prompt: string, options?: { model?: string }): Promise<string> {
    const result = await this.makeRequestWithUsage(prompt, options);
    return result.content;
  }

  /**
   * Make request and return full response with usage information
   */
  public async makeRequestWithUsage(prompt: string, options?: { model?: string }): Promise<{
    content: string;
    usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  }> {
    if (!this.client) {
      throw new Error('Anthropic API not configured. Please set your API key in settings.');
    }

    // Cancel any existing request
    this.cancelActiveRequests();

    // Create new abort controller for this request
    this.activeRequestController = new AbortController();

    // Model fallback order - if one fails due to overload, try the next
    const modelFallbacks = [
      options?.model || 'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307'
    ];

    let lastError: any = null;

    for (let i = 0; i < modelFallbacks.length; i++) {
      const model = modelFallbacks[i];
      
      try {
        const response = await this.makeRequestWithRetry({
          model,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        });

        if (response.content && response.content.length > 0) {
          const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
          
          // Log successful fallback if not using the first model
          if (i > 0) {
            console.log(`✅ Request succeeded with fallback model: ${model}`);
          }
          
          return {
            content: responseText,
            usage: {
              input_tokens: response.usage.input_tokens,
              output_tokens: response.usage.output_tokens,
              total_tokens: response.usage.input_tokens + response.usage.output_tokens
            }
          };
        } else {
          throw new Error('No response content received from Claude');
        }
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled');
        }

        // Check if this is a server overload error that we can retry with a different model
        const isOverloadError = error.message?.includes('overload') || 
                               error.message?.includes('server_error') ||
                               error.message?.includes('503') ||
                               error.message?.includes('502') ||
                               error.message?.includes('429');

        if (isOverloadError && i < modelFallbacks.length - 1) {
          console.log(`⚠️ Model ${model} overloaded, trying fallback: ${modelFallbacks[i + 1]}`);
          // Add a small delay before trying the next model
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // If not an overload error or no more fallbacks, throw the error
        if (i === modelFallbacks.length - 1) {
          break;
        }
      }
    }

    // All models failed, throw the last error
    this.activeRequestController = null;
    throw lastError || new Error('All model fallbacks failed');
  }

  /**
   * Make request with exponential backoff retry
   */
  private async makeRequestWithRetry(requestParams: any, maxRetries: number = 3): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.client!.messages.create(requestParams, {
          signal: this.activeRequestController?.signal
        });
      } catch (error: any) {
        const isRetryableError = error.message?.includes('overload') || 
                                error.message?.includes('server_error') ||
                                error.message?.includes('503') ||
                                error.message?.includes('502');

        if (isRetryableError && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`🔄 Retrying request in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }
  }


  /**
   * Cancel any ongoing requests
   */
  public cancelActiveRequests(): void {
    if (this.activeRequestController) {
      this.activeRequestController.abort();
      this.activeRequestController = null;
    }
  }

  /**
   * Send a prompt to the LLM and get the raw response text.
   * This method is agnostic to prompt format and response parsing.
   * 
   * @deprecated Use makeRequest instead for better error handling and model fallbacks
   */
  public async sendPrompt(prompt: string): Promise<string> {
    // Delegate to the improved makeRequest method with JSON system prompt
    try {
      console.log('🤖 LLM REQUEST:', prompt);
      
      // Use makeRequest which has model fallbacks and retry logic
      const response = await this.makeRequest(prompt + '\n\nIMPORTANT: You must respond with valid JSON only. Do not include any text before or after the JSON object.');
      
      return response;
    } catch (error) {
      // Let configuration errors pass through unchanged
      if (error instanceof Error && error.message.includes('Anthropic API not configured')) {
        throw error;
      }

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
        } else if (error.message.includes('overload') || error.message.includes('server_error')) {
          errorMessage = 'Server temporarily overloaded. The request was automatically retried with fallback models, but all failed. Please try again in a moment.';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

}