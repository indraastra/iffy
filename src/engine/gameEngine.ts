import { Story, GameState, PlayerAction, GameResponse, Flow, Result, SuccessCondition } from '@/types/story';
import { AnthropicService } from '@/services/anthropicService';
import { GamePromptBuilder, GameStateResponse } from './gameEngineLlmAdapter';
import { MemoryManager } from './memoryManager';

export class GameEngine {
  private story: Story | null = null;
  private gameState: GameState = this.createInitialState();
  private anthropicService: AnthropicService;
  private promptBuilder: GamePromptBuilder;
  private memoryManager: MemoryManager;
  private debugPane: any = null;
  private uiResetCallback?: () => void;
  private uiRestoreCallback?: (gameState: any, conversationHistory?: any[]) => void;
  private hasShownEndingContent: boolean = false;
  private endingCallback?: (endingText: string) => void;
  private loadingStateCallback?: (message: string) => void;

  constructor(anthropicService?: AnthropicService) {
    this.anthropicService = anthropicService || new AnthropicService();
    this.promptBuilder = new GamePromptBuilder();
    this.memoryManager = new MemoryManager(this.anthropicService);
  }

  /**
   * Set callback to reset UI state when game is reset
   */
  public setUIResetCallback(callback: () => void): void {
    this.uiResetCallback = callback;
  }

  /**
   * Set callback to restore UI state when game is loaded from save
   */
  public setUIRestoreCallback(callback: (gameState: any, conversationHistory?: any[]) => void): void {
    this.uiRestoreCallback = callback;
  }

  /**
   * Set callback for asynchronous ending generation
   */
  public setEndingCallback(callback: (endingText: string) => void): void {
    this.endingCallback = callback;
  }

  /**
   * Set callback for showing loading state during ending generation
   */
  public setLoadingStateCallback(callback: (message: string) => void): void {
    this.loadingStateCallback = callback;
  }


  /**
   * Reset game state, cancel requests, and reset UI
   */
  private resetForNewGame(): void {
    // Cancel any outstanding LLM requests
    this.anthropicService.cancelActiveRequests();
    
    // Reset game state
    this.gameState = this.createInitialState();
    
    // Reset memory manager
    this.memoryManager.reset();
    
    // Reset ending content flag
    this.hasShownEndingContent = false;
    
    // Reset UI state via callback
    if (this.uiResetCallback) {
      this.uiResetCallback();
    }
  }

