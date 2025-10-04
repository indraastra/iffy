export type LLMProvider = 'anthropic' | 'openai' | 'google';

// Default provider
export const DEFAULT_PROVIDER: LLMProvider = 'google';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  costModel?: string; // Optional separate model for cost-optimized operations
}

export interface LLMResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface ModelOption {
  provider: LLMProvider;
  model: string;
  displayName: string;
  description: string;
  costTier: 'free' | 'budget' | 'premium' | 'enterprise';
}

// Popular models for quick selection
export const POPULAR_MODELS: ModelOption[] = [
  // Google (now default provider)
  {
    provider: 'google',
    model: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Fast and capable with thinking (recommended)',
    costTier: 'premium'
  },
  {
    provider: 'google',
    model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'State-of-the-art reasoning',
    costTier: 'enterprise'
  },
  {
    provider: 'google',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    description: 'Balanced multimodal model',
    costTier: 'budget'
  },
  {
    provider: 'google',
    model: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash Lite',
    description: 'Most cost-effective option',
    costTier: 'free'
  },
  // Anthropic
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    displayName: 'Claude Sonnet 4.5',
    description: 'Latest and most capable (recommended)',
    costTier: 'premium'
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    displayName: 'Claude Sonnet 3.5',
    description: 'Previous generation, still capable',
    costTier: 'premium'
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4-1-20250805',
    displayName: 'Claude Opus 4.1',
    description: 'Most intelligent for complex tasks',
    costTier: 'enterprise'
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-latest',
    displayName: 'Claude Haiku 3.5',
    description: 'Fast and cost-effective',
    costTier: 'budget'
  },
  // OpenAI
  {
    provider: 'openai',
    model: 'gpt-4.1',
    displayName: 'GPT-4.1',
    description: 'Latest general-purpose model',
    costTier: 'premium'
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    description: 'Best value for most tasks',
    costTier: 'budget'
  },
  {
    provider: 'openai',
    model: 'o3-mini',
    displayName: 'o3-mini',
    description: 'Advanced reasoning capabilities',
    costTier: 'premium'
  }
];

// Default models per provider
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4o',
  google: 'gemini-2.5-flash'
};

// Default cost models per provider (efficient options for cost-optimized operations)
export const DEFAULT_COST_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-3-5-haiku-latest',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.5-flash-lite'
};

// Pricing per 1M tokens (as of June 2025)
export interface ModelPricing {
  input: number;  // Cost per million input tokens
  output: number; // Cost per million output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic
  'claude-sonnet-4-5': { input: 3.00, output: 15.00 }, // Same pricing as Sonnet 4
  'claude-3-5-sonnet-latest': { input: 3.00, output: 15.00 },
  'claude-opus-4-1-20250805': { input: 15.00, output: 75.00 }, // Claude Opus pricing
  'claude-3-5-haiku-latest': { input: 0.80, output: 4.00 },
  
  // OpenAI
  'gpt-4.1': { input: 3.70, output: 11.10 },
  'gpt-4.1-mini': { input: 1.85, output: 5.55 },
  'gpt-4.1-nano': { input: 0.925, output: 2.775 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'o3-mini': { input: 1.10, output: 4.40 },
  
  // Google (updated December 2024 pricing)
  'gemini-2.5-pro': { input: 1.25, output: 10.00 }, // ≤200K context
  'gemini-2.5-pro-preview-06-05': { input: 1.25, output: 10.00 }, // ≤200K context
  'gemini-2.5-flash': { input: 0.30, output: 2.50 }, // Standard pricing (text/image/video)
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 }, // Most cost-effective
  'gemini-2.0-flash': { input: 0.10, output: 0.40 }, // Standard pricing
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 }, // Legacy model
  'gemini-1.5-flash': { input: 0.075, output: 0.30 }, // Legacy model
};

// Default pricing per provider (using cheapest model rates)
export const DEFAULT_PROVIDER_PRICING: Record<LLMProvider, ModelPricing> = {
  anthropic: MODEL_PRICING['claude-3-5-haiku-latest'],
  openai: MODEL_PRICING['gpt-4o-mini'],
  google: MODEL_PRICING['gemini-2.5-flash-lite']
};

// Helper function to get the cheapest model for a provider
export function getCheapestModel(provider: LLMProvider): string {
  return DEFAULT_COST_MODELS[provider];
}

// Helper function to calculate cost for a request
export function calculateRequestCost(model: string, provider: LLMProvider, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || DEFAULT_PROVIDER_PRICING[provider];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// Helper function to get pricing for a specific model
export function getModelPricing(model: string, provider: LLMProvider): ModelPricing {
  return MODEL_PRICING[model] || DEFAULT_PROVIDER_PRICING[provider];
}