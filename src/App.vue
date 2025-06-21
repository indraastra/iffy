<template>
  <div id="app" :class="themeClass">
    <GameLayout />
    <DebugPane ref="debugPaneRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import GameLayout from '@/components/GameLayout.vue'
import DebugPane from '@/components/DebugPane.vue'
import { useTheme } from '@/composables/useTheme'
import { useGameEngine, registerDebugPane } from '@/composables/useGameEngine'

const { currentTheme } = useTheme()
const debugPaneRef = ref<InstanceType<typeof DebugPane> | null>(null)

const themeClass = computed(() => {
  return currentTheme.value ? `theme-${currentTheme.value.id}` : ''
})

function handleKeydown(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === 'd') {
    event.preventDefault()
    debugPaneRef.value?.toggle()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  // Register the debug pane instance with the game engine
  if (debugPaneRef.value) {
    registerDebugPane(debugPaneRef.value)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
@import url('@/styles/main.css');
</style>