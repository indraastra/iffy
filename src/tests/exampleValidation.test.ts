import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { StoryParser } from '../engine/storyParser';

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
        
        // This should not throw an error
        expect(() => {
          const story = StoryParser.parseFromYaml(content);
          
          // Basic structural validation
          expect(story.title).toBeDefined();
          expect(story.author).toBeDefined();
          expect(story.version).toBeDefined();
          expect(story.characters).toBeDefined();
          expect(story.locations).toBeDefined();
          expect(story.flows).toBeDefined();
          expect(story.start).toBeDefined();
          
          // Start location should exist
          expect(story.locations.find(l => l.id === story.start.location)).toBeDefined();
          
          // Start flow should exist
          expect(story.flows.find(f => f.id === story.start.first_flow)).toBeDefined();
          
        }).not.toThrow();
      });
    });
    
    it('should validate all example stories can be bundled', () => {
      const validStories: Array<{filename: string, title: string}> = [];
      
      storyFiles.forEach(file => {
        const filePath = join(examplesDir, file);
        const content = readFileSync(filePath, 'utf-8');
        
        // Should be able to parse each story
        const story = StoryParser.parseFromYaml(content);
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
});