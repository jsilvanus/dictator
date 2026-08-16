/**
 * C2PA Manifest Generation Service
 * 
 * Generates C2PA-compliant manifests from paragraph provenance data.
 * Creates standard C2PA structures suitable for signing and embedding.
 */

import { hashContent } from '@/lib/provenance/content-hashing';
import {
  createTextualRegionSelector,
  type TextualRegionSelector,
} from '@/lib/provenance/text-selectors';
import type { ParagraphC2PAReference, ParagraphProvenance } from '@/lib/provenance/types';

/**
 * C2PA Action representing a single provenance claim.
 * 
 * See C2PA specification for action types.
 */
export interface C2PAAction {
  /** Action type (e.g., 'c2pa.generated', 'c2pa.modified') */
  action: string;
  
  /** When action occurred (ISO 8601) */
  when?: string;
  
  /** Software agent information */
  softwareAgent?: {
    name: string;
    version?: string;
    comments?: string;
  };
  
  /** Actor who performed the action */
  actor?: {
    displayName: string;
    identifier?: string;
  };
  
  /** Detailed parameters */
  parameters?: Record<string, unknown>;
  
  /** Textual regions affected by this action */
  changes?: Array<{
    /** Description of change */
    description?: string;
    
    /** Textual region in W3C selector format */
    region?: TextualRegionSelector;
  }>;
}

/**
 * C2PA Assertion: A single claim about content.
 */
export interface C2PAAssertion {
  /** Label uniquely identifying this assertion */
  label: string;
  
  /** Assertion kind (e.g., 'urn:cai:assertions:c2pa.actions') */
  kind: string;
  
  /** The actual assertion data */
  data: unknown;
}

/**
 * C2PA Claim: Collection of assertions about a piece of content.
 */
export interface C2PAClaim {
  /** Claim signature (will be computed during signing) */
  signature?: string;
  
  /** List of assertions */
  assertions: C2PAAssertion[];
}

/**
 * C2PA Manifest (unsigned).
 * 
 * Ready for backend signing service.
 */
export interface C2PAManifest {
  /** Manifest specification version */
  specVersion: '2.0' | '2.1' | '2.4';
  
  /** When manifest was created (ISO 8601) */
  createdAt: string;
  
  /** Description of manifest content */
  description?: string;
  
  /** Software agent that created the manifest */
  generatedBy: {
    name: string;
    version: string;
  };
  
  /** The actual claims */
  claim: C2PAClaim;
  
  /** Hash binding to document content */
  contentBinding?: {
    hash: string;
    algorithm: string;
  };
}

/**
 * C2PA Manifest Generation Service
 */
export class C2PAManifestService {
  /**
   * Generate C2PA manifest from paragraph provenances.
   * 
   * Creates a C2PA manifest that documents the provenance history
   * of one or more paragraphs in a document.
   * 
   * @param paragraphs - Array of paragraph provenances
   * @param exportedContent - Full text of exported document
   * @param options - Generation options
   * @returns Unsigned C2PA manifest
   */
  static generateManifest(
    paragraphs: ParagraphProvenance[],
    exportedContent: string,
    options: {
      documentTitle?: string;
      documentId?: string;
      exportFormat?: string;
      generatorName?: string;
      generatorVersion?: string;
    } = {}
  ): C2PAManifest {
    const {
      generatorName = 'Dictator',
      generatorVersion = '0.1.0',
      exportFormat = 'json',
    } = options;

    // Generate C2PA actions from provenances
    const actions = this.generateActions(paragraphs, exportedContent);

    // Create assertions
    const assertions: C2PAAssertion[] = [
      {
        label: 'urn:cai:assertions:c2pa.actions',
        kind: 'urn:cai:assertions:c2pa.actions',
        data: { actions },
      },
    ];

    // Add content binding
    const contentHash = hashContent(exportedContent);

    const manifest: C2PAManifest = {
      specVersion: '2.4',
      createdAt: new Date().toISOString(),
      description: `Provenance manifest for document exported as ${exportFormat}`,
      generatedBy: {
        name: generatorName,
        version: generatorVersion,
      },
      claim: {
        assertions,
      },
      contentBinding: {
        hash: contentHash,
        algorithm: 'sha256',
      },
    };

    return manifest;
  }

