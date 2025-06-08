import { GameEngine } from '@/engine/gameEngine';
import { DebugPane } from '@/ui/debugPane';
import { MessageDisplay } from '@/ui/MessageDisplay';
import { LoadMenuManager } from '@/ui/LoadMenuManager';
import { SettingsManager } from '@/ui/SettingsManager';
import { CommandProcessor } from '@/ui/CommandProcessor';
import { GameManager } from '@/ui/GameManager';

class IffyApp {
  private gameEngine: GameEngine;
  private debugPane: DebugPane;
  private messageDisplay: MessageDisplay;
  private loadMenuManager: LoadMenuManager;
  private settingsManager: SettingsManager;
  private commandProcessor: CommandProcessor;
  private commandInput: HTMLInputElement;
  
  constructor() {
    this.gameEngine = new GameEngine();
    this.debugPane = new DebugPane();
    
    // Get DOM elements
    const storyOutput = document.getElementById('story-output')!;
    this.commandInput = document.getElementById('command-input') as HTMLInputElement;
    
    // Initialize UI managers
    this.messageDisplay = new MessageDisplay(storyOutput);
    this.messageDisplay.setItemLookup((itemId: string) => this.gameEngine.getItem(itemId));
    this.commandProcessor = new CommandProcessor(this.gameEngine, this.messageDisplay, this.commandInput);
    new GameManager(this.gameEngine, this.messageDisplay); // GameManager sets up its own event listeners
    this.loadMenuManager = new LoadMenuManager(this.gameEngine, this.messageDisplay, this.commandInput);
    this.settingsManager = new SettingsManager(this.gameEngine, this.messageDisplay);
    
    // Set up UI reset callback so GameEngine can reset UI state when needed
    this.gameEngine.setUIResetCallback(() => {
      this.commandProcessor.resetUIState();
    });
    
    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  private initializeApp(): void {
    this.setupEventListeners();
    this.displayWelcomeMessage();
    this.createDebugToggle();
    this.setupDebugLogging();
  }

  /**
   * Set up global event listeners
   */
  private setupEventListeners(): void {
    // Load button
    document.getElementById('load-btn')!.addEventListener('click', () => {
      this.loadMenuManager.showLoadOptions();
    });

    // Debug pane keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        this.debugPane.toggle();
      }
    });
  }

  /**
   * Display the welcome message
   */
  private displayWelcomeMessage(): void {
    this.messageDisplay.addMessage('Welcome to Iffy - LLM-powered Interactive Fiction Engine', 'title');
    this.messageDisplay.addMessage('To get started, click the "Load" button to load a story file (.yaml)', 'system');
    
    if (!this.settingsManager.isApiKeyConfigured()) {
      this.settingsManager.promptForApiKey();
    } else {
      this.messageDisplay.addMessage('✅ LLM integration active! Try natural language commands like "examine the room" or "pick up the key".', 'system');
    }
  }

  /**
   * Create debug toggle button
   */
  private createDebugToggle(): void {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'debug-toggle-btn';
    toggleBtn.innerHTML = '🐛';
    toggleBtn.title = 'Toggle Debug Pane (Ctrl+D)';
    toggleBtn.addEventListener('click', () => this.debugPane.toggle());
    document.body.appendChild(toggleBtn);
  }

  /**
   * Set up debug logging
   */
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