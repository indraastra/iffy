import { describe, it, expect, beforeEach } from 'vitest'
import { RichTextParser } from '../utils/richTextParser'

describe('RichTextParser', () => {
  let parser: RichTextParser

  beforeEach(() => {
    parser = new RichTextParser()
  })

  // Helper function to convert DocumentFragment to HTML string for testing
  function fragmentToHTML(fragment: DocumentFragment): string {
    const div = document.createElement('div')
    div.appendChild(fragment.cloneNode(true))
    return div.innerHTML
  }

  // Helper function to test that output contains expected HTML and no placeholders
  function expectValidHTML(input: string, expectedSubstrings: string[]) {
    const result = parser.renderContent(input)
    const html = fragmentToHTML(result)
    
    // Check for expected content - update for clickable elements
    expectedSubstrings.forEach(expected => {
      if (expected.includes('rich-character') || expected.includes('rich-item')) {
        // For character and item elements, check for the class and content separately
        const classMatch = expected.match(/class="([^"]+)"/)
        const contentMatch = expected.match(/>([^<]+)</)
        
        if (classMatch) {
          expect(html).toContain(`class="${classMatch[1]} clickable-element"`)
        }
        if (contentMatch) {
          expect(html).toContain(`>${contentMatch[1]}<`)
        }
      } else {
        expect(html).toContain(expected)
      }
    })
    
    // Ensure no component placeholders remain
    expect(html).not.toContain('{{COMPONENT:')
    expect(html).not.toContain('[MISSING:')
    
    return html
  }

  describe('Basic Formatting', () => {
    it('should render bold text correctly', () => {
      expectValidHTML(
        'This is **bold** text.',
        ['<strong class="rich-bold">bold</strong>']
      )
    })

    it('should render italic text correctly', () => {
      expectValidHTML(
        'This is *italic* text.',
        ['<em class="rich-italic">italic</em>']
      )
    })

    it('should render character markup correctly', () => {
      expectValidHTML(
        'Hello [character:ARIA]!',
        ['<span class="rich-character">ARIA</span>']
      )
    })

    it('should render item markup correctly', () => {
      expectValidHTML(
        'Found the [item:golden key].',
        ['<span class="rich-item">golden key</span>']
      )
    })

    it('should render warning alerts correctly', () => {
      expectValidHTML(
        '[!warning] This is dangerous!',
        [
          '<div class="rich-alert rich-alert-warning">',
          '<span class="rich-alert-icon">⚠️</span>',
          '<span class="rich-alert-content">This is dangerous!</span>'
        ]
      )
    })

    it('should render discovery alerts correctly', () => {
      expectValidHTML(
        '[!discovery] You found something!',
        [
          '<div class="rich-alert rich-alert-discovery">',
          '<span class="rich-alert-icon">✨</span>',
          '<span class="rich-alert-content">You found something!</span>'
        ]
      )
    })

    it('should render danger alerts correctly', () => {
      expectValidHTML(
        '[!danger] Look out!',
        [
          '<div class="rich-alert rich-alert-danger">',
          '<span class="rich-alert-icon">🚨</span>',
          '<span class="rich-alert-content">Look out!</span>'
        ]
      )
    })
  })

  describe('Multiple Components', () => {
    it('should handle multiple bold components', () => {
      expectValidHTML(
        'This is **first** and **second** bold.',
        [
          '<strong class="rich-bold">first</strong>',
          '<strong class="rich-bold">second</strong>'
        ]
      )
    })

    it('should handle mixed component types', () => {
      expectValidHTML(
        '[character:ARIA] found the **glowing** [item:orb].',
        [
          '<span class="rich-character">ARIA</span>',
          '<strong class="rich-bold">glowing</strong>',
          '<span class="rich-item">orb</span>'
        ]
      )
    })

    it('should handle adjacent components without spaces', () => {
      expectValidHTML(
        '**Bold**[character:Name]*italic*',
        [
          '<strong class="rich-bold">Bold</strong>',
          '<span class="rich-character">Name</span>',
          '<em class="rich-italic">italic</em>'
        ]
      )
    })
  })

  describe('Nested Components', () => {
    it('should handle bold text inside warning alert', () => {
      expectValidHTML(
        '[!warning] Be **very** careful!',
        [
          '<div class="rich-alert rich-alert-warning">',
          '<strong class="rich-bold">very</strong>'
        ]
      )
    })

    it('should handle character markup inside discovery alert', () => {
      expectValidHTML(
        '[!discovery] [character:Jennifer] found something!',
        [
          '<div class="rich-alert rich-alert-discovery">',
          '<span class="rich-character">Jennifer</span>'
        ]
      )
    })

    it('should handle multiple nested components in alert', () => {
      expectValidHTML(
        '[!discovery] [character:Jennifer] found the **magical** [item:sword]!',
        [
          '<div class="rich-alert rich-alert-discovery">',
          '<span class="rich-character">Jennifer</span>',
          '<strong class="rich-bold">magical</strong>',
          '<span class="rich-item">sword</span>'
        ]
      )
    })

    it('should handle complex nested scenario', () => {
      expectValidHTML(
        '[!warning] But choose wisely, dear [character:Jennifer]... for not all that glitters is **gold**!',
        [
          '<div class="rich-alert rich-alert-warning">',
          '<span class="rich-character">Jennifer</span>',
          '<strong class="rich-bold">gold</strong>'
        ]
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty bold components', () => {
      const html = expectValidHTML(
        'Text with **** empty bold.',
        ['<em class="rich-italic">**</em>']
      )
      expect(html).toContain('<em class="rich-italic">**</em>')
    })

    it('should handle special characters in components', () => {
      expectValidHTML(
        '[character:Jean-Luc Picard] and [item:sword of +1 magic]',
        [
          '<span class="rich-character">Jean-Luc Picard</span>',
          '<span class="rich-item">sword of +1 magic</span>'
        ]
      )
    })

    it('should handle components across line breaks', () => {
      expectValidHTML(
        'First **bold**\nSecond **bold**',
        [
          '<strong class="rich-bold">bold</strong>',
          '<strong class="rich-bold">bold</strong>'
        ]
      )
    })

    it('should handle plain text without components', () => {
      const result = parser.renderContent('Just plain text.')
      const html = fragmentToHTML(result)
      expect(html).toBe('Just plain text.')
    })

    it('should handle empty string', () => {
      const result = parser.renderContent('')
      const html = fragmentToHTML(result)
      expect(html).toBe('')
    })
  })

  describe('Regression Tests', () => {
    it('should handle the sandwich crisis scenario (issue #1)', () => {
      // This was failing - bold text in narrative
      expectValidHTML(
        'This bread... this **fateful** bread... could it be the answer to your hunger?',
        ['<strong class="rich-bold">fateful</strong>']
      )
    })

    it('should handle character markup in warning (issue #2)', () => {
      // This was failing - character markup not being replaced
      expectValidHTML(
        '[!warning] But choose wisely, dear [character:Jennifer]... for not all that glitters is gold!',
        [
          '<div class="rich-alert rich-alert-warning">',
          '<span class="rich-character">Jennifer</span>'
        ]
      )
    })

    it('should handle bold text in warning alert (issue #3)', () => {
      // This was failing - nested bold in alert
      expectValidHTML(
        '[!warning] Try **searching** the bread shelf first!',
        [
          '<div class="rich-alert rich-alert-warning">',
          '<strong class="rich-bold">searching</strong>'
        ]
      )
    })

    it('should handle complex LLM response with multiple nested components', () => {
      // Real-world scenario from game output
      const complexInput = `[character:The Voice of Destiny] *breathlessly* narrates:

As your eyes scan the shadowy depths, you spot it - [item:The Bread of Betrayal]! There it sits, its **golden-brown** crust gleaming with untold possibilities!

[!discovery] This bread... this **fateful** bread... could it be the answer to your hunger?`

      expectValidHTML(complexInput, [
        '<span class="rich-character">The Voice of Destiny</span>',
        '<em class="rich-italic">breathlessly</em>',
        '<span class="rich-item">The Bread of Betrayal</span>',
        '<strong class="rich-bold">golden-brown</strong>',
        '<div class="rich-alert rich-alert-discovery">',
        '<strong class="rich-bold">fateful</strong>'
      ])
    })
  })

  describe('Parser Internals', () => {
    it('should parse content and generate components', () => {
      const result = parser.parseContent('This is **bold** text with [item:key].')
      
      expect(result.components).toHaveLength(2)
      expect(result.components[0].type).toBe('Bold')
      expect(result.components[0].content).toBe('bold')
      expect(result.components[1].type).toBe('Item')
      expect(result.components[1].content).toBe('key')
      expect(result.text).toContain('{{COMPONENT:')
    })

    it('should generate unique component IDs', () => {
      const result = parser.parseContent('**first** **second**')
      
      expect(result.components).toHaveLength(2)
      expect(result.components[0].id).not.toBe(result.components[1].id)
      expect(result.components[0].id).toMatch(/^component_\d+$/)
      expect(result.components[1].id).toMatch(/^component_\d+$/)
    })

    it('should handle renderToDOM with parsed content', () => {
      const parsed = parser.parseContent('**bold** and [character:Name]')
      const fragment = parser.renderToDOM(parsed)
      const html = fragmentToHTML(fragment)
      
      expect(html).toContain('<strong class="rich-bold">bold</strong>')
      expect(html).toContain('class="rich-character clickable-element"')
      expect(html).toContain('>Name<')
      expect(html).not.toContain('{{COMPONENT:')
    })
  })

  describe('Component Replacement Logic', () => {
    it('should correctly split text with component placeholders', () => {
      const input = 'Start {{COMPONENT:comp1}} middle {{COMPONENT:comp2}} end'
      const segments = input.split(/\{\{COMPONENT:([^}]+)\}\}/)
      
      // Should create array: ['Start ', 'comp1', ' middle ', 'comp2', ' end']
      expect(segments).toHaveLength(5)
      expect(segments[0]).toBe('Start ')
      expect(segments[1]).toBe('comp1') // captured component ID
      expect(segments[2]).toBe(' middle ')
      expect(segments[3]).toBe('comp2') // captured component ID
      expect(segments[4]).toBe(' end')
    })

    it('should handle text with no components', () => {
      const input = 'Just plain text'
      const segments = input.split(/\{\{COMPONENT:([^}]+)\}\}/)
      
      expect(segments).toHaveLength(1)
      expect(segments[0]).toBe('Just plain text')
    })

    it('should handle text that starts with component', () => {
      const input = '{{COMPONENT:comp1}} text after'
      const segments = input.split(/\{\{COMPONENT:([^}]+)\}\}/)
      
      expect(segments).toHaveLength(3)
      expect(segments[0]).toBe('') // empty string before component
      expect(segments[1]).toBe('comp1') // captured component ID
      expect(segments[2]).toBe(' text after')
    })

    it('should handle text that ends with component', () => {
      const input = 'text before {{COMPONENT:comp1}}'
      const segments = input.split(/\{\{COMPONENT:([^}]+)\}\}/)
      
      expect(segments).toHaveLength(3)
      expect(segments[0]).toBe('text before ')
      expect(segments[1]).toBe('comp1') // captured component ID  
      expect(segments[2]).toBe('') // empty string after component
    })
  })
})