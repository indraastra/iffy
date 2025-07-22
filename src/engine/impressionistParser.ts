/**
 * Parser for the Impressionist Story Format
 * 
 * Handles both minimal (50 lines) and rich (150+ lines) story formats
 * with progressive complexity validation.
 */

import { 
  ImpressionistStory, 
  ParseResult, 
  ImpressionistScene,
  ImpressionistEnding,
  ImpressionistEndingCollection,
  NarrativeMetadata,
  WorldDefinition,
  ImpressionistCharacter,
  ImpressionistLocation,
  ImpressionistItem,
  AtmosphereDefinition,
  UIConfiguration
} from '@/types/impressionistStory';
import * as YAML from 'js-yaml';

export class ImpressionistParser {
  /**
   * Parse story from YAML string
   */
  parseYaml(yamlContent: string): ImpressionistStory {
    const result = this.parseFromYaml(yamlContent);
    if (!result.story) {
      throw new Error(result.errors.join(', '));
    }
    return result.story;
  }

  /**
   * Parse story from YAML string with detailed results
   */
  parseFromYaml(yamlContent: string): ParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const rawData = YAML.load(yamlContent);
      
      if (!rawData || typeof rawData !== 'object') {
        return {
          errors: ['Invalid YAML: expected object at root level'],
          warnings: []
        };
      }

      const story = this.parseStoryData(rawData, errors, warnings);
      
      if (errors.length > 0) {
        return { errors, warnings };
      }

