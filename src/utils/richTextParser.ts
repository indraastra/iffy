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

export class RichTextParser {
  private componentIdCounter = 0;

  private generateComponentId(): string {
    return `component_${++this.componentIdCounter}`;
  }

  public parseContent(content: string): ParsedContent {
    let parsed = content;
    const components: FormattedComponent[] = [];

    // Define markup patterns for Phase 1
    // IMPORTANT: Process alerts FIRST before nested components get replaced
    const patterns = [
      // Alert boxes: [!type] content (until newline or end)
      {
        regex: /\[!(\w+)\]\s*([^\n\r]*)\n?/g,
        type: 'Alert',
        extractContent: (match: RegExpMatchArray) => match[2],
        extractProps: (match: RegExpMatchArray) => ({ alertType: match[1] }),
        storeOriginal: true
      },

      // Bold text: **text**
      {
        regex: /\*\*((?:[^*]|\*(?!\*))+)\*\*/g,
        type: 'Bold',
        extractContent: (match: RegExpMatchArray) => match[1]
      },
      
      // Italic text: *text*
      {
        regex: /\*((?:[^*]|\*{2})+)\*/g,
        type: 'Italic', 
        extractContent: (match: RegExpMatchArray) => match[1]
      },

      // Character names: [character:Name]
      {
        regex: /\[character:([^\]]+)\]/g,
        type: 'Character',
        extractContent: (match: RegExpMatchArray) => match[1]
      },

      // Item highlighting: [item:ItemName]
      {
        regex: /\[item:([^\]]+)\]/g,
        type: 'Item',
        extractContent: (match: RegExpMatchArray) => match[1]
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

        // For alerts, store the original content before any component replacement
        if ((pattern as any).storeOriginal) {
          component.originalContent = pattern.extractContent(match);
        }

        components.push(component);
        return `{{COMPONENT:${componentId}}}`;
      });
    });

    return { text: parsed, components };
  }

  public renderToDOM(parsedContent: ParsedContent): DocumentFragment {
    const { text, components } = parsedContent;
    const fragment = document.createDocumentFragment();
    
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
          fragment.appendChild(this.createDOMElement(component));
        } else {
          // Fallback: if component not found, add the placeholder as text for debugging
          console.warn(`Rich text component not found: ${componentId}`, { availableComponents: components.map(c => c.id) });
          fragment.appendChild(document.createTextNode(`[MISSING:${componentId}]`));
        }
      }
    }

    return fragment;
  }

  private createDOMElement(component: FormattedComponent): HTMLElement {
    let element: HTMLElement;
    
    switch (component.type) {
      case 'Bold':
        element = document.createElement('strong');
        element.className = 'rich-bold';
        element.textContent = component.content;
        break;
        
      case 'Italic':
        element = document.createElement('em');
        element.className = 'rich-italic';
        element.textContent = component.content;
        break;
        
      case 'Character':
        element = document.createElement('span');
        element.className = 'rich-character';
        element.textContent = component.content;
        break;
        
      case 'Item':
        element = document.createElement('span');
        element.className = 'rich-item';
        element.textContent = component.content;
        break;
        
      case 'Alert':
        element = document.createElement('div');
        element.className = `rich-alert rich-alert-${component.props.alertType}`;
        
        // Create icon span
        const iconSpan = document.createElement('span');
        iconSpan.className = 'rich-alert-icon';
        iconSpan.textContent = this.getAlertIcon(component.props.alertType);
        
        // Create content span
        const contentSpan = document.createElement('span');
        contentSpan.className = 'rich-alert-content';
        
        // For alert content, we need to parse it as rich text but with a fresh parser
        // to avoid component ID conflicts. Use originalContent if available.
        const alertParser = new RichTextParser();
        const contentToRender = component.originalContent || component.content;
        const alertFragment = alertParser.renderContent(contentToRender);
        contentSpan.appendChild(alertFragment);
        
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

  private getAlertIcon(alertType: string): string {
    switch (alertType) {
      case 'warning':
        return '⚠️';
      case 'discovery':
        return '✨';
      case 'danger':
        return '🚨';
      default:
        return '📝';
    }
  }

  // Convenience method that parses and renders in one step
  public renderContent(content: string): DocumentFragment {
    const parsed = this.parseContent(content);
    return this.renderToDOM(parsed);
  }
}

// Export singleton instance
export const richTextParser = new RichTextParser();