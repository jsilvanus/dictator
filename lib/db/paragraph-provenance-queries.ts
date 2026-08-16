/**
 * Database Service Layer for Paragraph Provenance
 * 
 * Drizzle ORM queries for persisting and retrieving paragraph provenances.
 * Integrates with existing database schema defined in migrations 0015 and 0016.
 */

import { and, desc, eq, gt, inArray,lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import { c2pa_manifests, export_history, paragraph_provenance_events, paragraph_provenances } from '@/lib/db/schema';
import type {
  C2PAManifest,
  ParagraphProvenance,
  ParagraphProvenanceEvent,
  ProvenanceQuery,
} from '@/lib/provenance/types';

/**
 * Database service for paragraph provenance operations.
 * 
 * Handles persistence and retrieval of provenance data.
 * All queries are user-scoped to ensure privacy.
 */
export class ParagraphProvenanceRepository {
  /**
   * Save a paragraph provenance to the database.
   * 
   * Performs an upsert: if the paragraph exists, updates it;
   * otherwise creates a new record.
   */
  static async saveParagraph(
    provenance: ParagraphProvenance,
    userId: string
  ): Promise<ParagraphProvenance> {
    // First, save or update the main provenance record
    const existingRecord = await db
      .select()
      .from(paragraph_provenances)
      .where(
        and(
          eq(paragraph_provenances.paragraphId, provenance.paragraphId),
          eq(paragraph_provenances.userId, userId)
        )
      )
      .limit(1);

    if (existingRecord.length > 0) {
      // Update existing
      await db
        .update(paragraph_provenances)
        .set({
          documentId: provenance.documentId,
          currentContent: provenance.currentContent,
          currentContentHash: provenance.currentContentHash,
          updatedAt: new Date(),
        })
        .where(
          eq(paragraph_provenances.id, existingRecord[0].id)
        );
    } else {
      // Insert new
      await db.insert(paragraph_provenances).values({
        paragraphId: provenance.paragraphId,
        userId,
        documentId: provenance.documentId,
        parentParagraphId: provenance.parentParagraphId || null,
        currentContent: provenance.currentContent,
        currentContentHash: provenance.currentContentHash,
        createdAt: new Date(provenance.createdAt),
        updatedAt: new Date(),
      });
    }

    // Save all events
    for (const event of provenance.events) {
      await this.saveEvent(provenance.paragraphId, event, userId);
    }

    return provenance;
  }

  /**
   * Save a single provenance event.
   */
  private static async saveEvent(
    paragraphId: string,
    event: ParagraphProvenanceEvent,
    userId: string
  ): Promise<void> {
    // Get the paragraphProvenanceId for the foreign key
    const paragraphRecord = await db
      .select({ id: paragraph_provenances.id })
      .from(paragraph_provenances)
      .where(
        and(
          eq(paragraph_provenances.paragraphId, paragraphId),
          eq(paragraph_provenances.userId, userId)
        )
      )
      .limit(1);

    if (paragraphRecord.length === 0) {
      // Can't save event without parent provenance record
      return;
    }

    // Insert the event; duplicate detection relies on application logic
    // or database constraints if needed in the future.
    try {
      await db.insert(paragraph_provenance_events).values({
        paragraphProvenanceId: paragraphRecord[0].id,
        paragraphId,
        userId,
        eventType: event.eventType,
        timestamp: new Date(event.timestamp),
        contentHash: event.contentHash,
        contentHashAlgorithm: event.contentHashAlgorithm,
        source: event.source,
        device: event.device,
        contentHashAfterEvent: event.contentHashAfterEvent ?? null,
        previousHash: event.previousHash ?? null,
        metadata: event.metadata || {},
        description: event.description ?? null,
        confidence: event.confidence !== undefined ? event.confidence.toString() : null,
        selectionScope: event.selectionScope ?? null,
        aiSessionId: event.aiSessionId ?? null,
        aiTurnId: event.aiTurnId ?? null,
        originFromParagraphId: event.originFromParagraphId ?? null,
        reviewedAt: event.reviewedAt ? new Date(event.reviewedAt) : null,
        reviewedBy: event.reviewedBy ?? null,
      });
    } catch {
      // Silently ignore duplicate inserts; this can happen if the same
      // event is saved twice. In production, you might want to log this.
    }
  }

  /**
   * Retrieve a paragraph provenance by ID.
   */
  static async getParagraph(
    paragraphId: string,
    userId: string
  ): Promise<ParagraphProvenance | null> {
    const record = await db
      .select()
      .from(paragraph_provenances)
      .where(
        and(
          eq(paragraph_provenances.paragraphId, paragraphId),
          eq(paragraph_provenances.userId, userId)
        )
      )
      .limit(1);

    if (record.length === 0) {
      return null;
    }

    const events = await this.getEvents(paragraphId, userId);

    return {
      paragraphId: record[0].paragraphId,
      documentId: record[0].documentId,
      parentParagraphId: record[0].parentParagraphId ?? undefined,
      currentContent: record[0].currentContent ?? undefined,
      currentContentHash: record[0].currentContentHash,
      createdAt: record[0].createdAt.getTime(),
      updatedAt: record[0].updatedAt.getTime(),
      events,
    };
  }

  /**
   * Retrieve all paragraphs for a document.
   */
  static async getDocumentParagraphs(
    documentId: string,
    userId: string
  ): Promise<ParagraphProvenance[]> {
    const records = await db
      .select()
      .from(paragraph_provenances)
      .where(
        and(
          eq(paragraph_provenances.documentId, documentId),
          eq(paragraph_provenances.userId, userId)
        )
      )
      .orderBy(desc(paragraph_provenances.createdAt));

    const paragraphs: ParagraphProvenance[] = [];

    for (const record of records) {
      const events = await this.getEvents(record.paragraphId, userId);
      paragraphs.push({
        paragraphId: record.paragraphId,
        documentId: record.documentId,
        parentParagraphId: record.parentParagraphId ?? undefined,
        currentContent: record.currentContent ?? undefined,
        currentContentHash: record.currentContentHash,
        createdAt: record.createdAt.getTime(),
        updatedAt: record.updatedAt.getTime(),
        events,
      });
    }

    return paragraphs;
  }

  /**
   * Get all events for a paragraph.
   */
  private static async getEvents(
    paragraphId: string,
    userId: string
  ): Promise<ParagraphProvenanceEvent[]> {
    const records = await db
      .select()
      .from(paragraph_provenance_events)
      .where(
        and(
          eq(paragraph_provenance_events.paragraphId, paragraphId),
          eq(paragraph_provenance_events.userId, userId)
        )
      )
      .orderBy(desc(paragraph_provenance_events.timestamp));

    return records.map((record) => ({
      eventType: record.eventType as ParagraphProvenanceEvent['eventType'],
      timestamp: record.timestamp.getTime(),
      contentHash: record.contentHash,
      contentHashAlgorithm: record.contentHashAlgorithm as 'sha256',
      previousHash: record.previousHash ?? undefined,
      contentHashAfterEvent: record.contentHashAfterEvent ?? undefined,
      metadata: (record.metadata as Record<string, unknown>) || {},
      description: record.description ?? undefined,
      source: record.source as import('@/lib/privacy/types').AiContentSource,
      confidence: record.confidence ? Number(record.confidence) : undefined,
      device: record.device,
      userId: record.userId,
    }));
  }

  /**
   * Query paragraphs by provenance criteria.
   */
  static async queryParagraphs(
    query: ProvenanceQuery,
    userId: string
  ): Promise<ParagraphProvenance[]> {
    // Build conditions array for single where() call
    const conditions: Parameters<typeof and>[0][] = [
      eq(paragraph_provenances.userId, userId)
    ];

    if (query.documentId) {
      conditions.push(eq(paragraph_provenances.documentId, query.documentId));
    }

    if (query.eventTypes && query.eventTypes.length > 0) {
      // Need to join with events table to filter by event types
      const matchingParagraphs = await db
        .selectDistinct({ paragraphId: paragraph_provenance_events.paragraphId })
        .from(paragraph_provenance_events)
        .where(
          and(
            inArray(paragraph_provenance_events.eventType, query.eventTypes),
            eq(paragraph_provenance_events.userId, userId)
          )
        );

      if (matchingParagraphs.length === 0) {
        return [];
      }

      const paragraphIds = matchingParagraphs.map((p) => p.paragraphId);
      conditions.push(inArray(paragraph_provenances.paragraphId, paragraphIds));
    }

    if (query.since) {
      conditions.push(
        gt(paragraph_provenances.createdAt, new Date(query.since))
      );
    }

    if (query.until) {
      conditions.push(
        lt(paragraph_provenances.createdAt, new Date(query.until))
      );
    }

    const records = await db
      .select()
      .from(paragraph_provenances)
      .where(and(...conditions))
      .orderBy(desc(paragraph_provenances.createdAt));

    const paragraphs: ParagraphProvenance[] = [];
    for (const record of records) {
      const events = await this.getEvents(record.paragraphId, userId);
      paragraphs.push({
        paragraphId: record.paragraphId,
        documentId: record.documentId,
        parentParagraphId: record.parentParagraphId ?? undefined,
        currentContent: record.currentContent ?? undefined,
        currentContentHash: record.currentContentHash,
        createdAt: record.createdAt.getTime(),
        updatedAt: record.updatedAt.getTime(),
        events,
      });
    }

    return paragraphs;
  }

  /**
   * Save a C2PA manifest.
   */
  static async saveManifest(
    documentId: string,
    manifest: C2PAManifest,
    exportFormat: string,
    userId: string
  ): Promise<void> {
    await db.insert(c2pa_manifests).values({
      documentId,
      userId,
      format: exportFormat,
      documentVersion: manifest.documentVersion || 1,
      manifestJson: manifest.manifestJson,
      contentHash: manifest.contentHash,
      contentHashAlgorithm: manifest.contentHashAlgorithm || 'sha256',
      status: manifest.status || 'unsigned',
      createdAt: new Date(),
    });
  }

  /**
   * Get the latest C2PA manifest for a document.
   */
  static async getLatestManifest(
    documentId: string,
    userId: string
  ): Promise<C2PAManifest | null> {
    const records = await db
      .select()
      .from(c2pa_manifests)
      .where(
        and(
          eq(c2pa_manifests.documentId, documentId),
          eq(c2pa_manifests.userId, userId)
        )
      )
      .orderBy(desc(c2pa_manifests.createdAt))
      .limit(1);

    if (records.length === 0) {
      return null;
    }

    return JSON.parse(JSON.stringify(records[0].manifestJson)) as C2PAManifest;
  }

  /**
   * Get export history for a document.
   */
  static async getExportHistory(
    documentId: string,
    userId: string
  ): Promise<
    Array<{
      exportFormat: string;
      exportedAt: Date;
    }>
  > {
    const records = await db
      .select({
        exportFormat: export_history.exportFormat,
        exportedAt: export_history.exportedAt,
      })
      .from(export_history)
      .where(
        and(
          eq(export_history.documentId, documentId),
          eq(export_history.userId, userId)
        )
      )
      .orderBy(desc(export_history.exportedAt));

    return records;
  }

  /**
   * Delete all provenance for a document (e.g., when document is deleted).
   */
  static async deleteDocumentProvenance(
    documentId: string,
    userId: string
  ): Promise<void> {
    // Get all paragraph IDs for the document
    const paragraphs = await db
      .select({ paragraphId: paragraph_provenances.paragraphId })
      .from(paragraph_provenances)
      .where(
        and(
          eq(paragraph_provenances.documentId, documentId),
          eq(paragraph_provenances.userId, userId)
        )
      );

    const paragraphIds = paragraphs.map((p) => p.paragraphId);

    if (paragraphIds.length > 0) {
      // Delete events
      await db
        .delete(paragraph_provenance_events)
        .where(
          and(
            inArray(paragraph_provenance_events.paragraphId, paragraphIds),
            eq(paragraph_provenance_events.userId, userId)
          )
        );
    }

    // Delete provenances
    await db
      .delete(paragraph_provenances)
      .where(
        and(
          eq(paragraph_provenances.documentId, documentId),
          eq(paragraph_provenances.userId, userId)
        )
      );

    // Delete manifests
    await db
      .delete(c2pa_manifests)
      .where(
        and(
          eq(c2pa_manifests.documentId, documentId),
          eq(c2pa_manifests.userId, userId)
        )
      );
  }

  /**
   * Check if a paragraph exists (for deduplication/update detection).
   */
  static async paragraphExists(
    paragraphId: string,
    userId: string
  ): Promise<boolean> {
    const record = await db
      .select({ id: paragraph_provenances.id })
      .from(paragraph_provenances)
      .where(
        and(
          eq(paragraph_provenances.paragraphId, paragraphId),
          eq(paragraph_provenances.userId, userId)
        )
      )
      .limit(1);

    return record.length > 0;
  }
}
