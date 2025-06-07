# Auto-Save and Game Recovery System

**Status:** 💡 New Proposal  
**Priority:** High  
**Motivation:** Prevent progress loss from accidental tab closures and browser crashes

## Problem Statement

Players can lose significant progress if they accidentally close their browser tab or experience a crash during gameplay. Interactive fiction sessions can last 30+ minutes, and losing progress creates frustration and abandonment.

Currently, the engine has save/load functionality (`GameEngine.saveGame()` at line 1269), but it requires manual player action. Many players don't think to save frequently, especially during casual browsing.

## Proposed Solution: LocalStorage-Based Auto-Save

Implement an automatic save system using localStorage with crash recovery detection.

### Why localStorage?

**✅ Perfect for our use case:**
- Game state is lightweight (~100KB vs 5MB localStorage limit)
- Survives browser restarts and accidental tab closures  
- Universal browser support across all modern browsers
- Already used in codebase for API key storage (`SettingsManager.ts:68`)

**⚠️ Acceptable limitations:**
- Cleared in private/incognito mode when session ends
- Safari has 7-day limit on script-writable storage
- Device-specific (doesn't sync across devices)
- Users can manually clear browser data

**💡 Better than alternatives:**
- **sessionStorage**: Too volatile (clears when tab closes)
- **IndexedDB**: Overkill for data size, adds complexity
- **Cloud storage**: Requires authentication, adds complexity

## Implementation Design

### 1. Auto-Save System

```typescript
// Add to GameEngine class
private autoSaveInterval: number | null = null;

enableAutoSave(intervalMinutes: number = 2): void {
  this.autoSaveInterval = setInterval(() => {
    this.saveGameToStorage('autosave');
  }, intervalMinutes * 60 * 1000);
}

private saveGameToStorage(slotName: string): void {
  try {
    const saveData = this.saveGame(); // Existing method
    localStorage.setItem(`iffy_save_${slotName}`, saveData);
    localStorage.setItem(`iffy_save_${slotName}_timestamp`, new Date().toISOString());
    localStorage.setItem(`iffy_save_${slotName}_story`, this.currentStory?.title || 'Unknown');
  } catch (error) {
    console.warn('Auto-save failed:', error);
  }
}
```

### 2. Multiple Save Slots

```typescript
interface SaveSlot {
  name: string;
  timestamp: Date;
  storyTitle: string;
  location: string;
  progress: string;
}

getSaveSlots(): SaveSlot[] {
  const slots: SaveSlot[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('iffy_save_') && !key.includes('_timestamp') && !key.includes('_story')) {
      const slotName = key.replace('iffy_save_', '');
      const timestamp = localStorage.getItem(`${key}_timestamp`);
      const storyTitle = localStorage.getItem(`${key}_story`);
      const saveData = localStorage.getItem(key);
      
      if (timestamp && saveData) {
        try {
          const gameState = JSON.parse(saveData);
          slots.push({
            name: slotName,
            timestamp: new Date(timestamp),
            storyTitle: storyTitle || 'Unknown Story',
            location: gameState.currentLocation || 'Unknown',
            progress: this.generateProgressDescription(gameState)
          });
        } catch (e) {
          // Skip corrupted saves
        }
      }
    }
  }
  return slots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
```

### 3. Storage Error Handling

```typescript
private saveWithErrorHandling(data: string, key: string): boolean {
  try {
    localStorage.setItem(key, data);
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Clean up old saves and retry
      this.cleanupOldSaves();
      try {
        localStorage.setItem(key, data);
        return true;
      } catch (retryError) {
        this.messageDisplay.addMessage('Storage full. Please free up space in browser settings.', 'error');
      }
    }
    return false;
  }
}

private cleanupOldSaves(): void {
  const slots = this.getSaveSlots();
  // Keep most recent 10 saves, delete older ones
  slots.slice(10).forEach(slot => {
    localStorage.removeItem(`iffy_save_${slot.name}`);
    localStorage.removeItem(`iffy_save_${slot.name}_timestamp`);
    localStorage.removeItem(`iffy_save_${slot.name}_story`);
  });
}
```

### 4. Recovery Detection

```typescript
// In main.ts initialization
checkForRecovery(): void {
  const autosave = localStorage.getItem('iffy_save_autosave');
  const timestamp = localStorage.getItem('iffy_save_autosave_timestamp');
  
  if (autosave && timestamp) {
    const saveTime = new Date(timestamp);
    const timeDiff = Date.now() - saveTime.getTime();
    
    // If autosave is less than 30 minutes old, offer recovery
    if (timeDiff < 30 * 60 * 1000) {
      this.offerGameRecovery(autosave, saveTime);
    }
  }
}

private offerGameRecovery(saveData: string, saveTime: Date): void {
  const timeAgo = this.formatTimeAgo(saveTime);
  const message = `Found a recent game session from ${timeAgo}. Would you like to continue where you left off?`;
  
  if (confirm(message)) {
    try {
      this.loadGame(saveData);
      this.messageDisplay.addMessage('Game restored successfully!', 'success');
    } catch (error) {
      this.messageDisplay.addMessage('Failed to restore game. Starting fresh.', 'error');
      localStorage.removeItem('iffy_save_autosave');
    }
  }
}
```

### 5. UI Integration

**Settings Panel Addition:**
```typescript
// In SettingsManager.ts
private createAutoSaveSettings(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <h3>Auto-Save</h3>
    <label>
      <input type="checkbox" id="autoSaveEnabled" checked>
      Enable auto-save every 2 minutes
    </label>
    <div class="save-slots">
      <h4>Saved Games</h4>
      <div id="saveSlotList"></div>
      <button id="exportSaves">Export All Saves</button>
      <input type="file" id="importSaves" accept=".json" style="display:none">
      <button onclick="document.getElementById('importSaves').click()">Import Saves</button>
    </div>
  `;
  return container;
}
```

## Benefits

1. **Crash Recovery**: Players can recover from accidental closures
2. **Multiple Save Slots**: Manual saves + auto-save slots  
3. **Export/Import**: Manual backup for important saves
4. **Progressive Enhancement**: Graceful fallback if localStorage unavailable
5. **Low Complexity**: Builds on existing save/load infrastructure

## Implementation Plan

### Phase 1: Core Auto-Save
- Add auto-save timer to GameEngine
- Implement localStorage persistence
- Add recovery detection on startup

### Phase 2: UI Enhancement  
- Add save slot management to settings
- Show save timestamps and story info
- Add export/import functionality

### Phase 3: Polish
- Progress indicators for large saves
- Storage cleanup automation
- Better error messaging

## Future Enhancements

- **Cloud Sync**: Optional account-based save synchronization
- **Service Worker**: Offline functionality and better storage management
- **Save Thumbnails**: Visual previews of save states
- **Compression**: Reduce save file sizes for longer games

## User Communication

Clearly communicate storage limitations:
- "Saves are stored locally on this device"
- "Private browsing mode saves are temporary" 
- "Use Export feature for permanent backups"

This design provides robust local persistence with minimal complexity while building toward potential cloud features in the future.