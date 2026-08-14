/**
 * Tests for Export Packaging Strategies
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SidecarPackagingStrategy } from '@/lib/export/packaging/SidecarPackagingStrategy';
import { EmbeddedPackagingStrategy } from '@/lib/export/packaging/EmbeddedPackagingStrategy';
import { ExportPackagingManager } from '@/lib/export/packaging/ExportPackagingManager';
import type { ParagraphProvenance } from '@/lib/provenance/types';
import type { C2PAManifest } from '@/lib/provenance/c2pa-manifest';

describe('Sidecar Packaging Strategy', () => {
  let strategy: SidecarPackagingStrategy;
  let mockProvenance: ParagraphProvenance[];
  let mockC2PAManifest: C2PAManifest;

  beforeEach(() => {
    strategy = new SidecarPackagingStrategy();

    mockProvenance = [
      {
        paragraphId: 'p_123',
        documentId: 'doc_1',
        currentContent: 'Hello world',
        currentContentHash: 'abc123',
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

    mockC2PAManifest = {
      specVersion: '2.4',
      createdAt: new Date().toISOString(),
      generatedBy: {
        name: 'Dictator',
        version: '0.1.0',
      },
      claim: {
        assertions: [],
      },
    };
  });

  it('should create sidecar packaging with provenance', async () => {
    const content = 'Hello world';
    const result = await strategy.package(
      content,
      'markdown',
      mockProvenance,
      mockC2PAManifest,
      { includeParaProvenance: true }
    );

    expect(result.mainFileName).toBe('document.md');
    expect(result.mainContent).toBe(content);
    expect(result.sidecarFiles).toBeDefined();
    expect(result.sidecarFiles?.length).toBeGreaterThan(0);

    const provenanceFile = result.sidecarFiles?.find(f => f.fileName.includes('provenance'));
    expect(provenanceFile).toBeDefined();
    expect(provenanceFile?.mimeType).toBe('application/json');
  });

  it('should include C2PA manifest in sidecar when provided', async () => {
    const result = await strategy.package(
      'test content',
      'text',
      mockProvenance,
      mockC2PAManifest,
      { includeC2PA: true }
    );

    const c2paFile = result.sidecarFiles?.find(f => f.fileName.includes('c2pa'));
    expect(c2paFile).toBeDefined();
  });

  it('should skip C2PA manifest when not requested', async () => {
    const result = await strategy.package(
      'test content',
      'text',
      mockProvenance,
      mockC2PAManifest,
      { includeC2PA: false }
    );

    const c2paFile = result.sidecarFiles?.find(f => f.fileName.includes('c2pa'));
    expect(c2paFile).toBeUndefined();
  });

  it('should always include metadata sidecar', async () => {
    const result = await strategy.package(
      'test',
      'markdown',
      mockProvenance
    );

    const metadataFile = result.sidecarFiles?.find(f => f.fileName.includes('metadata'));
    expect(metadataFile).toBeDefined();
  });
});

describe('Embedded Packaging Strategy', () => {
  let strategy: EmbeddedPackagingStrategy;
  let mockProvenance: ParagraphProvenance[];

  beforeEach(() => {
    strategy = new EmbeddedPackagingStrategy();

    mockProvenance = [
      {
        paragraphId: 'p_456',
        documentId: 'doc_2',
        currentContent: 'Embedded test',
        currentContentHash: 'def456',
        createdAt: Date.now(),
        events: [
          {
            eventType: 'ai-generation',
            timestamp: Date.now(),
            confidence: 0.95,
          },
        ],
      },
    ];
  });

  it('should embed provenance in markdown as HTML comment', async () => {
    const content = 'Original markdown content';
    const result = await strategy.package(
      content,
      'markdown',
      mockProvenance
    );

    expect(result.mainFileName).toBe('document.md');
    expect(result.mainContent).toContain(content);
    expect(result.mainContent).toContain('BEGIN PROVENANCE METADATA');
    expect(result.mainContent).toContain('END PROVENANCE METADATA');
    expect(result.sidecarFiles).toBeUndefined();
  });

  it('should embed provenance in HTML with JSON-LD', async () => {
    const content = '<html><head></head><body>Test</body></html>';
    const result = await strategy.package(
      content,
      'html',
      mockProvenance
    );

    expect(result.mainContent).toContain('application/ld+json');
    expect(result.mainContent).toContain('provenance');
  });

  it('should embed provenance in JSON', async () => {
    const content = JSON.stringify({ title: 'Test' });
    const result = await strategy.package(
      content,
      'json',
      mockProvenance
    );

    const parsed = JSON.parse(result.mainContent as string);
    expect(parsed._provenance).toBeDefined();
    expect(parsed._provenance.format).toBe('embedded-provenance-v1');
  });

  it('should handle compression when requested', async () => {
    const content = 'Lots of content here';
    const result = await strategy.package(
      content,
      'markdown',
      mockProvenance,
      undefined,
      { compressData: true }
    );

    expect(result.mainContent).toContain('BEGIN PROVENANCE METADATA');
  });
});

describe('Export Packaging Manager', () => {
  let manager: ExportPackagingManager;
  let mockProvenance: ParagraphProvenance[];

  beforeEach(() => {
    manager = new ExportPackagingManager();

    mockProvenance = [
      {
        paragraphId: 'p_789',
        documentId: 'doc_3',
        currentContent: 'Manager test',
        currentContentHash: 'ghi789',
        createdAt: Date.now(),
        events: [],
      },
    ];
  });

  it('should recommend sidecar for markdown', () => {
    const strategy = manager.getRecommendedStrategy('markdown');
    expect(strategy).toBe('sidecar');
  });

  it('should recommend sidecar for text', () => {
    const strategy = manager.getRecommendedStrategy('text');
    expect(strategy).toBe('sidecar');
  });

  it('should recommend embedded for HTML', () => {
    const strategy = manager.getRecommendedStrategy('html');
    expect(strategy).toBe('embedded');
  });

  it('should recommend embedded for PDF', () => {
    const strategy = manager.getRecommendedStrategy('pdf');
    expect(strategy).toBe('embedded');
  });

  it('should recommend embedded for JSON', () => {
    const strategy = manager.getRecommendedStrategy('json');
    expect(strategy).toBe('embedded');
  });

  it('should validate format/strategy compatibility', () => {
    expect(manager.supportsFormat('sidecar', 'markdown')).toBe(true);
    expect(manager.supportsFormat('sidecar', 'text')).toBe(true);
    expect(manager.supportsFormat('sidecar', 'html')).toBe(false);
    expect(manager.supportsFormat('sidecar', 'pdf')).toBe(false);

    expect(manager.supportsFormat('embedded', 'html')).toBe(true);
    expect(manager.supportsFormat('embedded', 'pdf')).toBe(true);
    expect(manager.supportsFormat('embedded', 'json')).toBe(true);
    expect(manager.supportsFormat('embedded', 'markdown')).toBe(true);
  });

  it('should package with auto-selected strategy', async () => {
    const result = await manager.package(
      'Test content',
      { format: 'markdown' },
      mockProvenance
    );

    expect(result.mainFileName).toBe('document.md');
    expect(result.sidecarFiles).toBeDefined();
  });

  it('should create config with defaults', () => {
    const config = manager.createConfig('markdown');
    expect(config.strategy).toBe('sidecar');
    expect(config.format).toBe('markdown');
    expect(config.includeCPASignature).toBe(true);
  });

  it('should throw error for unsupported format/strategy combination', async () => {
    await expect(
      manager.package(
        'content',
        { strategy: 'sidecar', format: 'html' },
        mockProvenance
      )
    ).rejects.toThrow();
  });
});
