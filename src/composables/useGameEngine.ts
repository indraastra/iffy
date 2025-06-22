import { ref, reactive, computed, shallowRef, nextTick } from 'vue'
import { ImpressionistEngine } from '@/engine/impressionistEngine'
import { ImpressionistParser } from '@/engine/impressionistParser'
import { MultiModelService } from '@/services/multiModelService'
import type { ImpressionistStory } from '@/types/impressionistStory'

interface GameState {
  isLoaded: boolean
  isProcessing: boolean
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
  currentStory: null,
  messages: []
})

// Global loading state
const isAwaitingResponse = ref(false)

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
      
      // Clear previous messages
      gameState.messages = []
      
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

  // Set up UI callbacks for the engine
  engine.setUIAddMessageCallback((text: string, type: string) => {
    addMessage(text, type as GameState['messages'][0]['type'])
  })

  engine.setUIShowTypingCallback(() => {
    isAwaitingResponse.value = true
  })

  engine.setUIHideTypingCallback(() => {
    isAwaitingResponse.value = false
  })

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

  return {
    gameState,
    engine,
    multiModelService,
    debugPane: debugPaneRef,
    currentInput,
    isReady,
    isAwaitingResponse,
    loadingMessage,
    loadStory,
    processInitialScene,
    processCommand,
    addMessage,
    clearMessages,
    restoreGameFromSave
  }
}