import { describe, it, expect, beforeEach } from 'vitest'
import { ImpressionistEngine } from '@/engine/impressionistEngine'
import type { ImpressionistStory } from '@/types/impressionistStory'

describe('YAML Content Normalization for process_sketch: false', () => {
  let engine: ImpressionistEngine

  beforeEach(() => {
    engine = new ImpressionistEngine()
  })

  function createTestStory(sketch: string, processSketch: boolean = false): ImpressionistStory {
    return {
      title: 'Test Story',
      author: 'Test Author',
      blurb: 'Test blurb',
      version: '1.0',
      context: 'Test context',
      guidance: 'Test guidance',
      scenes: {
        opening: {
          sketch: sketch || ' ', // Ensure we have some content to avoid the "no initial content" message
          process_sketch: processSketch
        }
      },
      endings: {
        when: ['test ending condition'],
        variations: []
      }
    }
  }

  describe('when process_sketch is false', () => {
    it('should return formatted content for simple single paragraph', () => {
      const sketch = 'This is a simple paragraph with no line breaks.'
      const story = createTestStory(sketch, false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('This is a simple paragraph with no line breaks.')
    })

    it('should preserve explicit paragraph breaks (double newlines)', () => {
      const sketch = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
      const story = createTestStory(sketch, false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.')
    })

    it('should convert single newlines within paragraphs to spaces', () => {
      const sketch = 'This is a long paragraph\nthat wraps across\nmultiple lines in YAML.'
      const story = createTestStory(sketch, false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('This is a long paragraph that wraps across multiple lines in YAML.')
    })

    it('should handle Friday Night Rain style content with visual paragraph breaks', () => {
      const sketch = `The barista's voice cuts gentle through the quiet. "Should I warm that up?"

[Alex](character:alex) doesn't hear, or pretends not to. Their reflection in the window 
watches the rain while the real Alex stirs patterns in *cold coffee*.

You've counted seventeen stirs. The barista waits, cloth in hand, 
her glance asking you to translate this silence.

These Friday evenings used to be easier. Now each word feels weighted,
each pause examined. Something shifted weeks ago - a held gaze that 
lasted too long, a goodbye hug that almost wasn't.

[The barista still waits. How do you bridge this distance?]`

      const story = createTestStory(sketch, false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      // Should preserve paragraph structure but remove line breaks within paragraphs
      expect(result).toContain('The barista\'s voice cuts gentle through the quiet. "Should I warm that up?"')
      expect(result).toContain('[Alex](character:alex) doesn\'t hear, or pretends not to. Their reflection in the window watches the rain while the real Alex stirs patterns in *cold coffee*.')
      expect(result).toContain('You\'ve counted seventeen stirs. The barista waits, cloth in hand, her glance asking you to translate this silence.')
      expect(result).toContain('These Friday evenings used to be easier. Now each word feels weighted, each pause examined. Something shifted weeks ago - a held gaze that lasted too long, a goodbye hug that almost wasn\'t.')
      expect(result).toContain('[The barista still waits. How do you bridge this distance?]')
      
      // Should have paragraph breaks between sections
      const paragraphs = result!.split('\n\n')
      expect(paragraphs).toHaveLength(5)
    })

    it('should handle mixed content with existing paragraph breaks and line wraps', () => {
      const sketch = `First paragraph with
line wraps in the middle.

Second paragraph that also
has some line breaks
for readability.

Third paragraph is simple.`

      const story = createTestStory(sketch, false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('First paragraph with line wraps in the middle.\n\nSecond paragraph that also has some line breaks for readability.\n\nThird paragraph is simple.')
    })

    it('should normalize multiple spaces to single spaces', () => {
      const sketch = 'Text with    multiple   spaces\nand    line breaks   too.'
      const story = createTestStory(sketch, false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('Text with multiple spaces and line breaks too.')
    })

    it('should trim leading and trailing whitespace', () => {
      const sketch = '  \n  Text with leading and trailing whitespace  \n  '
      const story = createTestStory(sketch, false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('Text with leading and trailing whitespace')
    })
  })

  describe('when process_sketch is true or undefined', () => {
    it('should return null to indicate LLM processing needed', () => {
      const sketch = 'Any content here'
      const story = createTestStory(sketch, true)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe(null)
    })

    it('should return null when process_sketch is undefined (default)', () => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test Author',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          opening: {
            sketch: 'Any content here'
            // process_sketch is undefined (default behavior)
          }
        },
        endings: {
          when: ['test ending condition'],
          variations: []
        }
      }
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe(null)
    })
  })

  describe('edge cases', () => {
    it('should handle empty sketch', () => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test Author',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          opening: {
            sketch: '',
            process_sketch: false
          }
        },
        endings: {
          when: ['test ending condition'],
          variations: []
        }
      }
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('Story loaded, but no initial content available.')
    })

    it('should handle sketch with only whitespace', () => {
      const story = createTestStory('   \n\n   \n   ', false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('')
    })

    it('should handle sketch with only newlines', () => {
      const story = createTestStory('\n\n\n\n', false)
      
      engine.loadStory(story)
      const result = engine.getInitialText()
      
      expect(result).toBe('')
    })
  })
})