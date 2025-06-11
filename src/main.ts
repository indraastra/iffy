/**
 * Impressionist Iffy App - Pure impressionist architecture
 */

import { ImpressionistGameManager } from '@/ui/ImpressionistGameManager';
import { AnthropicService } from '@/services/anthropicService';
import { DebugPane } from '@/ui/debugPane';

class ImpressionistIffyApp {
  private anthropicService: AnthropicService;
  private debugPane: DebugPane;
  
  constructor() {
    // Initialize core services
    this.anthropicService = new AnthropicService();
    this.debugPane = new DebugPane();
    
    // Get DOM elements
    const storyOutput = document.getElementById('story-output')!;
    const commandInput = document.getElementById('command-input') as HTMLTextAreaElement;
    
    // Initialize impressionist game manager
    new ImpressionistGameManager({
      storyOutput,
      commandInput,
      anthropicService: this.anthropicService,
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
    this.setupAutoResizeTextarea();
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
   * Set up auto-resize for textarea
   */
  private setupAutoResizeTextarea(): void {
    const commandInput = document.getElementById('command-input') as HTMLTextAreaElement;
    
    const autoResize = () => {
      commandInput.style.height = 'auto';
      commandInput.style.height = Math.min(commandInput.scrollHeight, 150) + 'px';
    };
    
    commandInput.addEventListener('input', autoResize);
    commandInput.addEventListener('paste', () => setTimeout(autoResize, 0));
    
    // Initial resize
    autoResize();
  }

  /**
   * Set up settings management
   */
  private setupSettings(): void {
    // Load saved API key
    const savedKey = localStorage.getItem('iffy_api_key');
    if (savedKey) {
      this.anthropicService.setApiKey(savedKey);
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
    const currentKey = localStorage.getItem('iffy_api_key') || '';
    const maskedKey = currentKey ? currentKey.substring(0, 8) + '...' : 'Not configured';
    const isConfigured = currentKey ? 'configured' : 'not-configured';
    
    const menu = document.createElement('div');
    menu.className = 'impressionist-settings-menu';
    
    menu.innerHTML = `
      <div class="settings-overlay"></div>
      <div class="settings-content">
        <h3>⚙️ Settings</h3>
        <p class="settings-description">Configure your Anthropic API key and app preferences</p>
        
        <div class="api-section">
          <h4>🔑 API Configuration</h4>
          <div class="api-status ${isConfigured}">
            ${isConfigured === 'configured' ? '✅' : '❌'} Status: ${maskedKey}
          </div>
          
          <div class="setting-group">
            <label for="settings-api-key">Anthropic API Key:</label>
            <input 
              type="password" 
              id="settings-api-key" 
              placeholder="sk-ant-..." 
              value="${currentKey}"
              autocomplete="new-password"
              data-lpignore="true"
            />
            <small>Your API key is stored locally and never sent to our servers.</small>
          </div>
        </div>
        
        <div class="debug-section">
          <h4>🛠️ Debug Tools</h4>
          <div class="debug-actions">
            <button class="action-btn" id="clear-storage">🗑️ Clear All Data</button>
            <button class="action-btn" id="export-logs">📄 Export Debug Logs</button>
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
   * Attach settings menu events
   */
  private attachSettingsMenuEvents(menu: HTMLElement): void {
    const overlay = menu.querySelector('.settings-overlay');
    const closeBtn = menu.querySelector('.close-btn');
    const cancelBtn = menu.querySelector('#cancel-settings');
    const saveBtn = menu.querySelector('#save-settings');
    const apiKeyInput = menu.querySelector('#settings-api-key') as HTMLInputElement;
    const clearStorageBtn = menu.querySelector('#clear-storage');
    const exportLogsBtn = menu.querySelector('#export-logs');
    
    // Close menu
    const closeMenu = () => document.body.removeChild(menu);
    
    overlay?.addEventListener('click', closeMenu);
    closeBtn?.addEventListener('click', closeMenu);
    cancelBtn?.addEventListener('click', closeMenu);
    
    // Save settings
    saveBtn?.addEventListener('click', () => {
      const apiKey = apiKeyInput.value.trim();
      
      if (apiKey) {
        localStorage.setItem('iffy_api_key', apiKey);
        this.anthropicService.setApiKey(apiKey);
        this.addSystemMessage('✅ API key saved successfully');
      } else {
        localStorage.removeItem('iffy_api_key');
        this.addSystemMessage('🗑️ API key removed');
      }
      
      closeMenu();
    });
    
    // Clear storage
    clearStorageBtn?.addEventListener('click', () => {
      if (confirm('Clear all saved games and settings? This cannot be undone.')) {
        localStorage.clear();
        this.addSystemMessage('🗑️ All local data cleared');
        closeMenu();
      }
    });
    
    // Export logs
    exportLogsBtn?.addEventListener('click', () => {
      const logs = 'Debug logs feature not yet implemented';
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `iffy-debug-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.addSystemMessage('📄 Debug logs exported');
      closeMenu();
    });
  }

  /**
   * Check if API key is configured
   */
  private isApiKeyConfigured(): boolean {
    return this.anthropicService.isConfigured();
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
        <button id="quick-settings" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
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