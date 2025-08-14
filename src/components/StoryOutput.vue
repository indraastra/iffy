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
    
    <!-- Story completion section -->
    <div v-if="isStoryEnded && !isAwaitingResponse" class="completion-section">
      <h3>📖 Story Complete</h3>
      <p v-if="gameState.currentStory?.endingId" class="ending-id">
        Ending: {{ gameState.currentStory.endingId }}
      </p>
      <p class="completion-note">
        The story has reached its conclusion, but you can continue to explore this moment, 
        reflect on your choices, or ask questions about what happened.
      </p>
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
import { ref, nextTick, watch, computed } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'
import { useTheme } from '@/composables/useTheme'
import { useStoryStyles } from '@/composables/useStoryStyles'
import MarkupRenderer from '@/components/MarkupRenderer.vue'

const { gameState, isAwaitingResponse, loadingMessage, isStoryEnded } = useGameEngine()
const { currentTheme } = useTheme()
const outputContainer = ref<HTMLElement>()

// Set up reactive story styling - useStoryStyles handles its own reactivity
useStoryStyles(computed(() => gameState.currentStory), currentTheme)

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

/* Story completion section */
.completion-section {
  background-color: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: center;
}

.completion-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-accent);
  font-size: 1.25rem;
}

.completion-section .ending-id {
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0.5rem 0;
  font-size: 1rem;
}

.completion-section .completion-note {
  color: var(--color-text-secondary);
  font-style: italic;
  margin: 1rem 0 0 0;
  line-height: 1.5;
}
</style>