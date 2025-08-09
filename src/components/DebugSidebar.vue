<template>
  <div class="debug-sidebar" :class="{ 'open': isOpen }">
    <!-- Toggle Button -->
    <button 
      class="debug-toggle" 
      @click="toggleSidebar"
      :title="isOpen ? 'Close Debug Panel' : 'Open Debug Panel'"
    >
      <span class="debug-icon">🔍</span>
    </button>

    <!-- Sidebar Content -->
    <div class="debug-content" v-if="isOpen">
      <div class="debug-header">
        <h3>Debug Console</h3>
        <div class="debug-actions">
          <button 
            @click="emit('toggleDebug')" 
            class="action-btn debug-toggle-btn" 
            :class="{ 'debug-on': props.debugEnabled }"
            :title="props.debugEnabled ? 'Hide choice effects' : 'Show choice effects'"
          >
            {{ props.debugEnabled ? '🔍 ON' : '🔍 OFF' }}
          </button>
          <button @click="exportLog" class="action-btn" title="Export Log">💾</button>
          <button @click="clearLog" class="action-btn" title="Clear Log">🗑️</button>
          <button @click="toggleSidebar" class="action-btn" title="Close">✖️</button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="debug-stats">
        <div class="stat-item">
          <span class="stat-label">LLM Calls:</span>
          <span class="stat-value">{{ stats.totalInteractions }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">State Changes:</span>
          <span class="stat-value">{{ stats.totalStateChanges }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Response:</span>
          <span class="stat-value">{{ Math.round(stats.averageResponseTime) }}ms</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Success Rate:</span>
          <span class="stat-value">{{ Math.round(stats.successRate * 100) }}%</span>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="debug-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'all' }"
          @click="activeTab = 'all'"
        >
          All ({{ allEvents.length }})
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'llm' }"
          @click="activeTab = 'llm'"
        >
          LLM ({{ llmInteractions.length }})
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'state' }"
          @click="activeTab = 'state'"
        >
          State ({{ stateChanges.length }})
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'structure' }"
          @click="activeTab = 'structure'"
          v-if="compiledStructure"
        >
          Structure
        </button>
      </div>

      <!-- Structure Content -->
      <div class="structure-content" v-if="activeTab === 'structure' && compiledStructure">
        <div class="structure-section">
          <h4>📋 Story Overview</h4>
          <div class="structure-info">
            <div class="structure-item">
              <strong>Title:</strong> {{ compiledStructure.title }}
            </div>
            <div class="structure-item">
              <strong>Total Scenes:</strong> {{ compiledStructure.scene_sequence.length }}
            </div>
            <div class="structure-item">
              <strong>Possible Endings:</strong> {{ compiledStructure.endings.length }}
            </div>
          </div>
        </div>

        <div class="structure-section">
          <h4>🎬 Scene Sequence</h4>
          <div v-for="(scene, index) in compiledStructure.scene_sequence" :key="scene.id" class="scene-item">
            <div class="scene-header">
              <span class="scene-number">{{ index + 1 }}</span>
              <span class="scene-id">{{ scene.id }}</span>
            </div>
            <div class="scene-goal">{{ scene.goal }}</div>
          </div>
        </div>

        <div class="structure-section">
          <h4>🎯 Possible Endings</h4>
          <div v-for="ending in compiledStructure.endings" :key="ending.id" class="ending-item">
            <div class="ending-header">
              <span class="ending-id">{{ ending.id }}</span>
              <span class="ending-tone">{{ ending.tone }}</span>
            </div>
            <div class="ending-condition">Condition: <code>{{ ending.condition }}</code></div>
          </div>
        </div>

        <div class="structure-section" v-if="compiledStructure.guidelines">
          <h4>🎨 Style Guidelines</h4>
          <div class="guidelines-info">
            <div v-if="compiledStructure.guidelines.narrative" class="guideline-item">
              <strong>Narrative:</strong> {{ compiledStructure.guidelines.narrative }}
            </div>
            <div v-if="compiledStructure.guidelines.choices" class="guideline-item">
              <strong>Choices:</strong> {{ compiledStructure.guidelines.choices }}
            </div>
            <div v-if="compiledStructure.guidelines.tone" class="guideline-item">
              <strong>Tone:</strong> {{ compiledStructure.guidelines.tone }}
            </div>
          </div>
        </div>

        <div class="structure-section">
          <h4>📊 Initial State</h4>
          <div class="state-variables">
            <div v-for="(value, key) in compiledStructure.initial_state" :key="key" class="state-var">
              <span class="var-name">{{ key }}:</span>
              <span class="var-value">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Event List -->
      <div class="debug-events" v-if="activeTab !== 'structure'">
        <div 
          v-for="event in filteredEvents" 
          :key="event.id"
          class="debug-event"
          :class="[event.type, event.status]"
          @click="toggleEventExpanded(event.id)"
        >
          <div class="event-header">
            <div class="event-title">
              <span class="event-icon">{{ getEventIcon(event) }}</span>
              <span class="event-name">{{ event.title }}</span>
              <span class="event-status" :class="event.status">{{ getStatusText(event.status) }}</span>
            </div>
            <div class="event-subtitle">{{ event.subtitle }}</div>
            <div class="event-expand">{{ expandedEvents.has(event.id) ? '▼' : '▶' }}</div>
          </div>
          
          <div class="event-details" v-if="expandedEvents.has(event.id)">
            <pre>{{ event.details }}</pre>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredEvents.length === 0" class="debug-empty">
        <span class="empty-icon">📋</span>
        <p>No {{ activeTab === 'all' ? 'events' : activeTab + ' events' }} yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DebugTracker, type LLMInteraction, type StateChange } from '../engines/emergent/DebugTracker.js'
