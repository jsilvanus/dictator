/**
 * Export Pipeline
 * 
 * Unified pipeline for document export with provenance and C2PA signing.
 * Orchestrates:
 * 1. Content preparation
 * 2. Provenance collection
 * 3. C2PA manifest generation
 * 4. Optional C2PA signing
 * 5. Format-specific packaging
 */

import type { ParagraphProvenance } from '@/lib/provenance/types';

import { C2PAManifestService, type C2PAManifest } from '@/lib/provenance/c2pa-manifest';
import { C2PASigningService, type SignedC2PAManifest } from '@/lib/provenance/c2pa-signing';
import { ExportPackagingManager } from './packaging/ExportPackagingManager';

/**
 * Export pipeline options
 */
export interface ExportPipelineOptions {
  /** Document ID */
  documentId: string;
  
  /** Document title */
  documentTitle?: string;
  
  /** Export format */
  format: 'json' | 'markdown' | 'csv' | 'pdf' | 'html' | 'text';
  
  /** Packaging strategy (auto-select if not provided) */
  packageStrategy?: 'sidecar' | 'embedded';
  
  /** Include C2PA signature in export */
  signExport?: boolean;
  
  /** Include audit trail in provenance */
  includeAuditTrail?: boolean;
  
  /** Include paragraph-level provenance details */
  includeDetailedProvenance?: boolean;
}

/**
 * Export pipeline result
 */
export interface ExportPipelineResult {
  /** Main exported content */
  mainContent: Buffer | string;
  
  /** Main file name */
  mainFileName: string;
  
  /** Main file MIME type */
  mainMimeType: string;
  
  /** Optional sidecar files (for sidecar packaging) */
  sidecarFiles?: Array<{
    fileName: string;
    content: Buffer | string;
    mimeType: string;
  }>;
  
  /** C2PA manifest (if generated) */
  c2paManifest?: C2PAManifest | SignedC2PAManifest;
  
  /** Export metadata */
  metadata: {
    exportedAt: string;
    format: string;
    strategy: string;
    signed: boolean;
    paragraphCount: number;
  };
}

/**
 * Export Pipeline
 * Orchestrates the complete export workflow
 */
export class ExportPipeline {
  private packagingManager: ExportPackagingManager;
  private signingService?: C2PASigningService;

  constructor(signingService?: C2PASigningService) {
    this.packagingManager = new ExportPackagingManager();
    this.signingService = signingService;
  }

  /**
   * Execute complete export pipeline
   * 
   * @param content - Document content
   * @param provenance - Paragraph-level provenance data
   * @param options - Pipeline options
   * @returns Complete export result with packaged content
   */
  async execute(
    content: string,
    provenance: ParagraphProvenance[],
    options: ExportPipelineOptions
  ): Promise<ExportPipelineResult> {
    // Step 1: Generate C2PA manifest
    let c2paManifest: C2PAManifest | SignedC2PAManifest | undefined;
    if (options.includeDetailedProvenance !== false) {
      c2paManifest = C2PAManifestService.generateManifest(
        provenance,
        content,
        {
          documentTitle: options.documentTitle,
          documentId: options.documentId,
          exportFormat: options.format,
        }
      );

      // Step 2: Sign manifest if requested
      if (options.signExport && this.signingService?.isAvailable()) {
        c2paManifest = this.signingService.signManifest(c2paManifest);
      }
    }

    // Step 3: Create packaging config
    const packagingConfig = this.packagingManager.createConfig(
      this.normalizeFormat(options.format),
      options.packageStrategy,
      options.signExport ?? true
    );

    // Step 4: Package content with provenance
    const packagedResult = await this.packagingManager.package(
      content,
      packagingConfig,
      provenance,
      c2paManifest
    );

    // Step 5: Prepare result
    return {
      ...packagedResult,
      c2paManifest,
      metadata: {
        exportedAt: new Date().toISOString(),
        format: options.format,
        strategy: packagingConfig.strategy,
        signed: !!c2paManifest && 'signature' in c2paManifest,
        paragraphCount: provenance.length,
      },
    };
  }

  /**
   * Quick export without provenance (content only)
   */
  async exportContent(
    content: string,
    format: ExportPipelineOptions['format']
  ): Promise<ExportPipelineResult> {
    return this.execute(content, [], {
      documentId: '',
      format,
      includeDetailedProvenance: false,
      signExport: false,
    });
  }

  /**
   * Validate options before execution
   */
  validateOptions(options: ExportPipelineOptions): string[] {
    const errors: string[] = [];

    if (!options.format) {
      errors.push('Export format is required');
    }

    if (options.signExport && !this.signingService?.isAvailable()) {
      errors.push('C2PA signing requested but signing service not configured');
    }

    return errors;
  }

  /**
   * Normalize format names
   */
  private normalizeFormat(
    format: ExportPipelineOptions['format']
  ): 'json' | 'markdown' | 'text' | 'html' | 'pdf' {
    const formatMap: Record<string, 'json' | 'markdown' | 'text' | 'html' | 'pdf'> = {
      'json': 'json',
      'markdown': 'markdown',
      'md': 'markdown',
      'csv': 'text', // CSV exported as text
      'text': 'text',
      'txt': 'text',
      'html': 'html',
      'pdf': 'pdf',
    };

    return formatMap[format] || 'text';
  }
}

/**
 * Create export pipeline with optional signing
 */
export function createExportPipeline(signingService?: C2PASigningService): ExportPipeline {
  return new ExportPipeline(signingService);
}

/**
 * Create export pipeline from environment
 * Attempts to load C2PA signing credentials from environment
 */
export function createExportPipelineFromEnv(): ExportPipeline {
  let signingService: C2PASigningService | undefined;

  try {
    if (process.env.C2PA_PRIVATE_KEY) {
      signingService = C2PASigningService.fromEnv();
    }
  } catch (error) {
    console.warn('Could not initialize C2PA signing from environment:', error);
  }

  return new ExportPipeline(signingService);
}
