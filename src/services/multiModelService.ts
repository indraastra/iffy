import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { HumanMessage } from '@langchain/core/messages';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMProvider, LLMConfig, LLMResponse, DEFAULT_MODELS, getCheapestModel, calculateRequestCost, getModelPricing } from './llm/types';
import { z } from 'zod';

export interface LangChainMetrics {
  provider: LLMProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorType?: string;
  timestamp: Date;
}

export interface StreamingCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

class LangChainMetricsCallback extends BaseCallbackHandler {
  name = 'LangChainMetricsCallback';
  private startTime = 0;
  private provider: LLMProvider;
  private model: string;
  private metricsHandler: (metrics: LangChainMetrics) => void;
  public lastUsage: { input_tokens: number; output_tokens: number; total_tokens: number } | null = null;

  constructor(provider: LLMProvider, model: string, metricsHandler: (metrics: LangChainMetrics) => void) {
    super();
    this.provider = provider;
    this.model = model;
    this.metricsHandler = metricsHandler;
  }

  async handleLLMStart() {
    this.startTime = performance.now();
  }

  async handleLLMEnd(output: any) {
    const latencyMs = performance.now() - this.startTime;
    
    const { input_tokens, output_tokens, total_tokens } = MultiModelService.extractTokenUsage(output.llmOutput);
    
    // Store usage for retrieval by executeChain
    this.lastUsage = { input_tokens, output_tokens, total_tokens };

    // Debug logging when tokens are missing
    if (input_tokens === 0 && output_tokens === 0) {
      console.warn('⚠️ LangChain Metrics: No token usage found for', this.provider, this.model);
      console.warn('🔍 Available output keys:', Object.keys(output));
      if (output.usage_metadata) {
        console.warn('🔍 usage_metadata:', output.usage_metadata);
      }
      if (output.response_metadata) {
        console.warn('🔍 response_metadata:', output.response_metadata);
      }
      if (output.llmOutput) {
        console.warn('🔍 llmOutput keys:', Object.keys(output.llmOutput));
        console.warn('🔍 llmOutput content:', output.llmOutput);
      }
    }

    this.metricsHandler({
      provider: this.provider,
      model: this.model,
      promptTokens: input_tokens,
      completionTokens: output_tokens,
      totalTokens: total_tokens,
      latencyMs,
      success: true,
      timestamp: new Date()
    });
  }

  async handleLLMError(error: Error) {
    const latencyMs = performance.now() - this.startTime;
    
    this.metricsHandler({
      provider: this.provider,
      model: this.model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs,
      success: false,
      errorType: error.message,
      timestamp: new Date()
    });
  }
}

class StreamingCallback extends BaseCallbackHandler {
  name = 'StreamingCallback';
  private fullContent = '';
  private callbacks: StreamingCallbacks;

  constructor(callbacks: StreamingCallbacks) {
    super();
    this.callbacks = callbacks;
  }

  async handleLLMNewToken(token: string) {
    this.fullContent += token;
    if (this.callbacks.onToken) {
      this.callbacks.onToken(token);
    }
  }

  async handleLLMEnd() {
    if (this.callbacks.onComplete) {
      this.callbacks.onComplete(this.fullContent);
    }
  }

  async handleLLMError(error: Error) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }
}

export class MultiModelService {
  private currentModel: BaseChatModel | null = null;
  private costModel: BaseChatModel | null = null;
  private currentConfig: LLMConfig | null = null;
  private activeRequests: Set<AbortController> = new Set();
  private metricsCallback: LangChainMetricsCallback | null = null;
  private metricsHandler: ((metrics: LangChainMetrics) => void) | null = null;

  constructor() {
    this.loadSavedConfig();
  }

