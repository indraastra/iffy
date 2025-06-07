import { GameEngine } from '@/engine/gameEngine';
import { MessageDisplay } from './MessageDisplay';

/**
 * Manages settings modal and API key functionality
 */
export class SettingsManager {
  private gameEngine: GameEngine;
  private messageDisplay: MessageDisplay;
  private settingsModal: HTMLElement;
  private apiKeyInput: HTMLInputElement;

  constructor(gameEngine: GameEngine, messageDisplay: MessageDisplay) {
    this.gameEngine = gameEngine;
    this.messageDisplay = messageDisplay;
    this.settingsModal = document.getElementById('settings-modal')!;
    this.apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
    
    this.setupEventListeners();
    this.loadApiKey();
    this.createApiKeyStatusIndicator();
  }

  /**
   * Set up event listeners for settings functionality
   */
  private setupEventListeners(): void {
    const settingsBtn = document.getElementById('settings-btn')!;
    const closeSettingsBtn = document.getElementById('close-settings')!;
    
    settingsBtn.addEventListener('click', () => this.showSettings());
    closeSettingsBtn.addEventListener('click', () => this.hideSettings());
    
    // Click outside modal to close
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.hideSettings();
      }
    });

    // API key saving
    this.apiKeyInput.addEventListener('input', () => {
      this.saveApiKey();
    });
  }

  /**
   * Show the settings modal
   */
  showSettings(): void {
    this.settingsModal.classList.remove('hidden');
    this.apiKeyInput.focus();
  }

  /**
   * Hide the settings modal
   */
  hideSettings(): void {
    this.settingsModal.classList.add('hidden');
  }

  /**
   * Save API key to localStorage and update service
   */
  private saveApiKey(): void {
    const apiKey = this.apiKeyInput.value;
    if (apiKey) {
      localStorage.setItem('iffy_api_key', apiKey);
      this.gameEngine.getAnthropicService().setApiKey(apiKey);
      this.updateApiKeyStatus();
    } else {
      localStorage.removeItem('iffy_api_key');
      this.updateApiKeyStatus();
    }
  }

  /**
   * Load API key from localStorage
   */
  private loadApiKey(): void {
    const savedKey = localStorage.getItem('iffy_api_key');
    if (savedKey) {
      this.apiKeyInput.value = savedKey;
      this.gameEngine.getAnthropicService().setApiKey(savedKey);
    }
  }

  /**
   * Update the API key status indicator
   */
  private updateApiKeyStatus(): void {
    const statusIndicator = document.querySelector('.api-key-status');
    if (statusIndicator) {
      if (this.gameEngine.getAnthropicService().isConfigured()) {
        statusIndicator.className = 'api-key-status configured';
        statusIndicator.textContent = '🤖 AI Enhanced';
      } else {
        statusIndicator.className = 'api-key-status not-configured';
        statusIndicator.textContent = '⚠️ Basic Mode';
      }
    }
  }

  /**
   * Create the API key status indicator
   */
  private createApiKeyStatusIndicator(): void {
    const statusDiv = document.createElement('div');
    statusDiv.className = this.gameEngine.getAnthropicService().isConfigured() 
      ? 'api-key-status configured' 
      : 'api-key-status not-configured';
    statusDiv.textContent = this.gameEngine.getAnthropicService().isConfigured() 
      ? '🤖 AI Enhanced' 
      : '⚠️ Basic Mode';
    statusDiv.title = this.gameEngine.getAnthropicService().isConfigured()
      ? 'Natural language processing enabled'
      : 'Click Settings to enable AI features';
    
    if (!this.gameEngine.getAnthropicService().isConfigured()) {
      statusDiv.style.cursor = 'pointer';
      statusDiv.addEventListener('click', () => this.showSettings());
    }
    
    // Insert in header next to controls
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.insertBefore(statusDiv, controls.firstChild);
    }
  }

  /**
   * Prompt user for API key with interactive UI
   */
  promptForApiKey(): void {
    this.messageDisplay.addMessage('🔑 API Key Required', 'title');
    this.messageDisplay.addMessage('Iffy uses Claude AI for natural language understanding. You\'ll need an Anthropic API key to unlock the full experience.', 'system');
    this.messageDisplay.addMessage('', 'system'); // Empty line for spacing
    
    // Create interactive prompt
    const promptDiv = document.createElement('div');
    promptDiv.className = 'api-key-prompt';
    promptDiv.innerHTML = `
      <div class="api-key-prompt-content">
        <div class="api-key-prompt-header">
          <h3>🚀 Get Started with Enhanced AI</h3>
          <p>Enter your Anthropic API key to enable natural language commands</p>
        </div>
        <div class="api-key-prompt-actions">
          <button class="api-key-prompt-btn primary" id="setup-api-key">
            Set Up API Key
          </button>
          <button class="api-key-prompt-btn secondary" id="continue-basic">
            Continue with Basic Mode
          </button>
        </div>
        <div class="api-key-prompt-info">
          <p><strong>Enhanced Mode:</strong> "examine the mysterious door", "talk to the shopkeeper"</p>
          <p><strong>Basic Mode:</strong> "look", "go north", "inventory", "help"</p>
          <p><small>Get your API key at <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></small></p>
        </div>
      </div>
    `;

    this.messageDisplay.addCustomElement(promptDiv);

    // Add event listeners
    const setupBtn = promptDiv.querySelector('#setup-api-key') as HTMLElement;
    const basicBtn = promptDiv.querySelector('#continue-basic') as HTMLElement;

    setupBtn.addEventListener('click', () => {
      promptDiv.remove();
      this.showSettings();
      this.messageDisplay.addMessage('💡 Tip: You can always access Settings later to add your API key.', 'system');
    });

    basicBtn.addEventListener('click', () => {
      promptDiv.remove();
      this.messageDisplay.addMessage('⚠️ Running in Basic Mode - Limited to simple commands like "look", "go [direction]", "inventory".', 'system');
      this.messageDisplay.addMessage('💡 You can enable enhanced AI anytime by clicking Settings and adding your API key.', 'system');
    });
  }

  /**
   * Check if API key is configured
   */
  isApiKeyConfigured(): boolean {
    return this.gameEngine.getAnthropicService().isConfigured();
  }
}