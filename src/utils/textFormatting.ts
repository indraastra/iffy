/**
 * Text formatting utilities for consistent prompt generation
 * Provides standardized list formatting, null safety, and consistent fallbacks
 */

export interface ListFormatOptions {
  /** Separator between items (default: ', ') */
  separator?: string;
  /** Text to display when list is empty/null (default: 'None') */
  fallback?: string;
  /** Maximum number of items to display before truncating */
  maxItems?: number;
  /** Text to show when truncated (default: '...') */
  truncationSuffix?: string;
  /** Transform function applied to each item before joining */
  transform?: (item: any, index: number) => string;
}

export interface StructuredListOptions extends ListFormatOptions {
  /** Prefix for each item (default: '- ') */
  itemPrefix?: string;
  /** Indentation for nested content (default: '  ') */
  indent?: string;
  /** Whether to add extra line breaks between items */
  spaceBetweenItems?: boolean;
}

/**
 * Text formatting utilities for consistent LLM prompt generation
 */
export class TextFormatter {
  
  /**
   * Format a simple inline list with consistent separators and fallbacks
   * 
   * @example
   * formatList(['apple', 'banana', 'cherry']) // "apple, banana, cherry"
   * formatList([]) // "None"
   * formatList(['a', 'b', 'c'], { maxItems: 2 }) // "a, b..."
   */
  static formatList(
    items: any[] | null | undefined, 
    options: ListFormatOptions = {}
  ): string {
    const {
      separator = ', ',
      fallback = 'None',
      maxItems,
      truncationSuffix = '...',
      transform = (item) => String(item)
    } = options;

    // Handle null/undefined arrays
    if (!items || items.length === 0) {
      return fallback;
    }

    // Apply transformation to each item
    let processedItems = items.map(transform);

    // Handle truncation if maxItems specified
    if (maxItems && processedItems.length > maxItems) {
      processedItems = processedItems.slice(0, maxItems);
      return processedItems.join(separator) + truncationSuffix;
    }

    return processedItems.join(separator);
  }

  /**
   * Format a structured list with bullets, indentation, and line breaks
   * Ideal for detailed sections like locations, items, or success conditions
   * 
   * @example
   * formatStructuredList(['Item 1', 'Item 2']) 
   * // "- Item 1\n- Item 2"
   * 
   * formatStructuredList([
   *   { id: 'key', desc: 'A golden key' }
   * ], { 
   *   transform: (item) => `${item.id}: ${item.desc}` 
   * })
   * // "- key: A golden key"
   */
  static formatStructuredList(
    items: any[] | null | undefined,
    options: StructuredListOptions = {}
  ): string {
    const {
      separator = '\n',
      fallback = 'None',
      maxItems,
      truncationSuffix = '...',
      transform = (item) => String(item),
      itemPrefix = '- ',
      indent = '  ',
      spaceBetweenItems = false
    } = options;

    // Handle null/undefined arrays
    if (!items || items.length === 0) {
      return fallback;
    }

    // Apply transformation and add prefixes
    let processedItems = items.map((item, index) => {
      const transformed = transform(item, index);
      // Add indent to multi-line content
      const indentedContent = transformed
        .split('\n')
        .map((line, lineIndex) => lineIndex === 0 ? line : indent + line)
        .join('\n');
      
      return itemPrefix + indentedContent;
    });

    // Handle truncation if maxItems specified
    if (maxItems && processedItems.length > maxItems) {
      processedItems = processedItems.slice(0, maxItems);
      processedItems.push(itemPrefix + truncationSuffix);
    }

    // Join with appropriate spacing
    const finalSeparator = spaceBetweenItems ? separator + separator : separator;
    return processedItems.join(finalSeparator);
  }

  /**
   * Format key-value pairs consistently
   * 
   * @example
   * formatKeyValue('Name', 'John') // "Name: John"
   * formatKeyValue('Items', ['a', 'b']) // "Items: a, b"
   * formatKeyValue('Empty', null) // "Empty: None"
   */
  static formatKeyValue(
    key: string, 
    value: any, 
    options: ListFormatOptions = {}
  ): string {
    const separator = options.separator || ': ';
    
    if (Array.isArray(value)) {
      const formattedList = this.formatList(value, options);
      return `${key}${separator}${formattedList}`;
    }
    
    if (value === null || value === undefined || value === '') {
      return `${key}${separator}${options.fallback || 'None'}`;
    }
    
    return `${key}${separator}${String(value)}`;
  }

