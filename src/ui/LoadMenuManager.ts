import { StoryParser, StoryParseError } from '@/engine/storyParser';
import { GameEngine } from '@/engine/gameEngine';
import { getBundledStoryTitles, getBundledStory } from '@/bundled-examples';
import { MessageDisplay } from './MessageDisplay';

/**
 * Manages the story loading menu and file operations
 */
export class LoadMenuManager {
  private gameEngine: GameEngine;
  private messageDisplay: MessageDisplay;
  private commandInput: HTMLTextAreaElement;

  constructor(gameEngine: GameEngine, messageDisplay: MessageDisplay, commandInput: HTMLTextAreaElement) {
    this.gameEngine = gameEngine;
    this.messageDisplay = messageDisplay;
    this.commandInput = commandInput;
  }

  /**
   * Show the load options menu
   */
  showLoadOptions(): void {
    const exampleStories = getBundledStoryTitles();
    
    const options = [
      { text: 'Load Story File (.yaml)', action: () => this.loadStoryFile() },
      { text: 'Load Save Game (.json)', action: () => this.loadSaveGame() }
    ];

    // Create a simple menu
    const menu = document.createElement('div');
    menu.className = 'load-menu';
    
    const exampleStoriesHtml = exampleStories.length > 0 ? `
      <div class="example-stories-section">
        <h4>📚 Example Stories</h4>
        <div class="example-stories-grid">
          ${exampleStories.map((story) => 
            `<button class="example-story-btn" data-filename="${story.filename}">
              <div class="story-title">${story.title}</div>
              <div class="story-author">by ${story.author}</div>
              <div class="story-blurb">${story.blurb}</div>
            </button>`
          ).join('')}
        </div>
      </div>
    ` : '';
    
    menu.innerHTML = `
      <div class="load-menu-content">
        <h3>What would you like to load?</h3>
        ${exampleStoriesHtml}
        <div class="load-options-section">
          <h4>📁 Load Files</h4>
          ${options.map((option, index) => 
            `<button class="load-option-btn" data-index="${index}">${option.text}</button>`
          ).join('')}
        </div>
        <button class="load-cancel-btn">Cancel</button>
      </div>
    `;

    this.styleMenu(menu);
    this.attachEventListeners(menu, exampleStories, options);
    
    document.body.appendChild(menu);
  }

