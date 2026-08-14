/**
 * Sidecar Packaging Strategy
 * 
 * Exports content and provenance as separate files:
 * - document.md/txt (main content)
 * - document.provenance.json (paragraph-level provenance)
 * - document.c2pa.json (signed C2PA manifest, if requested)
 */

import type { C2PAManifest } from '@/lib/provenance/c2pa-manifest';
import type { ParagraphProvenance } from '@/lib/provenance/types';

import type { IPackagingStrategy, PackageResult, SidecarPackagingOptions } from './types';

export class SidecarPackagingStrategy implements IPackagingStrategy {
  name: 'sidecar' = 'sidecar';
  
  supportedFormats = ['markdown', 'text', 'json'] as const;

  /**
   * Package content with separate provenance sidecar files
   */
  async package(
    content: string,
    format: 'markdown' | 'text' | 'html' | 'pdf' | 'json',
    provenance: ParagraphProvenance[],
    c2paManifest?: C2PAManifest,
    options: Record<string, unknown> = {}
  ): Promise<PackageResult> {
    const sidecarOptions = options as SidecarPackagingOptions;
    
    // Determine file extension based on format
    const ext = this.getFileExtension(format);
    const baseName = `document`;
    
    // Create main file name
    const mainFileName = `${baseName}.${ext}`;
    
    // Prepare sidecar files
    const sidecarFiles: PackageResult['sidecarFiles'] = [];
    
    // Always include provenance sidecar (enabled by default)
    if (sidecarOptions.includeParaProvenance !== false) {
      const provenanceData = this.createProvenanceSidecar(provenance);
      sidecarFiles.push({
        fileName: `${baseName}.provenance.json`,
        content: JSON.stringify(provenanceData, null, 2),
        mimeType: 'application/json',
      });
    }
    
    // Include C2PA manifest if provided and requested
    if (c2paManifest && sidecarOptions.includeC2PA !== false) {
      const c2paData = {
        manifest: c2paManifest,
        exportedAt: new Date().toISOString(),
        format: 'c2pa-v2.4',
      };
      sidecarFiles.push({
        fileName: `${baseName}.c2pa.json`,
        content: JSON.stringify(c2paData, null, 2),
        mimeType: 'application/json',
      });
    }
    
    // Include summary metadata
    const metadataSidecar = {
      exportedAt: new Date().toISOString(),
      format,
      strategy: 'sidecar',
      paragraphCount: provenance.length,
      hasC2PAManifest: !!c2paManifest,
      files: {
        main: mainFileName,
        sidecars: sidecarFiles.map(f => f.fileName),
      },
    };
    
    sidecarFiles.push({
      fileName: `${baseName}.metadata.json`,
      content: JSON.stringify(metadataSidecar, null, 2),
      mimeType: 'application/json',
    });
    
    return {
      mainContent: content,
      mainFileName,
      mainMimeType: this.getMimeType(format),
      sidecarFiles,
    };
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(
    format: 'markdown' | 'text' | 'html' | 'pdf' | 'json'
  ): string {
    switch (format) {
      case 'markdown':
        return 'md';
      case 'text':
        return 'txt';
      case 'html':
        return 'html';
      case 'pdf':
        return 'pdf';
      case 'json':
        return 'json';
      default:
        return 'txt';
    }
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(
    format: 'markdown' | 'text' | 'html' | 'pdf' | 'json'
  ): string {
    switch (format) {
      case 'markdown':
        return 'text/markdown';
      case 'text':
        return 'text/plain';
      case 'html':
        return 'text/html';
      case 'pdf':
        return 'application/pdf';
      case 'json':
        return 'application/json';
      default:
        return 'text/plain';
    }
  }

  /**
   * Create provenance sidecar structure
   */
  private createProvenanceSidecar(provenance: ParagraphProvenance[]): Record<string, unknown> {
    return {
      format: 'paragraph-provenance-v1',
      exportedAt: new Date().toISOString(),
      paragraphCount: provenance.length,
      paragraphs: provenance.map(para => ({
        paragraphId: para.paragraphId,
        content: para.currentContent,
        contentHash: para.currentContentHash,
        createdAt: new Date(para.createdAt).toISOString(),
        events: para.events.map(event => ({
          eventType: event.eventType,
          timestamp: new Date(event.timestamp).toISOString(),
          confidence: event.confidence,
          reviewedAt: event.reviewedAt ? new Date(event.reviewedAt).toISOString() : null,
          reviewedBy: event.reviewedBy,
          aiTurnId: event.aiTurnId,
        })),
      })),
    };
  }
}
