import { describe, it, expect, beforeEach } from 'vitest'
import { RichTextParser, RenderContext } from '../utils/richTextParser'

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
        'Hello [ARIA](character:ARIA)!',
        ['<span class="rich-character">ARIA</span>']
      )
    })

    it('should render item markup correctly', () => {
      expectValidHTML(
        'Found the [golden key](item:golden_key).',
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
        '[ARIA](character:ARIA) found the **glowing** [orb](item:orb).',
        [
          '<span class="rich-character">ARIA</span>',
          '<strong class="rich-bold">glowing</strong>',
          '<span class="rich-item">orb</span>'
        ]
      )
    })

    it('should handle adjacent components without spaces', () => {
      expectValidHTML(
        '**Bold**[Name](character:Name)*italic*',
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

    it('should handle item markup inside bold text (issue #20)', () => {
      expectValidHTML(
        '**The [analytical quill](item:analytical_quill) scratches out an observation from your pocket:**',
        [
          '<strong class="rich-bold">',
          '<span class="rich-item">analytical quill</span>'
        ]
      )
    })

    it('should handle character markup inside italic text', () => {
      expectValidHTML(
        '*[Jennifer](character:jennifer) picks up the key*',
        [
          '<em class="rich-italic">',
          '<span class="rich-character">Jennifer</span>'
        ]
      )
    })

    it('should handle character markup inside discovery alert', () => {
      expectValidHTML(
        '[!discovery] [Jennifer](character:Jennifer) found something!',
        [
          '<div class="rich-alert rich-alert-discovery">',
          '<span class="rich-character">Jennifer</span>'
        ]
      )
    })

    it('should handle multiple nested components in alert', () => {
      expectValidHTML(
        '[!discovery] [Jennifer](character:Jennifer) found the **magical** [sword](item:sword)!',
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
        '[!warning] But choose wisely, dear [Jennifer](character:Jennifer)... for not all that glitters is **gold**!',
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
        '[Jean-Luc Picard](character:Jean-Luc_Picard) and [sword of +1 magic](item:sword_of_+1_magic)',
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

  describe('Display Name Context', () => {
    // Mock item data for testing
    const mockItems = {
      'unfinished_coffee': { name: "Jamie's Coffee", display_name: 'coffee' },
      'phone': { name: "Jamie's Phone", display_name: 'phone' },
      'golden_key': { name: 'Golden Key of Power' }, // No display_name
      'unknown_item': undefined // Item not found
    }

    const mockGetItem = (itemId: string) => mockItems[itemId as keyof typeof mockItems]

    it('should use display_name for narrative context', () => {
      const narrativeContext: RenderContext = {
        type: 'narrative',
        getItem: mockGetItem
      }

      const result = parser.renderContent(
        'Jamie looks down at their [coffee](item:unfinished_coffee).',
        narrativeContext
      )
      const html = fragmentToHTML(result)

      // Should display "coffee" not "Jamie's Coffee"
      expect(html).toContain('coffee')
      expect(html).not.toContain("Jamie's Coffee")
      
      // Should be clickable with the display text
      expect(html).toContain('data-clickable-text="coffee"')
      expect(html).toContain('class="rich-item clickable-element"')
    })

    it('should use name for inventory context', () => {
      const inventoryContext: RenderContext = {
        type: 'inventory',
        getItem: mockGetItem
      }

      const result = parser.renderContent(
        'You have [Jamie\'s Coffee](item:unfinished_coffee).',
        inventoryContext
      )
      const html = fragmentToHTML(result)

      // Should display full name "Jamie's Coffee" in inventory
      expect(html).toContain("Jamie's Coffee")
      expect(html).not.toContain('coffee">') // Avoid false positive
      
      // Should be clickable with the display text
      expect(html).toContain('data-clickable-text="Jamie\'s Coffee"')
    })

    it('should fallback to name when no display_name is provided', () => {
      const narrativeContext: RenderContext = {
        type: 'narrative',
        getItem: mockGetItem
      }

      const result = parser.renderContent(
        'You found [golden key](item:golden_key).',
        narrativeContext
      )
      const html = fragmentToHTML(result)

      // Should display name since no display_name is available
      expect(html).toContain('Golden Key of Power')
      expect(html).toContain('data-clickable-text="Golden Key of Power"')
    })

    it('should fallback to itemId when item not found', () => {
      const narrativeContext: RenderContext = {
        type: 'narrative',
        getItem: mockGetItem
      }

      const result = parser.renderContent(
        'Looking for [unknown item](item:unknown_item).',
        narrativeContext
      )
      const html = fragmentToHTML(result)

      // Should display and use the display text when item not found
      expect(html).toContain('unknown item')
      expect(html).toContain('data-clickable-text="unknown item"')
    })

    it('should fallback to itemId when no context provided', () => {
      // No context provided - should use raw itemId
      const result = parser.renderContent(
        'Jamie looks at their [unfinished coffee](item:unfinished_coffee).'
      )
      const html = fragmentToHTML(result)

      // Should display and use the display text without context
      expect(html).toContain('unfinished coffee')
      expect(html).toContain('data-clickable-text="unfinished coffee"')
    })
  })

  describe('Parser Internals', () => {
    it('should parse content and generate components', () => {
      const result = parser.parseContent('This is **bold** text with [key](item:key).')
      
      expect(result.components).toHaveLength(2)
      expect(result.components[0].type).toBe('Item')
      expect(result.components[0].content).toBe('key')
      expect(result.components[1].type).toBe('Bold')
      expect(result.components[1].content).toBe('bold')
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
      const parsed = parser.parseContent('**bold** and [Name](character:Name)')
      const fragment = parser.renderToDOM(parsed)
      const html = fragmentToHTML(fragment)
      
      expect(html).toContain('<strong class="rich-bold">bold</strong>')
      expect(html).toContain('class="rich-character clickable-element"')
      expect(html).toContain('>Name<')
      expect(html).not.toContain('{{COMPONENT:')
    })
  })
})