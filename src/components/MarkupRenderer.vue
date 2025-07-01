<template>
  <div class="markup-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer'
import type { FormatterRule } from '@/types/impressionistStory'

interface Props {
  content: string
  formatters?: FormatterRule[]
}

const props = defineProps<Props>()

const { renderMarkup } = useMarkdownRenderer()

const renderedContent = computed(() => {
  return renderMarkup(props.content, props.formatters)
})
</script>

<style scoped>
.markup-content {
  font-family: var(--font-primary);
  line-height: 1.6;
}

/* Character references */
.markup-content :deep(.markup-character) {
  color: var(--markup-character-player);
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-style: dotted;
  transition: var(--transition-fast);
}

.markup-content :deep(.markup-character--npc) {
  color: var(--markup-character-npc);
}

.markup-content :deep(.markup-character:hover) {
  color: var(--markup-character-hover);
  text-shadow: var(--shadow-subtle);
}

/* Item references */
.markup-content :deep(.markup-item) {
  color: var(--markup-item-primary);
  font-style: italic;
  cursor: pointer;
  transition: var(--transition-fast);
  text-decoration: underline;
  text-decoration-style: dashed;
}

.markup-content :deep(.markup-item:hover) {
  color: var(--markup-item-hover);
}

/* Location references */
.markup-content :deep(.markup-location) {
  color: var(--markup-location-primary);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-fast);
  text-decoration: underline;
}

.markup-content :deep(.markup-location:hover) {
  color: var(--markup-location-hover);
}

/* Headings */
.markup-content :deep(.markup-heading) {
  font-size: var(--font-size-heading);
  font-weight: bold;
  color: var(--color-accent);
  margin: 0 0 0.5rem 0;
  text-align: center;
  text-shadow: var(--shadow-subtle);
  font-family: var(--font-secondary);
}

.markup-content :deep(.markup-subheading) {
  font-size: var(--font-size-normal);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0 0 1.5rem 0;
  text-align: center;
  font-style: italic;
  font-family: var(--font-primary);
}

/* Text emphasis */
.markup-content :deep(.markup-bold) {
  font-weight: bold;
  color: var(--color-text-primary);
}

.markup-content :deep(.markup-italic) {
  font-style: italic;
  color: var(--color-text-secondary);
}

/* Alert boxes */
.markup-content :deep(.markup-alert) {
  padding: 12px 16px;
  margin: 12px 0;
  border-radius: 6px;
  border-left: 4px solid;
  font-weight: 500;
  display: block;
}

.markup-content :deep(.markup-alert--warning) {
  background-color: var(--alert-warning-bg);
  border-color: var(--alert-warning-border);
  color: var(--alert-warning-text);
}

.markup-content :deep(.markup-alert--discovery) {
  background-color: var(--alert-discovery-bg);
  border-color: var(--alert-discovery-border);
  color: var(--alert-discovery-text);
}

.markup-content :deep(.markup-alert--danger) {
  background-color: var(--alert-danger-bg);
  border-color: var(--alert-danger-border);
  color: var(--alert-danger-text);
}

/* Automatic styling enhancements */
.markup-content :deep(.markup-speech) {
  color: var(--color-accent);
  font-style: italic;
}

.markup-content :deep(.markup-emphasis) {
  font-weight: bold;
  letter-spacing: 0.05em;
  color: var(--color-text-primary);
}

.markup-content :deep(.markup-timestamp) {
  color: var(--color-text-secondary);
  font-family: monospace;
  font-size: 0.9em;
}

/* Chat-specific styling */
.markup-content :deep(.chat-username) {
  font-weight: bold;
  margin-right: 0.5em;
}

.markup-content :deep(.chat-message) {
  color: var(--color-text-primary);
}

.markup-content :deep(.chat-system) {
  font-style: italic;
  text-align: center;
  margin: 0.5em 0;
  color: var(--color-text-secondary);
}
</style>