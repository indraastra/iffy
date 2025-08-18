import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlagManager } from '../engine/FlagManager';
import { ImpressionistStory } from '../types/impressionistStory';

describe('FlagManager', () => {
  describe('Structured Flag Support', () => {
    it('should initialize structured flags with default values', () => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          start: {
            sketch: 'Test scene'
          }
        },
        endings: {
          variations: []
        },
        flags: {
          test_flag: {
            default: false,
            description: 'when something happens'
          },
          another_flag: {
            default: true,
            description: 'when something else happens'
          },
          numeric_flag: {
            default: 42,
            description: 'when a number is needed'
          }
        }
      };

      const flagManager = new FlagManager(story);

      expect(flagManager.getFlag('test_flag')).toBe(false);
      expect(flagManager.getFlag('another_flag')).toBe(true);
      expect(flagManager.getFlag('numeric_flag')).toBe(42);
    });

    it('should generate FLAG PROGRESSION guidance', () => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          start: {
            sketch: 'Test scene'
          }
        },
        endings: {
          variations: []
        },
        flags: {
          acknowledged_distance: {
            default: false,
            description: 'when Alex admits they\'ve been acting differently'
          },
          alex_vulnerable: {
            default: false,
            description: 'when Alex\'s emotional walls start coming down'
          },
          conversation_ending: {
            default: false,
            description: 'ONLY when someone makes moves to leave'
          }
        }
      };

      const flagManager = new FlagManager(story);
      const guidance = flagManager.generateFlagProgressionGuidance();

      expect(guidance).toContain('FLAG PROGRESSION:');
      expect(guidance).toContain('Set these flags as the story develops:');
      expect(guidance).toContain('"acknowledged_distance" → when Alex admits they\'ve been acting differently');
      expect(guidance).toContain('"alex_vulnerable" → when Alex\'s emotional walls start coming down');
      expect(guidance).toContain('"conversation_ending" → ONLY when someone makes moves to leave');
    });

    it('should return empty string when no flags defined', () => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          start: {
            sketch: 'Test scene'
          }
        },
        endings: {
          variations: []
        }
      };

      const flagManager = new FlagManager(story);
      const guidance = flagManager.generateFlagProgressionGuidance();

      expect(guidance).toBe('');
    });
  });

  describe('Flag Operations', () => {
    let flagManager: FlagManager;

    beforeEach(() => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          start: {
            sketch: 'Test scene'
          }
        },
        endings: {
          variations: []
        },
        flags: {
          flag1: {
            default: false,
            description: 'when something happens'
          },
          flag2: {
            default: true,
            description: 'when something else happens'
          }
        }
      };

      flagManager = new FlagManager(story);
    });

    it('should set and get flag values', () => {
      flagManager.setFlag('flag1', true);
      expect(flagManager.getFlag('flag1')).toBe(true);

      flagManager.setFlag('flag2', false);
      expect(flagManager.getFlag('flag2')).toBe(false);
    });

    it('should apply flag changes from LLM', () => {
      flagManager.applyChanges({
        set: ['flag1'],
        clear: ['flag2']
      });

      expect(flagManager.getFlag('flag1')).toBe(true);
      expect(flagManager.getFlag('flag2')).toBe(false);
    });

    it('should get story flags excluding location flags', () => {
      flagManager.setFlag('flag1', true);
      flagManager.setFlag('at_cafe', true); // location flag
      flagManager.setFlag('location', 'cafe');

      const storyFlags = flagManager.getStoryFlags();

      expect(storyFlags.flag1).toBe(true);
      expect(storyFlags.flag2).toBe(true);
      expect(storyFlags.at_cafe).toBeUndefined();
      expect(storyFlags.location).toBeUndefined();
    });

    it('should get all flags including location flags', () => {
      flagManager.setFlag('flag1', true);
      flagManager.setFlag('at_cafe', true);

      const allFlags = flagManager.getAllFlags();

      expect(allFlags.flag1).toBe(true);
      expect(allFlags.at_cafe).toBe(true);
    });
  });

  describe('Flag Conditions', () => {
    let flagManager: FlagManager;

    beforeEach(() => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          start: {
            sketch: 'Test scene'
          }
        },
        endings: {
          variations: []
        },
        flags: {
          flag1: { default: false, description: 'test flag 1' },
          flag2: { default: false, description: 'test flag 2' },
          flag3: { default: false, description: 'test flag 3' }
        }
      };

      flagManager = new FlagManager(story);
    });

    it('should check all_of conditions', () => {
      flagManager.setFlag('flag1', true);
      flagManager.setFlag('flag2', true);

      expect(flagManager.checkConditions({
        all_of: ['flag1', 'flag2']
      })).toBe(true);

      expect(flagManager.checkConditions({
        all_of: ['flag1', 'flag2', 'flag3']
      })).toBe(false);
    });

    it('should check any_of conditions', () => {
      flagManager.setFlag('flag1', true);

      expect(flagManager.checkConditions({
        any_of: ['flag1', 'flag2']
      })).toBe(true);

      expect(flagManager.checkConditions({
        any_of: ['flag2', 'flag3']
      })).toBe(false);
    });

    it('should check none_of conditions', () => {
      flagManager.setFlag('flag1', true);

      expect(flagManager.checkConditions({
        none_of: ['flag2', 'flag3']
      })).toBe(true);

      expect(flagManager.checkConditions({
        none_of: ['flag1', 'flag2']
      })).toBe(false);
    });

    it('should check negated conditions', () => {
      flagManager.setFlag('flag1', true);

      expect(flagManager.checkConditions({
        all_of: ['!flag2', '!flag3']
      })).toBe(true);

      expect(flagManager.checkConditions({
        all_of: ['!flag1']
      })).toBe(false);
    });

    it('should handle complex conditions', () => {
      flagManager.setFlag('flag1', true);
      flagManager.setFlag('flag2', true);

      expect(flagManager.checkConditions({
        all_of: ['flag1'],
        any_of: ['flag2', 'flag3'],
        none_of: ['flag3']
      })).toBe(true);

      flagManager.setFlag('flag3', true);

      expect(flagManager.checkConditions({
        all_of: ['flag1'],
        any_of: ['flag2', 'flag3'],
        none_of: ['flag3']
      })).toBe(false);
    });

    it('should return true for undefined conditions', () => {
      expect(flagManager.checkConditions(undefined)).toBe(true);
    });
  });

  describe('Location Flags', () => {
    let flagManager: FlagManager;

    beforeEach(() => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          start: {
            sketch: 'Test scene',
            location: 'cafe'
          }
        },
        endings: {
          variations: []
        },
        flags: {
          test_flag: { default: false, description: 'test flag' }
        }
      };

      flagManager = new FlagManager(story);
    });

    it('should set initial location flag', () => {
      expect(flagManager.getFlag('location')).toBe('cafe');
      expect(flagManager.getFlag('at_cafe')).toBe(true);
    });

    it('should clear location flags when setting new location', () => {
      flagManager.setLocationFlag('park');

      expect(flagManager.getFlag('at_cafe')).toBe(false);
      expect(flagManager.getFlag('at_park')).toBe(true);
    });

    it('should clear all location flags', () => {
      flagManager.setLocationFlag('park');
      flagManager.clearLocationFlags();

      expect(flagManager.getFlag('at_cafe')).toBe(false);
      expect(flagManager.getFlag('at_park')).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let flagManager: FlagManager;

    beforeEach(() => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: {
          start: {
            sketch: 'Test scene'
          }
        },
        endings: {
          variations: []
        }
      };

      flagManager = new FlagManager(story);
    });

    it('should handle story with no flags defined', () => {
      expect(flagManager.getAllFlags()).toBeDefined();
      expect(flagManager.getStoryFlags()).toEqual({});
      expect(flagManager.generateFlagProgressionGuidance()).toBe('');
    });

    it('should handle undefined flag names gracefully', () => {
      expect(flagManager.getFlag('nonexistent')).toBeUndefined();
      
      flagManager.setFlag('test', true);
      expect(flagManager.getFlag('test')).toBe(true);
    });

    it('should handle empty flag changes', () => {
      flagManager.applyChanges({
        set: [],
        clear: []
      });
      
      // Should not throw errors
      expect(flagManager.getAllFlags()).toBeDefined();
    });

    it('should handle malformed condition objects', () => {
      // Empty condition object should return true
      expect(flagManager.checkConditions({})).toBe(true);
      
      // Individual empty arrays
      expect(flagManager.checkConditions({ all_of: [] })).toBe(true); // vacuously true
      expect(flagManager.checkConditions({ none_of: [] })).toBe(true); // vacuously true
      expect(flagManager.checkConditions({ any_of: [] })).toBe(false); // no conditions to satisfy
      
      // Mixed empty arrays - any_of: [] should cause failure
      expect(flagManager.checkConditions({
        all_of: [],
        any_of: [],
        none_of: []
      })).toBe(false);
    });

    it('should handle mixed condition types correctly', () => {
      flagManager.setFlag('flag1', true);
      flagManager.setFlag('flag2', false);
      
      // Test complex mixed conditions
      expect(flagManager.checkConditions({
        all_of: ['flag1', '!flag2'],
        any_of: ['flag1'],
        none_of: ['flag2']
      })).toBe(true);
    });

    it('should handle location flag edge cases', () => {
      // Setting empty location should clear at_ flags but not affect location value
      flagManager.setLocationFlag('');
      // The location flag itself is not managed by setLocationFlag, only at_ flags
      
      // Setting location multiple times
      flagManager.setLocationFlag('cafe');
      flagManager.setLocationFlag('park');
      flagManager.setLocationFlag('home');
      
      expect(flagManager.getFlag('at_cafe')).toBe(false);
      expect(flagManager.getFlag('at_park')).toBe(false);
      expect(flagManager.getFlag('at_home')).toBe(true);
    });

    it('should provide debug information', () => {
      flagManager.setFlag('test_flag', true);
      flagManager.setFlag('another_flag', false);
      
      const debugString = flagManager.getDebugString();
      expect(debugString).toContain('test_flag: true');
      expect(debugString).toContain('another_flag: false');
    });

  });

  describe('Performance and Memory', () => {
    it('should handle large numbers of flags efficiently', () => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: { start: { sketch: 'Test scene' } },
        endings: { variations: [] },
        flags: {}
      };

      // Create many flags
      for (let i = 0; i < 1000; i++) {
        story.flags![`flag_${i}`] = {
          default: i % 2 === 0,
          description: `Test flag ${i}`
        };
      }

      const flagManager = new FlagManager(story);
      
      // Performance test: should complete quickly
      const start = Date.now();
      
      // Set many flags
      const changes = {
        set: Array.from({length: 100}, (_, i) => `flag_${i}`),
        clear: Array.from({length: 100}, (_, i) => `flag_${i + 100}`)
      };
      
      flagManager.applyChanges(changes);
      
      // Check conditions on many flags
      const condition = {
        all_of: Array.from({length: 10}, (_, i) => `flag_${i}`)
      };
      
      flagManager.checkConditions(condition);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      
      // Verify some flags were set correctly
      expect(flagManager.getFlag('flag_0')).toBe(true);
      expect(flagManager.getFlag('flag_100')).toBe(false);
    });
  });

  describe('Flag Requirements', () => {
    let flagManager: FlagManager;

    beforeEach(() => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: { start: { sketch: 'Test scene' } },
        endings: { variations: [] },
        flags: {
          prerequisite_flag: {
            default: false,
            description: 'must be set first'
          },
          dependent_flag: {
            default: false,
            description: 'depends on prerequisite',
            requires: {
              all_of: ['prerequisite_flag']
            }
          },
          complex_dependent_flag: {
            default: false,
            description: 'has complex requirements',
            requires: {
              all_of: ['prerequisite_flag'],
              none_of: ['blocking_flag']
            }
          },
          blocking_flag: {
            default: false,
            description: 'blocks complex dependent flag'
          }
        }
      };

      flagManager = new FlagManager(story);
    });

    it('should allow setting flags without requirements', () => {
      flagManager.setFlag('prerequisite_flag', true);
      expect(flagManager.getFlag('prerequisite_flag')).toBe(true);
    });

    it('should block setting flag when requirements not met', () => {
      // Try to set dependent flag without prerequisite
      flagManager.setFlag('dependent_flag', true);
      expect(flagManager.getFlag('dependent_flag')).toBe(false); // Should remain false
    });

    it('should allow setting flag when requirements are met', () => {
      // Set prerequisite first
      flagManager.setFlag('prerequisite_flag', true);
      
      // Now dependent flag should be settable
      flagManager.setFlag('dependent_flag', true);
      expect(flagManager.getFlag('dependent_flag')).toBe(true);
    });

    it('should handle complex requirements correctly', () => {
      // Set prerequisite but also set blocking flag
      flagManager.setFlag('prerequisite_flag', true);
      flagManager.setFlag('blocking_flag', true);
      
      // Complex dependent flag should not be settable due to blocking flag
      flagManager.setFlag('complex_dependent_flag', true);
      expect(flagManager.getFlag('complex_dependent_flag')).toBe(false);
      
      // Remove blocking flag
      flagManager.setFlag('blocking_flag', false);
      
      // Now it should be settable
      flagManager.setFlag('complex_dependent_flag', true);
      expect(flagManager.getFlag('complex_dependent_flag')).toBe(true);
    });

    it('should allow setting flag to false regardless of requirements', () => {
      // Should be able to set to false even if requirements aren't met
      flagManager.setFlag('dependent_flag', false);
      expect(flagManager.getFlag('dependent_flag')).toBe(false);
    });

    it('should check requirements in applyChanges', () => {
      // Try to set dependent flag via applyChanges without prerequisite
      flagManager.applyChanges({
        set: ['dependent_flag'],
        clear: []
      });
      
      expect(flagManager.getFlag('dependent_flag')).toBe(false);
      
      // Set prerequisite and try again
      flagManager.setFlag('prerequisite_flag', true);
      flagManager.applyChanges({
        set: ['dependent_flag'],
        clear: []
      });
      
      expect(flagManager.getFlag('dependent_flag')).toBe(true);
    });

    it('should handle batch operations correctly', () => {
      // Try to set both prerequisite and dependent in same batch
      flagManager.applyChanges({
        set: ['prerequisite_flag', 'dependent_flag'],
        clear: []
      });
      
      // Prerequisite should be set, but dependent might not be due to order
      expect(flagManager.getFlag('prerequisite_flag')).toBe(true);
      // This behavior depends on implementation - dependent_flag might fail if checked before prerequisite_flag is set
    });

    it('should provide meaningful warning messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      flagManager.setFlag('dependent_flag', true);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cannot set flag 'dependent_flag' to true: requirements not met")
      );
      
      consoleSpy.mockRestore();
    });

    it('should work with understudy story decision_moment scenario', () => {
      // Test the specific scenario from understudy.yaml
      const understudyStory: ImpressionistStory = {
        title: 'Understudy',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: { start: { sketch: 'Test scene' } },
        endings: { variations: [] },
        flags: {
          second_act_ended: {
            default: false,
            description: 'when the second act ends and final curtain falls'
          },
          decision_moment: {
            default: false,
            description: 'when the final choice about continuing or parting is presented',
            requires: {
              all_of: ['second_act_ended']
            }
          }
        }
      };

      const understudyFlagManager = new FlagManager(understudyStory);

      // Try to set decision_moment before second_act_ended
      understudyFlagManager.setFlag('decision_moment', true);
      expect(understudyFlagManager.getFlag('decision_moment')).toBe(false);

      // Set second_act_ended first
      understudyFlagManager.setFlag('second_act_ended', true);
      
      // Now decision_moment should be settable
      understudyFlagManager.setFlag('decision_moment', true);
      expect(understudyFlagManager.getFlag('decision_moment')).toBe(true);
    });
  });

  describe('Condition Caching', () => {
    let flagManager: FlagManager;

    beforeEach(() => {
      const story: ImpressionistStory = {
        title: 'Test Story',
        author: 'Test',
        blurb: 'Test blurb',
        version: '1.0',
        context: 'Test context',
        guidance: 'Test guidance',
        scenes: { start: { sketch: 'Test scene' } },
        endings: { variations: [] },
        flags: {
          flag1: { default: false, description: 'test flag 1' },
          flag2: { default: false, description: 'test flag 2' }
        }
      };

      flagManager = new FlagManager(story);
    });

    it('should cache condition results', () => {
      const condition = { all_of: ['flag1', '!flag2'] };
      
      // First evaluation should calculate and cache
      const result1 = flagManager.checkConditions(condition);
      expect(result1).toBe(false); // flag1 is false
      
      // Second evaluation should use cache (same result)
      const result2 = flagManager.checkConditions(condition);
      expect(result2).toBe(false);
      
      // Cache should have this condition
      expect(flagManager.getCacheStats().size).toBeGreaterThan(0);
    });

    it('should invalidate cache when flags change', () => {
      const condition = { all_of: ['flag1', '!flag2'] };
      
      // First evaluation
      const result1 = flagManager.checkConditions(condition);
      expect(result1).toBe(false);
      
      // Change a flag - this should invalidate cache
      flagManager.setFlag('flag1', true);
      
      // Cache should be empty after flag change
      expect(flagManager.getCacheStats().size).toBe(0);
      
      // Evaluation should give new result
      const result2 = flagManager.checkConditions(condition);
      expect(result2).toBe(true); // flag1 is now true, flag2 is still false
    });

    it('should invalidate cache on batch flag changes', () => {
      const condition = { all_of: ['flag1', 'flag2'] };
      
      // Cache a result
      flagManager.checkConditions(condition);
      expect(flagManager.getCacheStats().size).toBeGreaterThan(0);
      
      // Apply batch changes
      flagManager.applyChanges({
        set: ['flag1', 'flag2'],
        clear: []
      });
      
      // Cache should be invalidated
      expect(flagManager.getCacheStats().size).toBe(0);
    });
  });
});