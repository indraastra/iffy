<template>
  <div class="emergent-interface">
    <!-- Game Header -->
    <div class="game-header">
      <h1 v-if="currentNarrative">{{ currentNarrative.title }}</h1>
      <div class="game-controls">
        <button @click="loadNarrative" class="btn btn-secondary">Load Narrative</button>
        <button @click="restartGame" v-if="currentNarrative" class="btn btn-secondary">New Playthrough</button>
      </div>
    </div>

    <!-- Compilation Status -->
    <div v-if="isCompiling" class="compilation-status">
      <div class="compilation-indicator">
        <div class="thinking-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="compilation-text">LLM Architect is generating your unique story structure...</span>
      </div>
    </div>

    <!-- Story Content -->
    <div class="story-content">
      <!-- Story Output -->
      <div class="story-messages">
        <div v-for="turn in gameHistory" :key="turn.timestamp" class="story-turn">
          <div class="narrative-content">
            <MarkupRenderer :content="turn.content.narrative" />
          </div>
          <div v-if="turn.choiceIndex !== -1" class="player-choice">
            <strong>You chose:</strong> {{ turn.content.choices[turn.choiceIndex].text }}
          </div>
          <div v-if="showDebugInfo && turn.sceneIndex > 0" class="scene-transition">
            <span class="scene-badge">Scene {{ turn.sceneIndex + 1 }}</span>
          </div>
        </div>

        <!-- Current content or loading indicator -->
        <div v-if="currentContent || (isLoading && !isCompiling)" class="story-turn current">
          <div class="scene-info" v-if="showDebugInfo && currentScene && !isLoading && !isComplete && currentContent">
            <span class="scene-badge">Scene {{ currentSceneIndex + 1 }} of {{ totalScenes }}</span>
            <span class="scene-goal">{{ currentScene.goal }}</span>
          </div>
          
          <!-- Show loading indicator when loading but not compiling -->
          <div v-if="isLoading && !isCompiling" class="thinking-indicator">
            <div class="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="thinking-text">{{ loadingMessage }}</span>
          </div>
          
          <!-- Show actual content when not loading and content exists -->
          <div v-else-if="currentContent" class="narrative-content">
            <MarkupRenderer :content="currentContent.narrative" />
          </div>
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
            <div class="choice-effects" v-if="showDebugInfo && Object.keys(choice.effects).length > 0">
              <span v-for="(value, key) in choice.effects" :key="key" class="effect-badge">
                {{ key }}: {{ value }}
              </span>
            </div>
          </button>
        </div>
        <div v-if="showDebugInfo && currentContent.scene_complete" class="scene-complete-notice">
          <span class="complete-icon">✓</span>
          Scene goal achieved - story will advance after your choice
        </div>
      </div>

      <!-- Completion Actions (shown when game is complete and not loading) -->
      <div v-if="isComplete && !isLoading" class="completion-section">
        <h3>Story Complete</h3>
        <p v-if="endingId" class="ending-id">Ending: {{ endingId }}</p>
        <p class="completion-note">This was a unique playthrough generated just for you!</p>
        <div class="completion-actions">
          <button @click="restartGame" class="btn btn-primary">New Playthrough</button>
          <button @click="loadNarrative" class="btn btn-secondary">Load Different Story</button>
        </div>
      </div>
    </div>

    <!-- Debug Sidebar -->
    <DebugSidebar 
      :debug-tracker="debugTracker" 
      :compiled-structure="compiledStructure" 
      :debug-enabled="debugEnabled"
      @toggle-debug="toggleDebugMode"
    />

    <!-- File Input (hidden) -->
    <input
      ref="fileInput"
      type="file"
      accept=".md,.txt"
      @change="handleFileSelect"
      style="display: none"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { EmergentEngine, EmergentEngineEvents } from '../engines/emergent/EmergentEngine.js'
import { MultiModelService } from '../services/multiModelService.js'
import { NarrativeOutline, GeneratedContent, GameTurn, CompiledStoryStructure, SceneDefinition } from '../types/emergentStory.js'
import MarkupRenderer from './MarkupRenderer.vue'
import DebugSidebar from './DebugSidebar.vue'

// Refs and reactive state
const engine = ref<EmergentEngine | null>(null)
const debugTracker = ref<any>(null)
const currentNarrative = ref<NarrativeOutline | null>(null)
const compiledStructure = ref<CompiledStoryStructure | null>(null)
const currentContent = ref<GeneratedContent | null>(null)
const gameHistory = ref<GameTurn[]>([])
const isCompiling = ref(false)
const isLoading = ref(false)
const isComplete = ref(false)
const endingId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