  loadStory(story: Story): Result<GameState> {
    try {
      // Basic validation
      if (!story || !story.title || !story.flows || story.flows.length === 0) {
        return {
          success: false,
          error: 'Invalid story: missing required fields (title, flows)'
        };
      }

      // Reset everything for new game
      this.resetForNewGame();

      this.story = story;
      
      // Apply story-specific theming
      this.applyTheme(story);
      
      // Set initial state - use first flow as starting point
      const firstFlow = story.flows[0];
      if (!firstFlow) {
        return {
          success: false,
          error: 'Story must have at least one flow'
        };
      }
      
      // Set starting location from first flow, or fallback to first location
      this.gameState.currentLocation = firstFlow.location || story.locations?.[0]?.id || '';
      
      if (!this.gameState.currentLocation) {
        return {
          success: false,
          error: 'Could not determine starting location: first flow has no location and no locations defined'
        };
      }
      
      // Set starting flags from first flow
      if (firstFlow.sets) {
        firstFlow.sets.forEach(flag => this.gameState.flags.add(flag));
      }
      
      this.gameState.gameStarted = true;
      this.gameState.currentFlow = firstFlow.id;

      return {
        success: true,
        data: { ...this.gameState }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load story: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  getInitialText(): string {
    if (!this.story) return 'No story loaded. Please load a story file to begin.';
    
    const firstFlow = this.story.flows[0];
    if (!firstFlow || !firstFlow.content) {
      return 'Story loaded, but no initial content available.';
    }
    
    return this.normalizeYamlText(firstFlow.content);
  }

  /**
   * Get normalized content for a flow by its ID
   */
  getFlowContent(flowId: string): string | null {
    if (!this.story) return null;
    
    const flow = this.story.flows.find(f => f.id === flowId);
    if (!flow || !flow.content) return null;
    
    return this.normalizeYamlText(flow.content);
  }

  /**
   * Normalize YAML text by removing manual line breaks while preserving paragraph breaks
   */
  private normalizeYamlText(text: string): string {
    return text
      // Split into paragraphs (double newlines or more)
      .split(/\n\s*\n/)
      // For each paragraph, remove single line breaks but keep the text
      .map(paragraph => paragraph
        .replace(/\n/g, ' ')  // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
        .trim()               // Remove leading/trailing whitespace
      )
      // Join paragraphs back with double newlines
      .join('\n\n');
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
      // Use LLM for command interpretation when available
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

  /**
   * Process a command with the LLM using game-specific logic
   */
  /**
   * Generate ending text asynchronously without blocking the main response
   */
  private generateEndingAsynchronously(successCondition: SuccessCondition, currentLocation: any): void {
    if (!this.endingCallback) {
      console.warn('No ending callback set - cannot generate asynchronous ending');
      return;
    }

    // Show loading state
    if (this.loadingStateCallback) {
      this.loadingStateCallback('Generating conclusion...');
    }

    // Run ending generation in the background
    this.generateEndingWithLLM(successCondition, currentLocation)
      .then(endingText => {
        if (this.endingCallback) {
          this.endingCallback(endingText);
        }
      })
      .catch(error => {
        console.error('Failed to generate ending:', error);
        if (this.endingCallback) {
          this.endingCallback(`*The story concludes as you achieve: ${successCondition.description}*`);
        }
      });
  }

  /**
   * Generate ending text using LLM when success condition has no predefined ending
   */
  private async generateEndingWithLLM(successCondition: SuccessCondition, currentLocation: any): Promise<string> {
    // Add a [STORY END] interaction to memory to signal the LLM
    // what needs to happen next, rather than repeating the player command
    this.memoryManager.addMemory(
      '[STORY END]',
      `Success condition achieved: "${successCondition.description}"`,
      this.gameState
    );

    console.log(`🏁 Tracked story end signal for LLM context: "${successCondition.description}"`);
    
    // Create a simple command that will use the conversation context
    const endingCommand = '[SYSTEM] Conclude the story (as needed) to wrap up the narrative in a satisfying way and provide closure to the player.';
    
    try {
      // Get memory context for ending generation
      const memoryContext = this.memoryManager.getMemories(endingCommand, this.gameState);
      
      // Build the prompt for ending generation
      const prompt = this.promptBuilder.buildPrompt(
        endingCommand,
        this.gameState,
        this.story!,
        currentLocation,
        memoryContext
      );
      
      // Send the prompt to the LLM service
      const responseText = await this.anthropicService.makeRequest(prompt);
      
      // Parse the response
      const llmResponse = this.promptBuilder.parseResponse(responseText);
      
      // Extract just the response text, ignoring any state changes since the game has ended
      return llmResponse.response || `*The story concludes as you achieve: ${successCondition.description}*`;
    } catch (error) {
      console.error('LLM ending generation failed:', error);
      throw error;
    }
  }

  private async processCommandWithLLM(input: string, currentLocation: any, potentialChanges?: { transitions: any[], endings: any[] }): Promise<GameStateResponse> {
    try {
      // Get memory context from memory manager
      const memoryContext = this.memoryManager.getMemories(input, this.gameState);
      
      // Prepare structured debug data before making the call
      const debugGameState = {
        location: this.gameState.currentLocation,
        inventory: this.gameState.inventory,
        flags: Array.from(this.gameState.flags),
        currentFlow: this.gameState.currentFlow
      };
      
      const debugMemoryStats = this.memoryManager.getStats();
      
      // Get prompt sections for structured debugging
      const promptSections = this.promptBuilder.getSections(
        input,
        this.gameState,
        this.story!,
        currentLocation,
        memoryContext,
        potentialChanges
      );
      
      // Build the prompt using the prompt builder
      const prompt = this.promptBuilder.buildPrompt(
        input,
        this.gameState,
        this.story!,
        currentLocation,
        memoryContext,
        potentialChanges
      );
      
      // Send the prompt to the LLM service
      const responseText = await this.anthropicService.makeRequest(prompt);
      
      // Parse the response using the prompt builder (which also handles parsing)
      const result = this.promptBuilder.parseResponse(responseText);
      
      // Log the structured LLM call to debug pane
      if (this.debugPane) {
        this.debugPane.logLlmCall({
          prompt: {
            sections: promptSections,
            tokenCount: undefined // TODO: Add token counting
          },
          response: {
            raw: JSON.stringify(result, null, 2),
            parsed: result,
            tokenCount: undefined // TODO: Add token counting
          },
          gameState: debugGameState,
          memoryStats: debugMemoryStats,
          potentialChanges: potentialChanges
        });
      }
      
      return result;
    } catch (error) {
      console.error('Command processing error:', error);
      
      // Return a structured error response
      return {
        action: 'other',
        reasoning: 'API call failed',
        stateChanges: {
          newLocation: null,
          addToInventory: [],
          removeFromInventory: [],
          setFlags: [],
          unsetFlags: [],
        },
        response: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processWithLLM(input: string): Promise<GameResponse> {
    const currentLocation = this.getCurrentLocation();
    
    try {
      // Check for potential narrative changes (transitions and endings)
      const potentialChanges = this.getPotentialNarrativeChanges();
      
      const llmResponse = await this.processCommandWithLLM(input, currentLocation, potentialChanges);

      // Validate state changes and response content
      const stateValidationIssues = this.validateStateChanges(llmResponse.stateChanges);
      const responseValidationIssues = this.validateResponseContent(input, llmResponse.response, llmResponse.stateChanges);
      const allValidationIssues = [...stateValidationIssues, ...responseValidationIssues];
      
      if (allValidationIssues.length > 0) {
        // Log validation failure to debug pane
        if (this.debugPane) {
          this.debugPane.logValidationIssue({
            input,
            issues: allValidationIssues,
            gameState: {
              location: this.gameState.currentLocation,
              inventory: this.gameState.inventory,
              flags: Array.from(this.gameState.flags),
              currentFlow: this.gameState.currentFlow
            }
          });
        }
        
        // Ask LLM to retry with validation feedback
        console.log('🔄 Retrying with validation feedback:', allValidationIssues);
        return await this.retryWithValidationFeedback(input, llmResponse, allValidationIssues);
      }

      // Capture the current flow before applying state changes
      const flowBeforeStateChanges = this.getCurrentFlow();
      const previousFlowId = flowBeforeStateChanges?.id || null;

      this.applyStateChanges(llmResponse);

      // Check if we've transitioned to a new narrative flow after state changes
      let responseText = llmResponse.response;
      const currentFlow = this.getCurrentFlow();
      
      // Check if we've transitioned to a new flow
      const hasTransitionedToNewFlow = currentFlow && 
        currentFlow.id !== previousFlowId && 
        !this.gameState.gameEnded;
      
      if (hasTransitionedToNewFlow) {
        console.log(`Transitioned to new flow: ${previousFlowId} -> ${currentFlow.id}`);
        
        // Apply any sets from this flow
        this.applyFlowSets(currentFlow);
        
        // Check if this flow ends the game
        if (currentFlow.ends_game) {
          this.gameState.gameEnded = true;
          this.gameState.endingId = currentFlow.id;
          console.log('Game ended via flow:', currentFlow.name);
        }
        
        // The LLM response should already include flow content if it was provided as context
        // If the LLM response seems too brief for a flow transition, append flow content as fallback
        if (currentFlow.content && responseText.length < 100) {
          console.log('LLM response too brief for flow transition, appending flow content');
          responseText += '\n\n' + currentFlow.content;
        }
        
        // Also check traditional ending conditions if they exist
        this.checkEndingConditions();
      } else if (this.gameState.gameEnded) {
        // Game has ended, use LLM response for post-game interactions
        console.log('Post-game interaction, using LLM response:', llmResponse.response);
      }
      
      // Track this interaction in memory manager BEFORE handling endings
      // so that the final winning interaction is included in conversation context
      this.trackInteraction(input, responseText);
      
      // Note: Flow tracking is now handled locally within this method
      
      if (this.gameState.gameEnded && this.gameState.endingId && !this.hasShownEndingContent) {
        // Check if the LLM response already incorporated ending content
        const successCondition = this.story!.success_conditions?.find(sc => sc.id === this.gameState.endingId);
        if (successCondition?.ending) {
          // Check if ending content appears to be already incorporated in LLM response
          const endingKeywords = successCondition.ending.toLowerCase().split(' ').slice(0, 5).join(' ');
          const responseIncludesEnding = responseText.toLowerCase().includes(endingKeywords);
          
          if (!responseIncludesEnding && responseText.length < 150) {
            // LLM response seems too brief and doesn't include ending - append as fallback
            console.log('LLM response too brief for story ending, appending ending content');
            responseText += '\n\n' + successCondition.ending;
          }
          this.hasShownEndingContent = true;
        } else if (!successCondition?.ending) {
          // No ending text - generate with LLM asynchronously after a short delay
          this.hasShownEndingContent = true;
          setTimeout(() => {
            if (successCondition) {
              this.generateEndingAsynchronously(successCondition, currentLocation);
            }
          }, 100);
        } else {
          // Legacy ending handling
          const ending = this.story!.endings?.find(e => e.id === this.gameState.endingId);
          if (ending) {
            responseText += `\n\n${ending.content}`;
            this.hasShownEndingContent = true;
          }
        }
      }

      return {
        text: responseText,
        gameState: { ...this.gameState },
        error: llmResponse.error
      };
    } catch (error) {
      console.error('LLM processing failed:', error);
      
      // Fallback to basic command handling
      return this.handleBasicCommand(input);
    }
  }

  private applyStateChanges(llmResponse: GameStateResponse): void {
    const changes = llmResponse.stateChanges;
    console.log('🔄 Applying state changes:', changes);

    // Update location
    if (changes.newLocation) {
      this.setLocation(changes.newLocation);
    }

    // Update inventory
    if (changes.addToInventory) {
      changes.addToInventory.forEach((itemId: string) => {
        this.addItemToInventory(itemId);
      });
    }

    if (changes.removeFromInventory) {
      changes.removeFromInventory.forEach((itemId: string) => {
        this.removeItemFromInventory(itemId);
      });
    }

    // Update flags
    if (changes.setFlags) {
      changes.setFlags.forEach((flag: string) => {
        this.setFlag(flag);
      });
    }

    if (changes.unsetFlags) {
      changes.unsetFlags.forEach((flag: string) => {
        this.unsetFlag(flag);
      });
    }


    console.log('📋 Final inventory after changes:', this.gameState.inventory);

    // Check for flow transitions after state changes
    console.log('🔀 Checking flow transitions after state changes...');
    this.checkFlowTransitions();
    
    // Check for ending conditions
    console.log('🏁 Checking ending conditions...');
    this.checkEndingConditions();
  }

  private handleBasicCommand(input: string): GameResponse {
    const command = input.toLowerCase().trim();
    
    // Check if this looks like a complex command that would benefit from LLM
    if (this.isComplexCommand(input) && !this.anthropicService.isConfigured()) {
      return {
        text: `🔑 This command "${input}" would work better with AI enhancement. Set up your Anthropic API key in Settings for natural language understanding.\n\nFor now, try basic commands like: "look", "go north", "inventory", "help"`,
        gameState: this.gameState,
        error: 'API key required for enhanced commands'
      };
    }
    
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
        } else {
          this.gameState.flags.add(flag);
        }
      });
    }

    // Show available transitions
    if (currentFlow.transitions && currentFlow.transitions.length > 0) {
      text += '\n\nAvailable transitions:';
      currentFlow.transitions.forEach(transition => {
        text += `\n• To ${transition.to_flow} when: [${transition.requires.join(', ')}]`;
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
      gameStarted: false,
      gameEnded: false
    };
  }

  private applyTheme(story: Story): void {
    const colors = story.metadata.ui?.colors;
    if (colors) {
      // Apply theme only to the game content container, not the entire page
      const gameContainer = document.getElementById('themed-game-content');
      if (!gameContainer) {
        console.warn('Game container not found, cannot apply theme');
        return;
      }
      
      // Apply base colors with contrast validation
      if (colors.primary) gameContainer.style.setProperty('--game-primary-color', colors.primary);
      if (colors.background) gameContainer.style.setProperty('--game-background-color', colors.background);
      
      // Ensure text color has proper contrast against background
      let textColor = colors.text || '#ffffff';
      if (colors.background) {
        textColor = this.ensureTextContrast(textColor, colors.background);
      }
      gameContainer.style.setProperty('--game-text-color', textColor);
      
      // Set header and footer to use background color for better text readability
      if (colors.background) {
        gameContainer.style.setProperty('--game-header-bg', colors.background);
        gameContainer.style.setProperty('--game-footer-bg', colors.background);
      }
      
      // Set input background to use background color for consistency
      if (colors.background) {
        gameContainer.style.setProperty('--game-input-bg', colors.background);
      }
      
      // Derive related colors for cohesive theming with proper contrast
      if (colors.primary && colors.background) {
        
        // Make button background slightly lighter than primary
        const buttonBg = this.adjustColorBrightness(colors.primary, 30);
        gameContainer.style.setProperty('--game-button-bg', buttonBg);
        
        // Make button hover even lighter
        const buttonHover = this.adjustColorBrightness(colors.primary, 50);
        gameContainer.style.setProperty('--game-button-hover', buttonHover);
        
        // Ensure button text has proper contrast against button backgrounds
        const buttonTextColor = this.ensureTextContrast(textColor, buttonBg);
        const buttonTextHoverColor = this.ensureTextContrast(textColor, buttonHover);
        gameContainer.style.setProperty('--game-button-text-color', buttonTextColor);
        gameContainer.style.setProperty('--game-button-text-hover-color', buttonTextHoverColor);
        
        // Make border color lighter than primary
        const borderColor = this.adjustColorBrightness(colors.primary, 40);
        gameContainer.style.setProperty('--game-border-color', borderColor);
        
        // Make modal background semi-transparent version of background
        const modalBg = this.hexToRgba(colors.background, 0.95);
        gameContainer.style.setProperty('--game-modal-bg', modalBg);
      }
      
      // Ensure character and item colors have proper contrast
      if (colors.primary && colors.background) {
        const characterColor = this.ensureTextContrast(colors.primary, colors.background);
        gameContainer.style.setProperty('--game-character-color', characterColor);
        
        // For items, we want a golden color but ensure it contrasts
        const itemColor = this.ensureTextContrast('#ffd700', colors.background);
        gameContainer.style.setProperty('--game-item-color', itemColor);
        
        // Set item background colors based on item color
        const itemBg = this.hexToRgba(itemColor, 0.2);
        const itemBgHover = this.hexToRgba(itemColor, 0.3);
        const itemBorder = this.hexToRgba(itemColor, 0.3);
        
        gameContainer.style.setProperty('--game-item-bg', itemBg);
        gameContainer.style.setProperty('--game-item-bg-hover', itemBgHover);
        gameContainer.style.setProperty('--game-item-border', itemBorder);
      }
      
      // Set theme-aware alert colors
      if (colors.background) {
        // Warning alert (amber/yellow)
        const warningColor = this.ensureTextContrast('#ffc107', colors.background);
        const warningBg = this.hexToRgba(warningColor, 0.15);
        gameContainer.style.setProperty('--alert-warning-color', warningColor);
        gameContainer.style.setProperty('--alert-warning-bg', warningBg);
        gameContainer.style.setProperty('--alert-warning-border', warningColor);
        
        // Discovery alert (green)
        const discoveryColor = this.ensureTextContrast('#28a745', colors.background);
        const discoveryBg = this.hexToRgba(discoveryColor, 0.15);
        gameContainer.style.setProperty('--alert-discovery-color', discoveryColor);
        gameContainer.style.setProperty('--alert-discovery-bg', discoveryBg);
        gameContainer.style.setProperty('--alert-discovery-border', discoveryColor);
        
        // Danger alert (red)
        const dangerColor = this.ensureTextContrast('#dc3545', colors.background);
        const dangerBg = this.hexToRgba(dangerColor, 0.15);
        const dangerPulse = this.hexToRgba(dangerColor, 0.3);
        const dangerPulseFaint = this.hexToRgba(dangerColor, 0.1);
        gameContainer.style.setProperty('--alert-danger-color', dangerColor);
        gameContainer.style.setProperty('--alert-danger-bg', dangerBg);
        gameContainer.style.setProperty('--alert-danger-border', dangerColor);
        gameContainer.style.setProperty('--alert-danger-pulse', dangerPulse);
        gameContainer.style.setProperty('--alert-danger-pulse-faint', dangerPulseFaint);
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

  private getLuminance(hex: string): number {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Apply gamma correction
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    const rLinear = toLinear(r);
    const gLinear = toLinear(g);
    const bLinear = toLinear(b);
    
    // Calculate relative luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  private getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private ensureTextContrast(textColor: string, backgroundColor: string, minRatio: number = 4.5): string {
    const currentRatio = this.getContrastRatio(textColor, backgroundColor);
    
    if (currentRatio >= minRatio) {
      return textColor; // Already has good contrast
    }
    
    // If contrast is poor, determine if background is dark or light
    const bgLuminance = this.getLuminance(backgroundColor);
    
    // If background is dark, use light text; if light, use dark text
    if (bgLuminance < 0.5) {
      // Dark background - use white or very light color
      const lightOptions = ['#ffffff', '#f8f8f8', '#f0f0f0', '#e8e8e8', '#e0e0e0'];
      for (const option of lightOptions) {
        if (this.getContrastRatio(option, backgroundColor) >= minRatio) {
          return option;
        }
      }
      return '#ffffff'; // Fallback to white
    } else {
      // Light background - use black or very dark color
      const darkOptions = ['#000000', '#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'];
      for (const option of darkOptions) {
        if (this.getContrastRatio(option, backgroundColor) >= minRatio) {
          return option;
        }
      }
      return '#000000'; // Fallback to black
    }
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getCurrentStoryTitle(): string | null {
    return this.story?.title || null;
  }

  /**
   * Get item by ID, name, or display_name for rich text rendering
   */
  getItem(itemIdentifier: string): { name: string; display_name?: string } | undefined {
    if (!this.story) return undefined;
    
    // Search by id, name, or display_name
    const item = this.story.items.find(i => 
      i.id === itemIdentifier || 
      i.name === itemIdentifier || 
      i.display_name === itemIdentifier
    );
    
    if (!item) return undefined;
    
    return {
      name: item.name,
      display_name: item.display_name
    };
  }

  // Action-based state management methods
  addItemToInventory(itemId: string): Result<void> {
    try {
      if (!this.gameState.inventory.includes(itemId)) {
        this.gameState.inventory.push(itemId);
        console.log(`Added to inventory: ${itemId}`);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add item to inventory: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  removeItemFromInventory(itemId: string): Result<void> {
    try {
      const index = this.gameState.inventory.indexOf(itemId);
      if (index > -1) {
        this.gameState.inventory.splice(index, 1);
        console.log(`Removed from inventory: ${itemId}`);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove item from inventory: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  setFlag(flagName: string): Result<void> {
    try {
      this.gameState.flags.add(flagName);
      console.log(`Set flag: ${flagName}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set flag: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  unsetFlag(flagName: string): Result<void> {
    try {
      this.gameState.flags.delete(flagName);
      console.log(`Unset flag: ${flagName}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to unset flag: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  setLocation(locationId: string): Result<void> {
    try {
      if (!this.story) {
        return {
          success: false,
          error: 'No story loaded'
        };
      }
      
      const location = this.story.locations.find(loc => loc.id === locationId);
      if (!location) {
        return {
          success: false,
          error: `Location not found: ${locationId}`
        };
      }
      
      console.log(`Location changed: ${this.gameState.currentLocation} -> ${locationId}`);
      this.gameState.currentLocation = locationId;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set location: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private isComplexCommand(input: string): boolean {
    const complexPatterns = [
      /^(examine|inspect|study|analyze|investigate|check out|look at|search)/i,
      /^(talk to|speak with|chat with|converse with|ask|tell)/i,
      /^(pick up|take|grab|collect|get|obtain)/i,
      /^(use|utilize|operate|activate|press|push|pull)/i,
      /^(open|close|unlock|lock)/i,
      /^(eat|drink|consume|taste)/i,
      /^(throw|toss|drop|place|put)/i,
      /^(climb|jump|swim|run|crawl)/i,
      /^(listen|smell|touch|feel)/i,
      /and|with|the|a|an|from|to|in|on|under|behind|beside/i // Complex sentence structure
    ];
    
    return complexPatterns.some(pattern => pattern.test(input)) || 
           input.split(' ').length > 3 || // Long commands
           input.includes('?'); // Questions
  }

  private getPotentialNarrativeChanges(): { transitions: any[], endings: any[] } {
    const changes: { transitions: any[], endings: any[] } = { transitions: [], endings: [] };

    // Check for potential flow transitions
    const currentFlow = this.getCurrentFlow();
    if (currentFlow?.transitions) {
      for (const transition of currentFlow.transitions) {
        const unmetRequirements = transition.requires.filter(requirement => {
          return !this.evaluateCondition(requirement);
        });

        // If only 1-2 requirements are unmet, this transition is likely
        if (unmetRequirements.length <= 2) {
          const targetFlow = this.story?.flows.find(f => f.id === transition.to_flow);
          if (targetFlow) {
            changes.transitions.push({
              type: 'flow_transition',
              targetFlow,
              isLikely: unmetRequirements.length <= 1,
              content: targetFlow.content
            });
          }
        }
      }
    }

    // Check for potential endings
    if (this.story?.success_conditions) {
      for (const condition of this.story.success_conditions) {
        if (!condition.ending) continue; // Skip conditions without ending text

        const unmetRequirements = condition.requires.filter(requirement => {
          return !this.evaluateCondition(requirement);
        });

        // If only 1-2 requirements are unmet, this ending is likely
        if (unmetRequirements.length <= 2) {
          changes.endings.push({
            type: 'story_ending',
            condition,
            isLikely: unmetRequirements.length <= 1,
            content: condition.ending
          });
        }
      }
    }

    return changes;
  }

  private checkFlowTransitions(): void {
    if (!this.story || !this.gameState.currentFlow) {
      console.log('Flow transition check skipped: no story or current flow');
      return;
    }

    const currentFlow = this.getCurrentFlow();
    if (!currentFlow) {
      console.log('Flow transition check skipped: current flow not found');
      return;
    }

    console.log(`Checking flow transitions for: ${currentFlow.id} (${currentFlow.name})`);
    console.log('Current flags:', Array.from(this.gameState.flags));
    console.log('Current inventory:', this.gameState.inventory);

    // Check new transition system
    if (currentFlow.transitions) {
      console.log(`Found ${currentFlow.transitions.length} transitions`);
      for (const transition of currentFlow.transitions) {
        console.log(`Evaluating transition requirements: [${transition.requires.join(', ')}]`);
        
        // Check if all requirements are met (analogous to success conditions)
        const requirementsMet = transition.requires.every(requirement => {
          const result = this.evaluateCondition(requirement);
          console.log(`  - Requirement "${requirement}": ${result}`);
          return result;
        });
        
        console.log(`All requirements met: ${requirementsMet}`);
        
        if (requirementsMet) {
          console.log(`✅ Flow transition triggered: ${currentFlow.id} -> ${transition.to_flow}`);
          this.gameState.currentFlow = transition.to_flow;
          
          // Apply flow sets if the target flow has them
          const targetFlow = this.story.flows.find(f => f.id === transition.to_flow);
          if (targetFlow) {
            console.log(`Applying sets from target flow: ${targetFlow.id}`);
            this.applyFlowSets(targetFlow);
          }
          
          return; // Exit after first successful transition
        }
      }
    } else {
      console.log('No transitions found');
    }
    
    console.log('Flow transition check complete');
  }




  private applyFlowSets(flow: Flow): void {
    if (!flow.sets) return;
    
    flow.sets.forEach(flag => {
      this.gameState.flags.add(flag);
    });
  }

  private evaluateCondition(condition: string): boolean {
    console.log(`🔍 Evaluating condition: "${condition}"`);
    
    // Parse different condition types
    if (condition.startsWith('has_item:')) {
      const itemId = condition.substring('has_item:'.length);
      const hasItem = this.gameState.inventory.includes(itemId);
      console.log(`  has_item check: "${itemId}" in [${this.gameState.inventory.join(', ')}] = ${hasItem}`);
      return hasItem;
    }
    
    if (condition.startsWith('location:')) {
      const location = condition.substring('location:'.length);
      const atLocation = this.gameState.currentLocation === location;
      console.log(`  location check: "${location}" === "${this.gameState.currentLocation}" = ${atLocation}`);
      return atLocation;
    }
    
    // Check if condition is an item ID or name/alias (for success conditions)
    if (this.story) {
      // First try exact item ID match
      if (this.gameState.inventory.includes(condition)) {
        console.log(`  direct item ID check: "${condition}" found in inventory = true`);
        return true;
      }
      
      // Then try to find item by name or alias
      const item = this.story.items.find(item => {
        if (item.id === condition) return true;
        if (item.name === condition) return true;
        if (item.aliases && item.aliases.includes(condition)) return true;
        return false;
      });
      
      if (item && this.gameState.inventory.includes(item.id)) {
        console.log(`  item name/alias check: "${condition}" maps to "${item.id}" found in inventory = true`);
        return true;
      }
    }
    
    // Everything else is treated as a natural language flag (with normalization)
    if (this.hasFlagNormalized(condition)) {
      console.log(`  flag check: "${condition}" found in flags = true`);
      return true;
    }
    
    console.log(`  condition not met: "${condition}" = false`);
    return false;
  }

  private checkEndingConditions(): void {
    if (!this.story || this.gameState.gameEnded) return;

    // Format v2: Check success conditions first (higher priority)
    if (this.story.success_conditions) {
      const matchedCondition = this.checkSuccessConditions();
      if (matchedCondition) {
        this.gameState.gameEnded = true;
        this.gameState.endingId = matchedCondition.id;
        console.log(`Game ended with success condition: ${matchedCondition.description}`);
        return;
      }
    }

    // Fallback to traditional endings
    if (this.story.endings) {
      for (const ending of this.story.endings) {
        const requirementsMet = ending.requires.every(requirement => {
          return this.evaluateCondition(requirement);
        });
        
        if (requirementsMet) {
          this.gameState.gameEnded = true;
          this.gameState.endingId = ending.id;
          console.log(`Game ended with ending: ${ending.name}`);
          break;
        }
      }
    }
  }

  private checkSuccessConditions(): any {
    if (!this.story?.success_conditions) return null;

    for (const condition of this.story.success_conditions) {
      // Check if all requirements are met
      const requirementsMet = condition.requires.every(requirement => {
        return this.evaluateCondition(requirement);
      });

      if (requirementsMet) {
        console.log(`✅ Success condition matched: ${condition.description}`);
        return condition;
      }
    }

    return null;
  }

  /**
   * Normalize flag names by treating underscores and spaces as identical
   */
  private normalizeFlag(flag: string): string {
    return flag.replace(/\s+/g, '_').toLowerCase();
  }

  /**
   * Check if a flag exists with normalization (treats spaces and underscores as identical)
   */
  private hasFlagNormalized(flag: string): boolean {
    const normalizedFlag = this.normalizeFlag(flag);
    for (const existingFlag of this.gameState.flags) {
      if (this.normalizeFlag(existingFlag) === normalizedFlag) {
        return true;
      }
    }
    return false;
  }



  private validateStateChanges(stateChanges: any): string[] {
    const issues: string[] = [];
    
    // Check if emergent content is enabled for this story
    const emergentContentEnabled = this.story?.metadata?.emergent_content?.enabled === true;
    
    // Validate inventory additions
    if (stateChanges.addToInventory) {
      stateChanges.addToInventory.forEach((itemId: string) => {
        if (!this.validateItemDiscovery(itemId)) {
          const item = this.story!.items.find(i => i.id === itemId);
          if (item) {
            if (item.discoverable_in) {
              issues.push(`INVALID: Cannot obtain "${item.name}" (${itemId}) in current location. This item can only be found in "${item.discoverable_in}".`);
            } else if (item.location) {
              issues.push(`INVALID: Cannot obtain "${item.name}" (${itemId}) in current location. This item is only available in "${item.location}".`);
            } else {
              issues.push(`INVALID: Cannot obtain "${item.name}" (${itemId}) - item has no accessible location.`);
            }
          } else if (!emergentContentEnabled) {
            // Only block unknown items if emergent content is disabled
            issues.push(`INVALID: Cannot obtain unknown item ${itemId}.`);
          }
          // If emergent content is enabled, allow unknown items to be added without validation issues
        }
      });
    }
    
    return issues;
  }

  private validateResponseContent(playerInput: string, responseText: string, stateChanges: any): string[] {
    const issues: string[] = [];
    
    // Check if this was a discovery command
    const discoveryCommands = ['check', 'examine', 'inspect', 'search', 'look', 'rummage', 'explore'];
    const inputLower = playerInput.toLowerCase();
    const isDiscoveryCommand = discoveryCommands.some(cmd => inputLower.includes(cmd));
    
    if (isDiscoveryCommand) {
      // Check for taking language in the response - be more contextual to avoid false positives
      const takingPatterns = [
        /\byou\s+(grab|take|pick\s+up|scoop|collect|clutch|seize|snatch)\b/i,
        /\b(grabbing|taking|picking\s+up|scooping|collecting|clutching|seizing|snatching)\b/i
      ];
      const containsTakingLanguage = takingPatterns.some(pattern => pattern.test(responseText));
      
      // Also check if items were added to inventory (this is the definitive check)
      const itemsAdded = stateChanges.addToInventory?.length > 0;
      
      if (containsTakingLanguage || itemsAdded) {
        issues.push(`INVALID: Discovery command "${playerInput}" should not include taking actions. Response contained taking language or added items to inventory. Discovery should stop at "you spot/see/notice".`);
      }
    }
    
    return issues;
  }

  public setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
    
    // Set it on the memory manager for memory operation logging
    this.memoryManager.setDebugPane(debugPane);
    
    // No longer need legacy debug callback - structured logging provides better visibility
  }

  private async retryWithValidationFeedback(
    originalInput: string, 
    failedResponse: any, 
    validationIssues: string[]
  ): Promise<GameResponse> {
    // Log retry initiation to debug pane
    if (this.debugPane) {
      this.debugPane.logRetry(originalInput, `Validation failed: ${validationIssues.length} issues found`);
    }
    
    const feedbackPrompt = `VALIDATION FAILED for command "${originalInput}".

Issues found:
${validationIssues.map(issue => `- ${issue}`).join('\n')}

Your previous response tried to: ${failedResponse.reasoning}

Please provide a corrected response that:
1. Acknowledges the player's attempt
2. Explains why the action cannot be completed as requested
3. Does NOT add invalid items to inventory
4. Suggests appropriate alternatives (like going to the correct location first)

Remember: Items can only be obtained in their designated locations according to the story data.`;

    try {
      const correctedResponse = await this.processCommandWithLLM(feedbackPrompt, this.getCurrentLocation(), undefined);

      // Capture the current flow before applying state changes
      const flowBeforeStateChanges = this.getCurrentFlow();
      const previousFlowId = flowBeforeStateChanges?.id || null;

      // Apply the corrected state changes (should be valid now)
      this.applyStateChanges(correctedResponse);

      // Continue with normal flow processing
      let responseText = correctedResponse.response;
      const currentFlow = this.getCurrentFlow();
      
      const hasTransitionedToNewFlow = currentFlow && 
        currentFlow.id !== previousFlowId && 
        currentFlow.type === 'narrative' && 
        currentFlow.content && 
        !this.gameState.gameEnded;
      
      if (hasTransitionedToNewFlow) {
        responseText = currentFlow.content || '';
        this.applyFlowSets(currentFlow);
        
        if (currentFlow.ends_game) {
          this.gameState.gameEnded = true;
          this.gameState.endingId = currentFlow.id;
        }
        
        this.checkEndingConditions();
      }
      
      // Handle ending content for success conditions
      if (this.gameState.gameEnded && this.gameState.endingId) {
        // Format v2: Check for success condition ending first
        const successCondition = this.story!.success_conditions?.find(sc => sc.id === this.gameState.endingId);
        if (successCondition) {
          responseText += `\n\n${successCondition.ending}`;
        } else {
          // Fallback: Check if ending is defined as a separate ending (legacy)
          const ending = this.story!.endings?.find(e => e.id === this.gameState.endingId);
          if (ending) {
            responseText += `\n\n${ending.content}`;
          }
        }
      }
      
      // Track this interaction in memory manager BEFORE handling endings
      this.trackInteraction(originalInput, responseText);
      
      // Note: Flow tracking is now handled locally within each method

      return {
        text: responseText,
        gameState: { ...this.gameState },
        error: correctedResponse.error
      };
    } catch (error) {
      console.error('Failed to get corrected response:', error);
      
      // Fallback to a generic error message
      return {
        text: `You can't do that here. ${validationIssues[0]?.split(': ')[1] || 'Try something else.'}`,
        gameState: { ...this.gameState },
        error: 'Validation failed and retry failed'
      };
    }
  }

  private validateItemDiscovery(itemId: string): boolean {
    if (!this.story) return false;
    
    const item = this.story.items.find(i => i.id === itemId);
    if (!item) return false;
    
    // If item has a direct location, it's accessible in that location
    if (item.location === this.gameState.currentLocation) {
      return true;
    }
    
    // If item is discoverable_in current location, it's accessible
    if (item.discoverable_in === this.gameState.currentLocation) {
      return true;
    }
    
    // Enhanced discovery logic: Check if player has recently examined discovery objects
    if (item.discovery_objects) {
      const memoryContext = this.memoryManager.getMemories();
      const recentInteractions = memoryContext.recentInteractions;
      
      // Extract recent inputs from the formatted context
      const hasExaminedDiscoveryObject = item.discovery_objects.some(obj => 
        recentInteractions.toLowerCase().includes(`examine ${obj.toLowerCase()}`) ||
        recentInteractions.toLowerCase().includes(`open ${obj.toLowerCase()}`) ||
        recentInteractions.toLowerCase().includes(`check ${obj.toLowerCase()}`) ||
        recentInteractions.toLowerCase().includes(`look ${obj.toLowerCase()}`)
      );
      
      if (hasExaminedDiscoveryObject && item.discoverable_in === this.gameState.currentLocation) {
        console.log(`Item ${itemId} is discoverable - player has examined discovery objects: ${item.discovery_objects}`);
        return true;
      }
    }
    
    return false;
  }

  private trackInteraction(playerInput: string, llmResponse: string): void {
    // Add to memory manager (importance determined automatically)
    this.memoryManager.addMemory(playerInput, llmResponse, this.gameState);

    console.log(`💭 Tracked interaction: "${playerInput}" -> "${llmResponse.substring(0, 50)}..."`);
  }


  getAnthropicService(): AnthropicService {
    return this.anthropicService;
  }

  /**
   * Track story start text in memory manager for LLM context
   */
  trackStartText(startText: string): void {
    // Add start text as a special interaction for LLM context
    this.memoryManager.addMemory('[STORY START]', startText, this.gameState);

    console.log(`📖 Tracked story start text for LLM context: "${startText.substring(0, 50)}..."`);
  }

  saveGame(): string {
    return JSON.stringify({
      gameState: {
        ...this.gameState,
        flags: Array.from(this.gameState.flags)
      },
      memoryState: this.memoryManager.exportState(),
      storyTitle: this.story?.title
    });
  }

  loadGame(saveData: string): Result<GameState> {
    try {
      const data = JSON.parse(saveData);
      
      if (!this.story) {
        return {
          success: false,
          error: 'No story loaded. Load a story before attempting to load a saved game.'
        };
      }
      
      if (data.storyTitle !== this.story.title) {
        return {
          success: false,
          error: `Save file is for "${data.storyTitle}" but current story is "${this.story.title}"`
        };
      }

      if (!data.gameState) {
        return {
          success: false,
          error: 'Invalid save file format: missing gameState'
        };
      }

      // Cancel any outstanding requests
      this.anthropicService.cancelActiveRequests();

      this.gameState = {
        ...data.gameState,
        flags: new Set(data.gameState.flags)
      };

      // Load memory state if available
      if (data.memoryState) {
        this.memoryManager.importState(data.memoryState);
      } else {
        this.memoryManager.reset();
      }

      // Restore UI state to match loaded game state
      if (this.uiRestoreCallback) {
        const conversationHistory = this.memoryManager.getRecentInteractions();
        this.uiRestoreCallback(this.gameState, conversationHistory);
      }

      return {
        success: true,
        data: { ...this.gameState }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load save file: ${error instanceof Error ? error.message : 'Invalid JSON format'}`
      };
    }
  }
}