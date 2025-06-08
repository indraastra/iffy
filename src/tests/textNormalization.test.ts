import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '@/engine/gameEngine';

describe('Text Normalization', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
  });

  it('should normalize double spaces created by line breaks', () => {
    const testStory = {
      title: "Test Story",
      author: "Test",
      version: "1.0",
      metadata: { 
        setting: { time: "test", place: "test" },
        tone: { overall: "test", narrative_voice: "test" },
        themes: ["test"]
      },
      characters: [],
      locations: [{ id: "test", name: "Test", connections: [], description: "Test location" }],
      items: [],
      flows: [{
        id: "start",
        name: "Opening",
        type: "narrative",
        location: "test",
        content: "The corner café feels different tonight. Maybe it's the way Jamie keeps avoiding \neye contact, or how they've barely touched their latte. You've been friends for \nyears, but lately something has changed.\n\nThey stir their coffee absently."
      }]
    };

    const result = gameEngine.loadStory(testStory);
    expect(result.success).toBe(true);

    const initialText = gameEngine.getInitialText();
    
    // Should not contain double spaces
    expect(initialText).not.toContain('avoiding  eye');
    expect(initialText).not.toContain('for  years');
    
    // Should contain single spaces
    expect(initialText).toContain('avoiding eye contact');
    expect(initialText).toContain('friends for years');
    
    // Should preserve paragraph breaks
    expect(initialText).toContain('\n\n');
  });

  it('should handle multiple types of whitespace', () => {
    const testStory = {
      title: "Test Story",
      author: "Test", 
      version: "1.0",
      metadata: { 
        setting: { time: "test", place: "test" },
        tone: { overall: "test", narrative_voice: "test" },
        themes: ["test"]
      },
      characters: [],
      locations: [{ id: "test", name: "Test", connections: [], description: "Test location" }],
      items: [],
      flows: [{
        id: "start",
        name: "Opening",
        type: "narrative",
        location: "test",
        content: "Text with   multiple    spaces\nand\tsome\ttabs\nand   mixed   \n   whitespace."
      }]
    };

    const result = gameEngine.loadStory(testStory);
    expect(result.success).toBe(true);

    const initialText = gameEngine.getInitialText();
    
    // Should normalize all multiple whitespace to single spaces
    expect(initialText).toBe('Text with multiple spaces and some tabs and mixed whitespace.');
  });

  it('should preserve paragraph breaks', () => {
    const testStory = {
      title: "Test Story",
      author: "Test",
      version: "1.0", 
      metadata: { 
        setting: { time: "test", place: "test" },
        tone: { overall: "test", narrative_voice: "test" },
        themes: ["test"]
      },
      characters: [],
      locations: [{ id: "test", name: "Test", connections: [], description: "Test location" }],
      items: [],
      flows: [{
        id: "start",
        name: "Opening",
        type: "narrative",
        location: "test",
        content: "First paragraph with\nline breaks.\n\nSecond paragraph with\nmore line breaks.\n\n\nThird paragraph after\nextra spacing."
      }]
    };

    const result = gameEngine.loadStory(testStory);
    expect(result.success).toBe(true);

    const initialText = gameEngine.getInitialText();
    
    // Should have exactly two newlines between paragraphs
    expect(initialText).toBe('First paragraph with line breaks.\n\nSecond paragraph with more line breaks.\n\nThird paragraph after extra spacing.');
  });
});