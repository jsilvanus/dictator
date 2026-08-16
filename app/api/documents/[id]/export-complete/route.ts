/**
 * GET /api/documents/[id]/export-complete
 *
 * Complete export pipeline with format-specific packaging and optional C2PA signing.
 *
 * Query parameters:
 * - format: 'json' | 'markdown' | 'text' | 'html' | 'pdf' | 'csv' (default: 'markdown')
 * - packaging: 'sidecar' | 'embedded' (default: auto-selected by format)
 * - sign: boolean (default: true, if credentials available)
 * - includeProvenance: boolean (default: true)
 * - includeAuditTrail: boolean (default: true)
 *
 * Returns:
 * - For sidecar packaging: ZIP file with main content + sidecar JSON files
 * - For embedded packaging: Single file with embedded provenance metadata
 */

import { ZipArchive } from 'archiver';
import { and,eq } from 'drizzle-orm';
import { createWriteStream } from 'fs';
import { createReadStream } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { tmpdir } from 'os';
import { join } from 'path';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { createExportPipelineFromEnv } from '@/lib/export/ExportPipeline';

export const maxDuration = 60; // Long operation timeout

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequiredSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'markdown') as string;
    const packaging = (searchParams.get('packaging') || undefined) as string | undefined;
    const sign = searchParams.get('sign') !== 'false'; // default true
    const includeProvenance = searchParams.get('includeProvenance') !== 'false'; // default true
    const documentId = params.id;

    // Fetch document
    const doc = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.ownerId, session.userId)
        )
      )
      .limit(1);

    if (!doc || doc.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = doc[0];
    const content = typeof document.content === 'string'
      ? document.content
      : JSON.stringify(document.content);

    // Fetch paragraph provenance
    // TODO: Implement paragraph-level provenance tracking
    const provenance = [];

    // Create export pipeline
    const pipeline = createExportPipelineFromEnv();

    // Validate options
    const validationErrors = pipeline.validateOptions({
      documentId,
      documentTitle: document.title,
      format: format as any,
      packageStrategy: packaging as any,
      signExport: sign,
      includeDetailedProvenance: includeProvenance,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid export options', details: validationErrors },
        { status: 400 }
      );
    }

    // Execute export pipeline
    const result = await pipeline.execute(
      content,
      provenance,
      {
        documentId,
        documentTitle: document.title,
        format: format as any,
        packageStrategy: packaging as any,
        signExport: sign,
        includeDetailedProvenance: includeProvenance,
      }
    );

    // If sidecar packaging with sidecars, return ZIP
    if (result.sidecarFiles && result.sidecarFiles.length > 0) {
      return await createZipResponse(result, document.id);
    }

    // Otherwise, return single file
    const buffer = Buffer.isBuffer(result.mainContent)
      ? result.mainContent
      : Buffer.from(result.mainContent, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': result.mainMimeType,
        'Content-Disposition': `attachment; filename="${result.mainFileName}"`,
        'X-Export-Format': result.metadata.format,
        'X-Export-Strategy': result.metadata.strategy,
        'X-Export-Signed': result.metadata.signed.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[GET /api/documents/:id/export-complete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export document', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Create ZIP file response for sidecar packaging
 */
async function createZipResponse(
  result: any,
  documentId: string
): Promise<NextResponse> {
  const tmpFile = join(tmpdir(), `export-${documentId}-${Date.now()}.zip`);
  const output = createWriteStream(tmpFile);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  archive.pipe(output);

  // Add main content
  const mainContent = Buffer.isBuffer(result.mainContent)
    ? result.mainContent.toString('utf-8')
    : result.mainContent;
  archive.append(mainContent, { name: result.mainFileName });

  // Add sidecar files
  if (result.sidecarFiles) {
    for (const sidecar of result.sidecarFiles) {
      const content = Buffer.isBuffer(sidecar.content)
        ? sidecar.content.toString('utf-8')
        : sidecar.content;
      archive.append(content, { name: sidecar.fileName });
    }
  }

  // Add README
  const readme = `# Document Export

This export contains your document with provenance and optional C2PA signature.

## Files Included
- ${result.mainFileName} - Your document content
${result.sidecarFiles
  ?.map(f => `- ${f.fileName} - ${getFileDescription(f.fileName)}`)
  .join('\n') || ''}

## Export Metadata
- Format: ${result.metadata.format}
- Strategy: ${result.metadata.strategy}
- Signed: ${result.metadata.signed}
- Paragraphs: ${result.metadata.paragraphCount}
- Exported: ${result.metadata.exportedAt}

## How to Use
1. Extract this ZIP file
2. Main document content is in ${result.mainFileName}
3. Metadata and provenance are in the accompanying JSON files
4. If signed, C2PA manifest includes cryptographic verification

For more information, see the provenance metadata JSON files included.
`;

  archive.append(readme, { name: 'README.md' });

  // Finalize archive
  await new Promise<void>((resolve, reject) => {
    archive.on('finish', () => resolve());
    archive.on('error', reject);
    archive.finalize().catch(reject);
  });

  // Send file
  const fileStream = createReadStream(tmpFile);

  return new NextResponse(fileStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="document-export-${documentId}-${Date.now()}.zip"`,
    },
  });
}

/**
 * Get human-readable description for sidecar file
 */
function getFileDescription(fileName: string): string {
  if (fileName.includes('provenance')) return 'Paragraph-level provenance data';
  if (fileName.includes('c2pa')) return 'C2PA manifest with signature';
  if (fileName.includes('metadata')) return 'Export metadata';
  if (fileName.includes('audit')) return 'Audit trail';
  return 'Sidecar file';
}
