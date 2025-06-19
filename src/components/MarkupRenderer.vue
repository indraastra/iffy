<template>
  <div class="markup-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMarkupRenderer } from '@/composables/useMarkupRenderer'

interface Props {
  content: string
}

const props = defineProps<Props>()

const { renderMarkup } = useMarkupRenderer()

const renderedContent = computed(() => {
  return renderMarkup(props.content)
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
</style>