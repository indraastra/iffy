<template>
  <div class="story-output" ref="outputContainer">
    <div
      v-for="message in gameState.messages"
      :key="message.id"
      :class="getMessageClass(message.type)"
    >
      <MarkupRenderer 
        v-if="message.type === 'story' || message.type === 'system'"
        :content="message.content"
        :formatters="gameState.currentStory?.ui?.formatters"
      />
      <span v-else>{{ message.content }}</span>
    </div>
    
    <!-- Loading indicator when awaiting LLM response -->
    <div v-if="isAwaitingResponse" class="thinking-indicator">
      <div class="thinking-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="thinking-text">{{ loadingMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'
import { useTheme } from '@/composables/useTheme'
import { useStoryStyles } from '@/composables/useStoryStyles'
import MarkupRenderer from '@/components/MarkupRenderer.vue'

const { gameState, isAwaitingResponse, loadingMessage } = useGameEngine()
const { currentTheme } = useTheme()
const outputContainer = ref<HTMLElement>()

// Set up reactive story styling that responds to story and theme changes
watch([() => gameState.currentStory, currentTheme], ([newStory, newTheme]) => {
  if (newStory) {
    useStoryStyles(newStory, newTheme)
  }
}, { immediate: true })

// Auto-scroll to bottom when new messages arrive
watch(() => gameState.messages.length, async () => {
  await nextTick()
  if (outputContainer.value) {
    outputContainer.value.scrollTop = outputContainer.value.scrollHeight
  }
})


function getMessageClass(type: string) {
  return `message message-${type}`
}
</script>

<style scoped>
.story-output {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background-color: var(--color-background);
  color: var(--color-text-primary);
  font-family: var(--font-primary);
  line-height: 1.6;
}

.message {
  margin-bottom: 1rem;
  padding: 0.5rem 0;
}

.message-system {
  color: var(--color-text-secondary);
  font-style: italic;
  border-left: 3px solid var(--color-accent);
  padding-left: 1rem;
}

.message-story {
  color: var(--color-text-primary);
  font-size: var(--font-size-normal);
}

.message-user {
  color: var(--color-accent);
  font-weight: 500;
  background-color: var(--color-surface);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.message-user::before {
  content: '> ';
  font-weight: bold;
}

.message-error {
  color: var(--alert-danger-text);
  background-color: var(--alert-danger-bg);
  border: 1px solid var(--alert-danger-border);
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-weight: 500;
}

/* Thinking indicator */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  opacity: 0.7;
  font-style: italic;
}

.thinking-dots {
  display: flex;
  gap: 0.25rem;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  background-color: var(--color-text-secondary);
  border-radius: 50%;
  animation: thinking-pulse 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.thinking-text {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

@keyframes thinking-pulse {
  0%, 60%, 100% {
    opacity: 0.3;
  }
  30% {
    opacity: 1;
  }
}
</style>