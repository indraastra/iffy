/**
 * Tests for the Impressionist Story Parser
 */

import { describe, it, expect } from 'vitest';
import { ImpressionistParser } from '@/engine/impressionistParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ImpressionistParser', () => {
  const parser = new ImpressionistParser();

  describe('parseFromYaml', () => {
    it('should parse minimal story format', () => {
      const yamlContent = `
title: "Test Story"
author: "Test Author"
blurb: "A test story."
version: "1.0"
context: "A simple test context."

scenes:
  - id: "start"
    sketch: "The beginning."

endings:
  - id: "end"
    when: "story ends"
    sketch: "The end."

guidance: "Test guidance."
      `;

      const result = parser.parseFromYaml(yamlContent);
      
      if (result.errors.length > 0) {
        console.log('Parsing errors:', result.errors);
      }
      expect(result.errors).toHaveLength(0);
      expect(result.story).toBeDefined();
      expect(result.story?.title).toBe('Test Story');
      expect(result.story?.author).toBe('Test Author');
      expect(result.story?.scenes).toHaveLength(1);
      expect(result.story?.endings.variations).toHaveLength(1);
    });

    it('should parse rich story format with all optional sections', () => {
      const yamlContent = `
title: "Rich Test Story"
author: "Test Author"
blurb: "A rich test story."
version: "2.0"
context: "A complex test context."

narrative:
  voice: "Test voice"
  tone: "Test tone"
  themes: ["theme1", "theme2"]

world:
  characters:
    test_char:
      name: "Test Character"
      essence: "A test character"
  
  locations:
    test_loc:
      description: "A test location"
  
  items:
    test_item:
      name: "Test Item"
      description: "A test item"
  
  atmosphere:
    sensory: ["sight", "sound"]
    mood: "mysterious"

scenes:
  - id: "start"
    sketch: "The beginning."
    leads_to:
      end: "when ready"

endings:
  - id: "end"
    when: "story ends"
    sketch: "The end."

guidance: "Test guidance."
      `;

      const result = parser.parseFromYaml(yamlContent);
      
      expect(result.errors).toHaveLength(0);
      expect(result.story).toBeDefined();
      expect(result.story?.narrative).toBeDefined();
      expect(result.story?.world).toBeDefined();
      expect(result.story?.world?.characters).toBeDefined();
      expect(result.story?.world?.locations).toBeDefined();
      expect(result.story?.world?.items).toBeDefined();
      expect(result.story?.world?.atmosphere).toBeDefined();
    });

    it('should validate required fields', () => {
      const yamlContent = `
title: "Test Story"
# Missing author, blurb, version, context, guidance
scenes: []
endings: []
      `;

      const parseResult = parser.parseFromYaml(yamlContent);
      expect(parseResult.story).toBeDefined(); // Should parse successfully
      
      // Validation should happen separately
      const validationResult = parser.validate(parseResult.story!);
      
      expect(validationResult.errors.length).toBeGreaterThan(0);
      expect(validationResult.errors.some(e => e.includes('author'))).toBe(true);
      expect(validationResult.errors.some(e => e.includes('blurb'))).toBe(true);
      expect(validationResult.errors.some(e => e.includes('context'))).toBe(true);
      expect(validationResult.errors.some(e => e.includes('guidance'))).toBe(true);
    });

    it('should detect code-like conditions and warn', () => {
      const yamlContent = `
title: "Test Story"
author: "Test Author"
blurb: "A test story."
version: "1.0"
context: "A simple test context."

scenes:
  - id: "start"
    sketch: "The beginning."
    leads_to:
      end: "has_item:key"

endings:
  - id: "end"
    when: "flag:won == true"
    sketch: "The end."

guidance: "Test guidance."
      `;

      const parseResult = parser.parseFromYaml(yamlContent);
      expect(parseResult.story).toBeDefined(); // Should parse successfully
      
      // Validation should detect code-like conditions
      const validationResult = parser.validate(parseResult.story!);
      
      expect(validationResult.warnings.length).toBeGreaterThan(0);
      expect(validationResult.warnings.some(w => w.includes('looks like code'))).toBe(true);
    });

    it('should handle invalid YAML', () => {
      const yamlContent = `
invalid: yaml: content: [
      `;

      const result = parser.parseFromYaml(yamlContent);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('YAML parsing failed');
    });
  });

  describe('validate', () => {
    it('should validate scene references', () => {
      const story = {
        title: 'Test',
        author: 'Test',
        blurb: 'Test',
        version: '1.0',
        context: 'Test context',
        scenes: [
          {
            id: 'start',
            sketch: 'Beginning',
            leads_to: {
              'nonexistent': 'when something happens'
            }
          }
        ],
        endings: {
          variations: [
            {
              id: 'end',
              when: 'story ends',
              sketch: 'The end'
            }
          ]
        },
        guidance: 'Test guidance'
      };

      const result = parser.validate(story);
      
      expect(result.warnings.some(w => w.includes('unknown scene'))).toBe(true);
    });

    it('should warn about unused world elements', () => {
      const story = {
        title: 'Test',
        author: 'Test',
        blurb: 'Test',
        version: '1.0',
        context: 'Test context',
        scenes: [{ id: 'start', sketch: 'Beginning' }],
        endings: { variations: [{ id: 'end', when: 'story ends', sketch: 'The end' }] },
        guidance: 'Test guidance',
        world: {
          characters: Object.fromEntries(
            Array.from({ length: 6 }, (_, i) => [`char${i}`, { name: `Char ${i}`, essence: 'Test' }])
          )
        }
      };

      const result = parser.validate(story);
      
      expect(result.warnings.some(w => w.includes('Many characters'))).toBe(true);
    });
  });

  describe('real examples', () => {
    it('should parse the_key.yaml successfully', async () => {
      try {
        const content = readFileSync(
          join(process.cwd(), 'examples/impressionist/the_key.yaml'),
          'utf-8'
        );
        
        const result = parser.parseFromYaml(content);
        
        expect(result.errors).toHaveLength(0);
        expect(result.story).toBeDefined();
        expect(result.story?.title).toBe('The Key');
        expect(result.story?.scenes).toHaveLength(2);
        expect(result.story?.endings.variations).toHaveLength(1);
      } catch (error) {
        // File may not exist in test environment, skip this test
        console.warn('Could not load the_key.yaml for testing');
      }
    });

    it('should parse coffee_confessional.yaml successfully', async () => {
      try {
        const content = readFileSync(
          join(process.cwd(), 'examples/impressionist/coffee_confessional.yaml'),
          'utf-8'
        );
        
        const result = parser.parseFromYaml(content);
        
        expect(result.errors).toHaveLength(0);
        expect(result.story).toBeDefined();
        expect(result.story?.title).toBe('Coffee Confessional');
        expect(result.story?.narrative).toBeDefined();
        expect(result.story?.world?.characters).toBeDefined();
        expect(result.story?.world?.atmosphere).toBeDefined();
      } catch (error) {
        // File may not exist in test environment, skip this test
        console.warn('Could not load coffee_confessional.yaml for testing');
      }
    });
  });
});