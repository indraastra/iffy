import { ref } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'
import { BUNDLED_STORIES } from '@/examples'

const showSettingsModal = ref(false)
const showLoadModal = ref(false)

export function useGameActions() {
  const { loadStory } = useGameEngine()

  function saveGame() {
    // TODO: Implement save functionality
    console.log('Save game clicked')
  }

  function loadGame() {
    showLoadModal.value = true
  }

  async function loadSelectedStory(storyIndex: number) {
    if (storyIndex >= 0 && storyIndex < BUNDLED_STORIES.length) {
      const story = BUNDLED_STORIES[storyIndex]
      await loadStory(story.content, story.filename)
      showLoadModal.value = false
    }
  }

  function showSettings() {
    showSettingsModal.value = true
  }

  function hideSettings() {
    showSettingsModal.value = false
  }

  function hideLoadModal() {
    showLoadModal.value = false
  }

  return {
    saveGame,
    loadGame,
    loadSelectedStory,
    showSettings,
    hideSettings,
    showSettingsModal,
    showLoadModal,
    hideLoadModal,
    availableStories: BUNDLED_STORIES
  }
}