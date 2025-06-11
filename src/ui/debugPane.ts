import { SessionStats } from '@/engine/metricsCollector';
import { MemorySessionStats } from '@/engine/memoryMetricsCollector';

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

  constructor() {
    this.container = this.createDebugPane();
    document.body.appendChild(this.container);
  }

  private createDebugPane(): HTMLElement {
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
        <button class="debug-tab active" data-tab="api">📊 API Usage</button>
        <button class="debug-tab" data-tab="memory">🧠 Memory</button>
        <button class="debug-tab" data-tab="llm">🤖 LLM Logs</button>
      </div>
      <div class="debug-content">
        <div class="debug-tab-content active" data-tab="api">
          <div class="api-dashboard">
            <div class="api-warnings"></div>
            <div class="api-stats"></div>
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
      </div>
    `;

    // Add event listeners
    const tabs = pane.querySelectorAll('.debug-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab((tab as HTMLElement).dataset.tab!));
    });

    const closeBtn = pane.querySelector('.debug-close-btn') as HTMLElement;
    closeBtn.addEventListener('click', () => this.hide());

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
    if (this.currentMemories && this.currentMemories.length > 0) {
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
    return `
      <div class="stats-section">
        <h4>🧠 Current Memory Contents</h4>
        <p class="memory-count">Showing ${this.currentMemories.length} memories</p>
        <div class="memory-list">
          ${this.currentMemories.map((memory, index) => `
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
   * Update current memory contents
   */
  public updateMemoryContents(memories: { content: string; importance: number }[]): void {
    this.currentMemories = [...memories];
    
    // Update display if memory tab is active
    if (this.currentTab === 'memory' && this.isVisible) {
      this.updateMemoryDisplay();
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
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}