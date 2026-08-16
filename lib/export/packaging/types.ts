/**
 * Packaging Strategy Types
 * 
 * Defines interfaces for different export packaging strategies:
 * - Sidecar: Export content and provenance as separate files
 * - Embedded: Embed provenance metadata within the main document
 */

import type { C2PAManifest } from '@/lib/provenance/c2pa-manifest';
import type { ParagraphProvenance } from '@/lib/provenance/types';

/**
 * Result of packaging operation
 * Can be a single file or multiple files
 */
export interface PackageResult {
  /** Main content (markdown, HTML, PDF, etc.) */
  mainContent: Buffer | string;
  
  /** Main file name */
  mainFileName: string;
  
  /** Main file MIME type */
  mainMimeType: string;
  
  /** Optional sidecar files (for sidecar strategy) */
  sidecarFiles?: Array<{
    fileName: string;
    content: Buffer | string;
    mimeType: string;
  }>;
}

/**
 * Packaging strategy interface
 * Defines how to package content with provenance metadata
 */
export interface IPackagingStrategy {
  /** Strategy name */
  name: 'sidecar' | 'embedded';

  /** Supported export formats for this strategy */
  supportedFormats: readonly ('markdown' | 'text' | 'html' | 'pdf' | 'json')[];
  
  /**
   * Package content with provenance metadata
   * 
   * @param content - Main document content
   * @param format - Export format
   * @param provenance - Paragraph-level provenance data
   * @param c2paManifest - Optional signed C2PA manifest
   * @param options - Additional packaging options
   * @returns Packaged result with main content and optional sidecars
   */
  package(
    content: string,
    format: 'markdown' | 'text' | 'html' | 'pdf' | 'json',
    provenance: ParagraphProvenance[],
    c2paManifest?: C2PAManifest,
    options?: Record<string, unknown>
  ): Promise<PackageResult>;
}

/**
 * Options for sidecar packaging
 */
export interface SidecarPackagingOptions {
  /** Include paragraph provenance in sidecar */
  includeParaProvenance?: boolean;
  
  /** Include full AI history in sidecar */
  includeAiHistory?: boolean;
  
  /** Include C2PA manifest in sidecar */
  includeC2PA?: boolean;
  
  /** Include audit log in sidecar */
  includeAuditLog?: boolean;
}

/**
 * Options for embedded packaging
 */
export interface EmbeddedPackagingOptions {
  /** Embed as HTML comments (for markdown/html) */
  embedAsComments?: boolean;
  
  /** Embed as PDF metadata annotations */
  embedAsPdfMetadata?: boolean;
  
  /** Embed as invisible watermark with provenance hash */
  embedWatermark?: boolean;
  
  /** Compress embedded data */
  compressData?: boolean;
}

/**
 * Unified packaging options
 */
export type PackagingOptions = SidecarPackagingOptions | EmbeddedPackagingOptions;

/**
 * Export packaging configuration
 */
export interface ExportPackagingConfig {
  /** Strategy to use */
  strategy: 'sidecar' | 'embedded';
  
  /** Format to export */
  format: 'markdown' | 'text' | 'html' | 'pdf' | 'json';
  
  /** Include C2PA signature in export */
  includeCPASignature?: boolean;
  
  /** Include audit trail */
  includeAuditTrail?: boolean;
  
  /** Strategy-specific options */
  options?: PackagingOptions;
}