import { CompiledStoryStructure } from '../types/emergentStory.js'

interface Props {
  debugTracker?: DebugTracker
  compiledStructure?: CompiledStoryStructure | null
  debugEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  debugTracker: undefined,
  compiledStructure: null,
  debugEnabled: false
})

const emit = defineEmits<{
  toggleDebug: []
}>()

// Reactive state
const isOpen = ref(false)
const activeTab = ref<'all' | 'llm' | 'state' | 'structure'>('all')
const expandedEvents = ref(new Set<string>())

// Computed data from debug tracker
const debugLog = computed(() => props.debugTracker?.getLog() || { llmInteractions: [], stateChanges: [] })
const stats = computed(() => props.debugTracker?.getStats() || { 
  totalInteractions: 0, 
  totalStateChanges: 0, 
  averageResponseTime: 0, 
  successRate: 0,
  sessionDuration: 0 
})

const llmInteractions = computed(() => debugLog.value.llmInteractions)
const stateChanges = computed(() => debugLog.value.stateChanges)

// Format events for display
const formattedLLMEvents = computed(() => 
  llmInteractions.value.map(interaction => ({
    id: interaction.id,
    type: 'llm' as const,
    status: interaction.success ? 'success' as const : 'error' as const,
    timestamp: interaction.timestamp,
    ...props.debugTracker!.formatInteraction(interaction)
  }))
)

const formattedStateEvents = computed(() =>
  stateChanges.value.map(change => ({
    id: change.id,
    type: 'state' as const,
    status: 'success' as const,
    timestamp: change.timestamp,
    ...props.debugTracker!.formatStateChange(change)
  }))
)

// Combine and sort all events
const allEvents = computed(() => {
  const combined = [...formattedLLMEvents.value, ...formattedStateEvents.value]
  return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
})

const filteredEvents = computed(() => {
  switch (activeTab.value) {
    case 'llm': return formattedLLMEvents.value
    case 'state': return formattedStateEvents.value
    default: return allEvents.value
  }
})

const totalEvents = computed(() => allEvents.value.length)

