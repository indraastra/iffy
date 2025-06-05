import { Story, GameState, PlayerAction, GameResponse, Flow } from '@/types/story';
import { AnthropicService, LLMResponse } from '@/services/anthropicService';

export class GameEngine {
  private story: Story | null = null;
  private gameState: GameState = this.createInitialState();
  private anthropicService: AnthropicService;

  constructor() {
    this.anthropicService = new AnthropicService();
  }

  loadStory(story: Story): void {
    this.story = story;
    this.gameState = this.createInitialState();
    
    // Apply story-specific theming
    this.applyTheme(story);
    
    // Set initial state from story start
    this.gameState.currentLocation = story.start.location;
    if (story.start.sets) {
      story.start.sets.forEach(flag => this.gameState.flags.add(flag));
    }
    this.gameState.gameStarted = true;
    this.gameState.currentFlow = story.start.first_flow;
  }

  getInitialText(): string {
    if (!this.story) return 'No story loaded. Please load a story file to begin.';
    
    return this.story.start.text;
  }

  getCurrentFlow(): Flow | null {
    if (!this.story || !this.gameState.currentFlow) return null;
    
    return this.story.flows.find(flow => flow.id === this.gameState.currentFlow) || null;
  }

  getCurrentLocation() {
    if (!this.story) return null;
    
    return this.story.locations.find(loc => loc.id === this.gameState.currentLocation) || null;
  }

