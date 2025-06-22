<template>
  <div v-if="showLoadModal" class="modal-overlay" @click="hideLoadModal">
    <div class="modal-content" @click.stop>
      <header class="modal-header">
        <h2>Load Game</h2>
        <button @click="hideLoadModal" class="close-btn">×</button>
      </header>
      
      <div class="modal-body">
        <!-- Loading options tabs -->
        <div class="load-tabs">
          <button 
            :class="['tab-btn', { active: currentTab === 'stories' }]"
            @click="currentTab = 'stories'"
          >
            📚 Stories
          </button>
          <button 
            :class="['tab-btn', { active: currentTab === 'file' }]"
            @click="currentTab = 'file'"
          >
            📁 Load File
          </button>
        </div>

        <!-- Stories tab -->
        <div v-if="currentTab === 'stories'" class="tab-content">
          <p class="tab-description">Choose a story to begin your adventure:</p>
          
          <div class="story-list">
            <div
              v-for="(story, index) in availableStories"
              :key="story.filename"
              @click="loadSelectedStory(index)"
              class="story-item"
            >
              <h3 class="story-title">{{ story.title }}</h3>
              <p class="story-author">by {{ story.author }}</p>
              <p class="story-blurb">{{ story.blurb }}</p>
            </div>
          </div>
        </div>


        <!-- File upload tab -->
        <div v-if="currentTab === 'file'" class="tab-content">
          <p class="tab-description">Load a story file (.yaml) or saved game (.json):</p>
          
          <div class="file-upload-area">
            <input
              ref="fileInput"
              type="file"
              accept=".yaml,.yml,.json"
              @change="handleFileSelect"
              class="file-input"
            />
            <div class="upload-dropzone" @click="triggerFileSelect">
              <div class="upload-icon">📁</div>
              <p>Click to select a file</p>
              <small>Supports .yaml/.yml story files and .json save files</small>
            </div>
          </div>

          
          <div v-if="versionMismatchWarning" class="version-warning">
            <h4>⚠️ Version Mismatch Warning</h4>
            <p>{{ versionMismatchWarning }}</p>
            <div class="warning-actions">
              <button @click="proceedWithVersionMismatch" class="proceed-btn">Continue Anyway</button>
              <button @click="cancelVersionMismatch" class="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameActions } from '@/composables/useGameActions'
import { useGameEngine } from '@/composables/useGameEngine'

const { 
  showLoadModal, 
  hideLoadModal, 
  availableStories, 
  loadSelectedStory 
} = useGameActions()

const { engine, loadStory, restoreGameFromSave } = useGameEngine()

// Tab state
const currentTab = ref<'stories' | 'file'>('stories')

// File upload state
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const versionMismatchWarning = ref<string>('')
const pendingSaveData = ref<any>(null)


function triggerFileSelect() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    // Immediately start loading the file
    await loadFromFile()
  }
}

