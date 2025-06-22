<template>
  <Transition name="debug-pane">
    <div v-if="isVisible" class="debug-pane-overlay">
      <div class="debug-pane-container">
        <header class="debug-pane-header">
          <h3>🐛 Debug Console</h3>
          <button class="debug-close-btn" @click="hide">×</button>
        </header>
        
        <div class="debug-tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="['debug-tab', { active: currentTab === tab.id }]"
            @click="switchTab(tab.id)"
          >
            {{ tab.icon }} {{ tab.name }}
          </button>
        </div>
        
        <div class="debug-content">
          <!-- API Usage Tab -->
          <div v-show="currentTab === 'api'" class="debug-tab-content">
            <div class="api-dashboard">
              <div v-if="warnings.length > 0" class="api-warnings">
                <div class="warnings-section">
                  <h4>⚠️ Warnings</h4>
                  <ul class="warning-list">
                    <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
                  </ul>
                </div>
              </div>
              
              <div class="api-stats">
                <template v-if="hasApiData">
                  <div class="stats-section">
                    <h4>📊 Combined API Usage</h4>
                    <table class="stats-table">
                      <tr><td>Total API Calls</td><td>{{ totalStats.totalCalls }}</td></tr>
                      <tr><td>Story Calls</td><td>{{ sessionStats?.totalCalls || 0 }}</td></tr>
                      <tr><td>Memory Calls</td><td>{{ memoryStats?.totalCalls || 0 }}</td></tr>
                      <tr><td>Action Calls</td><td>{{ actionClassifierCalls }}</td></tr>
                      <tr><td>Total Input Tokens</td><td>{{ totalStats.totalInputTokens.toLocaleString() }}</td></tr>
                      <tr><td>Total Output Tokens</td><td>{{ totalStats.totalOutputTokens.toLocaleString() }}</td></tr>
                      <tr><td>Total Session Cost</td><td>${{ totalStats.totalCost.toFixed(4) }}</td></tr>
                    </table>
                  </div>
                  
                  <div v-if="sessionStats" class="stats-section">
                    <h4>🎮 Quality Model Stats (Story Generation)</h4>
                    <table class="stats-table">
                      <tr><td>Total Calls</td><td>{{ sessionStats.totalCalls }}</td></tr>
                      <tr><td>Success Rate</td><td>{{ sessionSuccessRate }}%</td></tr>
                      <tr><td>Average Latency</td><td>{{ Math.round(sessionStats.avgLatency) }}ms</td></tr>
                      <tr><td>Avg Input Tokens</td><td>{{ Math.round(sessionStats.avgInputTokens) }}</td></tr>
                      <tr><td>Avg Output Tokens</td><td>{{ Math.round(sessionStats.avgOutputTokens) }}</td></tr>
                    </table>
                  </div>
                  
                  <div v-if="memoryStats || actionClassifierCalls > 0" class="stats-section">
                    <h4>💰 Cost Model Stats (Memory & Action Classification)</h4>
                    <table class="stats-table">
                      <tr><td>Total Calls</td><td>{{ costModelTotalCalls }}</td></tr>
                      <tr><td>Success Rate</td><td>{{ costModelSuccessRate }}%</td></tr>
                      <tr><td>Average Latency</td><td>{{ costModelAvgLatency }}ms</td></tr>
                      <tr><td>Avg Input Tokens</td><td>{{ costModelAvgInputTokens }}</td></tr>
                      <tr><td>Avg Output Tokens</td><td>{{ costModelAvgOutputTokens }}</td></tr>
                    </table>
                  </div>
                </template>
                <div v-else class="no-data">
                  <p>No API usage data available yet. Start playing to see session statistics.</p>
                </div>
              </div>
              
              <div class="langchain-metrics">
                <template v-if="langchainMetrics.length > 0">
                  <div class="stats-section">
                    <h4>📈 Recent LangChain Requests</h4>
                    <p class="metrics-count">Showing last {{ recentMetrics.length }} requests</p>
                    <div class="langchain-metrics-list">
                      <div 
                        v-for="(metric, index) in recentMetrics" 
                        :key="index"
                        :class="['langchain-metric', { latest: index === 0, error: !metric.success, success: metric.success }]"
                      >
                        <div class="metric-header">
                          <span class="metric-time">{{ metric.timestamp.toLocaleTimeString() }}</span>
                          <span class="metric-provider">{{ metric.provider }}</span>
                          <span class="metric-model">{{ metric.model }}</span>
                          <span :class="['metric-status', metric.success ? 'success' : 'error']">
                            {{ metric.success ? '✅' : '❌' }}
                          </span>
                        </div>
                        <div class="metric-details">
                          <div class="metric-tokens">
                            <span>📝 {{ metric.promptTokens }} → 💭 {{ metric.completionTokens }} ({{ metric.totalTokens }} total)</span>
                          </div>
                          <div class="metric-timing">
                            <span>⏱️ {{ Math.round(metric.latencyMs) }}ms</span>
                          </div>
                          <div v-if="metric.errorType" class="metric-error">
                            <span>❌ {{ metric.errorType }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="no-data">
                  <p>No LangChain metrics available yet. LangChain director will populate this section.</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Memory Tab -->
          <div v-show="currentTab === 'memory'" class="debug-tab-content">
            <div class="memory-dashboard">
              <div v-if="memoryWarnings.length > 0" class="memory-warnings">
                <div class="warnings-section">
                  <h4>⚠️ Memory System Warnings</h4>
                  <ul class="warning-list">
                    <li v-for="(warning, index) in memoryWarnings" :key="index">{{ warning }}</li>
                  </ul>
                </div>
              </div>
              
              <div class="memory-contents">
                <template v-if="currentMemories.length > 0">
                  <div class="stats-section">
                    <h4>🧠 Current Memory Contents</h4>
                    <p class="memory-count">Showing all {{ currentMemories.length }} memories</p>
                    <div class="memory-list">
                      <div v-for="(memory, index) in currentMemories" :key="index" class="memory-item">
                        <span class="memory-index">#{{ index + 1 }}</span>
                        <span class="memory-importance">{{ memory.importance }}/10</span>
                        <span class="memory-content">{{ memory.content }}</span>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="no-data">
                  <p>No memories stored yet. Memory contents will appear here once interactions begin.</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- LLM Logs Tab -->
          <div v-show="currentTab === 'llm'" class="debug-tab-content">
            <div class="llm-dashboard">
              <div class="llm-interactions">
                <template v-if="llmInteractions.length > 0">
                  <div class="stats-section">
                    <h4>🤖 LLM Interaction History</h4>
                    <p class="interaction-count">Showing last {{ llmInteractions.length }} interactions</p>
                    <div 
                      v-for="(interaction, index) in reversedInteractions" 
                      :key="index"
                      :class="['llm-interaction', { latest: index === 0, classifier: interaction.context.classifier, compact: interaction.context.classifier }]"
                    >
                      <!-- ActionClassifier compact rendering -->
                      <template v-if="interaction.context.classifier">
                        <div class="interaction-header">
                          <span class="interaction-time">{{ interaction.timestamp.toLocaleTimeString() }}</span>
                          <span class="classifier-badge">🎯 ActionClassifier</span>
                        </div>
                        <div class="classifier-summary">
                          <div class="player-action">📝 "{{ interaction.prompt.text }}"</div>
                          <div class="classification-result">🎯 {{ interaction.response.narrative }}</div>
                          <div v-if="interaction.response.importance" class="confidence-score">
                            📊 Confidence: {{ (interaction.response.importance / 10).toFixed(2) }}
                          </div>
                          <div v-if="interaction.response.reasoning" class="classifier-reasoning">
                            💭 {{ interaction.response.reasoning }}
                          </div>
                        </div>
                      </template>
                      
                      <!-- Regular interaction full rendering -->
                      <template v-else>
                        <div class="interaction-header">
                          <span class="interaction-time">{{ interaction.timestamp.toLocaleTimeString() }}</span>
                          <span class="interaction-scene">📍 {{ interaction.context.scene }}</span>
                          <span class="interaction-context">
                            🧠 {{ interaction.context.memories }} memories | 🔀 {{ interaction.context.transitions }} transitions
                          </span>
                        </div>
                        
                        <div class="interaction-prompt">
                          <strong>Player Input:</strong> {{ interaction.prompt.text }}
                          <span class="token-count">(~{{ interaction.prompt.tokenCount }} tokens)</span>
                        </div>
                        
                        <div class="interaction-response">
                          <strong>LLM Response:</strong> {{ interaction.response.narrative }}
                          <span class="token-count">(~{{ interaction.response.tokenCount }} tokens)</span>
                          <span v-if="interaction.response.importance" class="importance-score">
                            Importance: {{ interaction.response.importance }}/10
                          </span>
                        </div>
                        
                        <div v-if="interaction.response.reasoning" class="interaction-reasoning">
                          <strong>🧠 LLM Reasoning:</strong>
                          <div class="reasoning-content">{{ interaction.response.reasoning }}</div>
                        </div>
                        
                        <div v-if="interaction.response.signals" class="interaction-signals">
                          <strong>⚡ Signals:</strong>
                          <pre>{{ JSON.stringify(interaction.response.signals, null, 2) }}</pre>
                        </div>
                        
                        <div v-if="interaction.response.memories && interaction.response.memories.length > 0" class="interaction-memories">
                          <strong>💾 Response Memories ({{ interaction.response.memories.length }}):</strong>
                          <div class="memories-list">
                            <div v-for="(memory, i) in interaction.response.memories" :key="i" class="memory-item-compact">
                              <span class="memory-index">#{{ i + 1 }}</span>
                              <span class="memory-text">{{ memory }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </template>
                <div v-else class="no-data">
                  <p>No LLM interactions yet. Player actions and LLM responses will appear here.</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Tools Tab -->
          <div v-show="currentTab === 'tools'" class="debug-tab-content">
            <div class="tools-dashboard">
              <div class="tool-section">
                <h4>🧠 Memory System</h4>
                <div class="tool-group">
                  <button class="tool-btn" @click="forceMemoryCompaction">
                    🗜️ Force Memory Compaction
                  </button>
                  <p class="tool-description">Manually trigger memory compaction regardless of current memory count</p>
                </div>
              </div>
              
              <div class="tool-section">
                <h4>💾 Data Management</h4>
                <div class="tool-group">
                  <button class="tool-btn" @click="exportDebugLogs">
                    📄 Export Debug Logs
                  </button>
                  <p class="tool-description">Export comprehensive debug data for troubleshooting</p>
                </div>
                <div class="tool-group">
                  <button class="tool-btn danger" @click="clearAllData">
                    🗑️ Clear All Data
                  </button>
                  <p class="tool-description">Reset all stored data and settings (cannot be undone)</p>
                </div>
              </div>
              
              <div v-if="toolMessages.length > 0" class="tool-messages">
                <div v-for="(message, index) in toolMessages" :key="index" class="tool-message">
                  {{ message }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { SessionStats } from '@/engine/metricsCollector'
import type { MemorySessionStats } from '@/engine/memoryMetricsCollector'
import type { LangChainMetrics } from '@/services/multiModelService'
import { calculateRequestCost } from '@/services/llm/types'

interface LlmInteraction {
  timestamp: Date
  prompt: { text: string; tokenCount: number }
  response: { 
    narrative: string
    signals?: any
    reasoning?: string
    memories?: string[]
    tokenCount: number
    importance?: number
  }
  context: { 
    scene: string
    memories: number
    transitions: number
    classifier?: boolean
  }
}

interface Tab {
  id: string
  name: string
  icon: string
}

// Component state
const isVisible = ref(false)
const currentTab = ref('api')
const sessionStats = ref<SessionStats | null>(null)
const memoryStats = ref<MemorySessionStats | null>(null)
const warnings = ref<string[]>([])
const memoryWarnings = ref<string[]>([])
const llmInteractions = ref<LlmInteraction[]>([])
const maxInteractions = 20
const currentMemories = ref<{ content: string; importance: number }[]>([])
const langchainMetrics = ref<LangChainMetrics[]>([])
const maxMetrics = 50
const memoryManager = ref<any>(null)
const toolMessages = ref<string[]>([])

// Tabs configuration
const tabs: Tab[] = [
  { id: 'api', name: 'Usage', icon: '📊' },
  { id: 'memory', name: 'Memory', icon: '🧠' },
  { id: 'llm', name: 'Logs', icon: '🤖' },
  { id: 'tools', name: 'Tools', icon: '🛠️' }
]

// Computed properties
const hasApiData = computed(() => {
  return sessionStats.value || memoryStats.value || langchainMetrics.value.length > 0
})

const actionClassifierCalls = computed(() => {
  return llmInteractions.value.filter(i => i.context.classifier === true).length
})

const totalStats = computed(() => {
  const langchainCalls = langchainMetrics.value.length
  const langchainInputTokens = langchainMetrics.value.reduce((sum, m) => sum + m.promptTokens, 0)
  const langchainOutputTokens = langchainMetrics.value.reduce((sum, m) => sum + m.completionTokens, 0)
  
  let langchainCost = 0
  try {
    langchainCost = langchainMetrics.value.reduce((sum, metric) => {
      if (metric.promptTokens > 0 || metric.completionTokens > 0) {
        try {
          const cost = calculateRequestCost(metric.model, metric.provider, metric.promptTokens, metric.completionTokens)
          return sum + cost
        } catch (error) {
          console.warn('Could not calculate cost for metric:', metric, error)
          const costPer1kInput = 0.001
          const costPer1kOutput = 0.002
          const inputCost = (metric.promptTokens / 1000) * costPer1kInput
          const outputCost = (metric.completionTokens / 1000) * costPer1kOutput
          return sum + inputCost + outputCost
        }
      }
      return sum
    }, 0)
  } catch (error) {
    console.warn('Could not calculate LangChain costs:', error)
  }
  
  return {
    totalCalls: (sessionStats.value?.totalCalls || 0) + (memoryStats.value?.totalCalls || 0) + langchainCalls,
    totalInputTokens: (sessionStats.value?.totalInputTokens || 0) + (memoryStats.value?.totalInputTokens || 0) + langchainInputTokens,
    totalOutputTokens: (sessionStats.value?.totalOutputTokens || 0) + (memoryStats.value?.totalOutputTokens || 0) + langchainOutputTokens,
    totalCost: (sessionStats.value?.totalCost || 0) + (memoryStats.value?.totalCost || 0) + langchainCost
  }
})

const sessionSuccessRate = computed(() => {
  if (!sessionStats.value) return 0
  return ((sessionStats.value.successfulCalls / Math.max(1, sessionStats.value.totalCalls)) * 100).toFixed(1)
})

const costModelTotalCalls = computed(() => {
  return (memoryStats.value?.totalCalls || 0) + actionClassifierCalls.value
})

const costModelSuccessRate = computed(() => {
  const memorySuccessfulCalls = memoryStats.value?.successfulCalls || 0
  const memoryTotalCalls = memoryStats.value?.totalCalls || 0
  
  const actionInteractions = llmInteractions.value.filter(i => i.context.classifier === true)
  const actionSuccessfulCalls = actionInteractions.filter(i => 
    !i.response.narrative.includes('Error') && !i.response.narrative.includes('Failed')
  ).length
  
  const totalSuccessful = memorySuccessfulCalls + actionSuccessfulCalls
  const totalCalls = memoryTotalCalls + actionInteractions.length
  
  if (totalCalls === 0) return '0.0'
  return ((totalSuccessful / totalCalls) * 100).toFixed(1)
})

const costModelAvgLatency = computed(() => {
  const memoryLatency = memoryStats.value?.avgLatency || 0
  const memoryWeight = memoryStats.value?.totalCalls || 0
  
  const actionMetrics = langchainMetrics.value.filter(m => 
    m.model.includes('haiku') || m.model.includes('mini') || m.model.includes('flash')
  )
  const actionLatency = actionMetrics.length > 0 
    ? actionMetrics.reduce((sum, m) => sum + m.latencyMs, 0) / actionMetrics.length 
    : 0
  const actionWeight = actionClassifierCalls.value
  
  const totalWeight = memoryWeight + actionWeight
  if (totalWeight === 0) return 0
  
  return Math.round((memoryLatency * memoryWeight + actionLatency * actionWeight) / totalWeight)
})

const costModelAvgInputTokens = computed(() => {
  const memoryInputTokens = memoryStats.value?.avgInputTokens || 0
  const memoryWeight = memoryStats.value?.totalCalls || 0
  
  const actionInteractions = llmInteractions.value.filter(i => i.context.classifier === true)
  const actionInputTokens = actionInteractions.length > 0 
    ? actionInteractions.reduce((sum, i) => sum + i.prompt.tokenCount, 0) / actionInteractions.length 
    : 0
  const actionWeight = actionInteractions.length
  
  const totalWeight = memoryWeight + actionWeight
  if (totalWeight === 0) return 0
  
  return Math.round((memoryInputTokens * memoryWeight + actionInputTokens * actionWeight) / totalWeight)
})

const costModelAvgOutputTokens = computed(() => {
  const memoryOutputTokens = memoryStats.value?.avgOutputTokens || 0
  const memoryWeight = memoryStats.value?.totalCalls || 0
  
  const actionInteractions = llmInteractions.value.filter(i => i.context.classifier === true)
  const actionOutputTokens = actionInteractions.length > 0 
    ? actionInteractions.reduce((sum, i) => sum + i.response.tokenCount, 0) / actionInteractions.length 
    : 0
  const actionWeight = actionInteractions.length
  
  const totalWeight = memoryWeight + actionWeight
  if (totalWeight === 0) return 0
  
  return Math.round((memoryOutputTokens * memoryWeight + actionOutputTokens * actionWeight) / totalWeight)
})

const recentMetrics = computed(() => {
  return langchainMetrics.value.slice(-10).reverse()
})

const reversedInteractions = computed(() => {
  return llmInteractions.value.slice().reverse()
})

// Methods
function toggle() {
  if (isVisible.value) {
    hide()
  } else {
    show()
  }
}

function show() {
  isVisible.value = true
}

function hide() {
  isVisible.value = false
}

function switchTab(tabId: string) {
  currentTab.value = tabId
}

function updateSessionStats(stats: SessionStats) {
  sessionStats.value = stats
  
  // Update warnings based on stats
  warnings.value = []
  
  if (stats.failedCalls > 0) {
    warnings.value.push(`🔴 ${stats.failedCalls} failed LLM calls this session`)
  }
  
  if (stats.totalCost > 1.0) {
    warnings.value.push(`💰 Session costs above $1.00 ($${stats.totalCost.toFixed(2)})`)
  }
  
  if (stats.avgLatency > 5000) {
    warnings.value.push(`⚠️ Average response time above 5 seconds (${Math.round(stats.avgLatency)}ms)`)
  }
}

function updateMemoryStats(stats: MemorySessionStats, warningsList: string[]) {
  memoryStats.value = stats
  memoryWarnings.value = warningsList
}

function updateMemoryContents(memories: { content: string; importance: number }[]) {
  currentMemories.value = [...memories]
}

function logLlmCall(interaction: Omit<LlmInteraction, 'timestamp'>) {
  llmInteractions.value.push({
    ...interaction,
    timestamp: new Date()
  })
  
  // Keep only the last N interactions
  if (llmInteractions.value.length > maxInteractions) {
    llmInteractions.value = llmInteractions.value.slice(-maxInteractions)
  }
}

function addLangChainMetric(metric: LangChainMetrics) {
  langchainMetrics.value.push(metric)
  
  // Keep only the last N metrics
  if (langchainMetrics.value.length > maxMetrics) {
    langchainMetrics.value = langchainMetrics.value.slice(-maxMetrics)
  }
}

function setMemoryManager(manager: any) {
  memoryManager.value = manager
}

function getCurrentMemories(): { content: string; importance: number }[] {
  if (memoryManager.value?.getAllMemories) {
    return memoryManager.value.getAllMemories().map((m: any) => ({ 
      content: m.content, 
      importance: m.importance 
    }))
  }
  return currentMemories.value
}

function addToolMessage(message: string) {
  toolMessages.value.push(`[${new Date().toLocaleTimeString()}] ${message}`)
  
  // Keep only last 5 messages
  if (toolMessages.value.length > 5) {
    toolMessages.value = toolMessages.value.slice(-5)
  }
}

function forceMemoryCompaction() {
  if (memoryManager.value) {
    try {
      memoryManager.value.triggerAsyncCompaction?.()
      addToolMessage('🗜️ Memory compaction triggered manually')
    } catch (error) {
      addToolMessage(`❌ Error triggering compaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } else {
    addToolMessage('❌ Memory manager not available')
  }
}

function exportDebugLogs() {
  const logs = {
    timestamp: new Date().toISOString(),
    sessionStats: sessionStats.value,
    memoryStats: memoryStats.value,
    warnings: warnings.value,
    memoryWarnings: memoryWarnings.value,
    langchainMetrics: langchainMetrics.value.slice(-20),
    llmInteractions: llmInteractions.value.slice(-10),
    currentMemories: currentMemories.value,
    memoryManagerStats: memoryManager.value?.getStats?.() || null
  }

  const jsonString = JSON.stringify(logs, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `iffy-debug-logs-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  addToolMessage('📄 Debug logs exported successfully')
}

function clearAllData() {
  if (confirm('Clear all saved games, settings, and memories? This cannot be undone.')) {
    try {
      localStorage.clear()
      if (memoryManager.value) {
        memoryManager.value.reset?.()
      }
      addToolMessage('🗑️ All data cleared successfully')
      // Refresh the page to reinitialize
      setTimeout(() => location.reload(), 1000)
    } catch (error) {
      addToolMessage(`❌ Error clearing data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Expose methods for external use
defineExpose({
  toggle,
  show,
  hide,
  updateSessionStats,
  updateMemoryStats,
  updateMemoryContents,
  logLlmCall,
  addLangChainMetric,
  setMemoryManager
})
</script>

<style scoped>
.debug-pane-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.debug-pane-container {
  background: var(--color-surface);
  border: 1px solid var(--interface-panel-border);
  border-radius: 12px;
  width: 90%;
  max-width: 1200px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-strong);
}

.debug-pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: var(--color-primary);
  color: var(--interface-button-text);
  border-bottom: 1px solid var(--interface-panel-border);
}

.debug-pane-header h3 {
  margin: 0;
  color: var(--interface-button-text);
  font-size: 1.25rem;
}

.debug-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--interface-button-text);
  cursor: pointer;
  padding: 0.5rem;
  transition: opacity 0.2s;
}

.debug-close-btn:hover {
  opacity: 0.7;
}

.debug-tabs {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--interface-panel-border);
  background: rgba(255, 255, 255, 0.02);
}

.debug-tab {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.debug-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-color);
}

.debug-tab.active {
  background: var(--accent-color);
  color: white;
}

.debug-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Tab content visibility handled by v-show directive */
.debug-tab-content {
  height: 100%;
}

/* Dashboard containers */
.api-dashboard,
.memory-dashboard,
.llm-dashboard,
.tools-dashboard {
  min-height: 100%;
}

/* Warnings section */
.warnings-section {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.warnings-section h4 {
  margin: 0 0 0.5rem 0;
  color: #ff9800;
}

.warning-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.warning-list li {
  padding: 0.25rem 0;
  color: #ffb74d;
}

/* Stats sections */
.stats-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.stats-section h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table td {
  padding: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.stats-table td:first-child {
  color: var(--text-secondary);
}

.stats-table td:last-child {
  text-align: right;
  font-weight: bold;
  color: var(--text-color);
}

/* No data message */
.no-data {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

/* Memory list */
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.memory-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.memory-index {
  min-width: 3rem;
  color: #9c27b0;
  font-weight: bold;
}

.memory-importance {
  min-width: 3rem;
  color: #4caf50;
}

.memory-content {
  flex: 1;
  color: var(--text-color);
}

/* LLM interactions */
.llm-interaction {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s;
}

.llm-interaction.latest {
  border-color: rgba(100, 181, 246, 0.5);
  background: rgba(100, 181, 246, 0.08);
}

.interaction-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.interaction-time {
  font-weight: bold;
  color: #64b5f6;
}

.interaction-prompt,
.interaction-response {
  margin: 0.5rem 0;
}

.token-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}

.importance-score {
  font-size: 0.8rem;
  color: #4caf50;
  margin-left: 0.5rem;
}

/* Tools section */
.tool-section {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.tool-section h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.tool-btn {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  width: 100%;
  margin-bottom: 0.75rem;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(100, 181, 246, 0.5);
}

.tool-btn.danger:hover {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.6);
}

.tool-description {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 0.5rem;
  font-style: italic;
}

.tool-messages {
  margin-top: 1rem;
  max-height: 200px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.75rem;
}

.tool-message {
  font-size: 0.85rem;
  margin: 0.5rem 0;
  opacity: 0.9;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.25rem;
}

.tool-message:last-child {
  border-bottom: none;
}

/* LangChain metrics styles */
.langchain-metric {
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.langchain-metric.latest {
  border-color: rgba(100, 181, 246, 0.5);
  background: rgba(100, 181, 246, 0.12);
}

.langchain-metric.error {
  border-left: 4px solid #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.langchain-metric.success {
  border-left: 4px solid #4caf50;
}

.metric-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-color);
  opacity: 0.8;
}

.metric-time {
  font-weight: bold;
  color: #64b5f6;
}

.metric-provider {
  background: rgba(255, 193, 7, 0.2);
  color: #ffd54f;
  padding: 0.1rem 0.5rem;
  border-radius: 3px;
  font-size: 0.8rem;
}

.metric-model {
  color: #81c784;
  font-style: italic;
}

.metric-status.success {
  color: #4caf50;
}

.metric-status.error {
  color: #f44336;
}

.metric-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.metric-tokens {
  color: #ffb74d;
}

.metric-timing {
  color: #64b5f6;
}

.metric-error {
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
  padding: 0.5rem;
  border-radius: 3px;
  margin-top: 0.5rem;
}

.langchain-metrics-list {
  margin-top: 1rem;
}

.metrics-count {
  margin: 0 0 1rem;
  padding: 0 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  opacity: 0.7;
  font-style: italic;
}

/* Interaction count */
.interaction-count {
  margin: 0 0 1rem;
  padding: 0 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  opacity: 0.7;
  font-style: italic;
}

/* Memory count */
.memory-count {
  margin: 0 0 1rem;
  padding: 0 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  opacity: 0.7;
  font-style: italic;
}

/* Reasoning and memories styling */
.interaction-reasoning {
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: rgba(108, 171, 251, 0.1);
  border-left: 3px solid #6cabfb;
  border-radius: 4px;
}

.reasoning-content {
  margin-top: 0.5rem;
  font-style: italic;
  color: #e3f2fd;
  line-height: 1.4;
  white-space: pre-wrap;
}

.interaction-memories {
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: rgba(156, 39, 176, 0.1);
  border-left: 3px solid #9c27b0;
  border-radius: 4px;
}

.memories-list {
  margin-top: 0.5rem;
}

.memory-item-compact {
  display: flex;
  align-items: flex-start;
  margin: 0.25rem 0;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.memory-item-compact:last-child {
  border-bottom: none;
}

.memory-text {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.3;
  color: #f3e5f5;
}

/* ActionClassifier specific styling */
.llm-interaction.classifier {
  border-left: 4px solid #ff9800;
  background: rgba(255, 152, 0, 0.05);
}

.llm-interaction.classifier.compact {
  padding: 0.5rem 0.75rem;
  margin: 0.5rem 0;
  overflow: hidden;
  word-wrap: break-word;
}

.classifier-badge {
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
  padding: 0.1rem 0.5rem;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: bold;
}

.classifier-summary {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.classifier-summary .player-action {
  color: #e3f2fd;
  font-style: italic;
  word-wrap: break-word;
  line-height: 1.3;
}

.classifier-summary .classification-result {
  color: #ffb74d;
  font-weight: bold;
  word-wrap: break-word;
  line-height: 1.3;
}

.classifier-summary .confidence-score {
  color: #81c784;
  font-size: 0.8rem;
}

.classifier-summary .classifier-reasoning {
  color: #9e9e9e;
  font-style: italic;
  font-size: 0.85rem;
  line-height: 1.4;
  margin-top: 0.25rem;
  word-wrap: break-word;
}

/* Interaction signals */
.interaction-signals {
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #4caf50;
  border-radius: 4px;
}

.interaction-signals pre {
  margin: 0.5rem 0 0 0;
  font-size: 0.85rem;
  color: #a5d6a7;
  overflow-x: auto;
}

/* Transitions */
.debug-pane-enter-active,
.debug-pane-leave-active {
  transition: opacity 0.3s ease;
}

.debug-pane-enter-from,
.debug-pane-leave-to {
  opacity: 0;
}
</style>