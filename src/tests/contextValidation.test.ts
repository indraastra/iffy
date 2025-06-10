/**
 * Tests for Context Size Validation
 * 
 * Validates that the impressionist engine keeps context size under reasonable limits
 * for token efficiency and LLM performance.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpressionistEngine } from '@/engine/impressionistEngine';
import { ImpressionistParser } from '@/engine/impressionistParser';
import { AnthropicService } from '@/services/anthropicService';
import { BUNDLED_STORIES } from '@/bundled-examples';

// Target context limits (in estimated tokens)
const TARGET_CONTEXT_LIMIT = 1000; // tokens
const ROUGH_CHARS_PER_TOKEN = 4; // Conservative estimate

// Mock service that captures prompts for analysis
const createContextCapturingService = () => {
  const capturedPrompts: string[] = [];
  
  return {
    service: {
      isConfigured: vi.fn().mockReturnValue(true),
      makeRequestWithUsage: vi.fn().mockImplementation(async (prompt: string) => {
        capturedPrompts.push(prompt);
        
        return {
          content: JSON.stringify({
            narrative: 'Test response for context validation.',
            signals: {}
          }),
          usage: {
            input_tokens: Math.floor(prompt.length / ROUGH_CHARS_PER_TOKEN),
            output_tokens: 50
          }
        };
      })
    } as any,
    getPrompts: () => capturedPrompts,
    getLastPrompt: () => capturedPrompts[capturedPrompts.length - 1],
    clear: () => capturedPrompts.length = 0
  };
};

// Helper to estimate token count
const estimateTokenCount = (text: string): number => {
  return Math.ceil(text.length / ROUGH_CHARS_PER_TOKEN);
};

// Helper to analyze prompt structure
const analyzePromptStructure = (prompt: string) => {
  const lines = prompt.split('\n');
  const sections: Record<string, number> = {};
  let currentSection = 'unknown';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.endsWith(':') && trimmed.toUpperCase() === trimmed) {
      currentSection = trimmed.slice(0, -1).toLowerCase();
      sections[currentSection] = 0;
    } else if (trimmed) {
      sections[currentSection] = (sections[currentSection] || 0) + line.length;
    }
  }
  
  return Object.fromEntries(
    Object.entries(sections).map(([key, charCount]) => [
      key, 
      Math.ceil(charCount / ROUGH_CHARS_PER_TOKEN)
    ])
  );
};

describe('Context Size Validation', () => {
  let engine: ImpressionistEngine;
  let parser: ImpressionistParser;
  let mockService: ReturnType<typeof createContextCapturingService>;

  beforeEach(() => {
    parser = new ImpressionistParser();
    mockService = createContextCapturingService();
    engine = new ImpressionistEngine(mockService.service);
  });

  describe('Initial Context Size', () => {
    it('should have reasonable context size for minimal story on first action', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'the_key.yaml')?.content;
      expect(storyContent).toBeDefined();
      
      const parseResult = parser.parseFromYaml(storyContent!);
      expect(parseResult.story).toBeDefined();
      
      engine.loadStory(parseResult.story!);
      await engine.processAction({ input: 'I examine the door' });
      
      const prompt = mockService.getLastPrompt();
      const tokenCount = estimateTokenCount(prompt);
      
      expect(tokenCount).toBeLessThan(TARGET_CONTEXT_LIMIT);
      console.log(`Minimal story initial context: ${tokenCount} tokens`);
    });

    it('should have reasonable context size for medium story on first action', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'coffee_confessional.yaml')?.content;
      expect(storyContent).toBeDefined();
      
      const parseResult = parser.parseFromYaml(storyContent!);
      expect(parseResult.story).toBeDefined();
      
      engine.loadStory(parseResult.story!);
      await engine.processAction({ input: 'I look at Alex' });
      
      const prompt = mockService.getLastPrompt();
      const tokenCount = estimateTokenCount(prompt);
      
      expect(tokenCount).toBeLessThan(TARGET_CONTEXT_LIMIT);
      console.log(`Medium story initial context: ${tokenCount} tokens`);
    });

    it('should have reasonable context size for rich story on first action', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'sentient_quill.yaml')?.content;
      expect(storyContent).toBeDefined();
      
      const parseResult = parser.parseFromYaml(storyContent!);
      expect(parseResult.story).toBeDefined();
      
      engine.loadStory(parseResult.story!);
      await engine.processAction({ input: 'I examine the quill' });
      
      const prompt = mockService.getLastPrompt();
      const tokenCount = estimateTokenCount(prompt);
      
      expect(tokenCount).toBeLessThan(TARGET_CONTEXT_LIMIT);
      console.log(`Rich story initial context: ${tokenCount} tokens`);
    });
  });

  describe('Context Growth Over Time', () => {
    it('should maintain reasonable context size as conversation grows', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'coffee_confessional.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      const actions = [
        'I greet Alex warmly',
        'I ask how Alex is feeling today',
        'I notice Alex seems distracted',
        'I ask if something is wrong',
        'I listen carefully to what Alex says',
        'I offer my support',
        'I share my own feelings',
        'I reach out and touch Alex\'s hand',
        'I look into Alex\'s eyes',
        'I tell Alex I care about our friendship'
      ];
      
      const tokenCounts: number[] = [];
      
      for (const action of actions) {
        await engine.processAction({ input: action });
        const prompt = mockService.getLastPrompt();
        const tokenCount = estimateTokenCount(prompt);
        tokenCounts.push(tokenCount);
        
        expect(tokenCount).toBeLessThan(TARGET_CONTEXT_LIMIT);
      }
      
      console.log(`Context growth over ${actions.length} actions: ${tokenCounts.join(' -> ')} tokens`);
      
      // Context should not grow indefinitely
      const initialTokens = tokenCounts[0];
      const finalTokens = tokenCounts[tokenCounts.length - 1];
      const growthRatio = finalTokens / initialTokens;
      
      expect(growthRatio).toBeLessThan(3); // Should not triple in size
    });

    it('should manage memory context efficiently', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'sentient_quill.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      // Perform actions that should create memories
      const memoryIntensiveActions = [
        'I discover a hidden clue',
        'I remember an important detail about the victim',
        'I find evidence of the murder weapon',
        'I recall a conversation with a suspect',
        'I uncover the motive for the crime',
        'I piece together the timeline of events',
        'I identify the killer',
        'I prepare to make an arrest'
      ];
      
      for (const action of memoryIntensiveActions) {
        await engine.processAction({ input: action });
        const prompt = mockService.getLastPrompt();
        const tokenCount = estimateTokenCount(prompt);
        
        expect(tokenCount).toBeLessThan(TARGET_CONTEXT_LIMIT);
      }
      
      // Check that memory is being managed
      const memoryManager = (engine as any).memoryManager;
      const memoryContext = memoryManager.getMemories();
      
      expect(memoryContext.memories.length).toBeGreaterThan(0);
      expect(memoryContext.memories.length).toBeLessThanOrEqual(15); // MAX_RETURNED_MEMORIES
    });
  });

  describe('Context Structure Analysis', () => {
    it('should have balanced context sections', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'coffee_confessional.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      await engine.processAction({ input: 'I start a conversation with Alex' });
      
      const prompt = mockService.getLastPrompt();
      const structure = analyzePromptStructure(prompt);
      
      console.log('Context structure analysis:', structure);
      
      // Core sections should be present and reasonably sized
      expect(structure['story context']).toBeGreaterThan(0);
      expect(structure['current scene']).toBeGreaterThan(0);
      expect(structure['guidance']).toBeGreaterThan(0);
      
      // No single section should dominate the context (allowing 70% for guidance which can be long)
      const totalTokens = Object.values(structure).reduce((sum, tokens) => sum + tokens, 0);
      for (const [section, tokens] of Object.entries(structure)) {
        const percentage = (tokens / totalTokens) * 100;
        expect(percentage).toBeLessThan(70); // No section should be more than 70% of context
        console.log(`${section}: ${tokens} tokens (${percentage.toFixed(1)}%)`);
      }
    });

    it('should prioritize essential context elements', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'sentient_quill.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      await engine.processAction({ input: 'I examine the crime scene' });
      
      const prompt = mockService.getLastPrompt();
      
      // Essential elements should be present
      expect(prompt).toContain('STORY CONTEXT:');
      expect(prompt).toContain('CURRENT SCENE:');
      expect(prompt).toContain('GUIDANCE:');
      expect(prompt).toContain('PLAYER ACTION:');
      
      // Rich story elements should be included when relevant
      expect(prompt).toContain('NARRATIVE STYLE:');
      expect(prompt).toContain('CHARACTERS PRESENT:');
      
      // DISCOVERABLE ITEMS only appears if there are items in the current scene
      // The arrival scene might not have discoverable items, which is fine
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    it('should handle very long player inputs gracefully', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'the_key.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      // Create a very long input
      const longInput = 'I examine the door very carefully, looking at every detail including ' +
        'the wood grain, the metal hinges, the doorknob texture, the surrounding frame, ' +
        'any scratches or marks, the type of lock mechanism, whether there are any hidden ' +
        'switches or buttons, if there are any unusual decorations, patterns, or symbols, ' +
        'and I also check if the door is warm or cold to the touch, listen for any sounds ' +
        'from the other side, and try to peer through any gaps or keyholes to see what ' +
        'might be beyond this mysterious barrier that stands before me in this adventure.';
      
      await engine.processAction({ input: longInput });
      
      const prompt = mockService.getLastPrompt();
      const tokenCount = estimateTokenCount(prompt);
      
      expect(tokenCount).toBeLessThan(TARGET_CONTEXT_LIMIT);
      expect(prompt).toContain(longInput); // Should include the full input
    });

    it('should maintain efficiency with rapid successive actions', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'coffee_confessional.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      const rapidActions = [
        'I look', 'I listen', 'I think', 'I speak', 'I gesture',
        'I nod', 'I smile', 'I wait', 'I observe', 'I respond'
      ];
      
      let maxTokens = 0;
      for (const action of rapidActions) {
        await engine.processAction({ input: action });
        const prompt = mockService.getLastPrompt();
        const tokenCount = estimateTokenCount(prompt);
        maxTokens = Math.max(maxTokens, tokenCount);
        
        expect(tokenCount).toBeLessThan(TARGET_CONTEXT_LIMIT);
      }
      
      console.log(`Max context size during rapid actions: ${maxTokens} tokens`);
    });
  });

  describe('Token Efficiency Optimization', () => {
    it('should efficiently use available context budget', async () => {
      const storyContent = BUNDLED_STORIES.find(s => s.filename === 'sentient_quill.yaml')?.content;
      const parseResult = parser.parseFromYaml(storyContent!);
      engine.loadStory(parseResult.story!);
      
      await engine.processAction({ input: 'I begin my investigation' });
      
      const prompt = mockService.getLastPrompt();
      const tokenCount = estimateTokenCount(prompt);
      const efficiency = tokenCount / TARGET_CONTEXT_LIMIT;
      
      console.log(`Context efficiency: ${(efficiency * 100).toFixed(1)}% of budget used`);
      
      // Should use a reasonable portion of the budget (not too little, not too much)
      expect(efficiency).toBeGreaterThan(0.3); // At least 30% utilization
      expect(efficiency).toBeLessThan(1.0); // Under the limit
    });

    it('should scale context appropriately with story complexity', async () => {
      const stories = [
        { name: 'minimal', filename: 'the_key.yaml' },
        { name: 'medium', filename: 'coffee_confessional.yaml' },
        { name: 'rich', filename: 'sentient_quill.yaml' }
      ];
      
      const tokenCounts: Record<string, number> = {};
      
      for (const story of stories) {
        const storyContent = BUNDLED_STORIES.find(s => s.filename === story.filename)?.content;
        expect(storyContent).toBeDefined();
        
        const parseResult = parser.parseFromYaml(storyContent!);
        engine.loadStory(parseResult.story!);
        mockService.clear();
        
        await engine.processAction({ input: 'I begin' });
        
        const prompt = mockService.getLastPrompt();
        const tokenCount = estimateTokenCount(prompt);
        tokenCounts[story.name] = tokenCount;
        
        expect(tokenCount).toBeLessThan(TARGET_CONTEXT_LIMIT);
      }
      
      console.log('Context scaling:', tokenCounts);
      
      // More complex stories should use more context (but stay within limits)
      expect(tokenCounts.minimal).toBeLessThan(tokenCounts.medium);
      expect(tokenCounts.medium).toBeLessThan(tokenCounts.rich);
    });
  });
});