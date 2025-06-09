export interface FormattedComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  content: string;
  originalContent?: string; // Store original content for alerts before nested parsing
}

export interface ParsedContent {
  text: string;
  components: FormattedComponent[];
}

export interface RenderContext {
  type: 'narrative' | 'inventory' | 'examine';
  getItem?: (itemId: string) => { name: string; display_name?: string } | undefined;
}

export class RichTextParser {
  private componentIdCounter = 0;
  private parsedContent?: ParsedContent; // Store for nested rendering

  private generateComponentId(): string {
    return `component_${++this.componentIdCounter}`;
  }

  public parseContent(content: string, context?: RenderContext): ParsedContent {
    let parsed = content;
    const components: FormattedComponent[] = [];

    // Define markup patterns
    // Process in order: inline elements first (items/chars), then formatting, then alerts
    const patterns = [
      // Character names with new syntax: [Name](character:id)
      {
        regex: /\[([^\]]+)\]\(character:([^)]+)\)/g,
        type: 'Character',
        extractContent: (match: RegExpMatchArray) => match[1], // Display text
        extractProps: (match: RegExpMatchArray) => ({ characterId: match[2] })
      },

      // Item highlighting with new syntax: [display text](item:id)
      {
        regex: /\[([^\]]+)\]\(item:([^)]+)\)/g,
        type: 'Item',
        extractContent: (match: RegExpMatchArray) => {
          const displayText = match[1];
          const itemId = match[2];
          
          // If context is provided and we can look up the item, use appropriate name
          if (context?.getItem) {
            const item = context.getItem(itemId);
            if (item) {
              // Use display_name for narrative context if available
              if (context.type === 'narrative' && item.display_name) {
                return item.display_name;
              }
              // Otherwise use the item's full name
              return item.name;
            }
          }
          
          // If no context or item not found, use the display text from markup
          return displayText;
        },
        extractProps: (match: RegExpMatchArray) => ({ 
          itemId: match[2],
          markupText: match[1] // Store original markup text
        })
      },

      // Bold text: **text**  
      {
        regex: /\*\*((?:[^*]|\*(?!\*))+)\*\*/g,
        type: 'Bold',
        extractContent: (match: RegExpMatchArray) => match[1],
        processNested: true
      },
      
      // Italic text: *text*
      {
        regex: /\*((?:[^*]|\*{2})+)\*/g,
        type: 'Italic', 
        extractContent: (match: RegExpMatchArray) => match[1],
        processNested: true
      },

      // Alert boxes: [!type] content (until newline or end)
      {
        regex: /\[!(\w+)\]\s*([^\n\r]*)\n?/g,
        type: 'Alert',
        extractContent: (match: RegExpMatchArray) => match[2],
        extractProps: (match: RegExpMatchArray) => ({ alertType: match[1] }),
        processNested: true
      }
    ];

    // Process each pattern
    patterns.forEach(pattern => {
      parsed = parsed.replace(pattern.regex, (fullMatch, ...groups) => {
        const match = [fullMatch, ...groups] as RegExpMatchArray;
        const componentId = this.generateComponentId();
        
        const component: FormattedComponent = {
          id: componentId,
          type: pattern.type,
          content: pattern.extractContent(match),
          props: pattern.extractProps ? pattern.extractProps(match) : {}
        };

        // For components that need nested processing, store original content
        if ((pattern as any).processNested) {
          component.originalContent = pattern.extractContent(match);
        }

        components.push(component);
        return `{{COMPONENT:${componentId}}}`;
      });
    });

    return { text: parsed, components };
  }

  public renderToDOM(parsedContent: ParsedContent, context?: RenderContext): DocumentFragment {
    const { text, components } = parsedContent;
    const fragment = document.createDocumentFragment();
    
    // Store parsedContent for nested rendering
    const prevParsedContent = this.parsedContent;
    this.parsedContent = parsedContent;
    
    // Split text by component placeholders
    const segments = text.split(/\{\{COMPONENT:([^}]+)\}\}/);
    
    // Debug: log if we have component placeholders but no segments
    if (text.includes('{{COMPONENT:') && segments.length === 1) {
      console.error('Rich text split failed!', { text, segments });
    }
    
    for (let i = 0; i < segments.length; i++) {
      if (i % 2 === 0) {
        // Regular text segment
        if (segments[i]) {
          // Check if next segment is a block-level component
          const nextComponentId = (i + 1 < segments.length) ? segments[i + 1] : null;
          const nextComponent = nextComponentId ? components.find(c => c.id === nextComponentId) : null;
          const isNextComponentBlock = nextComponent && nextComponent.type === 'Alert';
          
          // Check if previous segment was a block-level component
          const prevComponentId = (i > 1) ? segments[i - 1] : null;
          const prevComponent = prevComponentId ? components.find(c => c.id === prevComponentId) : null;
          const isPrevComponentBlock = prevComponent && prevComponent.type === 'Alert';
          
          let textContent = segments[i];
          
          // Trim trailing whitespace before block components
          if (isNextComponentBlock) {
            textContent = textContent.replace(/\s+$/, '');
          }
          
          // Trim leading whitespace after block components
          if (isPrevComponentBlock) {
            textContent = textContent.replace(/^\s+/, '');
          }
          
          if (textContent) {
            const lines = textContent.split('\n');
            lines.forEach((line, lineIndex) => {
              if (lineIndex > 0) {
                fragment.appendChild(document.createElement('br'));
              }
              if (line) {
                fragment.appendChild(document.createTextNode(line));
              }
            });
          }
        }
      } else {
        // Component placeholder - segments[i] contains just the component ID due to capture group
        const componentId = segments[i];
        const component = components.find(c => c.id === componentId);
        
        
        if (component) {
          fragment.appendChild(this.createDOMElement(component, context));
        } else {
          // Fallback: if component not found, add the placeholder as text for debugging
          console.warn(`Rich text component not found: ${componentId}`, { availableComponents: components.map(c => c.id) });
          fragment.appendChild(document.createTextNode(`[MISSING:${componentId}]`));
        }
      }
    }

    // Restore previous parsedContent
    this.parsedContent = prevParsedContent;
    return fragment;
  }

  private createDOMElement(component: FormattedComponent, context?: RenderContext): HTMLElement {
    let element: HTMLElement;
    
    switch (component.type) {
      case 'Bold':
        element = document.createElement('strong');
        element.className = 'rich-bold';
        // The content has placeholders, so we need to render it with the same components
        if (this.parsedContent) {
          const boldFragment = this.renderToDOM({ text: component.content, components: this.parsedContent.components }, context);
          element.appendChild(boldFragment);
        } else {
          element.textContent = component.content;
        }
        break;
        
      case 'Italic':
        element = document.createElement('em');
        element.className = 'rich-italic';
        // The content has placeholders, so we need to render it with the same components
        if (this.parsedContent) {
          const italicFragment = this.renderToDOM({ text: component.content, components: this.parsedContent.components }, context);
          element.appendChild(italicFragment);
        } else {
          element.textContent = component.content;
        }
        break;
        
      case 'Character':
        element = document.createElement('span');
        element.className = 'rich-character clickable-element';
        element.textContent = component.content;
        // Use the display text for clicking, not the ID
        element.setAttribute('data-clickable-text', component.content);
        element.setAttribute('title', `Click to append "${component.content}" to your command`);
        element.style.cursor = 'pointer';
        break;
        
      case 'Item':
        element = document.createElement('span');
        element.className = 'rich-item clickable-element';
        element.textContent = component.content;
        // Use the display text for clicking, not the ID
        element.setAttribute('data-clickable-text', component.content);
        element.setAttribute('title', `Click to append "${component.content}" to your command`);
        element.style.cursor = 'pointer';
        break;
        
      case 'Alert':
        element = document.createElement('div');
        element.className = `rich-alert rich-alert-${component.props.alertType}`;
        
        // Create icon span with CSS-based icon
        const iconSpan = document.createElement('span');
        iconSpan.className = `rich-alert-icon alert-icon-${component.props.alertType}`;
        
        // Create content span
        const contentSpan = document.createElement('span');
        contentSpan.className = 'rich-alert-content';
        
        // The content has placeholders, so we need to render it with the same components
        if (this.parsedContent) {
          const alertFragment = this.renderToDOM({ text: component.content, components: this.parsedContent.components }, context);
          contentSpan.appendChild(alertFragment);
        } else {
          contentSpan.textContent = component.content;
        }
        
        element.appendChild(iconSpan);
        element.appendChild(contentSpan);
        break;
        
      default:
        element = document.createElement('span');
        element.textContent = component.content;
        break;
    }

    return element;
  }


  // Convenience method that parses and renders in one step
  public renderContent(content: string, context?: RenderContext): DocumentFragment {
    const parsed = this.parseContent(content, context);
    return this.renderToDOM(parsed);
  }
}

// Export singleton instance
export const richTextParser = new RichTextParser();