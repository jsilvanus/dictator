/**
 * Paragraph ID Generation and Validation
 * 
 * Utilities for creating and validating stable paragraph identifiers.
 * Works in both browser and Node.js environments.
 */

/**
 * Paragraph ID in stable format.
 * Uniquely identifies a paragraph within a document.
 * Format: p_<uuid>
 */
export type ParagraphId = string & { readonly __brand: 'ParagraphId' };

/**
 * Generate a new random paragraph ID.
 * 
 * Uses crypto.randomUUID if available (modern browsers + Node 15+),
 * falls back to polyfill for older environments.
 * 
 * @returns New paragraph ID with format p_<uuid>
 */
export function generateParagraphId(): ParagraphId {
  const uuid = getRandomUUID();
  return `p_${uuid}` as ParagraphId;
}

/**
 * Generate a UUID v4 string.
 * Works in both browser (modern) and Node.js environments.
 * 
 * @returns UUID v4 string (36 characters)
 */
export function getRandomUUID(): string {
  // Use crypto.randomUUID if available (browser + Node 15+)
  if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
    return global.crypto.randomUUID();
  }
  
  // Node.js crypto module
  try {
    const crypto = require('crypto');
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to polyfill
  }
  
  // Polyfill: generate UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate that a string is a valid paragraph ID.
 * 
 * @param value - String to validate
 * @returns True if value is a valid paragraph ID
 */
export function isParagraphId(value: unknown): value is ParagraphId {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Format: p_<36-char-uuid>
  // Total: 38 characters
  if (value.length !== 38) {
    return false;
  }
  
  if (!value.startsWith('p_')) {
    return false;
  }
  
  const uuidPart = value.substring(2);
  
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // Version 4 has specific format, but we'll be lenient
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(uuidPart);
}

/**
 * Cast a string to ParagraphId without validation.
 * Use with caution - only when you're certain the string is valid.
 * 
 * @param value - String to cast
 * @returns Typed as ParagraphId
 */
export function asParagraphId(value: string): ParagraphId {
  return value as ParagraphId;
}
