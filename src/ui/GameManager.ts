import { GameEngine } from '@/engine/gameEngine';
import { MessageDisplay } from './MessageDisplay';
import { SaveManager } from './SaveManager';

/**
 * Manages game save/load functionality
 */
export class GameManager {
  private saveManager: SaveManager;

  constructor(gameEngine: GameEngine, messageDisplay: MessageDisplay) {
    this.saveManager = new SaveManager(gameEngine, messageDisplay);
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for save/load functionality
   */
  private setupEventListeners(): void {
    // Save/Load buttons
    document.getElementById('save-btn')!.addEventListener('click', () => this.saveGame());
  }

  /**
   * Save the current game state
   */
  saveGame(): void {
    this.saveManager.saveGame();
  }

  /**
   * Initialize the save manager
   */
  initialize(): void {
    this.saveManager.initialize();
  }

  /**
   * Get the save manager instance
   */
  getSaveManager(): SaveManager {
    return this.saveManager;
  }
}