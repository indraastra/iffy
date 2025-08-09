<template>
  <div class="choice-driven-interface">
    <!-- Game Header -->
    <div class="game-header">
      <h1 v-if="currentStory">{{ currentStory.title }}</h1>
      <div class="game-controls">
        <button @click="loadStory" class="btn btn-secondary">Load Story</button>
        <button @click="restartStory" v-if="currentStory" class="btn btn-secondary">Restart</button>
        <button @click="toggleDebug" class="btn btn-secondary">{{ showDebug ? 'Hide Debug' : 'Debug' }}</button>
      </div>
    </div>

    <!-- Story Content -->
    <div class="story-content" ref="contentContainer">
      <!-- Story Output -->
      <div class="story-messages">
        <div v-for="turn in gameHistory" :key="turn.timestamp" class="story-turn">
          <div class="narrative-content">
            <MarkupRenderer :content="turn.content.narrative" />
          </div>
          <div v-if="turn.choiceIndex !== -1" class="player-choice">
            <strong>You chose:</strong> {{ turn.content.choices[turn.choiceIndex].text }}
          </div>
        </div>

        <!-- Current content -->
        <div v-if="currentContent && !isComplete" class="story-turn current">
          <div class="narrative-content">
            <MarkupRenderer :content="currentContent.narrative" />
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="thinking-indicator">
          <div class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="thinking-text">{{ loadingMessage }}</span>
        </div>
      </div>

      <!-- Choice Selection -->
      <div v-if="currentContent && !isComplete && !isLoading" class="choice-area">
        <h3>What do you do?</h3>
        <div class="choices">
          <button
            v-for="(choice, index) in currentContent.choices"
            :key="index"
            @click="makeChoice(index)"
            class="choice-button"
            :disabled="isLoading"
          >
            {{ choice.text }}
          </button>
        </div>
      </div>

      <!-- Game Complete -->
      <div v-if="isComplete" class="game-complete">
        <h2>Story Complete</h2>
        <p v-if="endingId">Ending: {{ endingId }}</p>
        <div class="completion-actions">
          <button @click="restartStory" class="btn btn-primary">Play Again</button>
          <button @click="loadStory" class="btn btn-secondary">Load Different Story</button>
        </div>
      </div>
    </div>

    <!-- Debug Panel -->
    <div v-if="showDebug" class="debug-panel">
      <h3>Debug Information</h3>
      <div class="debug-section">
        <h4>Current State</h4>
        <pre>{{ JSON.stringify(debugInfo?.currentState || {}, null, 2) }}</pre>
      </div>
      <div class="debug-section">
        <h4>Available Scenes</h4>
        <ul>
          <li v-for="scene in debugInfo?.availableScenes || []" :key="scene">{{ scene }}</li>
        </ul>
      </div>
      <div class="debug-section">
        <h4>Ending Conditions</h4>
        <ul>
          <li v-for="(met, ending) in debugInfo?.endingConditions || {}" :key="ending">
            {{ ending }}: {{ met ? '✅' : '❌' }}
          </li>
        </ul>
      </div>
    </div>

    <!-- File Input (hidden) -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      @change="handleFileSelect"
      style="display: none"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ChoiceDrivenEngine, ChoiceDrivenEngineEvents } from '../engines/choiceDriven/ChoiceDrivenEngine.js'
import { MultiModelService } from '../services/multiModelService.js'
import { ChoiceDrivenStory, GeneratedContent, GameTurn } from '../types/choiceDrivenStory.js'
import MarkupRenderer from './MarkupRenderer.vue'

// Refs and reactive state
const engine = ref<ChoiceDrivenEngine | null>(null)
const currentStory = ref<ChoiceDrivenStory | null>(null)
const currentContent = ref<GeneratedContent | null>(null)
const gameHistory = ref<GameTurn[]>([])
const isLoading = ref(false)
const isComplete = ref(false)
const endingId = ref<string | null>(null)
const showDebug = ref(false)
const debugInfo = ref<any>(null)
const fileInput = ref<HTMLInputElement>()
const contentContainer = ref<HTMLElement>()

const loadingMessage = ref('Generating story...')

// Initialize LLM service and engine
onMounted(async () => {
  const llmService = new MultiModelService()
  
  const events: ChoiceDrivenEngineEvents = {
    onContentGenerated: (content: GeneratedContent) => {
      currentContent.value = content
      updateDebugInfo()
      scrollToBottom()
    },
    onStateChange: (state: any) => {
      updateDebugInfo()
    },
    onGameComplete: (ending: string) => {
      isComplete.value = true
      endingId.value = ending
      updateDebugInfo()
    },
    onError: (error: Error) => {
      console.error('Engine error:', error)
      alert(`Error: ${error.message}`)
    }
  }

  engine.value = new ChoiceDrivenEngine(llmService, events)

  // Try to load the lighthouse keeper example
  try {
    const response = await fetch('/iffy/stories/lighthouse_keeper.json')
    if (response.ok) {
      const storyJson = await response.text()
      const story = ChoiceDrivenEngine.parseStory(storyJson)
      await loadStoryData(story)
    }
  } catch (error) {
    console.log('Could not auto-load lighthouse keeper story:', error)
  }
})

