/**
 * Impressionist Iffy App - Pure impressionist architecture
 */

import { ImpressionistGameManager } from '@/ui/ImpressionistGameManager';
import { MultiModelService } from '@/services/multiModelService';
import { DebugPane } from '@/ui/debugPane';
import { POPULAR_MODELS, LLMProvider, LLMConfig, getCheapestModel } from '@/services/llm/types';

class ImpressionistIffyApp {
  private multiModelService: MultiModelService;
  private debugPane: DebugPane;
  
  constructor() {
    // Initialize core services
    this.multiModelService = new MultiModelService();
    this.debugPane = new DebugPane();
    
    // Set up LangChain metrics integration
    this.multiModelService.setMetricsHandler((metrics) => {
      this.debugPane.addLangChainMetric(metrics);
    });
    
    // Get DOM elements
    const storyOutput = document.getElementById('story-output')!;
    const commandInput = document.getElementById('command-input') as HTMLTextAreaElement;
    
    // Initialize impressionist game manager
    new ImpressionistGameManager({
      storyOutput,
      commandInput,
      multiModelService: this.multiModelService,
      debugPane: this.debugPane
    });
    
    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  private initializeApp(): void {
    this.setupGlobalEventListeners();
    this.displayWelcomeMessage();
    this.createDebugToggle();
    this.setupSettings();
  }

  /**
   * Set up global event listeners
   */
  private setupGlobalEventListeners(): void {
    // Debug pane keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        this.debugPane.toggle();
      }
    });
    
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettings());
    }
  }

  /**
   * Display the welcome message
   */
  private displayWelcomeMessage(): void {
    const storyOutput = document.getElementById('story-output')!;
    
    const welcomeHtml = `
      <div class="message message-title">🎭 Welcome to Impressionist Iffy</div>
      <div class="message message-subtitle">*LLM-powered Interactive Fiction Engine*</div>
      <div class="message message-system">
        <strong>✨ Features:</strong><br>
        • 🎨 <strong>Natural Language Interaction</strong> - Speak as you would naturally<br>
        • 🧠 <strong>Smart Memory</strong> - AI remembers what matters<br>
        • 📊 <strong>Performance Metrics</strong> - Track token usage and efficiency<br>
        • 🌟 <strong>Impressionist Stories</strong> - Scenes as sketches, not scripts
      </div>
      <div class="message message-system">
        🚀 <strong>Get Started:</strong> Click the "Load" button to choose a story, or press Ctrl+D to open debug tools.
      </div>
    `;
    
    storyOutput.innerHTML = welcomeHtml;
    
    // Check API configuration
    if (!this.isApiKeyConfigured()) {
      this.promptForApiKey();
    }
  }

  /**
   * Create debug toggle functionality
   */
  private createDebugToggle(): void {
    // Debug pane is already initialized
    console.log('Impressionist Iffy Engine initialized');
  }


  /**
   * Set up settings management
   */
  private setupSettings(): void {
    // Clean up legacy storage
    const savedKey = localStorage.getItem('iffy_api_key');
    if (savedKey) {
      localStorage.removeItem('iffy_api_key');
    }
  }

  /**
   * Show settings menu
   */
  private showSettings(): void {
    const menu = this.createSettingsMenu();
    document.body.appendChild(menu);
  }

  /**
   * Create settings menu following load menu pattern
   */
  private createSettingsMenu(): HTMLElement {
    const currentConfig = this.multiModelService.getConfig();
    const isConfigured = this.multiModelService.isConfigured() ? 'configured' : 'not-configured';
    
    const currentKey = currentConfig?.apiKey || '';
    const maskedKey = currentKey ? currentKey.substring(0, 8) + '...' : 'Not configured';
    const currentProvider = currentConfig?.provider || 'anthropic';
    const currentModel = currentConfig?.model || MultiModelService.getDefaultModel(currentProvider);
    const currentCostModel = currentConfig?.costModel || getCheapestModel(currentProvider);
    
    const menu = document.createElement('div');
    menu.className = 'impressionist-settings-menu';
    
    menu.innerHTML = `
      <div class="settings-overlay"></div>
      <div class="settings-content">
        <h3>⚙️ Settings</h3>
        <p class="settings-description">Configure your AI model and API preferences</p>
        
        <div class="api-section">
          <h4>🤖 AI Model Configuration</h4>
          <div class="api-status ${isConfigured}">
            ${isConfigured === 'configured' ? '✅' : '❌'} Status: ${MultiModelService.getProviderDisplayName(currentProvider)} - ${maskedKey}
          </div>
          
          <div class="setting-group">
            <label for="llm-provider">Provider:</label>
            <select id="llm-provider" class="setting-input">
              <option value="anthropic" ${currentProvider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
              <option value="openai" ${currentProvider === 'openai' ? 'selected' : ''}>OpenAI (GPT)</option>
              <option value="google" ${currentProvider === 'google' ? 'selected' : ''}>Google (Gemini)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label for="llm-model">Quality Model:</label>
            <select id="llm-model" class="setting-input">
              ${this.renderModelOptions(currentProvider, currentModel)}
            </select>
            <small>Used for story generation and main interactions</small>
          </div>
          
          <div class="setting-group">
            <label for="cost-model">Cost Model:</label>
            <select id="cost-model" class="setting-input">
              ${this.renderModelOptions(currentProvider, currentCostModel)}
            </select>
            <small>Used for classifications and quick operations (defaults to cheapest model for cost efficiency)</small>
          </div>
          
          <div class="setting-group">
            <label for="settings-api-key">API Key:</label>
            <input 
              type="password" 
              id="settings-api-key" 
              placeholder="Enter your API key"
              value="${currentKey}"
              autocomplete="off"
            />
            <small class="help-text">
              Get your API key from: ${this.getApiKeyHelpLink(currentProvider)}
            </small>
          </div>
        </div>
        
        
        <div class="settings-actions">
          <button class="action-btn primary" id="save-settings">💾 Save Settings</button>
          <button class="action-btn" id="cancel-settings">Cancel</button>
        </div>
        
        <button class="close-btn">✕</button>
      </div>
    `;
    
    this.attachSettingsMenuEvents(menu);
    
    return menu;
  }

  /**
   * Render model options for the selected provider
   */
  private renderModelOptions(provider: LLMProvider, currentModel: string): string {
    const models = POPULAR_MODELS.filter(m => m.provider === provider);
    
    return models.map(model => `
      <option value="${model.model}" ${currentModel === model.model ? 'selected' : ''}>
        ${model.displayName} - ${model.description}
      </option>
    `).join('');
  }

  /**
   * Get API key help link for the provider
   */
  private getApiKeyHelpLink(provider: LLMProvider): string {
    const links = {
      anthropic: '<a href="https://console.anthropic.com/api-keys" target="_blank">Anthropic Console</a>',
      openai: '<a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>',
      google: '<a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>'
    };
    return links[provider] || 'your provider\'s dashboard';
  }

  /**
   * Attach settings menu events
   */
  private attachSettingsMenuEvents(menu: HTMLElement): void {
    const overlay = menu.querySelector('.settings-overlay');
    const closeBtn = menu.querySelector('.close-btn');
    const cancelBtn = menu.querySelector('#cancel-settings');
    const saveBtn = menu.querySelector('#save-settings');
    const providerSelect = menu.querySelector('#llm-provider') as HTMLSelectElement;
    const modelSelect = menu.querySelector('#llm-model') as HTMLSelectElement;
    const costModelSelect = menu.querySelector('#cost-model') as HTMLSelectElement;
    const apiKeyInput = menu.querySelector('#settings-api-key') as HTMLInputElement;
    
    // Close menu
    const closeMenu = () => document.body.removeChild(menu);
    
    overlay?.addEventListener('click', closeMenu);
    closeBtn?.addEventListener('click', closeMenu);
    cancelBtn?.addEventListener('click', closeMenu);
    
    // Update model options when provider changes
    providerSelect?.addEventListener('change', () => {
      const provider = providerSelect.value as LLMProvider;
      const defaultModel = MultiModelService.getDefaultModel(provider);
      const defaultCostModel = getCheapestModel(provider);
      
      modelSelect.innerHTML = this.renderModelOptions(provider, defaultModel);
      costModelSelect.innerHTML = this.renderModelOptions(provider, defaultCostModel);
      
      // Update help text
      const helpText = menu.querySelector('.help-text');
      if (helpText) {
        helpText.innerHTML = `Get your API key from: ${this.getApiKeyHelpLink(provider)}`;
      }
    });
    
    // Save settings
    saveBtn?.addEventListener('click', () => {
      const provider = providerSelect.value as LLMProvider;
      const model = modelSelect.value;
      const costModel = costModelSelect.value;
      const apiKey = apiKeyInput.value.trim();
      
      if (apiKey) {
        const config: LLMConfig = {
          provider,
          model,
          costModel,
          apiKey
        };
        
        try {
          this.multiModelService.setConfig(config);
          this.addSystemMessage(`✅ ${MultiModelService.getProviderDisplayName(provider)} configuration saved successfully`);
        } catch (error) {
          this.addSystemMessage(`❌ Error: ${error instanceof Error ? error.message : 'Invalid configuration'}`);
          return;
        }
      } else {
        // Clear the configuration when API key is removed
        this.multiModelService.clearConfig();
        this.addSystemMessage('🗑️ API key removed and configuration cleared');
      }
      
      closeMenu();
    });
  }

  /**
   * Check if API key is configured
   */
  private isApiKeyConfigured(): boolean {
    return this.multiModelService.isConfigured();
  }

  /**
   * Prompt for API key
   */
  private promptForApiKey(): void {
    const storyOutput = document.getElementById('story-output')!;
    
    const apiPromptHtml = `
      <div class="message message-warning">
        <strong>🔑 API Key Required</strong><br>
        To use LLM-powered features, you need an Anthropic API key.<br>
        <button id="quick-settings" class="btn" style="margin-top: 0.5rem;">
          Configure API Key
        </button>
      </div>
    `;
    
    storyOutput.innerHTML += apiPromptHtml;
    
    document.getElementById('quick-settings')?.addEventListener('click', () => {
      this.showSettings();
    });
  }

  /**
   * Add system message to output
   */
  private addSystemMessage(text: string): void {
    const storyOutput = document.getElementById('story-output')!;
    const div = document.createElement('div');
    div.className = 'message message-system';
    div.textContent = text;
    storyOutput.appendChild(div);
    storyOutput.scrollTop = storyOutput.scrollHeight;
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ImpressionistIffyApp();
});