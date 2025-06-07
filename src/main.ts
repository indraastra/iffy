import { StoryParser, StoryParseError } from '@/engine/storyParser';
import { GameEngine } from '@/engine/gameEngine';
import { PlayerAction } from '@/types/story';
import { DebugPane } from '@/components/debugPane';
import { richTextParser } from '@/utils/richTextParser';

class IffyApp {
  private gameEngine: GameEngine;
  private storyOutput: HTMLElement;
  private commandInput: HTMLInputElement;
  private settingsModal: HTMLElement;
  private apiKeyInput: HTMLInputElement;
  private debugPane: DebugPane;
  
  constructor() {
    this.gameEngine = new GameEngine();
    this.debugPane = new DebugPane();
    
    // Get DOM elements
    this.storyOutput = document.getElementById('story-output')!;
    this.commandInput = document.getElementById('command-input') as HTMLInputElement;
    this.settingsModal = document.getElementById('settings-modal')!;
    this.apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
    
    this.initializeEventListeners();
    this.loadApiKey();
    this.displayWelcomeMessage();
    this.createDebugToggle();
    this.setupDebugLogging();
    this.createApiKeyStatusIndicator();
  }

  private initializeEventListeners(): void {
    // Command input handling
    this.commandInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.processCommand();
      }
    });

    // Settings modal
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

    // Save/Load buttons
    document.getElementById('save-btn')!.addEventListener('click', () => this.saveGame());
    document.getElementById('load-btn')!.addEventListener('click', () => this.showLoadOptions());

    // Debug pane keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        this.debugPane.toggle();
      }
    });

    // Clickable elements in rich text
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('clickable-element')) {
        const text = target.getAttribute('data-clickable-text');
        if (text) {
          // Append to existing input with a space if needed
          const currentValue = this.commandInput.value;
          const needsSpace = currentValue.length > 0 && !currentValue.endsWith(' ');
          this.commandInput.value = currentValue + (needsSpace ? ' ' : '') + text;
          this.commandInput.focus();
          
          // Position cursor at the end
          this.commandInput.setSelectionRange(this.commandInput.value.length, this.commandInput.value.length);
        }
      }
    });
  }


  private async processCommand(): Promise<void> {
    const input = this.commandInput.value.trim();
    if (!input) return;

    // Show user input
    this.addMessage(`> ${input}`, 'input');
    
    // Clear input and disable input during processing
    this.commandInput.value = '';
    this.commandInput.disabled = true;
    this.addMessage('Processing...', 'system');

    let response: any = null;

    try {
      // Process action
      const action: PlayerAction = {
        type: 'command',
        input: input,
        timestamp: new Date()
      };

      response = await this.gameEngine.processAction(action);
      
      // Remove processing message
      const messages = this.storyOutput.querySelectorAll('.story-text');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.textContent === 'Processing...') {
        lastMessage.remove();
      }
      
      // Show response
      if (response.error) {
        this.addMessage(response.text, 'error');
      } else {
        this.addMessage(response.text, 'story');
      }

      // Show completion message if game ended
      if (response.gameState.gameEnded && response.gameState.endingId) {
        this.addMessage('🎉 Story Complete! You can continue exploring or reflecting on your choices.', 'system');
      }

      // Show choices if available
      if (response.choices && response.choices.length > 0) {
        const choicesText = 'Choose:\n' + response.choices.map((choice: string, i: number) => `${i + 1}. ${choice}`).join('\n');
        this.addMessage(choicesText, 'choices');
      }
    } catch (error) {
      // Remove processing message
      const messages = this.storyOutput.querySelectorAll('.story-text');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.textContent === 'Processing...') {
        lastMessage.remove();
      }
      
      this.addMessage('An error occurred while processing your command.', 'error');
      console.error('Command processing error:', error);
    } finally {
      // Re-enable input
      this.commandInput.disabled = false;
      this.commandInput.focus();
      
      // Update input placeholder if game is completed
      if (response && response.gameState.gameEnded) {
        this.commandInput.placeholder = "Story complete! Ask questions, reflect, or explore...";
      }
    }
  }

  private addMessage(text: string, type: 'story' | 'input' | 'error' | 'system' | 'choices' | 'title'): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `story-text ${type}`;
    
    // Use rich text formatting for story content, plain text for others
    if (type === 'story') {
      const richContent = richTextParser.renderContent(text);
      messageDiv.appendChild(richContent);
    } else {
      messageDiv.textContent = text;
    }
    
    this.storyOutput.appendChild(messageDiv);
    this.storyOutput.scrollTop = this.storyOutput.scrollHeight;
  }

  private clearOutput(): void {
    this.storyOutput.innerHTML = '';
  }

  private displayWelcomeMessage(): void {
    this.addMessage('Welcome to Iffy - LLM-powered Interactive Fiction Engine', 'title');
    this.addMessage('To get started, click the "Load" button to load a story file (.yaml)', 'system');
    
    if (!this.gameEngine.getAnthropicService().isConfigured()) {
      this.promptForApiKey();
    } else {
      this.addMessage('✅ LLM integration active! Try natural language commands like "examine the room" or "pick up the key".', 'system');
    }
  }

  private promptForApiKey(): void {
    this.addMessage('🔑 API Key Required', 'title');
    this.addMessage('Iffy uses Claude AI for natural language understanding. You\'ll need an Anthropic API key to unlock the full experience.', 'system');
    this.addMessage('', 'system'); // Empty line for spacing
    
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

    this.storyOutput.appendChild(promptDiv);
    this.storyOutput.scrollTop = this.storyOutput.scrollHeight;

    // Add event listeners
    const setupBtn = promptDiv.querySelector('#setup-api-key') as HTMLElement;
    const basicBtn = promptDiv.querySelector('#continue-basic') as HTMLElement;

    setupBtn.addEventListener('click', () => {
      promptDiv.remove();
      this.showSettings();
      this.addMessage('💡 Tip: You can always access Settings later to add your API key.', 'system');
    });

    basicBtn.addEventListener('click', () => {
      promptDiv.remove();
      this.addMessage('⚠️ Running in Basic Mode - Limited to simple commands like "look", "go [direction]", "inventory".', 'system');
      this.addMessage('💡 You can enable enhanced AI anytime by clicking Settings and adding your API key.', 'system');
    });
  }

  private showSettings(): void {
    this.settingsModal.classList.remove('hidden');
    this.apiKeyInput.focus();
  }

  private hideSettings(): void {
    this.settingsModal.classList.add('hidden');
  }

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

  private loadApiKey(): void {
    const savedKey = localStorage.getItem('iffy_api_key');
    if (savedKey) {
      this.apiKeyInput.value = savedKey;
    }
  }

  private saveGame(): void {
    try {
      const saveData = this.gameEngine.saveGame();
      const blob = new Blob([saveData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const filename = this.generateSaveFilename();
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      
      URL.revokeObjectURL(url);
      this.addMessage(`Game saved as "${filename}"!`, 'system');
    } catch (error) {
      this.addMessage('Failed to save game.', 'error');
    }
  }

  private generateSaveFilename(): string {
    const storyTitle = this.gameEngine.getCurrentStoryTitle();
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    
    if (storyTitle) {
      const sanitizedTitle = this.sanitizeFilename(storyTitle);
      return `${sanitizedTitle}_${timestamp}_${time}.json`;
    } else {
      return `iffy_save_${timestamp}_${time}.json`;
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace characters that aren't allowed in filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  private showLoadOptions(): void {
    const options = [
      { text: 'Load Story File (.yaml)', action: () => this.loadStoryFile() },
      { text: 'Load Save Game (.json)', action: () => this.loadSaveGame() }
    ];

    // Create a simple menu
    const menu = document.createElement('div');
    menu.className = 'load-menu';
    menu.innerHTML = `
      <div class="load-menu-content">
        <h3>What would you like to load?</h3>
        ${options.map((option, index) => 
          `<button class="load-option-btn" data-index="${index}">${option.text}</button>`
        ).join('')}
        <button class="load-cancel-btn">Cancel</button>
      </div>
    `;

    // Style the menu
    menu.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 15, 35, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1001;
    `;

    const content = menu.querySelector('.load-menu-content') as HTMLElement;
    content.style.cssText = `
      background: var(--primary-color);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      min-width: 300px;
    `;

    // Add event listeners
    options.forEach((option, index) => {
      const btn = menu.querySelector(`[data-index="${index}"]`) as HTMLElement;
      btn.style.cssText = `
        display: block;
        width: 100%;
        margin: 1rem 0;
        padding: 0.75rem;
        background: var(--button-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
      `;
      btn.addEventListener('click', () => {
        document.body.removeChild(menu);
        option.action();
      });
    });

    const cancelBtn = menu.querySelector('.load-cancel-btn') as HTMLElement;
    cancelBtn.style.cssText = `
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: transparent;
      color: var(--text-color);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
    `;
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(menu);
    });

    document.body.appendChild(menu);
  }

  private loadStoryFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadStoryFileFromFile(file);
      }
    };
    
    input.click();
  }

  private async loadStoryFileFromFile(file: File): Promise<void> {
    try {
      this.addMessage('Loading story...', 'system');
      
      const story = await StoryParser.parseFromFile(file);
      this.gameEngine.loadStory(story);
      
      // Clear output and show story start
      this.clearOutput();
      this.addMessage(`${story.title} by ${story.author}`, 'title');
      this.addMessage(this.gameEngine.getInitialText(), 'story');
      
      // Show first flow content if it exists, otherwise issue automatic "look"
      const firstFlow = story.flows.find(flow => flow.id === story.start.first_flow);
      if (firstFlow && firstFlow.content) {
        // Show the first flow's content
        this.addMessage(firstFlow.content, 'story');
      } else {
        // Issue automatic "look" command for flows without content
        const response = await this.gameEngine.processAction({ 
          type: 'command', 
          input: 'look', 
          timestamp: new Date() 
        });
        this.addMessage(response.text, 'story');
      }
      
      this.commandInput.focus();
      
    } catch (error) {
      let errorMessage = 'Failed to load story file.';
      
      if (error instanceof StoryParseError) {
        errorMessage = `Story parsing error: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      this.addMessage(errorMessage, 'error');
    }
  }

  private loadSaveGame(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const saveData = e.target?.result as string;
            if (this.gameEngine.loadGame(saveData)) {
              this.addMessage('Game loaded successfully!', 'system');
              // Refresh display
              const response = await this.gameEngine.processAction({ 
                type: 'command', 
                input: 'look', 
                timestamp: new Date() 
              });
              this.addMessage(response.text, 'story');
            } else {
              this.addMessage('Failed to load save file. Make sure you have the correct story loaded.', 'error');
            }
          } catch (error) {
            this.addMessage('Invalid save file format.', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  }

  private createDebugToggle(): void {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'debug-toggle-btn';
    toggleBtn.innerHTML = '🐛';
    toggleBtn.title = 'Toggle Debug Pane (Ctrl+D)';
    toggleBtn.addEventListener('click', () => this.debugPane.toggle());
    document.body.appendChild(toggleBtn);
  }

  private setupDebugLogging(): void {
    // Connect debug pane to game engine
    this.gameEngine.setDebugPane(this.debugPane);
    
    // Also set up the old callback for backward compatibility
    this.gameEngine.getAnthropicService().setDebugCallback((prompt: string, response: string) => {
      if (prompt) {
        this.debugPane.logRequest(prompt);
      }
      if (response) {
        this.debugPane.logResponse(response);
      }
    });
  }

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
}

// CSS for message types
const additionalStyles = `
.story-text.input {
  color: #888;
  font-style: italic;
  margin-bottom: 0.5rem;
}

.story-text.error {
  color: #ff6b6b;
  font-weight: bold;
}

.story-text.system {
  color: #4ecdc4;
  font-style: italic;
}

.story-text.choices {
  color: #ffe66d;
  margin: 1rem 0;
  padding: 1rem;
  border-left: 3px solid #ffe66d;
  background-color: rgba(255, 230, 109, 0.1);
}

.story-text.title {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 1rem;
  text-align: center;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 0.5rem;
}

/* Game completion styling */
.command-input[placeholder*="complete"] {
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
}

.story-complete-indicator {
  background-color: rgba(76, 175, 80, 0.2);
  border-left: 4px solid #4CAF50;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}
`;

// Add additional styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new IffyApp();
});