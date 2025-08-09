import { describe, it, expect } from 'vitest'
import { StoryCompiler } from '../engines/emergent/StoryCompiler.js'
import { SequenceController } from '../engines/emergent/SequenceController.js'
import { EmergentContentGenerator } from '../engines/emergent/EmergentContentGenerator.js'
import { DebugTracker } from '../engines/emergent/DebugTracker.js'
import { EmergentEngine } from '../engines/emergent/EmergentEngine.js'

// Mock LLM service for testing
class MockLLMService {
  async makeRequest(prompt: string): Promise<string> {
    if (prompt.includes('story architect')) {
      // Mock compilation response
      return JSON.stringify({
        "title": "Test Story",
        "initial_state": {
          "progress": 0,
          "tension": false
        },
        "scene_sequence": [
          { "id": "opening", "goal": "Establish the situation" },
          { "id": "climax", "goal": "Reach the critical moment" }
        ],
        "endings": [
          { "id": "success", "tone": "hopeful", "condition": "progress >= 2" },
          { "id": "failure", "tone": "somber", "condition": "tension" }
        ]
      })
    } else {
      // Mock content generation response
      return JSON.stringify({
        "narrative": "Test narrative content",
        "scene_complete": false,
        "choices": [
          { "text": "Choice 1", "effects": { "progress": "+1" } },
          { "text": "Choice 2", "effects": { "tension": true } },
          { "text": "Choice 3", "effects": { "progress": "+2" } }
        ]
      })
    }
  }
}

describe('Emergent Engine Components', () => {
  describe('StoryCompiler', () => {
    it('should parse Markdown narrative outline', () => {
      const markdown = `# Test Story

## Summary
This is a test story.

## Key Elements
Testing the parsing functionality.

## Potential Endings
Success or failure based on choices.`

      const narrative = StoryCompiler.parseMarkdown(markdown)
      
      expect(narrative.title).toBe('Test Story')
      expect(narrative.markdown).toContain('This is a test story')
    })

    it('should compile narrative to story structure', async () => {
      const mockLLM = new MockLLMService()
      const compiler = new StoryCompiler(mockLLM as any)
      
      const narrative = {
        title: 'Test Story',
        markdown: 'Test markdown content'
      }

      const compiled = await compiler.compileStory(narrative)
      
      expect(compiled.title).toBe('Test Story')
      expect(compiled.initial_state.progress).toBe(0)
      expect(compiled.scene_sequence).toHaveLength(2)
      expect(compiled.endings).toHaveLength(2)
    })
  })

  describe('DebugTracker', () => {
    it('should track LLM interactions', () => {
      const tracker = new DebugTracker()
      
      const id = tracker.trackLLMInteraction(
        'compilation',
        'architect',
        'test prompt',
        'test response',
        true,
        1000
      )

      const log = tracker.getLog()
      expect(log.llmInteractions).toHaveLength(1)
      expect(log.llmInteractions[0].id).toBe(id)
      expect(log.llmInteractions[0].type).toBe('compilation')
      expect(log.llmInteractions[0].phase).toBe('architect')
      expect(log.llmInteractions[0].success).toBe(true)
    })

    it('should track state changes', () => {
      const tracker = new DebugTracker()
      
      const id = tracker.trackStateChange(
        'choice',
        { progress: 0 },
        { progress: 1 },
        { progress: '+1' },
        'Test choice'
      )

      const log = tracker.getLog()
      expect(log.stateChanges).toHaveLength(1)
      expect(log.stateChanges[0].id).toBe(id)
      expect(log.stateChanges[0].trigger).toBe('choice')
      expect(log.stateChanges[0].choiceText).toBe('Test choice')
    })

    it('should calculate correct statistics', () => {
      const tracker = new DebugTracker()
      
      // Add some test data
      tracker.trackLLMInteraction('compilation', 'architect', 'prompt1', 'response1', true, 1000)
      tracker.trackLLMInteraction('content_generation', 'narrator', 'prompt2', 'response2', true, 500)
      tracker.trackLLMInteraction('content_generation', 'narrator', 'prompt3', 'response3', false, 800)
      tracker.trackStateChange('choice', {}, { test: true })

      const stats = tracker.getStats()
      
      expect(stats.totalInteractions).toBe(3)
      expect(stats.totalStateChanges).toBe(1)
      expect(Math.round(stats.averageResponseTime * 100) / 100).toBe(766.67) // (1000+500+800)/3
      expect(stats.successRate).toBe(2/3) // 2 successful out of 3
    })
  })

  describe('SequenceController', () => {
    it('should initialize with compiled structure', () => {
      const narrative = { title: 'Test', markdown: 'content' }
      const compiled = {
        title: 'Test',
        initial_state: { progress: 0 },
        scene_sequence: [
          { id: 'scene1', goal: 'Test goal' }
        ],
        endings: [
          { id: 'ending1', tone: 'test', condition: 'progress > 0' }
        ]
      }

      const controller = new SequenceController(narrative, compiled)
      const session = controller.getSession()

      expect(session.currentSceneIndex).toBe(0)
      expect(session.currentState.progress).toBe(0)
      expect(session.isComplete).toBe(false)
    })

    it('should advance scene index linearly', () => {
      const narrative = { title: 'Test', markdown: 'content' }
      const compiled = {
        title: 'Test',
        initial_state: { progress: 0 },
        scene_sequence: [
          { id: 'scene1', goal: 'Goal 1' },
          { id: 'scene2', goal: 'Goal 2' }
        ],
        endings: [
          { id: 'ending1', tone: 'test', condition: 'progress >= 10' }
        ]
      }

      const controller = new SequenceController(narrative, compiled)
      
      expect(controller.getCurrentScene()?.id).toBe('scene1')
      
      const advanced = controller.advanceToNextScene()
      expect(advanced).toBe(true)
      expect(controller.getCurrentScene()?.id).toBe('scene2')
      
      const noMore = controller.advanceToNextScene()
      expect(noMore).toBe(false)
    })
  })

  describe('EmergentContentGenerator', () => {
    it('should generate fallback content on parse failure', async () => {
      const mockLLM = {
        async makeRequest(): Promise<string> {
          return 'Invalid JSON response'
        }
      }
      
      const generator = new EmergentContentGenerator(mockLLM as any)
      const context = {
        compiledStructure: {
          title: 'Test',
          initial_state: {},
          scene_sequence: [{ id: 'test', goal: 'test goal' }],
          endings: []
        },
        currentScene: { id: 'test', goal: 'test goal' },
        currentState: {},
        history: [],
        sceneIndex: 0
      }

      const content = await generator.generateContent(context)
      
      expect(content.narrative).toContain('story continues')
      expect(content.choices).toHaveLength(3)
      expect(content.scene_complete).toBe(false)
    })
  })

  describe('EmergentEngine Integration', () => {
    it('should create engine with debug tracking', () => {
      const mockLLM = new MockLLMService()
      const engine = new EmergentEngine(mockLLM as any)
      
      const debugTracker = engine.getDebugTracker()
      expect(debugTracker).toBeDefined()
      expect(typeof debugTracker.getLog).toBe('function')
    })

    it('should parse markdown correctly', () => {
      const markdown = '# Test Story\n\nTest content'
      const narrative = EmergentEngine.parseMarkdown(markdown)
      
      expect(narrative.title).toBe('Test Story')
      expect(narrative.markdown).toBe(markdown)
    })
  })
})