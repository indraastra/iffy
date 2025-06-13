import { SessionStats } from '@/engine/metricsCollector';
import { MemorySessionStats } from '@/engine/memoryMetricsCollector';
import { LangChainMetrics } from '@/services/multiModelService';

interface LlmInteraction {
  timestamp: Date;
  prompt: { text: string; tokenCount: number };
  response: { narrative: string; signals?: any; tokenCount: number; importance?: number };
  context: { scene: string; memories: number; transitions: number };
}

export class DebugPane {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private currentTab: string = 'api';
  private sessionStats: SessionStats | null = null;
  private memoryStats: MemorySessionStats | null = null;
  private warnings: string[] = [];
  private memoryWarnings: string[] = [];
  private llmInteractions: LlmInteraction[] = [];
  private maxInteractions: number = 20; // Keep last 20 interactions
  private currentMemories: { content: string; importance: number }[] = [];
  private langchainMetrics: LangChainMetrics[] = [];
  private maxMetrics: number = 50; // Keep last 50 metrics
  private memoryManager: any = null; // Reference to memory manager for tools

  constructor() {
    this.container = this.createDebugPane();
    document.body.appendChild(this.container);
  }

  private createDebugPane(): HTMLElement {
    // Add CSS styles for LangChain metrics if not already added
    this.addLangChainStyles();
    
    const pane = document.createElement('div');
    pane.className = 'debug-pane hidden';
    pane.innerHTML = `
      <div class="debug-header">
        <h3>🐛 Debug Console</h3>
        <div class="debug-controls">
          <button class="debug-close-btn">×</button>
        </div>
      </div>
      <div class="debug-tabs">
        <button class="debug-tab active" data-tab="api">📊 Usage</button>
        <button class="debug-tab" data-tab="langchain">⚡ LangChain</button>
        <button class="debug-tab" data-tab="memory">🧠 Memory</button>
        <button class="debug-tab" data-tab="llm">🤖 Logs</button>
        <button class="debug-tab" data-tab="tools">🛠️ Tools</button>
      </div>
      <div class="debug-content">
        <div class="debug-tab-content active" data-tab="api">
          <div class="api-dashboard">
            <div class="api-warnings"></div>
            <div class="api-stats"></div>
          </div>
        </div>
        <div class="debug-tab-content" data-tab="langchain">
          <div class="langchain-dashboard">
            <div class="langchain-stats"></div>
            <div class="langchain-metrics"></div>
          </div>
        </div>
        <div class="debug-tab-content" data-tab="memory">
          <div class="memory-dashboard">
            <div class="memory-warnings"></div>
            <div class="memory-contents"></div>
          </div>
        </div>
        <div class="debug-tab-content" data-tab="llm">
          <div class="llm-dashboard">
            <div class="llm-interactions"></div>
          </div>
        </div>
        <div class="debug-tab-content" data-tab="tools">
          <div class="tools-dashboard">
            <div class="tool-section">
              <h4>🧠 Memory System</h4>
              <div class="tool-group">
                <button class="tool-btn" id="force-memory-compaction">🗜️ Force Memory Compaction</button>
                <p class="tool-description">Manually trigger memory compaction regardless of current memory count</p>
              </div>
            </div>
            
            <div class="tool-section">
              <h4>💾 Data Management</h4>
              <div class="tool-group">
                <button class="tool-btn" id="export-debug-logs">📄 Export Debug Logs</button>
                <p class="tool-description">Export comprehensive debug data for troubleshooting</p>
              </div>
              <div class="tool-group">
                <button class="tool-btn danger" id="clear-all-data">🗑️ Clear All Data</button>
                <p class="tool-description">Reset all stored data and settings (cannot be undone)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const tabs = pane.querySelectorAll('.debug-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab((tab as HTMLElement).dataset.tab!));
    });

    const closeBtn = pane.querySelector('.debug-close-btn') as HTMLElement;
    closeBtn.addEventListener('click', () => this.hide());

    // Add tool button event listeners
    this.attachToolsEvents(pane);

    return pane;
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public show(): void {
    this.container.classList.remove('hidden');
    this.isVisible = true;
    // Refresh current tab content
    if (this.currentTab === 'api') {
      this.updateApiDisplay();
    } else if (this.currentTab === 'langchain') {
      this.updateLangChainDisplay();
    } else if (this.currentTab === 'memory') {
      this.updateMemoryDisplay();
    } else if (this.currentTab === 'llm') {
      this.updateLlmDisplay();
    }
  }

  public hide(): void {
    this.container.classList.add('hidden');
    this.isVisible = false;
  }

  /**
   * Switch between debug pane tabs
   */
  private switchTab(tabName: string): void {
    this.currentTab = tabName;
    
    // Update tab buttons
    const tabs = this.container.querySelectorAll('.debug-tab');
    tabs.forEach(tab => {
      if ((tab as HTMLElement).dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Update tab content
    const contents = this.container.querySelectorAll('.debug-tab-content');
    contents.forEach(content => {
      if ((content as HTMLElement).dataset.tab === tabName) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
    
    // Refresh content for the active tab
    if (tabName === 'api') {
      this.updateApiDisplay();
    } else if (tabName === 'langchain') {
      this.updateLangChainDisplay();
    } else if (tabName === 'memory') {
      this.updateMemoryDisplay();
    } else if (tabName === 'llm') {
      this.updateLlmDisplay();
    }
  }

  /**
   * Update the API usage tab with combined metrics from story and memory calls
   */
  private updateApiDisplay(): void {
    const apiContainer = this.container.querySelector('.api-dashboard') as HTMLElement;
    if (!apiContainer) return;

    const warningsContainer = apiContainer.querySelector('.api-warnings') as HTMLElement;
    const statsContainer = apiContainer.querySelector('.api-stats') as HTMLElement;

    // Display warnings
    if (this.warnings.length > 0) {
      warningsContainer.innerHTML = `
        <div class="warnings-section">
          <h4>⚠️ Warnings</h4>
          <ul class="warning-list">
            ${this.warnings.map(warning => `<li>${this.escapeHtml(warning)}</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      warningsContainer.innerHTML = '';
    }

    // Display combined API usage stats
    if (this.sessionStats || this.memoryStats) {
      statsContainer.innerHTML = this.renderCombinedApiStats();
    } else {
      statsContainer.innerHTML = `
        <div class="no-data">
          <p>No API usage data available yet. Start playing to see session statistics.</p>
        </div>
      `;
    }
  }

  /**
   * Update the memory tab with current memory contents and warnings
   */
  private updateMemoryDisplay(): void {
    const memoryContainer = this.container.querySelector('.memory-dashboard') as HTMLElement;
    if (!memoryContainer) return;

    const warningsContainer = memoryContainer.querySelector('.memory-warnings') as HTMLElement;
    const contentsContainer = memoryContainer.querySelector('.memory-contents') as HTMLElement;

    // Display memory warnings
    if (this.memoryWarnings.length > 0) {
      warningsContainer.innerHTML = `
        <div class="warnings-section">
          <h4>⚠️ Memory System Warnings</h4>
          <ul class="warning-list">
            ${this.memoryWarnings.map(warning => `<li>${this.escapeHtml(warning)}</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      warningsContainer.innerHTML = '';
    }

    // Display memory contents if available
    const memories = this.getCurrentMemories();
    if (memories && memories.length > 0) {
      contentsContainer.innerHTML = this.renderMemoryContents();
    } else {
      contentsContainer.innerHTML = `
        <div class="no-data">
          <p>No memories stored yet. Memory contents will appear here once interactions begin.</p>
        </div>
      `;
    }
  }


  /**
   * Render combined API usage statistics from both story and memory calls
   */
  private renderCombinedApiStats(): string {
    const storyStats = this.sessionStats;
    const memStats = this.memoryStats;

    const totalCalls = (storyStats?.totalCalls || 0) + (memStats?.totalCalls || 0);
    const totalInputTokens = (storyStats?.totalInputTokens || 0) + (memStats?.totalInputTokens || 0);
    const totalOutputTokens = (storyStats?.totalOutputTokens || 0) + (memStats?.totalOutputTokens || 0);
    const totalCost = (storyStats?.totalCost || 0) + (memStats?.totalCost || 0);

    return `
      <div class="stats-section">
        <h4>📊 Combined API Usage</h4>
        <table class="stats-table">
          <tr><td>Total API Calls</td><td>${totalCalls}</td></tr>
          <tr><td>Story Calls</td><td>${storyStats?.totalCalls || 0}</td></tr>
          <tr><td>Memory Calls</td><td>${memStats?.totalCalls || 0}</td></tr>
          <tr><td>Total Input Tokens</td><td>${totalInputTokens.toLocaleString()}</td></tr>
          <tr><td>Total Output Tokens</td><td>${totalOutputTokens.toLocaleString()}</td></tr>
          <tr><td>Total Session Cost</td><td>$${totalCost.toFixed(4)}</td></tr>
        </table>
      </div>
      
      ${storyStats ? `
      <div class="stats-section">
        <h4>🎮 Story API Stats</h4>
        <table class="stats-table">
          <tr><td>Success Rate</td><td>${(storyStats.successfulCalls / Math.max(1, storyStats.totalCalls) * 100).toFixed(1)}%</td></tr>
          <tr><td>Average Latency</td><td>${Math.round(storyStats.avgLatency)}ms</td></tr>
          <tr><td>Avg Input Tokens</td><td>${Math.round(storyStats.avgInputTokens)}</td></tr>
          <tr><td>Avg Output Tokens</td><td>${Math.round(storyStats.avgOutputTokens)}</td></tr>
        </table>
      </div>
      ` : ''}
      
      ${memStats ? `
      <div class="stats-section">
        <h4>🧠 Memory API Stats</h4>
        <table class="stats-table">
          <tr><td>Success Rate</td><td>${(memStats.successfulCalls / Math.max(1, memStats.totalCalls) * 100).toFixed(1)}%</td></tr>
          <tr><td>Average Latency</td><td>${Math.round(memStats.avgLatency)}ms</td></tr>
          <tr><td>Compaction Calls</td><td>${memStats.compactionCalls}</td></tr>
          <tr><td>Avg Compression</td><td>${(memStats.avgCompressionRatio * 100).toFixed(1)}%</td></tr>
        </table>
      </div>
      ` : ''}
    `;
  }

  /**
   * Render current memory contents
   */
  private renderMemoryContents(): string {
    const memories = this.getCurrentMemories();
    return `
      <div class="stats-section">
        <h4>🧠 Current Memory Contents</h4>
        <p class="memory-count">Showing ${memories.length} memories</p>
        <div class="memory-list">
          ${memories.map((memory, index) => `
            <div class="memory-item">
              <span class="memory-index">#${index + 1}</span>
              <span class="memory-importance">${memory.importance}/10</span>
              <span class="memory-content">${this.escapeHtml(memory.content)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Update session statistics from metrics collector
   */
  public updateSessionStats(stats: SessionStats): void {
    this.sessionStats = stats;
    
    // Update warnings based on stats
    this.warnings = [];
    
    if (stats.failedCalls > 0) {
      this.warnings.push(`🔴 ${stats.failedCalls} failed LLM calls this session`);
    }
    
    if (stats.totalCost > 1.0) {
      this.warnings.push(`💰 Session costs above $1.00 ($${stats.totalCost.toFixed(2)})`);
    }
    
    if (stats.avgLatency > 5000) {
      this.warnings.push(`⚠️ Average response time above 5 seconds (${Math.round(stats.avgLatency)}ms)`);
    }
    
    // Update display if API tab is active
    if (this.currentTab === 'api') {
      this.updateApiDisplay();
    }
  }

  /**
   * Update memory statistics from memory metrics collector
   */
  public updateMemoryStats(stats: MemorySessionStats, warnings: string[]): void {
    this.memoryStats = stats;
    this.memoryWarnings = warnings;
    
    // Update display if memory tab is active
    if (this.currentTab === 'memory') {
      this.updateMemoryDisplay();
    }
  }

  /**
   * Update the LLM tab with interaction history
   */
  private updateLlmDisplay(): void {
    const llmContainer = this.container.querySelector('.llm-dashboard') as HTMLElement;
    if (!llmContainer) return;

    const interactionsContainer = llmContainer.querySelector('.llm-interactions') as HTMLElement;

    if (this.llmInteractions.length === 0) {
      interactionsContainer.innerHTML = `
        <div class="no-data">
          <p>No LLM interactions yet. Player actions and LLM responses will appear here.</p>
        </div>
      `;
      return;
    }

    // Render interactions in reverse chronological order
    const interactionsHtml = this.llmInteractions
      .slice()
      .reverse()
      .map((interaction, index) => `
        <div class="llm-interaction ${index === 0 ? 'latest' : ''}">
          <div class="interaction-header">
            <span class="interaction-time">${interaction.timestamp.toLocaleTimeString()}</span>
            <span class="interaction-scene">📍 ${this.escapeHtml(interaction.context.scene)}</span>
            <span class="interaction-context">🧠 ${interaction.context.memories} memories | 🔀 ${interaction.context.transitions} transitions</span>
          </div>
          
          <div class="interaction-prompt">
            <strong>Player Input:</strong> ${this.escapeHtml(interaction.prompt.text)}
            <span class="token-count">(~${interaction.prompt.tokenCount} tokens)</span>
          </div>
          
          <div class="interaction-response">
            <strong>LLM Response:</strong> ${this.escapeHtml(interaction.response.narrative)}
            <span class="token-count">(~${interaction.response.tokenCount} tokens)</span>
            ${interaction.response.importance ? `<span class="importance-score">Importance: ${interaction.response.importance}/10</span>` : ''}
          </div>
          
          ${interaction.response.signals ? `
            <div class="interaction-signals">
              <strong>Signals:</strong>
              <pre>${JSON.stringify(interaction.response.signals, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
      `)
      .join('');

    interactionsContainer.innerHTML = `
      <div class="stats-section">
        <h4>🤖 LLM Interaction History</h4>
        <p class="interaction-count">Showing last ${this.llmInteractions.length} interactions</p>
        ${interactionsHtml}
      </div>
    `;
  }

  /**
   * Update current memory contents (backward compatibility)
   */
  public updateMemoryContents(memories: { content: string; importance: number }[]): void {
    this.currentMemories = [...memories];
    
    // Update display if memory tab is active
    if (this.currentTab === 'memory' && this.isVisible) {
      this.updateMemoryDisplay();
    }
  }

  /**
   * Get current memories from memory manager if available
   */
  private getCurrentMemories(): { content: string; importance: number }[] {
    if (this.memoryManager?.getAllMemories) {
      return this.memoryManager.getAllMemories().map((m: any) => ({ 
        content: m.content, 
        importance: m.importance 
      }));
    }
    return this.currentMemories;
  }

  /**
   * Update the LangChain metrics tab
   */
  private updateLangChainDisplay(): void {
    const langchainContainer = this.container.querySelector('.langchain-dashboard') as HTMLElement;
    if (!langchainContainer) return;

    const statsContainer = langchainContainer.querySelector('.langchain-stats') as HTMLElement;
    const metricsContainer = langchainContainer.querySelector('.langchain-metrics') as HTMLElement;

    if (this.langchainMetrics.length === 0) {
      statsContainer.innerHTML = `
        <div class="no-data">
          <p>No LangChain metrics available yet. Metrics will appear here once API calls begin.</p>
        </div>
      `;
      metricsContainer.innerHTML = '';
      return;
    }

    // Render overall stats
    statsContainer.innerHTML = this.renderLangChainStats();
    
    // Render recent metrics
    metricsContainer.innerHTML = this.renderLangChainMetrics();
  }

  /**
   * Render LangChain statistics
   */
  private renderLangChainStats(): string {
    if (this.langchainMetrics.length === 0) return '';

    const successful = this.langchainMetrics.filter(m => m.success).length;
    const failed = this.langchainMetrics.length - successful;
    const successRate = (successful / this.langchainMetrics.length) * 100;

    const avgLatency = this.langchainMetrics.reduce((sum, m) => sum + m.latencyMs, 0) / this.langchainMetrics.length;
    const totalTokens = this.langchainMetrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const avgTokens = totalTokens / this.langchainMetrics.length;

    // Provider breakdown
    const providerStats = this.langchainMetrics.reduce((acc, m) => {
      if (!acc[m.provider]) {
        acc[m.provider] = { count: 0, totalTokens: 0, totalLatency: 0 };
      }
      acc[m.provider].count++;
      acc[m.provider].totalTokens += m.totalTokens;
      acc[m.provider].totalLatency += m.latencyMs;
      return acc;
    }, {} as Record<string, { count: number; totalTokens: number; totalLatency: number }>);

    const providerBreakdown = Object.entries(providerStats)
      .map(([provider, stats]) => `
        <tr>
          <td>${provider.charAt(0).toUpperCase() + provider.slice(1)}</td>
          <td>${stats.count}</td>
          <td>${Math.round(stats.totalLatency / stats.count)}ms</td>
          <td>${Math.round(stats.totalTokens / stats.count)}</td>
        </tr>
      `).join('');

    return `
      <div class="stats-section">
        <h4>⚡ LangChain Performance</h4>
        <table class="stats-table">
          <tr><td>Total Requests</td><td>${this.langchainMetrics.length}</td></tr>
          <tr><td>Success Rate</td><td>${successRate.toFixed(1)}%</td></tr>
          <tr><td>Failed Requests</td><td>${failed}</td></tr>
          <tr><td>Average Latency</td><td>${Math.round(avgLatency)}ms</td></tr>
          <tr><td>Average Tokens</td><td>${Math.round(avgTokens).toLocaleString()}</td></tr>
          <tr><td>Total Tokens</td><td>${totalTokens.toLocaleString()}</td></tr>
        </table>
      </div>
      
      <div class="stats-section">
        <h4>📊 Provider Breakdown</h4>
        <table class="stats-table">
          <tr><th>Provider</th><th>Requests</th><th>Avg Latency</th><th>Avg Tokens</th></tr>
          ${providerBreakdown}
        </table>
      </div>
    `;
  }

  /**
   * Render recent LangChain metrics
   */
  private renderLangChainMetrics(): string {
    const recentMetrics = this.langchainMetrics.slice(-10).reverse();
    
    const metricsHtml = recentMetrics.map((metric, index) => `
      <div class="langchain-metric ${index === 0 ? 'latest' : ''} ${metric.success ? 'success' : 'error'}">
        <div class="metric-header">
          <span class="metric-time">${metric.timestamp.toLocaleTimeString()}</span>
          <span class="metric-provider">${metric.provider}</span>
          <span class="metric-model">${metric.model}</span>
          <span class="metric-status ${metric.success ? 'success' : 'error'}">${metric.success ? '✅' : '❌'}</span>
        </div>
        
        <div class="metric-details">
          <div class="metric-tokens">
            <span>📝 ${metric.promptTokens} → 💭 ${metric.completionTokens} (${metric.totalTokens} total)</span>
          </div>
          <div class="metric-timing">
            <span>⏱️ ${Math.round(metric.latencyMs)}ms</span>
          </div>
          ${metric.errorType ? `
            <div class="metric-error">
              <span>❌ ${this.escapeHtml(metric.errorType)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');

    return `
      <div class="stats-section">
        <h4>📈 Recent LangChain Requests</h4>
        <p class="metrics-count">Showing last ${recentMetrics.length} requests</p>
        <div class="langchain-metrics-list">
          ${metricsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Add a LangChain metrics entry
   */
  public addLangChainMetric(metric: LangChainMetrics): void {
    this.langchainMetrics.push(metric);
    
    // Keep only the last N metrics
    if (this.langchainMetrics.length > this.maxMetrics) {
      this.langchainMetrics = this.langchainMetrics.slice(-this.maxMetrics);
    }

    // Update display if LangChain tab is active
    if (this.currentTab === 'langchain' && this.isVisible) {
      this.updateLangChainDisplay();
    }
  }

  /**
   * Log an LLM interaction
   */
  public logLlmCall(interaction: Omit<LlmInteraction, 'timestamp'>): void {
    // Add timestamp and store interaction
    this.llmInteractions.push({
      ...interaction,
      timestamp: new Date()
    });

    // Keep only the last N interactions
    if (this.llmInteractions.length > this.maxInteractions) {
      this.llmInteractions = this.llmInteractions.slice(-this.maxInteractions);
    }

    // Update display if LLM tab is active
    if (this.currentTab === 'llm' && this.isVisible) {
      this.updateLlmDisplay();
    }
  }

  /**
   * Add LangChain-specific CSS styles
   */
  private addLangChainStyles(): void {
    if (document.getElementById('langchain-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'langchain-styles';
    style.textContent = `
      .langchain-metric {
        margin: 1rem 0;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        transition: all 0.2s ease;
      }
      
      .langchain-metric.latest {
        border-color: rgba(100, 181, 246, 0.5);
        background: rgba(100, 181, 246, 0.05);
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
        color: var(--text-color);
        opacity: 0.7;
        font-style: italic;
      }
      
      .stats-table th {
        background: rgba(255, 255, 255, 0.1);
        font-weight: bold;
        text-align: left;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid var(--border-color);
      }
      
      /* Tools pane styling - TODO: redesign this entire section */
      .tool-section {
        margin: 1rem 0;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border-color);
        border-radius: 6px;
      }
      
      .tool-section h4 {
        margin: 0 0 1rem 0;
      }
      
      .tool-btn {
        background: rgba(255, 255, 255, 0.02);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        padding: 0.75rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        width: 100%;
        margin-bottom: 0.75rem;
        box-sizing: border-box;
      }
      
      .tool-btn:hover {
        background: rgba(255, 255, 255, 0.05);
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
      
      /* Custom scrollbar styling for debug pane */
      .debug-pane ::-webkit-scrollbar {
        width: 8px;
      }
      
      .debug-pane ::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      
      .debug-pane ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }
      
      .debug-pane ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
      
      /* Firefox scrollbar styling */
      .debug-pane {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set memory manager reference for debug tools
   */
  public setMemoryManager(memoryManager: any): void {
    this.memoryManager = memoryManager;
  }

  /**
   * Attach event listeners for debug tools
   */
  private attachToolsEvents(pane: HTMLElement): void {
    const forceCompactionBtn = pane.querySelector('#force-memory-compaction');
    const exportLogsBtn = pane.querySelector('#export-debug-logs');
    const clearDataBtn = pane.querySelector('#clear-all-data');

    // Force memory compaction
    forceCompactionBtn?.addEventListener('click', () => {
      if (this.memoryManager) {
        try {
          // Force compaction by triggering it directly
          this.memoryManager.triggerAsyncCompaction?.();
          this.addToolMessage('🗜️ Memory compaction triggered manually');
        } catch (error) {
          this.addToolMessage(`❌ Error triggering compaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        this.addToolMessage('❌ Memory manager not available');
      }
    });

    // Export debug logs
    exportLogsBtn?.addEventListener('click', () => {
      this.exportDebugLogs();
    });

    // Clear all data
    clearDataBtn?.addEventListener('click', () => {
      if (confirm('Clear all saved games, settings, and memories? This cannot be undone.')) {
        try {
          localStorage.clear();
          if (this.memoryManager) {
            this.memoryManager.reset?.();
          }
          this.addToolMessage('🗑️ All data cleared successfully');
          // Refresh the page to reinitialize
          setTimeout(() => location.reload(), 1000);
        } catch (error) {
          this.addToolMessage(`❌ Error clearing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });
  }

  /**
   * Add a message to the tools section
   */
  private addToolMessage(message: string): void {
    const toolsSection = this.container.querySelector('.tools-dashboard');
    if (!toolsSection) return;

    // Create or find the messages container
    let messagesContainer = toolsSection.querySelector('.tool-messages') as HTMLElement;
    if (!messagesContainer) {
      messagesContainer = document.createElement('div');
      messagesContainer.className = 'tool-messages';
      toolsSection.appendChild(messagesContainer);
    }

    // Add the message
    const messageEl = document.createElement('div');
    messageEl.className = 'tool-message';
    messageEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    messagesContainer.appendChild(messageEl);

    // Keep only last 5 messages
    const messages = messagesContainer.querySelectorAll('.tool-message');
    if (messages.length > 5) {
      messages[0].remove();
    }

    // Auto-scroll to show new message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Export debug logs to file
   */
  private exportDebugLogs(): void {
    const logs = {
      timestamp: new Date().toISOString(),
      sessionStats: this.sessionStats,
      memoryStats: this.memoryStats,
      warnings: this.warnings,
      memoryWarnings: this.memoryWarnings,
      langchainMetrics: this.langchainMetrics.slice(-20), // Last 20 metrics
      llmInteractions: this.llmInteractions.slice(-10), // Last 10 interactions
      currentMemories: this.currentMemories,
      memoryManagerStats: this.memoryManager?.getStats?.() || null
    };

    const jsonString = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `iffy-debug-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.addToolMessage('📄 Debug logs exported successfully');
  }
}