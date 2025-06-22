import { ref } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'
import { STORY_METADATA, loadStory as loadDynamicStory, BUNDLED_STORIES } from '@/examples-metadata'

const showSettingsModal = ref(false)
const showLoadModal = ref(false)

export function useGameActions() {
  const { loadStory, processInitialScene, engine, addMessage } = useGameEngine()

  function saveGame() {
    try {
      const currentStory = engine.getCurrentStory()
      if (!currentStory) {
        addMessage('No story loaded. Please load a story before saving.', 'error')
        return
      }

      const saveData = engine.saveGame()
      const saveObject = JSON.parse(saveData)
      
      // Create filename with story title and full timestamp
      const now = new Date()
      const timestamp = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + '-' +
        String(now.getMinutes()).padStart(2, '0') + '-' +
        String(now.getSeconds()).padStart(2, '0')
      const storyName = currentStory.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const filename = `${storyName}_${timestamp}.json`
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(saveObject, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addMessage(`Game saved as "${filename}". You can load this file using the Load menu.`, 'system')
    } catch (error) {
      console.error('Error saving game:', error)
      addMessage('Failed to save game: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
    }
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
            const result = await loadStory(story.content, story.filename)
            showLoadModal.value = false // Close modal immediately after story loads
            if (result.success && result.needsInitialScene) {
              await processInitialScene() // Process initial scene after modal closes
            }
            return
          }
        } catch (error) {
          console.warn('Dynamic loading failed, falling back to bundled stories:', error)
        }
        
        // Fallback to bundled stories (development)
        if (BUNDLED_STORIES.length > 0 && storyIndex < BUNDLED_STORIES.length) {
          const story = BUNDLED_STORIES[storyIndex]
          const result = await loadStory(story.content, story.filename)
          showLoadModal.value = false // Close modal immediately after story loads
          if (result.success && result.needsInitialScene) {
            await processInitialScene() // Process initial scene after modal closes
          }
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