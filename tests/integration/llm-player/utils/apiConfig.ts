/**
 * Shared utilities for API key configuration across test runners
 */

import { config } from 'dotenv';
import { ModelConfig } from '../core/types';

// Ensure dotenv is loaded
config();

export type Provider = 'anthropic' | 'openai' | 'google';

/**
 * Get API key for a provider from environment variables
 */
export function getApiKeyForProvider(provider: Provider): string {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'google':
      return process.env.GOOGLE_API_KEY || '';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Validate that API key is configured for a provider
 */
export function validateApiKey(provider: Provider): void {
  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()}_API_KEY environment variable is required but not set`);
  }
}

/**
 * Enrich a model config with API key from environment if not already set
 */
export function enrichModelConfigWithApiKey(modelConfig: ModelConfig): ModelConfig {
  return {
    ...modelConfig,
    apiKey: modelConfig.apiKey || getApiKeyForProvider(modelConfig.provider as Provider)
  };
}

/**
 * Validate that all required API keys are available for given providers
 */
export function validateRequiredApiKeys(providers: Provider[]): void {
  const missing: string[] = [];
  
  for (const provider of providers) {
    const apiKey = getApiKeyForProvider(provider);
    if (!apiKey) {
      missing.push(provider.toUpperCase());
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required API keys: ${missing.join(', ')}. ` +
      `Please set the following environment variables: ${missing.map(p => `${p}_API_KEY`).join(', ')}`
    );
  }
}