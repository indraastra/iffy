import { describe, it, expect } from 'vitest'
import { TextFormatter, formatList, formatStructuredList, formatKeyValue, formatSection, formatSectionContent, formatRequirements, formatAliases, formatTraits } from '../utils/textFormatting'

describe('TextFormatter', () => {
  
  describe('formatList', () => {
    it('should format basic string arrays', () => {
      expect(formatList(['apple', 'banana', 'cherry'])).toBe('apple, banana, cherry')
      expect(formatList(['single'])).toBe('single')
    })

    it('should handle empty and null arrays', () => {
      expect(formatList([])).toBe('None')
      expect(formatList(null)).toBe('None')
      expect(formatList(undefined)).toBe('None')
    })

    it('should use custom separators', () => {
      expect(formatList(['a', 'b', 'c'], { separator: ' | ' })).toBe('a | b | c')
      expect(formatList(['a', 'b'], { separator: '\n' })).toBe('a\nb')
    })

    it('should use custom fallbacks', () => {
      expect(formatList([], { fallback: 'Empty' })).toBe('Empty')
      expect(formatList(null, { fallback: 'No items' })).toBe('No items')
    })

    it('should handle truncation', () => {
      expect(formatList(['a', 'b', 'c', 'd'], { maxItems: 2 })).toBe('a, b...')
      expect(formatList(['a', 'b'], { maxItems: 3 })).toBe('a, b')
      expect(formatList(['a', 'b', 'c'], { maxItems: 2, truncationSuffix: ' and more' }))
        .toBe('a, b and more')
    })

    it('should apply transformations', () => {
      expect(formatList([1, 2, 3], { 
        transform: (n) => `item_${n}` 
      })).toBe('item_1, item_2, item_3')
      
      expect(formatList(['apple', 'BANANA'], { 
        transform: (s) => s.toLowerCase() 
      })).toBe('apple, banana')
    })

    it('should handle mixed data types', () => {
      expect(formatList([1, 'two', true])).toBe('1, two, true')
      expect(formatList([{ name: 'test' }], { 
        transform: (obj) => obj.name 
      })).toBe('test')
    })
  })

  describe('formatStructuredList', () => {
    it('should format basic structured lists', () => {
      expect(formatStructuredList(['Item 1', 'Item 2']))
        .toBe('- Item 1\n- Item 2')
    })

    it('should handle empty arrays', () => {
      expect(formatStructuredList([])).toBe('None')
      expect(formatStructuredList(null)).toBe('None')
    })

    it('should use custom item prefixes', () => {
      expect(formatStructuredList(['a', 'b'], { itemPrefix: '• ' }))
        .toBe('• a\n• b')
      expect(formatStructuredList(['a'], { itemPrefix: '1. ' }))
        .toBe('1. a')
    })

    it('should handle multi-line content with indentation', () => {
      expect(formatStructuredList(['line1\nline2'], { indent: '    ' }))
        .toBe('- line1\n    line2')
    })

    it('should add spacing between items when requested', () => {
      expect(formatStructuredList(['a', 'b'], { spaceBetweenItems: true }))
        .toBe('- a\n\n- b')
    })

    it('should handle truncation', () => {
      expect(formatStructuredList(['a', 'b', 'c'], { maxItems: 2 }))
        .toBe('- a\n- b\n- ...')
    })

    it('should apply transformations with index', () => {
      expect(formatStructuredList(['apple', 'banana'], {
        transform: (item, index) => `${index + 1}: ${item}`
      })).toBe('- 1: apple\n- 2: banana')
    })

    it('should handle complex object transformation', () => {
      const items = [
        { id: 'key', name: 'Golden Key', aliases: ['key', 'gold key'] },
        { id: 'sword', name: 'Magic Sword', aliases: ['sword'] }
      ]
      
      expect(formatStructuredList(items, {
        transform: (item) => `${item.name} (${item.id})\n  Aliases: ${item.aliases.join(', ')}`
      })).toBe('- Golden Key (key)\n    Aliases: key, gold key\n- Magic Sword (sword)\n    Aliases: sword')
    })
  })

  describe('formatKeyValue', () => {
    it('should format basic key-value pairs', () => {
      expect(formatKeyValue('Name', 'John')).toBe('Name: John')
      expect(formatKeyValue('Count', 42)).toBe('Count: 42')
    })

    it('should handle null/undefined values', () => {
      expect(formatKeyValue('Empty', null)).toBe('Empty: None')
      expect(formatKeyValue('Undefined', undefined)).toBe('Undefined: None')
      expect(formatKeyValue('EmptyString', '')).toBe('EmptyString: None')
    })

    it('should format array values as lists', () => {
      expect(formatKeyValue('Items', ['a', 'b', 'c'])).toBe('Items: a, b, c')
      expect(formatKeyValue('Empty', [])).toBe('Empty: None')
    })

    it('should use custom separators and fallbacks', () => {
      expect(formatKeyValue('Count', null, { fallback: 'Zero' }))
        .toBe('Count: Zero')
      expect(formatKeyValue('Name', 'John', { separator: ' = ' }))
        .toBe('Name = John')
    })
  })

  describe('formatSection', () => {
    it('should format sections with array content', () => {
      expect(formatSection('ITEMS', ['sword', 'shield']))
        .toBe('ITEMS:\n- sword\n- shield')
    })

    it('should format sections with string content', () => {
      expect(formatSection('DESCRIPTION', 'A dark room'))
        .toBe('DESCRIPTION:\nA dark room')
    })

    it('should return empty for null/empty content', () => {
      expect(formatSection('EMPTY', [])).toBe('')
      expect(formatSection('NULL', null)).toBe('')
      expect(formatSection('WHITESPACE', '   ')).toBe('')
    })

    it('should pass options to structured list formatter', () => {
      expect(formatSection('ITEMS', ['a', 'b'], { itemPrefix: '• ' }))
        .toBe('ITEMS:\n• a\n• b')
    })
  })

  describe('formatSectionContent', () => {
    it('should format array content without title', () => {
      expect(formatSectionContent(['sword', 'shield']))
        .toBe('- sword\n- shield')
    })

    it('should format string content without title', () => {
      expect(formatSectionContent('A dark room'))
        .toBe('A dark room')
    })

    it('should return empty for null/empty content', () => {
      expect(formatSectionContent([])).toBe('')
      expect(formatSectionContent(null)).toBe('')
      expect(formatSectionContent('   ')).toBe('')
    })

    it('should pass options to structured list formatter', () => {
      expect(formatSectionContent(['a', 'b'], { itemPrefix: '• ' }))
        .toBe('• a\n• b')
    })

    it('should work well in debug pane context', () => {
      // Simulate how debug pane uses sections
      const sections: Record<string, string> = {};
      sections['SUCCESS CONDITIONS'] = formatSectionContent(['condition1: desc1', 'condition2: desc2']);
      sections['FLOWS'] = formatSectionContent(['flow1', 'flow2']);
      
      // Verify no duplicate colons or titles
      expect(sections['SUCCESS CONDITIONS']).toBe('- condition1: desc1\n- condition2: desc2');
      expect(sections['FLOWS']).toBe('- flow1\n- flow2');
    })
  })

  describe('formatRequirements', () => {
    it('should format requirement lists', () => {
      expect(formatRequirements(['flag1', 'flag2'])).toBe('Requires: flag1, flag2')
      expect(formatRequirements(['single'])).toBe('Requires: single')
    })

    it('should handle empty requirements', () => {
      expect(formatRequirements([])).toBe('Requires: None')
      expect(formatRequirements(null)).toBe('Requires: None')
    })

    it('should support custom options', () => {
      expect(formatRequirements(['a', 'b'], { keyValueSeparator: ' → ' }))
        .toBe('Requires → a, b')
      expect(formatRequirements(['a', 'b'], { listSeparator: ' | ' }))
        .toBe('Requires: a | b')
    })
  })

  describe('formatAliases', () => {
    it('should format alias lists', () => {
      expect(formatAliases(['key', 'golden key'])).toBe('[aliases: key, golden key]')
      expect(formatAliases(['single'])).toBe('[aliases: single]')
    })

    it('should return empty string for no aliases', () => {
      expect(formatAliases([])).toBe('')
      expect(formatAliases(null)).toBe('')
      expect(formatAliases(undefined)).toBe('')
    })
  })

  describe('formatTraits', () => {
    it('should format trait lists', () => {
      expect(formatTraits(['brave', 'smart'])).toBe('(brave, smart)')
      expect(formatTraits(['single'])).toBe('(single)')
    })

    it('should handle empty traits', () => {
      expect(formatTraits([])).toBe('(no traits)')
      expect(formatTraits(null)).toBe('(no traits)')
    })
  })

  describe('escapePromptText', () => {
    it('should normalize whitespace', () => {
      expect(TextFormatter.escapePromptText('  hello   world  '))
        .toBe('hello world')
    })

    it('should normalize multiple newlines', () => {
      expect(TextFormatter.escapePromptText('line1\n\n\nline2'))
        .toBe('line1\n\nline2')
    })

    it('should trim whitespace', () => {
      expect(TextFormatter.escapePromptText('\n  text  \n'))
        .toBe('text')
    })
  })

  describe('indent', () => {
    it('should indent text lines', () => {
      expect(TextFormatter.indent('line1\nline2'))
        .toBe('  line1\n  line2')
    })

    it('should handle custom indentation', () => {
      expect(TextFormatter.indent('text', 2, '    '))
        .toBe('        text')
    })

    it('should not indent empty lines', () => {
      expect(TextFormatter.indent('line1\n\nline2'))
        .toBe('  line1\n\n  line2')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long lists gracefully', () => {
      const longList = Array.from({ length: 1000 }, (_, i) => `item${i}`)
      const result = formatList(longList, { maxItems: 3 })
      expect(result).toBe('item0, item1, item2...')
    })

    it('should handle special characters in content', () => {
      expect(formatList(['item with "quotes"', "item with 'apostrophes'"]))
        .toBe('item with "quotes", item with \'apostrophes\'')
    })

    it('should handle unicode characters', () => {
      expect(formatList(['🗡️ sword', '🛡️ shield']))
        .toBe('🗡️ sword, 🛡️ shield')
    })

    it('should handle deeply nested transformations', () => {
      const complex = [
        { 
          item: { name: 'sword', meta: { quality: 'legendary' } },
          count: 1
        }
      ]
      
      expect(formatStructuredList(complex, {
        transform: (obj) => `${obj.item.name} (${obj.item.meta.quality}) x${obj.count}`
      })).toBe('- sword (legendary) x1')
    })
  })

  describe('Real-world Examples', () => {
    it('should format location information', () => {
      const location = {
        name: 'Dark Forest',
        connections: ['village', 'cave'],
        items: ['stick', 'mushroom'],
        discoverable: ['hidden_treasure']
      }
      
      const formatted = [
        formatKeyValue('Name', location.name),
        formatKeyValue('Exits', location.connections),
        formatKeyValue('Items', location.items),
        formatKeyValue('Discoverable', location.discoverable)
      ].join('\n')
      
      expect(formatted).toBe(
        'Name: Dark Forest\n' +
        'Exits: village, cave\n' +
        'Items: stick, mushroom\n' +
        'Discoverable: hidden_treasure'
      )
    })

    it('should format success conditions', () => {
      const conditions = [
        { id: 'win', description: 'Find the treasure', requires: ['key', 'map'] },
        { id: 'lose', description: 'Get caught', requires: ['spotted'] }
      ]
      
      const formatted = formatStructuredList(conditions, {
        transform: (c) => `${c.id}: ${c.description}\n${formatRequirements(c.requires)}`
      })
      
      expect(formatted).toBe(
        '- win: Find the treasure\n' +
        '  Requires: key, map\n' +
        '- lose: Get caught\n' +
        '  Requires: spotted'
      )
    })

    it('should format inventory with complex items', () => {
      const inventory = [
        { name: 'Magic Sword', aliases: ['sword', 'blade'], quantity: 1 },
        { name: 'Health Potion', aliases: ['potion', 'hp'], quantity: 3 }
      ]
      
      const formatted = formatStructuredList(inventory, {
        transform: (item) => 
          `${item.name} (x${item.quantity}) ${formatAliases(item.aliases)}`
      })
      
      expect(formatted).toBe(
        '- Magic Sword (x1) [aliases: sword, blade]\n' +
        '- Health Potion (x3) [aliases: potion, hp]'
      )
    })
  })
})