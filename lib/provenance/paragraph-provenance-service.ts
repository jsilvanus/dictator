/**
 * Paragraph Provenance Service
 * 
 * Manages paragraph-level provenance tracking and queries.
 * Coordinates between document model and provenance events.
 */

import type {
  ParagraphProvenance,
  ParagraphProvenanceEvent,
  ParagraphProvenanceEventType,
  ParagraphProvenanceSummary,
  ParagraphProvenanceQuery,
} from '@/lib/provenance/types';
import { hashContent } from '@/lib/provenance/content-hashing';
import { generateParagraphId, type ParagraphId } from '@/lib/provenance/paragraph-id';
import type { AiContentSource, AiRequestScope } from '@/lib/privacy/types';

/**
 * Paragraph Provenance Service
 * 
 * Handles all paragraph-level provenance operations:
 * - Recording provenance events
 * - Querying provenance history
 * - Generating summaries for export
 * - Validating content against hashes
 */
export class ParagraphProvenanceService {
  /**
   * Create a new paragraph with initial provenance.
   * 
   * @param documentId - Document ID
   * @param paragraphId - Paragraph ID (will generate if not provided)
   * @param content - Initial paragraph text
   * @param source - Source of content (human/AI)
   * @param metadata - Additional metadata (device, user, etc.)
   * @returns New ParagraphProvenance record
   */
  static createParagraph(
    documentId: string,
    paragraphId: ParagraphId | null,
    content: string,
    source: AiContentSource,
    metadata: {
      device: string;
      userId: string;
      aiSessionId?: string;
      aiTurnId?: string;
      confidence?: number;
      selectionScope?: AiRequestScope;
    }
  ): ParagraphProvenance {
    const id = paragraphId || generateParagraphId();
    const contentHash = hashContent(content);
    const now = Date.now();

    const provenance: ParagraphProvenance = {
      documentId,
      paragraphId: id,
      currentContentHash: contentHash,
      currentContent: content,
      events: [
        {
          timestamp: now,
          eventType: this.sourceToEventType(source),
          contentHash,
          contentHashAlgorithm: 'sha256',
          source,
          confidence: metadata.confidence,
          device: metadata.device,
          userId: metadata.userId,
          aiSessionId: metadata.aiSessionId,
          aiTurnId: metadata.aiTurnId,
          selectionScope: metadata.selectionScope,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    return provenance;
  }

  /**
   * Record an edit to a paragraph.
   * 
   * Adds an event to the provenance history.
   * 
   * @param provenance - Existing provenance
   * @param newContent - New paragraph content
   * @param eventType - Type of change
   * @param metadata - Event metadata
   * @returns Updated provenance with new event
   */
  static recordEdit(
    provenance: ParagraphProvenance,
    newContent: string,
    eventType: ParagraphProvenanceEventType,
    metadata: {
      device: string;
      userId: string;
      source: AiContentSource;
      aiSessionId?: string;
      aiTurnId?: string;
      confidence?: number;
      selectionScope?: AiRequestScope;
      reviewedAt?: number;
      reviewedBy?: string;
    }
  ): ParagraphProvenance {
    const newHash = hashContent(newContent);
    const previousHash = provenance.currentContentHash;
    const now = Date.now();

    const event: ParagraphProvenanceEvent = {
      timestamp: now,
      eventType,
      contentHash: newHash,
      contentHashAlgorithm: 'sha256',
      previousHash,
      source: metadata.source,
      confidence: metadata.confidence,
      device: metadata.device,
      userId: metadata.userId,
      aiSessionId: metadata.aiSessionId,
      aiTurnId: metadata.aiTurnId,
      selectionScope: metadata.selectionScope,
      reviewedAt: metadata.reviewedAt,
      reviewedBy: metadata.reviewedBy,
    };

    return {
      ...provenance,
      currentContentHash: newHash,
      currentContent: newContent,
      events: [...provenance.events, event],
      updatedAt: now,
    };
  }

  /**
   * Record a copy/paste event.
   * 
   * When a paragraph is copied from source and pasted as new paragraph,
   * track the origin linkage.
   * 
   * @param sourceParagraphId - ID of source paragraph
   * @param newParagraphId - ID of new (pasted) paragraph
   * @param content - Content of pasted paragraph
   * @param metadata - Event metadata
   * @returns New provenance for pasted paragraph
   */
  static recordCopyPaste(
    sourceParagraphId: ParagraphId,
    newParagraphId: ParagraphId | null,
    content: string,
    metadata: {
      device: string;
      userId: string;
      documentId: string;
    }
  ): ParagraphProvenance {
    const paragraphId = newParagraphId || generateParagraphId();
    const contentHash = hashContent(content);
    const now = Date.now();

    return {
      documentId: metadata.documentId,
      paragraphId,
      currentContentHash: contentHash,
      currentContent: content,
      events: [
        {
          timestamp: now,
          eventType: 'copy-paste',
          contentHash,
          contentHashAlgorithm: 'sha256',
          source: 'human-written', // Copy-paste is human action
          device: metadata.device,
          userId: metadata.userId,
          originFromParagraphId: sourceParagraphId,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Verify paragraph content against its hash.
   * 
   * @param content - Paragraph text to verify
   * @param provenance - Paragraph provenance (or just the hash)
   * @returns True if content matches current hash
   */
  static verifyContent(
    content: string,
    provenance: ParagraphProvenance | { currentContentHash: string }
  ): boolean {
    const computedHash = hashContent(content);
    return computedHash === provenance.currentContentHash;
  }

  /**
   * Generate a summary of paragraph provenance.
   * 
   * Useful for display and quick lookups without full event list.
   * 
   * @param provenance - Full provenance record
   * @returns Compact summary
   */
  static summarize(provenance: ParagraphProvenance): ParagraphProvenanceSummary {
    const eventCounts: Record<ParagraphProvenanceEventType, number> = {
      'human-dictated': 0,
      'human-written': 0,
      'human-edit': 0,
      'ai-generation': 0,
      'ai-modification': 0,
      'human-acceptance': 0,
      'human-rejection': 0,
      'copy-paste': 0,
    };

    provenance.events.forEach((event) => {
      if (event.eventType in eventCounts) {
        eventCounts[event.eventType]++;
      }
    });

    const hasAiContent =
      eventCounts['ai-generation'] > 0 || eventCounts['ai-modification'] > 0;
    const isReviewed = provenance.events.some((e) => e.reviewedAt);

    // Get latest event
    const latestEvent = provenance.events[provenance.events.length - 1];

    return {
      paragraphId: provenance.paragraphId,
      contentHash: provenance.currentContentHash,
      eventCounts: Object.fromEntries(
        Object.entries(eventCounts).filter(([, count]) => count > 0)
      ) as any,
      lastModified: provenance.updatedAt,
      hasAiContent,
      isReviewed,
      currentSource: latestEvent?.source || 'human-written',
      aiConfidence:
        latestEvent && latestEvent.confidence
          ? latestEvent.confidence
          : undefined,
    };
  }

  /**
   * Query provenances matching criteria.
   * 
   * @param provenances - Array of provenance records to filter
   * @param query - Query criteria
   * @returns Filtered provenances
   */
  static query(
    provenances: ParagraphProvenance[],
    query: ParagraphProvenanceQuery
  ): ParagraphProvenance[] {
    return provenances.filter((p) => {
      if (query.paragraphId && p.paragraphId !== query.paragraphId) {
        return false;
      }

      if (query.eventType) {
        const hasEventType = p.events.some((e) => e.eventType === query.eventType);
        if (!hasEventType) return false;
      }

      if (query.source) {
        const hasSource = p.events.some((e) => e.source === query.source);
        if (!hasSource) return false;
      }

      if (query.userId) {
        const hasUser = p.events.some((e) => e.userId === query.userId);
        if (!hasUser) return false;
      }

      if (query.aiSessionId) {
        const hasSession = p.events.some(
          (e) => e.aiSessionId === query.aiSessionId
        );
        if (!hasSession) return false;
      }

      if (query.hasAiContent !== undefined) {
        const hasAi = p.events.some(
          (e) =>
            e.eventType === 'ai-generation' ||
            e.eventType === 'ai-modification'
        );
        if (hasAi !== query.hasAiContent) return false;
      }

      if (query.isReviewed !== undefined) {
        const isReviewed = p.events.some((e) => e.reviewedAt);
        if (isReviewed !== query.isReviewed) return false;
      }

      return true;
    });
  }

  /**
   * Convert AiContentSource to ParagraphProvenanceEventType.
   * 
   * Maps existing AI provenance types to paragraph event types.
   * 
   * @param source - AI content source
   * @returns Paragraph event type
   */
  private static sourceToEventType(source: AiContentSource): ParagraphProvenanceEventType {
    switch (source) {
      case 'human-dictated':
        return 'human-dictated';
      case 'human-written':
        return 'human-written';
      case 'ai-generated':
        return 'ai-generation';
      case 'ai-modified':
        return 'ai-modification';
      default:
        return 'human-written';
    }
  }
}
