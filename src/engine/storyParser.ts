import * as yaml from 'js-yaml';
import { Story } from '@/types/story';

export class StoryParseError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'StoryParseError';
  }
}

export class StoryParser {
  static async parseFromFile(file: File): Promise<Story> {
    const text = await file.text();
    return this.parseFromYaml(text);
  }

  static parseFromYaml(yamlText: string): Story {
    try {
      const parsed = yaml.load(yamlText) as any;
      return this.validateAndTransform(parsed);
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new StoryParseError(`YAML parsing failed: ${error.message}`, error);
      }
      throw error;
    }
  }

  private static validateAndTransform(data: any): Story {
    // Validate required root fields
    this.validateRequired(data, ['title', 'author', 'version'], 'root');
    
    // Validate required sections
    this.validateRequired(data, ['metadata', 'characters', 'locations', 'flows'], 'root');

    // Transform and validate each section
    const story: Story = {
      title: data.title,
      author: data.author,
      version: data.version,
      blurb: data.blurb, // Optional field for game selection
      metadata: this.validateMetadata(data.metadata),
      characters: this.validateCharacters(data.characters || []),
      locations: this.validateLocations(data.locations || []),
      items: this.validateItems(data.items || []),
      flows: this.validateFlows(data.flows || []),
      endings: this.validateEndings(data.endings || []),
      // Format v2 features
      success_conditions: this.validateSuccessConditions(data.success_conditions || []),
      llm_guidelines: data.llm_guidelines
    };

    // Validate reference integrity
    this.validateReferences(story);

    return story;
  }

  private static validateRequired(obj: any, fields: string[], context: string): void {
    for (const field of fields) {
      if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
        throw new StoryParseError(`Missing required field '${field}' in ${context}`);
      }
    }
  }

  private static validateMetadata(metadata: any): Story['metadata'] {
    this.validateRequired(metadata, ['setting', 'tone', 'themes'], 'metadata');
    this.validateRequired(metadata.setting, ['time', 'place'], 'metadata.setting');
    this.validateRequired(metadata.tone, ['overall', 'narrative_voice'], 'metadata.tone');

    if (!Array.isArray(metadata.themes)) {
      throw new StoryParseError('metadata.themes must be an array');
    }

    return {
      setting: {
        time: metadata.setting.time,
        place: metadata.setting.place
      },
      tone: {
        overall: metadata.tone.overall,
        narrative_voice: metadata.tone.narrative_voice
      },
      themes: metadata.themes,
      ui: metadata.ui,
      emergent_content: metadata.emergent_content
    };
  }

  private static validateCharacters(characters: any[]): Story['characters'] {
    if (!Array.isArray(characters)) {
      throw new StoryParseError('characters must be an array');
    }

    return characters.map((char, index) => {
      this.validateRequired(char, ['id', 'name', 'traits', 'voice', 'description'], `character[${index}]`);
      
      if (!Array.isArray(char.traits)) {
        throw new StoryParseError(`character[${index}].traits must be an array`);
      }

      return {
        id: char.id,
        name: char.name,
        traits: char.traits,
        voice: char.voice,
        description: char.description,
        relationships: char.relationships
      };
    });
  }

  private static validateLocations(locations: any[]): Story['locations'] {
    if (!Array.isArray(locations)) {
      throw new StoryParseError('locations must be an array');
    }

    return locations.map((loc, index) => {
      this.validateRequired(loc, ['id', 'name', 'connections', 'description'], `location[${index}]`);
      
      if (!Array.isArray(loc.connections)) {
        throw new StoryParseError(`location[${index}].connections must be an array`);
      }

      return {
        id: loc.id,
        name: loc.name,
        connections: loc.connections,
        description: loc.description,
        objects: loc.objects
      };
    });
  }

  private static validateItems(items: any[]): Story['items'] {
    if (!Array.isArray(items)) {
      throw new StoryParseError('items must be an array');
    }

    return items.map((item, index) => {
      this.validateRequired(item, ['id', 'name', 'description'], `item[${index}]`);
      
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        display_name: item.display_name,
        location: item.location,
        hidden: item.hidden || false,
        discoverable_in: item.discoverable_in,
        discovery_objects: item.discovery_objects,
        aliases: item.aliases,
        // Format v2: Smart item relationships
        can_become: item.can_become,
        created_from: item.created_from
      };
    });
  }


  private static validateFlows(flows: any[]): Story['flows'] {
    if (!Array.isArray(flows)) {
      throw new StoryParseError('flows must be an array');
    }

    return flows.map((flow, index) => {
      this.validateRequired(flow, ['id', 'type', 'name'], `flow[${index}]`);
      
      if (!['narrative', 'dialogue'].includes(flow.type)) {
        throw new StoryParseError(`flow[${index}].type must be 'narrative' or 'dialogue'`);
      }

      // Validate transitions if present
      if (flow.transitions) {
        if (!Array.isArray(flow.transitions)) {
          throw new StoryParseError(`flow[${index}].transitions must be an array`);
        }
        
        flow.transitions.forEach((transition: any, transIndex: number) => {
          this.validateRequired(transition, ['requires', 'to_flow'], `flow[${index}].transitions[${transIndex}]`);
          
          if (!Array.isArray(transition.requires)) {
            throw new StoryParseError(`flow[${index}].transitions[${transIndex}].requires must be an array`);
          }
        });
      }

      const result: Story['flows'][0] = {
        id: flow.id,
        type: flow.type,
        name: flow.name,
        sets: flow.sets,
        content: flow.content,
        transitions: flow.transitions, // New transition system
        participants: flow.participants,
        location: flow.location,
        exchanges: flow.exchanges,
        player_goal: flow.player_goal,
        hint: flow.hint,
        ends_game: flow.ends_game
      };

      return result;
    });
  }


  private static validateEndings(endings: any[]): Story['endings'] {
    if (!Array.isArray(endings)) {
      throw new StoryParseError('endings must be an array');
    }

    return endings.map((ending, index) => {
      this.validateRequired(ending, ['id', 'name', 'requires', 'content'], `ending[${index}]`);
      
      if (!Array.isArray(ending.requires)) {
        throw new StoryParseError(`ending[${index}].requires must be an array`);
      }

      return {
        id: ending.id,
        name: ending.name,
        requires: ending.requires,
        content: ending.content
      };
    });
  }

  private static validateReferences(story: Story): void {
    // Collect all valid IDs
    const characterIds = new Set(story.characters.map(c => c.id));
    const locationIds = new Set(story.locations.map(l => l.id));
    const flowIds = new Set(story.flows.map(f => f.id));

    // Validate that at least one flow exists (since first flow is now the starting point)
    if (story.flows.length === 0) {
      throw new StoryParseError('Story must have at least one flow');
    }

    // Validate location connections
    story.locations.forEach(location => {
      location.connections.forEach(connId => {
        if (!locationIds.has(connId)) {
          throw new StoryParseError(`Location ${location.id} references unknown connection: ${connId}`);
        }
      });
    });

    // Validate item locations (only when location is specified)
    const validSpecialLocations = new Set(['none', 'discovered']); // Allow fuzzy discovery
    story.items.forEach(item => {
      if (item.location && !validSpecialLocations.has(item.location) && !locationIds.has(item.location)) {
        throw new StoryParseError(`Item ${item.id} references unknown location: ${item.location}`);
      }
      // Also validate discoverable_in locations when specified
      if (item.discoverable_in && !locationIds.has(item.discoverable_in)) {
        throw new StoryParseError(`Item ${item.id} references unknown discoverable_in location: ${item.discoverable_in}`);
      }
    });

    // Validate flow references
    story.flows.forEach(flow => {
      // Validate new transitions
      if (flow.transitions) {
        flow.transitions.forEach(transition => {
          if (!flowIds.has(transition.to_flow)) {
            throw new StoryParseError(`Flow ${flow.id} transition references unknown flow: ${transition.to_flow}`);
          }
        });
      }

      if (flow.participants) {
        flow.participants.forEach(participantId => {
          if (participantId !== 'player' && !characterIds.has(participantId)) {
            throw new StoryParseError(`Flow ${flow.id} references unknown participant: ${participantId}`);
          }
        });
      }

      if (flow.location && !locationIds.has(flow.location)) {
        throw new StoryParseError(`Flow ${flow.id} references unknown location: ${flow.location}`);
      }
    });
  }

  private static validateSuccessConditions(successConditions: any[]): Story['success_conditions'] {
    if (!Array.isArray(successConditions)) {
      throw new StoryParseError('success_conditions must be an array');
    }

    return successConditions.map((condition, index) => {
      this.validateRequired(condition, ['id', 'description', 'requires'], `success_condition[${index}]`);
      
      if (!Array.isArray(condition.requires)) {
        throw new StoryParseError(`success_condition[${index}].requires must be an array`);
      }

      return {
        id: condition.id,
        description: condition.description,
        requires: condition.requires,
        ...(condition.ending && { ending: condition.ending })
      };
    });
  }
}