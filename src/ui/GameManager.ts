import { GameEngine } from '@/engine/gameEngine';
import { MessageDisplay } from './MessageDisplay';

/**
 * Manages game save/load functionality
 */
export class GameManager {
  private gameEngine: GameEngine;
  private messageDisplay: MessageDisplay;

  constructor(gameEngine: GameEngine, messageDisplay: MessageDisplay) {
    this.gameEngine = gameEngine;
    this.messageDisplay = messageDisplay;
    
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
      this.messageDisplay.addMessage(`Game saved as "${filename}"!`, 'system');
    } catch (error) {
      this.messageDisplay.addMessage('Failed to save game.', 'error');
    }
  }

  /**
   * Generate a filename for saving games
   */
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

  /**
   * Sanitize a filename for safe file system use
   */
  private sanitizeFilename(filename: string): string {
    // Remove or replace characters that aren't allowed in filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }
}