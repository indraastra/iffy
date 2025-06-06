import { Story, GameState, PlayerAction, GameResponse, Flow, FlowTransition, InteractionPair } from '@/types/story';
import { AnthropicService, LLMResponse } from '@/services/anthropicService';

export class GameEngine {
  private story: Story | null = null;
  private gameState: GameState = this.createInitialState();
  private anthropicService: AnthropicService;
  private previousFlow: string | null = null;
  private debugPane: any = null;

  constructor() {
    this.anthropicService = new AnthropicService();
  }

  loadStory(story: Story): void {
    this.story = story;
    this.gameState = this.createInitialState();
    this.previousFlow = null; // Reset flow tracking
    
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

      // Validate state changes and response content
      const stateValidationIssues = this.validateStateChanges(llmResponse.stateChanges);
      const responseValidationIssues = this.validateResponseContent(input, llmResponse.response, llmResponse.stateChanges);
      const allValidationIssues = [...stateValidationIssues, ...responseValidationIssues];
      
      if (allValidationIssues.length > 0) {
        // Log validation failure to debug pane
        if (this.debugPane) {
          this.debugPane.logValidation(allValidationIssues, input);
        }
        
        // Ask LLM to retry with validation feedback
        console.log('🔄 Retrying with validation feedback:', allValidationIssues);
        return await this.retryWithValidationFeedback(input, llmResponse, allValidationIssues);
      }

      this.applyStateChanges(llmResponse);

      // Check if we've transitioned to a new narrative flow
      let responseText = llmResponse.response;
      const currentFlow = this.getCurrentFlow();
      
      // Only show flow content if we've just transitioned to a new narrative flow
      const hasTransitionedToNewFlow = currentFlow && 
        currentFlow.id !== this.previousFlow && 
        currentFlow.type === 'narrative' && 
        currentFlow.content && 
        !this.gameState.gameEnded;
      
      if (hasTransitionedToNewFlow) {
        console.log(`Transitioned to new narrative flow: ${this.previousFlow} -> ${currentFlow.id}`);
        responseText = currentFlow.content || '';
        
        // Apply any sets from this narrative flow
        this.applyFlowSets(currentFlow);
        
        // Check if this flow ends the game
        if (currentFlow.ends_game) {
          this.gameState.gameEnded = true;
          this.gameState.endingId = currentFlow.id;
          console.log('Game ended via narrative flow:', currentFlow.name);
        }
        
        // Also check traditional ending conditions if they exist
        this.checkEndingConditions();
      } else if (this.gameState.gameEnded) {
        // Game has ended, use LLM response for post-game interactions
        console.log('Post-game interaction, using LLM response:', llmResponse.response);
      }
      
      // Update previous flow tracking
      if (currentFlow) {
        this.previousFlow = currentFlow.id;
      }
      
      if (this.gameState.gameEnded && this.gameState.endingId) {
        // Check if ending is defined as a separate ending (legacy)
        const ending = this.story!.endings?.find(e => e.id === this.gameState.endingId);
        if (ending) {
          responseText += `\n\n${ending.content}`;
        }
        // If ending is defined as a flow, the content is already included above
      }

      // Track this interaction for conversation memory
      this.trackInteraction(input, responseText);

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

  private applyStateChanges(llmResponse: LLMResponse): void {
    const changes = llmResponse.stateChanges;
    console.log('🔄 Applying state changes:', changes);

    // Update location
    if (changes.newLocation) {
      console.log(`Location changed: ${this.gameState.currentLocation} -> ${changes.newLocation}`);
      this.gameState.currentLocation = changes.newLocation;
    }

    // Update inventory
    if (changes.addToInventory) {
      changes.addToInventory.forEach(itemId => {
        if (!this.gameState.inventory.includes(itemId)) {
          console.log(`Added to inventory: ${itemId}`);
          this.gameState.inventory.push(itemId);
        }
      });
    }

    if (changes.removeFromInventory) {
      changes.removeFromInventory.forEach(itemId => {
        const index = this.gameState.inventory.indexOf(itemId);
        if (index > -1) {
          console.log(`Removed from inventory: ${itemId}`);
          this.gameState.inventory.splice(index, 1);
        }
      });
    }

    // Update flags
    if (changes.setFlags) {
      changes.setFlags.forEach(flag => {
        console.log(`Set flag: ${flag}`);
        this.gameState.flags.add(flag);
      });
    }

    if (changes.unsetFlags) {
      changes.unsetFlags.forEach(flag => {
        console.log(`Unset flag: ${flag}`);
        this.gameState.flags.delete(flag);
      });
    }

    // Update knowledge
    if (changes.addKnowledge) {
      changes.addKnowledge.forEach(knowledge => {
        console.log(`Added knowledge: ${knowledge}`);
        this.gameState.knowledge.add(knowledge);
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
      gameEnded: false,
      conversationMemory: {
        immediateContext: {
          recentInteractions: []
        },
        significantMemories: []
      }
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
    console.log('Current inventory:', this.gameState.inventory);

    // Check completion transitions first (these are condition-based)
    if (currentFlow.completion_transitions) {
      console.log(`Found ${currentFlow.completion_transitions.length} completion transitions`);
      for (const transition of currentFlow.completion_transitions) {
        console.log(`Evaluating condition: ${transition.condition}`);
        const conditionMet = this.evaluateCondition(transition.condition);
        console.log(`Condition "${transition.condition}" result: ${conditionMet}`);
        
        if (conditionMet) {
          // Check if target flow's requirements are met
          const targetFlow = this.story.flows.find(f => f.id === transition.to_flow);
          if (targetFlow) {
            const targetRequirementsMet = this.checkFlowRequirements(targetFlow);
            console.log(`Target flow "${targetFlow.id}" requirements met: ${targetRequirementsMet}`);
            
            if (!targetRequirementsMet) {
              console.log(`⚠️ Transition blocked: target flow requirements not met`);
              continue; // Try next transition
            }
          }
          
          console.log(`✅ Completion transition triggered: ${currentFlow.id} -> ${transition.to_flow}`);
          this.gameState.currentFlow = transition.to_flow;
          
          // Apply flow sets if the target flow has them
          if (targetFlow) {
            console.log(`Applying sets from target flow: ${targetFlow.id}`);
            this.applyFlowSets(targetFlow);
          }
          
          return; // Exit after first successful transition
        }
      }
    } else {
      console.log('No completion transitions found');
    }

    // Check regular flow transitions (trigger-based)
    if (currentFlow.next) {
      console.log(`Found ${currentFlow.next.length} regular transitions`);
      for (const transition of currentFlow.next) {
        if (this.canTriggerTransition(transition)) {
          console.log(`Flow transition: ${currentFlow.id} -> ${transition.flow_id}`);
          this.gameState.currentFlow = transition.flow_id;
          break;
        }
      }
    } else {
      console.log('No regular transitions found');
    }
    
    console.log('Flow transition check complete');
  }

  private canTriggerTransition(_transition: FlowTransition): boolean {
    // For now, implement basic trigger checking
    // This can be enhanced based on the specific trigger logic needed
    return true; // Allow all transitions for MVP
  }


  private checkFlowRequirements(flow: Flow): boolean {
    if (!flow.requirements) {
      console.log(`  Flow "${flow.id}" has no requirements - allowing`);
      return true;
    }
    
    console.log(`  Checking requirements for flow "${flow.id}": [${flow.requirements.join(', ')}]`);
    
    const allMet = flow.requirements.every(requirement => {
      const met = this.evaluateCondition(requirement);
      console.log(`    Requirement "${requirement}": ${met}`);
      return met;
    });
    
    console.log(`  All requirements for "${flow.id}" met: ${allMet}`);
    return allMet;
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
    
    if (condition.startsWith('flag:')) {
      const flag = condition.substring('flag:'.length);
      const hasFlag = this.gameState.flags.has(flag);
      console.log(`  flag check: "${flag}" in [${Array.from(this.gameState.flags).join(', ')}] = ${hasFlag}`);
      return hasFlag;
    }
    
    if (condition.startsWith('knows:')) {
      const knowledge = condition.substring('knows:'.length);
      const hasKnowledge = this.gameState.knowledge.has(knowledge);
      console.log(`  knowledge check: "${knowledge}" in [${Array.from(this.gameState.knowledge).join(', ')}] = ${hasKnowledge}`);
      return hasKnowledge;
    }
    
    if (condition.startsWith('location:')) {
      const location = condition.substring('location:'.length);
      const atLocation = this.gameState.currentLocation === location;
      console.log(`  location check: "${location}" === "${this.gameState.currentLocation}" = ${atLocation}`);
      return atLocation;
    }
    
    // Direct flag check (no prefix)
    if (this.gameState.flags.has(condition)) {
      console.log(`  direct flag check: "${condition}" found in flags = true`);
      return true;
    }
    
    // Direct knowledge check
    if (this.gameState.knowledge.has(condition)) {
      console.log(`  direct knowledge check: "${condition}" found in knowledge = true`);
      return true;
    }
    
    console.log(`  condition not met: "${condition}" = false`);
    return false;
  }

  private checkEndingConditions(): void {
    if (!this.story || this.gameState.gameEnded || !this.story.endings) return;

    for (const ending of this.story.endings) {
      if (this.checkFlowRequirements({ requirements: ending.requires } as Flow)) {
        this.gameState.gameEnded = true;
        this.gameState.endingId = ending.id;
        console.log(`Game ended with ending: ${ending.name}`);
        break;
      }
    }
  }

  private validateStateChanges(stateChanges: any): string[] {
    const issues: string[] = [];
    
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
          } else {
            issues.push(`INVALID: Cannot obtain unknown item ${itemId}.`);
          }
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
      // Check for taking language in the response
      const takingWords = ['grab', 'take', 'pick up', 'scoop', 'collect', 'clutch', 'seize', 'snatch'];
      const responseLower = responseText.toLowerCase();
      const containsTakingLanguage = takingWords.some(word => responseLower.includes(word));
      
      // Also check if items were added to inventory (double validation)
      const itemsAdded = stateChanges.addToInventory?.length > 0;
      
      if (containsTakingLanguage || itemsAdded) {
        issues.push(`INVALID: Discovery command "${playerInput}" should not include taking actions. Response contained taking language or added items to inventory. Discovery should stop at "you spot/see/notice".`);
      }
    }
    
    return issues;
  }

  public setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
    // Also set it on the anthropic service
    this.anthropicService.setDebugCallback((prompt: string, response: string) => {
      if (prompt) debugPane.logRequest(prompt);
      if (response) debugPane.logResponse(response);
    });
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
      const correctedResponse = await this.anthropicService.processCommand(
        feedbackPrompt,
        this.gameState,
        this.story!,
        this.getCurrentLocation()
      );

      // Apply the corrected state changes (should be valid now)
      this.applyStateChanges(correctedResponse);

      // Continue with normal flow processing
      let responseText = correctedResponse.response;
      const currentFlow = this.getCurrentFlow();
      
      const hasTransitionedToNewFlow = currentFlow && 
        currentFlow.id !== this.previousFlow && 
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
      
      if (currentFlow) {
        this.previousFlow = currentFlow.id;
      }

      // Track this interaction for conversation memory
      this.trackInteraction(originalInput, responseText);

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
    
    return false;
  }

  private trackInteraction(playerInput: string, llmResponse: string): void {
    if (!this.gameState.conversationMemory) {
      this.gameState.conversationMemory = {
        immediateContext: { recentInteractions: [] },
        significantMemories: []
      };
    }

    // Determine importance based on content length and keywords
    const importance = this.determineInteractionImportance(playerInput, llmResponse);

    const interaction: InteractionPair = {
      playerInput,
      llmResponse,
      timestamp: new Date(),
      importance
    };

    // Add to recent interactions
    this.gameState.conversationMemory.immediateContext.recentInteractions.push(interaction);

    // Keep only last 5 interactions for Phase 1
    const maxRecentInteractions = 5;
    if (this.gameState.conversationMemory.immediateContext.recentInteractions.length > maxRecentInteractions) {
      this.gameState.conversationMemory.immediateContext.recentInteractions = 
        this.gameState.conversationMemory.immediateContext.recentInteractions.slice(-maxRecentInteractions);
    }

    console.log(`💭 Tracked interaction (${importance} importance): "${playerInput}" -> "${llmResponse.substring(0, 50)}..."`);
    
    // Log to debug pane if available
    if (this.debugPane) {
      this.debugPane.logMemory(this.gameState.conversationMemory, importance);
    }
  }

  private determineInteractionImportance(playerInput: string, llmResponse: string): 'low' | 'medium' | 'high' {
    // Simple heuristics for Phase 1
    const combinedText = (playerInput + ' ' + llmResponse).toLowerCase();
    
    // High importance indicators
    const highImportanceKeywords = ['find', 'discover', 'reveal', 'secret', 'important', 'remember', 'promise', 'love', 'hate', 'trust', 'betray'];
    if (highImportanceKeywords.some(keyword => combinedText.includes(keyword))) {
      return 'high';
    }
    
    // Medium importance indicators
    const mediumImportanceKeywords = ['character', 'conversation', 'tell', 'ask', 'explain', 'story', 'past', 'future'];
    if (mediumImportanceKeywords.some(keyword => combinedText.includes(keyword)) || llmResponse.length > 200) {
      return 'medium';
    }
    
    return 'low';
  }

  getAnthropicService(): AnthropicService {
    return this.anthropicService;
  }

  saveGame(): string {
    return JSON.stringify({
      gameState: {
        ...this.gameState,
        flags: Array.from(this.gameState.flags),
        knowledge: Array.from(this.gameState.knowledge),
        conversationMemory: this.gameState.conversationMemory ? {
          ...this.gameState.conversationMemory,
          // Convert timestamps to strings for JSON serialization
          immediateContext: {
            ...this.gameState.conversationMemory.immediateContext,
            recentInteractions: this.gameState.conversationMemory.immediateContext.recentInteractions.map(interaction => ({
              ...interaction,
              timestamp: interaction.timestamp.toISOString()
            }))
          },
          significantMemories: this.gameState.conversationMemory.significantMemories.map(memory => ({
            ...memory,
            lastAccessed: memory.lastAccessed.toISOString()
          }))
        } : undefined
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
        knowledge: new Set(data.gameState.knowledge),
        conversationMemory: data.gameState.conversationMemory ? {
          ...data.gameState.conversationMemory,
          // Convert timestamp strings back to Date objects
          immediateContext: {
            ...data.gameState.conversationMemory.immediateContext,
            recentInteractions: data.gameState.conversationMemory.immediateContext.recentInteractions.map((interaction: any) => ({
              ...interaction,
              timestamp: new Date(interaction.timestamp)
            }))
          },
          significantMemories: data.gameState.conversationMemory.significantMemories.map((memory: any) => ({
            ...memory,
            lastAccessed: new Date(memory.lastAccessed)
          }))
        } : {
          immediateContext: { recentInteractions: [] },
          significantMemories: []
        }
      };

      return true;
    } catch {
      return false;
    }
  }
}