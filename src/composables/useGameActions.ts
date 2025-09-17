import { ref } from 'vue'
import { useGameEngine } from '@/composables/useGameEngine'
import { STORY_METADATA, getStoryMetadataByFilename } from '@/examples-metadata'
import { getStoryUrl } from '@/utils/storySlug'

const showSettingsModal = ref(false)
const showLoadModal = ref(false)
const showHelpModal = ref(false)

export function useGameActions() {
  const { engine, addMessage, navigateToStory, gameState } = useGameEngine()

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
        
        // Close modal first
        showLoadModal.value = false
        
        // Force reload the story even if we're already on the same route
        const { loadStoryBySlug, loadStory, processInitialScene } = useGameEngine()
        
        // Load story directly instead of relying on route navigation
        const story = await loadStoryBySlug(metadata.slug)
        if (story) {
          const result = await loadStory(story.content, story.filename)
          if (result.success) {
            await processInitialScene()
            // Navigate to the story URL to update the browser URL
            navigateToStory(metadata.slug)
          } else {
            addMessage(`Failed to load story: ${result.error}`, 'error')
          }
        } else {
          addMessage(`Story not found: ${metadata.slug}`, 'error')
        }
      } else {
        console.error('Invalid story index:', storyIndex)
        showLoadModal.value = false
      }
    } catch (error) {
      console.error('Error loading story:', error)
      showLoadModal.value = false
      addMessage(`Error loading story: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
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

  function showHelp() {
    showHelpModal.value = true
  }

  function hideHelp() {
    showHelpModal.value = false
  }

  async function shareStory() {
    try {
      const currentStory = gameState.currentStory
      if (!currentStory) {
        addMessage('No story loaded to share.', 'error')
        return
      }

      // Find the story metadata to get the slug
      const metadata = getStoryMetadataByFilename(currentStory.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '.yaml')
      if (!metadata) {
        // Fallback: try to find by filename if we have it
        // For now, just create a slug from the title
        const fallbackSlug = currentStory.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        const storyUrl = `${window.location.origin}${getStoryUrl(fallbackSlug)}`
        
        if (navigator.share) {
          await navigator.share({
            title: `${currentStory.title} - Iffy Interactive Fiction`,
            text: currentStory.blurb || `Play "${currentStory.title}" on Iffy`,
            url: storyUrl
          })
        } else {
          await navigator.clipboard.writeText(storyUrl)
          addMessage('Story URL copied to clipboard!', 'system')
        }
        return
      }

      const storyUrl = `${window.location.origin}${getStoryUrl(metadata.slug)}`
      
      if (navigator.share) {
        await navigator.share({
          title: `${currentStory.title} - Iffy Interactive Fiction`,
          text: currentStory.blurb || `Play "${currentStory.title}" on Iffy`,
          url: storyUrl
        })
      } else {
        await navigator.clipboard.writeText(storyUrl)
        addMessage('Story URL copied to clipboard!', 'system')
      }
    } catch (error) {
      console.error('Error sharing story:', error)
      if (error instanceof Error && error.name !== 'AbortError') {
        addMessage('Failed to share story. Please try again.', 'error')
      }
    }
  }

  return {
    saveGame,
    loadGame,
    loadSelectedStory,
    showSettings,
    hideSettings,
    showHelp,
    hideHelp,
    shareStory,
    showSettingsModal,
    showLoadModal,
    showHelpModal,
    hideLoadModal,
    hideHelpModal: hideHelp,
    availableStories: STORY_METADATA
  }
}