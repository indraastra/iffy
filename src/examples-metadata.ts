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
  slug: string;
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
    "filename": "friday_night_rain.yaml",
    "title": "Friday Night Rain",
    "author": "Iffy Collective",
    "blurb": "The space between words grows heavier with each passing Friday.",
    "slug": "friday-night-rain"
  },
  {
    "filename": "intermission.yaml",
    "title": "Intermission",
    "author": "Iffy Collective",
    "blurb": "Three months of silence, broken by a chance encounter.",
    "slug": "intermission"
  },
  {
    "filename": "intermission_side_a.yaml",
    "title": "Intermission: Side A",
    "author": "Iffy Collective",
    "blurb": "Three months of silence, broken by a chance encounter.",
    "slug": "intermission-side-a"
  },
  {
    "filename": "intermission_side_b.yaml",
    "title": "Intermission: Side B",
    "author": "Iffy Collective",
    "blurb": "Three months of silence, broken by a chance encounter.",
    "slug": "intermission-side-b"
  },
  {
    "filename": "transition_test.yaml",
    "title": "Transition Test",
    "author": "Test",
    "blurb": "Testing flag-based story endings",
    "slug": "transition-test"
  }
];

// All stories including unlisted ones (for direct access by slug/filename)
const ALL_STORY_METADATA: StoryMetadata[] = [
  {
    "filename": "friday_night_rain.yaml",
    "title": "Friday Night Rain",
    "author": "Iffy Collective",
    "blurb": "The space between words grows heavier with each passing Friday.",
    "slug": "friday-night-rain"
  },
  {
    "filename": "intermission.yaml",
    "title": "Intermission",
    "author": "Iffy Collective",
    "blurb": "Three months of silence, broken by a chance encounter.",
    "slug": "intermission"
  },
  {
    "filename": "intermission_side_a.yaml",
    "title": "Intermission: Side A",
    "author": "Iffy Collective",
    "blurb": "Three months of silence, broken by a chance encounter.",
    "slug": "intermission-side-a"
  },
  {
    "filename": "intermission_side_b.yaml",
    "title": "Intermission: Side B",
    "author": "Iffy Collective",
    "blurb": "Three months of silence, broken by a chance encounter.",
    "slug": "intermission-side-b"
  },
  {
    "filename": "transition_test.yaml",
    "title": "Transition Test",
    "author": "Test",
    "blurb": "Testing flag-based story endings",
    "slug": "transition-test"
  },
  {
    "filename": "before_the_journey_a.yaml",
    "title": "Before the Journey - Side A: The Departure",
    "author": "Iffy Collective",
    "blurb": "Two hours until the overnight express departs. Your friend drove you to the station, and now you're both sitting in Track Nine Café, watching your train wait on Platform 3. Everything you've been through led to this moment - but is leaving still the right choice?",
    "slug": "before-the-journey-a"
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
 * Load a complete story with content (including unlisted stories)
 */
export async function loadStory(filename: string): Promise<BundledStory | undefined> {
  const meta = ALL_STORY_METADATA.find(story => story.filename === filename);
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
  // Check all stories including unlisted ones
  return ALL_STORY_METADATA.find(story => story.filename === filename);
}

export function getStoryMetadataBySlug(slug: string): StoryMetadata | undefined {
  // Check all stories including unlisted ones
  return ALL_STORY_METADATA.find(story => story.slug === slug);
}

export async function loadStoryBySlug(slug: string): Promise<BundledStory | undefined> {
  const meta = getStoryMetadataBySlug(slug);
  if (!meta) {
    return undefined;
  }
  
  const content = await loadStoryContent(meta.filename);
  return {
    ...meta,
    content
  };
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
