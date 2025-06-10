import { describe, it, expect } from 'vitest'
import { StoryParser } from '../engine/storyParser'
import { ImpressionistParser } from '../engine/impressionistParser'
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

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

flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    location: "start_room"
    content: "Welcome!"
`

      const story = StoryParser.parseFromYaml(validYaml)
      
      expect(story).toBeDefined()
      expect(story.title).toBe("Test Story")
      expect(story.characters).toHaveLength(1)
      expect(story.locations).toHaveLength(1)
      expect(story.flows).toHaveLength(1)
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

    it('should require at least one flow', () => {
      const noFlowsYaml = `
title: "No Flows Story"
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

characters: []
locations:
  - id: "room1"
    name: "Room 1"
    description: "Test room"
    connections: []

items: []
flows: []
`

      expect(() => StoryParser.parseFromYaml(noFlowsYaml)).toThrow(/must have at least one flow/)
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

flows:
  - id: "flow1"
    type: "narrative"
    name: "Flow 1"
    location: "room1"
    content: "Test content"
`

      const story = StoryParser.parseFromYaml(complexYaml)
      
      expect(story).toBeDefined()
      expect(story.title).toBe("Complex Story")
      expect(story.characters).toHaveLength(1)
      expect(story.locations).toHaveLength(2)
      expect(story.items).toHaveLength(1)
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
flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    location: "room1"
    content: "Welcome!"
`

      const story = StoryParser.parseFromYaml(minimalYaml)
      
      expect(story).toBeDefined()
      expect(story.title).toBe("Minimal Story")
      expect(story.characters).toHaveLength(0)
      expect(story.locations).toHaveLength(1)
      expect(story.flows).toHaveLength(1)
    })
  })

  describe('LLM Guidelines', () => {
    it('should parse llm_guidelines field', () => {
      const testStory = `
title: "Test Story"
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
  - id: "test_room"
    name: "Test Room"
    description: "A test room"
    connections: []

items: []

flows:
  - id: "start"
    name: "Opening"
    type: "narrative"
    location: "test_room"
    content: "Welcome to the test story! This is the beginning."

llm_guidelines: |
  These are the story guidelines for the LLM.
  Multiple lines of guidance.
`
      
      const story = StoryParser.parseFromYaml(testStory)
      
      expect(story.llm_guidelines).toBeDefined()
      expect(story.llm_guidelines).toContain('These are the story guidelines for the LLM.')
      expect(story.llm_guidelines).toContain('Multiple lines of guidance.')
    })

    it('should handle missing llm_guidelines field', () => {
      const testStory = `
title: "Test Story"
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

characters: []
locations:
  - id: "test_room"
    name: "Test Room"
    description: "A test room"
    connections: []

items: []

flows:
  - id: "start"
    name: "Opening"
    type: "narrative"
    location: "test_room"
    content: "Test start"
`
      
      const story = StoryParser.parseFromYaml(testStory)
      
      expect(story.llm_guidelines).toBeUndefined()
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

flows:
  - id: "start_flow"
    type: "narrative"
    name: "Start"
    location: "test_location"
    content: "Test"
`

      const story = StoryParser.parseFromYaml(yamlWithItemFields)
      
      expect(story.items).toHaveLength(3)
      
      // Test full item with all fields
      const fullItem = story.items.find(item => item.id === 'full_item')!
      expect(fullItem).toBeDefined()
      expect(fullItem.id).toBe('full_item')
      expect(fullItem.name).toBe('Full Item Name')
      expect(fullItem.display_name).toBe('short name')
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
      expect(partialItem.display_name).toBe('partial')
      expect(partialItem.aliases).toEqual(['partial_alias'])
    })
  })

  describe('Example Story Validation', () => {
    const examplesDir = resolve(__dirname, '../../examples');
    
    // Dynamically discover all story files
    const storyFiles = readdirSync(examplesDir).filter(file => 
      file.endsWith('.yaml') || file.endsWith('.yml')
    );

    if (storyFiles.length === 0) {
      it('should find at least one example story file', () => {
        expect(storyFiles.length).toBeGreaterThan(0);
      });
    } else {
      // Create a test for each story file
      storyFiles.forEach(file => {
        it(`should validate example story: ${file}`, () => {
          const filePath = join(examplesDir, file);
          const content = readFileSync(filePath, 'utf-8');
          
          // This should not throw an error - using ImpressionistParser for new format stories
          expect(() => {
            const parser = new ImpressionistParser();
            const story = parser.parseYaml(content);
            
            // Basic structural validation for impressionist format
            expect(story.title).toBeDefined();
            expect(story.author).toBeDefined();
            expect(story.version).toBeDefined();
            expect(story.context).toBeDefined();
            expect(story.scenes).toBeDefined();
            expect(story.endings).toBeDefined();
            expect(story.guidance).toBeDefined();
            
            // Should have at least one scene and one ending
            expect(story.scenes.length).toBeGreaterThan(0);
            expect(story.endings.length).toBeGreaterThan(0);
            
          }).not.toThrow();
        });
      });
      
      it('should validate all example stories can be bundled', () => {
        const validStories: Array<{filename: string, title: string}> = [];
        
        storyFiles.forEach(file => {
          const filePath = join(examplesDir, file);
          const content = readFileSync(filePath, 'utf-8');
          
          // Should be able to parse each story using ImpressionistParser
          const parser = new ImpressionistParser();
          const story = parser.parseYaml(content);
          validStories.push({
            filename: file,
            title: story.title
          });
        });
        
        // All stories should be valid
        expect(validStories.length).toBe(storyFiles.length);
        expect(validStories.length).toBeGreaterThan(0);
        
        // Each story should have a valid title
        validStories.forEach(story => {
          expect(story.title).toBeTruthy();
          expect(typeof story.title).toBe('string');
        });
      });
    }
  })
})