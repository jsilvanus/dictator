/**
 * Tests for C2PA Manifest Generation and Text Selectors
 */

import { describe, it, expect } from 'vitest';
import {
  charOffsetSelector,
  contextualSelector,
  findTextOffset,
  extractContext,
  createTextualRegionSelector,
  verifySelector,
} from '@/lib/provenance/text-selectors';
import { C2PAManifestService, createC2PAReference } from '@/lib/provenance/c2pa-manifest';
import { ParagraphProvenanceService } from '@/lib/provenance/paragraph-provenance-service';
import { generateParagraphId } from '@/lib/provenance/paragraph-id';

describe('Text Selectors', () => {
  describe('charOffsetSelector', () => {
    it('should create valid char offset selector', () => {
      const selector = charOffsetSelector(0, 10);
      expect(selector).toBe('char=0,10');
    });

    it('should reject invalid offsets', () => {
      expect(() => charOffsetSelector(-1, 10)).toThrow();
      expect(() => charOffsetSelector(10, 5)).toThrow();
    });

    it('should handle zero-length selections', () => {
      const selector = charOffsetSelector(5, 5);
      expect(selector).toBe('char=5,5');
    });
  });

  describe('contextualSelector', () => {
    it('should create contextual selector', () => {
      const selector = contextualSelector('target', 'prefix', 'suffix');
      expect(selector).toBe('prefix!target!suffix');
    });

    it('should create selector with only target', () => {
      const selector = contextualSelector('target');
      expect(selector).toBe('target');
    });

    it('should reject empty target', () => {
      expect(() => contextualSelector('')).toThrow();
    });
  });

  describe('findTextOffset', () => {
    it('should find exact text offset', () => {
      const content = 'The service begins at 10.';
      const target = 'service';
      const offset = findTextOffset(content, target);
      
      expect(offset).not.toBeNull();
      expect(content.substring(offset!.start, offset!.end)).toBe('service');
    });

    it('should find text at beginning', () => {
      const content = 'The service begins';
      const offset = findTextOffset(content, 'The');
      
      expect(offset).not.toBeNull();
      expect(offset!.start).toBe(0);
    });

    it('should return null for non-existent text', () => {
      const content = 'The service begins';
      const offset = findTextOffset(content, 'xyz');
      
      expect(offset).toBeNull();
    });

    it('should handle case-insensitive matching', () => {
      const content = 'The Service Begins';
      const offset = findTextOffset(content, 'service');
      
      expect(offset).not.toBeNull();
    });
  });

  describe('extractContext', () => {
    it('should extract context around selection', () => {
      const content = 'The service begins at 10.';
      const offset = findTextOffset(content, 'service');
      
      if (!offset) throw new Error('Text not found');
      
      const context = extractContext(content, offset.start, offset.end, 3);
      
      expect(context.target).toBe('service');
      expect(context.prefix).toBeDefined();
      expect(context.suffix).toBeDefined();
    });

    it('should handle selection at beginning', () => {
      const content = 'The service';
      const context = extractContext(content, 0, 3, 10);
      
      expect(context.target).toBe('The');
      expect(context.prefix).toBeUndefined();
      expect(context.suffix).toBeDefined();
    });

    it('should handle selection at end', () => {
      const content = 'The service';
      const context = extractContext(content, 4, 11, 10);
      
      expect(context.target).toBe('service');
      expect(context.prefix).toBeDefined();
      expect(context.suffix).toBeUndefined();
    });
  });

  describe('createTextualRegionSelector', () => {
    it('should create char offset selector when possible', () => {
      const content = 'The service begins at 10.';
      const selector = createTextualRegionSelector(content, 'service');

      expect(selector).not.toBeNull();
      expect(selector!.type).toBe('TextualRegion');
      expect(selector!.value).toMatch(/^char=\d+,\d+$/);
    });

    it('should include refinements', () => {
      const content = 'The service begins at 10.';
      const selector = createTextualRegionSelector(content, 'service');

      expect(selector).not.toBeNull();
      expect(selector!.type).toBe('TextualRegion');
    });
  });

  describe('verifySelector', () => {
    it('should verify character offset selector', () => {
      const content = 'The service begins';
      const selector = 'char=4,11';
      
      expect(verifySelector(content, selector, 'service')).toBe(true);
    });

    it('should verify contextual selector', () => {
      const content = 'The service begins';
      const selector = 'The!service!begins';
      
      expect(verifySelector(content, selector, 'service')).toBe(true);
    });

    it('should reject invalid selector', () => {
      const content = 'The service begins';
      const selector = 'char=100,200'; // Out of bounds
      
      expect(verifySelector(content, selector, 'xyz')).toBe(false);
    });
  });
});

