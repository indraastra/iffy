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
   * Show settings dialog
   */
  private showSettings(): void {
    const dialog = this.createSettingsDialog();
    document.body.appendChild(dialog);
  }

  /**
   * Create settings dialog
   */
  private createSettingsDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'settings-dialog';
    
    const currentKey = localStorage.getItem('iffy_api_key') || '';
    const maskedKey = currentKey ? currentKey.substring(0, 8) + '...' : 'Not set';
    
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <h3>⚙️ Settings</h3>
        
        <div class="setting-group">
          <label for="api-key">Anthropic API Key:</label>
          <input type="password" id="api-key" placeholder="sk-ant-..." value="${currentKey}">
          <div class="setting-note">Current: ${maskedKey}</div>
        </div>
        
        <div class="setting-group">
          <label>Debug Features:</label>
          <button id="clear-storage">Clear All Saves</button>
          <button id="export-logs">Export Debug Logs</button>
        </div>
        
        <div class="dialog-buttons">
          <button id="save-settings" class="primary">Save</button>
          <button id="cancel-settings">Cancel</button>
        </div>
      </div>
    `;
    
    this.styleSettingsDialog();
    this.attachSettingsEvents(dialog);
    
    return dialog;
  }

  /**
   * Style settings dialog
   */
  private styleSettingsDialog(): void {
    if (document.getElementById('settings-dialog-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'settings-dialog-styles';
    style.textContent = `
      .settings-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
      }
      
      .dialog-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
      }
      
      .dialog-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 2rem;
        min-width: 400px;
      }
      
      .setting-group {
        margin: 1rem 0;
      }
      
      .setting-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
      }
      
      .setting-group input {
        width: 100%;
        padding: 0.5rem;
        background: var(--input-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-family: inherit;
      }
      
      .setting-note {
        font-size: 0.9rem;
        opacity: 0.7;
        margin-top: 0.25rem;
      }
      
      .dialog-buttons {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 2rem;
      }
      
      .dialog-buttons button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
      }
      
      .dialog-buttons button.primary {
        background: var(--accent-color);
        color: white;
        border-color: var(--accent-color);
      }
      
      .dialog-buttons button:not(.primary) {
        background: transparent;
        color: var(--text-color);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Attach settings dialog events
   */
  private attachSettingsEvents(dialog: HTMLElement): void {
    const overlay = dialog.querySelector('.dialog-overlay');
    const cancelBtn = dialog.querySelector('#cancel-settings');
    const saveBtn = dialog.querySelector('#save-settings');
    const apiKeyInput = dialog.querySelector('#api-key') as HTMLInputElement;
    const clearStorageBtn = dialog.querySelector('#clear-storage');
    const exportLogsBtn = dialog.querySelector('#export-logs');
    
    // Close dialog
    const closeDialog = () => document.body.removeChild(dialog);
    
    overlay?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);
    
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
      
      closeDialog();
    });
    
    // Clear storage
    clearStorageBtn?.addEventListener('click', () => {
      if (confirm('Clear all saved games and settings? This cannot be undone.')) {
        localStorage.clear();
        this.addSystemMessage('🗑️ All local data cleared');
        closeDialog();
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
      closeDialog();
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