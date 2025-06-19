<template>
  <header class="header">
    <h1 class="title">Iffy</h1>
    <div class="controls">
      <button @click="handleSave" class="btn">Save</button>
      <button @click="handleLoad" class="btn">Load</button>
      <button @click="handleSettings" class="btn">Settings</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useGameActions } from '@/composables/useGameActions'

const { saveGame, loadGame, showSettings } = useGameActions()

function handleSave() {
  saveGame()
}

function handleLoad() {
  loadGame()
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
  background-color: var(--color-surface);
  border-bottom: 2px solid var(--interface-panel-border);
}

.title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-text-primary);
  margin: 0;
}

.controls {
  display: flex;
  gap: 1rem;
}

.btn {
  background: var(--interface-button-bg);
  color: var(--interface-button-text);
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
}

.btn:hover {
  background: var(--interface-button-hover-bg);
  color: var(--interface-button-text);
}
</style>