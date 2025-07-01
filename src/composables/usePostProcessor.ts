import type { FormatterRule, FormatterReplacement } from '@/types/impressionistStory'

export function usePostProcessor() {
  
  /**
   * Apply story-specific formatting rules to rendered HTML
   */
  function applyFormatters(html: string, formatters: FormatterRule[] = []): string {
    if (!formatters.length) {
      return html
    }

    // Sort formatters by priority (higher first)
    const sortedFormatters = [...formatters].sort((a, b) => (b.priority || 0) - (a.priority || 0))

    let processed = html

    for (const formatter of sortedFormatters) {
      try {
        processed = applyFormatter(processed, formatter)
      } catch (error) {
        console.warn(`Error applying formatter "${formatter.name}":`, error)
        // Continue with other formatters if one fails
      }
    }

    return processed
  }

  /**
   * Apply a single formatter rule to HTML content
   */
  function applyFormatter(html: string, formatter: FormatterRule): string {
    const { pattern, replacements = [], applyTo = 'groups' } = formatter
    
    // Create regex from pattern string
    const regex = new RegExp(pattern, 'gm')
    
    return html.replace(regex, (match, ...groups) => {
      if (applyTo === 'full') {
        // Apply styling to the entire match
        return applyReplacements(match, replacements, { match, groups })
      } else {
        // Apply styling to individual capture groups
        return processGroups(match, groups, replacements)
      }
    })
  }

  /**
   * Process capture groups with individual styling
   */
  function processGroups(originalMatch: string, groups: string[], replacements: FormatterReplacement[]): string {
    let result = originalMatch

    // Sort replacements by target (process numbered groups first, then 'match')
    const sortedReplacements = [...replacements].sort((a, b) => {
      if (typeof a.target === 'number' && typeof b.target === 'number') {
        return a.target - b.target
      }
      if (typeof a.target === 'number') return -1
      if (typeof b.target === 'number') return 1
      return 0
    })

    for (const replacement of sortedReplacements) {
      const { target } = replacement

      if (target === 'match') {
        // Apply to the entire match
        result = applyReplacements(result, [replacement], { match: originalMatch, groups })
      } else if (typeof target === 'number' && groups[target - 1] !== undefined) {
        // Apply to specific capture group (1-indexed)
        const groupContent = groups[target - 1]
        const styledGroup = applyReplacements(groupContent, [replacement], { match: originalMatch, groups })
        
        // Replace the group content in the result
        result = result.replace(groupContent, styledGroup)
      }
    }

    return result
  }

  /**
   * Apply replacement styling to content
   */
  function applyReplacements(
    content: string, 
    replacements: FormatterReplacement[], 
    context: { match: string; groups: string[] }
  ): string {
    let styled = content

    for (const replacement of replacements) {
      const { wrapWith, className, style, attributes = {} } = replacement
      
      // Build attributes string
      const attrs: string[] = []
      
      if (className) {
        attrs.push(`class="${escapeAttribute(className)}"`)
      }
      
      if (style) {
        attrs.push(`style="${escapeAttribute(style)}"`)
      }
      
      // Add custom attributes
      for (const [key, value] of Object.entries(attributes)) {
        // Support dynamic values using template strings
        const processedValue = processDynamicValue(value, context)
        attrs.push(`${escapeAttribute(key)}="${escapeAttribute(processedValue)}"`)
      }
      
      const attrString = attrs.length > 0 ? ` ${attrs.join(' ')}` : ''
      styled = `<${wrapWith}${attrString}>${styled}</${wrapWith}>`
    }

    return styled
  }

  /**
   * Process dynamic values in attributes (e.g., "color-{group1}")
   */
  function processDynamicValue(value: string, context: { match: string; groups: string[] }): string {
    let processed = value

    // Replace {match} with full match
    processed = processed.replace(/\{match\}/g, context.match)

    // Replace {group1}, {group2}, etc. with capture groups
    processed = processed.replace(/\{group(\d+)\}/g, (_, groupNum) => {
      const index = parseInt(groupNum) - 1
      return context.groups[index] || ''
    })

    return processed
  }

  /**
   * Escape HTML attributes
   */
  function escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  return {
    applyFormatters,
    applyFormatter
  }
}