/**
 * Tests for content hashing and canonicalization
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalizeContent,
  hashContent,
  verifyContentHash,
  extractTextFromNode,
  hashNode,
} from '@/lib/provenance/content-hashing';

describe('Content Hashing', () => {
  describe('canonicalizeContent', () => {
    it('should handle empty strings', () => {
      expect(canonicalizeContent('')).toBe('');
      expect(canonicalizeContent(null as any)).toBe('');
    });

    it('should normalize Windows line endings', () => {
      const text = 'line1\r\nline2';
      expect(canonicalizeContent(text)).toBe('line1\nline2');
    });

    it('should normalize Mac line endings', () => {
      const text = 'line1\rline2';
      expect(canonicalizeContent(text)).toBe('line1\nline2');
    });

    it('should trim leading and trailing whitespace', () => {
      const text = '  \n  hello world  \n  ';
      expect(canonicalizeContent(text)).toBe('hello world');
    });

    it('should preserve internal whitespace', () => {
      const text = 'hello   world  \n  foo';
      // trim() only removes leading/trailing at document level
      // So internal line spacing is preserved
      expect(canonicalizeContent(text)).toBe('hello   world  \n  foo');
    });

    it('should apply Unicode NFKC normalization', () => {
      // Composed form: é (single character U+00E9)
      const composed = 'café';
      // Decomposed form: e + combining acute (U+0065 + U+0301)
      const decomposed = 'cafe\u0301';
      
      // Both should canonicalize to same form
      expect(canonicalizeContent(composed)).toBe(canonicalizeContent(decomposed));
    });

    it('should handle mixed edge cases', () => {
      const text = '  \r\n  Test  \r\n  ';
      expect(canonicalizeContent(text)).toBe('Test');
    });
  });

  describe('hashContent', () => {
    it('should produce consistent hashes', () => {
      const text = 'The service begins at 10.';
      const hash1 = hashContent(text);
      const hash2 = hashContent(text);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', () => {
      const hash1 = hashContent('The service begins at 10.');
      const hash2 = hashContent('The service begins at 11.');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce valid SHA-256 hashes (64 hex chars)', () => {
      const hash = hashContent('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should ignore whitespace differences in hash', () => {
      const text1 = 'hello world';
      const text2 = '  hello world  ';
      expect(hashContent(text1)).toBe(hashContent(text2));
    });

    it('should ignore newline style differences', () => {
      const text1 = 'line1\nline2';
      const text2 = 'line1\r\nline2';
      expect(hashContent(text1)).toBe(hashContent(text2));
    });

    it('should normalize Unicode variants to same hash', () => {
      const composed = 'café';
      const decomposed = 'cafe\u0301';
      expect(hashContent(composed)).toBe(hashContent(decomposed));
    });

    it('should hash empty content', () => {
      const hash = hashContent('');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toBe(hashContent(''));
    });

    it('should handle multiline content', () => {
      const text = 'First line\nSecond line\nThird line';
      const hash = hashContent(text);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyContentHash', () => {
    it('should verify matching content', () => {
      const text = 'The service begins at 10.';
      const hash = hashContent(text);
      expect(verifyContentHash(text, hash)).toBe(true);
    });

    it('should reject non-matching content', () => {
      const hash = hashContent('original');
      expect(verifyContentHash('modified', hash)).toBe(false);
    });

    it('should handle whitespace-equivalent content', () => {
      const hash = hashContent('hello world');
      expect(verifyContentHash('  hello world  ', hash)).toBe(true);
    });

    it('should handle newline-equivalent content', () => {
      const hash = hashContent('line1\nline2');
      expect(verifyContentHash('line1\r\nline2', hash)).toBe(true);
    });

    it('should reject changed content', () => {
      const hash = hashContent('hello');
      expect(verifyContentHash('hello world', hash)).toBe(false);
    });
  });

  describe('extractTextFromNode', () => {
    it('should extract text from text node', () => {
      const node = { type: 'text', text: 'Hello' };
      expect(extractTextFromNode(node)).toBe('Hello');
    });

    it('should extract text from paragraph with content', () => {
      const node = {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: ' world' },
        ],
      };
      expect(extractTextFromNode(node)).toBe('Hello world');
    });

    it('should handle nested marks', () => {
      const node = {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' world' },
        ],
      };
      expect(extractTextFromNode(node)).toBe('Hello world');
    });

    it('should handle null nodes', () => {
      expect(extractTextFromNode(null)).toBe('');
      expect(extractTextFromNode(undefined)).toBe('');
    });

    it('should extract from complex document', () => {
      const node = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }],
          },
        ],
      };
      const text = extractTextFromNode(node);
      expect(text).toContain('First paragraph');
      expect(text).toContain('Second paragraph');
    });

    it('should handle empty content arrays', () => {
      const node = { type: 'paragraph', content: [] };
      expect(extractTextFromNode(node)).toBe('');
    });

    it('should handle missing text property', () => {
      const node = { type: 'text' };
      expect(extractTextFromNode(node)).toBe('');
    });
  });

  describe('hashNode', () => {
    it('should hash paragraph node', () => {
      const node = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }],
      };
      const hash = hashNode(node);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent hashes for same node', () => {
      const node = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test' }],
      };
      const hash1 = hashNode(node);
      const hash2 = hashNode(node);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', () => {
      const node1 = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Content A' }],
      };
      const node2 = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Content B' }],
      };
      expect(hashNode(node1)).not.toBe(hashNode(node2));
    });

    it('should ignore markup differences in hash', () => {
      const node1 = {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' world' },
        ],
      };
      const node2 = {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: ' world', marks: [{ type: 'italic' }] },
        ],
      };
      // Same plaintext should produce same hash regardless of markup
      expect(hashNode(node1)).toBe(hashNode(node2));
    });
  });

  describe('integration scenarios', () => {
    it('should handle a realistic paragraph with edits', () => {
      const original = 'The service begins at 10 on Sunday.';
      const edited = 'The service begins at 10:00 on Sunday.';
      
      const hash1 = hashContent(original);
      const hash2 = hashContent(edited);
      
      // Hashes differ because content changed
      expect(hash1).not.toBe(hash2);
      
      // But can verify original against original hash
      expect(verifyContentHash(original, hash1)).toBe(true);
      expect(verifyContentHash(edited, hash2)).toBe(true);
    });

    it('should handle copy-paste normalization', () => {
      // Content copied from one platform, pasted on another
      const originalHash = hashContent('Line 1\nLine 2');
      
      // Windows version with \r\n
      const pasted = 'Line 1\r\nLine 2';
      
      // Should verify despite platform differences
      expect(verifyContentHash(pasted, originalHash)).toBe(true);
    });

    it('should preserve internal structure hashes', () => {
      const multiline = 'Paragraph with\nmultiple lines\nof content';
      const hash1 = hashContent(multiline);
      
      // Same content, just different source
      const hash2 = hashContent('Paragraph with\nmu' + 'ltiple lines\nof content');
      
      expect(hash1).toBe(hash2);
    });
  });
});
