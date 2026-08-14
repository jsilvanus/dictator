/**
 * Export Packaging Manager
 * 
 * Coordinates packaging strategy selection and execution.
 * Handles format-specific validation and sensible defaults.
 */

import type { C2PAManifest } from '@/lib/provenance/c2pa-manifest';
import type { ParagraphProvenance } from '@/lib/provenance/types';

import { EmbeddedPackagingStrategy } from './EmbeddedPackagingStrategy';
import { SidecarPackagingStrategy } from './SidecarPackagingStrategy';
import type { ExportPackagingConfig, IPackagingStrategy, PackageResult, PackagingOptions } from './types';

/**
 * Export packaging manager
 * Selects and applies appropriate packaging strategy
 */
export class ExportPackagingManager {
  private sidecarStrategy: IPackagingStrategy;
  private embeddedStrategy: IPackagingStrategy;

  constructor() {
    this.sidecarStrategy = new SidecarPackagingStrategy();
    this.embeddedStrategy = new EmbeddedPackagingStrategy();
  }

  /**
   * Get recommended packaging strategy for a format
   * 
   * Format recommendations:
   * - markdown, text: sidecar (standard, preserves plaintext)
   * - html, pdf: embedded (preserves document integrity)
   * - json: embedded (allows structured metadata)
   */
  getRecommendedStrategy(
    format: 'markdown' | 'text' | 'html' | 'pdf' | 'json'
  ): 'sidecar' | 'embedded' {
    switch (format) {
      case 'markdown':
      case 'text':
        return 'sidecar';
      case 'html':
      case 'pdf':
      case 'json':
        return 'embedded';
      default:
        return 'sidecar';
    }
  }

  /**
   * Validate if a strategy supports a format
   */
  supportsFormat(
    strategy: 'sidecar' | 'embedded',
    format: 'markdown' | 'text' | 'html' | 'pdf' | 'json'
  ): boolean {
    const strategyObj = strategy === 'sidecar' ? this.sidecarStrategy : this.embeddedStrategy;
    return (strategyObj.supportedFormats as readonly string[]).includes(format);
  }

  /**
   * Package document with provenance
   * 
   * Automatically selects strategy if not specified.
   * Validates format/strategy compatibility.
   */
  async package(
    content: string,
    config: Partial<ExportPackagingConfig>,
    provenance: ParagraphProvenance[],
    c2paManifest?: C2PAManifest
  ): Promise<PackageResult> {
    // Use provided strategy or get recommended
    const strategy = config.strategy ?? this.getRecommendedStrategy(config.format || 'markdown');
    const format = config.format ?? 'markdown';

    // Validate format/strategy compatibility
    if (!this.supportsFormat(strategy, format)) {
      throw new Error(
        `Format "${format}" is not supported by "${strategy}" packaging strategy. ` +
        `Recommended strategy: ${this.getRecommendedStrategy(format)}`
      );
    }

    // Get strategy instance
    const strategyObj = strategy === 'sidecar' ? this.sidecarStrategy : this.embeddedStrategy;

    // Package content
    return strategyObj.package(
      content,
      format,
      provenance,
      c2paManifest,
      config.options
    );
  }

  /**
   * Get default packaging options for strategy
   */
  getDefaultOptions(strategy: 'sidecar' | 'embedded'): PackagingOptions {
    if (strategy === 'sidecar') {
      return {
        includeParaProvenance: true,
        includeAiHistory: false,
        includeC2PA: false,
        includeAuditLog: false,
      };
    } else {
      return {
        embedAsComments: true,
        embedAsPdfMetadata: true,
        embedWatermark: false,
        compressData: false,
      };
    }
  }

  /**
   * Create packaging config with smart defaults
   */
  createConfig(
    format: 'markdown' | 'text' | 'html' | 'pdf' | 'json',
    strategy?: 'sidecar' | 'embedded',
    includeCPASignature: boolean = true
  ): ExportPackagingConfig {
    const resolvedStrategy = strategy ?? this.getRecommendedStrategy(format);

    return {
      strategy: resolvedStrategy,
      format,
      includeCPASignature,
      includeAuditTrail: true,
      options: this.getDefaultOptions(resolvedStrategy),
    };
  }
}

// Export singleton instance
export const packagingManager = new ExportPackagingManager();
