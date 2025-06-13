import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { HumanMessage } from '@langchain/core/messages';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
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

    // Debug logging when tokens are missing
    if (input_tokens === 0 && output_tokens === 0) {
      console.warn('🔍 LangChain Metrics: No token usage found for', this.provider, this.model);
      console.warn('🔍 Available output keys:', Object.keys(output));
      if (output.usage_metadata) {
        console.warn('🔍 usage_metadata:', output.usage_metadata);
      }
      if (output.response_metadata) {
        console.warn('🔍 response_metadata:', output.response_metadata);
      }
      if (output.llmOutput) {
        console.warn('🔍 llmOutput:', output.llmOutput);
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
  private memoryModel: BaseChatModel | null = null;
  private currentConfig: LLMConfig | null = null;
  private activeRequests: Set<AbortController> = new Set();
  private metricsCallback: LangChainMetricsCallback | null = null;
  private metricsHandler: ((metrics: LangChainMetrics) => void) | null = null;

  constructor() {
    this.loadSavedConfig();
  }

  private loadSavedConfig(): void {
    const saved = localStorage.getItem('iffy_llm_config');
    if (saved) {
      try {
        const config = JSON.parse(saved) as LLMConfig;
        
        // Check if saved models exist in our pricing/config data
        const mainModelValid = getModelPricing(config.model, config.provider);
        const memoryModelValid = !config.memoryModel || getModelPricing(config.memoryModel, config.provider);
        
        if (!mainModelValid || !memoryModelValid) {
          console.warn(`Found unknown model configuration (main: ${config.model}, memory: ${config.memoryModel}), clearing cache and using defaults`);
          localStorage.removeItem('iffy_llm_config');
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
    
    // Ensure memory model is set to cheapest option if not specified
    if (!config.memoryModel) {
      config.memoryModel = getCheapestModel(config.provider);
    }
    
    this.currentConfig = config;
    localStorage.setItem('iffy_llm_config', JSON.stringify(config));
    
    try {
      this.currentModel = this.createModel(config);
      this.memoryModel = this.createModelForMemory(config);
      this.setupMetricsCallback();
    } catch (error) {
      this.currentModel = null;
      this.memoryModel = null;
      throw error;
    }
  }

  public clearConfig(): void {
    this.cancelActiveRequests();
    this.currentConfig = null;
    this.currentModel = null;
    this.memoryModel = null;
    localStorage.removeItem('iffy_llm_config');
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

  private createModelForMemory(config: LLMConfig): BaseChatModel {
    const memoryModel = config.memoryModel || getCheapestModel(config.provider);
    return this.createModelWithSettings(config.provider, memoryModel, config.apiKey);
  }

  private createModelWithSettings(provider: LLMProvider, model: string, apiKey: string): BaseChatModel {
    switch (provider) {
      case 'anthropic':
        return new ChatAnthropic({
          anthropicApiKey: apiKey,
          model: model,
          temperature: 0.7,
          maxTokens: 4000,
        });
        
      case 'openai':
        return new ChatOpenAI({
          openAIApiKey: apiKey,
          model: model,
          temperature: 0.7,
          maxTokens: 4000,
        });
        
      case 'google':
        return new ChatGoogleGenerativeAI({
          apiKey: apiKey,
          model: model,
          temperature: 0.7,
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

  public async makeRequestWithUsage(prompt: string): Promise<LLMResponse> {
    return this.makeRequestWithModel(prompt, this.currentModel);
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

  public async makeMemoryRequestWithUsage(prompt: string): Promise<LLMResponse> {
    return this.makeRequestWithModel(prompt, this.memoryModel);
  }

  public async makeStructuredMemoryRequest<T>(prompt: string, schema: z.ZodSchema<T>): Promise<{ data: T; usage: LLMResponse['usage'] }> {
    if (!this.memoryModel || !this.currentConfig) {
      throw new Error('No model configured. Please set up your API key in Settings.');
    }

    const abortController = new AbortController();
    this.activeRequests.add(abortController);

    try {
      // Use structured output with the memory model
      const structuredModel = this.memoryModel.withStructuredOutput(schema);
      const callbacks = this.metricsCallback ? [this.metricsCallback] : [];
      
      const response = await structuredModel.invoke(
        [new HumanMessage(prompt)],
        { 
          signal: abortController.signal,
          callbacks
        }
      );

      // For structured output, we need to get usage metadata from the underlying response
      // This is a bit tricky with LangChain's structured output, so we'll estimate based on the prompt
      const estimatedUsage = {
        input_tokens: Math.ceil(prompt.length / 4), // Rough estimate: 4 chars per token
        output_tokens: Math.ceil(JSON.stringify(response).length / 4),
        total_tokens: 0
      };
      estimatedUsage.total_tokens = estimatedUsage.input_tokens + estimatedUsage.output_tokens;

      return {
        data: response as T,
        usage: estimatedUsage
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

  private async makeRequestWithModel(prompt: string, model: BaseChatModel | null): Promise<LLMResponse> {
    if (!model || !this.currentConfig) {
      throw new Error('No model configured. Please set up your API key in Settings.');
    }

    const abortController = new AbortController();
    this.activeRequests.add(abortController);

    try {
      const callbacks = this.metricsCallback ? [this.metricsCallback] : [];
      const response = await model.invoke(
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
   * Calculate cost for a memory request
   */
  public calculateMemoryCost(inputTokens: number, outputTokens: number): number {
    if (!this.currentConfig) return 0;
    
    const memoryModel = this.currentConfig.memoryModel || getCheapestModel(this.currentConfig.provider);
    return calculateRequestCost(memoryModel, this.currentConfig.provider, inputTokens, outputTokens);
  }

  /**
   * Get pricing information for the current models
   */
  public getCurrentPricing(): { main: any; memory: any } | null {
    if (!this.currentConfig) return null;
    
    const mainPricing = getModelPricing(this.currentConfig.model, this.currentConfig.provider);
    const memoryModel = this.currentConfig.memoryModel || getCheapestModel(this.currentConfig.provider);
    const memoryPricing = getModelPricing(memoryModel, this.currentConfig.provider);
    
    return {
      main: {
        model: this.currentConfig.model,
        pricing: mainPricing
      },
      memory: {
        model: memoryModel,
        pricing: memoryPricing
      }
    };
  }
}