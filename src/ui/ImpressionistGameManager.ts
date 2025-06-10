/**
 * Impressionist Game Manager - Pure impressionist architecture
 * 
 * Clean, modern UI for impressionist interactive fiction only.
 */

import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistParser } from '@/engine/impressionistParser';
import { AnthropicService } from '@/services/anthropicService';
import { DebugPane } from '@/ui/debugPane';
import { getBundledStoryTitles, getBundledStory } from '@/bundled-examples';

export interface GameManagerConfig {
  storyOutput: HTMLElement;
  commandInput: HTMLTextAreaElement;
  anthropicService: AnthropicService;
  debugPane?: DebugPane;
}

export class ImpressionistGameManager {
  private engine: ImpressionistEngine;
  private anthropicService: AnthropicService;
  private parser: ImpressionistParser;
  private debugPane?: DebugPane;
  
  // UI Elements
  private storyOutput: HTMLElement;
  private commandInput: HTMLTextAreaElement;
  
  constructor(config: GameManagerConfig) {
    this.anthropicService = config.anthropicService;
    this.engine = new ImpressionistEngine(this.anthropicService);
    this.parser = new ImpressionistParser();
    this.debugPane = config.debugPane;
    
    this.storyOutput = config.storyOutput;
    this.commandInput = config.commandInput;
    
    this.setupEngine();
    this.setupEventListeners();
    this.setupMetricsUpdates();
  }

  /**
   * Load a story from YAML content
   */
  async loadStory(yamlContent: string, _filename: string): Promise<boolean> {
    try {
      this.clearOutput();
      this.addMessage('🔍 Loading impressionist story...', 'system');
      
      const story = this.parser.parseYaml(yamlContent);
      
      // Load the story
      const result = this.engine.loadStory(story);
      
      if (!result.success) {
        this.addMessage(`❌ Failed to load story: ${result.error}`, 'error');
        return false;
      }
      
      // Display story header
      this.addMessage(`🎭 **${story.title}**`, 'title');
      if (story.author) {
        this.addMessage(`*by ${story.author}*`, 'subtitle');
      }
      if (story.blurb) {
        this.addMessage(story.blurb, 'blurb');
      }
      
      this.addMessage('---', 'separator');
      this.addMessage(this.engine.getInitialText(), 'story');
      
      this.enableInput();
      this.addMessage('💭 *Speak naturally - the AI will understand your intent.*', 'help');
      
      return true;
      
    } catch (error) {
      this.addMessage(`❌ Error loading story: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return false;
    }
  }

  /**
   * Process player input
   */
  async processInput(input: string): Promise<void> {
    if (!input.trim()) return;
    
    this.disableInput();
    this.addMessage(`> ${input}`, 'player');
    this.showTypingIndicator();
    
    try {
      const response = await this.engine.processAction({ input: input.trim() });
      
      this.hideTypingIndicator();
      
      if (response.error) {
        this.addMessage(`⚠️ ${response.error}`, 'error');
      }
      
      if (response.text) {
        this.addMessage(response.text, 'story');
      }
      
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      this.enableInput();
    }
  }

  /**
   * Load example story by filename
   */
  async loadExampleStory(filename: string): Promise<boolean> {
    const storyData = getBundledStory(filename);
    if (!storyData) {
      this.addMessage(`❌ Example story "${filename}" not found`, 'error');
      return false;
    }
    
    return await this.loadStory(storyData.content, filename);
  }

  /**
   * Show load menu
   */
  showLoadMenu(): void {
    const menu = this.createLoadMenu();
    document.body.appendChild(menu);
  }

  /**
   * Save current game
   */
  saveGame(): void {
    try {
      const saveData = this.engine.saveGame();
      const blob = new Blob([saveData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.engine.getCurrentStoryTitle() || 'impressionist-story'}-save.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.addMessage('💾 Game saved successfully', 'system');
    } catch (error) {
      this.addMessage(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  /**
   * Load saved game
   */
  loadSaveGame(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const saveData = await file.text();
        const result = this.engine.loadGame(saveData);
        
        if (result.success) {
          this.addMessage('📂 Game loaded successfully', 'system');
          this.clearOutput();
          this.addMessage(this.engine.getInitialText(), 'story');
          this.enableInput();
        } else {
          this.addMessage(`❌ Failed to load save: ${result.error}`, 'error');
        }
        
      } catch (error) {
        this.addMessage(`❌ Error reading save file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    });
    
    input.click();
  }

