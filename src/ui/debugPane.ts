import { RichTextParser } from '@/utils/richTextParser';

// Structured debug data interfaces
export interface DebugGameState {
  location: string;
  inventory: string[];
  flags: string[];
  currentFlow?: string;
}

export interface DebugMemoryStats {
  recentInteractions: number;
  significantMemories: number;
  isProcessing: boolean;
  extractionInterval?: number;
  interactionsSinceLastExtraction?: number;
}

export interface DebugLlmCall {
  prompt: {
    sections: Record<string, string>;
    tokenCount?: number;
  };
  response: {
    raw: string;
    parsed?: any;
    tokenCount?: number;
  };
  gameState: DebugGameState;
  memoryStats: DebugMemoryStats;
  potentialChanges?: {
    transitions: any[];
    endings: any[];
  };
}

export interface DebugMemoryOperation {
  operation: string;
  stats: DebugMemoryStats;
  interaction?: {
    playerInput: string;
    llmResponse: string;
    importance: string;
  };
  details?: any;
}

export interface DebugValidationIssue {
  input: string;
  issues: string[];
  gameState: DebugGameState;
  retryAttempt?: number;
}

export interface DebugGameStateChange {
  change: string;
  before: any;
  after: any;
  reason: string;
  gameState: DebugGameState;
}

// Legacy interface for backward compatibility
export interface DebugData {
  prompt?: string;
  response?: string;
  timestamp: Date;
  type: 'request' | 'response' | 'error' | 'validation' | 'memory' | 'retry' | 'llm_call' | 'memory_operation' | 'game_state_change';
  metadata?: {
    validationIssues?: string[];
    originalInput?: string;
    conversationMemory?: any;
    importance?: string;
    structured?: DebugLlmCall | DebugMemoryOperation | DebugValidationIssue | DebugGameStateChange;
  };
}

export class DebugPane {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private debugLog: DebugData[] = [];
  private richTextParser: RichTextParser;

