import { LLMProvider, LLMConfig } from '@/services/llm/types'
import { useApiConfig } from '@/composables/useApiConfig'

/**
 * Check URL parameters for API configuration
 * Supports passing API keys and provider config via URL for easy sharing
 * 
 * URL Parameters:
 * - apiKey: The API key for the LLM provider (auto-detects provider)
 * - provider: Override provider detection (anthropic, openai, google)
 * - model: The quality model to use (optional, defaults to provider's best)
 * - costModel: The cost-optimized model to use (optional, defaults to provider's cheapest)
 * 
 * Example URLs:
 * - ?apiKey=sk-ant-...  (auto-detects Anthropic, uses default models)
 * - ?apiKey=sk-...&model=gpt-4-turbo-preview&costModel=gpt-3.5-turbo
 * - ?apiKey=AIza...  (auto-detects Google, uses default models)
 */
export function useUrlApiConfig() {
  const { updateConfig, isConfigured, getDefaultModel, getCheapestModelForProvider } = useApiConfig()
  
  /**
   * Auto-detect provider from API key format
   */
  function detectProviderFromKey(apiKey: string): LLMProvider {
    if (apiKey.startsWith('sk-ant-')) {
      return 'anthropic'
    } else if (apiKey.startsWith('sk-proj-')) {
      // New OpenAI project-scoped keys
      return 'openai'
    } else if (apiKey.startsWith('sk-') && !apiKey.includes('ant')) {
      return 'openai'
    } else if (apiKey.includes('AIza') || apiKey.startsWith('AIza')) {
      return 'google'
    } else {
      // Default to anthropic for unknown formats
      return 'anthropic'
    }
  }
  
  function checkUrlParameters(): boolean {
    // Only works in browser environment
    if (typeof window === 'undefined' || !window.location) {
      return false
    }
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const apiKey = urlParams.get('apiKey')
    const providerParam = urlParams.get('provider') as LLMProvider | null
    const modelParam = urlParams.get('model')
    const costModelParam = urlParams.get('costModel')
    
    // If no API key in URL, check for legacy format
    const legacyApiKey = urlParams.get('api_key')
    const finalApiKey = apiKey || legacyApiKey
    
    if (!finalApiKey) {
      return false
    }
    
    // Determine provider: explicit parameter overrides auto-detection
    const detectedProvider = detectProviderFromKey(finalApiKey)
    const finalProvider = (providerParam && ['anthropic', 'openai', 'google'].includes(providerParam)) 
      ? providerParam 
      : detectedProvider
    
    // Build configuration
    const config: Partial<LLMConfig> = {
      apiKey: finalApiKey,
      provider: finalProvider
    }
    
    // Set models: use URL params if provided, otherwise use provider defaults
    config.model = modelParam || getDefaultModel(finalProvider)
    config.costModel = costModelParam || getCheapestModelForProvider(finalProvider)
    
    console.log(`🔐 Detected provider: ${finalProvider} from API key format`)
    if (modelParam || costModelParam) {
      console.log(`📊 Using models - Quality: ${config.model}, Cost: ${config.costModel}`)
    } else {
      console.log(`📊 Using default models for ${finalProvider} - Quality: ${config.model}, Cost: ${config.costModel}`)
    }
    
    // Apply configuration
    const result = updateConfig(config)
    
    if (result.success) {
      console.log('✅ API configuration loaded from URL parameters')
      
      // Clean up URL by removing API key parameters for security
      cleanUrlParameters()
      
      return true
    } else {
      console.error('❌ Failed to apply URL API configuration:', result.message)
      return false
    }
  }
  
  function cleanUrlParameters(): void {
    // Only works in browser environment
    if (typeof window === 'undefined' || !window.history) {
      return
    }
    
    const url = new URL(window.location.href)
    const params = url.searchParams
    
    // Remove sensitive parameters
    params.delete('apiKey')
    params.delete('api_key')
    params.delete('provider')
    params.delete('model')
    params.delete('costModel')
    
    // Update URL without reload
    const newUrl = params.toString() 
      ? `${url.pathname}?${params.toString()}${url.hash}`
      : `${url.pathname}${url.hash}`
    
    window.history.replaceState({}, '', newUrl)
  }
  
  function generateShareableUrl(config: LLMConfig, includeApiKey: boolean = false): string {
    if (typeof window === 'undefined') {
      return ''
    }
    
    const url = new URL(window.location.href)
    const params = url.searchParams
    
    // Clear any existing API params
    params.delete('apiKey')
    params.delete('api_key')
    params.delete('provider')
    params.delete('model')
    params.delete('costModel')
    
    // Add configuration
    if (includeApiKey && config.apiKey) {
      params.set('apiKey', config.apiKey)
      
      // Only add provider if it's not auto-detectable from the key
      const detectedProvider = detectProviderFromKey(config.apiKey)
      if (config.provider !== detectedProvider) {
        params.set('provider', config.provider)
      }
    }
    
    // Only add model params if they differ from defaults for the provider
    const defaultModel = getDefaultModel(config.provider)
    const defaultCostModel = getCheapestModelForProvider(config.provider)
    
    if (config.model && config.model !== defaultModel) {
      params.set('model', config.model)
    }
    
    if (config.costModel && config.costModel !== defaultCostModel) {
      params.set('costModel', config.costModel)
    }
    
    return url.toString()
  }
  
  return {
    checkUrlParameters,
    cleanUrlParameters,
    generateShareableUrl
  }
}