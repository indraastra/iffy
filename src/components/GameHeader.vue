<template>
  <header class="header">
    <h1 class="title">Iffy</h1>
    <div class="controls">
      <button @click="handleSave" class="btn">Save</button>
      <button @click="handleLoad" class="btn">Load</button>
      <button @click="handleShare" class="btn" v-if="gameState.isLoaded">Share</button>
      <button @click="handleSettings" class="btn">Settings</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useGameActions } from '@/composables/useGameActions'
import { useGameEngine } from '@/composables/useGameEngine'

const { saveGame, loadGame, showSettings, shareStory } = useGameActions()
const { gameState } = useGameEngine()

function handleSave() {
  saveGame()
}

function handleLoad() {
  loadGame()
}

function handleShare() {
  shareStory()
}

function handleSettings() {
  showSettings()
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

.controls {
  display: flex;
  gap: 1rem;
}

.btn {
  background: var(--button-bg);
  color: var(--button-text);
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
}

.btn:hover {
  background: var(--button-hover-bg);
  color: var(--button-text);
}
</style>