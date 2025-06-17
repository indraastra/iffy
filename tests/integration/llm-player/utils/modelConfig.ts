/**
 * Shared utilities for model configuration across test runners
 */

import { MultiModelService } from '../../../../src/services/multiModelService';
import { ModelConfig } from '../core/types';
import { enrichModelConfigWithApiKey, validateApiKey, Provider } from './apiConfig';

export interface EngineModelConfig {
  costModel: ModelConfig;
  qualityModel: ModelConfig;
}

export interface TestConfiguration {
  engineModels?: EngineModelConfig;
  engineModel?: ModelConfig; // Legacy single model
  playerModel: ModelConfig;
}

/**
 * Configure MultiModelService with the appropriate model configuration
 */
export function configureMultiModelService(
  modelService: MultiModelService,
  config: TestConfiguration
): void {
  if (config.engineModels) {
    // Dual-model configuration (matrix tests)
    const qualityModel = enrichModelConfigWithApiKey(config.engineModels.qualityModel);
    const costModel = enrichModelConfigWithApiKey(config.engineModels.costModel);
    
    // Validate API keys
    validateApiKey(qualityModel.provider as Provider);
    validateApiKey(costModel.provider as Provider);
    
    modelService.setConfig({
      provider: qualityModel.provider,
      model: qualityModel.model,
      apiKey: qualityModel.apiKey,
      costModel: costModel.model
    });
  } else if (config.engineModel) {
    // Legacy single model configuration
    const engineModel = enrichModelConfigWithApiKey(config.engineModel);
    
    // Validate API key
    validateApiKey(engineModel.provider as Provider);
    
    modelService.setConfig({
      provider: engineModel.provider,
      model: engineModel.model,
      apiKey: engineModel.apiKey
    });
  } else {
    throw new Error('Test configuration must specify either engineModels or engineModel');
  }
}

/**
 * Prepare player model configuration with API key
 */
export function preparePlayerModelConfig(playerModel: ModelConfig): ModelConfig {
  const enrichedModel = enrichModelConfigWithApiKey(playerModel);
  
  // Validate API key
  validateApiKey(enrichedModel.provider as Provider);
  
  return enrichedModel;
}

/**
 * Extract all providers used in a test configuration
 */
export function getProvidersFromConfig(config: TestConfiguration): Provider[] {
  const providers = new Set<Provider>();
  
  if (config.engineModels) {
    providers.add(config.engineModels.costModel.provider as Provider);
    providers.add(config.engineModels.qualityModel.provider as Provider);
  } else if (config.engineModel) {
    providers.add(config.engineModel.provider as Provider);
  }
  
  providers.add(config.playerModel.provider as Provider);
  
  return Array.from(providers);
}

/**
 * Validate that all API keys are available for a test configuration
 */
export function validateTestConfiguration(config: TestConfiguration): void {
  const providers = getProvidersFromConfig(config);
  
  for (const provider of providers) {
    validateApiKey(provider);
  }
}