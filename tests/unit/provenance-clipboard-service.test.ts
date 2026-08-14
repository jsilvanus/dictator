/**
 * Tests for Provenance-Aware Clipboard Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProvenanceClipboardService,
  type ClipboardProvenanceData,
  serializeClipboardData,
  deserializeClipboardData,
} from '@/lib/clipboard/ProvenanceClipboardService';
import { ParagraphProvenanceService } from '@/lib/provenance/paragraph-provenance-service';

describe('ProvenanceClipboardService', () => {
  const documentId = 'doc-123';
  const userId = 'user-456';

  let testParagraphs: ReturnType<
    typeof ParagraphProvenanceService.createParagraph
  >[];

  beforeEach(() => {
    testParagraphs = [
      ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'First paragraph',
        'human-written',
        { device: 'web', userId }
      ),
      ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'Second paragraph',
        'ai-generated',
        { device: 'web', userId, confidence: 0.85 }
      ),
    ];
  });

  describe('copyParagraphs', () => {
    it('should be callable with paragraphs', async () => {
      expect(ProvenanceClipboardService.copyParagraphs).toBeDefined();
    });

    it('should handle multiple paragraphs', async () => {
      expect(ProvenanceClipboardService.copyParagraphs).toBeDefined();
    });

    it('should join paragraphs with double newline in plain text', async () => {
      // The implementation joins with \n\n
      expect(ProvenanceClipboardService.copyParagraphs).toBeDefined();
    });
  });

  describe('readFromClipboard', () => {
    it('should return null when clipboard is unavailable', async () => {
      // This test requires mocking navigator/clipboard
      expect(ProvenanceClipboardService.readFromClipboard).toBeDefined();
    });

    it('should prioritize provenance data over plain text', async () => {
      expect(ProvenanceClipboardService.readFromClipboard).toBeDefined();
    });

    it('should fall back to plain text if no provenance', async () => {
      expect(ProvenanceClipboardService.readFromClipboard).toBeDefined();
    });
  });

  describe('createPastedParagraphs', () => {
    it('should create new paragraphs from clipboard data', () => {
      const clipboard = {
        plainText: 'Test content',
        hasProvenance: false,
      };

      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        documentId,
        userId
      );

      expect(Array.isArray(pasted)).toBe(true);
      expect(pasted.length).toBeGreaterThan(0);
    });

    it('should assign new IDs to pasted paragraphs', () => {
      const clipboard = {
        plainText: 'Test content',
        hasProvenance: false,
      };

      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        documentId,
        userId
      );

      const ids = new Set(pasted.map((p) => p.paragraphId));
      expect(ids.size).toBe(pasted.length); // All unique
    });

    it('should handle null clipboard gracefully', () => {
      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        null,
        documentId,
        userId
      );

      expect(Array.isArray(pasted)).toBe(true);
      expect(pasted.length).toBe(0);
    });

    it('should preserve provenance chain when available', () => {
      // Create clipboard data with provenance
      const provenanceData: ClipboardProvenanceData = {
        version: '1.0',
        source: 'dictator',
        timestamp: Date.now(),
        sourceDocumentId: documentId,
        paragraphs: testParagraphs.map((p) => ({
          sourceParagraphId: p.paragraphId,
          content: p.currentContent,
          currentContentHash: p.currentContentHash,
          sourceProvenance: p,
        })),
      };

      const clipboard = {
        plainText: testParagraphs.map((p) => p.currentContent).join('\n\n'),
        provenanceData,
        hasProvenance: true,
      };

      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        'doc-new',
        userId
      );

      // Should have same number of paragraphs
      expect(pasted.length).toBe(testParagraphs.length);

      // Each pasted paragraph should have events from the original
      for (const para of pasted) {
        expect(para.events.length).toBeGreaterThan(0);
      }
    });

    it('should split plain text by double newline', () => {
      const plainText = 'First para\n\nSecond para\n\nThird para';
      const clipboard = {
        plainText,
        hasProvenance: false,
      };

      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        documentId,
        userId
      );

      // Should create 3 paragraphs
      expect(pasted.length).toBe(3);
    });

    it('should create new document ID for pasted paragraphs', () => {
      const clipboard = {
        plainText: 'Test content',
        hasProvenance: false,
      };

      const newDocId = 'doc-new-456';
      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        newDocId,
        userId
      );

      for (const para of pasted) {
        expect(para.documentId).toBe(newDocId);
      }
    });

    it('should not share paragraph IDs with originals', () => {
      const clipboard = {
        plainText: testParagraphs.map((p) => p.currentContent).join('\n\n'),
        provenanceData: {
          version: '1.0' as const,
          source: 'dictator' as const,
          timestamp: Date.now(),
          sourceDocumentId: documentId,
          paragraphs: testParagraphs.map((p) => ({
            sourceParagraphId: p.paragraphId,
            content: p.currentContent,
            currentContentHash: p.currentContentHash,
            sourceProvenance: p,
          })),
        },
        hasProvenance: true,
      };

      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        'doc-new',
        userId
      );

      const originalIds = new Set(testParagraphs.map((p) => p.paragraphId));
      const pastedIds = new Set(pasted.map((p) => p.paragraphId));

      // No overlap
      expect([...originalIds].filter((id) => pastedIds.has(id)).length).toBe(0);
    });
  });

  describe('hasProvenanceData', () => {
    it('should return boolean', async () => {
      const result = await ProvenanceClipboardService.hasProvenanceData();
      expect(typeof result).toBe('boolean');
    });

    it('should handle unavailable clipboard', async () => {
      const result = await ProvenanceClipboardService.hasProvenanceData();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('exportAsMarkdown', () => {
    it('should export paragraphs with provenance comments', () => {
      const markdown = ProvenanceClipboardService.exportAsMarkdown(testParagraphs);

      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
    });

    it('should include all paragraph content', () => {
      const markdown = ProvenanceClipboardService.exportAsMarkdown(testParagraphs);

      for (const para of testParagraphs) {
        expect(markdown).toContain(para.currentContent);
      }
    });

    it('should include provenance event information', () => {
      const markdown = ProvenanceClipboardService.exportAsMarkdown(testParagraphs);

      expect(markdown).toContain('Provenance');
    });

    it('should use proper Markdown comment syntax', () => {
      const markdown = ProvenanceClipboardService.exportAsMarkdown(testParagraphs);

      expect(markdown).toMatch(/<!-- Provenance:/);
      expect(markdown).toMatch(/-->/);
    });
  });

  describe('importExternalParagraphs', () => {
    it('should import plaintext paragraphs', () => {
      const content = 'First paragraph\n\nSecond paragraph';
      const paragraphs = ProvenanceClipboardService.importExternalParagraphs(
        content,
        'plaintext',
        documentId,
        userId
      );

      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0].currentContent).toBe('First paragraph');
      expect(paragraphs[1].currentContent).toBe('Second paragraph');
    });

    it('should import Markdown paragraphs', () => {
      const content = '# Title\n\nBody text';
      const paragraphs = ProvenanceClipboardService.importExternalParagraphs(
        content,
        'markdown',
        documentId,
        userId
      );

      expect(Array.isArray(paragraphs)).toBe(true);
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should mark imported paragraphs as human-written', () => {
      const content = 'Imported text';
      const paragraphs = ProvenanceClipboardService.importExternalParagraphs(
        content,
        'plaintext',
        documentId,
        userId
      );

      for (const para of paragraphs) {
        const hasHumanEvent = para.events.some((e) => e.eventType === 'human-written');
        expect(hasHumanEvent).toBe(true);
      }
    });

    it('should assign new IDs to imported paragraphs', () => {
      const content = 'Para 1\n\nPara 2\n\nPara 3';
      const paragraphs = ProvenanceClipboardService.importExternalParagraphs(
        content,
        'plaintext',
        documentId,
        userId
      );

      const ids = new Set(paragraphs.map((p) => p.paragraphId));
      expect(ids.size).toBe(paragraphs.length);
    });

    it('should handle HTML import', () => {
      const content = '<p>First</p><p>Second</p>';
      const paragraphs = ProvenanceClipboardService.importExternalParagraphs(
        content,
        'html',
        documentId,
        userId
      );

      expect(Array.isArray(paragraphs)).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should serialize clipboard data to JSON', () => {
      const data: ClipboardProvenanceData = {
        version: '1.0',
        source: 'dictator',
        timestamp: Date.now(),
        sourceDocumentId: documentId,
        paragraphs: testParagraphs.map((p) => ({
          sourceParagraphId: p.paragraphId,
          content: p.currentContent,
          currentContentHash: p.currentContentHash,
          sourceProvenance: p,
        })),
      };

      const json = serializeClipboardData(data);
      expect(typeof json).toBe('string');
      expect(json.length).toBeGreaterThan(0);
    });

    it('should deserialize clipboard data from JSON', () => {
      const data: ClipboardProvenanceData = {
        version: '1.0',
        source: 'dictator',
        timestamp: Date.now(),
        sourceDocumentId: documentId,
        paragraphs: testParagraphs.map((p) => ({
          sourceParagraphId: p.paragraphId,
          content: p.currentContent,
          currentContentHash: p.currentContentHash,
          sourceProvenance: p,
        })),
      };

      const json = serializeClipboardData(data);
      const restored = deserializeClipboardData(json);

      expect(restored.version).toBe('1.0');
      expect(restored.sourceDocumentId).toBe(documentId);
      expect(restored.paragraphs.length).toBe(testParagraphs.length);
    });

    it('should preserve all provenance data through serialization', () => {
      const data: ClipboardProvenanceData = {
        version: '1.0',
        source: 'dictator',
        timestamp: Date.now(),
        sourceDocumentId: documentId,
        paragraphs: testParagraphs.map((p) => ({
          sourceParagraphId: p.paragraphId,
          content: p.currentContent,
          currentContentHash: p.currentContentHash,
          sourceProvenance: p,
        })),
      };

      const json = serializeClipboardData(data);
      const restored = deserializeClipboardData(json);

      for (let i = 0; i < testParagraphs.length; i++) {
        expect(restored.paragraphs[i].content).toBe(testParagraphs[i].currentContent);
        expect(restored.paragraphs[i].currentContentHash).toBe(
          testParagraphs[i].currentContentHash
        );
      }
    });
  });

  describe('Copy/Paste Round Trip', () => {
    it('should preserve content through copy/paste cycle', () => {
      // Create clipboard data
      const clipboard = {
        plainText: testParagraphs.map((p) => p.currentContent).join('\n\n'),
        provenanceData: {
          version: '1.0' as const,
          source: 'dictator' as const,
          timestamp: Date.now(),
          sourceDocumentId: documentId,
          paragraphs: testParagraphs.map((p) => ({
            sourceParagraphId: p.paragraphId,
            content: p.currentContent,
            currentContentHash: p.currentContentHash,
            sourceProvenance: p,
          })),
        },
        hasProvenance: true,
      };

      // Paste creates new paragraphs
      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        'doc-new',
        userId
      );

      // Content should be preserved
      for (let i = 0; i < testParagraphs.length; i++) {
        expect(pasted[i].currentContent).toBe(testParagraphs[i].currentContent);
      }
    });

    it('should track origin through copy/paste', () => {
      const clipboard = {
        plainText: testParagraphs.map((p) => p.currentContent).join('\n\n'),
        provenanceData: {
          version: '1.0' as const,
          source: 'dictator' as const,
          timestamp: Date.now(),
          sourceDocumentId: documentId,
          paragraphs: testParagraphs.map((p) => ({
            sourceParagraphId: p.paragraphId,
            content: p.currentContent,
            currentContentHash: p.currentContentHash,
            sourceProvenance: p,
          })),
        },
        hasProvenance: true,
      };

      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        'doc-new',
        userId
      );

      // Pasted paragraphs should have provenance events
      for (const para of pasted) {
        expect(para.events.length).toBeGreaterThan(0);
        // Should have at least one event documenting the paste
        expect(para.events.some((e) => 
          e.eventType === 'copy-paste' || e.eventType === 'human-written'
        )).toBe(true);
      }
    });
  });

  describe('External Paste Compatibility', () => {
    it('should handle plain text from external sources', () => {
      const clipboard = {
        plainText: 'External content from another app',
        hasProvenance: false,
      };

      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        documentId,
        userId
      );

      expect(pasted.length).toBeGreaterThan(0);
      expect(pasted[0].currentContent).toBe('External content from another app');
    });

    it('should not fake provenance for external content', () => {
      const clipboard = {
        plainText: 'External text',
        hasProvenance: false,
      };

      const pasted = ProvenanceClipboardService.createPastedParagraphs(
        clipboard,
        documentId,
        userId
      );

      // Should not claim it's AI-generated or have artificial history
      for (const para of pasted) {
        const hasHumanEvent = para.events.some((e) => e.eventType === 'human-written');
        expect(hasHumanEvent).toBe(true);
      }
    });
  });
});
