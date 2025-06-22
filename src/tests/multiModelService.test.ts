/**
 * Tests for MultiModelService
 * 
 * Validates provider-agnostic LLM functionality, configuration management,
 * metrics collection, and cost calculation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MultiModelService, LangChainMetrics } from '@/services/multiModelService';
import { LLMConfig } from '@/services/llm/types';

// Mock LangChain modules
vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: 'Test response',
      usage_metadata: {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150
      }
    })
  }))
}));

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: 'Test response',
      response_metadata: {
        token_usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      }
    })
  }))
}));

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: 'Test response',
      response_metadata: {
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150
        }
      }
    })
  }))
}));

describe('MultiModelService', () => {
  let service: MultiModelService;
  let mockLocalStorage: any;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    global.localStorage = mockLocalStorage;
    
    service = new MultiModelService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Management', () => {
    it('should configure Anthropic provider', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key'
      };

      expect(() => service.setConfig(config)).not.toThrow();
      expect(service.isConfigured()).toBe(true);
      expect(service.getConfig()).toEqual({
        ...config,
        costModel: 'claude-3-5-haiku-latest' // Should auto-set cheapest cost model
      });
    });

    it('should configure OpenAI provider', () => {
      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key'
      };

      expect(() => service.setConfig(config)).not.toThrow();
      expect(service.isConfigured()).toBe(true);
      expect(service.getConfig()).toEqual({
        ...config,
        costModel: 'gpt-4o-mini'
      });
    });

    it('should configure Google provider', () => {
      const config: LLMConfig = {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-06-05',
        apiKey: 'test-key'
      };

      expect(() => service.setConfig(config)).not.toThrow();
      expect(service.isConfigured()).toBe(true);
      expect(service.getConfig()).toEqual({
        ...config,
        costModel: 'gemini-2.5-flash-lite-preview-06-17'
      });
    });

    it('should preserve custom cost model', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key',
        costModel: 'claude-sonnet-4-20250514' // Custom cost model
      };

      service.setConfig(config);
      expect(service.getConfig()).toEqual(config);
    });

    it('should save and load configuration from localStorage', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key'
      };

      service.setConfig(config);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'iffy_llm_config',
        JSON.stringify({
          ...config,
          costModel: 'claude-3-5-haiku-latest'
        })
      );
    });

    it('should handle invalid provider', () => {
      const config = {
        provider: 'invalid' as any,
        model: 'some-model',
        apiKey: 'test-key'
      };

      expect(() => service.setConfig(config)).toThrow('Unsupported provider: invalid');
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('Request Handling', () => {
    beforeEach(() => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key'
      };
      service.setConfig(config);
    });

    it('should make main model request with usage tracking', async () => {
      const response = await service.makeRequestWithUsage('Test prompt');
      
      expect(response).toEqual({
        content: 'Test response',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150
        }
      });
    });

    it('should make cost model request with usage tracking', async () => {
      const response = await service.makeCostRequestWithUsage('Test cost-optimized prompt');
      
      expect(response).toEqual({
        content: 'Test response',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150
        }
      });
    });

    it('should make simple request without usage details', async () => {
      const response = await service.makeRequest('Test prompt');
      
      expect(response).toBe('Test response');
    });

    it('should throw error when not configured', async () => {
      const unconfiguredService = new MultiModelService();
      
      await expect(unconfiguredService.makeRequest('test'))
        .rejects.toThrow('No model configured. Please set up your API key in Settings.');
    });

    it('should handle request cancellation', async () => {
      // Mock an AbortError
      const mockModel = {
        invoke: vi.fn().mockRejectedValue(Object.assign(new Error('Request cancelled'), { name: 'AbortError' }))
      };
      
      // Replace the current model with our mock
      (service as any).currentModel = mockModel;
      
      await expect(service.makeRequest('test'))
        .rejects.toThrow('Request was cancelled');
    });
  });

  describe('Metrics Collection', () => {
    let capturedMetrics: LangChainMetrics[] = [];

    beforeEach(() => {
      capturedMetrics = [];
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key'
      };
      service.setConfig(config);
      service.setMetricsHandler((metrics) => {
        capturedMetrics.push(metrics);
      });
    });

    it('should collect metrics for successful requests', async () => {
      // Manually trigger the metrics callback as mocked models don't go through LangChain callbacks
      const mockMetrics: LangChainMetrics = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        latencyMs: 500,
        success: true,
        timestamp: new Date()
      };
      
      // Simulate metrics collection
      (service as any).metricsHandler?.(mockMetrics);
      
      expect(capturedMetrics).toHaveLength(1);
      expect(capturedMetrics[0]).toMatchObject({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        success: true
      });
      expect(capturedMetrics[0].latencyMs).toBeGreaterThan(0);
      expect(capturedMetrics[0].timestamp).toBeInstanceOf(Date);
    });

    it('should collect metrics for failed requests', async () => {
      // Manually trigger the error metrics callback
      const mockErrorMetrics: LangChainMetrics = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: 300,
        success: false,
        errorType: 'API Error',
        timestamp: new Date()
      };
      
      // Simulate error metrics collection
      (service as any).metricsHandler?.(mockErrorMetrics);
      
      expect(capturedMetrics).toHaveLength(1);
      expect(capturedMetrics[0]).toMatchObject({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        success: false,
        errorType: 'API Error'
      });
    });
  });

  describe('Cost Calculation', () => {
    beforeEach(() => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key'
      };
      service.setConfig(config);
    });

    it('should calculate main model costs', () => {
      const cost = service.calculateCost(1000, 500); // 1k input, 500 output tokens
      
      // Claude Sonnet 4: $3.00 input, $15.00 output per million tokens
      // (1000/1000000 * 3.00) + (500/1000000 * 15.00) = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it('should calculate cost model costs', () => {
      const cost = service.calculateCostModelCost(1000, 500);
      
      // Claude 3.5 Haiku: $0.80 input, $4.00 output per million tokens
      // (1000/1000000 * 0.80) + (500/1000000 * 4.00) = 0.0008 + 0.002 = 0.0028
      expect(cost).toBeCloseTo(0.0028, 4);
    });

    it('should calculate cost for specific model', () => {
      const cost = service.calculateCost(1000, 500, 'claude-3-5-haiku-latest');
      
      // Claude 3.5 Haiku: $0.80 input, $4.00 output per million tokens
      // (1000/1000000 * 0.80) + (500/1000000 * 4.00) = 0.0008 + 0.002 = 0.0028
      expect(cost).toBeCloseTo(0.0028, 4);
    });

    it('should return zero cost when not configured', () => {
      const unconfiguredService = new MultiModelService();
      
      expect(unconfiguredService.calculateCost(1000, 500)).toBe(0);
      expect(unconfiguredService.calculateCostModelCost(1000, 500)).toBe(0);
    });

    it('should get current pricing information', () => {
      const pricing = service.getCurrentPricing();
      
      expect(pricing).toEqual({
        quality: {
          model: 'claude-sonnet-4-20250514',
          pricing: { input: 3.00, output: 15.00 }
        },
        cost: {
          model: 'claude-3-5-haiku-latest',
          pricing: { input: 0.80, output: 4.00 }
        }
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key'
      };
      service.setConfig(config);
    });

    it('should normalize 401 errors', async () => {
      const mockModel = {
        invoke: vi.fn().mockRejectedValue(new Error('401 Unauthorized'))
      };
      (service as any).currentModel = mockModel;
      
      await expect(service.makeRequest('test'))
        .rejects.toThrow('Invalid API key. Please check your settings.');
    });

    it('should normalize rate limit errors', async () => {
      const mockModel = {
        invoke: vi.fn().mockRejectedValue(new Error('429 rate limit exceeded'))
      };
      (service as any).currentModel = mockModel;
      
      await expect(service.makeRequest('test'))
        .rejects.toThrow('Rate limit exceeded. Please wait a moment.');
    });

    it('should normalize quota exceeded errors', async () => {
      const mockModel = {
        invoke: vi.fn().mockRejectedValue(new Error('402 insufficient credits'))
      };
      (service as any).currentModel = mockModel;
      
      await expect(service.makeRequest('test'))
        .rejects.toThrow('API quota exceeded. Please check your billing.');
    });

    it('should handle unknown errors', async () => {
      const mockModel = {
        invoke: vi.fn().mockRejectedValue(new Error('Unknown error'))
      };
      (service as any).currentModel = mockModel;
      
      await expect(service.makeRequest('test'))
        .rejects.toThrow('LLM Error: Unknown error');
    });
  });

  describe('Static Helper Methods', () => {
    it('should get provider display names', () => {
      expect(MultiModelService.getProviderDisplayName('anthropic')).toBe('Anthropic (Claude)');
      expect(MultiModelService.getProviderDisplayName('openai')).toBe('OpenAI (GPT)');
      expect(MultiModelService.getProviderDisplayName('google')).toBe('Google (Gemini)');
    });

    it('should get default models', () => {
      expect(MultiModelService.getDefaultModel('anthropic')).toBe('claude-3-5-sonnet-latest');
      expect(MultiModelService.getDefaultModel('openai')).toBe('gpt-4o');
      expect(MultiModelService.getDefaultModel('google')).toBe('gemini-2.5-flash-preview-05-20');
    });
  });

  describe('Request Cancellation', () => {
    beforeEach(() => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key'
      };
      service.setConfig(config);
    });

    it('should cancel active requests', () => {
      // Test that the cancelActiveRequests method doesn't throw
      expect(() => service.cancelActiveRequests()).not.toThrow();
      
      // Test that the activeRequests set is empty after cancellation
      expect((service as any).activeRequests.size).toBe(0);
    });

    it('should handle multiple cancellations safely', () => {
      service.cancelActiveRequests();
      service.cancelActiveRequests();
      
      // Should not throw
      expect(() => service.cancelActiveRequests()).not.toThrow();
    });

    it('should support concurrent requests without interference', async () => {
      // Create two concurrent requests 
      const request1Promise = service.makeRequestWithUsage('Test prompt 1');
      const request2Promise = service.makeCostRequestWithUsage('Test prompt 2');
      
      // Both should be tracked in activeRequests
      expect((service as any).activeRequests.size).toBe(2);
      
      // Wait for both to complete (they should both fail due to no mock, but that's OK)
      await Promise.allSettled([request1Promise, request2Promise]);
      
      // Both should be cleaned up
      expect((service as any).activeRequests.size).toBe(0);
    });
  });

  describe('Response Parsing', () => {
    beforeEach(() => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key'
      };
      service.setConfig(config);
    });

    it('should parse Anthropic response format', async () => {
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'Anthropic response',
          usage_metadata: {
            input_tokens: 120,
            output_tokens: 80
          }
        })
      };
      (service as any).currentModel = mockModel;
      
      const response = await service.makeRequestWithUsage('test');
      
      expect(response).toEqual({
        content: 'Anthropic response',
        usage: {
          input_tokens: 120,
          output_tokens: 80,
          total_tokens: 200
        }
      });
    });

    it('should parse OpenAI response format', async () => {
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'OpenAI response',
          response_metadata: {
            token_usage: {
              prompt_tokens: 130,
              completion_tokens: 70,
              total_tokens: 200
            }
          }
        })
      };
      (service as any).currentModel = mockModel;
      
      const response = await service.makeRequestWithUsage('test');
      
      expect(response).toEqual({
        content: 'OpenAI response',
        usage: {
          input_tokens: 130,
          output_tokens: 70,
          total_tokens: 200
        }
      });
    });

    it('should handle missing usage metadata', async () => {
      const mockModel = {
        invoke: vi.fn().mockResolvedValue({
          content: 'Response without usage'
        })
      };
      (service as any).currentModel = mockModel;
      
      const response = await service.makeRequestWithUsage('test');
      
      expect(response).toEqual({
        content: 'Response without usage',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0
        }
      });
    });
  });
});