<template>
  <div id="app" class="choice-driven-app">
    <header class="app-header">
      <h1>Choice-Driven Engine MVP</h1>
      <p>Testing the new hybrid narrative system from the PRD</p>
    </header>
    
    <ChoiceDrivenInterface />
    
    <footer class="app-footer">
      <p>Built with Vue 3 + TypeScript. Engine Status: 
        <span :class="engineStatus.class">{{ engineStatus.text }}</span>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ChoiceDrivenInterface from './ChoiceDrivenInterface.vue'

const isEngineReady = ref(false)

const engineStatus = computed(() => {
  return isEngineReady.value 
    ? { text: 'Ready', class: 'status-ready' }
    : { text: 'Loading...', class: 'status-loading' }
})

onMounted(() => {
  // Simple readiness check
  setTimeout(() => {
    isEngineReady.value = true
  }, 1000)
})
</script>

<style scoped>
.choice-driven-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.app-header {
  background: #007bff;
  color: white;
  padding: 1rem 2rem;
  text-align: center;
}

.app-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.app-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.app-footer {
  background: #343a40;
  color: white;
  padding: 1rem;
  text-align: center;
  margin-top: auto;
}

.status-ready {
  color: #28a745;
  font-weight: bold;
}

.status-loading {
  color: #ffc107;
  font-weight: bold;
}
</style>

<style>
/* Global styles for the choice-driven app */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
  overflow-y: auto;
}

html {
  height: 100%;
  overflow-y: auto;
}

#app {
  min-height: 100vh;
}
</style>