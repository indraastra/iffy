<template>
  <main class="game-area">
    <div id="themed-game-content" class="themed-game-content">
      <GameHeader />
      
      <!-- 404 Error State -->
      <div v-if="isNotFound" class="not-found-container">
        <div class="not-found-content">
          <h2>📖 Story Not Found</h2>
          <p>The story you're looking for doesn't exist or may have been moved.</p>
          <div class="not-found-actions">
            <button @click="navigateToHome" class="btn btn-primary">Browse Stories</button>
            <button @click="loadGame" class="btn">Load Different Story</button>
          </div>
        </div>
      </div>
      
      <!-- Normal Game Content -->
      <template v-else>
        <StoryOutput />
        <CommandInput />
      </template>
    </div>
    
    <!-- Modals -->
    <LoadModal />
    <SettingsModal />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GameHeader from '@/components/GameHeader.vue'
import StoryOutput from '@/components/StoryOutput.vue'
import CommandInput from '@/components/CommandInput.vue'
import LoadModal from '@/components/LoadModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import { useGameEngine } from '@/composables/useGameEngine'
import { useGameActions } from '@/composables/useGameActions'

const route = useRoute()
const { navigateToHome } = useGameEngine()
const { loadGame } = useGameActions()

const isNotFound = computed(() => {
  return route.meta.isNotFound === true
})
</script>

<style scoped>
.game-area {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.themed-game-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-background);
  color: var(--color-text-primary);
}

.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 2rem;
  background-color: var(--color-background);
}

.not-found-content {
  text-align: center;
  max-width: 500px;
}

.not-found-content h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--color-text-primary);
}

.not-found-content p {
  font-size: 1.1rem;
  margin-bottom: 2rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.not-found-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--button-bg);
  color: var(--button-text);
}

.btn:hover {
  background-color: var(--button-bg-hover);
}

.btn-primary {
  background-color: var(--color-accent);
  color: var(--color-background);
}

.btn-primary:hover {
  background-color: var(--color-accent);
  opacity: 0.9;
}
</style>