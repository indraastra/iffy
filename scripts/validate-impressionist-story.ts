#!/usr/bin/env tsx
import { readFile } from 'node:fs/promises';
import { ImpressionistParser } from '../src/engine/impressionistParser';

async function validateStory(filePath: string): Promise<void> {
  try {
    console.log(`🔍 Validating impressionist story: ${filePath}`);
    
    // Read the file
    const fileContent = await readFile(filePath, 'utf-8');
    console.log(`📖 File read successfully (${fileContent.length} characters)`);
    
    // Parse and validate
    const parser = new ImpressionistParser();
    const result = parser.parseFromYaml(fileContent);
    
    // Display errors
    if (result.errors.length > 0) {
      console.log(`\n❌ Validation errors:`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Display warnings
    if (result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (result.story) {
      console.log(`\n✅ Story parsed successfully!`);
      
      // Display story info
      console.log(`\n📚 Story Information:`);
      console.log(`   Title: ${result.story.title}`);
      console.log(`   Author: ${result.story.author}`);
      console.log(`   Version: ${result.story.version}`);
      console.log(`   Scenes: ${Object.keys(result.story.scenes).length}`);
      console.log(`   Endings: ${result.story.endings?.variations?.length || 0}`);
      
      if (result.story.world) {
        const world = result.story.world;
        console.log(`\n🌍 World Elements:`);
        if (world.characters) console.log(`   Characters: ${Object.keys(world.characters).length}`);
        if (world.locations) console.log(`   Locations: ${Object.keys(world.locations).length}`);
        if (world.items) console.log(`   Items: ${Object.keys(world.items).length}`);
      }
      
      // Check for unreachable scenes
      console.log(`\n🔗 Scene Connectivity Check:`);
      const scenes = result.story.scenes;
      const sceneIds = Object.keys(scenes);
      
      if (sceneIds.length > 0) {
        const reachableScenes = new Set<string>();
        const toVisit = [sceneIds[0]]; // Start from first scene
        
        while (toVisit.length > 0) {
          const current = toVisit.pop()!;
          if (reachableScenes.has(current)) continue;
          
          reachableScenes.add(current);
          const scene = scenes[current];
          
          if (scene.leads_to) {
            Object.keys(scene.leads_to).forEach(targetScene => {
              if (!reachableScenes.has(targetScene) && scenes[targetScene]) {
                toVisit.push(targetScene);
              }
            });
          }
        }
        
        const unreachableScenes = sceneIds.filter(id => !reachableScenes.has(id));
        if (unreachableScenes.length > 0) {
          console.log(`   ⚠️  Unreachable scenes: ${unreachableScenes.join(', ')}`);
        } else {
          console.log(`   ✅ All scenes are reachable`);
        }
        
        // Check for scenes that reference non-existent scenes
        const missingSceneRefs: string[] = [];
        Object.entries(scenes).forEach(([sceneId, scene]) => {
          if (scene.leads_to) {
            Object.keys(scene.leads_to).forEach(targetScene => {
              if (!scenes[targetScene]) {
                missingSceneRefs.push(`${sceneId} -> ${targetScene}`);
              }
            });
          }
        });
        
        if (missingSceneRefs.length > 0) {
          console.log(`   ❌ Missing scene references: ${missingSceneRefs.join(', ')}`);
        } else {
          console.log(`   ✅ All scene references are valid`);
        }
      }
      
      // Check for unused locations
      if (result.story.world?.locations) {
        console.log(`\n📍 Location Usage Check:`);
        const locations = result.story.world.locations;
        const usedLocations = new Set<string>();
        
        // Check scene locations
        Object.values(scenes).forEach(scene => {
          if (scene.location) usedLocations.add(scene.location);
        });
        
        // Check item locations
        if (result.story.world.items) {
          Object.values(result.story.world.items).forEach(item => {
            if (item.found_in) {
              const locs = Array.isArray(item.found_in) ? item.found_in : [item.found_in];
              locs.forEach(loc => usedLocations.add(loc));
            }
          });
        }
        
        const unusedLocations = Object.keys(locations).filter(id => !usedLocations.has(id));
        if (unusedLocations.length > 0) {
          console.log(`   ⚠️  Unused locations: ${unusedLocations.join(', ')}`);
        } else {
          console.log(`   ✅ All locations are used`);
        }
      }
      
      console.log(`\n🎉 Validation complete!`);
    } else {
      console.log(`\n❌ Story could not be parsed`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ Validation failed:`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`Usage: tsx scripts/validate-impressionist-story.ts <story-file.yaml>`);
  console.log(`Example: tsx scripts/validate-impressionist-story.ts examples/the_final_word.yaml`);
  process.exit(1);
}

const filePath = args[0];
validateStory(filePath);