#!/usr/bin/env tsx
import { readFile } from 'node:fs/promises';
import { StoryParser, StoryParseError } from '../src/engine/storyParser';

async function validateStory(filePath: string): Promise<void> {
  try {
    console.log(`🔍 Validating story file: ${filePath}`);
    
    // Read the file
    const fileContent = await readFile(filePath, 'utf-8');
    console.log(`📖 File read successfully (${fileContent.length} characters)`);
    
    // Parse and validate
    const story = StoryParser.parseFromYaml(fileContent);
    console.log(`✅ Story parsed successfully!`);
    
    // Display story info
    console.log(`\n📚 Story Information:`);
    console.log(`   Title: ${story.title}`);
    console.log(`   Author: ${story.author}`);
    console.log(`   Version: ${story.version}`);
    console.log(`   Characters: ${story.characters.length}`);
    console.log(`   Locations: ${story.locations.length}`);
    console.log(`   Items: ${story.items.length}`);
    console.log(`   Knowledge: ${story.knowledge.length}`);
    console.log(`   Flows: ${story.flows.length}`);
    console.log(`   Endings: ${story.endings?.length || 0}`);
    
    // Format v2 features
    if (story.success_conditions && story.success_conditions.length > 0) {
      console.log(`   Success Conditions: ${story.success_conditions.length}`);
      
      // Show success condition details
      console.log(`\n🎯 Success Conditions:`);
      story.success_conditions.forEach(sc => {
        console.log(`   - ${sc.id}: ${sc.description}`);
        console.log(`     Requires: [${sc.requires.join(', ')}]`);
        console.log(`     All requirements must be met for this ending`);
      });
    }
    if (story.llm_story_guidelines) {
      console.log(`   LLM Guidelines: ${story.llm_story_guidelines.length} characters`);
    }
    
    // Show Format v2 item relationships
    const itemsWithRelationships = story.items.filter(item => item.can_become || item.created_from);
    if (itemsWithRelationships.length > 0) {
      console.log(`\n🔄 Item Transformations:`);
      itemsWithRelationships.forEach(item => {
        if (item.can_become) {
          console.log(`   - ${item.name} → can become: ${item.can_become}`);
        }
        if (item.created_from) {
          console.log(`   - ${item.name} ← created from: ${item.created_from}`);
        }
      });
    }
    
    // Validate references
    console.log(`\n🔗 Reference Validation:`);
    console.log(`   Start location: ${story.start.location} - ${story.locations.find(l => l.id === story.start.location) ? '✅' : '❌'}`);
    console.log(`   Start flow: ${story.start.first_flow} - ${story.flows.find(f => f.id === story.start.first_flow) ? '✅' : '❌'}`);
    
    // Check for common issues
    console.log(`\n🧪 Common Issues Check:`);
    
    // Check for unreferenced flows
    const referencedFlows = new Set([story.start.first_flow]);
    story.flows.forEach(flow => {
      if (flow.next) {
        flow.next.forEach(transition => referencedFlows.add(transition.flow_id));
      }
      if (flow.completion_transitions) {
        flow.completion_transitions.forEach(transition => referencedFlows.add(transition.to_flow));
      }
      if (flow.exchanges) {
        flow.exchanges.forEach(exchange => {
          if (exchange.choices) {
            exchange.choices.forEach(choice => {
              if (choice.next) referencedFlows.add(choice.next);
            });
          }
          if (exchange.next) referencedFlows.add(exchange.next);
        });
      }
    });
    
    const unreferencedFlows = story.flows.filter(flow => !referencedFlows.has(flow.id));
    if (unreferencedFlows.length > 0) {
      console.log(`   ⚠️  Unreferenced flows: ${unreferencedFlows.map(f => f.id).join(', ')}`);
    } else {
      console.log(`   ✅ All flows are referenced`);
    }
    
    // Check for missing flow references
    const allFlowIds = new Set(story.flows.map(f => f.id));
    const missingRefs: string[] = [];
    
    story.flows.forEach(flow => {
      if (flow.next) {
        flow.next.forEach(transition => {
          if (!allFlowIds.has(transition.flow_id)) {
            missingRefs.push(`${flow.id} -> ${transition.flow_id}`);
          }
        });
      }
      if (flow.completion_transitions) {
        flow.completion_transitions.forEach(transition => {
          if (!allFlowIds.has(transition.to_flow)) {
            missingRefs.push(`${flow.id} -> ${transition.to_flow} (completion)`);
          }
        });
      }
    });
    
    if (missingRefs.length > 0) {
      console.log(`   ❌ Missing flow references: ${missingRefs.join(', ')}`);
    } else {
      console.log(`   ✅ All flow references are valid`);
    }
    
    // Check item locations (support both location and discoverable_in)
    const allLocationIds = new Set(story.locations.map(l => l.id));
    const validSpecialLocations = new Set(['none', 'discovered']); // Allow fuzzy discovery
    const invalidItemLocations = story.items.filter(item => {
      // Item is valid if:
      // 1. It has no location field (using discoverable_in)
      // 2. It has a valid location field
      // 3. It has a valid discoverable_in field
      
      const hasValidLocation = !item.location || 
        validSpecialLocations.has(item.location) || 
        allLocationIds.has(item.location);
        
      const hasValidDiscoverableIn = !item.discoverable_in || 
        allLocationIds.has(item.discoverable_in);
        
      return !hasValidLocation || !hasValidDiscoverableIn;
    });
    
    if (invalidItemLocations.length > 0) {
      console.log(`   ❌ Items with invalid locations: ${invalidItemLocations.map(i => {
        const loc = i.location || 'undefined';
        const discLoc = i.discoverable_in || 'undefined';
        return `${i.id}@${loc}/${discLoc}`;
      }).join(', ')}`);
    } else {
      console.log(`   ✅ All item locations are valid`);
    }
    
    console.log(`\n🎉 Validation complete! The story file is valid.`);
    
  } catch (error) {
    console.error(`\n❌ Validation failed:`);
    
    if (error instanceof StoryParseError) {
      console.error(`   Parse Error: ${error.message}`);
      if (error.details) {
        console.error(`   Details:`, error.details);
      }
    } else if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    } else {
      console.error(`   Unknown error:`, error);
    }
    
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`Usage: npm run validate-story <story-file.yaml>`);
  console.log(`Example: npm run validate-story examples/investigation.yaml`);
  process.exit(1);
}

const filePath = args[0];
validateStory(filePath);