  /**
   * Format a section with title and content
   * Use this when you need a complete standalone section with title and colon.
   * 
   * @example
   * formatSection('CHARACTERS', ['Hero', 'Villain'])
   * // "CHARACTERS:\n- Hero\n- Villain"
   */
  static formatSection(
    title: string,
    content: any[] | string | null | undefined,
    options: StructuredListOptions = {}
  ): string {
    if (typeof content === 'string') {
      return content.trim() ? `${title}:\n${content}` : '';
    }

    if (Array.isArray(content)) {
      const formattedContent = this.formatStructuredList(content, options);
      if (formattedContent === (options.fallback || 'None')) {
        return '';  // Don't show empty sections
      }
      return `${title}:\n${formattedContent}`;
    }

    return '';
  }

  /**
   * Format content for use in an existing section (no title, no colon)
   * Use this when the section title is already provided by the container.
   * 
   * @example
   * formatSectionContent(['Hero', 'Villain'])
   * // "- Hero\n- Villain"
   */
  static formatSectionContent(
    content: any[] | string | null | undefined,
    options: StructuredListOptions = {}
  ): string {
    if (typeof content === 'string') {
      return content.trim();
    }

    if (Array.isArray(content)) {
      const formattedContent = this.formatStructuredList(content, options);
      if (formattedContent === (options.fallback || 'None')) {
        return '';  // Don't show empty sections
      }
      return formattedContent;
    }

    return '';
  }

  /**
   * Format requirements or dependencies consistently
   * Specialized for success conditions, flow requirements, etc.
   * 
   * @example
   * formatRequirements(['flag1', 'flag2']) // "Requires: flag1, flag2"
   * formatRequirements([]) // "Requires: None"
   */
  static formatRequirements(
    requirements: string[] | null | undefined,
    options: { 
      keyValueSeparator?: string;
      listSeparator?: string;
      fallback?: string;
    } = {}
  ): string {
    const {
      keyValueSeparator = ': ',
      listSeparator = ', ',
      fallback = 'None'
    } = options;
    
    if (!requirements || requirements.length === 0) {
      return `Requires${keyValueSeparator}${fallback}`;
    }
    
    const formattedList = this.formatList(requirements, {
      separator: listSeparator,
      fallback
    });
    
    return `Requires${keyValueSeparator}${formattedList}`;
  }

  /**
   * Format aliases or alternative names consistently
   * 
   * @example
   * formatAliases(['key', 'golden key']) // "[aliases: key, golden key]"
   * formatAliases([]) // ""
   */
  static formatAliases(
    aliases: string[] | null | undefined,
    options: Partial<ListFormatOptions> = {}
  ): string {
    if (!aliases || aliases.length === 0) {
      return '';
    }
    
    const formattedList = this.formatList(aliases, {
      fallback: '',
      ...options
    });
    
    return formattedList ? `[aliases: ${formattedList}]` : '';
  }

  /**
   * Format character traits consistently
   * 
   * @example
   * formatTraits(['brave', 'smart']) // "(brave, smart)"
   * formatTraits([]) // "(no traits)"
   */
  static formatTraits(
    traits: string[] | null | undefined,
    options: Partial<ListFormatOptions> = {}
  ): string {
    const formattedList = this.formatList(traits, {
      fallback: 'no traits',
      ...options
    });
    
    return `(${formattedList})`;
  }

  /**
   * Escape text for safe inclusion in prompts
   * Handles newlines, quotes, and other special characters
   */
  static escapePromptText(text: string): string {
    return text
      .replace(/\n\s*\n\s*\n+/g, '\n\n')  // Normalize 3+ newlines to double newlines
      .replace(/^\s+|\s+$/g, '')          // Trim whitespace
      .replace(/[ \t]+/g, ' ')            // Normalize spaces/tabs but preserve newlines
      .trim();
  }

  /**
   * Create consistent indentation for nested content
   */
  static indent(text: string, levels: number = 1, indentString: string = '  '): string {
    const prefix = indentString.repeat(levels);
    return text
      .split('\n')
      .map(line => line.trim() ? prefix + line : line)
      .join('\n');
  }
}

// Export convenience functions for common patterns
export const formatList = TextFormatter.formatList.bind(TextFormatter);
export const formatStructuredList = TextFormatter.formatStructuredList.bind(TextFormatter);
export const formatKeyValue = TextFormatter.formatKeyValue.bind(TextFormatter);
export const formatSection = TextFormatter.formatSection.bind(TextFormatter);
export const formatSectionContent = TextFormatter.formatSectionContent.bind(TextFormatter);
export const formatRequirements = TextFormatter.formatRequirements.bind(TextFormatter);
export const formatAliases = TextFormatter.formatAliases.bind(TextFormatter);
export const formatTraits = TextFormatter.formatTraits.bind(TextFormatter);
export const escapePromptText = TextFormatter.escapePromptText.bind(TextFormatter);
export const indent = TextFormatter.indent.bind(TextFormatter);