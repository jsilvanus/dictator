/**
 * Tests for Paragraph Provenance Service
 */

import { describe, it, expect } from 'vitest';
import { ParagraphProvenanceService } from '@/lib/provenance/paragraph-provenance-service';
import { generateParagraphId } from '@/lib/provenance/paragraph-id';

describe('Paragraph Provenance Service', () => {
  const documentId = 'doc-123';
  const userId = 'user-456';
  const device = 'web';

  describe('createParagraph', () => {
    it('should create paragraph with initial event', () => {
      const content = 'The service begins at 10.';
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        content,
        'human-dictated',
        { device, userId }
      );

      expect(provenance.documentId).toBe(documentId);
      expect(provenance.paragraphId).toMatch(/^p_/);
      expect(provenance.currentContent).toBe(content);
      expect(provenance.events).toHaveLength(1);
      expect(provenance.events[0].eventType).toBe('human-dictated');
      expect(provenance.events[0].source).toBe('human-dictated');
    });

    it('should use provided paragraph ID', () => {
      const paragraphId = generateParagraphId();
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        paragraphId,
        'content',
        'human-written',
        { device, userId }
      );

      expect(provenance.paragraphId).toBe(paragraphId);
    });

    it('should compute content hash', () => {
      const content = 'Test content';
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        content,
        'human-written',
        { device, userId }
      );

      expect(provenance.currentContentHash).toMatch(/^[a-f0-9]{64}$/);
      // Verify hash is correct
      const event = provenance.events[0];
      expect(event.contentHash).toBe(provenance.currentContentHash);
    });

    it('should include AI metadata for AI-generated content', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'AI generated text',
        'ai-generated',
        {
          device,
          userId,
          aiSessionId: 'session-789',
          aiTurnId: 'turn-001',
          confidence: 0.85,
          selectionScope: 'full-document',
        }
      );

      const event = provenance.events[0];
      expect(event.eventType).toBe('ai-generation');
      expect(event.aiSessionId).toBe('session-789');
      expect(event.aiTurnId).toBe('turn-001');
      expect(event.confidence).toBe(0.85);
      expect(event.selectionScope).toBe('full-document');
    });

    it('should set timestamps', () => {
      const before = Date.now();
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'human-written',
        { device, userId }
      );
      const after = Date.now();

      expect(provenance.createdAt).toBeGreaterThanOrEqual(before);
      expect(provenance.createdAt).toBeLessThanOrEqual(after);
      expect(provenance.events[0].timestamp).toBe(provenance.createdAt);
    });
  });

  describe('recordEdit', () => {
    it('should add new event to history', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'original',
        'human-written',
        { device, userId }
      );

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'modified',
        'human-edit',
        {
          device,
          userId,
          source: 'human-written',
        }
      );

      expect(provenance.events).toHaveLength(2);
      expect(provenance.events[1].eventType).toBe('human-edit');
    });

    it('should update current hash', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'original',
        'human-written',
        { device, userId }
      );
      const originalHash = provenance.currentContentHash;

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'different content',
        'human-edit',
        {
          device,
          userId,
          source: 'human-written',
        }
      );

      expect(provenance.currentContentHash).not.toBe(originalHash);
      expect(provenance.currentContentHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should track previous hash', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'original',
        'human-written',
        { device, userId }
      );
      const originalHash = provenance.currentContentHash;

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'modified',
        'human-edit',
        {
          device,
          userId,
          source: 'human-written',
        }
      );

      expect(provenance.events[1].previousHash).toBe(originalHash);
    });

    it('should handle AI modifications', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'original',
        'human-written',
        { device, userId }
      );

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'improved by AI',
        'ai-modification',
        {
          device,
          userId,
          source: 'ai-modified',
          aiSessionId: 'session-abc',
          aiTurnId: 'turn-def',
          confidence: 0.75,
        }
      );

      const aiEvent = provenance.events[1];
      expect(aiEvent.eventType).toBe('ai-modification');
      expect(aiEvent.confidence).toBe(0.75);
    });
  });

  describe('recordCopyPaste', () => {
    it('should create new paragraph from copy-paste', () => {
      const sourceParagraphId = generateParagraphId();
      const provenance = ParagraphProvenanceService.recordCopyPaste(
        sourceParagraphId,
        null,
        'copied content',
        { device, userId, documentId }
      );

      expect(provenance.paragraphId).not.toBe(sourceParagraphId);
      expect(provenance.events).toHaveLength(1);
      expect(provenance.events[0].eventType).toBe('copy-paste');
      expect(provenance.events[0].originFromParagraphId).toBe(sourceParagraphId);
    });

    it('should use provided paragraph ID', () => {
      const sourceParagraphId = generateParagraphId();
      const newParagraphId = generateParagraphId();
      
      const provenance = ParagraphProvenanceService.recordCopyPaste(
        sourceParagraphId,
        newParagraphId,
        'content',
        { device, userId, documentId }
      );

      expect(provenance.paragraphId).toBe(newParagraphId);
    });
  });

  describe('verifyContent', () => {
    it('should verify matching content', () => {
      const content = 'The service begins at 10.';
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        content,
        'human-written',
        { device, userId }
      );

      expect(ParagraphProvenanceService.verifyContent(content, provenance)).toBe(true);
    });

    it('should reject modified content', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'original',
        'human-written',
        { device, userId }
      );

      expect(ParagraphProvenanceService.verifyContent('modified', provenance)).toBe(false);
    });

    it('should handle whitespace normalization', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'hello world',
        'human-written',
        { device, userId }
      );

      expect(ParagraphProvenanceService.verifyContent('  hello world  ', provenance)).toBe(true);
    });
  });

  describe('summarize', () => {
    it('should generate summary from provenance', () => {
      const provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'human-written',
        { device, userId }
      );

      const summary = ParagraphProvenanceService.summarize(provenance);

      expect(summary.paragraphId).toBe(provenance.paragraphId);
      expect(summary.contentHash).toBe(provenance.currentContentHash);
      expect(summary.hasAiContent).toBe(false);
      expect(summary.isReviewed).toBe(false);
      expect(summary.currentSource).toBe('human-written');
    });

    it('should detect AI content', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'ai-generated',
        {
          device,
          userId,
          confidence: 0.9,
        }
      );

      const summary = ParagraphProvenanceService.summarize(provenance);

      expect(summary.hasAiContent).toBe(true);
      expect(summary.aiConfidence).toBe(0.9);
    });

    it('should detect reviewed content', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content',
        'ai-generated',
        { device, userId }
      );

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'content',
        'human-acceptance',
        {
          device,
          userId,
          source: 'ai-generated',
          reviewedAt: Date.now(),
          reviewedBy: userId,
        }
      );

      const summary = ParagraphProvenanceService.summarize(provenance);

      expect(summary.isReviewed).toBe(true);
    });

    it('should count events by type', () => {
      let provenance = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'v1',
        'human-written',
        { device, userId }
      );

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'v2',
        'human-edit',
        { device, userId, source: 'human-written' }
      );

      provenance = ParagraphProvenanceService.recordEdit(
        provenance,
        'v3',
        'human-edit',
        { device, userId, source: 'human-written' }
      );

      const summary = ParagraphProvenanceService.summarize(provenance);

      expect(summary.eventCounts['human-written']).toBe(1);
      expect(summary.eventCounts['human-edit']).toBe(2);
    });
  });

  describe('query', () => {
    it('should filter by event type', () => {
      let p1 = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content1',
        'human-written',
        { device, userId }
      );

      let p2 = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content2',
        'ai-generated',
        { device, userId }
      );

      const results = ParagraphProvenanceService.query([p1, p2], {
        eventType: 'ai-generation',
      });

      expect(results).toHaveLength(1);
      expect(results[0].paragraphId).toBe(p2.paragraphId);
    });

    it('should filter by source', () => {
      const p1 = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'human content',
        'human-written',
        { device, userId }
      );

      const p2 = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'ai content',
        'ai-generated',
        { device, userId }
      );

      const results = ParagraphProvenanceService.query([p1, p2], {
        hasAiContent: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].paragraphId).toBe(p2.paragraphId);
    });

    it('should filter by user', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      const p1 = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content1',
        'human-written',
        { device, userId: user1 }
      );

      const p2 = ParagraphProvenanceService.createParagraph(
        documentId,
        null,
        'content2',
        'human-written',
        { device, userId: user2 }
      );

      const results = ParagraphProvenanceService.query([p1, p2], {
        userId: user1,
      });

      expect(results).toHaveLength(1);
      expect(results[0].events[0].userId).toBe(user1);
    });
  });
});