const loadingMessage = ref('Generating content...')
const route = useRoute()

// Debug mode state
const debugEnabled = ref(false)

// Initialize debug mode: dev environment or URL parameter
onMounted(() => {
  debugEnabled.value = import.meta.env.DEV || route.query.debug === 'true'
})

// Computed debug info visibility
const showDebugInfo = computed(() => debugEnabled.value)

// Toggle debug mode
function toggleDebugMode() {
  debugEnabled.value = !debugEnabled.value
}

// Computed properties
const currentSession = computed(() => engine.value?.getSession())
const currentScene = computed(() => currentSession.value?.compiledStructure.scene_sequence[currentSession.value.currentSceneIndex])
const currentSceneIndex = computed(() => currentSession.value?.currentSceneIndex || 0)
const totalScenes = computed(() => currentSession.value?.compiledStructure.scene_sequence.length || 0)

// Initialize LLM service and engine
onMounted(async () => {
  const llmService = new MultiModelService()
  
  const events: EmergentEngineEvents = {
    onCompilationStart: () => {
      isCompiling.value = true
      isLoading.value = true
      loadingMessage.value = 'LLM Architect is analyzing your story...'
    },
    onCompilationComplete: (structure: CompiledStoryStructure) => {
      isCompiling.value = false
      compiledStructure.value = structure
      loadingMessage.value = 'LLM Narrator is creating your opening scene...'
    },
    onContentGenerated: (content: GeneratedContent) => {
      currentContent.value = content
      isLoading.value = false
    },
    onStateChange: (state: any) => {
      // State changes are tracked by debug system
    },
    onSceneAdvanced: (sceneIndex: number, sceneName: string) => {
      console.log(`Advanced to scene ${sceneIndex + 1}: ${sceneName}`)
    },
    onGameComplete: (ending: string) => {
      isComplete.value = true
      endingId.value = ending
    },
    onError: (error: Error) => {
      console.error('Engine error:', error)
      alert(`Error: ${error.message}`)
      isLoading.value = false
      isCompiling.value = false
    }
  }

  engine.value = new EmergentEngine(llmService, events)
  debugTracker.value = engine.value.getDebugTracker()

  // Try to load the lighthouse keeper example
  try {
    const base = import.meta.env.BASE_URL || '/'
    const storyUrl = `${base}stories/lighthouse_keeper.md`
    const narrative = await EmergentEngine.loadFromURL(storyUrl)
    await loadNarrativeData(narrative)
  } catch (error) {
    console.log('Could not auto-load lighthouse keeper narrative:', error)
  }
})

