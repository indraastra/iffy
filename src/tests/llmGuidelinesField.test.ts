import { describe, it, expect } from 'vitest'
import { StoryParser } from '../engine/storyParser'

describe('LLM Guidelines Field', () => {
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
knowledge: []
flows: []

start:
  content: "Welcome to the test story! This is the beginning."
  location: "test_room"

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
knowledge: []
flows: []

start:
  content: "Test start"
  location: "test_room"
`
    
    const story = StoryParser.parseFromYaml(testStory)
    
    expect(story.llm_guidelines).toBeUndefined()
  })
})