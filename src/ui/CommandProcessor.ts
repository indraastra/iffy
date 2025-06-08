import { GameEngine } from '@/engine/gameEngine';
import { PlayerAction } from '@/types/story';
import { MessageDisplay } from './MessageDisplay';

/**
 * Handles command input processing and game engine interaction
 */
export class CommandProcessor {
  private gameEngine: GameEngine;
  private messageDisplay: MessageDisplay;
  private commandInput: HTMLTextAreaElement;
  private hasShownCompletionMessage: boolean = false;

  constructor(gameEngine: GameEngine, messageDisplay: MessageDisplay, commandInput: HTMLTextAreaElement) {
    this.gameEngine = gameEngine;
    this.messageDisplay = messageDisplay;
    this.commandInput = commandInput;
    
    this.setupEventListeners();
  }

  /**
   * Set up command input event listeners
   */
  private setupEventListeners(): void {
    // Command input handling
    this.commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent new line
        this.processCommand();
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

  /**
   * Process a command from user input
   */
  async processCommand(): Promise<void> {
    const input = this.commandInput.value.trim();
    if (!input) return;

    // Show user input
    this.messageDisplay.addMessage(`> ${input}`, 'input');
    
    // Clear input and disable input during processing
    this.commandInput.value = '';
    this.commandInput.style.height = 'auto'; // Reset height immediately
    this.commandInput.disabled = true;
    this.messageDisplay.addMessage('Processing...', 'system');

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
      this.messageDisplay.removeLastMessageIfMatches('Processing...');
      
      // Show response
      if (response.error) {
        this.messageDisplay.addMessage(response.text, 'error');
      } else {
        this.messageDisplay.addMessage(response.text, 'story');
      }

      // Show completion message if game ended (only once)
      if (response.gameState.gameEnded && response.gameState.endingId && !this.hasShownCompletionMessage) {
        this.messageDisplay.addMessage('🎉 Story Complete! You can continue exploring or reflecting on your choices.', 'system');
        this.hasShownCompletionMessage = true;
      }

      // Show choices if available
      if (response.choices && response.choices.length > 0) {
        const choicesText = 'Choose:\n' + response.choices.map((choice: string, i: number) => `${i + 1}. ${choice}`).join('\n');
        this.messageDisplay.addMessage(choicesText, 'choices');
      }
    } catch (error) {
      // Remove processing message
      this.messageDisplay.removeLastMessageIfMatches('Processing...');
      
      this.messageDisplay.addMessage('An error occurred while processing your command.', 'error');
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

  /**
   * Focus the command input
   */
  focus(): void {
    this.commandInput.focus();
  }

  /**
   * Reset UI state when loading a new game
   */
  resetUIState(): void {
    this.commandInput.placeholder = "Enter your command...";
    this.commandInput.disabled = false;
    this.hasShownCompletionMessage = false;
  }

  /**
   * Show loading state and disable input
   */
  showLoading(message: string = 'Processing...'): void {
    this.commandInput.disabled = true;
    this.messageDisplay.addMessage(message, 'system');
  }

  /**
   * Hide loading state and re-enable input
   */
  hideLoading(loadingMessage: string = 'Processing...'): void {
    this.messageDisplay.removeLastMessageIfMatches(loadingMessage);
    this.commandInput.disabled = false;
    this.commandInput.focus();
  }
}