/**
 * Paragraph-Level Provenance Types
 * 
 * Extends the existing AI turn provenance with stable paragraph identity
 * and event-based provenance tracking.
 */

import type { AiContentSource, AiRequestScope } from '@/lib/privacy/types';
import type { ParagraphId } from '@/lib/provenance/paragraph-id';

/**
 * Event type for paragraph provenance tracking.
 * Records what happened to a paragraph over time.
 */
export type ParagraphProvenanceEventType =
  | 'human-dictated'      // Voice-dictated by user
  | 'human-written'       // Typed by user
  | 'human-edit'          // User edited existing content
  | 'ai-generation'       // AI generated from scratch
  | 'ai-modification'     // AI modified existing content
  | 'human-acceptance'    // User accepted/reviewed AI content
  | 'human-rejection'     // User rejected AI content
  | 'copy-paste'          // Content was copied and pasted;

/**
 * A single provenance event for a paragraph.
 * Events are immutable and form a chronological chain.
 */
export interface ParagraphProvenanceEvent {
  /** Unique event identifier */
  id?: string; // UUID, set by database

  /** When this event occurred */
  timestamp: number; // milliseconds since epoch

  /** What happened to the paragraph */
  eventType: ParagraphProvenanceEventType;

  /**
   * Current content hash at time of this event.
   * Algorithm: SHA-256 of canonical plaintext.
   */
  contentHash: string;

  /**
   * Hash algorithm used.
   * Currently always 'sha256'. Allows future migration.
   */
  contentHashAlgorithm: 'sha256';

  /**
   * Previous content hash (before this event).
   * Helps trace content evolution.
   */
  previousHash?: string;

  /**
   * Original source of content (before AI transformation).
   * Maps to existing AiContentSource enum.
   */
  source: AiContentSource;

  /**
   * Confidence level for AI-generated content (0-1).
   * Not provided for human-sourced content.
   */
  confidence?: number;

  /**
   * Scope of AI request that created this event.
   * Indicates if full document or just selection was used.
   */
  selectionScope?: AiRequestScope;

  /** Device that created this event */
  device: string;

  /** User ID who created this event */
  userId: string;

  /**
   * If this event relates to an AI session, the session ID.
   * Links this paragraph event to AI turn history.
   */
  aiSessionId?: string;

  /**
   * If this event relates to an AI turn, the turn ID.
   * Provides full linkage to detailed AI metadata.
   */
  aiTurnId?: string;

  /**
   * If this is a copy/paste event, the source paragraph ID.
   * Establishes provenance chain across paragraphs.
   */
  originFromParagraphId?: string;

  /**
   * When this paragraph was explicitly reviewed.
   * Different from 'acceptedAt' - explicit editorial review.
   */
  reviewedAt?: number;

  /** User ID of reviewer (if reviewed by someone other than creator) */
  reviewedBy?: string;
}

/**
 * Complete provenance history for a single paragraph.
 * Aggregates all events affecting this paragraph since creation.
 */
export interface ParagraphProvenance {
  /** Unique provenance record ID */
  id?: string; // UUID, set by database

  /** Document this paragraph belongs to */
  documentId: string;

  /**
   * Stable paragraph identifier.
   * Format: p_<uuid>
   * Remains constant even when content changes.
   */
  paragraphId: string;

  /**
   * Current content hash.
   * Updated whenever paragraph content changes.
   */
  currentContentHash: string;

  /**
   * Optional: cached plaintext content at current hash.
   * Useful for verification and display.
   * May be omitted to save storage.
   */
  currentContent?: string;

  /**
   * Complete chronological history of events affecting this paragraph.
   * Allows reconstruction of paragraph's evolution.
   */
  events: ParagraphProvenanceEvent[];

  /** When this provenance record was created */
  createdAt: number;

  /** When this provenance record was last updated */
  updatedAt: number;
}

/**
 * Query filter for paragraph provenance.
 * Used to search and filter provenance records.
 */
export interface ParagraphProvenanceQuery {
  /** Filter by document */
  documentId?: string;

  /** Filter by specific paragraph */
  paragraphId?: string;

  /** Filter by event type */
  eventType?: ParagraphProvenanceEventType;

  /** Filter by source (human/AI) */
  source?: AiContentSource;

  /** Filter by date range */
  fromTimestamp?: number;
  toTimestamp?: number;

  /** Filter by user ID */
  userId?: string;

  /** Filter by AI session ID */
  aiSessionId?: string;

  /** Only AI-generated/modified content */
  hasAiContent?: boolean;

  /** Only reviewed content */
  isReviewed?: boolean;
}

/**
 * Summary of a paragraph's provenance.
 * Compact representation for display and quick access.
 */
export interface ParagraphProvenanceSummary {
  paragraphId: string;
  contentHash: string;
  
  // Count of each event type
  eventCounts: {
    [key in ParagraphProvenanceEventType]?: number;
  };

  // Last event timestamp
  lastModified: number;

  // Has AI-generated content
  hasAiContent: boolean;

  // Has been reviewed
  isReviewed: boolean;

  // Latest source
  currentSource: AiContentSource;

  // If AI-generated, the confidence
  aiConfidence?: number;
}

/**
 * C2PA-compatible paragraph reference.
 * Used when generating C2PA manifests.
 */
export interface ParagraphC2PAReference {
  /** Paragraph ID */
  paragraphId: string;

  /** Text content at export time */
  content: string;

  /** Content hash at export time */
  contentHash: string;

  /**
   * Textual region using W3C Web Annotation Fragment Selector.
   * Format: "char=start,end" for character offsets.
   * Used in C2PA to identify which text was affected.
   */
  textualRegion?: string;

  /**
   * Relevant provenance events for C2PA.
   * May be filtered subset of all events.
   */
  relevantEvents: ParagraphProvenanceEvent[];

  /**
   * Primary C2PA action type based on dominant event.
   */
  primaryAction: 'c2pa.generated' | 'c2pa.modified' | 'c2pa.reviewed';
}