  constructor() {
    this.richTextParser = new RichTextParser();
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
          <button class="debug-top-btn">⬆️ Top</button>
          <button class="debug-bottom-btn">⬇️ Bottom</button>
          <button class="debug-clear-btn">Clear</button>
          <button class="debug-close-btn">×</button>
        </div>
      </div>
      <div class="debug-content">
        <div class="debug-log"></div>
      </div>
    `;

    // Add event listeners
    const topBtn = pane.querySelector('.debug-top-btn') as HTMLElement;
    const bottomBtn = pane.querySelector('.debug-bottom-btn') as HTMLElement;
    const clearBtn = pane.querySelector('.debug-clear-btn') as HTMLElement;
    const closeBtn = pane.querySelector('.debug-close-btn') as HTMLElement;
    
    topBtn.addEventListener('click', () => this.scrollToTop());
    bottomBtn.addEventListener('click', () => this.scrollToBottom());
    clearBtn.addEventListener('click', () => this.clear());
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
  }

  public hide(): void {
    this.container.classList.add('hidden');
    this.isVisible = false;
  }

  public logRequest(prompt: string): void {
    const data: DebugData = {
      prompt,
      timestamp: new Date(),
      type: 'request'
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  public logResponse(response: string): void {
    const data: DebugData = {
      response,
      timestamp: new Date(),
      type: 'response'
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  public logError(error: string): void {
    const data: DebugData = {
      response: error,
      timestamp: new Date(),
      type: 'error'
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  public logValidation(issues: string[], originalInput: string): void {
    const data: DebugData = {
      timestamp: new Date(),
      type: 'validation',
      metadata: {
        validationIssues: issues,
        originalInput
      }
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  public logMemory(conversationMemory: any, importance: string): void {
    const data: DebugData = {
      timestamp: new Date(),
      type: 'memory',
      metadata: {
        conversationMemory,
        importance
      }
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  public logRetry(originalInput: string, reason: string): void {
    const data: DebugData = {
      response: reason,
      timestamp: new Date(),
      type: 'retry',
      metadata: {
        originalInput
      }
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  // New structured debug methods
  public logLlmCall(llmData: DebugLlmCall): void {
    const data: DebugData = {
      timestamp: new Date(),
      type: 'llm_call',
      metadata: {
        structured: llmData
      }
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  public logMemoryOperation(memoryData: DebugMemoryOperation): void {
    const data: DebugData = {
      timestamp: new Date(),
      type: 'memory_operation',
      metadata: {
        structured: memoryData
      }
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  public logValidationIssue(validationData: DebugValidationIssue): void {
    const data: DebugData = {
      timestamp: new Date(),
      type: 'validation',
      metadata: {
        structured: validationData,
        validationIssues: validationData.issues,
        originalInput: validationData.input
      }
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  public logGameStateChange(stateData: DebugGameStateChange): void {
    const data: DebugData = {
      timestamp: new Date(),
      type: 'game_state_change',
      metadata: {
        structured: stateData
      }
    };
    this.debugLog.push(data);
    this.renderLogEntry(data);
  }

  private renderLogEntry(data: DebugData): void {
    const logContainer = this.container.querySelector('.debug-log') as HTMLElement;
    const entry = document.createElement('div');
    entry.className = `debug-entry debug-${data.type}`;
    
    const timestamp = data.timestamp.toLocaleTimeString();
    
    if (data.type === 'request' && data.prompt) {
      entry.innerHTML = `
        <div class="debug-timestamp">[${timestamp}] REQUEST</div>
        <div class="debug-content-section">
          ${this.formatPrompt(data.prompt)}
        </div>
      `;
    } else if (data.type === 'response' && data.response) {
      entry.innerHTML = `
        <div class="debug-timestamp">[${timestamp}] RESPONSE</div>
        <div class="debug-content-section">
          ${this.formatResponse(data.response)}
        </div>
      `;
    } else if (data.type === 'error' && data.response) {
      entry.innerHTML = `
        <div class="debug-timestamp">[${timestamp}] ERROR</div>
        <div class="debug-content-section debug-error-content">
          <pre>${this.escapeHtml(data.response)}</pre>
        </div>
      `;
    } else if (data.type === 'validation' && data.metadata?.validationIssues) {
      entry.innerHTML = `
        <div class="debug-timestamp">[${timestamp}] ⚠️ VALIDATION FAILED</div>
        <div class="debug-content-section debug-validation-content">
          <div class="debug-subsection">
            <strong>Original Input:</strong> "${this.escapeHtml(data.metadata.originalInput || '')}"
          </div>
          <div class="debug-subsection">
            <strong>Issues Found:</strong>
            <ul class="validation-issues">
              ${data.metadata.validationIssues.map(issue => `<li>${this.escapeHtml(issue)}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    } else if (data.type === 'memory' && data.metadata?.conversationMemory) {
      const memory = data.metadata.conversationMemory;
      const recentCount = memory.immediateContext?.recentInteractions?.length || 0;
      const significantCount = memory.significantMemories?.length || 0;
      
      entry.innerHTML = `
        <div class="debug-timestamp">[${timestamp}] 💭 MEMORY TRACKED (${data.metadata.importance})</div>
        <div class="debug-content-section debug-memory-content">
          <div class="debug-subsection">
            <strong>Recent Interactions:</strong> ${recentCount} stored
            ${recentCount > 0 ? `
              <div class="memory-interactions">
                ${memory.immediateContext.recentInteractions.slice(-3).map((interaction: any) => `
                  <div class="memory-interaction">
                    <span class="memory-importance">[${interaction.importance}]</span>
                    <span class="memory-input">Player: "${this.escapeHtml(interaction.playerInput)}"</span>
                    <span class="memory-response">Response: "${this.escapeHtml(interaction.llmResponse.substring(0, 60))}..."</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="debug-subsection">
            <strong>Significant Memories:</strong> ${significantCount} stored
          </div>
        </div>
      `;
    } else if (data.type === 'retry') {
      entry.innerHTML = `
        <div class="debug-timestamp">[${timestamp}] 🔄 RETRY INITIATED</div>
        <div class="debug-content-section debug-retry-content">
          <div class="debug-subsection">
            <strong>Original Input:</strong> "${this.escapeHtml(data.metadata?.originalInput || '')}"
          </div>
          <div class="debug-subsection">
            <strong>Retry Reason:</strong> ${this.escapeHtml(data.response || '')}
          </div>
        </div>
      `;
    } else if (data.type === 'llm_call' && data.metadata?.structured) {
      entry.innerHTML = this.renderLlmCall(timestamp, data.metadata.structured as DebugLlmCall);
    } else if (data.type === 'memory_operation' && data.metadata?.structured) {
      entry.innerHTML = this.renderMemoryOperation(timestamp, data.metadata.structured as DebugMemoryOperation);
    } else if (data.type === 'game_state_change' && data.metadata?.structured) {
      entry.innerHTML = this.renderGameStateChange(timestamp, data.metadata.structured as DebugGameStateChange);
    }

    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  private formatPrompt(prompt: string): string {
    // Parse and colorize different sections of the compact prompt
    // Order matters - more specific patterns first to avoid overlap
    const sections = [
      { pattern: /STORY:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-story-context', label: 'Story' },
      { pattern: /STATE:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-game-state', label: 'State' },
      { pattern: /LOCATIONS:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-locations', label: 'Locations' },
      { pattern: /PLAYER CHARACTER:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-characters', label: 'Player Character' },
      { pattern: /NPC CHARACTERS:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-characters', label: 'NPC Characters' },
      { pattern: /SUCCESS CONDITIONS:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-discovery-status', label: 'Success Conditions' },
      { pattern: /FLOWS:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-flows', label: 'Flows' },
      { pattern: /CURRENT FLOW CONTEXT:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-flow-context', label: 'Current Flow' },
      { pattern: /LLM STORY GUIDELINES:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-story-context', label: 'Story Guidelines' },
      { pattern: /CONVERSATION MEMORY:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-conversation-memory', label: 'Memory' },
      { pattern: /DISCOVERY STATUS:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-discovery-status', label: 'Discovery Status' },
      { pattern: /GAME COMPLETED:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-ending-context', label: 'Game Ending' },
      { pattern: /MARKUP:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-markup', label: 'Markup Rules' },
      { pattern: /PLAYER COMMAND:([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-command', label: 'Command' },
      { pattern: /CRITICAL:([\s\S]*?)(?=Use this exact format|\n\n[A-Z]+:|$)/g, class: 'prompt-critical-header', label: 'Instructions' },
      { pattern: /Use this exact format([\s\S]*?)(?=\n\n[A-Z]+:|$)/g, class: 'prompt-format', label: 'Format' },
      { pattern: /RULES:([\s\S]*?)$/g, class: 'prompt-rules', label: 'Rules' }
    ];

    let formatted = this.escapeHtml(prompt);
    
    sections.forEach(section => {
      formatted = formatted.replace(section.pattern, (_match, content) => {
        return `<div class="prompt-section ${section.class}">
          <div class="prompt-section-header">${section.label}</div>
          <div class="prompt-section-content"><pre>${content.trim()}</pre></div>
        </div>`;
      });
    });

    return formatted;
  }

  private formatResponse(response: string): string {
    try {
      // Try to parse as JSON and format it
      const parsed = JSON.parse(response);
      
      let jsonDisplay = JSON.stringify(parsed, null, 2);
      
      // If the JSON has a 'response' field with rich text, also show rendered version
      if (parsed.response && typeof parsed.response === 'string' && this.hasRichTextMarkup(parsed.response)) {
        return `<div class="response-json">
          <div class="response-section">
            <div class="response-section-header">Rendered Response (with Rich Text)</div>
            <div class="rendered-response">${this.renderRichTextForDebug(parsed.response)}</div>
          </div>
          <div class="response-section">
            <div class="response-section-header">Raw JSON</div>
            <pre class="json-formatted">${jsonDisplay}</pre>
          </div>
        </div>`;
      } else {
        return `<div class="response-json">
          <div class="response-section">
            <div class="response-section-header">Parsed Response</div>
            <pre class="json-formatted">${jsonDisplay}</pre>
          </div>
        </div>`;
      }
    } catch {
      // If not JSON, check if it's rich text
      if (this.hasRichTextMarkup(response)) {
        return `<div class="response-text">
          <div class="response-section">
            <div class="response-section-header">Rendered Response (with Rich Text)</div>
            <div class="rendered-response">${this.renderRichTextForDebug(response)}</div>
          </div>
          <div class="response-section">
            <div class="response-section-header">Raw Response</div>
            <pre>${this.escapeHtml(response)}</pre>
          </div>
        </div>`;
      } else {
        return `<div class="response-text">
          <div class="response-section-header">Raw Response</div>
          <pre>${this.escapeHtml(response)}</pre>
        </div>`;
      }
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private hasRichTextMarkup(text: string): boolean {
    // Check for rich text patterns
    const patterns = [
      /\*\*[^*]+\*\*/,           // **bold**
      /\*[^*]+\*/,              // *italic*
      /\[character:[^\]]+\]/,   // [character:Name]
      /\[item:[^\]]+\]/,        // [item:Name]
      /\[![a-zA-Z]+\]/          // [!warning], [!discovery], etc.
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  private renderRichTextForDebug(text: string): string {
    // Use the actual RichTextParser for proper text flow
    const fragment = this.richTextParser.renderContent(text);
    
    // Convert the DocumentFragment to HTML string
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // Remove clickable behavior for debug view
    const clickableElements = tempDiv.querySelectorAll('.clickable-element');
    clickableElements.forEach(element => {
      element.classList.add('debug-no-click');
      element.classList.remove('clickable-element');
      element.removeAttribute('data-clickable-text');
      element.removeAttribute('title');
      (element as HTMLElement).style.cursor = 'default';
    });
    
    // Add debug-alert class to alerts for debug-specific styling
    const alertElements = tempDiv.querySelectorAll('.rich-alert');
    alertElements.forEach(element => {
      element.classList.add('debug-alert');
    });
    
    return tempDiv.innerHTML;
  }

  // New structured rendering methods
  private renderLlmCall(timestamp: string, data: DebugLlmCall): string {
    const tokenInfo = data.prompt.tokenCount && data.response.tokenCount 
      ? ` (${data.prompt.tokenCount} → ${data.response.tokenCount} tokens)`
      : '';

    return `
      <div class="debug-timestamp">[${timestamp}] 🤖 LLM CALL${tokenInfo}</div>
      <div class="debug-content-section debug-llm-content">
        <div class="debug-subsection">
          <strong>Game State:</strong> 
          <span class="game-state-summary">${data.gameState.location} | ${data.gameState.inventory.length} items | ${data.gameState.flags.length} flags${data.gameState.currentFlow ? ` | flow: ${data.gameState.currentFlow}` : ''}</span>
        </div>
        <div class="debug-subsection">
          <strong>Memory:</strong> 
          <span class="memory-summary">${data.memoryStats.recentInteractions} recent, ${data.memoryStats.significantMemories} significant${data.memoryStats.isProcessing ? ' (processing...)' : ''}</span>
        </div>
        ${data.potentialChanges ? this.renderPotentialChanges(data.potentialChanges) : ''}
        <div class="debug-subsection">
          <strong>Prompt Sections:</strong>
          <div class="prompt-sections">
            ${Object.entries(data.prompt.sections).map(([section, content]) => {
              // No character limit for conversation memory to aid debugging
              const isMemorySection = section.toLowerCase().includes('conversation') || section.toLowerCase().includes('memory');
              const displayContent = isMemorySection ? content : content.substring(0, 800);
              const truncated = !isMemorySection && content.length > 800 ? '\n...[truncated]' : '';
              
              return `
              <div class="prompt-section prompt-${section.toLowerCase().replace(/[^a-z0-9]/g, '-')}">
                <div class="prompt-section-header">${section}</div>
                <div class="prompt-section-content"><pre>${this.escapeHtml(displayContent)}${truncated}</pre></div>
              </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="debug-subsection">
          <strong>Response:</strong>
          <div class="response-content">
            ${this.formatResponse(data.response.raw)}
          </div>
        </div>
      </div>
    `;
  }

  private renderPotentialChanges(potentialChanges: { transitions: any[], endings: any[] }): string {
    if (potentialChanges.transitions.length === 0 && potentialChanges.endings.length === 0) {
      return '';
    }

    let content = `
      <div class="debug-subsection">
        <strong>🔮 Potential Changes:</strong>
        <div class="potential-changes">
    `;

    // Display potential transitions
    if (potentialChanges.transitions.length > 0) {
      content += `
        <div class="potential-transitions">
          <span class="change-category">Flow Transitions:</span>
          ${potentialChanges.transitions.map(transition => `
            <div class="potential-change ${transition.isLikely ? 'likely' : 'possible'}">
              <span class="change-likelihood">${transition.isLikely ? '🎯 Very Likely' : '🤔 Possible'}</span>
              <span class="change-details">→ ${transition.targetFlow.name} (${transition.targetFlow.id})</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Display potential endings
    if (potentialChanges.endings.length > 0) {
      content += `
        <div class="potential-endings">
          <span class="change-category">Story Endings:</span>
          ${potentialChanges.endings.map(ending => `
            <div class="potential-change ${ending.isLikely ? 'likely' : 'possible'}">
              <span class="change-likelihood">${ending.isLikely ? '🎯 Very Likely' : '🤔 Possible'}</span>
              <span class="change-details">→ ${ending.condition.id} (${ending.condition.description})</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    content += `
        </div>
      </div>
    `;

    return content;
  }

  private renderMemoryOperation(timestamp: string, data: DebugMemoryOperation): string {
    return `
      <div class="debug-timestamp">[${timestamp}] 💭 MEMORY: ${data.operation.toUpperCase()}</div>
      <div class="debug-content-section debug-memory-content">
        <div class="debug-subsection">
          <strong>Stats:</strong> ${data.stats.recentInteractions} recent, ${data.stats.significantMemories} significant
          ${data.stats.isProcessing ? ' (processing...)' : ''}
          ${data.stats.extractionInterval ? ` | extract every ${data.stats.extractionInterval}` : ''}
          ${data.stats.interactionsSinceLastExtraction !== undefined ? ` | ${data.stats.interactionsSinceLastExtraction} since last` : ''}
        </div>
        ${data.interaction ? `
          <div class="debug-subsection">
            <strong>Interaction Added:</strong>
            <div class="memory-interaction">
              <span class="memory-importance">[${data.interaction.importance}]</span>
              <span class="memory-input">Player: "${this.escapeHtml(data.interaction.playerInput)}"</span>
              <span class="memory-response">Response: "${this.escapeHtml(data.interaction.llmResponse.substring(0, 60))}${data.interaction.llmResponse.length > 60 ? '...' : ''}"</span>
            </div>
          </div>
        ` : ''}
        ${data.details ? `
          <div class="debug-subsection">
            <strong>Details:</strong> <pre>${this.escapeHtml(JSON.stringify(data.details, null, 2))}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderGameStateChange(timestamp: string, data: DebugGameStateChange): string {
    return `
      <div class="debug-timestamp">[${timestamp}] 🎯 STATE CHANGE: ${data.change.toUpperCase()}</div>
      <div class="debug-content-section debug-state-change-content">
        <div class="debug-subsection">
          <strong>Reason:</strong> ${this.escapeHtml(data.reason)}
        </div>
        <div class="debug-subsection">
          <strong>Current State:</strong> 
          <span class="game-state-summary">${data.gameState.location} | ${data.gameState.inventory.length} items | ${data.gameState.flags.length} flags</span>
        </div>
        <div class="debug-subsection">
          <strong>Change:</strong>
          <div class="state-change-details">
            <div class="change-before"><strong>Before:</strong> <pre>${this.escapeHtml(JSON.stringify(data.before, null, 2))}</pre></div>
            <div class="change-after"><strong>After:</strong> <pre>${this.escapeHtml(JSON.stringify(data.after, null, 2))}</pre></div>
          </div>
        </div>
      </div>
    `;
  }

  public scrollToTop(): void {
    const logContainer = this.container.querySelector('.debug-log') as HTMLElement;
    logContainer.scrollTop = 0;
  }

  public scrollToBottom(): void {
    const logContainer = this.container.querySelector('.debug-log') as HTMLElement;
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  public clear(): void {
    this.debugLog = [];
    const logContainer = this.container.querySelector('.debug-log') as HTMLElement;
    logContainer.innerHTML = '';
  }
}