import { SignificantMemory, InteractionPair, GameState } from '@/types/story';
import { AnthropicService } from '@/services/anthropicService';

/**
 * Memory context returned by MemoryManager for prompt building
 */
export interface MemoryContext {
  recentInteractions: string; // Formatted recent interactions
  significantMemories: string; // Formatted significant memories
  stats: {
    recentCount: number;
    significantCount: number;
  };
}

/**
 * LLM-based memory management system
 * Handles memory lifecycle: storage, extraction, compression, and retrieval
 */
export class MemoryManager {
  private anthropicService: AnthropicService;
  private memoryModel: string = 'claude-3-haiku-20240307'; // Cheaper model for memory tasks
  private debugPane?: any; // Debug pane for logging operations
  
  // Configuration
  private readonly DEFAULT_EXTRACTION_INTERVAL = 10;
  private readonly MAX_RECENT_INTERACTIONS = 15; // Keep more raw interactions
  private readonly MAX_SIGNIFICANT_MEMORIES = 50;
  private readonly RELEVANCE_THRESHOLD = 2.0;
  
  // Internal state
  private recentInteractions: InteractionPair[] = [];
  private significantMemories: SignificantMemory[] = [];
  private extractionInterval: number = this.DEFAULT_EXTRACTION_INTERVAL;
  private interactionsSinceLastExtraction: number = 0;
  private isProcessing: boolean = false;
  private lastGameState: GameState | null = null;

  constructor(anthropicService?: AnthropicService, memoryModel?: string) {
    this.anthropicService = anthropicService || new AnthropicService();
    if (memoryModel) {
      this.memoryModel = memoryModel;
    }
  }

  /**
   * Set debug pane for logging memory operations
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
  }

  /**
   * Add a new interaction to memory
   * Automatically determines importance and triggers async processing every N interactions
   */
  addMemory(playerInput: string, llmResponse: string, gameState?: GameState): void {
    // Determine importance automatically
    const importance = this.determineInteractionImportance(playerInput, llmResponse);
    
    const interaction: InteractionPair = {
      playerInput,
      llmResponse,
      timestamp: new Date(),
      importance
    };
    
    // Store the interaction immediately
    this.recentInteractions.push(interaction);
    
    // Keep only the most recent interactions
    if (this.recentInteractions.length > this.MAX_RECENT_INTERACTIONS) {
      this.recentInteractions = this.recentInteractions.slice(-this.MAX_RECENT_INTERACTIONS);
    }

    // Store latest game state for async processing
    if (gameState) {
      this.lastGameState = { ...gameState };
    }

    // Increment counter and check if we should process
    this.interactionsSinceLastExtraction++;
    
    if (this.interactionsSinceLastExtraction >= this.extractionInterval) {
      this.triggerAsyncProcessing();
    }

    // Log memory operation to debug pane
    if (this.debugPane) {
      this.debugPane.logMemoryOperation({
        operation: 'add_interaction',
        stats: this.getStats(),
        interaction: {
          playerInput,
          llmResponse,
          importance
        }
      });
    }

    console.log(`💭 Added memory (${importance} importance). Recent: ${this.recentInteractions.length}, Significant: ${this.significantMemories.length}`);
  }

