import { ref, reactive, computed, shallowRef } from 'vue'
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
  // Set debug pane on the engine and related services
  engine.setDebugPane(debugPaneInstance)
}

export function useGameEngine() {
  const currentInput = ref('')

  const isReady = computed(() => {
    return gameState.isLoaded && !gameState.isProcessing
  })

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
        
        // Display story header as single cohesive block
        let storyHeader = `🎭 **${story.title}**`
        if (story.author) {
          storyHeader += `\n*by ${story.author}*`
        }
        if (story.blurb) {
          storyHeader += `\n\n${story.blurb}`
        }
        storyHeader += '\n\n---'
        addMessage(storyHeader, 'system')
        
        // Handle initial scene - check if it should be processed through LLM or displayed verbatim
        const initialText = engine.getInitialText()
        if (initialText === null) {
          // Process initial scene through LLM (process_sketch: true or undefined)
          const initialResponse = await engine.processInitialScene()
          if (initialResponse.text) {
            addMessage(initialResponse.text, 'story')
          }
        } else {
          // Display initial text verbatim (process_sketch: false)
          addMessage(initialText, 'story')
        }
      } else {
        addMessage(`Failed to load story: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Error loading story:', error)
      addMessage(`Error loading story: ${error}`, 'error')
    } finally {
      gameState.isProcessing = false
    }
  }

  async function processCommand(command: string) {
    if (!isReady.value || !command.trim()) return

    try {
      gameState.isProcessing = true
      
      // Add user message
      addMessage(command, 'user')
      
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
    }
  }


  function addMessage(content: string, type: GameState['messages'][0]['type']) {
    const message = {
      id: `msg-${++messageIdCounter}`,
      content,
      type,
      timestamp: new Date()
    }
    gameState.messages.push(message)
  }

  function clearMessages() {
    gameState.messages = []
    messageIdCounter = 0
  }

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
    loadStory,
    processCommand,
    addMessage,
    clearMessages
  }
}