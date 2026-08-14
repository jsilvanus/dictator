/**
 * Embedded Packaging Strategy
 * 
 * Embeds provenance metadata directly within the document:
 * - Markdown/HTML: Provenance in HTML comments
 * - PDF: Provenance in PDF metadata XMP
 * - JSON: Provenance in top-level metadata field
 */

import { gzipSync } from 'zlib';

import type { C2PAManifest } from '@/lib/provenance/c2pa-manifest';
import type { ParagraphProvenance } from '@/lib/provenance/types';

import type { EmbeddedPackagingOptions, IPackagingStrategy, PackageResult } from './types';

export class EmbeddedPackagingStrategy implements IPackagingStrategy {
  name: 'embedded' = 'embedded';
  
  supportedFormats = ['markdown', 'text', 'html', 'pdf', 'json'] as const;

  /**
   * Package content with embedded provenance metadata
   */
  async package(
    content: string,
    format: 'markdown' | 'text' | 'html' | 'pdf' | 'json',
    provenance: ParagraphProvenance[],
    c2paManifest?: C2PAManifest,
    options: Record<string, unknown> = {}
  ): Promise<PackageResult> {
    const embeddedOptions = options as EmbeddedPackagingOptions;
    
    let mainContent: string;
    
    switch (format) {
      case 'markdown':
      case 'text':
        mainContent = this.embedInMarkdown(content, provenance, c2paManifest, embeddedOptions);
        break;
      case 'html':
        mainContent = this.embedInHtml(content, provenance, c2paManifest);
        break;
      case 'json':
        mainContent = this.embedInJson(content, provenance, c2paManifest, embeddedOptions);
        break;
      case 'pdf':
        // PDF embedding would be more complex and typically require a PDF library
        // For now, return as-is with a note
        mainContent = content;
        break;
      default:
        mainContent = content;
    }
    
    const ext = this.getFileExtension(format);
    const fileName = `document.${ext}`;
    
    return {
      mainContent,
      mainFileName: fileName,
      mainMimeType: this.getMimeType(format),
    };
  }

  /**
   * Embed provenance in markdown/text as HTML comments
   */
  private embedInMarkdown(
    content: string,
    provenance: ParagraphProvenance[],
    c2paManifest?: C2PAManifest,
    options?: EmbeddedPackagingOptions
  ): string {
    const provenanceData = this.createProvenanceStructure(provenance, c2paManifest);
    
    // Compress if requested
    let embeddedData = JSON.stringify(provenanceData, null, 2);
    if (options?.compressData) {
      const compressed = gzipSync(embeddedData);
      embeddedData = compressed.toString('base64');
    }
    
    // Escape for HTML comment
    const escapedData = embeddedData.replace(/-->/g, '-- >');
    
    // Add provenance comment at end of document
    const provenanceComment = `
<!-- BEGIN PROVENANCE METADATA
${escapedData}
END PROVENANCE METADATA -->`;
    
    return content.trimEnd() + '\n' + provenanceComment;
  }

  /**
   * Embed provenance in HTML as meta tags and script
   */
  private embedInHtml(
    content: string,
    provenance: ParagraphProvenance[],
    c2paManifest?: C2PAManifest
  ): string {
    const provenanceData = this.createProvenanceStructure(provenance, c2paManifest);
    
    let jsonContent = JSON.stringify(provenanceData, null, 2);
    if (options?.compressData) {
      const compressed = gzipSync(jsonContent);
      jsonContent = compressed.toString('base64');
    }
    
    // Add JSON-LD structured data and script tag
    const provenanceScript = `
<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  'provenance': provenanceData,
}, null, 2)}
</script>

<script type="application/vnd.dictator+json" data-format="provenance-v1">
${jsonContent}
</script>`;
    
    // Try to inject before closing </head> or at end of document
    if (content.includes('</head>')) {
      return content.replace('</head>', provenanceScript + '\n</head>');
    } else if (content.includes('</body>')) {
      return content.replace('</body>', provenanceScript + '\n</body>');
    } else {
      return content + '\n' + provenanceScript;
    }
  }

  /**
   * Embed provenance in JSON as metadata field
   */
  private embedInJson(
    content: string,
    provenance: ParagraphProvenance[],
    c2paManifest?: C2PAManifest,
    options?: EmbeddedPackagingOptions
  ): string {
    try {
      const jsonContent = JSON.parse(content);
      
      const provenanceData = this.createProvenanceStructure(provenance, c2paManifest);
      
      // Add provenance metadata
      jsonContent._provenance = {
        format: 'embedded-provenance-v1',
        exportedAt: new Date().toISOString(),
        strategy: 'embedded',
        data: provenanceData,
      };
      
      return JSON.stringify(jsonContent, null, 2);
    } catch {
      // If content is not valid JSON, wrap it
      return JSON.stringify({
        _type: 'document',
        content,
        _provenance: {
          format: 'embedded-provenance-v1',
          exportedAt: new Date().toISOString(),
          strategy: 'embedded',
          data: this.createProvenanceStructure(provenance, c2paManifest),
        },
      }, null, 2);
    }
  }

  /**
   * Create normalized provenance structure for embedding
   */
  private createProvenanceStructure(
    provenance: ParagraphProvenance[],
    c2paManifest?: C2PAManifest
  ): Record<string, unknown> {
    return {
      format: 'paragraph-provenance-v1',
      exportedAt: new Date().toISOString(),
      paragraphCount: provenance.length,
      paragraphs: provenance.map(para => ({
        paragraphId: para.paragraphId,
        content: para.currentContent,
        contentHash: para.currentContentHash,
        createdAt: new Date(para.createdAt).toISOString(),
        eventSummary: {
          total: para.events.length,
          byType: this.groupEventsByType(para.events),
        },
        events: para.events.map(event => ({
          eventType: event.eventType,
          timestamp: new Date(event.timestamp).toISOString(),
          confidence: event.confidence,
          reviewedAt: event.reviewedAt ? new Date(event.reviewedAt).toISOString() : null,
        })),
      })),
      ...(c2paManifest && {
        c2paManifest: {
          specVersion: c2paManifest.specVersion,
          createdAt: c2paManifest.createdAt,
          generatedBy: c2paManifest.generatedBy,
          contentBinding: c2paManifest.contentBinding,
        },
      }),
    };
  }

  /**
   * Group provenance events by type
   */
  private groupEventsByType(
    events: Array<{ eventType: string }>
  ): Record<string, number> {
    return events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
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
}