  /**
   * Set up engine callbacks
   */
  private setupEngine(): void {
    this.engine.setUIResetCallback(() => {
      this.clearOutput();
    });
    
    this.engine.setUIRestoreCallback((_gameState: any, conversationHistory?: any[]) => {
      if (conversationHistory) {
        conversationHistory.forEach(line => {
          const type = line.startsWith('Player:') ? 'player' : 'story';
          this.addMessage(line.replace(/^(Player: |Response: )/, ''), type);
        });
      }
    });
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Handle command input
    this.commandInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const input = this.commandInput.value.trim();
        if (input) {
          await this.processInput(input);
          this.commandInput.value = '';
        }
      }
    });
    
    // Handle load button
    const loadBtn = document.getElementById('load-btn');
    loadBtn?.addEventListener('click', () => this.showLoadMenu());
    
    // Handle save button
    const saveBtn = document.getElementById('save-btn');
    saveBtn?.addEventListener('click', () => this.saveGame());
  }

  /**
   * Create load menu
   */
  private createLoadMenu(): HTMLElement {
    const exampleStories = getBundledStoryTitles();
    
    const menu = document.createElement('div');
    menu.className = 'impressionist-load-menu';
    
    menu.innerHTML = `
      <div class="load-overlay"></div>
      <div class="load-content">
        <h3>🎭 Load Impressionist Story</h3>
        <p class="load-description">Choose from example stories or load your own .yaml file</p>
        
        ${exampleStories.length > 0 ? `
          <div class="examples-section">
            <h4>📚 Example Stories</h4>
            <div class="examples-grid">
              ${exampleStories.map(story => `
                <button class="example-story" data-filename="${story.filename}">
                  <div class="story-header">
                    <h5>${story.title}</h5>
                    <span class="story-author">by ${story.author}</span>
                  </div>
                  <p class="story-description">${story.blurb}</p>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="file-actions">
          <button class="action-btn primary" id="load-file">📄 Load Story File (.yaml)</button>
          <button class="action-btn" id="load-save">💾 Load Save Game (.json)</button>
        </div>
        
        <button class="close-btn">✕</button>
      </div>
    `;
    
    this.styleLoadMenu();
    this.attachLoadMenuEvents(menu);
    
    return menu;
  }

  /**
   * Style the load menu
   */
  private styleLoadMenu(): void {
    if (document.getElementById('impressionist-menu-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'impressionist-menu-styles';
    style.textContent = `
      .impressionist-load-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .load-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
      }
      
      .load-content {
        position: relative;
        background: var(--bg-color);
        color: var(--text-color);
        border: 2px solid var(--accent-color);
        border-radius: 12px;
        padding: 2rem;
        max-width: 700px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      
      .load-content h3 {
        margin: 0 0 0.5rem 0;
        color: var(--accent-color);
      }
      
      .load-description {
        margin: 0 0 2rem 0;
        opacity: 0.8;
      }
      
      .examples-section {
        margin-bottom: 2rem;
      }
      
      .examples-section h4 {
        margin: 0 0 1rem 0;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
      }
      
      .examples-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1rem;
      }
      
      .example-story {
        background: var(--button-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1.5rem;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
      }
      
      .example-story:hover {
        border-color: var(--accent-color);
        background: var(--button-hover-bg);
        transform: translateY(-2px);
      }
      
      .story-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.75rem;
      }
      
      .story-header h5 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--accent-color);
      }
      
      .story-author {
        font-size: 0.9rem;
        opacity: 0.7;
        font-style: italic;
      }
      
      .story-description {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.4;
        opacity: 0.9;
      }
      
      .file-actions {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      
      .action-btn {
        flex: 1;
        padding: 1rem;
        background: var(--button-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        font-size: 1rem;
        transition: all 0.2s ease;
      }
      
      .action-btn:hover {
        background: var(--button-hover-bg);
        border-color: var(--accent-color);
      }
      
      .action-btn.primary {
        background: var(--accent-color);
        color: white;
        border-color: var(--accent-color);
      }
      
      .action-btn.primary:hover {
        background: color-mix(in srgb, var(--accent-color) 80%, white);
      }
      
      .close-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        color: var(--text-color);
        font-size: 1.5rem;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }
      
      .close-btn:hover {
        opacity: 1;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Attach load menu events
   */
  private attachLoadMenuEvents(menu: HTMLElement): void {
    // Example stories
    menu.querySelectorAll('.example-story').forEach(btn => {
      btn.addEventListener('click', async () => {
        const filename = btn.getAttribute('data-filename');
        if (filename) {
          document.body.removeChild(menu);
          await this.loadExampleStory(filename);
        }
      });
    });
    
    // Load file
    menu.querySelector('#load-file')?.addEventListener('click', () => {
      document.body.removeChild(menu);
      this.loadStoryFile();
    });
    
    // Load save
    menu.querySelector('#load-save')?.addEventListener('click', () => {
      document.body.removeChild(menu);
      this.loadSaveGame();
    });
    
    // Close button and overlay
    const closeMenu = () => document.body.removeChild(menu);
    menu.querySelector('.close-btn')?.addEventListener('click', closeMenu);
    menu.querySelector('.load-overlay')?.addEventListener('click', closeMenu);
  }

  /**
   * Load story file from disk
   */
  private loadStoryFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    
    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const content = await file.text();
        await this.loadStory(content, file.name);
      } catch (error) {
        this.addMessage(`❌ Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    });
    
    input.click();
  }

  /**
   * Add message to output with rich formatting
   */
  private addMessage(text: string, type: string): void {
    const div = document.createElement('div');
    div.className = `message message-${type}`;
    
    // Handle markdown-style formatting
    if (type === 'story') {
      div.innerHTML = this.formatStoryText(text);
    } else {
      div.textContent = text;
    }
    
    this.storyOutput.appendChild(div);
    this.storyOutput.scrollTop = this.storyOutput.scrollHeight;
  }

  /**
   * Format story text with basic markdown support
   */
  private formatStoryText(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Show typing indicator
   */
  private showTypingIndicator(): void {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    indicator.id = 'typing-indicator';
    
    this.storyOutput.appendChild(indicator);
    this.storyOutput.scrollTop = this.storyOutput.scrollHeight;
  }

  /**
   * Hide typing indicator
   */
  private hideTypingIndicator(): void {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Clear output
   */
  private clearOutput(): void {
    this.storyOutput.innerHTML = '';
  }

  /**
   * Enable input
   */
  private enableInput(): void {
    this.commandInput.disabled = false;
    this.commandInput.placeholder = "What do you do? Speak naturally...";
    this.commandInput.focus();
  }

  /**
   * Disable input
   */
  private disableInput(): void {
    this.commandInput.disabled = true;
    this.commandInput.placeholder = "Processing...";
  }

  /**
   * Set up metrics updates to debug pane
   */
  private setupMetricsUpdates(): void {
    if (!this.debugPane) return;

    // Set up periodic metrics updates
    setInterval(() => {
      // Update session stats from engine metrics
      const sessionStats = this.engine.getMetrics()?.getSessionStats();
      if (sessionStats) {
        this.debugPane!.updateSessionStats(sessionStats);
      }

      // Update memory stats from memory manager
      const memoryManager = this.engine.getMemoryManager();
      if (memoryManager) {
        const memoryMetrics = memoryManager.getMemoryMetrics();
        const memoryStats = memoryMetrics.getSessionStats();
        const memoryWarnings = memoryMetrics.getMemoryWarnings();
        this.debugPane!.updateMemoryStats(memoryStats, memoryWarnings);
      }
    }, 2000); // Update every 2 seconds
  }
}