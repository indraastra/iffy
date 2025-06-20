#!/usr/bin/env tsx
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { ImpressionistParser } from '../src/engine/impressionistParser';

interface ExampleStory {
  filename: string;
  title: string;
  author: string;
  blurb: string;
  content: string;
}

interface StoryMetadata {
  filename: string;
  title: string;
  author: string;
  blurb: string;
}

/**
 * Build script to validate stories and generate metadata for the app
 * Validates all stories in public/stories and generates metadata
 */
function bundleExampleStories() {
  const storiesDir = resolve(__dirname, '../public/stories');
  const metadataOutputPath = resolve(__dirname, '../src/examples-metadata.ts');
  
  console.log('🔍 Discovering and validating example stories...');
  
  // Read all YAML files from public/stories directory
  const files = readdirSync(storiesDir).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
  
  if (files.length === 0) {
    console.warn('⚠️  No story files found in public/stories/ directory');
    return;
  }
  
  const stories: ExampleStory[] = [];
  const metadata: StoryMetadata[] = [];
  let validationErrors = 0;
  
  for (const file of files) {
    const filePath = join(storiesDir, file);
    
    try {
      console.log(`📖 Processing ${file}...`);
      const content = readFileSync(filePath, 'utf-8');
      
      // Validate the story using the impressionist parser
      console.log(`🔍 Validating ${file}...`);
      const parser = new ImpressionistParser();
      const result = parser.parseFromYaml(content);
      
      if (!result.story) {
        throw new Error(result.errors.join(', '));
      }
      
      const story = result.story;
      
      // Extract metadata for display
      const title = story.title || file.replace(/\.(yaml|yml)$/, '');
      const author = story.author || 'Unknown';
      
      // Use blurb if available, otherwise generate from title
      const blurb = story.blurb || title;
      
      // Add to full stories array (for legacy compatibility)
      stories.push({
        filename: file,
        title,
        author,
        blurb,
        content
      });
      
      // Add to metadata array
      metadata.push({
        filename: file,
        title,
        author,
        blurb
      });
      
      // Stories are already in public/stories - no need to copy
      
      console.log(`✅ ${file} validated successfully`);
      
    } catch (error) {
      validationErrors++;
      console.error(`❌ ${file} failed validation:`);
      
      if (error instanceof Error) {
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
  
  // Generate metadata TypeScript module
  const metadataModuleContent = `/**
 * Story metadata for dynamic loading
 * Generated automatically by scripts/bundle-examples.ts
 * DO NOT EDIT MANUALLY - Regenerate with: npm run bundle-examples
 */

export interface StoryMetadata {
  filename: string;
  title: string;
  author: string;
  blurb: string;
}

export interface BundledStory {
  filename: string;
  title: string;
  author: string;
  blurb: string;
  content: string;
}

export const STORY_METADATA: StoryMetadata[] = ${JSON.stringify(metadata, null, 2)};

/**
 * Dynamically load a story's content from the public/stories directory
 */
export async function loadStoryContent(filename: string): Promise<string> {
  const response = await fetch(\`/stories/\${filename}\`);
  if (!response.ok) {
    throw new Error(\`Failed to load story: \${filename}\`);
  }
  return response.text();
}

/**
 * Load a complete story with content
 */
export async function loadStory(filename: string): Promise<BundledStory | undefined> {
  const meta = STORY_METADATA.find(story => story.filename === filename);
  if (!meta) {
    return undefined;
  }
  
  const content = await loadStoryContent(filename);
  return {
    ...meta,
    content
  };
}

export function getStoryMetadata(): StoryMetadata[] {
  return STORY_METADATA;
}

export function getStoryMetadataByFilename(filename: string): StoryMetadata | undefined {
  return STORY_METADATA.find(story => story.filename === filename);
}

// Legacy compatibility: bundled stories (for dev/testing)
// Only include in development builds to avoid bundle bloat
export const BUNDLED_STORIES: BundledStory[] = [];

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

  writeFileSync(metadataOutputPath, metadataModuleContent, 'utf-8');
  
  console.log(`\n🎉 Successfully validated ${stories.length} example stories:`);
  stories.forEach(story => {
    console.log(`   ✅ ${story.title} by ${story.author} (${story.filename})`);
  });
  
  console.log(`\n📦 Metadata written to: ${metadataOutputPath}`);
  console.log(`📁 Story files available in: ${storiesDir}`);
}

// Run the script
if (require.main === module) {
  bundleExampleStories();
}