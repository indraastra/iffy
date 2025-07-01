<template>
  <div class="input-area">
    <div class="input-container">
      <span class="prompt" :class="{ 'story-ended': isStoryEnded }">></span>
      <textarea 
        ref="inputElement"
        v-model="currentInput"
        @keydown="handleKeydown"
        class="command-input" 
        :class="{ 'story-ended': isStoryEnded }"
        :placeholder="placeholderText"
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
import { ref, nextTick, onMounted, computed } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'

const { currentInput, isReady, isStoryEnded, processCommand, gameState } = useGameEngine()

// Dynamic placeholder text based on game state
const placeholderText = computed(() => {
  const story = gameState.currentStory
  if (isStoryEnded.value) {
    return "Reflect on your story, ask questions, or explore this moment..."
  }
  return story?.ui?.placeholderText || "Enter your command..."
})
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
  
  // Clear input immediately before processing
  currentInput.value = ''
  await nextTick()
  
  // Process the command
  await processCommand(command)
  
  // Keep focus on input
  inputElement.value?.focus()
}

</script>

<style scoped>
.input-area {
  padding: 1rem 2rem;
  background-color: var(--color-surface);
  border-top: 1px solid var(--panel-border);
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
  transition: var(--transition-fast);
}

.prompt.story-ended {
  color: var(--color-gold, #ffa500);
}

.command-input {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 4px;
  padding: 0.75rem;
  font-family: var(--font-primary);
  font-size: var(--font-size-normal);
  color: var(--color-text-primary);
  resize: none;
  transition: var(--transition-fast);
  field-sizing: content;
  min-height: 40px;
  max-height: 200px;
  overflow-y: auto;
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
  color: var(--color-text-secondary);
}
</style>