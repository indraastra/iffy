import { StoryParser, StoryParseError } from '@/engine/storyParser';
import { GameEngine } from '@/engine/gameEngine';
import { PlayerAction } from '@/types/story';
import { DebugPane } from '@/components/debugPane';

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

    try {
      // Process action
      const action: PlayerAction = {
        type: 'command',
        input: input,
        timestamp: new Date()
      };

      const response = await this.gameEngine.processAction(action);
      
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

      // Show choices if available
      if (response.choices && response.choices.length > 0) {
        const choicesText = 'Choose:\n' + response.choices.map((choice, i) => `${i + 1}. ${choice}`).join('\n');
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
    }
  }

  private addMessage(text: string, type: 'story' | 'input' | 'error' | 'system' | 'choices' | 'title'): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `story-text ${type}`;
    messageDiv.textContent = text;
    
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
      this.addMessage('⚠️ For enhanced natural language understanding, set your Anthropic API key in Settings.', 'system');
      this.addMessage('Without an API key, basic commands like "look", "go [direction]", "inventory", or "help" will work.', 'system');
    } else {
      this.addMessage('✅ LLM integration active! Try natural language commands like "examine the room" or "pick up the key".', 'system');
    }
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
    } else {
      localStorage.removeItem('iffy_api_key');
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
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'iffy_save.json';
      a.click();
      
      URL.revokeObjectURL(url);
      this.addMessage('Game saved successfully!', 'system');
    } catch (error) {
      this.addMessage('Failed to save game.', 'error');
    }
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
      
      // Show current location
      const response = await this.gameEngine.processAction({ 
        type: 'command', 
        input: 'look', 
        timestamp: new Date() 
      });
      this.addMessage(response.text, 'story');
      
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
    this.gameEngine.getAnthropicService().setDebugCallback((prompt: string, response: string) => {
      if (prompt) {
        this.debugPane.logRequest(prompt);
      }
      if (response) {
        this.debugPane.logResponse(response);
      }
    });
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
`;

// Add additional styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new IffyApp();
});