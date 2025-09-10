import { ref, reactive, computed, shallowRef, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ImpressionistEngine } from '@/engine/impressionistEngine'
import { ImpressionistParser } from '@/engine/impressionistParser'
import { MultiModelService } from '@/services/multiModelService'
import { loadStoryBySlug } from '@/examples-metadata'
import { getStoryUrl } from '@/utils/storySlug'
import type { ImpressionistStory } from '@/types/impressionistStory'

interface GameState {
  isLoaded: boolean
  isProcessing: boolean
  isEnded: boolean
  currentStory: ImpressionistStory | null
  messages: Array<{
    id: string
    content: string
    type: 'system' | 'story' | 'user' | 'error'
    timestamp: Date
  }>
}

// Global game state
const gameState = reactive<GameState>({
  isLoaded: false,
  isProcessing: false,
  isEnded: false,
  currentStory: null,
  messages: []
})

// Global loading state
const isAwaitingResponse = ref(false)

// Guard to prevent duplicate initial scene processing
const isInitialSceneProcessing = ref(false)

// Guard to prevent multiple route watchers
let routeWatcherInitialized = false

// Message ID counter to ensure unique IDs
let messageIdCounter = 0

// Global services
const multiModelService = new MultiModelService()
const engine = new ImpressionistEngine(multiModelService)
const parser = new ImpressionistParser()
// Debug pane ref - will be set when Vue component is mounted
const debugPaneRef = shallowRef<any>(null)


// Set up metrics integration
multiModelService.setMetricsHandler((metrics) => {
  if (debugPaneRef.value) {
    debugPaneRef.value.addLangChainMetric(metrics)
  }
})

// Export global services for other composables
export function getGlobalServices() {
  return {
    multiModelService,
    debugPane: debugPaneRef,
    engine,
    parser
  }
}

// Function to register the debug pane component instance
export function registerDebugPane(debugPaneInstance: any) {
  debugPaneRef.value = debugPaneInstance
  engine.setDebugPane(debugPaneInstance)
  
  // Verify the debug pane has the expected methods (warn only if missing)
  const methods = ['updateSessionStats', 'updateMemoryStats', 'logLlmCall', 'addLangChainMetric']
  methods.forEach(method => {
    if (typeof debugPaneInstance[method] !== 'function') {
      console.warn(`❌ Debug pane missing method: ${method}`)
    }
  })
}

