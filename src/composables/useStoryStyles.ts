import { computed, watch, onUnmounted } from 'vue'
import type { ImpressionistStory } from '@/types/impressionistStory'
import type { GameTheme } from '@/types/theme'
import { useColorPalettes } from './useColorPalettes'

/**
 * Story-specific styling system
 * 
 * Processes story colorPalette configurations and injects CSS custom properties
 * that can be used by formatters and other story-specific styling.
 */

export function useStoryStyles(story: ImpressionistStory | null, theme: GameTheme) {
  const { generatePalette } = useColorPalettes()
  
  // Generate CSS variables from story's color palette configuration
  const paletteVariables = computed(() => {
    if (!story?.ui?.colorPalette) {
      return {}
    }

    const variables: Record<string, string> = {}
    
    // Process each palette type requested by the story
    for (const [paletteType, count] of Object.entries(story.ui.colorPalette)) {
      if (typeof count !== 'number' || count <= 0) {
        console.warn(`Invalid palette count for ${paletteType}: ${count}`)
        continue
      }

      try {
        const colors = generatePalette(paletteType, count, theme)
        
        // Create CSS variables for each color in the palette
        colors.forEach((color, index) => {
          const varName = `--palette-${paletteType}-${index + 1}`
          variables[varName] = color
        })
      } catch (error) {
        console.error(`Error generating ${paletteType} palette:`, error)
      }
    }

    return variables
  })

  // Combine palette variables with any custom styles from the story
  const allStoryVariables = computed(() => {
    const combined: Record<string, string> = { ...paletteVariables.value }
    
    // Add any custom styles defined in the story
    if (story?.ui?.styles) {
      for (const [key, value] of Object.entries(story.ui.styles)) {
        // Convert story style keys to CSS custom property format
        const cssVar = key.startsWith('--') ? key : `--${key}`
        combined[cssVar] = String(value)
      }
    }

    return combined
  })

  // Inject CSS variables into the DOM
  function injectVariables(variables: Record<string, string>) {
    const root = document.documentElement
    
    // Clear any existing story variables first
    clearStoryVariables()
    
    // Inject new variables
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value)
      // Keep track of what we've set so we can clean up later
      injectedVariables.add(property)
    })
  }

  // Track which variables we've injected so we can clean them up
  const injectedVariables = new Set<string>()

  function clearStoryVariables() {
    const root = document.documentElement
    
    // Remove all previously injected story variables
    injectedVariables.forEach(property => {
      root.style.removeProperty(property)
    })
    
    injectedVariables.clear()
  }

  // Watch for changes and update DOM
  watch(allStoryVariables, (variables) => {
    injectVariables(variables)
  }, { immediate: true })

  // Clean up when component is unmounted or story changes
  onUnmounted(() => {
    clearStoryVariables()
  })

  // Also provide a manual cleanup function
  function cleanup() {
    clearStoryVariables()
  }

  return {
    paletteVariables,
    allStoryVariables,
    cleanup
  }
}

/**
 * Global story style manager
 * 
 * Manages story styles across component boundaries.
 * Ensures only one story's styles are active at a time.
 */

let currentStoryStyleCleanup: (() => void) | null = null

export function setGlobalStoryStyles(story: ImpressionistStory | null, theme: GameTheme) {
  // Clean up previous story's styles
  if (currentStoryStyleCleanup) {
    currentStoryStyleCleanup()
    currentStoryStyleCleanup = null
  }

  // Set up new story's styles
  if (story) {
    const { cleanup } = useStoryStyles(story, theme)
    currentStoryStyleCleanup = cleanup
  }
}

export function clearGlobalStoryStyles() {
  if (currentStoryStyleCleanup) {
    currentStoryStyleCleanup()
    currentStoryStyleCleanup = null
  }
}