import { GameEngine } from '@/engine/gameEngine';
import { MessageDisplay } from './MessageDisplay';

export interface SaveMetadata {
  storyTitle: string;
  timestamp: Date;
  location: string;
  playtime?: number;
}

export interface SaveOptions {
  autoSaveEnabled: boolean;
  autoSaveIntervalMinutes: number;
}

export class SaveManager {
  private gameEngine: GameEngine;
  private messageDisplay: MessageDisplay;
  private autoSaveInterval: number | null = null;
  private options: SaveOptions;
  private sessionStartTime: Date | null = null;

  constructor(gameEngine: GameEngine, messageDisplay: MessageDisplay, options: SaveOptions = { autoSaveEnabled: true, autoSaveIntervalMinutes: 2 }) {
    this.gameEngine = gameEngine;
    this.messageDisplay = messageDisplay;
    this.options = options;
  }

  /**
   * Initialize the save manager and check for recovery
   */
  initialize(): void {
    this.sessionStartTime = new Date();
    
    if (this.options.autoSaveEnabled) {
      this.startAutoSave();
    }
  }

  /**
   * Check for recovery when a new story is loaded
   */
  checkForStoryRecovery(): void {
    this.checkForRecovery();
  }

  /**
   * Start auto-save timer
   */
  startAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      return;
    }

    if (!SaveManager.isLocalStorageAvailable()) {
      console.warn('LocalStorage not available, auto-save disabled');
      return;
    }

    this.autoSaveInterval = window.setInterval(() => {
      this.performAutoSave();
    }, this.options.autoSaveIntervalMinutes * 60 * 1000);

    console.log(`🔄 Auto-save enabled: every ${this.options.autoSaveIntervalMinutes} minutes`);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('🛑 Auto-save stopped');
    }
  }

  /**
   * Update save options
   */
  updateOptions(options: Partial<SaveOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (this.autoSaveInterval !== null) {
      this.stopAutoSave();
    }
    
    if (this.options.autoSaveEnabled) {
      this.startAutoSave();
    }
  }

  /**
   * Perform auto-save
   */
  private performAutoSave(): void {
    const storyTitle = this.gameEngine.getCurrentStoryTitle();
    if (!storyTitle) {
      return; // No game loaded, skip auto-save
    }

    try {
      const saveData = this.gameEngine.saveGame();
      const metadata: SaveMetadata = {
        storyTitle,
        timestamp: new Date(),
        location: this.getCurrentLocationName(),
        playtime: this.getSessionPlaytime()
      };

      this.saveToLocalStorage(storyTitle, saveData, metadata);
      console.log(`💾 Auto-saved game: ${storyTitle}`);
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }

  /**
   * Manually save game
   */
  saveGame(): void {
    const storyTitle = this.gameEngine.getCurrentStoryTitle();
    if (!storyTitle) {
      this.messageDisplay.addMessage('No game loaded to save.', 'error');
      return;
    }

    try {
      const saveData = this.gameEngine.saveGame();
      const metadata: SaveMetadata = {
        storyTitle,
        timestamp: new Date(),
        location: this.getCurrentLocationName(),
        playtime: this.getSessionPlaytime()
      };

      // Save to localStorage
      this.saveToLocalStorage(storyTitle, saveData, metadata);
      
      // Also download as JSON (existing functionality)
      this.downloadSaveFile(saveData, storyTitle);
      
      this.messageDisplay.addMessage(`Game saved: ${storyTitle}`, 'system');
    } catch (error) {
      this.messageDisplay.addMessage('Failed to save game.', 'error');
      console.error('Save failed:', error);
    }
  }

  /**
   * Load game from localStorage
   */
  loadGame(storyTitle: string): boolean {
    try {
      const saveData = localStorage.getItem(this.getSaveKey(storyTitle));
      if (!saveData) {
        this.messageDisplay.addMessage(`No saved game found for: ${storyTitle}`, 'error');
        return false;
      }

      const result = this.gameEngine.loadGame(saveData);
      if (result.success) {
        // Success message is handled by MessageDisplay.restoreConversationHistory()
        return true;
      } else {
        this.messageDisplay.addMessage(result.error || 'Failed to load game.', 'error');
        return false;
      }
    } catch (error) {
      this.messageDisplay.addMessage('Failed to load saved game.', 'error');
      console.error('Load failed:', error);
      return false;
    }
  }

  /**
   * Delete saved game
   */
  deleteSave(storyTitle: string): void {
    try {
      localStorage.removeItem(this.getSaveKey(storyTitle));
      localStorage.removeItem(this.getMetadataKey(storyTitle));
      this.messageDisplay.addMessage(`Deleted saved game: ${storyTitle}`, 'system');
    } catch (error) {
      this.messageDisplay.addMessage('Failed to delete saved game.', 'error');
      console.error('Delete failed:', error);
    }
  }

  /**
   * Get all saved games
   */
  getSavedGames(): Array<SaveMetadata & { storyTitle: string }> {
    const saves: Array<SaveMetadata & { storyTitle: string }> = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('iffy_save_') && !key.endsWith('_metadata')) {
          const storyTitle = key.replace('iffy_save_', '');
          const metadataStr = localStorage.getItem(this.getMetadataKey(storyTitle));
          
          if (metadataStr) {
            try {
              const metadata = JSON.parse(metadataStr);
              saves.push({
                storyTitle,
                ...metadata,
                timestamp: new Date(metadata.timestamp)
              });
            } catch (e) {
              console.warn(`Failed to parse metadata for ${storyTitle}:`, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get saved games:', error);
    }

    return saves.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Check for recovery on startup
   */
  private checkForRecovery(): void {
    const storyTitle = this.gameEngine.getCurrentStoryTitle();
    if (!storyTitle) {
      return;
    }

    const metadataStr = localStorage.getItem(this.getMetadataKey(storyTitle));
    if (!metadataStr) {
      return;
    }

    try {
      const metadata = JSON.parse(metadataStr);
      const saveTime = new Date(metadata.timestamp);
      const timeDiff = Date.now() - saveTime.getTime();
      
      // Offer recovery if save is less than 30 minutes old
      if (timeDiff < 30 * 60 * 1000) {
        this.offerGameRecovery(storyTitle, saveTime);
      }
    } catch (error) {
      console.warn('Failed to check for recovery:', error);
    }
  }

  /**
   * Offer game recovery to user
   */
  private offerGameRecovery(storyTitle: string, saveTime: Date): void {
    const timeAgo = this.formatTimeAgo(saveTime);
    const message = `Found a recent save for "${storyTitle}" from ${timeAgo}. Would you like to continue where you left off?`;
    
    if (confirm(message)) {
      this.loadGame(storyTitle);
    }
  }

  /**
   * Save to localStorage with metadata
   */
  private saveToLocalStorage(storyTitle: string, saveData: string, metadata: SaveMetadata): void {
    try {
      localStorage.setItem(this.getSaveKey(storyTitle), saveData);
      localStorage.setItem(this.getMetadataKey(storyTitle), JSON.stringify({
        ...metadata,
        timestamp: metadata.timestamp.toISOString()
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.messageDisplay.addMessage('Storage full. Please delete old saves or free up browser storage.', 'error');
      }
      throw error;
    }
  }

  /**
   * Download save file (existing functionality)
   */
  private downloadSaveFile(saveData: string, storyTitle: string): void {
    const blob = new Blob([saveData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const filename = this.generateSaveFilename(storyTitle);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename for downloaded saves
   */
  private generateSaveFilename(storyTitle: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const sanitizedTitle = this.sanitizeFilename(storyTitle);
    return `${sanitizedTitle}_${timestamp}_${time}.json`;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  /**
   * Get localStorage key for save data
   */
  private getSaveKey(storyTitle: string): string {
    return `iffy_save_${storyTitle}`;
  }

  /**
   * Get localStorage key for metadata
   */
  private getMetadataKey(storyTitle: string): string {
    return `iffy_save_${storyTitle}_metadata`;
  }

  /**
   * Get current location name
   */
  private getCurrentLocationName(): string {
    const location = this.gameEngine.getCurrentLocation();
    return location?.name || 'Unknown Location';
  }

  /**
   * Get session playtime in minutes
   */
  private getSessionPlaytime(): number {
    if (!this.sessionStartTime) return 0;
    return Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000 / 60);
  }

  /**
   * Format time ago string
   */
  private formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  /**
   * Check if localStorage is available
   */
  static isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get auto-save status
   */
  getStatus(): { autoSaveEnabled: boolean; running: boolean; intervalMinutes: number } {
    return {
      autoSaveEnabled: this.options.autoSaveEnabled,
      running: this.autoSaveInterval !== null,
      intervalMinutes: this.options.autoSaveIntervalMinutes
    };
  }
}