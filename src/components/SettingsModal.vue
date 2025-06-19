<template>
  <div v-if="showSettingsModal" class="modal-overlay" @click="hideSettings">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>Settings</h2>
        <button @click="hideSettings" class="close-btn">×</button>
      </header>
      
      <div class="modal-body">
        <div class="setting-group">
          <h3>Theme</h3>
          <div class="theme-selector">
            <button 
              v-for="(theme, key) in availableThemes"
              :key="key"
              @click="setTheme(key)"
              :class="['theme-btn', { active: currentTheme?.id === key }]"
            >
              {{ theme.name }}
            </button>
          </div>
        </div>
        
        <div class="setting-group">
          <h3>Debug</h3>
          <p class="setting-description">
            Press <kbd>Ctrl+D</kbd> to toggle debug console for performance metrics and AI interaction logs.
          </p>
        </div>

        <div class="setting-group">
          <h3>API Configuration</h3>
          <p class="setting-description">
            Configure your AI provider API keys via environment variables or the debug console.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameActions } from '@/composables/useGameActions'
import { useTheme } from '@/composables/useTheme'

const { showSettingsModal, hideSettings } = useGameActions()
const { currentTheme, setTheme, getAvailableThemes } = useTheme()

const availableThemes = getAvailableThemes()
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
  width: 500px;
  max-height: 80vh;
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
  max-height: 60vh;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 2rem;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-group h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text-primary);
  font-size: 1.1rem;
}

.setting-description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.4;
}

.theme-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.theme-btn {
  background: var(--color-background);
  border: 1px solid var(--interface-panel-border);
  color: var(--color-text-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition-fast);
  font-size: 0.9rem;
}

.theme-btn:hover {
  background: var(--color-surface);
  border-color: var(--color-accent);
}

.theme-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-background);
}

kbd {
  background: var(--color-background);
  border: 1px solid var(--interface-panel-border);
  border-radius: 3px;
  padding: 0.2rem 0.4rem;
  font-family: var(--font-monospace);
  font-size: 0.85rem;
  color: var(--color-text-primary);
}
</style>