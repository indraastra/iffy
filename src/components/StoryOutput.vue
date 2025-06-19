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
      />
      <span v-else>{{ message.content }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'
import MarkupRenderer from '@/components/MarkupRenderer.vue'

const { gameState } = useGameEngine()
const outputContainer = ref<HTMLElement>()

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
</style>