// Story management functions
async function loadStoryData(story: ChoiceDrivenStory) {
  if (!engine.value) return

  try {
    isLoading.value = true
    loadingMessage.value = 'Loading story...'
    
    currentStory.value = story
    gameHistory.value = []
    isComplete.value = false
    endingId.value = null

    await engine.value.loadStory(story)
    currentContent.value = engine.value.getCurrentContent()
    updateDebugInfo()
    
  } catch (error) {
    console.error('Failed to load story:', error)
    alert(`Failed to load story: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isLoading.value = false
  }
}

async function restartStory() {
  if (!engine.value) return

  try {
    isLoading.value = true
    loadingMessage.value = 'Restarting story...'
    
    gameHistory.value = []
    isComplete.value = false
    endingId.value = null

    await engine.value.restart()
    currentContent.value = engine.value.getCurrentContent()
    updateDebugInfo()
    
  } catch (error) {
    console.error('Failed to restart story:', error)
    alert(`Failed to restart: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isLoading.value = false
  }
}

// Choice handling
async function makeChoice(choiceIndex: number) {
  if (!engine.value || !currentContent.value || isLoading.value) return

  try {
    isLoading.value = true
    loadingMessage.value = 'Processing choice...'

    // Store current turn in history before making choice
    const turn: GameTurn = {
      sceneId: engine.value.getSession()?.currentScene || 'unknown',
      content: currentContent.value,
      choiceIndex,
      stateAfter: engine.value.getSession()?.currentState || {},
      timestamp: new Date()
    }
    gameHistory.value.push(turn)

    // Make the choice and get new content
    const newContent = await engine.value.makeChoice(choiceIndex)
    currentContent.value = newContent
    updateDebugInfo()

  } catch (error) {
    console.error('Failed to make choice:', error)
    alert(`Failed to make choice: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isLoading.value = false
  }
}

// File handling
function loadStory() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const story = await ChoiceDrivenEngine.loadStoryFromFile(file)
    await loadStoryData(story)
  } catch (error) {
    console.error('Failed to load story file:', error)
    alert(`Failed to load story: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Debug functions
function toggleDebug() {
  showDebug.value = !showDebug.value
  updateDebugInfo()
}

function updateDebugInfo() {
  if (showDebug.value && engine.value) {
    debugInfo.value = engine.value.getDebugInfo()
  }
}

// Utility functions
function scrollToBottom() {
  setTimeout(() => {
    if (contentContainer.value) {
      contentContainer.value.scrollTop = contentContainer.value.scrollHeight
    }
  }, 100)
}
</script>

<style scoped>
.choice-driven-interface {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  background: #ffffff;
  color: #212529;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #dee2e6;
}

.game-header h1 {
  color: #212529;
  margin: 0;
  font-size: 1.5rem;
}

.game-controls {
  display: flex;
  gap: 0.5rem;
}

.story-content {
  flex: 1 1 auto;
  overflow-y: auto;
  margin-bottom: 1rem;
  max-height: calc(100vh - 200px);
  min-height: 400px;
}

.story-messages {
  margin-bottom: 2rem;
}

.story-turn {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  color: #212529;
}

.story-turn.current {
  background: #e3f2fd;
  border: 2px solid #1976d2;
  color: #0d47a1;
}

.narrative-content {
  margin-bottom: 0.75rem;
  line-height: 1.6;
  color: #212529;
  font-size: 1rem;
}

.player-choice {
  font-size: 0.9em;
  color: #495057;
  font-style: italic;
  background: #e9ecef;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #6c757d;
}

.choice-area {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid #198754;
  color: #212529;
}

.choice-area h3 {
  margin: 0 0 1rem 0;
  color: #198754;
  font-size: 1.2rem;
  font-weight: 600;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.choice-button {
  padding: 1rem 1.25rem;
  background: #198754;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  font-size: 1rem;
  line-height: 1.4;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.choice-button:hover:not(:disabled) {
  background: #157347;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-1px);
}

.choice-button:disabled {
  background: #adb5bd;
  color: #6c757d;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.game-complete {
  text-align: center;
  padding: 2rem;
  background: #d1e7dd;
  border: 2px solid #198754;
  border-radius: 8px;
  color: #0f5132;
}

.game-complete h2 {
  color: #0f5132;
  margin: 0 0 1rem 0;
}

.game-complete p {
  color: #0f5132;
  margin: 0 0 1rem 0;
}

.completion-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  color: #495057;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.thinking-dots {
  display: flex;
  gap: 0.25rem;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  background: #495057;
  border-radius: 50%;
  animation: thinking 1.4s ease-in-out infinite both;
}

.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

.thinking-text {
  color: #495057;
  font-weight: 500;
}

@keyframes thinking {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

.debug-panel {
  background: #212529;
  color: #f8f9fa;
  border: 1px solid #495057;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.debug-panel h3 {
  color: #f8f9fa;
  margin: 0 0 1rem 0;
}

.debug-section {
  margin-bottom: 1rem;
}

.debug-section h4 {
  margin: 0 0 0.5rem 0;
  color: #adb5bd;
  font-size: 0.95rem;
}

.debug-section pre {
  background: #343a40;
  color: #f8f9fa;
  border: 1px solid #495057;
  border-radius: 4px;
  padding: 0.75rem;
  overflow-x: auto;
  font-size: 0.85em;
  max-height: 200px;
}

.debug-section ul {
  margin: 0;
  padding-left: 1rem;
  color: #f8f9fa;
}

.debug-section li {
  color: #f8f9fa;
  margin-bottom: 0.25rem;
}

.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.btn:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transform: translateY(-1px);
}

.btn-primary {
  background: #0d6efd;
  color: #ffffff;
}

.btn-primary:hover {
  background: #0b5ed7;
}

.btn-secondary {
  background: #6c757d;
  color: #ffffff;
}

.btn-secondary:hover {
  background: #5c636a;
}
</style>