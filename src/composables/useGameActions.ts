import { ref } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'
import { STORY_METADATA, loadStory as loadDynamicStory, BUNDLED_STORIES } from '@/examples-metadata'

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
    try {
      if (storyIndex >= 0 && storyIndex < STORY_METADATA.length) {
        const metadata = STORY_METADATA[storyIndex]
        
        try {
          // Try dynamic loading first (production)
          const story = await loadDynamicStory(metadata.filename)
          if (story) {
            await loadStory(story.content, story.filename)
            showLoadModal.value = false
            return
          }
        } catch (error) {
          console.warn('Dynamic loading failed, falling back to bundled stories:', error)
        }
        
        // Fallback to bundled stories (development)
        if (BUNDLED_STORIES.length > 0 && storyIndex < BUNDLED_STORIES.length) {
          const story = BUNDLED_STORIES[storyIndex]
          await loadStory(story.content, story.filename)
          showLoadModal.value = false
        } else {
          console.error(`Story not available: ${metadata.filename}`)
          showLoadModal.value = false
        }
      } else {
        console.error('Invalid story index:', storyIndex)
        showLoadModal.value = false
      }
    } catch (error) {
      console.error('Error loading story:', error)
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
    availableStories: STORY_METADATA
  }
}