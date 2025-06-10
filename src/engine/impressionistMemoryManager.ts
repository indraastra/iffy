/**
 * Impressionist Memory Manager - Handles memory storage, consolidation, and retrieval
 * 
 * Simple, generic system that accepts string memories and consolidates them
 * using LLM-based compaction. Engine-agnostic and async-safe.
 */

import { AnthropicService } from '@/services/anthropicService';
import { MemoryMetricsCollector } from './memoryMetricsCollector';

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
  private anthropicService: AnthropicService;
  private memoryModel: string = 'claude-3-haiku-20240307';
  private debugPane?: any;
  private memoryMetrics: MemoryMetricsCollector;
  
  // Configuration constants
  private readonly DEFAULT_COMPACTION_INTERVAL = 5; // Compact every 5 memories
  private readonly MAX_MEMORY_COUNT = 50; // Total memories before forced compaction
  private readonly MAX_RETURNED_MEMORIES = 15; // Max memories returned for context
  private readonly COMPACTION_TARGET_RATIO = 0.7; // Compact to 70% of current count
  private readonly MIN_MEMORIES_FOR_COMPACTION = 3; // Need at least 3 memories to compact
  
  // State
  private memories: MemoryEntry[] = [];
  private memoriesSinceLastCompaction: number = 0;
  private compactionInterval: number = this.DEFAULT_COMPACTION_INTERVAL;
  private isProcessing: boolean = false;
  private lastCompactionTime: Date | null = null;

  constructor(anthropicService?: AnthropicService, memoryModel?: string) {
    this.anthropicService = anthropicService || new AnthropicService();
    this.memoryMetrics = new MemoryMetricsCollector();
    if (memoryModel) {
      this.memoryModel = memoryModel;
    }
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

    // Log to debug pane
    if (this.debugPane) {
      this.debugPane.logMemoryOperation({
        operation: 'add_memory',
        content: content.substring(0, 100),
        importance,
        totalMemories: this.memories.length
      });
    }

    console.log(`🧠 Added memory (importance: ${importance}). Total: ${this.memories.length}`);

    // Check if we should trigger compaction
    if (this.shouldTriggerCompaction()) {
      this.triggerAsyncCompaction();
    }
  }

  /**
   * Get memories for context building
   */
  getMemories(limit?: number): MemoryContext {
    const maxMemories = limit || this.MAX_RETURNED_MEMORIES;
    
    // Sort by importance and recency
    const sortedMemories = [...this.memories]
      .sort((a, b) => {
        const importanceScore = (b.importance - a.importance) * 2;
        const recencyScore = (b.timestamp.getTime() - a.timestamp.getTime()) / (1000 * 60 * 60 * 24); // Days
        return importanceScore + recencyScore;
      })
      .slice(0, maxMemories);

    return {
      memories: sortedMemories.map(m => m.content),
      totalCount: this.memories.length,
      lastCompactionTime: this.lastCompactionTime
    };
  }

  /**
   * Get all memories for debugging
   */
  getAllMemories(): MemoryEntry[] {
    return [...this.memories].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
      this.anthropicService.isConfigured() &&
      (this.memoriesSinceLastCompaction >= this.compactionInterval ||
       this.memories.length >= this.MAX_MEMORY_COUNT)
    );
  }

  /**
   * Trigger async memory compaction
   */
  private triggerAsyncCompaction(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.memoriesSinceLastCompaction = 0;

    console.log('🔄 Starting async memory compaction...');

    this.compactMemoriesAsync()
      .then(() => {
        console.log('✅ Memory compaction completed');
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
      const response = await this.anthropicService.makeRequestWithUsage(prompt, {
        model: this.memoryModel
      });

      const latencyMs = performance.now() - startTime;
      const compactedMemories = this.parseCompactionResponse(response.content);
      
      if (compactedMemories.length > 0) {
        this.memories = compactedMemories;
        console.log(`🗜️ Compacted to ${this.memories.length} memories`);
        
        // Track successful compaction metrics
        this.memoryMetrics.trackMemoryRequest(
          'compaction',
          response.usage.input_tokens,
          response.usage.output_tokens,
          latencyMs,
          this.memoryModel,
          originalMemoryCount,
          this.memories.length,
          true
        );
        
        if (this.debugPane) {
          this.debugPane.logMemoryOperation({
            operation: 'compaction',
            resultCount: this.memories.length,
            timestamp: new Date()
          });
        }
      } else {
        // Track failed compaction (no memories returned)
        this.memoryMetrics.trackMemoryRequest(
          'compaction',
          response.usage.input_tokens,
          response.usage.output_tokens,
          latencyMs,
          this.memoryModel,
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
      this.memoryMetrics.trackMemoryRequest(
        'compaction',
        0, // Unknown token count on error
        0,
        latencyMs,
        this.memoryModel,
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

CURRENT MEMORIES:
${this.memories.map((mem, i) => `${i + 1}. [Importance: ${mem.importance}] ${mem.content}`).join('\n')}

TASK:
1. Combine related memories into comprehensive, single memories
2. Keep the most important individual memories
3. Maintain narrative coherence and key details
4. Prioritize higher importance scores and recent memories

RESPOND WITH JSON ONLY:
{
  "compactedMemories": [
    {
      "content": "Combined or preserved memory text",
      "importance": 8
    }
  ]
}

Aim for around ${targetCount} memories total. Focus on preserving the most significant narrative elements.`;
  }

  /**
   * Parse LLM compaction response
   */
  private parseCompactionResponse(response: string): MemoryEntry[] {
    try {
      const parsed = JSON.parse(response);
      
      if (!parsed.compactedMemories || !Array.isArray(parsed.compactedMemories)) {
        return this.memories; // Return original on parse failure
      }

      return parsed.compactedMemories.map((mem: any, index: number) => ({
        id: `compacted_${Date.now()}_${index}`,
        content: mem.content || `Compacted memory ${index + 1}`,
        timestamp: new Date(),
        importance: Math.max(1, Math.min(10, mem.importance || 5))
      }));
    } catch (error) {
      console.error('Failed to parse compaction response:', error);
      return this.memories; // Return original on error
    }
  }
}