  async processAction(action: PlayerAction): Promise<GameResponse> {
    if (!this.story) {
      return {
        text: 'No story is currently loaded.',
        gameState: this.gameState,
        error: 'No story loaded'
      };
    }

    try {
      // Phase 2: Use LLM for command interpretation when available
      if (this.anthropicService.isConfigured()) {
        return await this.processWithLLM(action.input);
      } else {
        // Fallback to basic command handling when no API key is set
        return this.handleBasicCommand(action.input);
      }
    } catch (error) {
      console.error('Error processing action:', error);
      return {
        text: 'Sorry, I had trouble processing that command. Try something else.',
        gameState: this.gameState,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processWithLLM(input: string): Promise<GameResponse> {
    const currentLocation = this.getCurrentLocation();
    
    try {
      const llmResponse = await this.anthropicService.processCommand(
        input,
        this.gameState,
        this.story!,
        currentLocation
      );

      // Apply state changes from LLM response
      this.applyStateChanges(llmResponse);

      return {
        text: llmResponse.response,
        gameState: { ...this.gameState },
        error: llmResponse.error
      };
    } catch (error) {
      console.error('LLM processing failed:', error);
      
      // Fallback to basic command handling
      return this.handleBasicCommand(input);
    }
  }

  private applyStateChanges(llmResponse: LLMResponse): void {
    const changes = llmResponse.stateChanges;

    // Update location
    if (changes.newLocation) {
      this.gameState.currentLocation = changes.newLocation;
    }

    // Update inventory
    if (changes.addToInventory) {
      changes.addToInventory.forEach(itemId => {
        if (!this.gameState.inventory.includes(itemId)) {
          this.gameState.inventory.push(itemId);
        }
      });
    }

    if (changes.removeFromInventory) {
      changes.removeFromInventory.forEach(itemId => {
        const index = this.gameState.inventory.indexOf(itemId);
        if (index > -1) {
          this.gameState.inventory.splice(index, 1);
        }
      });
    }

    // Update flags
    if (changes.setFlags) {
      changes.setFlags.forEach(flag => {
        this.gameState.flags.add(flag);
      });
    }

    if (changes.unsetFlags) {
      changes.unsetFlags.forEach(flag => {
        this.gameState.flags.delete(flag);
      });
    }

    // Update knowledge
    if (changes.addKnowledge) {
      changes.addKnowledge.forEach(knowledge => {
        this.gameState.knowledge.add(knowledge);
      });
    }
  }

  private handleBasicCommand(input: string): GameResponse {
    const command = input.toLowerCase().trim();
    
    // Basic navigation commands
    if (command.startsWith('go ') || command.startsWith('move ') || command.startsWith('walk ')) {
      const direction = command.split(' ').slice(1).join(' ');
      return this.handleMovement(direction);
    }

    // Look around
    if (command === 'look' || command === 'l') {
      return this.handleLook();
    }

    // Inventory
    if (command === 'inventory' || command === 'i') {
      return this.handleInventory();
    }

    // Help
    if (command === 'help' || command === '?') {
      return this.handleHelp();
    }

    // Flow progression (for testing)
    if (command === 'continue' || command === 'next') {
      return this.handleContinue();
    }

    // Default response for unrecognized commands
    return {
      text: `I don't understand "${input}". Try commands like "look", "go [direction]", "inventory", or "help".`,
      gameState: this.gameState
    };
  }

  private handleMovement(direction: string): GameResponse {
    const currentLocation = this.getCurrentLocation();
    if (!currentLocation) {
      return {
        text: 'You seem to be lost in the void.',
        gameState: this.gameState,
        error: 'No current location'
      };
    }

    // Find location by name or connection
    const targetLocation = this.story!.locations.find(loc => 
      loc.name.toLowerCase().includes(direction) || 
      loc.id.toLowerCase().includes(direction) ||
      currentLocation.connections.includes(loc.id)
    );

    if (!targetLocation || !currentLocation.connections.includes(targetLocation.id)) {
      return {
        text: `You can't go ${direction} from here. Available exits: ${this.getAvailableExits(currentLocation)}`,
        gameState: this.gameState
      };
    }

    this.gameState.currentLocation = targetLocation.id;
    
    return {
      text: `You move to ${targetLocation.name}.\n\n${targetLocation.description}`,
      gameState: this.gameState
    };
  }

  private handleLook(): GameResponse {
    const currentLocation = this.getCurrentLocation();
    if (!currentLocation) {
      return {
        text: 'You seem to be lost in the void.',
        gameState: this.gameState,
        error: 'No current location'
      };
    }

    let text = `${currentLocation.name}\n\n${currentLocation.description}`;
    
    const exits = this.getAvailableExits(currentLocation);
    if (exits) {
      text += `\n\nExits: ${exits}`;
    }

    // Show objects in location
    if (currentLocation.objects && currentLocation.objects.length > 0) {
      const visibleObjects = currentLocation.objects.filter(obj => obj.name);
      if (visibleObjects.length > 0) {
        text += `\n\nYou can see: ${visibleObjects.map(obj => obj.name).join(', ')}`;
      }
    }

    return {
      text,
      gameState: this.gameState
    };
  }

  private handleInventory(): GameResponse {
    if (this.gameState.inventory.length === 0) {
      return {
        text: 'You are carrying nothing.',
        gameState: this.gameState
      };
    }

    const items = this.gameState.inventory.map(itemId => {
      const item = this.story!.items.find(i => i.id === itemId);
      return item ? item.name : itemId;
    }).join(', ');

    return {
      text: `You are carrying: ${items}`,
      gameState: this.gameState
    };
  }

  private handleHelp(): GameResponse {
    const text = `Available commands:
• look - Look around your current location
• go [direction] - Move to another location
• inventory - Check what you're carrying
• continue - Advance the story (for testing)
• help - Show this help message

This is a basic MVP version. More natural language understanding will be added in Phase 2.`;

    return {
      text,
      gameState: this.gameState
    };
  }

  private handleContinue(): GameResponse {
    const currentFlow = this.getCurrentFlow();
    if (!currentFlow) {
      return {
        text: 'There\'s nothing to continue right now.',
        gameState: this.gameState
      };
    }

    let text = `${currentFlow.name}\n\n${currentFlow.content || 'Something happens...'}`;

    // Apply any state changes from this flow
    if (currentFlow.sets) {
      currentFlow.sets.forEach(flag => {
        if (flag.startsWith('has_item:')) {
          const itemId = flag.substring(9);
          if (!this.gameState.inventory.includes(itemId)) {
            this.gameState.inventory.push(itemId);
          }
        } else if (flag.startsWith('knows:')) {
          const knowledgeId = flag.substring(6);
          this.gameState.knowledge.add(knowledgeId);
        } else {
          this.gameState.flags.add(flag);
        }
      });
    }

    // Show available next actions
    if (currentFlow.next && currentFlow.next.length > 0) {
      text += '\n\nAvailable actions:';
      currentFlow.next.forEach(transition => {
        text += `\n• ${transition.trigger}`;
      });
    }

    return {
      text,
      gameState: this.gameState
    };
  }

  private getAvailableExits(location: any): string {
    if (!location.connections || location.connections.length === 0) {
      return 'none';
    }

    const exitNames = location.connections.map((connId: string) => {
      const conn = this.story!.locations.find(loc => loc.id === connId);
      return conn ? conn.name : connId;
    });

    return exitNames.join(', ');
  }

  private createInitialState(): GameState {
    return {
      currentLocation: '',
      inventory: [],
      flags: new Set(),
      knowledge: new Set(),
      gameStarted: false,
      gameEnded: false
    };
  }

  private applyTheme(story: Story): void {
    const colors = story.metadata.ui?.colors;
    if (colors) {
      const root = document.documentElement;
      
      // Apply base colors
      if (colors.primary) root.style.setProperty('--primary-color', colors.primary);
      if (colors.background) root.style.setProperty('--background-color', colors.background);
      if (colors.text) root.style.setProperty('--text-color', colors.text);
      
      // Set header and footer to use background color for better text readability
      if (colors.background) {
        root.style.setProperty('--header-bg', colors.background);
        root.style.setProperty('--footer-bg', colors.background);
      }
      
      // Set input background to use background color for consistency
      if (colors.background) {
        root.style.setProperty('--input-bg', colors.background);
      }
      
      // Derive related colors for cohesive theming
      if (colors.primary) {
        
        // Make button background slightly lighter than primary
        const buttonBg = this.adjustColorBrightness(colors.primary, 30);
        root.style.setProperty('--button-bg', buttonBg);
        
        // Make button hover even lighter
        const buttonHover = this.adjustColorBrightness(colors.primary, 50);
        root.style.setProperty('--button-hover', buttonHover);
        
        // Make border color lighter than primary
        const borderColor = this.adjustColorBrightness(colors.primary, 40);
        root.style.setProperty('--border-color', borderColor);
        
        // Make modal background semi-transparent version of background
        if (colors.background) {
          const modalBg = this.hexToRgba(colors.background, 0.95);
          root.style.setProperty('--modal-bg', modalBg);
        }
      }
    }
  }

  private adjustColorBrightness(hex: string, percent: number): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Adjust brightness
    const adjust = (val: number) => {
      const adjusted = val + (percent * 255 / 100);
      return Math.max(0, Math.min(255, Math.round(adjusted)));
    };
    
    const newR = adjust(r);
    const newG = adjust(g);
    const newB = adjust(b);
    
    // Convert back to hex
    const toHex = (val: number) => val.toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  }

  private hexToRgba(hex: string, alpha: number): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getAnthropicService(): AnthropicService {
    return this.anthropicService;
  }

  saveGame(): string {
    return JSON.stringify({
      gameState: {
        ...this.gameState,
        flags: Array.from(this.gameState.flags),
        knowledge: Array.from(this.gameState.knowledge)
      },
      storyTitle: this.story?.title
    });
  }

  loadGame(saveData: string): boolean {
    try {
      const data = JSON.parse(saveData);
      if (data.storyTitle !== this.story?.title) {
        return false; // Save is for a different story
      }

      this.gameState = {
        ...data.gameState,
        flags: new Set(data.gameState.flags),
        knowledge: new Set(data.gameState.knowledge)
      };

      return true;
    } catch {
      return false;
    }
  }
}