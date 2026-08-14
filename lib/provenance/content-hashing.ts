/**
 * Content Hashing Utilities
 * 
 * Provides deterministic SHA-256 hashing for paragraph content.
 * Ensures consistent hashing across platforms via canonical text representation.
 */

import crypto from 'crypto';

/**
 * Canonicalize paragraph text for hashing.
 * 
 * Ensures equivalent content always produces the same canonical form:
 * - Normalize newlines to \n
 * - Apply NFKC Unicode normalization
 * - Trim leading/trailing whitespace
 * 
 * @param text - Raw paragraph text
 * @returns Canonical text form
 */
export function canonicalizeContent(text: string): string {
  if (!text) {
    return '';
  }

  // Normalize newlines: \r\n → \n, \r → \n
  let canonical = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Unicode normalization (NFKC for compatibility)
  // This ensures é (e + combining accent) == é (single character)
  canonical = canonical.normalize('NFKC');

  // Trim leading/trailing whitespace at document boundaries only
  canonical = canonical.trim();

  return canonical;
}

/**
 * Compute SHA-256 hash of paragraph content.
 * 
 * Uses canonical form to ensure:
 * - Platform-independent hashing
 * - Markup-independent hashing (plaintext only)
 * - Consistent results across editors
 * 
 * @param text - Paragraph text content
 * @returns Lowercase hexadecimal SHA-256 hash (64 characters)
 */
export function hashContent(text: string): string {
  const canonical = canonicalizeContent(text);
  
  const hash = crypto
    .createHash('sha256')
    .update(canonical, 'utf8')
    .digest('hex');
  
  return hash;
}

/**
 * Verify that content matches an expected hash.
 * 
 * @param text - Paragraph text to verify
 * @param expectedHash - Expected SHA-256 hash (hex)
 * @returns True if hash matches
 */
export function verifyContentHash(text: string, expectedHash: string): boolean {
  const computedHash = hashContent(text);
  return computedHash === expectedHash;
}

/**
 * Extract plaintext from TipTap JSON node.
 * 
 * Recursively extracts all text content from a ProseMirror/TipTap node,
 * preserving paragraph structure via newlines.
 * 
 * @param node - TipTap/ProseMirror JSON node
 * @returns Plaintext content
 */
export function extractTextFromNode(node: any): string {
  if (!node) {
    return '';
  }

  // Text node
  if (node.type === 'text') {
    return node.text || '';
  }

  // Node with content array
  if (node.content && Array.isArray(node.content)) {
    const parts = node.content.map((child) => extractTextFromNode(child));
    
    // Add newlines between block-level elements
    if (node.type && isBlockElement(node.type)) {
      return parts.join('');
    }
    
    return parts.join('');
  }

  return '';
}

/**
 * Check if a node type is block-level.
 * 
 * @param nodeType - TipTap node type name
 * @returns True if block-level
 */
function isBlockElement(nodeType: string): boolean {
  const blockTypes = [
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'listItem',
    'blockquote',
    'codeBlock',
    'horizontalRule',
  ];
  return blockTypes.includes(nodeType);
}

/**
 * Hash a TipTap/ProseMirror node's content.
 * 
 * Extracts plaintext from node and hashes it.
 * 
 * @param node - TipTap node to hash
 * @returns SHA-256 hash of node's plaintext content
 */
export function hashNode(node: any): string {
  const text = extractTextFromNode(node);
  return hashContent(text);
}
