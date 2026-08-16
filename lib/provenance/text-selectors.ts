/**
 * W3C Web Annotation Fragment Selectors
 * 
 * Implements textual region selectors for C2PA manifests.
 * Uses W3C Web Annotation Data Model specification.
 * 
 * Reference: https://www.w3.org/TR/annotation-model/
 */

/**
 * Character-based textual selector.
 * Identifies text by character offset and length.
 * 
 * Format: char=start,end
 * Example: "char=150,280"
 * 
 * @param start - Start character offset (0-based)
 * @param end - End character offset (exclusive)
 * @returns Selector string
 */
export function charOffsetSelector(start: number, end: number): string {
  if (start < 0 || end < start) {
    throw new Error(
      `Invalid character offsets: start=${start}, end=${end}`
    );
  }
  return `char=${start},${end}`;
}

/**
 * Contextual textual selector.
 * Identifies text by searching for a prefix and/or suffix.
 * Useful when exact offsets are unstable.
 * 
 * Format: prefix!target!suffix
 * 
 * @param target - Target text to find
 * @param prefix - Optional prefix context (first N characters before)
 * @param suffix - Optional suffix context (first N characters after)
 * @returns Selector string
 */
export function contextualSelector(
  target: string,
  prefix?: string,
  suffix?: string
): string {
  if (!target) {
    throw new Error('Target text cannot be empty');
  }
  
  const parts = [];
  if (prefix) parts.push(prefix);
  parts.push(target);
  if (suffix) parts.push(suffix);
  
  return parts.join('!');
}

/**
 * Find character offset of text within document.
 * 
 * Uses simple substring search (case-insensitive for flexibility).
 * 
 * @param content - Full document text
 * @param target - Target text to find
 * @returns Offset and length, or null if not found
 */
export function findTextOffset(
  content: string,
  target: string
): { start: number; end: number } | null {
  // Try exact match first
  let index = content.indexOf(target);
  
  // Try case-insensitive match
  if (index === -1) {
    index = content.toLowerCase().indexOf(target.toLowerCase());
  }
  
  if (index === -1) {
    return null;
  }
  
  return {
    start: index,
    end: index + target.length,
  };
}

/**
 * Extract context around a text selection.
 * 
 * @param content - Full document text
 * @param start - Start offset
 * @param end - End offset
 * @param contextLength - Number of characters for prefix/suffix
 * @returns Object with prefix, target, and suffix
 */
export function extractContext(
  content: string,
  start: number,
  end: number,
  contextLength: number = 50
): { prefix?: string; target: string; suffix?: string } {
  const target = content.substring(start, end);
  
  const prefixStart = Math.max(0, start - contextLength);
  const prefix =
    prefixStart < start
      ? content.substring(prefixStart, start)
      : undefined;
  
  const suffixEnd = Math.min(content.length, end + contextLength);
  const suffix = end < suffixEnd ? content.substring(end, suffixEnd) : undefined;
  
  return { prefix, target, suffix };
}

/**
 * W3C Annotation Fragment Selector object.
 * 
 * Used in C2PA manifests to describe affected text regions.
 */
export interface TextualRegionSelector {
  /** Type is always "TextualRegion" for W3C compatibility */
  type: 'TextualRegion';
  
  /**
   * The selector refinement (character offset or context-based).
   * Multiple refinements can be combined.
   */
  refinement?: string[];
  
  /**
   * The actual selector value.
   * Can be char offset (char=start,end) or contextual.
   */
  value: string;
  
  /**
   * Optional: display label for the selected region.
   */
  label?: string;
}

/**
 * Create a C2PA-compatible textual region selector.
 * 
 * Prefers character offsets for precision, falls back to contextual
 * if exact positions are unavailable. Returns null if text cannot be located.
 * 
 * @param content - Text content
 * @param target - Target text to select
 * @returns Textual region selector object, or null if text not found
 */
export function createTextualRegionSelector(
  content: string,
  target: string
): TextualRegionSelector | null {
  // Validation
  if (!target || target.length === 0) {
    return null;
  }

  // Try to find exact character offset
  const offset = findTextOffset(content, target);
  
  if (offset) {
    return {
      type: 'TextualRegion',
      value: charOffsetSelector(offset.start, offset.end),
    };
  }
  
  // If text cannot be found, return null rather than creating unreliable selector
  // This is safer than creating a contextual selector that may not match
  return null;
}

/**
 * Verify a textual selector matches expected content.
 * 
 * @param content - Document text
 * @param selector - Selector string
 * @param expectedText - Text that should be selected
 * @returns True if selector correctly identifies expected text
 */
export function verifySelector(
  content: string,
  selector: string,
  expectedText: string
): boolean {
  // Character offset selector
  if (selector.startsWith('char=')) {
    const [start, end] = selector
      .substring(5)
      .split(',')
      .map(Number);
    
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return false;
    }
    
    if (start < 0 || end > content.length || start > end) {
      return false;
    }
    
    const selected = content.substring(start, end);
    // Case-insensitive comparison
    return selected.toLowerCase() === expectedText.toLowerCase();
  }
  
  // Contextual selector (prefix!target!suffix)
  if (selector.includes('!')) {
    const parts = selector.split('!');
    if (parts.length < 1 || parts.length > 3) {
      return false;
    }
    
    // Find target in content (simple case-insensitive check)
    const targetPart = parts.length === 3 ? parts[1] : parts[0];
    return content.toLowerCase().includes(targetPart.toLowerCase());
  }
  
  return false;
}
