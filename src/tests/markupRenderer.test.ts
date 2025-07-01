import { describe, it, expect } from 'vitest'
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer'

const { renderMarkup } = useMarkdownRenderer()

describe('MarkupRenderer', () => {
  describe('Basic Markup', () => {
    it('renders headings correctly', () => {
      const input = '# Story Title'
      const output = renderMarkup(input)
      expect(output).toContain('<h1 class="markup-heading">Story Title</h1>')
    })

    it('renders subheadings correctly', () => {
      const input = '### by Author Name'
      const output = renderMarkup(input)
      expect(output).toContain('<h3 class="markup-subheading">by Author Name</h3>')
    })

    it('renders bold text correctly', () => {
      const input = '**bold text**'
      const output = renderMarkup(input)
      expect(output).toContain('<strong class="markup-bold">bold text</strong>')
    })

    it('renders italic text correctly', () => {
      const input = '*italic text*'
      const output = renderMarkup(input)
      expect(output).toContain('<em class="markup-italic">italic text</em>')
    })
  })

  describe('Interactive Elements', () => {
    it('renders character references correctly', () => {
      const input = '[Alex](character:alex)'
      const output = renderMarkup(input)
      expect(output).toContain('<span class="markup-character markup-character--npc" data-character-id="alex" onclick="handleCharacterClick(\'alex\')">Alex</span>')
    })

    it('renders player character references correctly', () => {
      const input = '[You](character:player)'
      const output = renderMarkup(input)
      expect(output).toContain('<span class="markup-character markup-character--player" data-character-id="player" onclick="handleCharacterClick(\'player\')">You</span>')
    })

    it('renders item references correctly', () => {
      const input = '[Sacred Counter](item:counter)'
      const output = renderMarkup(input)
      expect(output).toContain('<span class="markup-item" data-item-id="counter" onclick="handleItemClick(\'counter\')">Sacred Counter</span>')
    })

    it('renders location references correctly', () => {
      const input = '[Kitchen of Destiny](location:kitchen)'
      const output = renderMarkup(input)
      expect(output).toContain('<span class="markup-location" data-location-id="kitchen" onclick="handleLocationClick(\'kitchen\')">Kitchen of Destiny</span>')
    })
  })

  describe('Nested Markup - The Critical Cases', () => {
    it('handles location inside italic text', () => {
      const input = '*text with [Sacred Counter](location:counter) inside*'
      const output = renderMarkup(input)
      
      // Should contain both the italic wrapper and the location span
      expect(output).toContain('<em class="markup-italic">')
      expect(output).toContain('<span class="markup-location" data-location-id="counter" onclick="handleLocationClick(\'counter\')">Sacred Counter</span>')
      expect(output).toContain('</em>')
      
      // Should NOT contain escaped HTML
      expect(output).not.toContain('&lt;span')
      expect(output).not.toContain('&gt;')
    })

    it('handles character inside bold text', () => {
      const input = '**The mighty [Alex](character:alex) speaks**'
      const output = renderMarkup(input)
      
      expect(output).toContain('<strong class="markup-bold">')
      expect(output).toContain('<span class="markup-character markup-character--npc" data-character-id="alex" onclick="handleCharacterClick(\'alex\')">Alex</span>')
      expect(output).toContain('</strong>')
      expect(output).not.toContain('&lt;span')
    })

    it('handles item inside bold text', () => {
      const input = '**You examine the [Mysterious Jar](item:jar) carefully**'
      const output = renderMarkup(input)
      
      expect(output).toContain('<strong class="markup-bold">')
      expect(output).toContain('<span class="markup-item" data-item-id="jar" onclick="handleItemClick(\'jar\')">Mysterious Jar</span>')
      expect(output).toContain('</strong>')
      expect(output).not.toContain('&lt;span')
    })

    it('handles multiple nested elements', () => {
      const input = '*[Alex](character:alex) stands in the [Kitchen](location:kitchen) holding a [Knife](item:knife)*'
      const output = renderMarkup(input)
      
      // Should wrap everything in italic
      expect(output).toContain('<em class="markup-italic">')
      expect(output).toContain('</em>')
      
      // Should contain all three interactive elements
      expect(output).toContain('<span class="markup-character markup-character--npc" data-character-id="alex"')
      expect(output).toContain('<span class="markup-location" data-location-id="kitchen"')
      expect(output).toContain('<span class="markup-item" data-item-id="knife"')
      
      // Should not escape any HTML
      expect(output).not.toContain('&lt;')
      expect(output).not.toContain('&gt;')
    })

    it('handles bold inside italic (complex nesting)', () => {
      const input = '*This is italic with **bold [Alex](character:alex) inside** it*'
      const output = renderMarkup(input)
      
      expect(output).toContain('<em class="markup-italic">')
      expect(output).toContain('<strong class="markup-bold">')
      expect(output).toContain('<span class="markup-character markup-character--npc" data-character-id="alex"')
      expect(output).not.toContain('&lt;')
    })
  })

  describe('Alert Boxes', () => {
    it('renders warning alerts correctly', () => {
      const input = '[!warning] Something dangerous approaches'
      const output = renderMarkup(input)
      expect(output).toContain('<div class="markup-alert markup-alert--warning">Something dangerous approaches</div>')
    })

    it('renders discovery alerts correctly', () => {
      const input = '[!discovery] You found something important!'
      const output = renderMarkup(input)
      expect(output).toContain('<div class="markup-alert markup-alert--discovery">You found something important!</div>')
    })

    it('renders danger alerts correctly', () => {
      const input = '[!danger] Immediate threat detected!'
      const output = renderMarkup(input)
      expect(output).toContain('<div class="markup-alert markup-alert--danger">Immediate threat detected!</div>')
    })

    it('handles markup inside alerts', () => {
      const input = '[!discovery] You found the [Mysterious Key](item:key)!'
      const output = renderMarkup(input)
      
      expect(output).toContain('<div class="markup-alert markup-alert--discovery">')
      expect(output).toContain('<span class="markup-item" data-item-id="key" onclick="handleItemClick(\'key\')">Mysterious Key</span>')
      expect(output).not.toContain('&lt;span')
    })
  })

  describe('HTML Escaping and Security', () => {
    it('escapes user content in interactive elements', () => {
      const input = '[<script>alert("xss")</script>](character:safe)'
      const output = renderMarkup(input)
      
      // Should escape the malicious content in the display text
      expect(output).toContain('&lt;script&gt;')
      expect(output).not.toContain('<script>')
      
      // But should preserve the HTML structure
      expect(output).toContain('<span class="markup-character')
    })

    it('escapes special characters in IDs', () => {
      const input = '[Safe Text](location:id"onclick="alert())'
      const output = renderMarkup(input)
      
      // Should not contain the malicious onclick
      expect(output).not.toContain('onclick="alert()')
      // Should escape quotes in the ID (though exact format may vary)
      expect(output).toContain('data-location-id=')
      // The ID should be properly escaped to prevent XSS
      expect(output).not.toMatch(/data-location-id="[^"]*"[^>]*onclick="alert\(\)/)
    })
  })

  describe('Paragraph Wrapping', () => {
    it('wraps simple text in paragraphs', () => {
      const input = 'Simple text'
      const output = renderMarkup(input)
      expect(output).toMatch(/^<p>.*<\/p>$/)
    })

    it('converts double newlines to paragraph breaks', () => {
      const input = 'First paragraph\n\nSecond paragraph'
      const output = renderMarkup(input)
      expect(output).toContain('</p><p>')
    })

    it('converts single newlines to line breaks', () => {
      const input = 'First line\nSecond line'
      const output = renderMarkup(input)
      expect(output).toContain('<br>')
    })

    it('does not double-wrap alerts in paragraphs', () => {
      const input = '[!warning] Alert text'
      const output = renderMarkup(input)
      
      // Should not wrap the alert div in a paragraph
      expect(output).not.toMatch(/^<p><div class="markup-alert/)
      expect(output).toMatch(/^<div class="markup-alert/)
    })
  })

  describe('Real-World Examples', () => {
    it('handles the sandwich crisis example correctly', () => {
      const input = '*Dramatic music swells as shadows dance across the [Kitchen of Destiny](location:kitchen)!*\n\n**Jennifer** stands frozen in contemplation.'
      const output = renderMarkup(input)
      
      // Should handle the nested location in italic text
      expect(output).toContain('<em class="markup-italic">')
      expect(output).toContain('<span class="markup-location" data-location-id="kitchen"')
      expect(output).toContain('Kitchen of Destiny')
      expect(output).not.toContain('&lt;span')
      
      // Should handle the bold text in second paragraph
      expect(output).toContain('<strong class="markup-bold">Jennifer</strong>')
      
      // Should create proper paragraph structure
      expect(output).toContain('</p><p>')
    })

    it('handles friday night rain example correctly', () => {
      const input = '[Alex](character:alex) doesn\'t hear, or pretends not to. Their reflection in the window watches the rain while the real Alex stirs patterns in *cold coffee*.'
      const output = renderMarkup(input)
      
      expect(output).toContain('<span class="markup-character markup-character--npc" data-character-id="alex"')
      expect(output).toContain('<em class="markup-italic">cold coffee</em>')
      expect(output).not.toContain('&lt;')
    })
  })
})