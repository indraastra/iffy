<template>
  <header class="header">
    <h1 class="title">Iffy</h1>
    
    <!-- Menu Button -->
    <button @click="toggleMobileMenu" class="mobile-menu-btn" aria-label="Menu">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>
    
    <!-- Menu Dropdown -->
    <div v-if="mobileMenuOpen" class="mobile-menu-overlay" @click="closeMobileMenu">
      <div class="mobile-menu" @click.stop>
        <button @click="handleSave(); closeMobileMenu()" class="mobile-menu-item">
          💾 Save
        </button>
        <button @click="handleLoad(); closeMobileMenu()" class="mobile-menu-item">
          📂 Load
        </button>
        <button v-if="gameState.isLoaded" @click="handleShare(); closeMobileMenu()" class="mobile-menu-item">
          🔗 Share
        </button>
        <button @click="handleHelp(); closeMobileMenu()" class="mobile-menu-item">
          ❓ Help
        </button>
        <button @click="handleSettings(); closeMobileMenu()" class="mobile-menu-item">
          ⚙️ Settings
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameActions } from '@/composables/useGameActions'
import { useGameEngine } from '@/composables/useGameEngine'

const { saveGame, loadGame, showSettings, showHelp, shareStory } = useGameActions()
const { gameState } = useGameEngine()

const mobileMenuOpen = ref(false)

function handleSave() {
  saveGame()
}

function handleLoad() {
  loadGame()
}

function handleShare() {
  shareStory()
}

function handleHelp() {
  showHelp()
}

function handleSettings() {
  showSettings()
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--header-bg);
  border-bottom: var(--header-border);
  box-shadow: var(--header-shadow);
  position: relative;
  z-index: 10;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--header-text);
  margin: 0;
  font-family: var(--font-primary);
  letter-spacing: 0.05em;
}

/* Menu Button - Always visible */
.mobile-menu-btn {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1001;
}

.hamburger-line {
  display: block;
  width: 25px;
  height: 3px;
  background: var(--header-text);
  margin: 4px 0;
  border-radius: 2px;
  transition: var(--transition-fast);
}

/* Menu Overlay - Always available */
.mobile-menu-overlay {
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* Menu Dropdown */
.mobile-menu {
  position: absolute;
  top: 60px;
  right: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--interface-panel-border);
  border-radius: 8px;
  box-shadow: var(--shadow-strong);
  min-width: 200px;
  padding: 0.5rem 0;
}

.mobile-menu-item {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  text-align: left;
  font-size: 1rem;
  font-family: var(--font-primary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.mobile-menu-item:hover {
  background: var(--button-bg);
}

/* Responsive adjustments for smaller screens */
@media (max-width: 768px) {
  .header {
    padding: 0.75rem 1rem;
  }
  
  .title {
    font-size: 1.5rem;
  }
  
  .mobile-menu {
    top: 55px;
    right: 0.75rem;
  }
}
</style>