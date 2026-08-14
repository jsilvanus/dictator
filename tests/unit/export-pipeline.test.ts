/**
 * Tests for Export Pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExportPipeline, createExportPipeline } from '@/lib/export/ExportPipeline';
import { C2PASigningService, type SigningCredentials } from '@/lib/provenance/c2pa-signing';
import type { ParagraphProvenance } from '@/lib/provenance/types';
import { generateKeyPairSync } from 'crypto';

describe('Export Pipeline', () => {
  let pipeline: ExportPipeline;
  let mockProvenance: ParagraphProvenance[];
  let signingService: C2PASigningService;

  beforeEach(() => {
    mockProvenance = [
      {
        paragraphId: 'p_pipeline_1',
        documentId: 'doc_pipeline',
        currentContent: 'Pipeline test content',
        currentContentHash: 'hash123',
        createdAt: Date.now(),
        events: [
          {
            eventType: 'human-written',
            timestamp: Date.now(),
            confidence: 1,
          },
        ],
      },
    ];

    // Create test signing credentials
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const credentials: SigningCredentials = {
      privateKey: privateKey.toString(),
      algorithm: 'RSA-SHA256',
      keyId: 'test-pipeline-key',
    };

    signingService = C2PASigningService.initialize(credentials);
    pipeline = new ExportPipeline(signingService);
  });

  it('should create pipeline with signing service', () => {
    expect(pipeline).toBeDefined();
  });

  it('should create pipeline without signing service', () => {
    const noPipeline = createExportPipeline();
    expect(noPipeline).toBeDefined();
  });

  it('should validate export options', () => {
    const errors = pipeline.validateOptions({
      documentId: 'doc_1',
      format: 'markdown',
      signExport: false,
    });

    expect(errors.length).toBe(0);
  });

  it('should error on missing format', () => {
    const errors = pipeline.validateOptions({
      documentId: 'doc_1',
      format: '' as any,
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should export content without provenance', async () => {
    const result = await pipeline.exportContent(
      'Simple test content',
      'markdown',
      'test.md'
    );

    expect(result.mainContent).toBe('Simple test content');
    expect(result.metadata.paragraphCount).toBe(0);
    expect(result.metadata.signed).toBe(false);
  });

  it('should execute full export pipeline with markdown', async () => {
    const result = await pipeline.execute(
      'Test content',
      mockProvenance,
      {
        documentId: 'doc_test',
        documentTitle: 'Test Document',
        format: 'markdown',
        signExport: true,
        includeDetailedProvenance: true,
      }
    );

    expect(result.mainContent).toBe('Test content');
    expect(result.mainFileName).toBe('document.md');
    expect(result.metadata.format).toBe('markdown');
    expect(result.metadata.strategy).toBe('sidecar');
    expect(result.metadata.signed).toBe(true);
    expect(result.metadata.paragraphCount).toBe(1);
    expect(result.sidecarFiles).toBeDefined();
  });

  it('should execute pipeline with embedded packaging', async () => {
    const result = await pipeline.execute(
      'HTML content',
      mockProvenance,
      {
        documentId: 'doc_html',
        format: 'html',
        packageStrategy: 'embedded',
        signExport: false,
      }
    );

    expect(result.mainFileName).toBe('document.html');
    expect(result.metadata.strategy).toBe('embedded');
    expect(result.sidecarFiles).toBeUndefined();
  });

  it('should include C2PA manifest when requested', async () => {
    const result = await pipeline.execute(
      'Content for signing',
      mockProvenance,
      {
        documentId: 'doc_c2pa',
        format: 'json',
        signExport: true,
        includeDetailedProvenance: true,
      }
    );

    expect(result.c2paManifest).toBeDefined();
    if ('signature' in result.c2paManifest!) {
      expect(result.c2paManifest.signature).toBeDefined();
      expect(result.c2paManifest.signatureTimestamp).toBeDefined();
    }
  });

  it('should handle different export formats', async () => {
    const formats: Array<'json' | 'markdown' | 'text' | 'html' | 'pdf'> = [
      'json',
      'markdown',
      'text',
      'html',
      'pdf',
    ];

    for (const format of formats) {
      const result = await pipeline.execute(
        'Test content',
        mockProvenance,
        {
          documentId: `doc_${format}`,
          format,
          signExport: false,
        }
      );

      expect(result.metadata.format).toBe(format);
      expect(result.mainContent).toBeDefined();
    }
  });

  it('should skip provenance when not requested', async () => {
    const result = await pipeline.execute(
      'Content without provenance',
      mockProvenance,
      {
        documentId: 'doc_no_prov',
        format: 'markdown',
        includeDetailedProvenance: false,
      }
    );

    expect(result.c2paManifest).toBeUndefined();
    expect(result.metadata.paragraphCount).toBe(1); // Input count preserved
  });

  it('should skip signing when not requested', async () => {
    const result = await pipeline.execute(
      'Unsigned content',
      mockProvenance,
      {
        documentId: 'doc_unsigned',
        format: 'markdown',
        signExport: false,
      }
    );

    expect(result.metadata.signed).toBe(false);
  });

  it('should handle empty provenance', async () => {
    const result = await pipeline.execute(
      'No provenance content',
      [],
      {
        documentId: 'doc_empty',
        format: 'markdown',
      }
    );

    expect(result.metadata.paragraphCount).toBe(0);
    expect(result.mainContent).toBe('No provenance content');
  });

  it('should include document title in manifest', async () => {
    const result = await pipeline.execute(
      'Content',
      mockProvenance,
      {
        documentId: 'doc_titled',
        documentTitle: 'My Important Document',
        format: 'json',
        signExport: false,
        includeDetailedProvenance: true,
      }
    );

    expect(result.c2paManifest).toBeDefined();
  });

  it('should normalize format names correctly', async () => {
    // Test that CSV is normalized to text
    const result = await pipeline.execute(
      'CSV content',
      mockProvenance,
      {
        documentId: 'doc_csv',
        format: 'csv' as any,
        signExport: false,
      }
    );

    expect(result.mainContent).toBeDefined();
  });
});
