/**
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

export const STORY_METADATA: StoryMetadata[] = [
  {
    "filename": "corridor_of_mirrors.yaml",
    "title": "The Corridor of Mirrors",
    "author": "Iffy Engine Team",
    "blurb": "Navigate five rooms where reality bends through different narrative lenses."
  },
  {
    "filename": "friday_night_rain.yaml",
    "title": "Friday Night Rain",
    "author": "Iffy Collective",
    "blurb": "The space between words grows heavier with each passing Friday."
  },
  {
    "filename": "restaurant_catastrophe.yaml",
    "title": "The Great Sandwich Catastrophe",
    "author": "Iffy Engine Team",
    "blurb": "Jennifer's EPIC SANDWICH MASTERY faces its most DEVASTATING professional challenge!"
  },
  {
    "filename": "sandwich_crisis.yaml",
    "title": "The Great Sandwich Crisis",
    "author": "Iffy Engine Team",
    "blurb": "Experience the EPIC DRAMA of making lunch - will you survive the kitchen?"
  },
  {
    "filename": "sentient_quill.yaml",
    "title": "The Peculiar Case of the Sentient Quill",
    "author": "Iffy Engine Team",
    "blurb": "Solve a murder in gaslit London with an impossible AI companion."
  },
  {
    "filename": "test_conditions.yaml",
    "title": "Security Access Terminal",
    "author": "Iffy Engine Team",
    "blurb": "A test story designed to verify ending condition enforcement using a password system."
  },
  {
    "filename": "the_final_word_v2.yaml",
    "title": "The Final Word v2",
    "author": "Iffy Collective",
    "blurb": "Run an underground bookstore where literature lives dangerously"
  },
  {
    "filename": "the_key.yaml",
    "title": "The Key",
    "author": "Iffy Engine Team",
    "blurb": "A simple puzzle about getting through a locked door."
  },
  {
    "filename": "winter_light.yaml",
    "title": "Winter Light",
    "author": "Iffy Engine Team",
    "blurb": "A chess prodigy confronts the silence between moves in post-war Germany"
  }
];

/**
 * Dynamically load a story's content from the public/stories directory
 */
export async function loadStoryContent(filename: string): Promise<string> {
  const base = import.meta.env.BASE_URL || '/';
  const response = await fetch(`${base}stories/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load story: ${filename}`);
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
