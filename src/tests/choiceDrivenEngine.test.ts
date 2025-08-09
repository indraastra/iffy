import { describe, it, expect } from 'vitest'
import { StateManager } from '../engines/choiceDriven/StateManager.js'
import { ConditionEvaluator } from '../engines/choiceDriven/ConditionEvaluator.js'
import { EffectApplicator } from '../engines/choiceDriven/EffectApplicator.js'
import { ChoiceDrivenEngine } from '../engines/choiceDriven/ChoiceDrivenEngine.js'

describe('ChoiceDrivenEngine Components', () => {
  describe('StateManager', () => {
    it('should initialize with initial state', () => {
      const initialState = { trust: 0, revealed: false }
      const stateManager = new StateManager(initialState)
      
      expect(stateManager.getState()).toEqual(initialState)
      expect(stateManager.getValue('trust')).toBe(0)
      expect(stateManager.getValue('revealed')).toBe(false)
    })

    it('should apply increment operations', () => {
      const stateManager = new StateManager({ trust: 0 })
      
      stateManager.applyEffects({ trust: '+1' })
      expect(stateManager.getValue('trust')).toBe(1)
      
      stateManager.applyEffects({ trust: '+3' })
      expect(stateManager.getValue('trust')).toBe(4)
    })

    it('should apply decrement operations', () => {
      const stateManager = new StateManager({ trust: 5 })
      
      stateManager.applyEffects({ trust: '-1' })
      expect(stateManager.getValue('trust')).toBe(4)
      
      stateManager.applyEffects({ trust: '-2' })
      expect(stateManager.getValue('trust')).toBe(2)
    })

    it('should apply direct assignments', () => {
      const stateManager = new StateManager({ revealed: false, trust: 0 })
      
      stateManager.applyEffects({ 
        revealed: true,
        trust: 10,
        name: 'Morgan'
      })
      
      expect(stateManager.getValue('revealed')).toBe(true)
      expect(stateManager.getValue('trust')).toBe(10)
      expect(stateManager.getValue('name')).toBe('Morgan')
    })
  })

  describe('ConditionEvaluator', () => {
    it('should evaluate always/never conditions', () => {
      const evaluator = new ConditionEvaluator({})
      
      expect(evaluator.evaluate('always')).toBe(true)
      expect(evaluator.evaluate('never')).toBe(false)
    })

    it('should evaluate boolean variables', () => {
      const evaluator = new ConditionEvaluator({ 
        revealed: true, 
        hidden: false 
      })
      
      expect(evaluator.evaluate('revealed')).toBe(true)
      expect(evaluator.evaluate('hidden')).toBe(false)
      expect(evaluator.evaluate('!revealed')).toBe(false)
      expect(evaluator.evaluate('!hidden')).toBe(true)
    })

    it('should evaluate numeric comparisons', () => {
      const evaluator = new ConditionEvaluator({ trust: 5 })
      
      expect(evaluator.evaluate('trust >= 3')).toBe(true)
      expect(evaluator.evaluate('trust >= 5')).toBe(true)
      expect(evaluator.evaluate('trust >= 6')).toBe(false)
      expect(evaluator.evaluate('trust > 4')).toBe(true)
      expect(evaluator.evaluate('trust < 6')).toBe(true)
      expect(evaluator.evaluate('trust <= 5')).toBe(true)
      expect(evaluator.evaluate('trust == 5')).toBe(true)
      expect(evaluator.evaluate('trust != 3')).toBe(true)
    })

    it('should evaluate compound conditions', () => {
      const evaluator = new ConditionEvaluator({ 
        trust: 5, 
        revealed: true,
        storm: false
      })
      
      expect(evaluator.evaluate('trust >= 3 && revealed')).toBe(true)
      expect(evaluator.evaluate('trust >= 6 && revealed')).toBe(false)
      expect(evaluator.evaluate('trust >= 3 || storm')).toBe(true)
      expect(evaluator.evaluate('trust < 3 || storm')).toBe(false)
      expect(evaluator.evaluate('revealed && !storm')).toBe(true)
    })
  })

  describe('EffectApplicator', () => {
    it('should apply choice effects correctly', () => {
      const stateManager = new StateManager({ trust: 0, revealed: false })
      const applicator = new EffectApplicator(stateManager)
      
      const choice = {
        text: 'Be kind',
        effects: { trust: '+1', kindness_shown: true },
        next: 'continue'
      }
      
      const newState = applicator.applyChoice(choice)
      
      expect(newState.trust).toBe(1)
      expect(newState.kindness_shown).toBe(true)
      expect(newState.revealed).toBe(false)
    })

    it('should preview choice effects without applying', () => {
      const stateManager = new StateManager({ trust: 3 })
      const applicator = new EffectApplicator(stateManager)
      
      const choice = {
        text: 'Reveal identity',
        effects: { trust: '+2', revealed: true },
        next: 'continue'
      }
      
      const previewState = applicator.previewChoice(choice)
      const actualState = applicator.getCurrentState()
      
      expect(previewState.trust).toBe(5)
      expect(previewState.revealed).toBe(true)
      expect(actualState.trust).toBe(3)
      expect(actualState.revealed).toBeUndefined()
    })
  })

  describe('ChoiceDrivenEngine', () => {
    it('should parse lighthouse keeper story correctly', () => {
      const storyJson = `{
        "title": "Test Story",
        "summary": "A test story",
        "initial_state": {
          "trust": 0,
          "revealed": false
        },
        "scenes": {
          "start": {
            "purpose": "Beginning",
            "available_when": "always"
          }
        },
        "endings": {
          "test_ending": {
            "condition": "trust > 5",
            "tone": "happy"
          }
        }
      }`
      
      const story = ChoiceDrivenEngine.parseStory(storyJson)
      
      expect(story.title).toBe('Test Story')
      expect(story.summary).toBe('A test story')
      expect(story.initial_state.trust).toBe(0)
      expect(story.initial_state.revealed).toBe(false)
      expect(story.scenes.start.purpose).toBe('Beginning')
      expect(story.endings.test_ending.condition).toBe('trust > 5')
    })

    it('should validate story structure', () => {
      // Valid story should not throw
      const validStory = {
        title: 'Test',
        summary: 'Test story',
        initial_state: { test: true },
        scenes: { start: { purpose: 'Test', available_when: 'always' } },
        endings: { end: { condition: 'test', tone: 'neutral' } }
      }
      
      expect(() => {
        const engine = new ChoiceDrivenEngine({} as any)
        // Access private method through any cast for testing
        ;(engine as any).validateStory(validStory)
      }).not.toThrow()

      // Invalid story should throw
      const invalidStory = {
        title: 'Test',
        // missing required fields
      }
      
      expect(() => {
        const engine = new ChoiceDrivenEngine({} as any)
        ;(engine as any).validateStory(invalidStory)
      }).toThrow()
    })
  })
})