  private loadSavedConfig(): void {
    // Check if localStorage is available (browser environment)
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    const saved = localStorage.getItem('iffy_llm_config');
    if (saved) {
      try {
        const config = JSON.parse(saved) as LLMConfig;
        
        // Check if saved models exist in our pricing/config data
        const mainModelValid = getModelPricing(config.model, config.provider);
        const costModelValid = !config.costModel || getModelPricing(config.costModel, config.provider);
        
        if (!mainModelValid || !costModelValid) {
          console.warn(`Found unknown model configuration (quality: ${config.model}, cost: ${config.costModel}), clearing cache and using defaults`);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('iffy_llm_config');
          }
          return;
        }
        
        this.setConfig(config);
      } catch (e) {
        console.error('Failed to load saved LLM config:', e);
      }
    }
  }

  public setConfig(config: LLMConfig): void {
    this.cancelActiveRequests();
    
    // Ensure cost model is set to cheapest option if not specified
    if (!config.costModel) {
      config.costModel = getCheapestModel(config.provider);
    }
    
    this.currentConfig = config;
    
    // Save to localStorage if available
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('iffy_llm_config', JSON.stringify(config));
    }
    
    try {
      this.currentModel = this.createModel(config);
      this.costModel = this.createCostModel(config);
      this.setupMetricsCallback();
    } catch (error) {
      this.currentModel = null;
      this.costModel = null;
      throw error;
    }
  }

  public clearConfig(): void {
    this.cancelActiveRequests();
    this.currentConfig = null;
    this.currentModel = null;
    this.costModel = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('iffy_llm_config');
    }
  }

  public setMetricsHandler(handler: (metrics: LangChainMetrics) => void): void {
    this.metricsHandler = handler;
    this.setupMetricsCallback();
  }

  private setupMetricsCallback(): void {
    if (this.currentConfig && this.metricsHandler) {
      this.metricsCallback = new LangChainMetricsCallback(
        this.currentConfig.provider,
        this.currentConfig.model,
        this.metricsHandler
      );
    }
  }

  private createModel(config: LLMConfig): BaseChatModel {
    return this.createModelWithSettings(config.provider, config.model, config.apiKey);
  }

  private createCostModel(config: LLMConfig): BaseChatModel {
    const costModel = config.costModel || getCheapestModel(config.provider);
    return this.createModelWithSettings(config.provider, costModel, config.apiKey, 0.3); // Lower default for cost model
  }


  private createModelWithSettings(provider: LLMProvider, model: string, apiKey: string, temperature: number = 0.7): BaseChatModel {
    switch (provider) {
      case 'anthropic':
        return new ChatAnthropic({
          anthropicApiKey: apiKey,
          model: model,
          temperature: temperature,
          maxTokens: 4000,
        });
        
      case 'openai':
        return new ChatOpenAI({
          openAIApiKey: apiKey,
          model: model,
          temperature: temperature,
          maxTokens: 4000,
        });
        
      case 'google':
        return new ChatGoogleGenerativeAI({
          apiKey: apiKey,
          model: model,
          temperature: temperature,
          maxOutputTokens: 4000,
        });
        
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  public isConfigured(): boolean {
    return this.currentModel !== null && this.currentConfig !== null;
  }

  public getConfig(): LLMConfig | null {
    return this.currentConfig;
  }

  public async makeRequest(prompt: string): Promise<string> {
    const response = await this.makeRequestWithUsage(prompt);
    return response.content;
  }

  public async makeRequestWithUsage(prompt: string, options: { temperature?: number } = {}): Promise<LLMResponse> {
    return this.makeRequestWithModel(prompt, this.currentModel, options);
  }

  public async makeStreamingRequest(prompt: string, streamingCallbacks: StreamingCallbacks): Promise<LLMResponse> {
    if (!this.currentModel || !this.currentConfig) {
      throw new Error('No model configured. Please set up your API key in Settings.');
    }

    const abortController = new AbortController();
    this.activeRequests.add(abortController);

    try {
      const callbacks = [];
      
      // Add streaming callback
      const streamingCallback = new StreamingCallback(streamingCallbacks);
      callbacks.push(streamingCallback);
      
      // Add metrics callback if configured
      if (this.metricsCallback) {
        callbacks.push(this.metricsCallback);
      }

      const response = await this.currentModel.invoke(
        [new HumanMessage(prompt)],
        { 
          signal: abortController.signal,
          callbacks
        }
      );

      return this.parseResponse(response);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      
      // Also notify streaming error callback
      if (streamingCallbacks.onError) {
        streamingCallbacks.onError(this.normalizeError(error));
      }
      
      throw this.normalizeError(error);
    } finally {
      this.activeRequests.delete(abortController);
    }
  }

  public async makeCostRequestWithUsage(prompt: string, options: { temperature?: number } = {}): Promise<LLMResponse> {
    return this.makeRequestWithModel(prompt, this.costModel, options);
  }

  /**
   * Make a structured output request with any model
   * Returns typed data according to the provided Zod schema
   */
  public async makeStructuredRequest<T>(
    prompt: string, 
    schema: z.ZodSchema<T>,
    options: { useCostModel?: boolean; temperature?: number } = {}
  ): Promise<{ data: T; usage: LLMResponse['usage'] }> {
    const model = options.useCostModel ? this.costModel : this.currentModel;
    const modelName = options.useCostModel ? 
      (this.currentConfig?.costModel || 'cost') : 
      (this.currentConfig?.model || 'quality');
    
    if (!model || !this.currentConfig) {
      throw new Error('No model configured. Please set up your API key in Settings.');
    }

    const abortController = new AbortController();
    this.activeRequests.add(abortController);

    try {
      // Create a custom metrics callback to capture usage for this specific request
      let capturedUsage: { input_tokens: number; output_tokens: number; total_tokens: number } | null = null;
      
      const metricsCapture = new LangChainMetricsCallback(
        this.currentConfig.provider,
        modelName,
        (metrics) => {
          // Capture the usage data
          capturedUsage = {
            input_tokens: metrics.promptTokens,
            output_tokens: metrics.completionTokens,
            total_tokens: metrics.totalTokens
          };
          // Also call the global handler if set
          if (this.metricsHandler) {
            this.metricsHandler(metrics);
          }
        }
      );
      
      // Use structured output with the appropriate model
      // If temperature override is specified, create a new model instance with that temperature
      let modelToUse = model;
      if (options.temperature !== undefined) {
        const config = this.currentConfig!;
        const modelName = options.useCostModel ? (config.costModel || getCheapestModel(config.provider)) : config.model;
        modelToUse = this.createModelWithSettings(config.provider, modelName, config.apiKey, options.temperature);
      }
      
      const structuredModel = modelToUse.withStructuredOutput(schema);
      const callbacks = [metricsCapture];
      
      const invokeOptions: any = { 
        signal: abortController.signal,
        callbacks
      };
      
      const response = await structuredModel.invoke(
        [new HumanMessage(prompt)],
        invokeOptions
      );

      // Use captured usage or fall back to estimation
      const usage = capturedUsage || {
        input_tokens: Math.ceil(prompt.length / 4),
        output_tokens: Math.ceil(JSON.stringify(response).length / 4),
        total_tokens: 0
      };
      
      if (!capturedUsage) {
        usage.total_tokens = usage.input_tokens + usage.output_tokens;
        console.warn('Token usage not captured from LangChain, using estimation');
      }

      return {
        data: response as T,
        usage
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw this.normalizeError(error);
    } finally {
      this.activeRequests.delete(abortController);
    }
  }

  /**
   * Convenience method for structured cost-optimized requests
   */
  public async makeStructuredCostRequest<T>(prompt: string, schema: z.ZodSchema<T>, options: { temperature?: number } = {}): Promise<{ data: T; usage: LLMResponse['usage'] }> {
    return this.makeStructuredRequest(prompt, schema, { useCostModel: true, ...options });
  }

  private async makeRequestWithModel(prompt: string, model: BaseChatModel | null, options: { temperature?: number } = {}): Promise<LLMResponse> {
    if (!model || !this.currentConfig) {
      throw new Error('No model configured. Please set up your API key in Settings.');
    }

    const abortController = new AbortController();
    this.activeRequests.add(abortController);

    try {
      const callbacks = this.metricsCallback ? [this.metricsCallback] : [];
      const invokeOptions: any = { 
        signal: abortController.signal,
        callbacks
      };
      
      // Add temperature override if specified
      if (options.temperature !== undefined) {
        invokeOptions.temperature = options.temperature;
      }
      
      const response = await model.invoke(
        [new HumanMessage(prompt)],
        invokeOptions
      );

      return this.parseResponse(response);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw this.normalizeError(error);
    } finally {
      this.activeRequests.delete(abortController);
    }
  }


  private parseResponse(response: any): LLMResponse {
    const content = response.content || '';
    const usage = MultiModelService.extractTokenUsage(response);

    return {
      content,
      usage
    };
  }

  /**
   * Extract token usage from LangChain response object
   * Handles different response formats across providers
   */
  public static extractTokenUsage(response: any): { input_tokens: number; output_tokens: number; total_tokens: number } {
    // Check common locations for token usage data
    let usage = response.usage_metadata || response.usage || response.tokenUsage || {};
    
    // If not found, check response_metadata (OpenAI pattern)
    if (!usage.input_tokens && !usage.output_tokens && !usage.prompt_tokens && !usage.completion_tokens) {
      const metadata = response.response_metadata || {};
      usage = metadata.token_usage || metadata.usage || usage;
    }

    // Normalize token field names across providers
    const inputTokens = usage.input_tokens || usage.prompt_tokens || usage.promptTokens || 0;
    const outputTokens = usage.output_tokens || usage.completion_tokens || usage.completionTokens || 0;
    const totalTokens = usage.total_tokens || usage.totalTokens || (inputTokens + outputTokens);

    return {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens
    };
  }

  private normalizeError(error: any): Error {
    const message = error.message || 'Unknown error';
    
    if (message.includes('401') || message.includes('Unauthorized')) {
      return new Error('Invalid API key. Please check your settings.');
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return new Error('Rate limit exceeded. Please wait a moment.');
    }
    if (message.includes('402') || message.includes('insufficient')) {
      return new Error('API quota exceeded. Please check your billing.');
    }
    
    return new Error(`LLM Error: ${message}`);
  }

  public cancelActiveRequests(): void {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }

  // Helper methods for UI
  public static getProviderDisplayName(provider: LLMProvider): string {
    const names = {
      anthropic: 'Anthropic (Claude)',
      openai: 'OpenAI (GPT)',
      google: 'Google (Gemini)'
    };
    return names[provider];
  }

  public static getDefaultModel(provider: LLMProvider): string {
    return DEFAULT_MODELS[provider];
  }

  /**
   * Calculate cost for a request
   */
  public calculateCost(inputTokens: number, outputTokens: number, model?: string): number {
    if (!this.currentConfig) return 0;
    
    const targetModel = model || this.currentConfig.model;
    return calculateRequestCost(targetModel, this.currentConfig.provider, inputTokens, outputTokens);
  }

  /**
   * Calculate cost for a cost-optimized request
   */
  public calculateCostModelCost(inputTokens: number, outputTokens: number): number {
    if (!this.currentConfig) return 0;
    
    const costModel = this.currentConfig.costModel || getCheapestModel(this.currentConfig.provider);
    return calculateRequestCost(costModel, this.currentConfig.provider, inputTokens, outputTokens);
  }

  /**
   * Create a LangChain chain using the current model
   */
  public createChain(promptTemplate: PromptTemplate): LLMChain {
    if (!this.currentModel) {
      throw new Error('No model configured. Please set up your API key in Settings.');
    }

    return new LLMChain({
      llm: this.currentModel,
      prompt: promptTemplate,
      callbacks: this.metricsCallback ? [this.metricsCallback] : []
    });
  }

  /**
   * Create a LangChain chain using the cost model (cheaper)
   */
  public createCostChain(promptTemplate: PromptTemplate): LLMChain {
    if (!this.costModel) {
      throw new Error('No cost model configured. Please set up your API key in Settings.');
    }

    return new LLMChain({
      llm: this.costModel,
      prompt: promptTemplate,
      callbacks: this.metricsCallback ? [this.metricsCallback] : []
    });
  }

  /**
   * Execute a chain and return response with usage tracking
   */
  public async executeChain(
    chain: LLMChain, 
    inputs: Record<string, any>,
    signal?: AbortSignal
  ): Promise<{ text: string; usage?: any }> {
    const abortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
    }
    this.activeRequests.add(abortController);

    try {
      // Include metrics callback if available
      const callbacks = this.metricsCallback ? [this.metricsCallback] : [];
      
      const result = await chain.call(inputs, {
        callbacks
      });

      // Get usage from metrics callback if available
      const usage = this.metricsCallback?.lastUsage || result.usage;

      return {
        text: result.text || result.response || '',
        usage
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw this.normalizeError(error);
    } finally {
      this.activeRequests.delete(abortController);
    }
  }

  /**
   * Get the underlying LangChain model for direct use (if needed)
   */
  public getModel(): BaseChatModel | null {
    return this.currentModel;
  }

  /**
   * Get the cost model for direct use (if needed)
   */
  public getCostModel(): BaseChatModel | null {
    return this.costModel;
  }

  /**
   * Get pricing information for the current models
   */
  public getCurrentPricing(): { quality: any; cost: any } | null {
    if (!this.currentConfig) return null;
    
    const qualityPricing = getModelPricing(this.currentConfig.model, this.currentConfig.provider);
    const costModel = this.currentConfig.costModel || getCheapestModel(this.currentConfig.provider);
    const costPricing = getModelPricing(costModel, this.currentConfig.provider);
    
    return {
      quality: {
        model: this.currentConfig.model,
        pricing: qualityPricing
      },
      cost: {
        model: costModel,
        pricing: costPricing
      }
    };
  }
}