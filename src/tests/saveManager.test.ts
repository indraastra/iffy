import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SaveManager, SaveOptions } from '../ui/SaveManager';
import { GameEngine } from '../engine/gameEngine';
import { MessageDisplay } from '../ui/MessageDisplay';
import { Story } from '../types/story';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

// Mock window.confirm
const mockConfirm = vi.fn();

describe('SaveManager', () => {
  let saveManager: SaveManager;
  let gameEngine: GameEngine;
  let messageDisplay: MessageDisplay;
  let mockStory: Story;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    mockLocalStorage.clear();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      value: mockConfirm,
      writable: true
    });

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Create mock story
    mockStory = {
      title: "Test Story",
      author: "Test Author",
      version: "1.0",
      metadata: {
        setting: { time: "Present", place: "Test Place" },
        tone: { overall: "mysterious", narrative_voice: "second person" },
        themes: ["testing"],
        ui: { colors: { primary: "#000", background: "#fff", text: "#333" } }
      },
      characters: [],
      locations: [
        {
          id: "start_room",
          name: "Starting Room",
          description: "A test room",
          connections: []
        }
      ],
      items: [],
      knowledge: [],
      flows: [],
      start: {
        content: "Test game started!",
        location: "start_room"
      }
    };

    // Create dependencies
    gameEngine = new GameEngine();
    gameEngine.loadStory(mockStory);

    const mockElement = document.createElement('div');
    messageDisplay = new MessageDisplay(mockElement);
    messageDisplay.addMessage = vi.fn();

    // Create SaveManager
    saveManager = new SaveManager(gameEngine, messageDisplay);
  });

  afterEach(() => {
    // Clean up timers
    saveManager.stopAutoSave();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const status = saveManager.getStatus();
      expect(status.autoSaveEnabled).toBe(true);
      expect(status.intervalMinutes).toBe(2);
      expect(status.running).toBe(false);
    });

    it('should initialize with custom options', () => {
      const customOptions: SaveOptions = {
        autoSaveEnabled: false,
        autoSaveIntervalMinutes: 5
      };
      const customSaveManager = new SaveManager(gameEngine, messageDisplay, customOptions);
      
      const status = customSaveManager.getStatus();
      expect(status.autoSaveEnabled).toBe(false);
      expect(status.intervalMinutes).toBe(5);
    });

    it('should start auto-save when enabled', () => {
      vi.spyOn(window, 'setInterval');
      
      saveManager.initialize();
      
      expect(window.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        120000 // 2 minutes in milliseconds
      );
    });

    it('should not start auto-save when disabled', () => {
      const disabledSaveManager = new SaveManager(gameEngine, messageDisplay, {
        autoSaveEnabled: false,
        autoSaveIntervalMinutes: 2
      });
      
      vi.spyOn(window, 'setInterval');
      disabledSaveManager.initialize();
      
      expect(window.setInterval).not.toHaveBeenCalled();
    });
  });

  describe('Auto-save functionality', () => {
    it('should start auto-save timer', () => {
      vi.spyOn(window, 'setInterval');
      
      saveManager.startAutoSave();
      
      expect(window.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        120000
      );
      expect(saveManager.getStatus().running).toBe(true);
    });

    it('should stop auto-save timer', () => {
      vi.spyOn(window, 'clearInterval');
      
      saveManager.startAutoSave();
      saveManager.stopAutoSave();
      
      expect(window.clearInterval).toHaveBeenCalled();
      expect(saveManager.getStatus().running).toBe(false);
    });

    it('should not start multiple timers', () => {
      vi.spyOn(window, 'setInterval');
      
      saveManager.startAutoSave();
      saveManager.startAutoSave();
      
      expect(window.setInterval).toHaveBeenCalledTimes(1);
    });

    it('should perform auto-save with game loaded', () => {
      // Mock gameEngine.saveGame to return valid JSON
      vi.spyOn(gameEngine, 'saveGame').mockReturnValue('{"test": "data"}');
      vi.spyOn(gameEngine, 'getCurrentStoryTitle').mockReturnValue('Test Story');
      
      saveManager.startAutoSave();
      
      // Manually trigger the auto-save callback
      const callback = vi.mocked(window.setInterval).mock.calls[0][0] as Function;
      callback();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'iffy_save_Test Story',
        '{"test": "data"}'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'iffy_save_Test Story_metadata',
        expect.stringContaining('"storyTitle":"Test Story"')
      );
    });

    it('should skip auto-save when no game is loaded', () => {
      vi.spyOn(gameEngine, 'getCurrentStoryTitle').mockReturnValue(null);
      
      saveManager.startAutoSave();
      
      // Get the callback before clearing mocks
      const setIntervalMock = vi.mocked(window.setInterval);
      const callback = setIntervalMock.mock.calls[0][0] as Function;
      
      // Clear localStorage mocks to check only auto-save calls
      mockLocalStorage.setItem.mockClear();
      
      // Manually trigger the auto-save callback
      callback();
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Manual save functionality', () => {
    beforeEach(() => {
      // Mock document.createElement for download functionality
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    });

    it('should save game successfully', () => {
      vi.spyOn(gameEngine, 'saveGame').mockReturnValue('{"test": "save"}');
      vi.spyOn(gameEngine, 'getCurrentStoryTitle').mockReturnValue('Test Story');
      
      saveManager.saveGame();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'iffy_save_Test Story',
        '{"test": "save"}'
      );
      expect(messageDisplay.addMessage).toHaveBeenCalledWith(
        'Game saved: Test Story',
        'system'
      );
    });

    it('should handle save when no game is loaded', () => {
      vi.spyOn(gameEngine, 'getCurrentStoryTitle').mockReturnValue(null);
      
      saveManager.saveGame();
      
      expect(messageDisplay.addMessage).toHaveBeenCalledWith(
        'No game loaded to save.',
        'error'
      );
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should create download file', () => {
      vi.spyOn(gameEngine, 'saveGame').mockReturnValue('{"test": "save"}');
      vi.spyOn(gameEngine, 'getCurrentStoryTitle').mockReturnValue('Test Story');
      
      const mockAnchor = { click: vi.fn(), href: '', download: '' };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      
      saveManager.saveGame();
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Load functionality', () => {
    it('should load game successfully', () => {
      const saveData = '{"gameState": {"currentLocation": "test"}}';
      mockLocalStorage.setItem('iffy_save_Test Story', saveData);
      
      vi.spyOn(gameEngine, 'loadGame').mockReturnValue({ success: true });
      
      const result = saveManager.loadGame('Test Story');
      
      expect(result).toBe(true);
      expect(gameEngine.loadGame).toHaveBeenCalledWith(saveData);
      expect(messageDisplay.addMessage).toHaveBeenCalledWith(
        'Game loaded successfully!',
        'system'
      );
    });

    it('should handle missing save data', () => {
      const result = saveManager.loadGame('Nonexistent Story');
      
      expect(result).toBe(false);
      expect(messageDisplay.addMessage).toHaveBeenCalledWith(
        'No saved game found for: Nonexistent Story',
        'error'
      );
    });

    it('should handle load failure', () => {
      const saveData = '{"gameState": {"currentLocation": "test"}}';
      mockLocalStorage.setItem('iffy_save_Test Story', saveData);
      
      vi.spyOn(gameEngine, 'loadGame').mockReturnValue({
        success: false,
        error: 'Load failed'
      });
      
      const result = saveManager.loadGame('Test Story');
      
      expect(result).toBe(false);
      expect(messageDisplay.addMessage).toHaveBeenCalledWith(
        'Load failed',
        'error'
      );
    });
  });

  describe('Delete functionality', () => {
    it('should delete saved game', () => {
      // Set up some save data
      mockLocalStorage.setItem('iffy_save_Test Story', '{"test": "data"}');
      mockLocalStorage.setItem('iffy_save_Test Story_metadata', '{"timestamp": "2023-01-01"}');
      
      saveManager.deleteSave('Test Story');
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('iffy_save_Test Story');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('iffy_save_Test Story_metadata');
      expect(messageDisplay.addMessage).toHaveBeenCalledWith(
        'Deleted saved game: Test Story',
        'system'
      );
    });
  });

  describe('Recovery functionality', () => {
    it('should offer recovery for recent saves', () => {
      const recentTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const metadata = {
        storyTitle: 'Test Story',
        timestamp: recentTime.toISOString(),
        location: 'test'
      };
      
      mockLocalStorage.setItem('iffy_save_Test Story_metadata', JSON.stringify(metadata));
      mockLocalStorage.setItem('iffy_save_Test Story', '{"test": "data"}');
      mockConfirm.mockReturnValue(true);
      
      vi.spyOn(gameEngine, 'getCurrentStoryTitle').mockReturnValue('Test Story');
      vi.spyOn(gameEngine, 'loadGame').mockReturnValue({ success: true });
      
      saveManager.checkForStoryRecovery();
      
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Found a recent save for "Test Story"')
      );
      expect(gameEngine.loadGame).toHaveBeenCalled();
    });

    it('should not offer recovery for old saves', () => {
      const oldTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const metadata = {
        storyTitle: 'Test Story',
        timestamp: oldTime.toISOString(),
        location: 'test'
      };
      
      mockLocalStorage.setItem('iffy_save_Test Story_metadata', JSON.stringify(metadata));
      vi.spyOn(gameEngine, 'getCurrentStoryTitle').mockReturnValue('Test Story');
      
      saveManager.checkForStoryRecovery();
      
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    it('should handle recovery rejection', () => {
      const recentTime = new Date(Date.now() - 10 * 60 * 1000);
      const metadata = {
        storyTitle: 'Test Story',
        timestamp: recentTime.toISOString(),
        location: 'test'
      };
      
      mockLocalStorage.setItem('iffy_save_Test Story_metadata', JSON.stringify(metadata));
      mockConfirm.mockReturnValue(false);
      
      vi.spyOn(gameEngine, 'getCurrentStoryTitle').mockReturnValue('Test Story');
      vi.spyOn(gameEngine, 'loadGame');
      
      saveManager.checkForStoryRecovery();
      
      expect(mockConfirm).toHaveBeenCalled();
      expect(gameEngine.loadGame).not.toHaveBeenCalled();
    });
  });

  describe('Saved games listing', () => {
    it('should return saved games with metadata', () => {
      const testTime = new Date();
      const metadata1 = {
        storyTitle: 'Story 1',
        timestamp: testTime.toISOString(),
        location: 'room1'
      };
      const metadata2 = {
        storyTitle: 'Story 2', 
        timestamp: new Date(testTime.getTime() - 1000).toISOString(),
        location: 'room2'
      };
      
      mockLocalStorage.setItem('iffy_save_Story 1', '{"test": "data1"}');
      mockLocalStorage.setItem('iffy_save_Story 1_metadata', JSON.stringify(metadata1));
      mockLocalStorage.setItem('iffy_save_Story 2', '{"test": "data2"}');
      mockLocalStorage.setItem('iffy_save_Story 2_metadata', JSON.stringify(metadata2));
      
      const saves = saveManager.getSavedGames();
      
      expect(saves).toHaveLength(2);
      expect(saves[0].storyTitle).toBe('Story 1'); // Most recent first
      expect(saves[1].storyTitle).toBe('Story 2');
      expect(saves[0].location).toBe('room1');
    });

    it('should handle corrupted metadata gracefully', () => {
      mockLocalStorage.setItem('iffy_save_Test Story', '{"test": "data"}');
      mockLocalStorage.setItem('iffy_save_Test Story_metadata', 'invalid json');
      
      const saves = saveManager.getSavedGames();
      
      expect(saves).toHaveLength(0);
    });
  });

  describe('LocalStorage availability', () => {
    it('should detect localStorage availability', () => {
      expect(SaveManager.isLocalStorageAvailable()).toBe(true);
    });

    it('should handle localStorage unavailability', () => {
      const originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage not available');
      });
      
      expect(SaveManager.isLocalStorageAvailable()).toBe(false);
      
      window.localStorage.setItem = originalSetItem;
    });
  });

  describe('Options management', () => {
    it('should update options and restart auto-save', () => {
      vi.spyOn(saveManager, 'stopAutoSave');
      vi.spyOn(saveManager, 'startAutoSave');
      
      saveManager.startAutoSave();
      saveManager.updateOptions({ autoSaveIntervalMinutes: 5 });
      
      expect(saveManager.stopAutoSave).toHaveBeenCalled();
      expect(saveManager.startAutoSave).toHaveBeenCalled();
      expect(saveManager.getStatus().intervalMinutes).toBe(5);
    });

    it('should disable auto-save when option is set to false', () => {
      vi.spyOn(saveManager, 'stopAutoSave');
      vi.spyOn(saveManager, 'startAutoSave');
      
      saveManager.startAutoSave();
      saveManager.updateOptions({ autoSaveEnabled: false });
      
      expect(saveManager.stopAutoSave).toHaveBeenCalled();
      expect(saveManager.startAutoSave).not.toHaveBeenCalledTimes(2);
    });
  });
});