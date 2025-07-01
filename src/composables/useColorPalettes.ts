import type { GameTheme } from '@/types/theme'

/**
 * Color palette generator for stories
 * 
 * Generates theme-appropriate color palettes for different purposes:
 * - distinct: Maximally different colors for categories/characters
 * - sequential: Ordered progression for rankings/intensity
 * - warm: Warm colors (reds, oranges, yellows) for energy themes
 * - cool: Cool colors (blues, greens, purples) for calm themes
 * - neutral: Subdued colors for UI elements
 * - accent: Emphasis colors for highlights
 */

export function useColorPalettes() {
  
  function generatePalette(type: string, count: number, theme: GameTheme): string[] {
    switch (type) {
      case 'distinct':
        return generateDistinctColors(count, theme)
      case 'sequential':
        return generateSequentialColors(count, theme)
      case 'warm':
        return generateWarmColors(count, theme)
      case 'cool':
        return generateCoolColors(count, theme)
      case 'neutral':
        return generateNeutralColors(count, theme)
      case 'accent':
        return generateAccentColors(count, theme)
      default:
        console.warn(`Unknown palette type: ${type}, falling back to distinct`)
        return generateDistinctColors(count, theme)
    }
  }

  function generateDistinctColors(count: number, theme: GameTheme): string[] {
    // Pool of maximally different colors from the theme
    const colorPool = [
      theme.colors.accent,
      theme.colors.markup.character.npc,
      theme.colors.markup.item.primary,
      theme.colors.markup.location.primary,
      theme.colors.markup.alerts.warning.border,
      theme.colors.markup.alerts.discovery.border,
      theme.colors.markup.character.player,
      theme.colors.markup.item.interactive,
      theme.colors.markup.location.current,
      theme.colors.markup.alerts.danger.border,
      theme.colors.secondary,
      theme.colors.markup.item.important,
      theme.colors.markup.location.accessible,
    ]

    // Remove duplicates and ensure we have enough colors
    const uniqueColors = Array.from(new Set(colorPool))
    
    // If we need more colors than available, generate variations
    if (count > uniqueColors.length) {
      return generateColorVariations(uniqueColors, count, theme)
    }

    return uniqueColors.slice(0, count)
  }

  function generateSequentialColors(count: number, theme: GameTheme): string[] {
    // Create a progression from secondary to accent
    const baseColor = theme.colors.accent
    const endColor = theme.colors.secondary
    
    if (count === 1) {
      return [baseColor]
    }

    // Generate interpolated colors between base and end
    return interpolateColors(baseColor, endColor, count)
  }

  function generateWarmColors(count: number, theme: GameTheme): string[] {
    // Prefer warm colors from the theme
    const warmPool = [
      theme.colors.markup.alerts.warning.border,  // Usually orange/amber
      theme.colors.markup.alerts.danger.border,   // Usually red
      theme.colors.markup.item.important,         // Often warm
      theme.colors.accent, // Include accent if it's warm-leaning
    ].filter(color => isWarmColor(color))

    // If theme doesn't have many warm colors, add accent and variations
    if (warmPool.length < count) {
      warmPool.push(theme.colors.accent)
      warmPool.push(theme.colors.markup.character.player)
    }

    return warmPool.slice(0, count)
  }

  function generateCoolColors(count: number, theme: GameTheme): string[] {
    // Prefer cool colors from the theme
    const coolPool = [
      theme.colors.markup.location.primary,       // Usually blue/teal
      theme.colors.markup.character.player,       // Often blue
      theme.colors.markup.alerts.discovery.border, // Usually blue/green
      theme.colors.secondary,
      theme.colors.accent, // Include accent if it's cool-leaning
    ].filter(color => isCoolColor(color))

    // If theme doesn't have many cool colors, add more options
    if (coolPool.length < count) {
      coolPool.push(theme.colors.markup.character.npc)
      coolPool.push(theme.colors.markup.item.primary)
    }

    return coolPool.slice(0, count)
  }

  function generateNeutralColors(count: number, theme: GameTheme): string[] {
    // Use subdued colors from the theme
    const neutralPool = [
      theme.colors.text.secondary,
      theme.colors.markup.character.npc,
      theme.colors.secondary,
      theme.colors.text.primary,
      theme.colors.markup.location.accessible,
    ]

    // Generate lighter/darker variations if needed
    if (count > neutralPool.length) {
      return generateColorVariations(neutralPool, count, theme)
    }

    return neutralPool.slice(0, count)
  }

  function generateAccentColors(count: number, theme: GameTheme): string[] {
    // Start with the main accent and create variations
    const accentBase = theme.colors.accent

    if (count === 1) {
      return [accentBase]
    }

    // Generate variations of the accent color
    return generateColorVariations([accentBase], count, theme)
  }

  function generateColorVariations(baseColors: string[], targetCount: number, _theme: GameTheme): string[] {
    const variations: string[] = []
    
    baseColors.forEach(color => {
      variations.push(color)
      
      // Add lighter and darker variations if we need more colors
      if (variations.length < targetCount) {
        const lighter = lightenColor(color, 0.2)
        const darker = darkenColor(color, 0.2)
        variations.push(lighter, darker)
      }
    })

    return variations.slice(0, targetCount)
  }

  function interpolateColors(startColor: string, endColor: string, count: number): string[] {
    if (count === 1) return [startColor]
    if (count === 2) return [startColor, endColor]

    const colors: string[] = []
    
    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1)
      colors.push(blendColors(startColor, endColor, ratio))
    }

    return colors
  }

  function isWarmColor(color: string): boolean {
    // Simple heuristic - check if hex color leans toward red/orange
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    return r > b && (r > g || g > b * 1.2)
  }

  function isCoolColor(color: string): boolean {
    // Simple heuristic - check if hex color leans toward blue/green
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    return b > r || g > r
  }

  function lightenColor(color: string, amount: number): string {
    // Simple lightening - increase RGB values
    const hex = color.replace('#', '')
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.round(amount * 255))
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.round(amount * 255))
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.round(amount * 255))
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  function darkenColor(color: string, amount: number): string {
    // Simple darkening - decrease RGB values
    const hex = color.replace('#', '')
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(amount * 255))
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(amount * 255))
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(amount * 255))
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  function blendColors(color1: string, color2: string, ratio: number): string {
    // Linear interpolation between two colors
    const hex1 = color1.replace('#', '')
    const hex2 = color2.replace('#', '')
    
    const r1 = parseInt(hex1.substr(0, 2), 16)
    const g1 = parseInt(hex1.substr(2, 2), 16)
    const b1 = parseInt(hex1.substr(4, 2), 16)
    
    const r2 = parseInt(hex2.substr(0, 2), 16)
    const g2 = parseInt(hex2.substr(2, 2), 16)
    const b2 = parseInt(hex2.substr(4, 2), 16)
    
    const r = Math.round(r1 + (r2 - r1) * ratio)
    const g = Math.round(g1 + (g2 - g1) * ratio)
    const b = Math.round(b1 + (b2 - b1) * ratio)
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  return {
    generatePalette
  }
}