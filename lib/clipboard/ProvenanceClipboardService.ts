/**
 * Clipboard Service for Provenance-Aware Copy/Paste
 * 
 * Handles copying and pasting while preserving or appropriately handling provenance.
 * 
 * Architecture:
 * - Copy: Extract paragraph metadata, serialize to dual MIME types
 * - Paste: Parse clipboard data, assign new IDs, preserve origin links
 * - Fallback: Plain text copy/paste for external apps
 * 
 * Dual MIME Types:
 * - text/plain: Plain text for external app compatibility
 * - application/x-dictator-provenance: Rich provenance metadata
 */

import { generateParagraphId } from '@/lib/provenance/paragraph-id';
import { ParagraphProvenanceService } from '@/lib/provenance/paragraph-provenance-service';
import type { ParagraphProvenance, ParagraphProvenanceEvent } from '@/lib/provenance/types';

/**
 * Format for clipboard provenance data (not literal JSON, but structured metadata)
 */
export interface ClipboardProvenanceData {
  version: '1.0';
  source: 'dictator';
  timestamp: number;
  sourceDocumentId: string;
  paragraphs: Array<{
    sourceParagraphId: string;
    content: string;
    currentContentHash: string;
    sourceProvenance: ParagraphProvenance;
  }>;
}

/**
 * Clipboard service for provenance-aware copy/paste operations.
 */
export class ProvenanceClipboardService {
  /**
   * Copy paragraphs to clipboard with provenance metadata.
   * 
   * Copies to multiple MIME types for compatibility:
   * - text/plain: Plain text (for external apps)
   * - application/x-dictator-provenance: Rich provenance data (for Dictator)
   * 
   * @param paragraphs - Paragraphs to copy
   * @param sourceDocumentId - Document ID the paragraphs come from
   * @returns Promise that resolves when copy is complete
   */
  static async copyParagraphs(
    paragraphs: ParagraphProvenance[],
    sourceDocumentId: string
  ): Promise<void> {
    // Build plain text version
    const plainText = paragraphs.map((p) => p.currentContent).join('\n\n');

    // Build rich provenance version
    const provenanceData: ClipboardProvenanceData = {
      version: '1.0',
      source: 'dictator',
      timestamp: Date.now(),
      sourceDocumentId,
      paragraphs: paragraphs.map((p) => ({
        sourceParagraphId: p.paragraphId,
        content: p.currentContent,
        currentContentHash: p.currentContentHash,
        sourceProvenance: p,
      })),
    };

    // Try to use modern Clipboard API if available
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.write) {
      try {
        const blob = new Blob([JSON.stringify(provenanceData)], {
          type: 'application/x-dictator-provenance',
        });

        const data = [
          new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'application/x-dictator-provenance': blob,
          }),
        ];