// Methods
function toggleSidebar() {
  isOpen.value = !isOpen.value
}

function toggleEventExpanded(eventId: string) {
  if (expandedEvents.value.has(eventId)) {
    expandedEvents.value.delete(eventId)
  } else {
    expandedEvents.value.add(eventId)
  }
}

function getEventIcon(event: any) {
  if (event.type === 'llm') {
    return event.status === 'success' ? '🤖' : '❌'
  }
  return '📊'
}

function getStatusText(status: string) {
  switch (status) {
    case 'success': return '✓'
    case 'error': return '✗'
    default: return ''
  }
}

function clearLog() {
  if (confirm('Clear all debug events?')) {
    props.debugTracker?.clear()
    expandedEvents.value.clear()
  }
}

function exportLog() {
  if (!props.debugTracker) return
  
  const logData = props.debugTracker.exportAsJSON()
  const blob = new Blob([logData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `debug-log-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Auto-expand latest event
watch(() => allEvents.value.length, (newLength, oldLength) => {
  if (newLength > oldLength && allEvents.value.length > 0) {
    const latestEvent = allEvents.value[allEvents.value.length - 1]
    if (latestEvent) {
      expandedEvents.value.add(latestEvent.id)
    }
  }
})
</script>

<style scoped>
.debug-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 500px;
  height: 100vh;
  background: #1a1a1a;
  color: #f0f0f0;
  border-left: 2px solid #333;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.debug-sidebar.open {
  transform: translateX(0);
}

.debug-toggle {
  position: absolute;
  left: -50px;
  top: 50px;
  width: 48px;
  height: 48px;
  background: #333;
  border: 2px solid #555;
  border-radius: 8px 0 0 8px;
  color: #f0f0f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.debug-toggle:hover {
  background: #444;
  border-color: #666;
}

.debug-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
}

.debug-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
}

.debug-header h3 {
  margin: 0;
  color: #f0f0f0;
  font-size: 1.1rem;
}

.debug-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: 1px solid #555;
  color: #f0f0f0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #555;
}

.debug-stats {
  padding: 0.75rem 1rem;
  background: #252525;
  border-bottom: 1px solid #444;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.stat-label {
  color: #aaa;
}

.stat-value {
  color: #f0f0f0;
  font-weight: 500;
}

.debug-tabs {
  display: flex;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: #aaa;
  padding: 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  background: #333;
  color: #f0f0f0;
}

.tab-btn.active {
  color: #4CAF50;
  border-bottom-color: #4CAF50;
  background: #2d2d2d;
}

.debug-events {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.debug-event {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.debug-event:hover {
  border-color: #555;
  background: #2d2d2d;
}

.debug-event.success {
  border-left: 3px solid #4CAF50;
}

.debug-event.error {
  border-left: 3px solid #f44336;
}

.event-header {
  padding: 0.75rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}

.event-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.event-icon {
  font-size: 1.1rem;
}

.event-name {
  color: #f0f0f0;
}

.event-status.success {
  color: #4CAF50;
}

.event-status.error {
  color: #f44336;
}

.event-subtitle {
  font-size: 0.8rem;
  color: #aaa;
  grid-column: 1;
}

.event-expand {
  color: #aaa;
  font-size: 0.8rem;
  grid-row: 1 / 3;
  display: flex;
  align-items: center;
}

.event-details {
  border-top: 1px solid #444;
  background: #1f1f1f;
}

.event-details pre {
  padding: 0.75rem;
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #ddd;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.debug-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.debug-events::-webkit-scrollbar {
  width: 6px;
}

.debug-events::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.debug-events::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.debug-events::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Structure Content Styles */
.structure-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.structure-section {
  margin-bottom: 1.5rem;
  background: #2a2a2a;
  border-radius: 6px;
  padding: 1rem;
}

.structure-section h4 {
  margin: 0 0 0.75rem 0;
  color: #4CAF50;
  font-size: 0.9rem;
  font-weight: 600;
}

.structure-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.structure-item {
  font-size: 0.85rem;
  color: #ddd;
}

.structure-item strong {
  color: #f0f0f0;
  margin-right: 0.5rem;
}

.scene-item {
  background: #333;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.scene-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.scene-number {
  background: #4CAF50;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

.scene-id {
  color: #f0f0f0;
  font-weight: 500;
  font-size: 0.85rem;
}

.scene-goal {
  color: #ccc;
  font-size: 0.8rem;
  font-style: italic;
}

.ending-item {
  background: #333;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.ending-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.ending-id {
  color: #f0f0f0;
  font-weight: 500;
  font-size: 0.85rem;
}

.ending-tone {
  background: #555;
  color: #ddd;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  text-transform: capitalize;
}

.ending-condition {
  color: #ccc;
  font-size: 0.8rem;
}

.ending-condition code {
  background: #444;
  color: #4CAF50;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
}

.state-variables {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.state-var {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #333;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
}

.var-name {
  color: #4CAF50;
  font-weight: 500;
  font-size: 0.85rem;
}

.var-value {
  color: #f0f0f0;
  font-size: 0.85rem;
  font-family: 'Monaco', 'Menlo', monospace;
}

.guidelines-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.guideline-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: #333;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
}

.guideline-item strong {
  color: #4CAF50;
  font-weight: 500;
  font-size: 0.85rem;
}

/* Mobile Responsive Styles for Debug Sidebar */
@media (max-width: 768px) {
  .debug-sidebar {
    width: 100vw;
    transform: translateX(100%);
  }

  .debug-sidebar.open {
    transform: translateX(0);
  }

  .debug-toggle {
    right: 1rem;
    top: 1rem;
  }

  .debug-content {
    padding: 0.75rem;
  }

  .debug-header h3 {
    font-size: 1.1rem;
  }

  .debug-stats {
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
  }

  .stat-item {
    font-size: 0.8rem;
  }

  .debug-tabs {
    overflow-x: auto;
  }

  .tab-btn {
    min-width: 80px;
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  .structure-content {
    padding: 0.75rem;
  }

  .structure-section {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .structure-section h4 {
    font-size: 0.85rem;
  }

  .scene-item,
  .ending-item {
    padding: 0.5rem;
  }

  .scene-header,
  .ending-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .state-var {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.5rem;
  }

  .debug-event {
    margin-bottom: 0.5rem;
  }

  .event-header {
    padding: 0.75rem;
  }

  .event-details pre {
    font-size: 0.75rem;
    word-wrap: break-word;
    white-space: pre-wrap;
  }
}

@media (max-width: 480px) {
  .debug-toggle {
    width: 36px;
    height: 36px;
    right: 0.5rem;
    top: 0.5rem;
  }

  .debug-badge {
    width: 16px;
    height: 16px;
    font-size: 0.65rem;
    top: -6px;
    right: -6px;
  }

  .debug-content {
    padding: 0.5rem;
  }

  .debug-stats {
    grid-template-columns: 1fr;
  }

  .structure-section {
    padding: 0.5rem;
  }

  .scene-number {
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
  }

  .ending-tone {
    padding: 0.125rem 0.375rem;
    font-size: 0.65rem;
  }

  .event-details pre {
    font-size: 0.7rem;
  }
}

/* Debug Toggle Button Styles */
.debug-toggle-btn {
  background: #dc3545 !important;
  border-color: #dc3545 !important;
  color: #f0f0f0 !important;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  /* Remove any positioning that might interfere */
  position: static;
  transform: none;
  width: auto;
  height: auto;
}

.debug-toggle-btn:hover {
  background: #c82333 !important;
  border-color: #bd2130 !important;
}

.debug-toggle-btn.debug-on {
  background: #28a745 !important;
  border-color: #28a745 !important;
}

.debug-toggle-btn.debug-on:hover {
  background: #218838 !important;
  border-color: #1e7e34 !important;
}
</style>