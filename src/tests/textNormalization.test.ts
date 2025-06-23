/**
 * Tests for text normalization utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeYamlText, 
  normalizeSpaces, 
  collapseProseParagraphs 
} from '@/utils/textNormalization';

describe('Text Normalization Utilities', () => {
  describe('normalizeYamlText', () => {
    it('should preserve list formatting with bullet points', () => {
      const input = `You stand before a security terminal with four buttons:
- A RED button marked "1"
- A BLUE button marked "2"
- A GREEN button marked "3"
- A large CONFIRM button

The display shows: "ENTER ACCESS CODE"`;
      
      const result = normalizeYamlText(input);
      
      expect(result).toContain('You stand before a security terminal with four buttons:\n');
      expect(result).toContain('- A RED button marked "1"\n');
      expect(result).toContain('- A BLUE button marked "2"\n');
      expect(result).toContain('- A GREEN button marked "3"\n');
      expect(result).toContain('- A large CONFIRM button\n');
      expect(result).toContain('\nThe display shows: "ENTER ACCESS CODE"');
    });

    it('should preserve numbered list formatting', () => {
      const input = `Instructions:
1. Press the red button first
2. Then press the blue button
3. Finally, press confirm

Remember the sequence!`;
      
      const result = normalizeYamlText(input);
      
      expect(result).toContain('Instructions:\n');
      expect(result).toContain('1. Press the red button first\n');
      expect(result).toContain('2. Then press the blue button\n');
      expect(result).toContain('3. Finally, press confirm\n');
    });

    it('should preserve indented content', () => {
      const input = `Main items:
- First item
  - Nested sub-item A
  - Nested sub-item B
- Second item
  Additional info about second item`;
      
      const result = normalizeYamlText(input);
      
      expect(result).toContain('- First item\n');
      expect(result).toContain('  - Nested sub-item A\n');
      expect(result).toContain('  - Nested sub-item B\n');
      expect(result).toContain('- Second item\n');
      expect(result).toContain('  Additional info about second item');
    });

    it('should collapse single newlines in prose paragraphs', () => {
      const input = `The barista's voice cuts gentle through the quiet. "Should I warm that up?"

Alex doesn't hear, or pretends not to. Their reflection in the window
watches the rain while the real Alex stirs patterns in cold coffee.

You've counted seventeen stirs. The barista waits, cloth in hand,
her glance asking you to translate this silence.`;
      
      const result = normalizeYamlText(input);
      
      // Should preserve paragraph breaks (double newlines)
      expect(result).toContain('The barista\'s voice cuts gentle through the quiet. "Should I warm that up?"\n\n');
      expect(result).toContain('Alex doesn\'t hear, or pretends not to. Their reflection in the window watches the rain while the real Alex stirs patterns in cold coffee.\n\n');
      
      // Should collapse single newlines within paragraphs
      expect(result).not.toContain('window\nwatches');
      expect(result).toContain('window watches');
      expect(result).not.toContain('hand,\nher');
      expect(result).toContain('hand, her');
    });

    it('should handle mixed content correctly', () => {
      const input = `Welcome to the game!

Here are your options:
- Move north to explore the forest
- Move south to visit the village
- Check your inventory

The sun is setting over the horizon, painting
the sky in brilliant shades of orange and red.
Birds fly overhead in perfect formation.

Remember:
  * Save often
  * Talk to everyone
  * Explore thoroughly`;
      
      const result = normalizeYamlText(input);
      
      // Check paragraph breaks preserved
      expect(result).toContain('Welcome to the game!\n\n');
      expect(result).toContain('Here are your options:\n');
      
      // Check list items preserved
      expect(result).toContain('- Move north to explore the forest\n');
      expect(result).toContain('- Move south to visit the village\n');
      
      // Check prose is collapsed
      expect(result).toContain('The sun is setting over the horizon, painting the sky in brilliant shades of orange and red. Birds fly overhead in perfect formation.');
      
      // Check indented content preserved
      expect(result).toContain('  * Save often\n');
      expect(result).toContain('  * Talk to everyone\n');
    });

    it('should handle asterisk bullets', () => {
      const input = `Available actions:
* Look around
* Take the key
* Open the door`;
      
      const result = normalizeYamlText(input);
      
      expect(result).toContain('Available actions:\n');
      expect(result).toContain('* Look around\n');
      expect(result).toContain('* Take the key\n');
      expect(result).toContain('* Open the door');
    });

    it('should normalize multiple spaces', () => {
      const input = 'Text with    multiple   spaces and    line breaks   too.';
      
      const result = normalizeYamlText(input);
      
      expect(result).toBe('Text with multiple spaces and line breaks too.');
    });

    it('should trim leading and trailing whitespace', () => {
      const input = `   You enter the room.   

  - Item one  
  - Item two  


Final paragraph here.   `;
      
      const result = normalizeYamlText(input);
      
      // Should trim leading/trailing whitespace of the whole text
      expect(result.startsWith('You enter the room.')).toBe(true);
      expect(result.endsWith('Final paragraph here.')).toBe(true);
      
      // Should preserve list structure
      expect(result).toContain('\n  - Item one  \n');
      expect(result).toContain('\n  - Item two  \n');
      
      // Should have paragraph breaks
      expect(result).toContain('room.   \n\n');
      expect(result).toContain('  \n\nFinal paragraph');
    });

    it('should handle bullet character (•)', () => {
      const input = `Tasks:
• First task
• Second task
• Third task`;
      
      const result = normalizeYamlText(input);
      
      expect(result).toContain('Tasks:\n');
      expect(result).toContain('• First task\n');
      expect(result).toContain('• Second task\n');
      expect(result).toContain('• Third task');
    });
  });

  describe('normalizeSpaces', () => {
    it('should normalize multiple spaces to single spaces', () => {
      const input = 'Text with    multiple   spaces  here';
      const result = normalizeSpaces(input);
      expect(result).toBe('Text with multiple spaces here');
    });

    it('should preserve single spaces', () => {
      const input = 'Text with normal spaces';
      const result = normalizeSpaces(input);
      expect(result).toBe('Text with normal spaces');
    });

    it('should preserve indentation at start of line', () => {
      const input = '  Indented text    with   multiple spaces';
      const result = normalizeSpaces(input);
      expect(result).toBe('  Indented text with multiple spaces');
    });
  });

  describe('collapseProseParagraphs', () => {
    it('should collapse single newlines to spaces', () => {
      const input = `This is a paragraph
with line breaks
in the middle.`;
      
      const result = collapseProseParagraphs(input);
      
      expect(result).toBe('This is a paragraph with line breaks in the middle.');
    });

    it('should preserve paragraph breaks', () => {
      const input = `First paragraph
with line breaks.

Second paragraph
also with breaks.`;
      
      const result = collapseProseParagraphs(input);
      
      expect(result).toBe('First paragraph with line breaks.\n\nSecond paragraph also with breaks.');
    });

    it('should normalize multiple spaces', () => {
      const input = `Text with    multiple   spaces
and    line breaks   too.`;
      
      const result = collapseProseParagraphs(input);
      
      expect(result).toBe('Text with multiple spaces and line breaks too.');
    });

    it('should trim whitespace', () => {
      const input = `  
Text with leading and trailing whitespace
  `;
      
      const result = collapseProseParagraphs(input);
      
      expect(result).toBe('Text with leading and trailing whitespace');
    });
  });

  describe('Integration with ImpressionistEngine', () => {
    it('should handle the test_conditions.yaml terminal scenario correctly', () => {
      const terminalSketch = `You stand before a security terminal with four buttons:
- A RED button marked "1"
- A BLUE button marked "2" 
- A GREEN button marked "3"
- A large CONFIRM button

The display shows: "ENTER ACCESS CODE - PRESS CONFIRM TO SUBMIT"
Current sequence: [None entered]`;
      
      const result = normalizeYamlText(terminalSketch);
      
      // Should preserve the list structure exactly
      expect(result).toContain('You stand before a security terminal with four buttons:\n');
      expect(result).toContain('- A RED button marked "1"\n');
      expect(result).toContain('- A BLUE button marked "2" \n'); // Note: preserves trailing space
      expect(result).toContain('- A GREEN button marked "3"\n');
      expect(result).toContain('- A large CONFIRM button\n');
      
      // Should preserve paragraph structure (prose lines get joined)
      expect(result).toContain('The display shows: "ENTER ACCESS CODE - PRESS CONFIRM TO SUBMIT" Current sequence: [None entered]');
    });

    it('should handle the friday_night_rain.yaml prose correctly', () => {
      const proseSketch = `The barista's voice cuts gentle through the quiet. "Should I warm that up?"

[Alex](character:alex) doesn't hear, or pretends not to. Their reflection in the window 
watches the rain while the real Alex stirs patterns in *cold coffee*.

You've counted seventeen stirs. The barista waits, cloth in hand, 
her glance asking you to translate this silence.`;
      
      const result = normalizeYamlText(proseSketch);
      
      // Should preserve paragraph breaks
      expect(result).toContain('The barista\'s voice cuts gentle through the quiet. "Should I warm that up?"\n\n');
      
      // Should collapse prose line breaks within paragraphs
      expect(result).toContain('[Alex](character:alex) doesn\'t hear, or pretends not to. Their reflection in the window watches the rain while the real Alex stirs patterns in *cold coffee*.\n\n');
      expect(result).toContain('You\'ve counted seventeen stirs. The barista waits, cloth in hand, her glance asking you to translate this silence.');
      
      // Should not have unwanted line breaks in the middle of sentences
      expect(result).not.toContain('window \nwatches');
      expect(result).not.toContain('hand, \nher');
    });
  });
});