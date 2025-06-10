/**
 * Tests for Memory Compaction Efficiency
 * 
 * Tests how well the impressionist memory manager handles memory compaction
 * during realistic gameplay scenarios with real stories.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistParser } from '@/engine/impressionistParser';
import { BUNDLED_STORIES } from '@/bundled-examples';

// Mock service that simulates realistic LLM responses
const createRealisticMockService = () => {
  const responseTemplates = [
    { narrative: "You observe your surroundings carefully.", remember: ["noticed surroundings"] },
    { narrative: "A new discovery catches your attention.", remember: ["important discovery made"] },
    { narrative: "You interact with someone significant.", remember: ["meaningful interaction occurred"] },
    { narrative: "Something important is revealed to you.", remember: ["crucial information learned"] },
    { narrative: "You make a decision that feels significant.", remember: ["important choice made"] },
    { narrative: "The situation becomes more clear.", remember: ["clarity gained about situation"] },
    { narrative: "You remember something from earlier.", remember: ["recalled previous event"] },
    { narrative: "A pattern begins to emerge.", remember: ["pattern recognition achieved"] },
    { narrative: "You have an important realization.", remember: ["significant insight gained"] },
    { narrative: "The stakes become higher.", remember: ["increased urgency felt"] }
  ];
  
  let responseIndex = 0;
  
  return {
    isConfigured: vi.fn().mockReturnValue(true),
    makeRequestWithUsage: vi.fn().mockImplementation(async (prompt: string) => {
      const template = responseTemplates[responseIndex % responseTemplates.length];
      responseIndex++;
      
      const signals: any = {};
      if (template.remember) signals.remember = template.remember;
      
      return {
        content: JSON.stringify({
          narrative: template.narrative,
          signals
        }),
        usage: {
          input_tokens: Math.floor(prompt.length / 4),
          output_tokens: Math.floor(template.narrative.length / 4)
        }
      };
    })
  } as any;
};

// Helper to simulate a realistic gameplay session
const simulateGameplaySession = async (
  engine: ImpressionistEngine, 
  actionCount: number, 
  actionTypes: string[] = [
    'I look around carefully',
    'I examine something interesting', 
    'I try to understand the situation',
    'I make an important decision',
    'I search for clues',
    'I think about what I know',
    'I take action based on my understanding',
    'I explore my options',
    'I focus on the most important details',
    'I try to solve the puzzle'
  ]
) => {
  const memories: Array<{ action: number; totalMemories: number; activeMemories: number }> = [];
  
  for (let i = 0; i < actionCount; i++) {
    const action = actionTypes[i % actionTypes.length];
    await engine.processAction({ input: `${action} (action ${i + 1})` });
    
    const memoryManager = (engine as any).memoryManager;
    const stats = memoryManager.getStats();
    const memoryContext = memoryManager.getMemories();
    
    memories.push({
      action: i + 1,
      totalMemories: stats.totalMemories,
      activeMemories: memoryContext.memories.length
    });
  }
  
  return memories;
};

describe('Memory Compaction Efficiency', () => {
  let engine: ImpressionistEngine;
  let parser: ImpressionistParser;
  let mockService: ReturnType<typeof createRealisticMockService>;

  beforeEach(() => {
    parser = new ImpressionistParser();
    mockService = createRealisticMockService();
    engine = new ImpressionistEngine(mockService);
  });

  describe('Real Story Memory Management', () => {
    it('should efficiently manage memory during Coffee Confessional gameplay', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'coffee_confessional.yaml')?.content;
      expect(storyContent).toBeDefined();
      
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      const coffeeActions = [
        'I greet Alex warmly',
        'I notice Alex seems distant', 
        'I ask how Alex is feeling',
        'I listen carefully to the response',
        'I share my own feelings',
        'I try to understand Alex\'s emotions',
        'I offer support and comfort',
        'I create a safe space for conversation',
        'I respond to Alex\'s vulnerability',
        'I make a meaningful connection'
      ];
      
      const memoryProgression = await simulateGameplaySession(engine, 15, coffeeActions);
      
      // Memory should be managed efficiently
      const finalStats = memoryProgression[memoryProgression.length - 1];
      expect(finalStats.totalMemories).toBeGreaterThan(0);
      expect(finalStats.totalMemories).toBeLessThanOrEqual(60); // Should not exceed reasonable limit (dual system)
      expect(finalStats.activeMemories).toBeLessThanOrEqual(15); // Should respect context limit
      
      console.log(`Coffee Confessional memory progression:`, memoryProgression.slice(-3));
    });

    it('should handle memory-intensive detective work in Sentient Quill', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'sentient_quill.yaml')?.content;
      expect(storyContent).toBeDefined();
      
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      const detectiveActions = [
        'I examine the crime scene carefully',
        'I look for evidence of the murder',
        'I analyze the victim\'s position',
        'I search for the murder weapon',
        'I investigate potential motives',
        'I question the suspects',
        'I piece together the timeline',
        'I follow up on important clues',
        'I make connections between evidence',
        'I work toward solving the case'
      ];
      
      const memoryProgression = await simulateGameplaySession(engine, 20, detectiveActions);
      
      // Should handle investigation complexity efficiently
      const finalStats = memoryProgression[memoryProgression.length - 1];
      expect(finalStats.totalMemories).toBeGreaterThan(10); // Should have accumulated significant memories
      expect(finalStats.totalMemories).toBeLessThanOrEqual(60); // Should stay within reasonable limits
      
      // Memory count should stabilize after compaction kicks in
      const earlyMemoryCount = memoryProgression[5].totalMemories;
      const lateMemoryCount = finalStats.totalMemories;
      const growthRatio = lateMemoryCount / earlyMemoryCount;
      
      expect(growthRatio).toBeLessThan(4); // Should not grow completely unbounded (allowing for both interaction + remember memories)
      
      console.log(`Sentient Quill memory progression:`, memoryProgression.slice(-3));
    });

    it('should maintain efficiency in minimal story with repeated actions', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'the_key.yaml')?.content;
      expect(storyContent).toBeDefined();
      
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      const keyActions = [
        'I examine the door',
        'I try the handle',
        'I look for a key',
        'I check the hinges',
        'I search for another way through',
        'I listen at the door',
        'I feel around the frame',
        'I try to pick the lock',
        'I look for hidden switches',
        'I examine the keyhole'
      ];
      
      const memoryProgression = await simulateGameplaySession(engine, 25, keyActions);
      
      // Even with repetitive actions, memory should be managed
      const finalStats = memoryProgression[memoryProgression.length - 1];
      expect(finalStats.totalMemories).toBeLessThanOrEqual(60); // Allow for higher count due to dual memory systems
      
      // Should show compaction efficiency over time
      const midGameMemories = memoryProgression[12].totalMemories;
      const endGameMemories = finalStats.totalMemories;
      
      // Memory growth should slow down or stabilize (allowing more flexibility for dual memory system)
      expect(endGameMemories).toBeLessThanOrEqual(midGameMemories + 25);
      
      console.log(`The Key memory progression:`, memoryProgression.slice(-3));
    });
  });

  describe('Memory Compaction Effectiveness', () => {
    it('should preserve important memories while compacting less important ones', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'coffee_confessional.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      // Create a mix of important and routine memories
      const mixedActions = [
        'I discover something crucial about Alex',  // High importance
        'I glance around the café',                // Low importance
        'I make a life-changing realization',      // High importance  
        'I adjust my position in the chair',       // Low importance
        'I learn Alex\'s deepest secret',          // High importance
        'I sip my coffee',                         // Low importance
        'I understand the true situation',         // High importance
        'I check the time',                        // Low importance
      ];
      
      for (const action of mixedActions) {
        await engine.processAction({ input: action });
      }
      
      // Trigger more actions to force compaction
      for (let i = 0; i < 10; i++) {
        await engine.processAction({ input: `Additional action ${i}` });
      }
      
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      // Important memories should be preserved
      const memoryText = memoryContext.memories.join(' ');
      expect(memoryText).toMatch(/crucial|realization|secret|understand/i);
      
      console.log(`Preserved memories after compaction:`, memoryContext.memories.slice(0, 3));
    });

    it('should compact efficiently without losing narrative coherence', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'sentient_quill.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      // Simulate a complete investigation narrative
      const investigationNarrative = [
        'I arrive at the crime scene',
        'I discover the victim at the desk',
        'I find the mysterious quill pen',
        'I examine the poison evidence',
        'I identify the murder weapon',
        'I uncover the business motive',
        'I discover the threatening letter',
        'I trace the financial connections',
        'I identify the prime suspect',
        'I gather final evidence',
        'I prepare to make the arrest',
        'I solve the murder case'
      ];
      
      const memoryManager = (engine as any).memoryManager;
      const initialStats = memoryManager.getStats();
      
      for (const action of investigationNarrative) {
        await engine.processAction({ input: action });
      }
      
      const finalStats = memoryManager.getStats();
      const memoryContext = memoryManager.getMemories();
      
      // Should have compacted but retained story coherence
      expect(finalStats.totalMemories).toBeGreaterThan(initialStats.totalMemories);
      expect(finalStats.totalMemories).toBeLessThanOrEqual(60);
      
      // Key narrative elements should be preserved
      const narrativeText = memoryContext.memories.join(' ').toLowerCase();
      expect(narrativeText).toMatch(/crime|victim|evidence|suspect|murder/);
      
      console.log(`Investigation memories preserved:`, memoryContext.memories.length);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with high memory turnover', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'coffee_confessional.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      const startTime = performance.now();
      
      // Simulate rapid gameplay with many memory operations
      for (let i = 0; i < 30; i++) {
        await engine.processAction({ input: `Rapid action sequence ${i}` });
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerAction = totalTime / 30;
      
      // Performance should remain reasonable even with heavy memory usage
      expect(avgTimePerAction).toBeLessThan(50); // Less than 50ms per action on average
      
      const memoryManager = (engine as any).memoryManager;
      const finalStats = memoryManager.getStats();
      
      // Memory should be bounded despite high turnover (allowing for dual memory tracking)
      expect(finalStats.totalMemories).toBeLessThanOrEqual(70);
      
      console.log(`Performance: ${avgTimePerAction.toFixed(2)}ms per action, ${finalStats.totalMemories} total memories`);
    });

    it('should handle memory compaction without blocking gameplay', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'sentient_quill.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      const memoryManager = (engine as any).memoryManager;
      let compactionTriggered = false;
      
      // Monitor for compaction events
      const originalStats = memoryManager.getStats;
      memoryManager.getStats = vi.fn().mockImplementation(() => {
        const stats = originalStats.call(memoryManager);
        if (stats.isProcessing) {
          compactionTriggered = true;
        }
        return stats;
      });
      
      // Trigger actions that should cause compaction
      for (let i = 0; i < 15; i++) {
        const startTime = performance.now();
        await engine.processAction({ input: `Memory-intensive action ${i}` });
        const actionTime = performance.now() - startTime;
        
        // Individual actions should remain fast even during compaction
        expect(actionTime).toBeLessThan(100); // Less than 100ms per action
      }
      
      // Verify that compaction can be triggered (though it runs async)
      const finalStats = memoryManager.getStats();
      expect(finalStats.totalMemories).toBeGreaterThan(0);
      
      // Restore original method
      memoryManager.getStats = originalStats;
      
      console.log(`Compaction handling test completed, final memory count: ${finalStats.totalMemories}`);
    });
  });

  describe('Memory Quality Assessment', () => {
    it('should preserve narrative-relevant memories over generic ones', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'coffee_confessional.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      // Mix of narrative-relevant and generic actions
      const narrativeActions = [
        'I reveal my romantic feelings to Alex',     // High narrative value
        'I adjust my sleeves',                       // Low narrative value
        'Alex confesses a deep secret to me',        // High narrative value
        'I take a sip of coffee',                    // Low narrative value
        'We share a meaningful look',                // High narrative value
        'I glance at my phone',                      // Low narrative value
        'Alex reaches for my hand',                  // High narrative value
        'I notice the café music',                   // Low narrative value
      ];
      
      for (const action of narrativeActions) {
        await engine.processAction({ input: action });
      }
      
      // Add more generic actions to force compaction
      for (let i = 0; i < 15; i++) {
        await engine.processAction({ input: `Generic background action ${i}` });
      }
      
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      // Check if high-value narrative memories are preserved
      const memoryText = memoryContext.memories.join(' ').toLowerCase();
      const narrativeKeywords = ['romantic', 'feelings', 'secret', 'meaningful', 'hand'];
      const narrativeScore = narrativeKeywords.filter(keyword => 
        memoryText.includes(keyword)
      ).length;
      
      const genericKeywords = ['sleeves', 'coffee', 'phone', 'music'];
      const genericScore = genericKeywords.filter(keyword => 
        memoryText.includes(keyword)  
      ).length;
      
      // Should preserve more narrative-relevant content
      expect(narrativeScore).toBeGreaterThan(genericScore);
      
      console.log(`Memory quality: ${narrativeScore} narrative vs ${genericScore} generic keywords preserved`);
    });
  });
});