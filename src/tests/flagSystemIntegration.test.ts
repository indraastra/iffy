import { describe, it, expect } from 'vitest';
import { FlagManager } from '../engine/FlagManager';
import { ImpressionistParser } from '../engine/impressionistParser';
import { readFile } from 'fs/promises';
import path from 'path';

describe('Simplified Flag System Integration', () => {

  describe('Friday Night Rain Story Integration', () => {
    it('should parse the simplified flag system correctly', async () => {
      const parser = new ImpressionistParser();
      const storyPath = path.join(process.cwd(), 'public/stories/friday_night_rain.yaml');
      const yamlContent = await readFile(storyPath, 'utf-8');
      
      const story = parser.parseYaml(yamlContent);
      
      // Verify the story has the expected flags (now includes pronoun flag)
      expect(story.flags).toBeDefined();
      expect(Object.keys(story.flags!)).toHaveLength(7);
      expect(story.flags!.alex_pronouns).toBeDefined();
      expect(story.flags!.admitted_feelings).toBeDefined();
      expect(story.flags!.player_reciprocated).toBeDefined();
      expect(story.flags!.conversation_ending).toBeDefined();
      expect(story.flags!.alex_defensive).toBeDefined();
      
      // Verify flag structure
      expect(story.flags!.admitted_feelings.default).toBe(false);
      expect(story.flags!.admitted_feelings.description).toContain('romantic feelings');
      expect(story.flags!.player_reciprocated.requires).toBe('admitted_feelings');
    });

    it('should generate proper flag progression guidance', async () => {
      const parser = new ImpressionistParser();
      const storyPath = path.join(process.cwd(), 'public/stories/friday_night_rain.yaml');
      const yamlContent = await readFile(storyPath, 'utf-8');
      const story = parser.parseYaml(yamlContent);
      
      const flagManager = new FlagManager(story);
      const guidance = flagManager.generateFlagProgressionGuidance();
      
      expect(guidance).toContain('FLAG PROGRESSION:');
      expect(guidance).toContain('Set these flags as the story develops:');
      expect(guidance).toContain('"admitted_feelings" → when Alex confesses their romantic feelings');
      expect(guidance).toContain('"player_reciprocated" → when player responds positively to confession');
      expect(guidance).toContain('"conversation_ending" → ONLY when someone makes moves to leave');
      expect(guidance).toContain('"alex_defensive" → if Alex shuts down or gets defensive');
    });

    it('should validate all ending conditions correctly', async () => {
      const parser = new ImpressionistParser();
      const storyPath = path.join(process.cwd(), 'public/stories/friday_night_rain.yaml');
      const yamlContent = await readFile(storyPath, 'utf-8');
      const story = parser.parseYaml(yamlContent);
      
      const flagManager = new FlagManager(story);
      
      // Test mutual_connection ending: admitted_feelings + player_reciprocated + conversation_ending
      flagManager.setFlag('admitted_feelings', true);
      flagManager.setFlag('player_reciprocated', true);
      flagManager.setFlag('conversation_ending', true);
      flagManager.setFlag('alex_defensive', false);
      
      expect(flagManager.checkConditions({
        all_of: ['admitted_feelings', 'player_reciprocated', 'conversation_ending']
      })).toBe(true);
      
      // Test gentle_rejection ending: admitted_feelings + !player_reciprocated + conversation_ending
      flagManager.setFlag('player_reciprocated', false);
      
      expect(flagManager.checkConditions({
        all_of: ['admitted_feelings', '!player_reciprocated', 'conversation_ending']
      })).toBe(true);
      
      // Test missed_chance ending: !admitted_feelings + conversation_ending
      flagManager.setFlag('admitted_feelings', false);
      
      expect(flagManager.checkConditions({
        all_of: ['!admitted_feelings', 'conversation_ending']
      })).toBe(true);
      
      // Test walls_stay_up ending: alex_defensive + conversation_ending
      flagManager.setFlag('alex_defensive', true);
      
      expect(flagManager.checkConditions({
        all_of: ['alex_defensive', 'conversation_ending']
      })).toBe(true);
    });

    it('should handle flag dependencies correctly', async () => {
      const parser = new ImpressionistParser();
      const storyPath = path.join(process.cwd(), 'public/stories/friday_night_rain.yaml');
      const yamlContent = await readFile(storyPath, 'utf-8');
      const story = parser.parseYaml(yamlContent);
      
      // Verify the dependency is defined in the story
      expect(story.flags!.player_reciprocated.requires).toBe('admitted_feelings');
      
      // Verify other flags don't have incorrect dependencies
      expect(story.flags!.admitted_feelings.requires).toBeUndefined();
      expect(story.flags!.conversation_ending.requires).toBeUndefined();
      expect(story.flags!.alex_defensive.requires).toBeUndefined();
    });

    it('should have minimal flag set covering all endings', async () => {
      const parser = new ImpressionistParser();
      const storyPath = path.join(process.cwd(), 'public/stories/friday_night_rain.yaml');
      const yamlContent = await readFile(storyPath, 'utf-8');
      const story = parser.parseYaml(yamlContent);
      
      // Verify we have exactly 7 flags (minimal set + pronoun flag + new flags)
      const flagNames = Object.keys(story.flags!);
      expect(flagNames).toHaveLength(7);
      expect(flagNames).toEqual([
        'alex_pronouns',
        'admitted_feelings',
        'player_reciprocated', 
        'conversation_ending',
        'alex_defensive',
        'memories_shared',
        'player_supportive'
      ]);
      
      // Verify we have 4 endings
      expect(story.endings.variations).toHaveLength(4);
      const endingIds = story.endings.variations.map(e => e.id);
      expect(endingIds).toEqual([
        'mutual_connection',
        'gentle_rejection',
        'missed_chance', 
        'walls_stay_up'
      ]);
    });
  });

  describe('Flag System Performance', () => {
    it('should initialize flags quickly', async () => {
      const parser = new ImpressionistParser();
      const storyPath = path.join(process.cwd(), 'public/stories/friday_night_rain.yaml');
      const yamlContent = await readFile(storyPath, 'utf-8');
      const story = parser.parseYaml(yamlContent);
      
      const startTime = Date.now();
      const flagManager = new FlagManager(story);
      const initTime = Date.now() - startTime;
      
      expect(initTime).toBeLessThan(10); // Should initialize in under 10ms
      expect(flagManager.getFlag('admitted_feelings')).toBe(false);
      expect(flagManager.getFlag('player_reciprocated')).toBe(false);
      expect(flagManager.getFlag('conversation_ending')).toBe(false);
      expect(flagManager.getFlag('alex_defensive')).toBe(false);
    });

    it('should generate guidance quickly', async () => {
      const parser = new ImpressionistParser();
      const storyPath = path.join(process.cwd(), 'public/stories/friday_night_rain.yaml');
      const yamlContent = await readFile(storyPath, 'utf-8');
      const story = parser.parseYaml(yamlContent);
      
      const flagManager = new FlagManager(story);
      
      const startTime = Date.now();
      const guidance = flagManager.generateFlagProgressionGuidance();
      const guidanceTime = Date.now() - startTime;
      
      expect(guidanceTime).toBeLessThan(5); // Should generate in under 5ms
      expect(guidance.length).toBeGreaterThan(100); // Should be substantial
    });
  });
});