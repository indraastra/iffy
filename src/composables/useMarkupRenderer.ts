interface MarkupPatterns {
  character: RegExp
  item: RegExp
  location: RegExp
  bold: RegExp
  italic: RegExp
  alert: RegExp
  heading: RegExp
  subheading: RegExp
}

const markupPatterns: MarkupPatterns = {
  character: /\[([^\]]*)\]\(character:([^)]*)\)/g,
  item: /\[([^\]]*)\]\(item:([^)]*)\)/g,
  location: /\[([^\]]*)\]\(location:([^)]*)\)/g,
  bold: /\*\*(.*?)\*\*/g,
  italic: /\*(.*?)\*/g,
  alert: /\[!(warning|discovery|danger)\]\s*(.*?)(?=\n\n|\n$|$)/g,
  heading: /^# (.+)$/gm,
  subheading: /^### (.+)$/gm
}

export function useMarkupRenderer() {
  function renderMarkup(content: string): string {
    let rendered = content

    // Process alerts first (they can contain other markup)
    rendered = rendered.replace(markupPatterns.alert, (_match, type, text) => {
      const processedText = processInlineMarkup(text)
      return `<div class="markup-alert markup-alert--${type}">${processedText}</div>`
    })

    // Process other markup types
    rendered = processInlineMarkup(rendered)

    // Convert line breaks to HTML
    rendered = rendered.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')
    
    // Wrap in paragraphs if not already wrapped
    if (!rendered.startsWith('<div class="markup-alert') && !rendered.startsWith('<p>')) {
      rendered = `<p>${rendered}</p>`
    }

    return rendered
  }

  function processInlineMarkup(text: string): string {
    let processed = text

    // Headings (process first before other formatting)
    processed = processed.replace(markupPatterns.heading, (_match, text) => {
      return `<h1 class="markup-heading">${escapeHtml(text)}</h1>`
    })

    // Subheadings for bylines
    processed = processed.replace(markupPatterns.subheading, (_match, text) => {
      return `<h3 class="markup-subheading">${escapeHtml(text)}</h3>`
    })

    // STEP 1: Process interactive elements FIRST (before text formatting)
    // Character references
    processed = processed.replace(markupPatterns.character, (_match, name, id) => {
      const characterType = id === 'player' ? 'player' : 'npc'
      return `<span class="markup-character markup-character--${characterType}" data-character-id="${escapeHtml(id)}" onclick="handleCharacterClick('${escapeHtml(id)}')">${escapeHtml(name)}</span>`
    })

    // Item references
    processed = processed.replace(markupPatterns.item, (_match, text, id) => {
      return `<span class="markup-item" data-item-id="${escapeHtml(id)}" onclick="handleItemClick('${escapeHtml(id)}')">${escapeHtml(text)}</span>`
    })

    // Location references
    processed = processed.replace(markupPatterns.location, (_match, text, id) => {
      return `<span class="markup-location" data-location-id="${escapeHtml(id)}" onclick="handleLocationClick('${escapeHtml(id)}')">${escapeHtml(text)}</span>`
    })

    // STEP 2: Process text formatting LAST (so it can wrap around interactive elements)
    // Bold text (process before italic to avoid conflicts)
    processed = processed.replace(markupPatterns.bold, (_match, text) => {
      return `<strong class="markup-bold">${text}</strong>` // Don't escape - may contain HTML spans
    })

    // Italic text
    processed = processed.replace(markupPatterns.italic, (_match, text) => {
      return `<em class="markup-italic">${text}</em>` // Don't escape - may contain HTML spans
    })

    return processed
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  return {
    renderMarkup
  }
}

// Global click handlers for markup interactions
declare global {
  interface Window {
    handleCharacterClick: (id: string) => void
    handleItemClick: (id: string) => void
    handleLocationClick: (id: string) => void
  }
}

// Set up global click handlers
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