      return {
        story,
        errors,
        warnings
      };
    } catch (error) {
      return {
        errors: [`YAML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Parse story from uploaded file
   */
  async parseFromFile(file: File): Promise<ParseResult> {
    try {
      const content = await this.readFileContent(file);
      return this.parseFromYaml(content);
    } catch (error) {
      return {
        errors: [`File reading failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Validate that story meets impressionist format requirements
   */
  validate(story: ImpressionistStory): ParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Core requirements
    this.validateCoreFields(story, errors);
    this.validateScenes(story.scenes, errors, warnings);
    this.validateEndings(story.endings, errors, warnings);
    
    // Optional sections
    if (story.narrative) {
      this.validateNarrative(story.narrative, warnings);
    }
    
    if (story.world) {
      this.validateWorld(story.world, warnings);
    }

    // Impressionist-specific validations
    this.validateNaturalLanguage(story, warnings);
    this.validateComplexity(story, warnings);

    return {
      story: errors.length === 0 ? story : undefined,
      errors,
      warnings
    };
  }

  private parseStoryData(data: any, errors: string[], warnings: string[]): ImpressionistStory {
    const story: ImpressionistStory = {
      // Core metadata - don't validate during parsing, just extract
      title: data.title ? String(data.title).trim() : '',
      author: data.author ? String(data.author).trim() : '',
      blurb: data.blurb ? String(data.blurb).trim() : '',
      version: data.version ? String(data.version).trim() : '1.0',
      
      // Story essence
      context: data.context ? String(data.context).trim() : '',
      scenes: this.parseScenes(data.scenes, errors, warnings),
      endings: this.parseEndings(data.endings, errors, warnings),
      guidance: data.guidance ? String(data.guidance).trim() : ''
    };

    // Optional sections
    if (data.narrative) {
      story.narrative = this.parseNarrative(data.narrative, warnings);
    }

    if (data.world) {
      story.world = this.parseWorld(data.world, warnings);
    }

    if (data.ui) {
      story.ui = this.parseUI(data.ui, warnings);
    }

    if (data.flags) {
      story.flags = data.flags;
    }

    return story;
  }

  private parseScenes(data: any, errors: string[], warnings: string[]): Record<string, ImpressionistScene> {
    if (!data || typeof data !== 'object') {
      errors.push('scenes must be an object (key-value pairs)');
      return {};
    }

    const scenes: Record<string, ImpressionistScene> = {};

    for (const [sceneId, sceneData] of Object.entries(data)) {
      if (!sceneData || typeof sceneData !== 'object') {
        errors.push(`Scene '${sceneId}' must be an object`);
        continue;
      }

      const scene = sceneData as any;
      const parsed: ImpressionistScene = {
        sketch: scene.sketch ? String(scene.sketch).trim() : ''
      };
      
      // Validate required fields
      if (!parsed.sketch) {
        errors.push(`Scene '${sceneId}' missing sketch`);
      }

      // Optional location reference
      if (scene.location) {
        parsed.location = String(scene.location).trim();
      }

      // Optional scene-specific guidance
      if (scene.guidance) {
        parsed.guidance = String(scene.guidance).trim();
      }

      // Optional process_sketch flag (defaults to true for LLM-first engine)
      parsed.process_sketch = scene.process_sketch !== undefined ? Boolean(scene.process_sketch) : true;

      // Parse leads_to transitions
      if (scene.leads_to) {
        parsed.leads_to = this.parseLeadsTo(scene.leads_to, `scenes.${sceneId}.leads_to`, warnings);
      }

      scenes[sceneId] = parsed;
    }

    return scenes;
  }

  private parseEndings(data: any, errors: string[], _warnings: string[]): ImpressionistEndingCollection {
    // Handle structured format with optional global conditions
    if (!data || typeof data !== 'object') {
      errors.push('endings must be an object with "variations" array');
      return { variations: [] };
    }

    const result: ImpressionistEndingCollection = {
      variations: []
    };

    // Parse global when conditions if present
    if (data.when) {
      result.when = data.when;
    }
    // Parse global requires conditions if present
    if (data.requires) {
      result.requires = data.requires;
    }

    // Parse variations array
    if (Array.isArray(data.variations)) {
      result.variations = this.parseEndingArray(data.variations, errors);
    } else {
      errors.push('endings.variations must be an array');
    }

    return result;
  }

  private parseEndingArray(data: any[], errors: string[]): ImpressionistEnding[] {
    return data.map((ending, index) => {
      if (!ending || typeof ending !== 'object') {
        errors.push(`Ending ${index} must be an object`);
        return { id: `ending_${index}`, when: '', sketch: '' };
      }

      const parsed = {
        id: ending.id ? String(ending.id).trim() : `ending_${index}`,
        when: ending.when || '',
        sketch: ending.sketch ? String(ending.sketch).trim() : '',
        requires: ending.requires  // Copy flag-based conditions
      };
      
      // Validate required fields
      if (!parsed.id) {
        errors.push(`Ending ${index} missing id`);
      }
      if (!parsed.when) {
        errors.push(`Ending ${index} missing when condition`);
      }
      if (!parsed.sketch) {
        errors.push(`Ending ${index} missing sketch`);
      }
      
      return parsed;
    });
  }

  private parseNarrative(data: any, warnings: string[]): NarrativeMetadata {
    if (!data || typeof data !== 'object') {
      warnings.push('narrative should be an object');
      return {};
    }

    const narrative: NarrativeMetadata = {};

    if (data.voice) narrative.voice = String(data.voice);
    if (data.tone) narrative.tone = String(data.tone);
    if (Array.isArray(data.themes)) {
      narrative.themes = data.themes.map(String);
    }

    if (data.setting && typeof data.setting === 'object') {
      narrative.setting = {
        time: data.setting.time ? String(data.setting.time) : undefined,
        place: data.setting.place ? String(data.setting.place) : undefined,
        environment: data.setting.environment ? String(data.setting.environment) : undefined
      };
    }

    return narrative;
  }

  private parseWorld(data: any, warnings: string[]): WorldDefinition {
    if (!data || typeof data !== 'object') {
      warnings.push('world should be an object');
      return {};
    }

    const world: WorldDefinition = {};

    if (data.characters) {
      world.characters = this.parseCharacters(data.characters, warnings);
    }

    if (data.locations) {
      world.locations = this.parseLocations(data.locations, warnings);
    }

    if (data.items) {
      world.items = this.parseItems(data.items, warnings);
    }

    if (data.atmosphere) {
      world.atmosphere = this.parseAtmosphere(data.atmosphere, warnings);
    }

    return world;
  }

  private parseUI(data: any, warnings: string[]): UIConfiguration {
    if (!data || typeof data !== 'object') {
      warnings.push('ui should be an object');
      return {};
    }

    const ui: UIConfiguration = {};

    if (data.loadingMessage) {
      ui.loadingMessage = String(data.loadingMessage);
    }

    if (data.placeholderText) {
      ui.placeholderText = String(data.placeholderText);
    }

    if (data.styles && typeof data.styles === 'object') {
      ui.styles = data.styles;
    }

    if (data.formatters && Array.isArray(data.formatters)) {
      ui.formatters = data.formatters.map((formatter: any) => {
        if (!formatter || typeof formatter !== 'object') {
          warnings.push('formatter should be an object');
          return null;
        }

        const parsed: any = {
          name: formatter.name || 'Unnamed formatter',
          pattern: formatter.pattern || '',
          priority: formatter.priority || 0,
          applyTo: formatter.applyTo || 'groups'
        };

        if (formatter.replacements && Array.isArray(formatter.replacements)) {
          parsed.replacements = formatter.replacements.map((replacement: any) => {
            if (!replacement || typeof replacement !== 'object') {
              warnings.push('formatter replacement should be an object');
              return null;
            }

            return {
              target: replacement.target,
              wrapWith: replacement.wrapWith || 'span',
              className: replacement.className,
              style: replacement.style,
              attributes: replacement.attributes || {}
            };
          }).filter(Boolean);
        }

        return parsed;
      }).filter(Boolean);
    }

    if (data.colorPalette && typeof data.colorPalette === 'object') {
      const colorPalette: Record<string, number> = {};
      
      for (const [paletteType, count] of Object.entries(data.colorPalette)) {
        if (typeof count === 'number' && count > 0) {
          colorPalette[paletteType] = count;
        } else {
          warnings.push(`colorPalette.${paletteType} should be a positive number, got: ${count}`);
        }
      }
      
      if (Object.keys(colorPalette).length > 0) {
        ui.colorPalette = colorPalette;
      }
    }

    return ui;
  }

  private parseCharacters(data: any, warnings: string[]): Record<string, ImpressionistCharacter> {
    if (!data || typeof data !== 'object') {
      warnings.push('world.characters should be an object');
      return {};
    }

    const characters: Record<string, ImpressionistCharacter> = {};
    
    for (const [id, charData] of Object.entries(data)) {
      if (!charData || typeof charData !== 'object') {
        warnings.push(`Character ${id} should be an object`);
        continue;
      }

      const char = charData as any;
      characters[id] = {
        id,
        name: char.name || id,
        sketch: char.sketch || 'A character in the story',
        arc: char.arc,
        voice: char.voice
      };
    }

    return characters;
  }

  private parseLocations(data: any, warnings: string[]): Record<string, ImpressionistLocation> {
    if (!data || typeof data !== 'object') {
      warnings.push('world.locations should be an object');
      return {};
    }

    const locations: Record<string, ImpressionistLocation> = {};
    
    for (const [id, locData] of Object.entries(data)) {
      if (!locData || typeof locData !== 'object') {
        warnings.push(`Location ${id} should be an object`);
        continue;
      }

      const loc = locData as any;
      
      const sketch = loc.sketch || 'A location in the story';
      
      locations[id] = {
        name: loc.name || id.replace(/_/g, ' '), // Default name from ID
        sketch: sketch,
        atmosphere: Array.isArray(loc.atmosphere) ? loc.atmosphere.slice(0, 3) : undefined, // Limit to 3 for token efficiency
        guidance: loc.guidance ? String(loc.guidance).trim() : undefined,
        connections: Array.isArray(loc.connections) ? loc.connections : undefined,
        contains: Array.isArray(loc.contains) ? loc.contains : undefined
      };
    }

    return locations;
  }

  private parseItems(data: any, warnings: string[]): Record<string, ImpressionistItem> {
    if (!data || typeof data !== 'object') {
      warnings.push('world.items should be an object');
      return {};
    }

    const items: Record<string, ImpressionistItem> = {};
    
    for (const [id, itemData] of Object.entries(data)) {
      if (!itemData || typeof itemData !== 'object') {
        warnings.push(`Item ${id} should be an object`);
        continue;
      }

      const item = itemData as any;
      items[id] = {
        name: item.name || id,
        sketch: item.sketch || 'An item in the story',
        found_in: item.found_in,
        reveals: item.reveals,
        hidden: Boolean(item.hidden)
      };
    }

    return items;
  }

  private parseAtmosphere(data: any, warnings: string[]): AtmosphereDefinition {
    if (!data || typeof data !== 'object') {
      warnings.push('world.atmosphere should be an object');
      return {};
    }

    return {
      sensory: Array.isArray(data.sensory) ? data.sensory.map(String) : undefined,
      objects: Array.isArray(data.objects) ? data.objects.map(String) : undefined,
      mood: data.mood ? String(data.mood) : undefined
    };
  }

  private parseLeadsTo(data: any, path: string, warnings: string[]): Record<string, string> {
    if (!data || typeof data !== 'object') {
      warnings.push(`${path} should be an object mapping scene IDs to conditions`);
      return {};
    }

    const result: Record<string, string> = {};
    for (const [sceneId, condition] of Object.entries(data)) {
      result[sceneId] = String(condition);
    }
    return result;
  }


  private validateCoreFields(story: ImpressionistStory, errors: string[]) {
    // Core metadata validation
    if (!story.title) errors.push('title is required');
    if (!story.author) errors.push('author is required');
    if (!story.blurb) errors.push('blurb is required');
    if (!story.context) errors.push('context is required');
    if (!story.guidance) errors.push('guidance is required');
    
    // Context should be concise (1-3 sentences)
    if (story.context && story.context.split(/[.!?]+/).length > 4) {
      errors.push('context should be 1-3 sentences');
    }
  }

  private validateScenes(scenes: Record<string, ImpressionistScene>, errors: string[], warnings: string[]) {
    const sceneIds = Object.keys(scenes);
    
    if (sceneIds.length === 0) {
      errors.push('At least one scene is required');
      return;
    }

    // Validate each scene
    for (const [sceneId, scene] of Object.entries(scenes)) {
      if (!scene.sketch) {
        errors.push(`Scene '${sceneId}' missing sketch`);
      }

      // Validate leads_to references
      if (scene.leads_to) {
        for (const targetScene of Object.keys(scene.leads_to)) {
          if (!scenes[targetScene]) {
            warnings.push(`Scene '${sceneId}' references unknown scene: '${targetScene}'`);
          }
        }
      }
    }
  }

  private validateEndings(endings: ImpressionistEndingCollection, errors: string[], warnings: string[]) {
    if (!endings || !endings.variations || endings.variations.length === 0) {
      warnings.push('No endings defined - story may not conclude properly');
      return;
    }

    const endingIds = new Set<string>();
    
    endings.variations.forEach(ending => {
      if (endingIds.has(ending.id)) {
        errors.push(`Duplicate ending ID: ${ending.id}`);
      }
      endingIds.add(ending.id);

      if (!ending.when) {
        errors.push(`Ending ${ending.id} missing 'when' condition`);
      }

      if (!ending.sketch) {
        errors.push(`Ending ${ending.id} missing sketch`);
      }
    });
  }

  private validateNarrative(narrative: NarrativeMetadata, warnings: string[]) {
    // Narrative metadata is all optional, just check for useful content
    if (Object.keys(narrative).length === 0) {
      warnings.push('narrative section is empty - consider removing it');
    }
  }

  private validateWorld(world: WorldDefinition, warnings: string[]) {
    // World building is optional, validate internal consistency
    if (world.locations && world.items) {
      // Check that item locations reference valid locations
      for (const [itemId, item] of Object.entries(world.items)) {
        if (item.found_in) {
          const locations = Array.isArray(item.found_in) ? item.found_in : [item.found_in];
          for (const loc of locations) {
            if (!world.locations[loc]) {
              warnings.push(`Item ${itemId} found_in unknown location: ${loc}`);
            }
          }
        }
      }
    }
  }

  private validateNaturalLanguage(story: ImpressionistStory, warnings: string[]) {
    // Check that conditions are natural language, not code-like
    if (story.endings && story.endings.variations) {
      story.endings.variations.forEach(ending => {
        if (ending.when) {
          const conditions = Array.isArray(ending.when) ? ending.when : [ending.when];
          conditions.forEach(condition => {
              if (this.looksLikeCode(condition)) {
                warnings.push(`Ending ${ending.id} condition looks like code, use natural language: "${condition}"`);
              }
          });
        }
      });
    }

    // Check scene transitions
    Object.entries(story.scenes).forEach(([sceneId, scene]) => {
      if (scene.leads_to) {
        Object.values(scene.leads_to).forEach(condition => {
          if (this.looksLikeCode(condition)) {
            warnings.push(`Scene ${sceneId} transition looks like code, use natural language: "${condition}"`);
          }
        });
      }
    });
  }

  private validateComplexity(story: ImpressionistStory, warnings: string[]) {
    // Analyze story complexity and provide guidance
    const lineCount = this.estimateLineCount(story);
    
    if (lineCount < 40) {
      warnings.push(`Story appears minimal (${lineCount} lines) - consider it complete or add world details`);
    } else if (lineCount > 200) {
      warnings.push(`Story is quite complex (${lineCount} lines) - ensure it maintains impressionistic focus`);
    }

    // Check for unused world elements
    if (story.world?.characters && Object.keys(story.world.characters).length > 5) {
      warnings.push('Many characters defined - ensure they all serve the narrative');
    }

    if (story.world?.items && Object.keys(story.world.items).length > 10) {
      warnings.push('Many items defined - consider if all are necessary');
    }
  }

  private looksLikeCode(text: string): boolean {
    // Simple heuristics to detect code-like conditions
    return /^(has_|location:|flag:)/i.test(text) ||
           /&&|\|\||==|!=|>=|<=/.test(text) ||
           /^\w+\s*[=<>!]+\s*\w+$/.test(text);
  }

  private estimateLineCount(story: ImpressionistStory): number {
    // Rough estimate of YAML line count
    let lines = 10; // Base metadata
    
    lines += Object.keys(story.scenes).length * 4; // Average scene size
    lines += story.endings.variations.length * 3; // Average ending size
    lines += story.guidance.split('\n').length;
    
    if (story.narrative) lines += 8;
    if (story.world?.characters) lines += Object.keys(story.world.characters).length * 4;
    if (story.world?.locations) lines += Object.keys(story.world.locations).length * 3;
    if (story.world?.items) lines += Object.keys(story.world.items).length * 3;
    if (story.world?.atmosphere) lines += 5;
    
    return lines;
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// Export singleton instance
export const impressionistParser = new ImpressionistParser();