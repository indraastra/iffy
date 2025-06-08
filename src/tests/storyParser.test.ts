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
})