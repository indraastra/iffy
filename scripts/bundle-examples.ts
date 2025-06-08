#!/usr/bin/env tsx
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { StoryParser, StoryParseError } from '../src/engine/storyParser';

interface ExampleStory {
  filename: string;
  title: string;
  author: string;
  blurb: string;
  content: string;
}

/**
 * Build script to bundle example stories into the app for easy playtesting
 * Validates all stories and fails the build if any are invalid
 */
function bundleExampleStories() {
  const examplesDir = resolve(__dirname, '../examples');
  const outputPath = resolve(__dirname, '../src/bundled-examples.ts');
  
  console.log('🔍 Discovering and validating example stories...');
  
  // Read all YAML files from examples directory
  const files = readdirSync(examplesDir).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
  
  if (files.length === 0) {
    console.warn('⚠️  No example story files found in examples/ directory');
    return;
  }
  
  const stories: ExampleStory[] = [];
  let validationErrors = 0;
  
  for (const file of files) {
    const filePath = join(examplesDir, file);
    
    try {
      console.log(`📖 Processing ${file}...`);
      const content = readFileSync(filePath, 'utf-8');
      
      // Validate the story using the same parser as the app
      console.log(`🔍 Validating ${file}...`);
      const story = StoryParser.parseFromYaml(content);
      
      // Extract metadata for display
      const title = story.title || file.replace(/\.(yaml|yml)$/, '');
      const author = story.author || 'Unknown';
      
      // Use blurb if available, otherwise generate from title and metadata
      let blurb = story.blurb;
      if (!blurb) {
        blurb = title;
        if (story.metadata?.setting?.place) {
          blurb += ` - ${story.metadata.setting.place}`;
        }
      }
      
      stories.push({
        filename: file,
        title,
        author,
        blurb,
        content
      });
      
      console.log(`✅ ${file} validated successfully`);
      
    } catch (error) {
      validationErrors++;
      console.error(`❌ ${file} failed validation:`);
      
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
    }
  }
  
  // Fail the build if any stories failed validation
  if (validationErrors > 0) {
    console.error(`\n💥 Build failed: ${validationErrors} story file(s) failed validation`);
    console.error('Fix the validation errors above before proceeding with the build.');
    process.exit(1);
  }
  
  if (stories.length === 0) {
    console.error('💥 Build failed: No valid example stories found');
    process.exit(1);
  }
  
  // Generate TypeScript module
  const moduleContent = `/**
 * Bundled example stories for easy playtesting
 * Generated automatically by scripts/bundle-examples.ts
 * DO NOT EDIT MANUALLY - Regenerate with: npm run bundle-examples
 */

export interface BundledStory {
  filename: string;
  title: string;
  author: string;
  blurb: string;
  content: string;
}

export const BUNDLED_STORIES: BundledStory[] = ${JSON.stringify(stories, null, 2)};

export function getBundledStory(filename: string): BundledStory | undefined {
  return BUNDLED_STORIES.find(story => story.filename === filename);
}

export function getBundledStoryTitles(): Array<{filename: string, title: string, author: string, blurb: string}> {
  return BUNDLED_STORIES.map(story => ({
    filename: story.filename,
    title: story.title,
    author: story.author,
    blurb: story.blurb
  }));
}
`;

  writeFileSync(outputPath, moduleContent, 'utf-8');
  
  console.log(`\n🎉 Successfully bundled ${stories.length} example stories:`);
  stories.forEach(story => {
    console.log(`   ✅ ${story.title} by ${story.author} (${story.filename})`);
  });
  
  console.log(`\n📦 Bundle written to: ${outputPath}`);
}

// Run the script
if (require.main === module) {
  bundleExampleStories();
}