export function useGameEngine() {
  const currentInput = ref('')
  const router = useRouter()
  const route = useRoute()

  const isReady = computed(() => {
    return gameState.isLoaded && !gameState.isProcessing
  })

  const loadingMessage = computed(() => {
    const story = gameState.currentStory
    return story?.ui?.loadingMessage || 'Sketching...'
  })

  function addMessage(content: string, type: GameState['messages'][0]['type']) {
    const message = {
      id: `msg-${++messageIdCounter}`,
      content,
      type,
      timestamp: new Date()
    }
    gameState.messages.push(message)
  }

  function restoreGameFromSave(saveData: string) {
    try {
      const result = engine.loadGame(saveData)
      if (result.success) {
        // Update reactive game state
        gameState.isLoaded = true
        gameState.isProcessing = false
        gameState.isEnded = engine.getGameState().isEnded || false
        gameState.currentStory = engine.getCurrentStory()
        
        // Clear and rebuild UI messages from engine interactions
        gameState.messages = []
        messageIdCounter = 0
        
        // Add story header
        const story = gameState.currentStory
        if (story) {
          let storyHeader = `🎭 **${story.title}**`
          if (story.author) {
            storyHeader += `\n*by ${story.author}*`
          }
          if (story.blurb) {
            storyHeader += `\n\n${story.blurb}`
          }
          storyHeader += '\n\n---'
          addMessage(storyHeader, 'system')
        }
        
        // Restore conversation from engine interactions
        const interactions = engine.getStructuredInteractions()
        interactions.forEach(interaction => {
          addMessage(interaction.playerInput, 'user')
          // Ensure response is normalized in case of legacy saves with arrays
          const normalizedResponse = Array.isArray(interaction.llmResponse) 
            ? interaction.llmResponse.join('\n\n') 
            : interaction.llmResponse
          addMessage(normalizedResponse, 'story')
        })
        
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async function loadStory(yamlContent: string, _filename?: string) {
    try {
      gameState.isProcessing = true
      
      // Clear previous messages and reset state
      gameState.messages = []
      isInitialSceneProcessing.value = false // Reset initial scene guard for new story
      gameState.isEnded = false
      
      // Parse story from YAML
      const story = parser.parseYaml(yamlContent)
      
      // Load story into engine
      const result = engine.loadStory(story)
      
      if (result.success) {
        gameState.isLoaded = true
        gameState.currentStory = story
        
        // Display story header with clean, minimal styling
        let storyHeader = `# 🎭 ${story.title}`
        if (story.author) {
          storyHeader += `\n\n### by ${story.author}`
        }
        addMessage(storyHeader, 'system')
        
        // Return success immediately after story is loaded and header is shown
        // Initial scene processing will happen separately
        return { success: true }
      } else {
        addMessage(`Failed to load story: ${result.error}`, 'error')
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('Error loading story:', error)
      addMessage(`Error loading story: ${error}`, 'error')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    } finally {
      gameState.isProcessing = false
    }
  }

  async function processInitialScene() {
    try {
      // Prevent duplicate initial scene processing
      if (isInitialSceneProcessing.value) {
        console.log('⚠️ Initial scene processing already in progress, skipping duplicate call');
        return;
      }
      
      isInitialSceneProcessing.value = true;
      gameState.isProcessing = true
      
      // Handle initial scene - check if it should be processed through LLM or displayed verbatim
      const initialText = engine.getInitialText()
      if (initialText === null) {
        // Show loading indicator for LLM processing
        isAwaitingResponse.value = true
        await nextTick()
        
        // Process initial scene through LLM (process_sketch: true or undefined)
        const initialResponse = await engine.processInitialScene()
        if (initialResponse.text) {
          addMessage(initialResponse.text, 'story')
        }
      } else {
        // Display initial text verbatim (process_sketch: false)
        addMessage(initialText, 'story')
      }
    } catch (error) {
      console.error('Error processing initial scene:', error)
      addMessage(`Error loading story: ${error}`, 'error')
    } finally {
      gameState.isProcessing = false
      isAwaitingResponse.value = false
      isInitialSceneProcessing.value = false
    }
  }

  async function processCommand(command: string) {
    if (!isReady.value || !command.trim()) return

    try {
      gameState.isProcessing = true
      
      // Add user message
      addMessage(command, 'user')
      
      // Show loading indicator
      isAwaitingResponse.value = true
      await nextTick()
      
      // Process with engine
      const response = await engine.processAction({ input: command })
      
      if (response.text) {
        addMessage(response.text, 'story')
      }
      
      if (response.error) {
        addMessage(`Error: ${response.error}`, 'error')
      }
      
      // Handle ending triggers
      if (response.endingTriggered) {
        console.log('🎭 Story ending detected, updating game state')
        // Update reactive game state
        gameState.isEnded = true
        // Note: Story completion UI is now handled by StoryOutput component
      }
      
      // Clear input
      currentInput.value = ''
      
    } catch (error) {
      console.error('Error processing command:', error)
      addMessage(`Error: ${error}`, 'error')
    } finally {
      gameState.isProcessing = false
      // Hide loading indicator
      isAwaitingResponse.value = false
    }
  }

  function clearMessages() {
    gameState.messages = []
    messageIdCounter = 0
  }

  // LLM response loading state is now global (defined above)

  // Note: UI management is handled directly in this composable
  // rather than through engine callbacks for consistency

  // Initialize welcome message - split into three blocks
  if (gameState.messages.length === 0) {
    // Block 1: Big bold intro
    addMessage(`🎭 **Welcome to Iffy**

*LLM-powered Interactive Fiction Engine*`, 'system')
    
    // Block 2: Features
    addMessage(`**✨ Features:**

• 🎨 **Natural Language Interaction** - Speak as you would naturally
• 🧠 **Smart Memory** - AI remembers what matters
• 📊 **Performance Metrics** - Track token usage and efficiency  
• 🌟 **Rich Stories** - Interactive fiction with dynamic narratives`, 'system')
    
    // Block 3: Get Started
    addMessage(`🚀 **Get Started:** Click the "Load" button to choose a story, or press Ctrl+D to open debug tools.`, 'system')
  }

  // URL-aware story loading functions
  async function loadStoryFromUrl() {
    const storySlug = route.params.storySlug as string
    if (!storySlug) return { success: true } // No story to load from URL
    
    try {
      const story = await loadStoryBySlug(storySlug)
      if (!story) {
        // Handle in router beforeEnter guard
        return { success: false, error: `Story not found: ${storySlug}` }
      }
      
      const result = await loadStory(story.content, story.filename)
      if (result.success) {
        await processInitialScene()
      }
      return result
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  function navigateToStory(slug: string) {
    router.push(getStoryUrl(slug))
  }

  function navigateToHome() {
    router.push('/')
  }

  // Watch for route changes to load stories from URLs - but only initialize once globally
  if (!routeWatcherInitialized) {
    routeWatcherInitialized = true
    console.log('🎬 Initializing route watcher for story loading')
    
    watch(
      () => route.params.storySlug,
      async (newSlug, oldSlug) => {
        // Only load if we're on a story route and the slug actually changed
        if (route.name === 'story' && newSlug && newSlug !== oldSlug) {
          try {
            await loadStoryFromUrl()
          } catch (error) {
            console.error('Error loading story from URL:', error)
            addMessage(`Error loading story: ${error}`, 'error')
          }
        }
      },
      { immediate: true } // Run immediately for the initial route
    )
  }

  // Computed property for story ended state
  const isStoryEnded = computed(() => {
    return gameState.currentStory && gameState.isEnded
  })

  return {
    gameState,
    engine,
    multiModelService,
    debugPane: debugPaneRef,
    currentInput,
    isReady,
    isAwaitingResponse,
    isStoryEnded,
    loadingMessage,
    loadStory,
    loadStoryBySlug,
    processInitialScene,
    processCommand,
    addMessage,
    clearMessages,
    restoreGameFromSave,
    loadStoryFromUrl,
    navigateToStory,
    navigateToHome
  }
}