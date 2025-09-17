<template>
  <div v-if="showHelpModal" class="modal-overlay" @click="hideHelpModal">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>Help & Guide</h2>
        <button @click="hideHelpModal" class="close-btn">×</button>
      </header>
      
      <div class="modal-body">
        <section class="help-section">
          <h3>🎮 Getting Started</h3>
          <div class="help-content">
            <p><strong>Loading a Story:</strong> Click the "Load" button to browse available stories or upload your own story file.</p>
            <p><strong>Interacting:</strong> Type commands in the input box at the bottom to interact with the story. Try natural language like "look around" or "talk to Alex".</p>
            <p><strong>Saving Progress:</strong> Click "Save" to download your current game state. You can load it later to continue where you left off.</p>
          </div>
        </section>

        <section class="help-section">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <div class="help-content">
            <div class="shortcut">
              <kbd>Ctrl</kbd> + <kbd>D</kbd> <span>Toggle debug panel</span>
            </div>
            <div class="shortcut">
              <kbd>Enter</kbd> <span>Submit command</span>
            </div>
            <div class="shortcut">
              <kbd>↑</kbd> / <kbd>↓</kbd> <span>Navigate command history</span>
            </div>
          </div>
        </section>

        <section class="help-section">
          <h3>💾 Save & Load</h3>
          <div class="help-content">
            <p><strong>Save:</strong> Downloads a .json file with your current game state, including story progress, choices made, and current scene.</p>
            <p><strong>Load:</strong> Opens the load menu where you can:</p>
            <ul>
              <li>Select from available stories</li>
              <li>Upload a story file (.yaml)</li>
              <li>Upload a save file (.json)</li>
            </ul>
          </div>
        </section>

        <section class="help-section">
          <h3>🎨 Customization</h3>
          <div class="help-content">
            <p><strong>Themes:</strong> Click "Settings" to choose from various color themes including dark mode, high contrast, and retro terminal styles.</p>
            <p><strong>AI Model:</strong> Configure your preferred AI provider (OpenAI, Anthropic, Google) in Settings for the best story experience.</p>
          </div>
        </section>

        <section class="help-section">
          <h3>📱 Mobile Tips</h3>
          <div class="help-content">
            <p>On mobile devices, tap the menu icon (☰) to access all controls.</p>
            <p>Use the Share button to send story links to friends or save them for later.</p>
          </div>
        </section>

        <section class="help-section">
          <h3>🔗 Useful Links</h3>
          <div class="help-content">
            <p><a href="https://github.com/iffy-engine/iffy" target="_blank" rel="noopener">GitHub Repository</a></p>
            <p><a href="#" @click.prevent="hideHelpModal(); showSettings()">Open Settings</a></p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameActions } from '@/composables/useGameActions'

const { showHelpModal, hideHelpModal, showSettings } = useGameActions()
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--interface-panel-border);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: var(--shadow-strong);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: var(--color-primary);
  color: var(--interface-button-text);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--interface-button-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: var(--transition-fast);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 1.5rem;
  max-height: calc(85vh - 4rem);
  overflow-y: auto;
}

.help-section {
  margin-bottom: 2rem;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h3 {
  color: var(--color-accent);
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  border-bottom: 1px solid var(--interface-panel-border);
  padding-bottom: 0.5rem;
}

.help-content {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.help-content p {
  margin: 0.75rem 0;
}

.help-content p:first-child {
  margin-top: 0;
}

.help-content strong {
  color: var(--color-text-primary);
}

.help-content ul {
  margin: 0.5rem 0 0.5rem 1.5rem;
  padding: 0;
}

.help-content li {
  margin: 0.25rem 0;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  color: var(--color-text-secondary);
}

.shortcut kbd {
  background: var(--color-background);
  border: 1px solid var(--interface-panel-border);
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  font-family: var(--font-primary);
  font-size: 0.85rem;
  color: var(--color-text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.shortcut span {
  flex: 1;
}

.help-content a {
  color: var(--color-accent);
  text-decoration: none;
  transition: var(--transition-fast);
}

.help-content a:hover {
  text-decoration: underline;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
    border-radius: 8px;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .help-section {
    margin-bottom: 1.5rem;
  }
}
</style>