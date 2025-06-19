<template>
  <main class="game-area">
    <div id="themed-game-content" class="themed-game-content">
      <GameHeader />
      <StoryOutput />
      <CommandInput />
    </div>
    
    <!-- Modals -->
    <LoadStoryModal />
    <SettingsModal />
  </main>
</template>

<script setup lang="ts">
import GameHeader from '@/components/GameHeader.vue'
import StoryOutput from '@/components/StoryOutput.vue'
import CommandInput from '@/components/CommandInput.vue'
import LoadStoryModal from '@/components/LoadStoryModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
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
}
</style>