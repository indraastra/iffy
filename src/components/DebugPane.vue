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
            @click="currentTab = tab.id"
          >
            {{ tab.icon }} {{ tab.name }}
          </button>
        </div>
        
        <div class="debug-content">
          <!-- API Usage Tab -->
          <div v-if="currentTab === 'api'" class="tab-panel">
            <div v-if="warnings.length > 0" class="warning-box">
              <h4>⚠️ Warnings</h4>
              <ul>
                <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
              </ul>
            </div>
            
            <div v-if="hasApiData" class="stats-grid">
              <div class="stats-card">
                <h4>📊 Combined API Usage</h4>
                <table>
                  <tbody>
                    <tr><td>Total API Calls</td><td>{{ totalStats.totalCalls }}</td></tr>
                    <tr><td>Story Calls</td><td>{{ sessionStats?.totalCalls || 0 }}</td></tr>
                    <tr><td>Memory Calls</td><td>{{ memoryStats?.totalCalls || 0 }}</td></tr>
                    <tr><td>Flag Calls</td><td>{{ actionClassifierCalls }}</td></tr>
                    <tr><td>Total Input Tokens</td><td>{{ totalStats.totalInputTokens.toLocaleString() }}</td></tr>
                    <tr><td>Total Output Tokens</td><td>{{ totalStats.totalOutputTokens.toLocaleString() }}</td></tr>
                    <tr><td>Total Session Cost</td><td>${{ totalStats.totalCost.toFixed(4) }}</td></tr>
                  </tbody>
                </table>
              </div>
              
              <div v-if="sessionStats" class="stats-card">
                <h4>🎮 Quality Model Stats</h4>
                <table>
                  <tbody>
                    <tr><td>Total Calls</td><td>{{ sessionStats.totalCalls }}</td></tr>
                    <tr><td>Success Rate</td><td>{{ sessionSuccessRate }}%</td></tr>
                    <tr><td>Average Latency</td><td>{{ Math.round(sessionStats.avgLatency) }}ms</td></tr>
                    <tr><td>Avg Input Tokens</td><td>{{ Math.round(sessionStats.avgInputTokens) }}</td></tr>
                    <tr><td>Avg Output Tokens</td><td>{{ Math.round(sessionStats.avgOutputTokens) }}</td></tr>
                  </tbody>
                </table>
              </div>
              
              <div v-if="langchainMetrics.length > 0" class="stats-card">
                <h4>📈 Recent LangChain Requests</h4>
                <p class="subtitle">Last {{ Math.min(langchainMetrics.length, 10) }} requests</p>
                <div class="metrics-list">
                  <div 
                    v-for="(metric, index) in recentMetrics" 
                    :key="index"
                    :class="['metric-item', { latest: index === 0, error: !metric.success }]"
                  >
                    <div class="metric-header">
                      <span>{{ metric.timestamp.toLocaleTimeString() }}</span>
                      <span class="provider-badge">{{ metric.provider }}</span>
                      <span>{{ metric.model }}</span>
                      <span :class="['status', metric.success ? 'success' : 'error']">
                        {{ metric.success ? '✅' : '❌' }}
                      </span>
                    </div>
                    <div class="metric-details">
                      <span>📝 {{ metric.promptTokens }} → 💭 {{ metric.completionTokens }}</span>
                      <span>⏱️ {{ Math.round(metric.latencyMs) }}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No API usage data available yet. Start playing to see session statistics.</p>
            </div>
          </div>
          
          <!-- Memory Tab -->
          <div v-if="currentTab === 'memory'" class="tab-panel">
            <div v-if="memoryWarnings.length > 0" class="warning-box">
              <h4>⚠️ Memory System Warnings</h4>
              <ul>
                <li v-for="(warning, index) in memoryWarnings" :key="index">{{ warning }}</li>
              </ul>
            </div>
            
            <div v-if="currentMemories.length > 0" class="stats-card">
              <h4>🧠 Current Memory Contents</h4>
              <p class="subtitle">{{ currentMemories.length }} memories stored</p>
              <div class="memory-list">
                <div v-for="(memory, index) in currentMemories" :key="index" class="memory-item">
                  <span class="memory-index">#{{ index + 1 }}</span>
                  <span class="memory-importance">{{ memory.importance }}/10</span>
                  <span class="memory-content">{{ memory.content }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No memories stored yet. Memory contents will appear here once interactions begin.</p>
            </div>
          </div>
          
          <!-- LLM Logs Tab -->
          <div v-if="currentTab === 'llm'" class="tab-panel">
            <div v-if="llmInteractions.length > 0" class="stats-card">
              <h4>🤖 LLM Interaction History</h4>
              <p class="subtitle">Last {{ llmInteractions.length }} interactions</p>
              <div class="interactions-list">
                <div 
                  v-for="(interaction, index) in reversedInteractions" 
                  :key="index"
                  :class="['interaction-item', { latest: index === 0, classifier: interaction.context.classifier }]"
                >
                  <div class="interaction-header">
                    <span>{{ interaction.timestamp.toLocaleTimeString() }}</span>
                    <span v-if="interaction.context.classifier" class="classifier-badge">🎯 ActionClassifier</span>
                    <span v-else>📍 {{ interaction.context.scene }}</span>
                  </div>
                  
                  <div v-if="interaction.context.classifier" class="classifier-content">
                    <div class="player-action">📝 "{{ interaction.prompt.text }}"</div>
                    <div class="classification-result">🎯 {{ interaction.response.narrative }}</div>
                  </div>
                  <div v-else class="full-interaction">
                    <div class="prompt">
                      <strong>Player:</strong> {{ interaction.prompt.text }}
                      <span class="token-count">({{ interaction.prompt.tokenCount }} tokens)</span>
                    </div>
                    <div class="response">
                      <strong>LLM:</strong> {{ interaction.response.narrative }}
                      <span class="token-count">({{ interaction.response.tokenCount }} tokens)</span>
                    </div>
                    <div v-if="interaction.response.reasoning" class="reasoning">
                      <strong>Reasoning:</strong> {{ interaction.response.reasoning }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No LLM interactions yet. Player actions and LLM responses will appear here.</p>
            </div>
          </div>
          
          <!-- Tools Tab -->
          <div v-if="currentTab === 'tools'" class="tab-panel">
            <div class="tools-grid">
              <div class="tool-section">
                <h4>🧠 Memory System</h4>
                <button class="tool-btn" @click="forceMemoryCompaction">
                  🗜️ Force Memory Compaction
                </button>
                <p class="tool-desc">Manually trigger memory compaction regardless of current memory count</p>
              </div>
              
              <div class="tool-section">
                <h4>💾 Data Management</h4>
                <button class="tool-btn" @click="exportDebugLogs">
                  📄 Export Debug Logs
                </button>
                <p class="tool-desc">Export comprehensive debug data for troubleshooting</p>
                
                <button class="tool-btn danger" @click="clearAllData">
                  🗑️ Clear All Data
                </button>
                <p class="tool-desc">Reset all stored data and settings (cannot be undone)</p>
              </div>
            </div>
            
            <div v-if="toolMessages.length > 0" class="tool-messages">
              <h4>🔧 Tool Output</h4>
              <div v-for="(message, index) in toolMessages" :key="index" class="tool-message">
                {{ message }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
const tabs = [
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

function updateSessionStats(stats: SessionStats) {
  console.log('🐛 DebugPane.updateSessionStats called with:', stats)
  sessionStats.value = stats
  
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
  console.log('🐛 DebugPane.logLlmCall called with:', interaction)
  llmInteractions.value.push({
    ...interaction,
    timestamp: new Date()
  })
  
  if (llmInteractions.value.length > maxInteractions) {
    llmInteractions.value = llmInteractions.value.slice(-maxInteractions)
  }
}

function addLangChainMetric(metric: LangChainMetrics) {
  console.log('🐛 DebugPane.addLangChainMetric called with:', metric)
  langchainMetrics.value.push(metric)
  
  if (langchainMetrics.value.length > maxMetrics) {
    langchainMetrics.value = langchainMetrics.value.slice(-maxMetrics)
  }
}

function setMemoryManager(manager: any) {
  memoryManager.value = manager
}

function addToolMessage(message: string) {
  toolMessages.value.push(`[${new Date().toLocaleTimeString()}] ${message}`)
  
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
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.debug-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}

.debug-tab.active {
  background: var(--color-accent);
  color: white;
}

.debug-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.tab-panel {
  height: 100%;
}

.warning-box {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.warning-box h4 {
  margin: 0 0 0.5rem 0;
  color: #ff9800;
}

.warning-box ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.warning-box li {
  padding: 0.25rem 0;
  color: #ffb74d;
}

.stats-grid {
  display: grid;
  gap: 1rem;
}

.stats-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--interface-panel-border);
  border-radius: 6px;
  padding: 1rem;
}

.stats-card h4 {
  margin: 0 0 1rem 0;
  color: var(--color-text-primary);
}

.subtitle {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.stats-card table {
  width: 100%;
  border-collapse: collapse;
}

.stats-card td {
  padding: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.stats-card td:first-child {
  color: var(--color-text-secondary);
}

.stats-card td:last-child {
  text-align: right;
  font-weight: bold;
  color: var(--color-text-primary);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

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
  color: var(--color-text-primary);
}

.interactions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.interaction-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--interface-panel-border);
  border-radius: 6px;
  padding: 1rem;
}

.interaction-item.latest {
  border-color: rgba(100, 181, 246, 0.5);
  background: rgba(100, 181, 246, 0.08);
}

.interaction-item.classifier {
  border-left: 4px solid #ff9800;
  background: rgba(255, 152, 0, 0.05);
}

.interaction-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.classifier-badge {
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
  padding: 0.1rem 0.5rem;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: bold;
}

.classifier-content, .full-interaction {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prompt, .response, .reasoning {
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.token-count {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-left: 0.5rem;
}

.tools-grid {
  display: grid;
  gap: 1.5rem;
}

.tool-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--interface-panel-border);
  border-radius: 6px;
  padding: 1rem;
}

.tool-section h4 {
  margin: 0 0 1rem 0;
  color: var(--color-text-primary);
}

.tool-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary);
  border: 1px solid var(--interface-panel-border);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  width: 100%;
  margin-bottom: 0.5rem;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(100, 181, 246, 0.5);
}

.tool-btn.danger:hover {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.6);
}

.tool-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  font-style: italic;
  line-height: 1.4;
}

.tool-messages {
  margin-top: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--interface-panel-border);
  border-radius: 6px;
  padding: 1rem;
}

.tool-messages h4 {
  margin: 0 0 1rem 0;
  color: var(--color-text-primary);
}

.tool-message {
  font-size: 0.85rem;
  margin: 0.5rem 0;
  color: var(--color-text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.25rem;
}

.tool-message:last-child {
  border-bottom: none;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--interface-panel-border);
  border-radius: 4px;
  padding: 0.75rem;
}

.metric-item.latest {
  border-color: rgba(100, 181, 246, 0.5);
}

.metric-item.error {
  border-left: 4px solid #f44336;
}

.metric-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.provider-badge {
  background: rgba(255, 193, 7, 0.2);
  color: #ffd54f;
  padding: 0.1rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
}

.status.success {
  color: #4caf50;
}

.status.error {
  color: #f44336;
}

.metric-details {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
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