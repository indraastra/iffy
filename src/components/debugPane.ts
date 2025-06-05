export interface DebugData {
  prompt?: string;
  response?: string;
  timestamp: Date;
  type: 'request' | 'response' | 'error';
}

export class DebugPane {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private debugLog: DebugData[] = [];

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
          <button class="debug-clear-btn">Clear</button>
          <button class="debug-close-btn">×</button>
        </div>
      </div>
      <div class="debug-content">
        <div class="debug-log"></div>
      </div>
    `;

    // Add event listeners
    const clearBtn = pane.querySelector('.debug-clear-btn') as HTMLElement;
    const closeBtn = pane.querySelector('.debug-close-btn') as HTMLElement;
    
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
    }

    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  private formatPrompt(prompt: string): string {
    // Parse and colorize different sections of the prompt
    const sections = [
      { pattern: /STORY CONTEXT:([\s\S]*?)(?=CURRENT GAME STATE:|$)/g, class: 'prompt-story-context', label: 'Story Context' },
      { pattern: /CURRENT GAME STATE:([\s\S]*?)(?=AVAILABLE LOCATIONS:|$)/g, class: 'prompt-game-state', label: 'Game State' },
      { pattern: /AVAILABLE LOCATIONS:([\s\S]*?)(?=AVAILABLE ITEMS:|$)/g, class: 'prompt-locations', label: 'Locations' },
      { pattern: /AVAILABLE ITEMS:([\s\S]*?)(?=PLAYER COMMAND:|$)/g, class: 'prompt-items', label: 'Items' },
      { pattern: /PLAYER COMMAND:([\s\S]*?)(?=Please respond|$)/g, class: 'prompt-command', label: 'Player Command' },
      { pattern: /Please respond with a JSON object([\s\S]*?)(?=IMPORTANT RULES:|$)/g, class: 'prompt-format', label: 'Response Format' },
      { pattern: /IMPORTANT RULES:([\s\S]*?)$/g, class: 'prompt-rules', label: 'Rules' }
    ];

    let formatted = this.escapeHtml(prompt);
    
    sections.forEach(section => {
      formatted = formatted.replace(section.pattern, (match, content) => {
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
      return `<div class="response-json">
        <div class="response-section">
          <div class="response-section-header">Parsed Response</div>
          <pre class="json-formatted">${JSON.stringify(parsed, null, 2)}</pre>
        </div>
      </div>`;
    } catch {
      // If not JSON, treat as plain text
      return `<div class="response-text">
        <div class="response-section-header">Raw Response</div>
        <pre>${this.escapeHtml(response)}</pre>
      </div>`;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public clear(): void {
    this.debugLog = [];
    const logContainer = this.container.querySelector('.debug-log') as HTMLElement;
    logContainer.innerHTML = '';
  }
}