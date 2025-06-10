import { SessionStats } from '@/engine/metricsCollector';
import { MemorySessionStats } from '@/engine/memoryMetricsCollector';

export class DebugPane {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private currentTab: string = 'metrics';
  private sessionStats: SessionStats | null = null;
  private memoryStats: MemorySessionStats | null = null;
  private warnings: string[] = [];
  private memoryWarnings: string[] = [];

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
        <button class="debug-tab active" data-tab="metrics">📊 Metrics</button>
        <button class="debug-tab" data-tab="memory">🧠 Memory</button>
      </div>
      <div class="debug-content">
        <div class="debug-tab-content active" data-tab="metrics">
          <div class="metrics-dashboard">
            <div class="metrics-warnings"></div>
            <div class="metrics-stats"></div>
          </div>
        </div>
        <div class="debug-tab-content" data-tab="memory">
          <div class="memory-dashboard">
            <div class="memory-warnings"></div>
            <div class="memory-stats"></div>
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
    if (this.currentTab === 'metrics') {
      this.updateMetricsDisplay();
    } else if (this.currentTab === 'memory') {
      this.updateMemoryDisplay();
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
    if (tabName === 'metrics') {
      this.updateMetricsDisplay();
    } else if (tabName === 'memory') {
      this.updateMemoryDisplay();
    }
  }

  /**
   * Update the metrics tab with current session statistics
   */
  private updateMetricsDisplay(): void {
    const metricsContainer = this.container.querySelector('.metrics-dashboard') as HTMLElement;
    if (!metricsContainer) return;

    const warningsContainer = metricsContainer.querySelector('.metrics-warnings') as HTMLElement;
    const statsContainer = metricsContainer.querySelector('.metrics-stats') as HTMLElement;

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

    // Display session stats if available
    if (this.sessionStats) {
      statsContainer.innerHTML = this.renderSessionStatsTable(this.sessionStats);
    } else {
      statsContainer.innerHTML = `
        <div class="no-data">
          <p>No metrics data available yet. Start playing to see session statistics.</p>
        </div>
      `;
    }
  }

  /**
   * Update the memory tab with current memory statistics
   */
  private updateMemoryDisplay(): void {
    const memoryContainer = this.container.querySelector('.memory-dashboard') as HTMLElement;
    if (!memoryContainer) return;

    const warningsContainer = memoryContainer.querySelector('.memory-warnings') as HTMLElement;
    const statsContainer = memoryContainer.querySelector('.memory-stats') as HTMLElement;

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

    // Display memory stats if available
    if (this.memoryStats) {
      statsContainer.innerHTML = this.renderMemoryStatsTable(this.memoryStats);
    } else {
      statsContainer.innerHTML = `
        <div class="no-data">
          <p>No memory metrics available yet. Memory operations will appear here once they begin.</p>
        </div>
      `;
    }
  }

