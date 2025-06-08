import { describe, it, expect } from 'vitest'
import { StoryParser } from '../engine/storyParser'

describe('StoryParser', () => {
  describe('YAML Parsing', () => {
    it('should parse valid YAML story', () => {
      const validYaml = `
title: "Test Story"
author: "Test Author"
version: "1.0"

metadata:
  setting:
    time: "Present day"
    place: "Test location"
  tone:
    overall: "mysterious"
    narrative_voice: "second person"
  themes:
    - "adventure"
  ui:
    colors:
      primary: "#1a1a2e"
      background: "#0f0f23"
      text: "#eee"

characters:
  - id: "test_char"
    name: "Test Character"
    description: "A helpful test character"
    traits: ["helpful"]
    voice: "friendly"

locations:
  - id: "start_room"
    name: "Starting Room"
    description: "A test room"
    connections: []

items:
  - id: "test_item"
    name: "Test Item"
    description: "A test item"
    location: "start_room"

knowledge: []

flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    content: "Welcome!"

start:
  content: "Game begins!"
  location: "start_room"
  first_flow: "start_flow"
`

      const story = StoryParser.parseFromYaml(validYaml)
      
      expect(story).toBeDefined()
      expect(story.title).toBe("Test Story")
      expect(story.characters).toHaveLength(1)
      expect(story.locations).toHaveLength(1)
    })

    it('should handle invalid YAML syntax', () => {
      const invalidYaml = `
title: "Test Story
author: "Missing quote
invalid: yaml: structure
`

      expect(() => StoryParser.parseFromYaml(invalidYaml)).toThrow()
    })

    it('should handle empty YAML', () => {
      expect(() => StoryParser.parseFromYaml('')).toThrow()
    })
  })

  describe('Story Structure', () => {
    it('should handle stories with all sections', () => {
      const complexYaml = `
title: "Complex Story"
author: "Test Author"
version: "1.0"

metadata:
  setting:
    time: "Present day"
    place: "Test location"
  tone:
    overall: "mysterious"
    narrative_voice: "second person"
  themes:
    - "adventure"
  ui:
    colors:
      primary: "#1a1a2e"
      background: "#0f0f23"
      text: "#eee"

characters:
  - id: "char1"
    name: "Character 1"
    description: "A test character"
    traits: ["helpful"]
    voice: "friendly"

locations:
  - id: "room1"
    name: "Room 1"
    description: "Test room"
    connections: ["room2"]
  - id: "room2"
    name: "Room 2"
    description: "Another room"
    connections: ["room1"]

items:
  - id: "item1"
    name: "Item 1"
    description: "Test item"
    location: "room1"

knowledge:
  - id: "know1"
    description: "Test knowledge"
    requires: []

flows:
  - id: "flow1"
    type: "narrative"
    name: "Flow 1"
    content: "Test content"

start:
  content: "Game starts!"
  location: "room1"
  first_flow: "flow1"
`

      const story = StoryParser.parseFromYaml(complexYaml)
      
      expect(story).toBeDefined()
      expect(story.title).toBe("Complex Story")
      expect(story.characters).toHaveLength(1)
      expect(story.locations).toHaveLength(2)
      expect(story.items).toHaveLength(1)
      expect(story.knowledge).toHaveLength(1)
      expect(story.flows).toHaveLength(1)
    })

    it('should handle minimal stories', () => {
      const minimalYaml = `
title: "Minimal Story"
author: "Test"
version: "1.0"

metadata:
  setting:
    time: "Present"
    place: "Test"
  tone:
    overall: "neutral"
    narrative_voice: "second person"
  themes: []
  ui:
    colors:
      primary: "#000"
      background: "#fff"
      text: "#333"

characters: []
locations:
  - id: "room1"
    name: "Room 1"
    description: "Test"
    connections: []

items: []
knowledge: []
flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    content: "Welcome!"

start:
  content: "Minimal game"
  location: "room1"
  first_flow: "start_flow"
`

      const story = StoryParser.parseFromYaml(minimalYaml)
      
      expect(story).toBeDefined()
      expect(story.title).toBe("Minimal Story")
      expect(story.characters).toHaveLength(0)
      expect(story.locations).toHaveLength(1)
    })
  })

  describe('Item Field Preservation', () => {
    it('should preserve all item fields including display_name', () => {
      const yamlWithItemFields = `
title: "Item Field Test"
author: "Test"
version: "2.0"

metadata:
  setting:
    time: "Present"
    place: "Test"
  tone:
    overall: "neutral"
    narrative_voice: "second person"
  themes: []
  ui:
    colors:
      primary: "#000"
      background: "#fff"
      text: "#333"

characters: []

locations:
  - id: "test_location"
    name: "Test Location"
    description: "A location for testing"
    connections: []

items:
  - id: "full_item"
    name: "Full Item Name"
    display_name: "short name"
    description: "A comprehensive test item"
    location: "test_location"
    hidden: true
    discoverable_in: "test_location"
    discovery_objects: ["table", "drawer"]
    aliases: ["alias1", "alias2"]
    can_become: "transformed_item"
    created_from: "source_item"

  - id: "minimal_item"
    name: "Minimal Item"
    description: "Item with only required fields"

  - id: "partial_item"
    name: "Partial Item"
    display_name: "partial"
    description: "Item with some optional fields"
    aliases: ["partial_alias"]

knowledge: []
flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    content: "Test"

start:
  content: "Test"
  location: "test_location"
  first_flow: "start_flow"
`

      const story = StoryParser.parseFromYaml(yamlWithItemFields)
      
      expect(story.items).toHaveLength(3)
      
      // Test full item with all fields
      const fullItem = story.items.find(item => item.id === 'full_item')!
      expect(fullItem).toBeDefined()
      expect(fullItem.id).toBe('full_item')
      expect(fullItem.name).toBe('Full Item Name')
      expect(fullItem.display_name).toBe('short name') // This was being dropped!
      expect(fullItem.description).toBe('A comprehensive test item')
      expect(fullItem.location).toBe('test_location')
      expect(fullItem.hidden).toBe(true)
      expect(fullItem.discoverable_in).toBe('test_location')
      expect(fullItem.discovery_objects).toEqual(['table', 'drawer'])
      expect(fullItem.aliases).toEqual(['alias1', 'alias2'])
      expect(fullItem.can_become).toBe('transformed_item')
      expect(fullItem.created_from).toBe('source_item')
      
      // Test minimal item (only required fields)
      const minimalItem = story.items.find(item => item.id === 'minimal_item')!
      expect(minimalItem).toBeDefined()
      expect(minimalItem.id).toBe('minimal_item')
      expect(minimalItem.name).toBe('Minimal Item')
      expect(minimalItem.display_name).toBeUndefined()
      expect(minimalItem.description).toBe('Item with only required fields')
      expect(minimalItem.location).toBeUndefined()
      expect(minimalItem.hidden).toBe(false) // Default value
      
      // Test partial item with some optional fields
      const partialItem = story.items.find(item => item.id === 'partial_item')!
      expect(partialItem).toBeDefined()
      expect(partialItem.id).toBe('partial_item')
      expect(partialItem.name).toBe('Partial Item')
      expect(partialItem.display_name).toBe('partial') // This was being dropped!
      expect(partialItem.aliases).toEqual(['partial_alias'])
    })

    it('should handle display_name edge cases', () => {
      const yamlWithEdgeCases = `
title: "Display Name Edge Cases"
author: "Test"
version: "2.0"

metadata:
  setting:
    time: "Present"
    place: "Test"
  tone:
    overall: "neutral"
    narrative_voice: "second person"
  themes: []
  ui:
    colors:
      primary: "#000"
      background: "#fff"
      text: "#333"

characters: []
locations:
  - id: "test_loc"
    name: "Test Location"
    description: "Test"
    connections: []

items:
  - id: "empty_display_name"
    name: "Item With Empty Display Name"
    display_name: ""
    description: "Empty display name test"

  - id: "null_display_name"
    name: "Item With Null Display Name"
    display_name: null
    description: "Null display name test"

  - id: "no_display_name"
    name: "Item Without Display Name"
    description: "No display name field"

knowledge: []
flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    content: "Test"

start:
  content: "Test"
  location: "test_loc"
  first_flow: "start_flow"
`

      const story = StoryParser.parseFromYaml(yamlWithEdgeCases)
      
      const emptyDisplayItem = story.items.find(item => item.id === 'empty_display_name')!
      expect(emptyDisplayItem.display_name).toBe('')
      
      const nullDisplayItem = story.items.find(item => item.id === 'null_display_name')!
      expect(nullDisplayItem.display_name).toBeNull()
      
      const noDisplayItem = story.items.find(item => item.id === 'no_display_name')!
      expect(noDisplayItem.display_name).toBeUndefined()
    })
    
    it('should preserve field types correctly', () => {
      const yamlWithTypes = `
title: "Field Type Test"
author: "Test"  
version: "2.0"

metadata:
  setting:
    time: "Present"
    place: "Test"
  tone:
    overall: "neutral"
    narrative_voice: "second person"
  themes: []
  ui:
    colors:
      primary: "#000"
      background: "#fff"
      text: "#333"

characters: []
locations:
  - id: "test_loc"
    name: "Test Location"
    description: "Test"
    connections: []

items:
  - id: "type_test_item"
    name: "Type Test Item"
    display_name: "type test"
    description: "Testing field types"
    hidden: false
    discovery_objects: []
    aliases: []

knowledge: []
flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    content: "Test"

start:
  content: "Test"
  location: "test_loc"
  first_flow: "start_flow"
`

      const story = StoryParser.parseFromYaml(yamlWithTypes)
      const item = story.items[0]
      
      // Test that field types are preserved correctly
      expect(typeof item.id).toBe('string')
      expect(typeof item.name).toBe('string')
      expect(typeof item.display_name).toBe('string')
      expect(typeof item.description).toBe('string')
      expect(typeof item.hidden).toBe('boolean')
      expect(Array.isArray(item.discovery_objects)).toBe(true)
      expect(Array.isArray(item.aliases)).toBe(true)
    })
  })

  describe('Integration with Rich Text Parser', () => {
    it('should produce items usable by rich text parser', () => {
      const coffeeStoryYaml = `
title: "Coffee Test"
author: "Test"
version: "2.0"

metadata:
  setting:
    time: "Present"
    place: "Test"
  tone:
    overall: "neutral"
    narrative_voice: "second person"
  themes: []
  ui:
    colors:
      primary: "#000"
      background: "#fff"
      text: "#333"

characters: []
locations:
  - id: "cafe"
    name: "Café"
    description: "A coffee shop"
    connections: []

items:
  - id: "unfinished_coffee"
    name: "Jamie's Coffee"
    display_name: "coffee"
    description: "A cold latte"
    location: "cafe"
    
  - id: "phone"
    name: "Jamie's Phone"
    display_name: "phone"
    description: "A mobile device"
    location: "cafe"

knowledge: []
flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    content: "Test"

start:
  content: "Test"
  location: "cafe"
  first_flow: "start_flow"
`

      const story = StoryParser.parseFromYaml(coffeeStoryYaml)
      
      // Verify items have the expected structure for rich text parser
      const coffeeItem = story.items.find(item => item.id === 'unfinished_coffee')!
      expect(coffeeItem.name).toBe("Jamie's Coffee")
      expect(coffeeItem.display_name).toBe("coffee")
      
      const phoneItem = story.items.find(item => item.id === 'phone')!
      expect(phoneItem.name).toBe("Jamie's Phone")
      expect(phoneItem.display_name).toBe("phone")
      
      // Test that these items would work with the rich text parser's expectations
      // (This simulates what GameEngine.getItem returns)
      const mockGetItem = (id: string) => {
        const item = story.items.find(i => i.id === id)
        return item ? { name: item.name, display_name: item.display_name } : undefined
      }
      
      const coffeeResult = mockGetItem('unfinished_coffee')
      expect(coffeeResult?.name).toBe("Jamie's Coffee")
      expect(coffeeResult?.display_name).toBe("coffee")
      
      const phoneResult = mockGetItem('phone')
      expect(phoneResult?.name).toBe("Jamie's Phone")  
      expect(phoneResult?.display_name).toBe("phone")
    })
  })
})