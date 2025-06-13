/**
 * Impressionist Game Manager - Pure impressionist architecture
 * 
 * Clean, modern UI for impressionist interactive fiction only.
 */

import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistParser } from '@/engine/impressionistParser';
import { MultiModelService } from '@/services/multiModelService';
import { DebugPane } from '@/ui/debugPane';
import { getBundledStoryTitles, getBundledStory } from '@/examples';

export interface GameManagerConfig {
  storyOutput: HTMLElement;
  commandInput: HTMLTextAreaElement;
  multiModelService: MultiModelService;
  debugPane?: DebugPane;
}

export class ImpressionistGameManager {
  private engine: ImpressionistEngine;
  private multiModelService: MultiModelService;
  private parser: ImpressionistParser;
  private debugPane?: DebugPane;
  private isProcessingInitialScene: boolean = false; // Flag to suppress initial scene action display
  
  // UI Elements
  private storyOutput: HTMLElement;
  private commandInput: HTMLTextAreaElement;
  
  constructor(config: GameManagerConfig) {
    this.multiModelService = config.multiModelService;
    this.engine = new ImpressionistEngine(this.multiModelService);
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
      
      // Display story header and initial content
      await this.renderGameIntroduction();
      
      this.enableInput();
      
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
    
    // Don't show the player action if we're processing the initial scene
    if (!this.isProcessingInitialScene) {
      this.addMessage(input, 'player');
    }
    
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
      
      // Handle ending after the narrative is displayed
      if (response.endingTriggered) {
        this.handleStoryEnding();
      }
      
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      this.enableInput();
    }
  }

  /**
   * Render just the game header (title, author, blurb)
   */
  private renderGameHeader(): void {
    const story = this.engine.getCurrentStory();
    if (!story) return;

    // Display story header
    this.addMessage(`🎭 **${story.title}**`, 'title');
    if (story.author) {
      this.addMessage(`*by ${story.author}*`, 'subtitle');
    }
    if (story.blurb) {
      this.addMessage(story.blurb, 'blurb');
    }
    
    this.addMessage('---', 'separator');
  }

  /**
   * Render game introduction (title, author, blurb, initial text)
   */
  private async renderGameIntroduction(): Promise<void> {
    // First render the header
    this.renderGameHeader();
    
    // Then handle initial scene content
    const initialText = this.engine.getInitialText();
    if (initialText === null) {
      // Process initial scene through LLM
      this.addMessage('...', 'system'); // Show thinking indicator
      try {
        this.isProcessingInitialScene = true; // Flag to suppress next player action display
        const response = await this.engine.processInitialScene();
        this.clearLastMessage(); // Remove thinking indicator
        this.addMessage(response.text, 'story');
        this.isProcessingInitialScene = false; // Reset flag after processing complete
      } catch (error) {
        this.clearLastMessage(); // Remove thinking indicator
        this.addMessage('❌ Failed to process initial scene', 'error');
        console.error('Initial scene processing error:', error);
        this.isProcessingInitialScene = false; // Reset flag even on error
      }
    } else {
      // Show static initial text
      this.addMessage(initialText, 'story');
    }
  }

  /**
   * Handle story ending display
   */
  private handleStoryEnding(): void {
    // Show ending messages in correct order after LLM narrative
    this.addMessage('---', 'separator');
    this.addMessage('🌟 **Story Complete** - You can now ask questions, reflect on your experience, or explore what happened.', 'system');
    this.commandInput.placeholder = "Story complete! Ask questions, reflect, or explore...";
    
    // Add visual styling to indicate story completion
    const gameContent = document.getElementById('themed-game-content');
    if (gameContent) {
      gameContent.style.borderTop = '3px solid #4CAF50';
      gameContent.style.background = 'linear-gradient(to bottom, rgba(76, 175, 80, 0.05), var(--game-background-color))';
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
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.engine.getCurrentStoryTitle() || 'impressionist-story'}-save-${timestamp}.json`;
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
          // The engine has already called the UI restore callback to repopulate the conversation
          this.enableInput();
          // Add success message after conversation is restored
          this.addMessage('📂 Game loaded successfully', 'system');
        } else {
          // If loading failed, it might be because no story is loaded
          // Try to guide the user to load a story first
          if (result.error?.includes('No story loaded')) {
            this.addMessage(`❌ Please load a story first, then load your saved game`, 'error');
            this.addMessage(`💡 Use the Load button to select a story, then try loading your save again`, 'system');
          } else {
            this.addMessage(`❌ Failed to load save: ${result.error}`, 'error');
          }
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
      this.clearOutput();
      
      // Show the game header (title, author, blurb) but don't regenerate initial content
      this.renderGameHeader();
      
      // Restore the conversation history
      if (conversationHistory) {
        conversationHistory.forEach((line, index) => {
          if (line.startsWith('Player:')) {
            const playerAction = line.replace(/^Player: /, '');
            // Skip the first player action if it's "<BEGIN STORY>" (initial scene processing)
            if (index === 0 && playerAction === '<BEGIN STORY>') {
              return; // Skip this line
            }
            this.addMessage(playerAction, 'player');
          } else if (line.startsWith('Response:')) {
            this.addMessage(line.replace(/^Response: /, ''), 'story');
          }
        });
      }
    });

    // Ending callback removed - we now handle endings in processInput after the narrative is displayed

    // Set up debug pane if available
    if (this.debugPane) {
      this.engine.setDebugPane(this.debugPane);
    }
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
          this.commandInput.value = '';
          this.commandInput.style.height = 'auto';
          await this.processInput(input);
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
        
        <div class="file-actions">
          <button class="action-btn primary" id="load-file">📄 Load Story File (.yaml)</button>
          <button class="action-btn" id="load-save">💾 Load Save Game (.json)</button>
        </div>
        
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
        
        <button class="close-btn">✕</button>
      </div>
    `;
    
    this.attachLoadMenuEvents(menu);
    
    return menu;
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

  private clearLastMessage(): void {
    const lastMessage = this.storyOutput.lastElementChild;
    if (lastMessage) {
      this.storyOutput.removeChild(lastMessage);
    }
  }

  /**
   * Format story text with basic markdown support and intelligent whitespace handling
   */
  private formatStoryText(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert paragraph breaks (double newlines) to <p> tags
      .replace(/\n\s*\n/g, '</p><p>')
      // Remove single line breaks to allow text to flow naturally
      .replace(/\n/g, ' ')
      // Wrap in paragraph tags and clean up
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ');
  }

  /**
   * Show thinking indicator with breathing dots
   */
  private showTypingIndicator(): void {
    const indicator = document.createElement('div');
    indicator.className = 'thinking-dots';
    indicator.innerHTML = '<span>•</span><span>•</span><span>•</span>';
    indicator.id = 'thinking-indicator';
    
    this.storyOutput.appendChild(indicator);
    this.storyOutput.scrollTop = this.storyOutput.scrollHeight;
  }

  /**
   * Hide thinking indicator
   */
  private hideTypingIndicator(): void {
    const indicator = document.getElementById('thinking-indicator');
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