  /**
   * Render session statistics as a table
   */
  private renderSessionStatsTable(stats: SessionStats): string {
    return `
      <div class="stats-section">
        <h4>📊 Session Statistics</h4>
        <table class="stats-table">
          <tr><td>Total LLM Calls</td><td>${stats.totalCalls}</td></tr>
          <tr><td>Successful Calls</td><td>${stats.successfulCalls}</td></tr>
          <tr><td>Failed Calls</td><td>${stats.failedCalls}</td></tr>
          <tr><td>Success Rate</td><td>${(stats.successfulCalls / Math.max(1, stats.totalCalls) * 100).toFixed(1)}%</td></tr>
        </table>
      </div>
      
      <div class="stats-section">
        <h4>🎮 Usage Statistics</h4>
        <table class="stats-table">
          <tr><td>Average Input Tokens</td><td>${Math.round(stats.avgInputTokens)}</td></tr>
          <tr><td>Average Output Tokens</td><td>${Math.round(stats.avgOutputTokens)}</td></tr>
          <tr><td>Total Input Tokens</td><td>${stats.totalInputTokens.toLocaleString()}</td></tr>
          <tr><td>Total Output Tokens</td><td>${stats.totalOutputTokens.toLocaleString()}</td></tr>
          <tr><td>Average Latency</td><td>${Math.round(stats.avgLatency)}ms</td></tr>
        </table>
      </div>
      
      <div class="stats-section">
        <h4>💰 Cost Analysis</h4>
        <table class="stats-table">
          <tr><td>Total Session Cost</td><td>$${stats.totalCost.toFixed(4)}</td></tr>
          <tr><td>Average Cost per Call</td><td>$${(stats.totalCost / Math.max(1, stats.totalCalls)).toFixed(4)}</td></tr>
          <tr><td>Input Cost</td><td>$${(stats.totalInputTokens / 1000 * 0.015).toFixed(4)}</td></tr>
          <tr><td>Output Cost</td><td>$${(stats.totalOutputTokens / 1000 * 0.075).toFixed(4)}</td></tr>
        </table>
      </div>
      
      <div class="stats-section">
        <h4>⏱️ Performance</h4>
        <table class="stats-table">
          <tr><td>Session Start</td><td>${stats.sessionStartTime.toLocaleTimeString()}</td></tr>
          <tr><td>Last Call</td><td>${stats.lastCallTime ? stats.lastCallTime.toLocaleTimeString() : 'None'}</td></tr>
          <tr><td>Fastest Response</td><td>${stats.fastestResponse}ms</td></tr>
          <tr><td>Slowest Response</td><td>${stats.slowestResponse}ms</td></tr>
        </table>
      </div>
    `;
  }

  /**
   * Render memory statistics as a table
   */
  private renderMemoryStatsTable(stats: MemorySessionStats): string {
    return `
      <div class="stats-section">
        <h4>🧠 Memory Operations</h4>
        <table class="stats-table">
          <tr><td>Total Operations</td><td>${stats.totalCalls}</td></tr>
          <tr><td>Compaction Operations</td><td>${stats.compactionCalls}</td></tr>
          <tr><td>Extraction Operations</td><td>${stats.extractionCalls}</td></tr>
          <tr><td>Success Rate</td><td>${(stats.successfulCalls / Math.max(1, stats.totalCalls) * 100).toFixed(1)}%</td></tr>
        </table>
      </div>
      
      <div class="stats-section">
        <h4>🗜️ Compression Analysis</h4>
        <table class="stats-table">
          <tr><td>Average Compression</td><td>${(stats.avgCompressionRatio * 100).toFixed(1)}%</td></tr>
          <tr><td>Total Memories Compacted</td><td>${stats.totalMemoriesCompacted}</td></tr>
          <tr><td>Last Compaction</td><td>${stats.lastCompactionTime ? stats.lastCompactionTime.toLocaleTimeString() : 'None'}</td></tr>
        </table>
      </div>
      
      <div class="stats-section">
        <h4>📈 Token Usage</h4>
        <table class="stats-table">
          <tr><td>Average Input Tokens</td><td>${Math.round(stats.avgInputTokens)}</td></tr>
          <tr><td>Average Output Tokens</td><td>${Math.round(stats.avgOutputTokens)}</td></tr>
          <tr><td>Total Input Tokens</td><td>${stats.totalInputTokens.toLocaleString()}</td></tr>
          <tr><td>Total Output Tokens</td><td>${stats.totalOutputTokens.toLocaleString()}</td></tr>
          <tr><td>Average Latency</td><td>${Math.round(stats.avgLatency)}ms</td></tr>
        </table>
      </div>
      
      <div class="stats-section">
        <h4>💰 Memory System Costs</h4>
        <table class="stats-table">
          <tr><td>Total Cost</td><td>$${stats.totalCost.toFixed(4)}</td></tr>
          <tr><td>Average per Operation</td><td>$${(stats.totalCost / Math.max(1, stats.totalCalls)).toFixed(4)}</td></tr>
          <tr><td>Input Cost (Haiku)</td><td>$${(stats.totalInputTokens / 1000 * 0.0025).toFixed(4)}</td></tr>
          <tr><td>Output Cost (Haiku)</td><td>$${(stats.totalOutputTokens / 1000 * 0.0125).toFixed(4)}</td></tr>
        </table>
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
    
    // Update display if metrics tab is active
    if (this.currentTab === 'metrics') {
      this.updateMetricsDisplay();
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
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}