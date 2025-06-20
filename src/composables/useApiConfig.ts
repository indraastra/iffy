import { ref, computed } from 'vue'
import { getGlobalServices } from '@/composables/useGameEngine'
import { POPULAR_MODELS, LLMProvider, LLMConfig, getCheapestModel } from '@/services/llm/types'
import { MultiModelService } from '@/services/multiModelService'

export function useApiConfig() {
  // Use the same MultiModelService instance as the game engine
  const { multiModelService } = getGlobalServices()
  const currentConfig = ref<LLMConfig | null>(multiModelService.getConfig())
  
  // Reactive config properties
  const isConfigured = computed(() => multiModelService.isConfigured())
  const provider = computed(() => currentConfig.value?.provider || 'anthropic')
  const model = computed(() => currentConfig.value?.model || MultiModelService.getDefaultModel(provider.value))
  const costModel = computed(() => currentConfig.value?.costModel || getCheapestModel(provider.value))
  const apiKey = computed(() => currentConfig.value?.apiKey || '')
  
  // Masked API key for display
  const maskedApiKey = computed(() => {
    const key = apiKey.value
    return key ? key.substring(0, 8) + '...' : 'Not configured'
  })
  
  // Status for UI
  const configStatus = computed(() => isConfigured.value ? 'configured' : 'not-configured')
  
  // Available models for current provider
  const availableModels = computed(() => {
    return POPULAR_MODELS.filter(m => m.provider === provider.value)
  })
  
  // Provider display names
  const providerDisplayName = computed(() => {
    return MultiModelService.getProviderDisplayName(provider.value)
  })
  
  // API key help links
  const apiKeyHelpLink = computed(() => {
    const links = {
      anthropic: 'https://console.anthropic.com/api-keys',
      openai: 'https://platform.openai.com/api-keys',
      google: 'https://makersuite.google.com/app/apikey'
    }
    return links[provider.value] || 'your provider\'s dashboard'
  })
  
  function updateConfig(newConfig: Partial<LLMConfig>) {
    try {
      if (newConfig.apiKey) {
        const fullConfig: LLMConfig = {
          provider: newConfig.provider || provider.value,
          model: newConfig.model || model.value,
          costModel: newConfig.costModel || costModel.value,
          apiKey: newConfig.apiKey
        }
        
        multiModelService.setConfig(fullConfig)
        currentConfig.value = multiModelService.getConfig()
        return { success: true, message: `${providerDisplayName.value} configuration saved successfully` }
      } else {
        // Clear configuration
        multiModelService.clearConfig()
        currentConfig.value = null
        return { success: true, message: 'API key removed and configuration cleared' }
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Invalid configuration' 
      }
    }
  }
  
  function getDefaultModel(providerName: LLMProvider): string {
    return MultiModelService.getDefaultModel(providerName)
  }
  
  function getCheapestModelForProvider(providerName: LLMProvider): string {
    return getCheapestModel(providerName)
  }
  
  return {
    // State
    currentConfig,
    isConfigured,
    provider,
    model,
    costModel,
    apiKey,
    maskedApiKey,
    configStatus,
    availableModels,
    providerDisplayName,
    apiKeyHelpLink,
    
    // Methods
    updateConfig,
    getDefaultModel,
    getCheapestModelForProvider,
    
    // Constants
    POPULAR_MODELS
  }
}