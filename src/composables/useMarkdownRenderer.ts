import type { FormatterRule } from '@/types/impressionistStory'
import { usePostProcessor } from './usePostProcessor'

// Custom markup patterns (similar to original system)
const customPatterns = {
  character: /\[([^\]]*)\]\(character:([^)]*)\)/g,
  item: /\[([^\]]*)\]\(item:([^)]*)\)/g,
  location: /\[([^\]]*)\]\(location:([^)]*)\)/g,
  alert: /\[!(warning|discovery|danger)\]\s*(.*?)(?=\n\n|\n$|$)/g,
}

export function useMarkdownRenderer() {
  const { applyFormatters } = usePostProcessor()

  function renderMarkup(content: string | string[], formatters: FormatterRule[] = []): string {
    try {
      // Handle both string and array inputs for backward compatibility
      const narrativeParts = Array.isArray(content) ? content : [content]
      
      // Step 1: Apply formatters to each narrative element individually
      const formattedParts = narrativeParts.map((part) => {
        return applyFormatters(part, formatters)
      })
      
      // Step 2: Join formatted parts back together
      let processed = formattedParts.join('\n\n')

      // Step 3: Process alerts (they can span multiple lines, so apply to full text)
      processed = processed.replace(customPatterns.alert, (_match, type, text) => {
        const processedText = processInlineMarkdown(text)
        return `<div class="markup-alert markup-alert--${type}">${processedText}</div>`
      })

      // Step 4: Process character references
      processed = processed.replace(customPatterns.character, (_match, name, id) => {
        const characterType = id === 'player' ? 'player' : 'npc'
        return `<span class="markup-character markup-character--${characterType}" data-character-id="${escapeAttribute(id)}" onclick="handleCharacterClick('${escapeAttribute(id)}')">${escapeHtml(name)}</span>`
      })

      // Step 5: Process item references
      processed = processed.replace(customPatterns.item, (_match, text, id) => {
        return `<span class="markup-item" data-item-id="${escapeAttribute(id)}" onclick="handleItemClick('${escapeAttribute(id)}')">${escapeHtml(text)}</span>`
      })

      // Step 6: Process location references
      processed = processed.replace(customPatterns.location, (_match, text, id) => {
        return `<span class="markup-location" data-location-id="${escapeAttribute(id)}" onclick="handleLocationClick('${escapeAttribute(id)}')">${escapeHtml(text)}</span>`
      })

      // Step 7: Process inline markdown
      processed = processInlineMarkdown(processed)

      // Step 8: Handle paragraphs and line breaks
      processed = processTextStructure(processed)

      // Step 9: Apply automatic styling enhancements (carefully)
      processed = applyAutomaticStyling(processed)

      return processed
    } catch (error) {
      console.error('Markdown rendering error:', error)
      // Fallback to basic HTML escaping
      const fallbackContent = Array.isArray(content) ? content.join('\n\n') : content
      return `<p>${escapeHtml(fallbackContent)}</p>`
    }
  }

  function processInlineMarkdown(text: string): string {
    let processed = text

    // Headings (process first before other formatting)
    processed = processed.replace(/^# (.+)$/gm, '<h1 class="markup-heading">$1</h1>')
    processed = processed.replace(/^### (.+)$/gm, '<h3 class="markup-subheading">$1</h3>')

    // Bold text (process before italic to avoid conflicts)
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="markup-bold">$1</strong>')

    // Italic text
    processed = processed.replace(/\*(.*?)\*/g, '<em class="markup-italic">$1</em>')

    return processed
  }

  function processTextStructure(html: string): string {
    let processed = html

    // Convert line breaks to HTML
    processed = processed.replace(/\n\n/g, '</p><p>')
    processed = processed.replace(/\n/g, '<br>')
    
    // Wrap in paragraphs if not already wrapped
    if (!processed.startsWith('<div class="markup-alert') && !processed.startsWith('<h1') && !processed.startsWith('<h3') && !processed.startsWith('<p>')) {
      processed = `<p>${processed}</p>`
    }

    return processed
  }

  function applyAutomaticStyling(html: string): string {
    let styled = html

    // Automatic styling for quoted speech - but avoid HTML attributes
    // Only match quotes that are not inside HTML tags
    styled = styled.replace(/"([^"<>]+)"(?![^<]*>)/g, '<span class="markup-speech">"$1"</span>')
    
    // Automatic styling for ALL CAPS words (3+ letters, avoid HTML tags)
    // Only match caps that are not inside HTML tags
    styled = styled.replace(/(?<![<\w])\b[A-Z]{3,}\b(?![^<]*>)/g, '<span class="markup-emphasis">$&</span>')
    
    // Automatic styling for timestamps (HH:MM format)
    // Only match timestamps that are not inside HTML tags
    styled = styled.replace(/\b\d{1,2}:\d{2}\s*(AM|PM)?\b(?![^<]*>)/gi, '<span class="markup-timestamp">$&</span>')
    
    return styled
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  function escapeAttribute(text: string): string {
    return text.replace(/'/g, '&#x27;').replace(/"/g, '&quot;')
  }

  return {
    renderMarkup
  }
}

// Global click handlers for markup interactions (same as original)
declare global {
  interface Window {
    handleCharacterClick: (id: string) => void
    handleItemClick: (id: string) => void
    handleLocationClick: (id: string) => void
  }
}

// Set up global click handlers
if (typeof window !== 'undefined') {
  window.handleCharacterClick = (id: string) => {
    console.log('🎭 Character clicked:', id)
    // TODO: Show character details modal
  }

  window.handleItemClick = (id: string) => {
    console.log('📦 Item clicked:', id)
    // TODO: Show item details modal or examine item
  }

  window.handleLocationClick = (id: string) => {
    console.log('🗺️ Location clicked:', id)
    // TODO: Show location details or navigate
  }
}

