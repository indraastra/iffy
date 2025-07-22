<template>
  <div id="app" :class="themeClass">
    <router-view />
    <DebugPane ref="debugPaneRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
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

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  
  // Wait for next tick to ensure DebugPane component is fully mounted
  await nextTick()
  
  // Register the debug pane instance with the game engine
  if (debugPaneRef.value) {
    registerDebugPane(debugPaneRef.value)
  } else {
    console.warn('⚠️ Debug pane ref not available after nextTick')
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
@import url('@/styles/main.css');
</style>