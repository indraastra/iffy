/**
 * Impressionist Memory Manager - Handles memory storage, consolidation, and retrieval
 * 
 * Simple, generic system that accepts string memories and consolidates them
 * using LLM-based compaction. Engine-agnostic and async-safe.
 */

import { MultiModelService } from '@/services/multiModelService';
import { MemoryMetricsCollector } from './memoryMetricsCollector';
import { CompactionResponseSchema } from '@/schemas/memorySchemas';

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  importance: number; // 1-10 scale
}

export interface MemoryContext {
  memories: string[];
  totalCount: number;
  lastCompactionTime: Date | null;
}

export class ImpressionistMemoryManager {
  private multiModelService: MultiModelService;
  private debugPane?: any;
  private memoryMetrics: MemoryMetricsCollector;
  
  // Configuration constants
  private readonly DEFAULT_COMPACTION_INTERVAL = 5; // Compact every 5 memories
  private readonly MAX_MEMORY_COUNT = 50; // Total memories before forced compaction
  private readonly COMPACTION_TARGET_RATIO = 0.7; // Compact to 70% of current count
  private readonly MIN_MEMORIES_FOR_COMPACTION = 3; // Need at least 3 memories to compact
  
  // State
  private memories: MemoryEntry[] = [];
  private memoriesSinceLastCompaction: number = 0;
  private compactionInterval: number = this.DEFAULT_COMPACTION_INTERVAL;
  private isProcessing: boolean = false;
  private lastCompactionTime: Date | null = null;

  constructor(multiModelService?: MultiModelService) {
    this.multiModelService = multiModelService || new MultiModelService();
    this.memoryMetrics = new MemoryMetricsCollector();
  }

  /**
   * Add a memory to the system
   */
  addMemory(content: string, importance: number = 5): void {
    if (!content || content.trim().length === 0) return;

    const memory: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      timestamp: new Date(),
      importance: Math.max(1, Math.min(10, importance))
    };

    this.memories.push(memory);
    this.memoriesSinceLastCompaction++;

    // Update debug pane with current memory contents
    if (this.debugPane) {
      this.debugPane.updateMemoryContents(this.memories.map(m => ({ content: m.content, importance: m.importance })));
    }

    console.log(`🧠 Added memory (importance: ${importance}). Total: ${this.memories.length}`);

