<template>
  <div class="input-area">
    <div class="input-container">
      <span class="prompt">></span>
      <textarea 
        ref="inputElement"
        v-model="currentInput"
        @keydown="handleKeydown"
        @input="adjustHeight"
        class="command-input" 
        placeholder="Enter your command..."
        :disabled="!isReady"
        autocomplete="off"
        data-lpignore="true"
        data-1p-ignore="true"
        rows="1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'

const { currentInput, isReady, processCommand } = useGameEngine()
const inputElement = ref<HTMLTextAreaElement>()

onMounted(() => {
  // Focus the input on mount
  inputElement.value?.focus()
})

async function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    await handleSubmit()
  }
}

async function handleSubmit() {
  if (!currentInput.value.trim() || !isReady.value) return
  
  const command = currentInput.value.trim()
  await processCommand(command)
  
  // Reset textarea height after clearing input
  await nextTick()
  adjustHeight()
  
  // Keep focus on input
  inputElement.value?.focus()
}

function adjustHeight() {
  if (!inputElement.value) return
  
  // Reset height to auto to get the correct scrollHeight
  inputElement.value.style.height = 'auto'
  
  // Set height based on content, with min and max constraints
  const scrollHeight = inputElement.value.scrollHeight
  const minHeight = 40 // Minimum height in pixels
  const maxHeight = 200 // Maximum height in pixels
  
  const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
  inputElement.value.style.height = `${newHeight}px`
}
</script>

<style scoped>
.input-area {
  padding: 1rem 2rem;
  background-color: var(--color-surface);
  border-top: 1px solid var(--interface-panel-border);
}

.input-container {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: 100%;
}

.prompt {
  color: var(--color-accent);
  font-weight: bold;
  font-family: var(--font-monospace);
  font-size: 1.1rem;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  padding-top: 0.75rem;
  flex-shrink: 0;
}

.command-input {
  flex: 1;
  background: var(--interface-input-bg);
  border: 1px solid var(--interface-input-border);
  border-radius: 4px;
  padding: 0.75rem;
  font-family: var(--font-primary);
  font-size: var(--font-size-normal);
  color: var(--color-text-primary);
  resize: none;
  overflow-y: auto;
  transition: var(--transition-fast);
  min-height: 40px;
  max-height: 200px;
}

.command-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.command-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.command-input::placeholder {
  color: var(--interface-input-placeholder, #9ca3af);
}
</style>