function clearSelectedFile() {
  selectedFile.value = null
  versionMismatchWarning.value = ''
  pendingSaveData.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function loadFromFile() {
  if (!selectedFile.value) return
  
  try {
    const content = await readFileAsText(selectedFile.value)
    const extension = selectedFile.value.name.split('.').pop()?.toLowerCase()
    
    if (extension === 'json') {
      // Handle JSON save file
      await handleSaveFileLoad(content)
    } else if (extension === 'yaml' || extension === 'yml') {
      // Handle YAML story file
      await loadStory(content, selectedFile.value.name)
      hideLoadModal()
    } else {
      alert('Unsupported file type. Please select a .yaml story file or .json save file.')
    }
  } catch (error) {
    console.error('Error loading file:', error)
    alert('Failed to load file: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

async function handleSaveFileLoad(jsonContent: string) {
  try {
    const saveData = JSON.parse(jsonContent)
    
    // Check if we have story title and version info
    if (!saveData.storyTitle) {
      alert('Invalid save file: missing story information')
      return
    }
    
    // Check for version mismatch
    const currentStory = engine.getCurrentStory()
    if (currentStory && currentStory.title === saveData.storyTitle) {
      // Check version if available
      if (currentStory.version && saveData.storyVersion && currentStory.version !== saveData.storyVersion) {
        versionMismatchWarning.value = `Save file is from story version ${saveData.storyVersion}, but current story is version ${currentStory.version}. Loading may cause issues.`
        pendingSaveData.value = saveData
        return
      }
    }
    
    // Proceed with loading
    await loadSaveData(saveData)
  } catch (error) {
    alert('Failed to parse save file: Invalid JSON format')
  }
}

async function loadSaveData(saveData: any) {
  try {
    // Check if we need to load the story first
    const currentStory = engine.getCurrentStory()
    if (!currentStory || currentStory.title !== saveData.storyTitle) {
      // Try to find and load the matching story
      const matchingStory = availableStories.find(story => story.title === saveData.storyTitle)
      if (matchingStory) {
        const storyIndex = availableStories.indexOf(matchingStory)
        await loadSelectedStory(storyIndex)
        // Wait a bit for the story to load
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        alert(`Cannot find story "${saveData.storyTitle}". Please load the story manually first.`)
        return
      }
    }
    
    // Restore the save using Vue-native method
    const result = restoreGameFromSave(JSON.stringify(saveData))
    if (result.success) {
      clearSelectedFile()
      hideLoadModal()
    } else {
      alert(`Failed to load save: ${result.error}`)
    }
  } catch (error) {
    console.error('Error loading save data:', error)
    alert('Failed to load save data')
  }
}

function proceedWithVersionMismatch() {
  if (pendingSaveData.value) {
    loadSaveData(pendingSaveData.value)
    versionMismatchWarning.value = ''
    pendingSaveData.value = null
  }
}

function cancelVersionMismatch() {
  versionMismatchWarning.value = ''
  pendingSaveData.value = null
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('File reading error'))
    reader.readAsText(file)
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--interface-panel-border);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: var(--shadow-strong);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: var(--color-primary);
  color: var(--interface-button-text);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--interface-button-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: var(--transition-fast);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}

/* Tabs */
.load-tabs {
  display: flex;
  border-bottom: 1px solid var(--interface-panel-border);
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
  font-size: 0.9rem;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}

.tab-btn.active {
  background: var(--color-accent);
  color: var(--color-background);
}

.tab-content {
  padding: 1.5rem;
}

.tab-description {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 1rem;
}

/* Stories */
.story-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.story-item {
  padding: 1rem;
  border: 1px solid var(--interface-panel-border);
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition-fast);
  background: var(--color-background);
}

.story-item:hover {
  background: rgba(100, 181, 246, 0.15);
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: 
    0 0 0 1px var(--color-accent),
    0 4px 12px rgba(100, 181, 246, 0.3),
    var(--shadow-medium);
}

.story-title {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.story-author {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}

.story-blurb {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.4;
}

/* File upload */
.file-upload-area {
  margin-bottom: 1rem;
}

.file-input {
  display: none;
}

.upload-dropzone {
  border: 2px dashed var(--interface-panel-border);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: var(--transition-fast);
}

.upload-dropzone:hover {
  border-color: var(--color-accent);
  background: rgba(255, 255, 255, 0.02);
}

.upload-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.upload-dropzone p {
  margin: 0 0 0.25rem 0;
  color: var(--color-text-primary);
}

.upload-dropzone small {
  color: var(--color-text-secondary);
}

.proceed-btn {
  background: var(--color-accent);
  color: var(--color-background);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: var(--transition-fast);
}

.proceed-btn:hover {
  opacity: 0.9;
}

.cancel-btn {
  background: var(--color-background);
  color: var(--color-text-secondary);
  border: 1px solid var(--interface-panel-border);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: var(--transition-fast);
}

.cancel-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

/* Version warning */
.version-warning {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
}

.version-warning h4 {
  margin: 0 0 0.5rem 0;
  color: #ff9800;
}

.version-warning p {
  margin: 0 0 1rem 0;
  color: var(--color-text-primary);
}

.warning-actions {
  display: flex;
  gap: 0.5rem;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.empty-state p {
  margin: 0;
  font-style: italic;
}
</style>