  /**
   * Determine interaction importance based on content analysis
   */
  private determineInteractionImportance(playerInput: string, llmResponse: string): 'low' | 'medium' | 'high' {
    const combinedText = (playerInput + ' ' + llmResponse).toLowerCase();
    
    // High importance indicators
    const highImportanceKeywords = [
      'find', 'discover', 'reveal', 'secret', 'important', 'remember', 'promise', 
      'love', 'hate', 'trust', 'betray', 'kill', 'die', 'death', 'ending', 'final',
      'quest', 'mission', 'goal', 'achieve', 'success', 'failure', 'consequence'
    ];
    if (highImportanceKeywords.some(keyword => combinedText.includes(keyword))) {
      return 'high';
    }
    
    // Medium importance indicators
    const mediumImportanceKeywords = [
      'character', 'conversation', 'tell', 'ask', 'explain', 'story', 'past', 'future',
      'take', 'give', 'use', 'open', 'examine', 'search', 'talk', 'speak'
    ];
    if (mediumImportanceKeywords.some(keyword => combinedText.includes(keyword)) || 
        llmResponse.length > 200) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Get formatted memory context for prompt building
   */
  getMemories(currentInput?: string, gameState?: GameState): MemoryContext {
    const recentInteractions = this.formatRecentInteractions();
    const significantMemories = this.formatSignificantMemories(currentInput, gameState);

    return {
      recentInteractions,
      significantMemories,
      stats: {
        recentCount: this.recentInteractions.length,
        significantCount: this.significantMemories.length
      }
    };
  }

  /**
   * Configure extraction interval (how many interactions before processing)
   */
  setExtractionInterval(count: number): void {
    if (count > 0 && count <= 50) {
      this.extractionInterval = count;
    }
  }

  /**
   * Configure the model used for memory operations
   */
  setMemoryModel(model: string): void {
    this.memoryModel = model;
  }

  /**
   * Get current memory statistics
   */
  getStats(): {
    recentInteractions: number;
    significantMemories: number;
    extractionInterval: number;
    interactionsSinceLastExtraction: number;
    isProcessing: boolean;
  } {
    return {
      recentInteractions: this.recentInteractions.length,
      significantMemories: this.significantMemories.length,
      extractionInterval: this.extractionInterval,
      interactionsSinceLastExtraction: this.interactionsSinceLastExtraction,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Trigger async memory processing
   */
  private triggerAsyncProcessing(): void {
    if (this.isProcessing || !this.anthropicService.isConfigured()) {
      return; // Skip if already processing or no LLM available
    }

    this.isProcessing = true;
    this.interactionsSinceLastExtraction = 0;

    console.log('🔄 Starting async memory processing...');

    // Run processing asynchronously
    this.processMemoriesAsync()
      .then(() => {
        console.log('✅ Async memory processing completed');
      })
      .catch(error => {
        console.error('❌ Async memory processing failed:', error);
      })
      .finally(() => {
        this.isProcessing = false;
      });
  }

  /**
   * Async memory processing: extract batch and compact
   */
  private async processMemoriesAsync(): Promise<void> {
    try {
      // Step 1: Extract memories from a batch of interactions
      const batchSize = Math.min(this.extractionInterval, this.recentInteractions.length);
      const interactionBatch = this.recentInteractions.slice(-batchSize);
      
      console.log(`🔍 Extracting memories from batch of ${batchSize} interactions`);
      const newMemories = await this.extractMemoriesFromBatch(interactionBatch, this.lastGameState);
      
      if (newMemories.length > 0) {
        console.log(`📝 Extracted ${newMemories.length} new memories from batch`);
        
        // Step 2: Compact old memories with new memories
        const allMemories = [...this.significantMemories, ...newMemories];
        this.significantMemories = await this.compactMemories(allMemories);
        
        console.log(`🗜️ Compacted to ${this.significantMemories.length} total memories`);
      }

      // Update access times for relevant memories
      if (this.recentInteractions.length > 0) {
        await this.updateMemoryAccessTimes(this.recentInteractions.slice(-3));
      }

      console.log(`🧠 Memory processing complete. Significant memories: ${this.significantMemories.length}`);
    } catch (error) {
      console.error('Memory processing error:', error);
    }
  }

  /**
   * Extract memories from a batch of interactions
   */
  private async extractMemoriesFromBatch(
    interactions: InteractionPair[],
    gameState: GameState | null
  ): Promise<SignificantMemory[]> {
    if (interactions.length === 0) return [];
    
    const prompt = this.buildBatchExtractionPrompt(interactions, gameState);
    
    try {
      const response = await this.anthropicService.makeRequest(
        prompt,
        { model: this.memoryModel }
      );

      return this.parseBatchExtractionResponse(response, interactions, gameState);
    } catch (error) {
      console.error('Batch memory extraction failed:', error);
      return [];
    }
  }

  /**
   * Build prompt for batch memory extraction
   */
  private buildBatchExtractionPrompt(
    interactions: InteractionPair[],
    gameState: GameState | null
  ): string {
    const currentLocation = gameState?.currentLocation || 'unknown';
    const existingCount = this.significantMemories.length;

    const interactionText = interactions.map((interaction, index) => 
      `${index + 1}. [${interaction.importance}] Player: "${interaction.playerInput}"\n   Response: "${interaction.llmResponse}"`
    ).join('\n\n');

    return `You are extracting significant memories from a batch of interactive fiction game interactions.

INTERACTIONS TO ANALYZE (${interactions.length} total):
${interactionText}

CONTEXT:
- Current location: ${currentLocation}
- Currently have ${existingCount} existing significant memories
- Only extract memories for truly significant moments that would enhance future interactions
- Look for patterns and connections across the batch

EXTRACT memories for interactions containing:
- Character relationships or emotional moments
- Important discoveries or revelations  
- Promises, goals, or commitments made
- Key story information or plot developments
- Significant world-building details
- Connected sequences of actions that form meaningful events

RESPOND WITH JSON ONLY:
{
  "memories": [
    {
      "type": "character_bond|discovery|revelation|promise|goal",
      "summary": "Brief 1-2 sentence summary of what happened",
      "importance": 1-10,
      "participants": ["character names if any"],
      "relatedItems": ["item IDs if any"],
      "relatedLocations": ["${currentLocation}"],
      "contextTriggers": ["key words that would make this memory relevant"]
    }
  ]
}

If no significant memories should be extracted, return: {"memories": []}

Be selective - only extract truly significant moments. Consider the interactions as a sequence and look for meaningful events that span multiple interactions.`;
  }

  /**
   * Parse batch memory extraction response
   */
  private parseBatchExtractionResponse(
    response: string,
    _interactions: InteractionPair[],
    gameState: GameState | null
  ): SignificantMemory[] {
    try {
      const parsed = JSON.parse(response);
      
      if (!parsed.memories || !Array.isArray(parsed.memories)) {
        return [];
      }

      return parsed.memories.map((mem: any, index: number) => ({
        id: `batch_${mem.type}_${Date.now()}_${index}`,
        type: mem.type || 'revelation',
        summary: mem.summary || `Batch memory ${index + 1}`,
        importance: Math.min(10, Math.max(1, mem.importance || 5)),
        lastAccessed: new Date(),
        participants: mem.participants || [],
        relatedItems: mem.relatedItems || [],
        relatedLocations: mem.relatedLocations || [gameState?.currentLocation || 'unknown'],
        contextTriggers: mem.contextTriggers || []
      }));
    } catch (error) {
      console.error('Failed to parse batch memory extraction response:', error);
      return [];
    }
  }

  /**
   * Update access times for memories relevant to recent interactions
   */
  private async updateMemoryAccessTimes(recentInteractions: InteractionPair[]): Promise<void> {
    if (this.significantMemories.length === 0) return;

    const combinedText = recentInteractions
      .map(i => `${i.playerInput} ${i.llmResponse}`)
      .join(' ')
      .toLowerCase();

    // Simple relevance check - update memories with matching triggers
    const now = new Date();
    this.significantMemories.forEach(memory => {
      const isRelevant = memory.contextTriggers.some(trigger =>
        combinedText.includes(trigger.toLowerCase())
      );

      if (isRelevant) {
        memory.lastAccessed = now;
        memory.importance = Math.min(10, memory.importance + 0.1);
      }
    });
  }

  /**
   * Compact memories using LLM (combines old memories with new memories)
   */
  private async compactMemories(allMemories: SignificantMemory[]): Promise<SignificantMemory[]> {
    // If we don't have many memories, just prune by importance
    if (allMemories.length <= this.MAX_SIGNIFICANT_MEMORIES) {
      return this.pruneMemories(allMemories, this.MAX_SIGNIFICANT_MEMORIES);
    }

    const prompt = this.buildCompactionPrompt(allMemories);
    
    try {
      const response = await this.anthropicService.makeRequest(
        prompt,
        { model: this.memoryModel }
      );

      const compacted = this.parseCompactionResponse(response, allMemories);
      return this.pruneMemories(compacted, this.MAX_SIGNIFICANT_MEMORIES);
    } catch (error) {
      console.error('Memory compaction failed:', error);
      return this.pruneMemories(allMemories, this.MAX_SIGNIFICANT_MEMORIES);
    }
  }

  /**
   * Build compaction prompt (for combining old + new memories)
   */
  private buildCompactionPrompt(allMemories: SignificantMemory[]): string {
    const targetCount = this.MAX_SIGNIFICANT_MEMORIES;
    
    return `You are compacting conversation memories for an interactive fiction game. You have ${allMemories.length} memories and need to reduce to ${targetCount} memories.

MEMORIES TO COMPACT:
${allMemories.map((mem, i) => `${i + 1}. [${mem.type}] ${mem.summary} (importance: ${mem.importance}) [ID: ${mem.id}]`).join('\n')}

TASK: 
1. Group related memories that can be combined into single, more comprehensive memories
2. Keep the most important individual memories that don't group well
3. Ensure the final set captures the most significant narrative elements
4. Prioritize recent memories and higher importance scores

RESPOND WITH JSON ONLY:
{
  "compactionGroups": [
    {
      "memoryIds": ["id1", "id2"],
      "compactedMemory": {
        "type": "most_appropriate_type",
        "summary": "Combined summary that captures key details from grouped memories",
        "importance": 8,
        "participants": ["combined_participants"],
        "relatedItems": ["combined_items"],
        "relatedLocations": ["combined_locations"],
        "contextTriggers": ["combined_triggers"]
      }
    }
  ],
  "keepIndividual": ["id3", "id4"]
}

Aim for around ${targetCount} total memories after compaction. Prioritize narrative significance and recent events.`;
  }

  /**
   * Parse compaction response
   */
  private parseCompactionResponse(
    response: string,
    originalMemories: SignificantMemory[]
  ): SignificantMemory[] {
    try {
      const parsed = JSON.parse(response);
      const result: SignificantMemory[] = [];
      const now = new Date();

      // Add compacted memories from groups
      if (parsed.compactionGroups && Array.isArray(parsed.compactionGroups)) {
        for (const group of parsed.compactionGroups) {
          if (group.compactedMemory) {
            result.push({
              id: `compacted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: group.compactedMemory.type || 'revelation',
              summary: group.compactedMemory.summary || 'Compacted memory',
              importance: group.compactedMemory.importance || 5,
              lastAccessed: now,
              participants: group.compactedMemory.participants || [],
              relatedItems: group.compactedMemory.relatedItems || [],
              relatedLocations: group.compactedMemory.relatedLocations || [],
              contextTriggers: group.compactedMemory.contextTriggers || []
            });
          }
        }
      }

      // Add memories to keep individual
      if (parsed.keepIndividual && Array.isArray(parsed.keepIndividual)) {
        for (const memoryId of parsed.keepIndividual) {
          const memory = originalMemories.find(m => m.id === memoryId);
          if (memory) {
            result.push(memory);
          }
        }
      }

      return result.length > 0 ? result : originalMemories;
    } catch (error) {
      console.error('Failed to parse compaction response:', error);
      return originalMemories;
    }
  }

  /**
   * Prune memories by importance and recency (fallback when LLM compaction fails)
   */
  private pruneMemories(memories: SignificantMemory[], maxMemories: number): SignificantMemory[] {
    if (memories.length <= maxMemories) {
      return memories;
    }

    // Sort by composite score: importance + recency
    const pruned = memories
      .map(memory => ({
        memory,
        score: memory.importance * 1.5 + this.getRecencyScore(memory.lastAccessed) * 2.5
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxMemories)
      .map(item => item.memory);
      
    console.log(`🗂️ Pruned ${memories.length} memories to ${pruned.length} using importance/recency fallback`);
    return pruned;
  }

  /**
   * Format recent interactions for prompt
   */
  private formatRecentInteractions(): string {
    if (this.recentInteractions.length === 0) {
      return 'No recent conversation history.';
    }

    let context = `Recent Conversation History (last ${this.recentInteractions.length} interactions):\n`;
    
    this.recentInteractions.forEach((interaction, index) => {
      const timeAgo = this.getTimeAgo(interaction.timestamp);
      context += `\n${index + 1}. [${timeAgo}] Player: "${interaction.playerInput}"\n`;
      context += `   Response: "${interaction.llmResponse}"\n`;
      if (interaction.importance !== 'low') {
        context += `   [Importance: ${interaction.importance}]\n`;
      }
    });

    return context;
  }

  /**
   * Format significant memories for prompt (with relevance filtering)
   */
  private formatSignificantMemories(currentInput?: string, gameState?: GameState): string {
    if (this.significantMemories.length === 0) {
      return 'No significant memories stored.';
    }

    let memories = this.getRelevantMemories(currentInput, gameState);

    if (memories.length === 0) {
      return 'No relevant significant memories for current context.';
    }

    return this.formatMemoryList(memories);
  }

  /**
   * Get relevant memories filtered and sorted by relevance
   */
  private getRelevantMemories(currentInput?: string, gameState?: GameState): SignificantMemory[] {
    if (!currentInput || !gameState) {
      // Return all memories sorted by importance + recency if no context
      return this.significantMemories
        .sort((a, b) => {
          const scoreA = a.importance + this.getRecencyScore(a.lastAccessed);
          const scoreB = b.importance + this.getRecencyScore(b.lastAccessed);
          return scoreB - scoreA;
        })
        .slice(0, 10);
    }

    return this.significantMemories
      .map(memory => ({
        memory,
        relevanceScore: this.calculateRelevance(memory, currentInput, gameState)
      }))
      .filter(scored => scored.relevanceScore > this.RELEVANCE_THRESHOLD)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10) // Top 10 most relevant
      .map(scored => scored.memory);
  }

  /**
   * Format a list of memories into prompt text
   */
  private formatMemoryList(memories: SignificantMemory[]): string {
    let context = `Significant Memories (${memories.length} relevant):\n`;
    
    memories.forEach((memory, index) => {
      context += `\n${index + 1}. [${memory.type.toUpperCase()}] ${memory.summary}`;
      
      if (memory.participants?.length) {
        context += ` (participants: ${memory.participants.join(', ')})`;
      }
      
      if (memory.relatedItems?.length) {
        context += ` (items: ${memory.relatedItems.join(', ')})`;
      }
      
      const timeAgo = this.getTimeAgo(memory.lastAccessed);
      context += ` [${timeAgo}]\n`;
    });

    return context;
  }

  /**
   * Calculate recency score for memory sorting
   */
  private getRecencyScore(lastAccessed: Date): number {
    const daysSinceAccess = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 2 - daysSinceAccess * 0.1);
  }

  /**
   * Calculate relevance score for memory filtering
   */
  private calculateRelevance(
    memory: SignificantMemory,
    currentInput: string,
    gameState: GameState
  ): number {
    let score = 0;
    
    // Keyword matching
    for (const trigger of memory.contextTriggers) {
      if (currentInput.toLowerCase().includes(trigger.toLowerCase())) {
        score += 3;
      }
    }
    
    // Location relevance
    if (memory.relatedLocations?.includes(gameState.currentLocation)) {
      score += 2;
    }
    
    // Item relevance
    if (memory.relatedItems?.some(item => 
      gameState.inventory.includes(item) || currentInput.toLowerCase().includes(item.toLowerCase())
    )) {
      score += 1.5;
    }
    
    // Recency boost
    score += this.getRecencyScore(memory.lastAccessed);
    
    // Base importance
    score += memory.importance * 0.5;
    
    return score;
  }

  /**
   * Calculate time ago string
   */
  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  /**
   * Reset all memory (for new games)
   */
  reset(): void {
    this.recentInteractions = [];
    this.significantMemories = [];
    this.interactionsSinceLastExtraction = 0;
    this.isProcessing = false;
    this.lastGameState = null;
    console.log('🔄 Memory manager reset');
  }

  /**
   * Get recent interactions for conversation history restoration
   */
  getRecentInteractions(): InteractionPair[] {
    return [...this.recentInteractions];
  }

  /**
   * Export memory state for persistence
   */
  exportState(): any {
    return {
      recentInteractions: this.recentInteractions.map(interaction => ({
        ...interaction,
        timestamp: interaction.timestamp.toISOString()
      })),
      significantMemories: this.significantMemories.map(memory => ({
        ...memory,
        lastAccessed: memory.lastAccessed.toISOString()
      })),
      interactionsSinceLastExtraction: this.interactionsSinceLastExtraction
    };
  }

  /**
   * Import memory state from persistence
   */
  importState(state: any): void {
    if (state.recentInteractions) {
      this.recentInteractions = state.recentInteractions.map((interaction: any) => ({
        ...interaction,
        timestamp: new Date(interaction.timestamp)
      }));
    }

    if (state.significantMemories) {
      this.significantMemories = state.significantMemories.map((memory: any) => ({
        ...memory,
        lastAccessed: new Date(memory.lastAccessed)
      }));
    }

    if (typeof state.interactionsSinceLastExtraction === 'number') {
      this.interactionsSinceLastExtraction = state.interactionsSinceLastExtraction;
    }

    console.log(`🔄 Memory manager imported: ${this.recentInteractions.length} recent, ${this.significantMemories.length} significant`);
  }
}