        await navigator.clipboard.write(data);
        return;
      } catch (err) {
        console.warn('Failed to write provenance to clipboard, falling back to plain text', err);
      }
    }

    // Fallback: Use traditional execCommand for plain text
    if (typeof document !== 'undefined' && document?.execCommand) {
      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  /**
   * Read paragraphs from clipboard with provenance metadata if available.
   * 
   * Attempts to read rich provenance data first, falls back to plain text.
   * 
   * @returns Promise resolving to clipboard data or null if not available
   */
  static async readFromClipboard(): Promise<{
    plainText: string;
    provenanceData?: ClipboardProvenanceData;
    hasProvenance: boolean;
  } | null> {
    try {
      // Try modern Clipboard API first
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.read) {
        const items = await navigator.clipboard.read();

        for (const item of items) {
          // Look for provenance data
          if (item.types.includes('application/x-dictator-provenance')) {
            try {
              const blob = await item.getType('application/x-dictator-provenance');
              const text = await blob.text();
              const provenanceData = JSON.parse(text) as ClipboardProvenanceData;

              // Also get plain text if available
              let plainText = '';
              if (item.types.includes('text/plain')) {
                const plainBlob = await item.getType('text/plain');
                plainText = await plainBlob.text();
              } else {
                plainText = provenanceData.paragraphs
                  .map((p) => p.content)
                  .join('\n\n');
              }

              return {
                plainText,
                provenanceData,
                hasProvenance: true,
              };
            } catch (err) {
              console.warn('Failed to parse provenance data', err);
            }
          }

          // Fall back to plain text
          if (item.types.includes('text/plain')) {
            const blob = await item.getType('text/plain');
            const plainText = await blob.text();
            return {
              plainText,
              hasProvenance: false,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard.read() not available, trying getText()', err);
    }

    // Fallback: Try getText
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.readText) {
        const plainText = await navigator.clipboard.readText();
        return {
          plainText,
          hasProvenance: false,
        };
      }
    } catch (err) {
      console.warn('Failed to read from clipboard', err);
    }

    return null;
  }

  /**
   * Create new paragraphs from pasted content with provenance preservation.
   * 
   * When pasting:
   * 1. If clipboard has provenance data, create new paragraphs with origin links
   * 2. Otherwise, create new paragraphs from plain text without origin
   * 
   * New paragraphs always get new IDs (copy-paste creates new content)
   * But preserve origin reference back to source paragraphs.
   * 
   * @param clipboard - Clipboard data from readFromClipboard
   * @param targetDocumentId - Document ID to paste into
   * @param userId - User ID for provenance
   * @returns Array of newly created paragraphs
   */
  static createPastedParagraphs(
    clipboard: Awaited<ReturnType<typeof ProvenanceClipboardService.readFromClipboard>>,
    targetDocumentId: string,
    userId: string
  ): ParagraphProvenance[] {
    if (!clipboard) {
      return [];
    }

    const pastedParagraphs: ParagraphProvenance[] = [];

    if (clipboard.hasProvenance && clipboard.provenanceData) {
      // Pasting provenance-aware content
      for (const sourceData of clipboard.provenanceData.paragraphs) {
        // Copy the source provenance event chain
        const pastedParagraph = ParagraphProvenanceService.createParagraph(
          targetDocumentId,
          null,
          sourceData.content,
          'copy-paste', // Event type indicating this came from clipboard
          {
            device: 'web',
            userId,
            sourceDocumentId: clipboard.provenanceData.sourceDocumentId,
            sourceParagraphId: sourceData.sourceParagraphId,
            sourceContentHash: sourceData.currentContentHash,
            // Preserve the full provenance chain
            originEvents: sourceData.sourceProvenance.events,
          }
        );

        pastedParagraphs.push(pastedParagraph);
      }
    } else {
      // Pasting plain text without provenance metadata
      // Split by double newline for paragraph boundaries
      const textParagraphs = clipboard.plainText
        .split('\n\n')
        .filter((p) => p.trim().length > 0);

      for (const text of textParagraphs) {
        // Create new paragraph with no provenance history
        // (user pasting external text)
        const pastedParagraph = ParagraphProvenanceService.createParagraph(
          targetDocumentId,
          null,
          text,
          'human-written', // User manually pasted this
          {
            device: 'web',
            userId,
            source: 'external-paste',
          }
        );

        pastedParagraphs.push(pastedParagraph);
      }
    }

    return pastedParagraphs;
  }

  /**
   * Check if clipboard contains Dictator provenance data.
   */
  static async hasProvenanceData(): Promise<boolean> {
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator?.clipboard?.read
      ) {
        return false;
      }

      const items = await navigator.clipboard.read();
      return items.some((item) =>
        item.types.includes('application/x-dictator-provenance')
      );
    } catch (err) {
      return false;
    }
  }

  /**
   * Export paragraph provenance as Markdown with provenance comments.
   * 
   * Useful for sharing provenance information in Markdown format.
   */
  static exportAsMarkdown(paragraphs: ParagraphProvenance[]): string {
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      // Add content
      lines.push(paragraph.currentContent);
      lines.push('');

      // Add provenance comment
      const eventSummary = paragraph.events
        .map((e) => `${e.eventType} (${new Date(e.timestamp).toLocaleString()})`)
        .join(', ');

      lines.push(`<!-- Provenance: ${eventSummary} -->`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Import paragraph provenance from external source.
   * 
   * When importing from non-Dictator sources (external paste, file import),
   * create new paragraphs without artificial provenance history.
   */
  static importExternalParagraphs(
    content: string,
    sourceFormat: 'markdown' | 'plaintext' | 'html',
    documentId: string,
    userId: string
  ): ParagraphProvenance[] {
    const paragraphs: ParagraphProvenance[] = [];

    let textParagraphs: string[] = [];

    if (sourceFormat === 'markdown' || sourceFormat === 'plaintext') {
      // Split by double newline
      textParagraphs = content
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    } else if (sourceFormat === 'html') {
      // Extract text from HTML paragraphs
      if (typeof document !== 'undefined') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const pElements = tempDiv.querySelectorAll('p');
        textParagraphs = Array.from(pElements).map((el) => el.textContent || '');
      }
    }

    for (const text of textParagraphs) {
      if (text.trim().length > 0) {
        const para = ParagraphProvenanceService.createParagraph(
          documentId,
          null,
          text,
          'human-written',
          {
            device: 'web',
            userId,
            source: `external-import-${sourceFormat}`,
          }
        );

        paragraphs.push(para);
      }
    }

    return paragraphs;
  }
}

/**
 * Helper: Serialize clipboard data for storage/transmission.
 */
export function serializeClipboardData(data: ClipboardProvenanceData): string {
  return JSON.stringify(data);
}

/**
 * Helper: Deserialize clipboard data.
 */
export function deserializeClipboardData(json: string): ClipboardProvenanceData {
  return JSON.parse(json) as ClipboardProvenanceData;
}
