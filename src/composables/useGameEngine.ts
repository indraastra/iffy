import { ref, reactive, computed } from 'vue'
import { ImpressionistEngine } from '@/engine/impressionistEngine'
import { ImpressionistParser } from '@/engine/impressionistParser'
import { MultiModelService } from '@/services/multiModelService'
import { DebugPane } from '@/ui/debugPane'
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

// Global services
const multiModelService = new MultiModelService()
const debugPane = new DebugPane()
const engine = new ImpressionistEngine(multiModelService)
const parser = new ImpressionistParser()

// Set up metrics integration
multiModelService.setMetricsHandler((metrics) => {
  debugPane.addLangChainMetric(metrics)
})

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
        
        addMessage('Story loaded successfully', 'system')
        
        // Process initial scene
        const initialResponse = await engine.processInitialScene()
        if (initialResponse.text) {
          addMessage(initialResponse.text, 'story')
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
      id: Date.now().toString(),
      content,
      type,
      timestamp: new Date()
    }
    gameState.messages.push(message)
  }

  function clearMessages() {
    gameState.messages = []
  }

  // Initialize welcome message
  if (gameState.messages.length === 0) {
    addMessage(`🎭 **Welcome to Iffy**
*LLM-powered Interactive Fiction Engine*

**✨ Features:**
• 🎨 **Natural Language Interaction** - Speak as you would naturally
• 🧠 **Smart Memory** - AI remembers what matters
• 📊 **Performance Metrics** - Track token usage and efficiency  
• 🌟 **Rich Stories** - Interactive fiction with dynamic narratives

🚀 **Get Started:** Click the "Load" button to choose a story, or press Ctrl+D to open debug tools.`, 'system')
  }

  return {
    gameState,
    engine,
    multiModelService,
    debugPane,
    currentInput,
    isReady,
    loadStory,
    processCommand,
    addMessage,
    clearMessages
  }
}