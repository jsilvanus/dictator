/**
 * Tests for paragraph ID generation and validation
 */

import { describe, it, expect } from 'vitest';
import {
  generateParagraphId,
  getRandomUUID,
  isParagraphId,
  asParagraphId,
  type ParagraphId,
} from '@/lib/provenance/paragraph-id';

describe('Paragraph ID Management', () => {
  describe('generateParagraphId', () => {
    it('should generate valid paragraph IDs', () => {
      const id = generateParagraphId();
      expect(isParagraphId(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = generateParagraphId();
      const id2 = generateParagraphId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct format', () => {
      const id = generateParagraphId();
      expect(id).toMatch(/^p_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
    });

    it('should generate IDs of consistent length', () => {
      for (let i = 0; i < 10; i++) {
        const id = generateParagraphId();
        expect(id).toHaveLength(38); // p_ + 36-char UUID
      }
    });
  });

  describe('getRandomUUID', () => {
    it('should generate UUID v4 format', () => {
      const uuid = getRandomUUID();
      // UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = getRandomUUID();
      const uuid2 = getRandomUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs of standard length', () => {
      const uuid = getRandomUUID();
      expect(uuid).toHaveLength(36);
    });
  });

  describe('isParagraphId', () => {
    it('should accept valid paragraph IDs', () => {
      const id = generateParagraphId();
      expect(isParagraphId(id)).toBe(true);
    });

    it('should reject strings without p_ prefix', () => {
      expect(isParagraphId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });

    it('should reject strings with wrong prefix', () => {
      expect(isParagraphId('pg_550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });

    it('should reject strings with wrong length', () => {
      expect(isParagraphId('p_short')).toBe(false);
      expect(isParagraphId('p_' + 'a'.repeat(50))).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isParagraphId(null as any)).toBe(false);
      expect(isParagraphId(undefined as any)).toBe(false);
      expect(isParagraphId(123 as any)).toBe(false);
      expect(isParagraphId({} as any)).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      // Wrong format (no hyphens)
      expect(isParagraphId('p_550e8400e29b41d4a716446655440000')).toBe(false);
      
      // Wrong format (extra characters)
      expect(isParagraphId('p_550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
    });

    it('should be case-insensitive for UUID hex', () => {
      // Generate with lowercase
      const lowerUUID = 'p_550e8400-e29b-41d4-a716-446655440000';
      expect(isParagraphId(lowerUUID)).toBe(true);
      
      // Same with uppercase
      const upperUUID = 'p_550E8400-E29B-41D4-A716-446655440000';
      expect(isParagraphId(upperUUID)).toBe(true);
    });
  });

  describe('asParagraphId', () => {
    it('should cast valid strings', () => {
      const id = generateParagraphId();
      const uuid = id.substring(2); // Get UUID part
      const cast = asParagraphId(`p_${uuid}`);
      expect(isParagraphId(cast)).toBe(true);
    });

    it('should not validate input', () => {
      // asParagraphId just casts without validation
      const cast = asParagraphId('not-a-valid-id');
      expect(typeof cast).toBe('string');
      // But isParagraphId would reject it
      expect(isParagraphId(cast)).toBe(false);
    });

    it('should work with already-valid IDs', () => {
      const valid = generateParagraphId();
      const cast = asParagraphId(valid);
      expect(cast).toBe(valid);
      expect(isParagraphId(cast)).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should generate consistent IDs for documents', () => {
      const paragraphIds: ParagraphId[] = [];
      
      // Simulate creating a document with multiple paragraphs
      for (let i = 0; i < 5; i++) {
        paragraphIds.push(generateParagraphId());
      }
      
      // All unique
      const uniqueIds = new Set(paragraphIds);
      expect(uniqueIds.size).toBe(paragraphIds.length);
      
      // All valid
      paragraphIds.forEach(id => {
        expect(isParagraphId(id)).toBe(true);
      });
    });

    it('should preserve ID type across operations', () => {
      const id1 = generateParagraphId();
      
      // Simulate storing and retrieving
      const stored = JSON.stringify({ id: id1 });
      const retrieved = JSON.parse(stored) as { id: string };
      
      // Validate retrieved value
      expect(isParagraphId(retrieved.id)).toBe(true);
    });

    it('should handle ID collections', () => {
      const ids = Array.from({ length: 20 }, () => generateParagraphId());
      
      // All should be unique
      expect(new Set(ids).size).toBe(ids.length);
      
      // All should be valid
      ids.forEach(id => {
        expect(isParagraphId(id)).toBe(true);
        expect(id).toHaveLength(38);
      });
    });
  });
});
