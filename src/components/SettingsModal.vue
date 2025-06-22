<template>
  <div v-if="showSettingsModal" class="modal-overlay" @click="hideSettings">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>Settings</h2>
        <button @click="hideSettings" class="close-btn">×</button>
      </header>
      
      <div class="modal-body">
        <div class="setting-group">
          <h3>Theme</h3>
          <div class="theme-selector">
            <button 
              v-for="(theme, key) in availableThemes"
              :key="key"
              @click="setTheme(key)"
              :class="['theme-btn', { active: currentTheme?.id === key }]"
            >
              {{ theme.name }}
            </button>
          </div>
        </div>
        
        <div class="setting-group">
          <h3>Debug</h3>
          <p class="setting-description">
            Press <kbd>Ctrl+D</kbd> to toggle debug console for performance metrics and AI interaction logs.
          </p>
        </div>

        <div class="setting-group">
          <h3>🤖 AI Model Configuration</h3>
          <div class="api-status" :class="configStatus">
            {{ isConfigured ? '✅' : '❌' }} Status: {{ providerDisplayName }} - {{ maskedApiKey }}
          </div>
          
          <div class="config-form">
            <div class="form-row">
              <label for="llm-provider">Provider:</label>
              <select 
                id="llm-provider" 
                v-model="selectedProvider"
                @change="onProviderChange"
                class="setting-input"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="google">Google (Gemini)</option>
              </select>
            </div>
            
            <div class="form-row">
              <label for="llm-model">Quality Model:</label>
              <select 
                id="llm-model" 
                v-model="selectedModel"
                class="setting-input"
              >
                <option 
                  v-for="modelOption in availableModels" 
                  :key="modelOption.model"
                  :value="modelOption.model"
                >
                  {{ modelOption.displayName }} - {{ modelOption.description }}
                </option>
              </select>
              <small>Used for story generation and main interactions</small>
            </div>
            
            <div class="form-row">
              <label for="cost-model">Cost Model:</label>
              <select 
                id="cost-model" 
                v-model="selectedCostModel"
                class="setting-input"
              >
                <option 
                  v-for="modelOption in availableModels" 
                  :key="modelOption.model"
                  :value="modelOption.model"
                >
                  {{ modelOption.displayName }} - {{ modelOption.description }}
                </option>
              </select>
              <small>Used for classifications and quick operations (defaults to cheapest for cost efficiency)</small>
            </div>
            
            <div class="form-row">
              <label for="api-key">API Key:</label>
              <input 
                type="password" 
                id="api-key" 
                v-model="selectedApiKey"
                placeholder="Enter your API key"
                autocomplete="off"
                class="setting-input"
              />
              <small class="help-text">
                Get your API key from: <a :href="apiKeyHelpLink" target="_blank">{{ providerDisplayName }} Dashboard</a>
              </small>
            </div>
            
            <div class="form-actions">
              <button @click="saveConfiguration" class="save-btn">💾 Save Settings</button>
              <button @click="clearConfiguration" class="clear-btn">🗑️ Clear Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGameActions } from '@/composables/useGameActions'
import { useTheme } from '@/composables/useTheme'
import { useApiConfig } from '@/composables/useApiConfig'
import { useGameEngine } from '@/composables/useGameEngine'
import type { LLMProvider } from '@/services/llm/types'

const { showSettingsModal, hideSettings } = useGameActions()
const { currentTheme, setTheme, getAvailableThemes } = useTheme()
const { addMessage } = useGameEngine()

const {
  isConfigured,
  provider,
  model,
  costModel,
  apiKey,
  maskedApiKey,
  configStatus,
  providerDisplayName,
  apiKeyHelpLink,
  updateConfig,
  getDefaultModel,
  getCheapestModelForProvider,
  POPULAR_MODELS
} = useApiConfig()

const availableThemes = getAvailableThemes()

// Form state
const selectedProvider = ref<LLMProvider>(provider.value)
const selectedModel = ref(model.value)
const selectedCostModel = ref(costModel.value)
const selectedApiKey = ref(apiKey.value)

// Available models for the currently selected provider (not config provider)
const availableModels = computed(() => {
  return POPULAR_MODELS.filter(m => m.provider === selectedProvider.value)
})

// Update form when provider changes
function onProviderChange() {
  const newProvider = selectedProvider.value
  selectedModel.value = getDefaultModel(newProvider)
  selectedCostModel.value = getCheapestModelForProvider(newProvider)
}

// Watch for external config changes
watch(() => provider.value, (newProvider) => {
  selectedProvider.value = newProvider
})

watch(() => model.value, (newModel) => {
  selectedModel.value = newModel
})

watch(() => costModel.value, (newCostModel) => {
  selectedCostModel.value = newCostModel
})

watch(() => apiKey.value, (newApiKey) => {
  selectedApiKey.value = newApiKey
})

function saveConfiguration() {
  const result = updateConfig({
    provider: selectedProvider.value,
    model: selectedModel.value,
    costModel: selectedCostModel.value,
    apiKey: selectedApiKey.value.trim()
  })
  
  // Add feedback message to game output
  addMessage(result.message, result.success ? 'system' : 'error')
  
  if (result.success) {
    hideSettings()
  }
}

function clearConfiguration() {
  selectedApiKey.value = ''
  const result = updateConfig({
    apiKey: ''
  })
  
  addMessage(result.message, 'system')
  hideSettings()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--interface-panel-border);
  border-radius: 12px;
  width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-strong);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: var(--color-primary);
  color: var(--interface-button-text);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--interface-button-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: var(--transition-fast);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 2rem;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-group h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text-primary);
  font-size: 1.1rem;
}

.setting-description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.4;
}

.theme-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.theme-btn {
  background: var(--color-background);
  border: 1px solid var(--interface-panel-border);
  color: var(--color-text-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition-fast);
  font-size: 0.9rem;
}

.theme-btn:hover {
  background: var(--color-surface);
  border-color: var(--color-accent);
}

.theme-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-background);
}

kbd {
  background: var(--color-background);
  border: 1px solid var(--interface-panel-border);
  border-radius: 3px;
  padding: 0.2rem 0.4rem;
  font-family: var(--font-monospace);
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

/* API Configuration Styles */
.api-status {
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.api-status.configured {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: rgb(34, 197, 94);
}

.api-status.not-configured {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: rgb(239, 68, 68);
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row label {
  font-weight: 500;
  color: var(--color-text-primary);
  font-size: 0.9rem;
}

.setting-input {
  background: var(--color-background);
  border: 1px solid var(--interface-panel-border);
  border-radius: 6px;
  padding: 0.75rem;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  transition: var(--transition-fast);
}

.setting-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.1);
}

.form-row small {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  line-height: 1.3;
}

.help-text a {
  color: var(--color-accent);
  text-decoration: none;
}

.help-text a:hover {
  text-decoration: underline;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--interface-panel-border);
}

.save-btn, .clear-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
}

.save-btn {
  background: var(--color-accent);
  color: var(--color-background);
  flex: 1;
}

.save-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.clear-btn {
  background: var(--color-background);
  color: var(--color-text-secondary);
  border: 1px solid var(--interface-panel-border);
}

.clear-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}
</style>