  /**
   * Generate C2PA actions from paragraph provenances.
   * 
   * Maps paragraph provenance events to C2PA actions.
   * Groups events by type (generation, modification, review).
   * 
   * @param paragraphs - Array of provenances
   * @param exportedContent - Full exported text
   * @returns Array of C2PA actions
   */
  private static generateActions(
    paragraphs: ParagraphProvenance[],
    exportedContent: string
  ): C2PAAction[] {
    const actions: C2PAAction[] = [];
    const processedParagraphs = new Set<string>();

    for (const para of paragraphs) {
      if (processedParagraphs.has(para.paragraphId)) {
        continue;
      }

      processedParagraphs.add(para.paragraphId);

      // Determine primary action type based on events
      const hasAiGeneration = para.events.some(
        (e) => e.eventType === 'ai-generation'
      );
      const hasAiModification = para.events.some(
        (e) => e.eventType === 'ai-modification'
      );
      const hasReview = para.events.some((e) => e.reviewedAt);

      // Generate AI action if applicable
      if (hasAiGeneration || hasAiModification) {
        const action = this.createAiAction(
          para,
          exportedContent,
          hasAiGeneration ? 'c2pa.generated' : 'c2pa.modified'
        );
        actions.push(action);
      }

      // Generate review action if applicable
      if (hasReview && !hasAiGeneration && !hasAiModification) {
        const action = this.createReviewAction(para, exportedContent);
        if (action) {
          actions.push(action);
        }
      }
    }

    return actions;
  }

  /**
   * Create a C2PA action for AI-generated or AI-modified content.
   * 
   * @param provenance - Paragraph provenance
   * @param exportedContent - Full exported text
   * @param actionType - 'c2pa.generated' or 'c2pa.modified'
   * @returns C2PA action
   */
  private static createAiAction(
    provenance: ParagraphProvenance,
    exportedContent: string,
    actionType: 'c2pa.generated' | 'c2pa.modified'
  ): C2PAAction {
    const aiEvent = provenance.events.find(
      (e) => e.eventType === 'ai-generation' || e.eventType === 'ai-modification'
    );

    if (!aiEvent) {
      throw new Error(`No AI event found for paragraph ${provenance.paragraphId}`);
    }

    // Try to find the paragraph text in exported content
    const content = provenance.currentContent || '';
    const selector = content
      ? createTextualRegionSelector(exportedContent, content)
      : undefined;

    const action: C2PAAction = {
      action: actionType,
      when: new Date(aiEvent.timestamp).toISOString(),
      softwareAgent: {
        name: 'Dictator AI',
        version: '0.1.0',
        comments: `Model: ${aiEvent.aiTurnId ? 'Claude' : 'Unknown'}, Confidence: ${(aiEvent.confidence || 0).toFixed(2)}`,
      },
      changes: selector
        ? [
            {
              description: `Paragraph ${provenance.paragraphId} ${actionType === 'c2pa.generated' ? 'generated' : 'modified'} by AI`,
              region: selector,
            },
          ]
        : undefined,
    };

    return action;
  }

  /**
   * Create a C2PA action for human review/acceptance.
   * 
   * @param provenance - Paragraph provenance
   * @param exportedContent - Full exported text
   * @returns C2PA action or null if no review
   */
  private static createReviewAction(
    provenance: ParagraphProvenance,
    exportedContent: string
  ): C2PAAction | null {
    const reviewEvent = provenance.events.find((e) => e.reviewedAt);

    if (!reviewEvent) {
      return null;
    }

    const content = provenance.currentContent || '';
    const selector = content
      ? createTextualRegionSelector(exportedContent, content)
      : undefined;

    const action: C2PAAction = {
      action: 'c2pa.reviewed',
      when: new Date(reviewEvent.reviewedAt).toISOString(),
      actor: reviewEvent.reviewedBy
        ? {
            displayName: 'Human Reviewer',
            identifier: reviewEvent.reviewedBy,
          }
        : undefined,
      changes: selector
        ? [
            {
              description: `Paragraph ${provenance.paragraphId} reviewed and accepted`,
              region: selector,
            },
          ]
        : undefined,
    };

    return action;
  }

  /**
   * Convert manifest to JSON for transmission/storage.
   * 
   * @param manifest - Manifest object
   * @returns JSON string
   */
  static toJSON(manifest: C2PAManifest): string {
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Parse manifest from JSON.
   * 
   * @param json - JSON string
   * @returns Manifest object
   */
  static fromJSON(json: string): C2PAManifest {
    return JSON.parse(json) as C2PAManifest;
  }
}

/**
 * Reference to paragraph for C2PA export.
 * 
 * Combines provenance with content information needed for C2PA generation.
 */
export function createC2PAReference(
  provenance: ParagraphProvenance,
  exportedContent: string
): ParagraphC2PAReference {
  const content = provenance.currentContent || '';
  
  // Determine primary action
  let primaryAction: 'c2pa.generated' | 'c2pa.modified' | 'c2pa.reviewed' =
    'c2pa.reviewed';
  
  if (provenance.events.some((e) => e.eventType === 'ai-generation')) {
    primaryAction = 'c2pa.generated';
  } else if (provenance.events.some((e) => e.eventType === 'ai-modification')) {
    primaryAction = 'c2pa.modified';
  }

  const selector = content
    ? createTextualRegionSelector(exportedContent, content)
    : null;

  return {
    paragraphId: provenance.paragraphId,
    content,
    contentHash: provenance.currentContentHash,
    textualRegion: selector?.value,
    relevantEvents: provenance.events,
    primaryAction,
  };
}
