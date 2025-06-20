<template>
  <div id="app" :class="themeClass">
    <GameLayout />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import GameLayout from '@/components/GameLayout.vue'
import { useTheme } from '@/composables/useTheme'
import { useGameEngine } from '@/composables/useGameEngine'

const { currentTheme } = useTheme()
const gameEngine = useGameEngine()
const { debugPane } = gameEngine

const themeClass = computed(() => {
  return currentTheme.value ? `theme-${currentTheme.value.id}` : ''
})

function handleKeydown(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === 'd') {
    event.preventDefault()
    debugPane.toggle()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
@import url('@/styles/main.css');
</style>