  /**
   * Style the load menu
   */
  private styleMenu(menu: HTMLElement): void {
    // Style the menu
    menu.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 15, 35, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1001;
    `;

    const content = menu.querySelector('.load-menu-content') as HTMLElement;
    content.style.cssText = `
      background: var(--primary-color);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      min-width: 500px;
      max-width: 80vw;
      max-height: 80vh;
      overflow-y: auto;
    `;

    // Style example stories section
    const exampleSection = menu.querySelector('.example-stories-section') as HTMLElement;
    if (exampleSection) {
      exampleSection.style.cssText = `
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
      `;
      
      const grid = menu.querySelector('.example-stories-grid') as HTMLElement;
      if (grid) {
        grid.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        `;
      }
    }
  }

  /**
   * Attach event listeners to menu elements
   */
  private attachEventListeners(
    menu: HTMLElement, 
    exampleStories: Array<{filename: string, title: string, author: string, blurb: string}>,
    options: Array<{text: string, action: () => void}>
  ): void {
    // Add event listeners for example stories
    exampleStories.forEach((story) => {
      const btn = menu.querySelector(`[data-filename="${story.filename}"]`) as HTMLElement;
      if (btn) {
        this.styleExampleStoryButton(btn);
        
        btn.addEventListener('click', () => {
          document.body.removeChild(menu);
          this.loadBundledStory(story.filename);
        });
      }
    });

    // Add event listeners for file load options
    options.forEach((option, index) => {
      const btn = menu.querySelector(`[data-index="${index}"]`) as HTMLElement;
      btn.style.cssText = `
        display: block;
        width: 100%;
        margin: 1rem 0;
        padding: 0.75rem;
        background: var(--button-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
      `;
      btn.addEventListener('click', () => {
        document.body.removeChild(menu);
        option.action();
      });
    });

    const cancelBtn = menu.querySelector('.load-cancel-btn') as HTMLElement;
    cancelBtn.style.cssText = `
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: transparent;
      color: var(--text-color);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
    `;
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(menu);
    });
  }

  /**
   * Style an example story button
   */
  private styleExampleStoryButton(btn: HTMLElement): void {
    btn.style.cssText = `
      background: var(--button-bg);
      color: var(--text-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 1rem;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
      transition: background-color 0.2s, border-color 0.2s;
    `;
    
    // Style individual elements within the button
    const titleEl = btn.querySelector('.story-title') as HTMLElement;
    const authorEl = btn.querySelector('.story-author') as HTMLElement;
    const blurbEl = btn.querySelector('.story-blurb') as HTMLElement;
    
    if (titleEl) titleEl.style.cssText = 'font-weight: bold; font-size: 1.1em; margin-bottom: 0.25rem;';
    if (authorEl) authorEl.style.cssText = 'font-size: 0.9em; opacity: 0.8; margin-bottom: 0.5rem;';
    if (blurbEl) blurbEl.style.cssText = 'font-size: 0.85em; opacity: 0.7; line-height: 1.3;';
    
    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = 'var(--accent-color)';
      btn.style.borderColor = 'var(--accent-color)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'var(--button-bg)';
      btn.style.borderColor = 'var(--border-color)';
    });
  }

  /**
   * Load a story from a file picker
   */
  private loadStoryFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadStoryFileFromFile(file);
      }
    };
    
    input.click();
  }

  /**
   * Load a story from a File object
   */
  private async loadStoryFileFromFile(file: File): Promise<void> {
    try {
      this.messageDisplay.addMessage('Loading story...', 'system');
      
      const story = await StoryParser.parseFromFile(file);
      this.gameEngine.loadStory(story);
      
      this.initializeStory(story);
    } catch (error) {
      this.handleStoryLoadError(error, 'Failed to load story file.');
    }
  }

  /**
   * Load a bundled example story
   */
  private async loadBundledStory(filename: string): Promise<void> {
    try {
      this.messageDisplay.addMessage(`Loading ${filename}...`, 'system');
      
      const bundledStory = getBundledStory(filename);
      if (!bundledStory) {
        this.messageDisplay.addMessage(`Error: Bundled story "${filename}" not found.`, 'error');
        return;
      }
      
      const story = StoryParser.parseFromYaml(bundledStory.content);
      this.gameEngine.loadStory(story);
      
      this.initializeStory(story);
    } catch (error) {
      this.handleStoryLoadError(error, `Failed to load bundled story "${filename}".`);
    }
  }

  /**
   * Initialize a loaded story
   */
  private async initializeStory(story: any): Promise<void> {
    // Clear output and show story start
    this.messageDisplay.clearOutput();
    this.messageDisplay.addMessage(`${story.title} by ${story.author}`, 'title');
    
    const initialText = this.gameEngine.getInitialText();
    this.messageDisplay.addMessage(initialText, 'story');
    
    // Add the start text to conversation history for LLM context
    this.gameEngine.trackStartText(initialText);
    
    this.commandInput.focus();
  }

  /**
   * Handle story loading errors
   */
  private handleStoryLoadError(error: unknown, defaultMessage: string): void {
    let errorMessage = defaultMessage;
    
    if (error instanceof StoryParseError) {
      errorMessage = `Story parsing error: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = `Error: ${error.message}`;
    }
    
    this.messageDisplay.addMessage(errorMessage, 'error');
  }

  /**
   * Load a save game from file picker
   */
  private loadSaveGame(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const saveData = e.target?.result as string;
            const result = this.gameEngine.loadGame(saveData);
            if (result.success) {
              this.messageDisplay.addMessage('Game loaded successfully!', 'system');
              this.messageDisplay.addMessage('You can continue from where you left off.', 'system');
            } else {
              this.messageDisplay.addMessage(result.error || 'Failed to load save file. Make sure you have the correct story loaded.', 'error');
            }
          } catch (error) {
            this.messageDisplay.addMessage('Invalid save file format.', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  }
}