    // Check if we should trigger compaction
    if (this.shouldTriggerCompaction()) {
      this.triggerAsyncCompaction();
    }
  }

  /**
   * Get memories for context building (returns in chronological order: oldest to newest)
   */
  getMemories(limit: number): MemoryContext {
    const maxMemories = limit;
    
    // Sort by importance and recency to select the most relevant memories
    const relevantMemories = [...this.memories]
      .sort((a, b) => {
        const importanceScore = (b.importance - a.importance) * 2;
        const recencyScore = (b.timestamp.getTime() - a.timestamp.getTime()) / (1000 * 60 * 60 * 24); // Days
        return importanceScore + recencyScore;
      })
      .slice(0, maxMemories);

    // Then sort the selected memories chronologically (oldest to newest) for prompt consistency
    const chronologicalMemories = relevantMemories
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      memories: chronologicalMemories.map(m => m.content),
      totalCount: this.memories.length,
      lastCompactionTime: this.lastCompactionTime
    };
  }

  /**
   * Get all memories for debugging (oldest to newest, matching prompt order)
   */
  getAllMemories(): MemoryEntry[] {
    return [...this.memories].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Clear all memories
   */
  reset(): void {
    this.memories = [];
    this.memoriesSinceLastCompaction = 0;
    this.isProcessing = false;
    this.lastCompactionTime = null;
    this.memoryMetrics.reset();
    console.log('🧠 Memory manager reset');
  }

  /**
   * Configure compaction interval
   */
  setCompactionInterval(interval: number): void {
    if (interval > 0 && interval <= 20) {
      this.compactionInterval = interval;
      console.log(`🧠 Memory compaction interval set to ${interval}`);
    }
  }

  /**
   * Set debug pane for logging
   */
  setDebugPane(debugPane: any): void {
    this.debugPane = debugPane;
    this.memoryMetrics.setDebugPane(debugPane);
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    totalMemories: number;
    memoriesSinceLastCompaction: number;
    compactionInterval: number;
    isProcessing: boolean;
    lastCompactionTime: Date | null;
  } {
    return {
      totalMemories: this.memories.length,
      memoriesSinceLastCompaction: this.memoriesSinceLastCompaction,
      compactionInterval: this.compactionInterval,
      isProcessing: this.isProcessing,
      lastCompactionTime: this.lastCompactionTime
    };
  }

  /**
   * Get memory metrics collector for separate tracking
   */
  getMemoryMetrics(): MemoryMetricsCollector {
    return this.memoryMetrics;
  }

  /**
   * Export state for persistence
   */
  exportState(): any {
    return {
      memories: this.memories.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString()
      })),
      memoriesSinceLastCompaction: this.memoriesSinceLastCompaction,
      lastCompactionTime: this.lastCompactionTime?.toISOString() || null
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: any): void {
    if (state && state.memories && Array.isArray(state.memories)) {
      this.memories = state.memories.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    }

    if (state && typeof state.memoriesSinceLastCompaction === 'number') {
      this.memoriesSinceLastCompaction = state.memoriesSinceLastCompaction;
    }

    // Update debug pane with restored memories
    if (this.debugPane) {
      this.debugPane.updateMemoryContents(this.memories.map(m => ({ content: m.content, importance: m.importance })));
    }

    if (state && state.lastCompactionTime) {
      this.lastCompactionTime = new Date(state.lastCompactionTime);
    }

    console.log(`🧠 Memory manager imported: ${this.memories.length} memories`);
  }

  /**
   * Check if compaction should be triggered
   */
  private shouldTriggerCompaction(): boolean {
    return (
      !this.isProcessing &&
      this.multiModelService.isConfigured() &&
      (this.memoriesSinceLastCompaction >= this.compactionInterval ||
       this.memories.length >= this.MAX_MEMORY_COUNT)
    );
  }

  /**
   * Trigger async memory compaction (public for debug tools)
   */
  public triggerAsyncCompaction(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.memoriesSinceLastCompaction = 0;

    console.log('🔄 Starting async memory compaction...');

    this.compactMemoriesAsync()
      .then(() => {
        console.log('✅ Memory compaction completed');
        // Update debug pane with new memory contents after compaction
        if (this.debugPane) {
          this.debugPane.updateMemoryContents(this.memories.map(m => ({ content: m.content, importance: m.importance })));
        }
      })
      .catch(error => {
        console.error('❌ Memory compaction failed:', error);
      })
      .finally(() => {
        this.isProcessing = false;
        this.lastCompactionTime = new Date();
      });
  }

  /**
   * Async memory compaction using LLM
   */
  private async compactMemoriesAsync(): Promise<void> {
    if (this.memories.length < this.MIN_MEMORIES_FOR_COMPACTION) return;

    const startTime = performance.now();
    const originalMemoryCount = this.memories.length;

    try {
      const prompt = this.buildCompactionPrompt();
      const response = await this.multiModelService.makeStructuredRequest(prompt, CompactionResponseSchema, { useCostModel: true, temperature: 0.3 }); // Medium temperature for factual summarization with some flexibility

      const latencyMs = performance.now() - startTime;
      const compactedMemories = this.convertToMemoryEntries(response.data.compactedMemories);
      
      if (compactedMemories.length > 0) {
        this.memories = compactedMemories;
        console.log(`🗜️ Compacted to ${this.memories.length} memories`);
        
        // Track successful compaction metrics
        const currentConfig = this.multiModelService.getConfig();
        const costModel = currentConfig?.costModel || currentConfig?.model || 'unknown';
        this.memoryMetrics.trackMemoryRequest(
          'compaction',
          response.usage.input_tokens,
          response.usage.output_tokens,
          latencyMs,
          costModel,
          originalMemoryCount,
          this.memories.length,
          true
        );
        
        if (this.debugPane) {
          this.debugPane.updateMemoryContents(this.memories.map(m => ({ content: m.content, importance: m.importance })));
        }
      } else {
        // Track failed compaction (no memories returned)
        const currentConfig = this.multiModelService.getConfig();
        const costModel = currentConfig?.costModel || currentConfig?.model || 'unknown';
        this.memoryMetrics.trackMemoryRequest(
          'compaction',
          response.usage.input_tokens,
          response.usage.output_tokens,
          latencyMs,
          costModel,
          originalMemoryCount,
          0,
          false,
          'No compacted memories returned'
        );
      }
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      console.error('Memory compaction error:', error);
      
      // Track failed compaction
      const currentConfig = this.multiModelService.getConfig();
      const costModel = currentConfig?.costModel || currentConfig?.model || 'unknown';
      this.memoryMetrics.trackMemoryRequest(
        'compaction',
        0, // Unknown token count on error
        0,
        latencyMs,
        costModel,
        originalMemoryCount,
        originalMemoryCount, // No change on error
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build LLM prompt for memory compaction
   */
  private buildCompactionPrompt(): string {
    const targetCount = Math.max(10, Math.floor(this.memories.length * this.COMPACTION_TARGET_RATIO));
    
    return `You are compacting memories for an interactive fiction game. You have ${this.memories.length} memories and should reduce them to around ${targetCount} memories.

CURRENT MEMORIES (chronological order):
${this.memories.map((mem, i) => `${i + 1}. [Importance: ${mem.importance}] ${mem.content}`).join('\n')}

SMART COMPACTION GUIDELINES:
1. **Temporal Updates**: Later memories override earlier ones
2. **State Changes**: Merge action sequences into current states
3. **Consolidate Related**: Combine memories about the same objects, characters, or locations
4. **Preserve Important**: Keep high-importance memories (7+) and recent significant events
5. **Current Context**: Focus on what's currently true/relevant vs historical actions

LENGTH GUIDELINES:
- Target under 20 words per memory when possible
- Use present tense for current states ("Player has key" not "Player picked up key")
- Focus on facts, not narrative details
- Break long memories into multiple smaller ones if needed

EXAMPLES:

❌ VERBOSE (ineffective):
"Player carefully examined the ornate wooden door, discovered it was locked, searched the room, found a brass key behind the painting, and used it to unlock the door"

✅ CONCISE (effective):
Multiple memories: "Player has brass key", "Door is unlocked", "Key was hidden behind painting"

❌ HISTORICAL (past actions):
"Player talked to Alex about feelings, Alex seemed nervous, then Alex revealed romantic interest and player responded positively"

✅ CURRENT STATE (present facts):
Multiple memories: "Alex has romantic feelings for player", "Player knows Alex's feelings", "Conversation was positive"

Return an array of compacted memories. Each memory should have:
- content: A clear, concise description of the current state or knowledge
- importance: A number from 1-10 indicating how important this memory is

Aim for around ${targetCount} memories. Prioritize current game state over historical actions.`;
  }

  /**
   * Convert structured output to MemoryEntry objects
   */
  private convertToMemoryEntries(compactedMemories: { content: string; importance: number }[]): MemoryEntry[] {
    return compactedMemories.map((mem, index) => ({
      id: `compacted_${Date.now()}_${index}`,
      content: mem.content,
      timestamp: new Date(),
      importance: mem.importance
    }));
  }
}