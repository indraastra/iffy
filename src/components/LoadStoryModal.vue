<template>
  <div v-if="showLoadModal" class="modal-overlay" @click="hideLoadModal">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>Load Story</h2>
        <button @click="hideLoadModal" class="close-btn">×</button>
      </header>
      
      <div class="modal-body">
        <p class="modal-description">Choose a story to begin your adventure:</p>
        
        <div class="story-list">
          <div
            v-for="(story, index) in availableStories"
            :key="story.filename"
            @click="loadSelectedStory(index)"
            class="story-item"
          >
            <h3 class="story-title">{{ story.title }}</h3>
            <p class="story-author">by {{ story.author }}</p>
            <p class="story-blurb">{{ story.blurb }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameActions } from '@/composables/useGameActions'

const { 
  showLoadModal, 
  hideLoadModal, 
  availableStories, 
  loadSelectedStory 
} = useGameActions()
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--interface-panel-border);
  border-radius: 12px;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-strong);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: var(--color-primary);
  color: var(--interface-button-text);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--interface-button-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: var(--transition-fast);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-description {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 1rem;
}

.story-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.story-item {
  padding: 1rem;
  border: 1px solid var(--interface-panel-border);
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition-fast);
  background: var(--color-background);
}

.story-item:hover {
  background: var(--color-surface);
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.story-title {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.story-author {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}

.story-blurb {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>