// Story management functions
async function loadNarrativeData(narrative: NarrativeOutline) {
  if (!engine.value) return

  try {
    currentNarrative.value = narrative
    gameHistory.value = []
    isComplete.value = false
    endingId.value = null
    compiledStructure.value = null

    await engine.value.loadNarrative(narrative)
    currentContent.value = engine.value.getCurrentContent()
    
  } catch (error) {
    console.error('Failed to load narrative:', error)
    alert(`Failed to load narrative: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function restartGame() {
  if (!engine.value || !currentNarrative.value) return

  try {
    isLoading.value = true
    loadingMessage.value = 'Generating new story structure...'
    
    gameHistory.value = []
    isComplete.value = false
    endingId.value = null

    await engine.value.restart()
    currentContent.value = engine.value.getCurrentContent()
    compiledStructure.value = engine.value.getSession()?.compiledStructure || null
    
  } catch (error) {
    console.error('Failed to restart:', error)
    alert(`Failed to restart: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Choice handling
async function makeChoice(choiceIndex: number) {
  if (!engine.value || !currentContent.value || isLoading.value) return

  try {
    isLoading.value = true
    loadingMessage.value = 'Processing your choice...'

    // Store current turn in history before making choice
    const session = engine.value.getSession()
    if (session) {
      const turn: GameTurn = {
        sceneIndex: session.currentSceneIndex,
        sceneId: session.compiledStructure.scene_sequence[session.currentSceneIndex]?.id || 'unknown',
        content: currentContent.value,
        choiceIndex,
        stateAfter: session.currentState,
        timestamp: new Date()
      }
      gameHistory.value.push(turn)
    }

    // Make the choice and get new content
    const newContent = await engine.value.makeChoice(choiceIndex)
    currentContent.value = newContent

  } catch (error) {
    console.error('Failed to make choice:', error)
    alert(`Failed to make choice: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isLoading.value = false
  }
}

// File handling
function loadNarrative() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const narrative = await EmergentEngine.loadFromFile(file)
    await loadNarrativeData(narrative)
  } catch (error) {
    console.error('Failed to load narrative file:', error)
    alert(`Failed to load narrative: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


</script>

<style scoped>
.emergent-interface {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 900px;
  min-width: 320px;
  margin: 0 auto;
  padding: 1rem;
  background: #ffffff;
  color: #212529;
  overflow: visible;
  height: auto;
  min-height: 100vh;
  /* Ensure white background extends with content */
  background-attachment: fixed;
}

/* Fix background extension and global body constraints */
.emergent-interface :global(html),
.emergent-interface :global(body) {
  height: auto !important;
  overflow: visible !important;
  background: #ffffff !important;
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
  font-size: 1.8rem;
}

.game-controls {
  display: flex;
  gap: 0.5rem;
  min-width: 200px;
  justify-content: flex-end;
}

.compilation-status {
  background: #e3f2fd;
  border: 2px solid #1976d2;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  text-align: center;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compilation-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #1976d2;
  font-weight: 500;
}

.story-content {
  flex: 1;
  margin-bottom: 1rem;
  min-height: 200px;
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
  background: #e8f5e8;
  border: 2px solid #28a745;
}

.scene-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}

.scene-badge {
  background: #6c757d;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.75rem;
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  align-self: stretch;
}

.scene-goal {
  color: #495057;
  font-style: italic;
}

.scene-transition {
  margin-top: 0.5rem;
  text-align: center;
}

.scene-transition .scene-badge {
  background: #17a2b8;
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
  background: #e9ecef;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #6c757d;
}

.choice-area {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid #28a745;
  color: #212529;
}

.choice-area h3 {
  margin: 0 0 1rem 0;
  color: #28a745;
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
  background: #28a745;
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
  width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
}

.choice-button:hover:not(:disabled) {
  background: #218838;
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

.choice-effects {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.effect-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.75rem;
  opacity: 0.9;
}

.scene-complete-notice {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #d1ecf1;
  border: 1px solid #bee5eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #0c5460;
}

.complete-icon {
  color: #28a745;
  font-weight: bold;
}

.completion-section {
  text-align: center;
  padding: 2rem;
  background: #d1e7dd;
  border: 2px solid #28a745;
  border-radius: 8px;
  color: #0f5132;
  margin-top: 2rem;
}

.completion-section h3 {
  color: #0f5132;
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.ending-id {
  font-weight: 600;
  color: #0d4f1c;
  margin-bottom: 0.5rem;
}

.completion-note {
  font-style: italic;
  margin-bottom: 1.5rem;
}

.completion-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.compiled-structure {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
}

.compiled-structure h4 {
  margin: 0 0 0.75rem 0;
  color: #495057;
  font-size: 1rem;
}

.structure-info {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.structure-item {
  font-size: 0.85rem;
  color: #6c757d;
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

.thinking-text, .compilation-text {
  font-weight: 500;
}

@keyframes thinking {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
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
  background: #007bff;
  color: #ffffff;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: #ffffff;
}

.btn-secondary:hover {
  background: #5c636a;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .emergent-interface {
    padding: 0.5rem;
    margin: 0;
    max-width: 100%;
    min-width: 100%;
  }

  .game-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .game-header h1 {
    font-size: 1.4rem;
  }

  .game-controls {
    width: 100%;
    min-width: auto;
    justify-content: center;
  }

  .compilation-status {
    padding: 1rem;
    min-height: 100px;
  }

  .compilation-indicator {
    flex-direction: column;
    gap: 0.5rem;
  }


  .story-turn {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .scene-info {
    flex-direction: column;
    gap: 0.5rem;
  }

  .choice-area {
    padding: 1rem;
  }

  .choice-area h3 {
    font-size: 1.1rem;
  }

  .choice-button {
    padding: 0.875rem 1rem;
    font-size: 0.95rem;
  }

  .choices {
    gap: 0.5rem;
  }

  .game-controls .btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .emergent-interface {
    padding: 0.25rem;
  }

  .game-header h1 {
    font-size: 1.2rem;
  }

  .story-turn {
    padding: 0.75rem;
  }

  .choice-area {
    padding: 0.75rem;
  }

  .choice-button {
    padding: 0.75rem;
    font-size: 0.9rem;
  }

  .narrative-content {
    font-size: 0.95rem;
  }
}
</style>