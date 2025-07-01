/**
 * Text normalization utilities for formatting YAML content for browser display
 * 
 * Handles the normalization of text content that comes from YAML files,
 * intelligently preserving formatting for structured content (lists, indented blocks)
 * while allowing prose paragraphs to flow naturally.
 * 
 * This is particularly useful for interactive fiction stories where authors may
 * use a mix of structured content (like item lists, instructions) and flowing
 * narrative prose within the same YAML file.
 * 
 * @example
 * ```typescript
 * const yamlContent = `Story begins here.
 * 
 * Available actions:
 * - Look around
 * - Take item
 * 
 * The text continues flowing
 * across multiple lines here.`;
 * 
 * const normalized = normalizeYamlText(yamlContent);
 * // Result preserves list structure but flows prose
 * ```
 */

/**
 * Normalizes YAML content for browser display
 * 
 * Features:
 * - Preserves paragraph breaks (double newlines)
 * - Preserves list formatting (lines starting with -, *, •, or numbers)
 * - Preserves indented lines (for nested content)
 * - Collapses single newlines within prose paragraphs
 * - Normalizes multiple spaces to single spaces
 * - Trims leading/trailing whitespace
 * 
 * @param text - The raw text content from YAML
 * @returns Normalized text suitable for browser display
 */
export function normalizeYamlText(text: string): string {
  // Process line by line to determine which newlines to preserve
  const lines = text.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    
    // Detect various line types
    const isEmptyLine = line.trim() === '';
    const isListItem = isListItemLine(line);
    const isIndented = isIndentedLine(line);
    const nextIsEmpty = nextLine.trim() === '';
    const nextIsListItem = isListItemLine(nextLine);
    const nextIsIndented = isIndentedLine(nextLine);
    
    // Determine if we should preserve the newline after this line
    let preserveNewline = false;
    
    // Always preserve empty lines (paragraph breaks)
    if (isEmptyLine) {
      preserveNewline = true;
    }
    // Preserve newline before empty lines (end of paragraph)
    else if (nextIsEmpty) {
      preserveNewline = true;
    }
    // Preserve newlines for list items
    else if (isListItem || nextIsListItem) {
      preserveNewline = true;
    }
    // Preserve newlines for indented content
    else if (isIndented || nextIsIndented) {
      preserveNewline = true;
    }
    // Don't preserve newlines for regular prose lines, even after paragraph breaks
    
    if (preserveNewline) {
      processedLines.push(line);
    } else {
      // This is prose that should flow - add a space marker if not at end
      if (i < lines.length - 1) {
        processedLines.push(line + ' §FLOW§');
      } else {
        processedLines.push(line);
      }
    }
  }
  
  // Join and clean up
  return processedLines
    .join('\n')
    .replace(/ §FLOW§\n/g, ' ') // Replace flow markers with spaces
    .replace(/\n\n\n+/g, '\n\n') // Normalize multiple empty lines to double newline
    .replace(/([^\s]) {2,}([^\s])/g, '$1 $2') // Normalize multiple spaces to single (except at line start/end)
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Checks if a line is a list item (bullet or numbered)
 */
function isListItemLine(line: string): boolean {
  return /^\s*[-*•]/.test(line) || /^\s*\d+\./.test(line);
}

/**
 * Checks if a line is indented (2+ spaces) with content
 */
function isIndentedLine(line: string): boolean {
  return /^\s{2,}/.test(line) && line.trim().length > 0;
}


/**
 * Normalizes spaces within text, reducing multiple spaces to single spaces
 * while preserving indentation at the start of lines
 */
export function normalizeSpaces(text: string): string {
  return text.replace(/([^\s]) {2,}([^\s])/g, '$1 $2');
}

/**
 * Collapses single newlines to spaces while preserving paragraph breaks
 * This is a simpler normalization for pure prose content
 */
export function collapseProseParagraphs(text: string): string {
  return text
    .replace(/\n\n+/g, '§PARAGRAPH_BREAK§') // Mark paragraph breaks
    .replace(/\n/g, ' ') // Convert single newlines to spaces
    .replace(/§PARAGRAPH_BREAK§/g, '\n\n') // Restore paragraph breaks
    .replace(/ +/g, ' ') // Normalize multiple spaces
    .trim();
}