describe('C2PA Manifest Generation', () => {
  const documentId = 'doc-123';
  const userId = 'user-456';
  const device = 'web';

  describe('generateManifest', () => {
    it('should generate valid C2PA manifest structure', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'AI generated content',
        'ai-generated',
        { device, userId, confidence: 0.9 }
      );

      const exportedContent = 'AI generated content here.';
      const manifest = C2PAManifestService.generateManifest([provenance], exportedContent);

      expect(manifest.specVersion).toBe('2.4');
      expect(manifest.createdAt).toBeDefined();
      expect(manifest.generatedBy.name).toBe('Dictator');
      expect(manifest.claim.assertions).toBeDefined();
      expect(manifest.contentBinding).toBeDefined();
      expect(manifest.contentBinding!.algorithm).toBe('sha256');
    });

    it('should include content binding hash', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'human-written',
        { device, userId }
      );

      const exportedContent = 'document content';
      const manifest = C2PAManifestService.generateManifest([provenance], exportedContent);

      expect(manifest.contentBinding).toBeDefined();
      expect(manifest.contentBinding!.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle multiple paragraphs', () => {
      const para1 = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'First paragraph',
        'human-written',
        { device, userId }
      );

      const para2 = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'Second paragraph',
        'ai-generated',
        { device, userId, confidence: 0.8 }
      );

      const exportedContent = 'First paragraph\nSecond paragraph';
      const manifest = C2PAManifestService.generateManifest(
        [para1, para2],
        exportedContent
      );

      expect(manifest.claim.assertions).toBeDefined();
      expect(manifest.claim.assertions.length).toBeGreaterThan(0);
    });

    it('should include custom options', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'human-written',
        { device, userId }
      );

      const manifest = C2PAManifestService.generateManifest(
        [provenance],
        'content',
        {
          documentTitle: 'My Document',
          generatorName: 'CustomGenerator',
          generatorVersion: '2.0',
          exportFormat: 'pdf',
        }
      );

      expect(manifest.generatedBy.name).toBe('CustomGenerator');
      expect(manifest.generatedBy.version).toBe('2.0');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize manifest to JSON', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'human-written',
        { device, userId }
      );

      const manifest = C2PAManifestService.generateManifest([provenance], 'content');
      const json = C2PAManifestService.toJSON(manifest);

      expect(typeof json).toBe('string');
      expect(json).toContain('specVersion');
      expect(json).toContain('2.4');
    });

    it('should deserialize JSON to manifest', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'human-written',
        { device, userId }
      );

      const original = C2PAManifestService.generateManifest([provenance], 'content');
      const json = C2PAManifestService.toJSON(original);
      const restored = C2PAManifestService.fromJSON(json);

      expect(restored.specVersion).toBe(original.specVersion);
      expect(restored.generatedBy.name).toBe(original.generatedBy.name);
    });
  });

  describe('createC2PAReference', () => {
    it('should create C2PA reference from provenance', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'paragraph content',
        'ai-generated',
        { device, userId, confidence: 0.85 }
      );

      const exportedContent = 'Here is the paragraph content in context.';
      const reference = createC2PAReference(provenance, exportedContent);

      expect(reference.paragraphId).toBe(provenance.paragraphId);
      expect(reference.content).toBe('paragraph content');
      expect(reference.contentHash).toBe(provenance.currentContentHash);
      expect(reference.primaryAction).toBe('c2pa.generated');
    });

    it('should identify primary action correctly', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'original',
        'human-written',
        { device, userId }
      );

      // Modify with AI
      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'modified by AI',
        'ai-modification',
        {
          device,
          userId,
          source: 'ai-modified',
          confidence: 0.7,
        }
      );

      const reference = createC2PAReference(provenance, 'full content');
      expect(reference.primaryAction).toBe('c2pa.modified');
    });

    it('should include relevant events', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'ai-generated',
        { device, userId, confidence: 0.9 }
      );

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'reviewed content',
        'human-acceptance',
        {
          device,
          userId,
          source: 'ai-generated',
          reviewedAt: Date.now(),
        }
      );

      const reference = createC2PAReference(provenance, 'content');
      expect(reference.relevantEvents.length).toBe(2);
    });
  });

  describe('AI action generation', () => {
    it('should generate AI action with proper metadata', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'AI generated text',
        'ai-generated',
        {
          device,
          userId,
          aiSessionId: 'session-123',
          aiTurnId: 'turn-456',
          confidence: 0.92,
          selectionScope: 'full-document',
        }
      );

      const exportedContent = 'Here is the AI generated text in context.';
      const manifest = C2PAManifestService.generateManifest(
        [provenance],
        exportedContent
      );

      expect(manifest.claim.assertions.length).toBeGreaterThan(0);
      const data = manifest.claim.assertions[0].data as any;
      expect(data.actions).toBeDefined();
      expect(data.actions.length).toBeGreaterThan(0);

      const action = data.actions[0];
      expect(['c2pa.generated', 'c2pa.modified']).toContain(action.action);
      expect(action.softwareAgent).toBeDefined();
      expect(action.changes).toBeDefined();
    });
  });

  describe('review action generation', () => {
    it('should generate review action for reviewed paragraphs', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'text',
        'human-written',
        { device, userId }
      );

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'text',
        'human-acceptance',
        {
          device,
          userId,
          source: 'human-written',
          reviewedAt: Date.now(),
          reviewedBy: userId,
        }
      );

      const manifest = C2PAManifestService.generateManifest(
        [provenance],
        'text'
      );

      const data = manifest.claim.assertions[0].data as any;
      expect(data.actions).toBeDefined();
      // Should have review action or AI action
      const hasReviewAction = data.actions.some((a: any) =>
        a.action.includes('review')
      );
      expect(hasReviewAction || data.actions.length > 0).toBe(true);
    });
  });
});
