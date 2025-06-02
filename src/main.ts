import { StoryParser, StoryParseError } from '@/engine/storyParser';
import { GameEngine } from '@/engine/gameEngine';
import { PlayerAction } from '@/types/story';

class IffyApp {
  private gameEngine: GameEngine;
  private storyOutput: HTMLElement;
  private commandInput: HTMLInputElement;
  private settingsModal: HTMLElement;
  private apiKeyInput: HTMLInputElement;
  private storyFileInput: HTMLInputElement;
  
  constructor() {
    this.gameEngine = new GameEngine();
    
    // Get DOM elements
    this.storyOutput = document.getElementById('story-output')!;
    this.commandInput = document.getElementById('command-input') as HTMLInputElement;
    this.settingsModal = document.getElementById('settings-modal')!;
    this.apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
    this.storyFileInput = document.getElementById('story-file') as HTMLInputElement;
    
    this.initializeEventListeners();
    this.loadApiKey();
    this.displayWelcomeMessage();
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

    // Story file loading
    this.storyFileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadStoryFile(file);
      }
    });

    // Save/Load buttons
    document.getElementById('save-btn')!.addEventListener('click', () => this.saveGame());
    document.getElementById('load-btn')!.addEventListener('click', () => this.loadGame());
  }

  private async loadStoryFile(file: File): Promise<void> {
    try {
      this.addMessage('Loading story...', 'system');
      
      const story = await StoryParser.parseFromFile(file);
      this.gameEngine.loadStory(story);
      
      // Clear output and show story start
      this.clearOutput();
      this.addMessage(`${story.title} by ${story.author}`, 'title');
      this.addMessage(this.gameEngine.getInitialText(), 'story');
      
      // Show current location
      const response = this.gameEngine.processAction({ 
        type: 'command', 
        input: 'look', 
        timestamp: new Date() 
      });
      this.addMessage(response.text, 'story');
      
      this.hideSettings();
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

  private processCommand(): void {
    const input = this.commandInput.value.trim();
    if (!input) return;

    // Show user input
    this.addMessage(`> ${input}`, 'input');
    
    // Clear input
    this.commandInput.value = '';

    // Process action
    const action: PlayerAction = {
      type: 'command',
      input: input,
      timestamp: new Date()
    };

    const response = this.gameEngine.processAction(action);
    
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
    this.addMessage('To get started, click Settings and load a story file (.yaml)', 'system');
    this.addMessage('This is an MVP version. Try commands like "look", "go [direction]", "inventory", or "help".', 'system');
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

  private loadGame(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const saveData = e.target?.result as string;
            if (this.gameEngine.loadGame(saveData)) {
              this.addMessage('Game loaded successfully!', 'system');
              // Refresh display
              const response = this.gameEngine.processAction({ 
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