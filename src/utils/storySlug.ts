/**
 * Utility functions for converting between story filenames and URL slugs
 */

/**
 * Convert a story filename to a URL-friendly slug
 * @param filename - Story filename (e.g. "friday_night_rain.yaml")
 * @returns URL slug (e.g. "friday-night-rain")
 */
export function filenameToSlug(filename: string): string {
  return filename
    .replace('.yaml', '') // Remove extension
    .replace(/_/g, '-')   // Replace underscores with hyphens
    .toLowerCase()
}

/**
 * Convert a URL slug back to a story filename
 * @param slug - URL slug (e.g. "friday-night-rain")
 * @returns Story filename (e.g. "friday_night_rain.yaml")
 */
export function slugToFilename(slug: string): string {
  return slug
    .replace(/-/g, '_')   // Replace hyphens with underscores
    .toLowerCase() + '.yaml'
}

/**
 * Validate that a slug corresponds to a valid story filename format
 * @param slug - URL slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidStorySlug(slug: string): boolean {
  // Check basic format: only lowercase letters, numbers, and hyphens
  const validFormat = /^[a-z0-9-]+$/.test(slug)
  
  // Check that it doesn't start or end with hyphens
  const validBoundaries = !slug.startsWith('-') && !slug.endsWith('-')
  
  // Check reasonable length
  const validLength = slug.length >= 1 && slug.length <= 100
  
  return validFormat && validBoundaries && validLength
}

/**
 * Create a story URL from a slug
 * @param slug - Story slug
 * @returns Full story URL path
 */
export function getStoryUrl(slug: string): string {
  return `/stories/${slug}`
}

/**
 * Extract story slug from a story URL path
 * @param path - URL path (e.g. "/stories/friday-night-rain")
 * @returns Story slug or null if not a valid story path
 */
export function extractSlugFromPath(path: string): string | null {
  const match = path.match(/^\/stories\/([a-z0-9-]+)$/)
  return match ? match[1] : null
}