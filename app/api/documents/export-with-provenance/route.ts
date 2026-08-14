/**
 * GET /api/documents/:id/export-with-provenance
 *
 * Exports a document with full provenance metadata
 * Includes:
 * - Document content
 * - AI turn history with sources (human/AI/modified)
 * - Provider policies used
 * - Encryption and backup metadata
 * - Audit trail
 *
 * Returns ZIP file with:
 * - document.md (or .txt)
 * - provenance.json (metadata)
 * - ai-history.json (AI interactions)
 * - audit-log.json (who did what and when)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@/lib/db';
import { documents, aiTurns, aiTurnProvenance, aiProviderPolicies, privacyAuditLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/auth.config';
import { createReadStream } from 'fs';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import archiver from 'archiver';

const pipelineAsync = promisify(pipeline);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const documentId = params.id;

    // Fetch document
    const doc = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.userId, session.user.id)
        )
      )
      .limit(1);

    if (!doc || doc.length === 0) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }

    const document = doc[0];

    // Fetch AI turns with provenance
    const turns = await db
      .select()
      .from(aiTurns)
      .where(eq(aiTurns.documentId, documentId));

    const provenance = await db
      .select()
      .from(aiTurnProvenance)
      .where(
        turns.length > 0
          ? eq(aiTurnProvenance.turnId, turns[0].id)
          : eq(aiTurnProvenance.turnId, '')
      );

    // Fetch policies used
    const policies = await db
      .select()
      .from(aiProviderPolicies);

    // Fetch audit log
    const auditLog = await db
      .select()
      .from(privacyAuditLog)
      .where(eq(privacyAuditLog.userId, session.user.id));

    // Create export data
    const exportData = {
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        wordCount: document.content?.split(/\s+/).length || 0,
      },
      provenance: {
        turns: turns.map((turn) => ({
          id: turn.id,
          index: turn.index,
          userMessage: turn.userMessage,
          assistantResponse: turn.assistantResponse,
          model: turn.model,
          createdAt: turn.createdAt,
          metadata: provenance.find((p) => p.turnId === turn.id) || null,
        })),
      },
      policies: policies.map((policy) => ({
        id: policy.id,
        provider: policy.provider,
        displayName: policy.displayName,
        dataRetentionDays: policy.dataRetentionDays,
        usesDataForTraining: policy.usesDataForTraining,
        processingLocations: policy.processingLocations,
        gdprCompliant: policy.gdprCompliant,
      })),
      auditLog: auditLog
        .filter((entry) => entry.documentId === documentId || !entry.documentId)
        .map((entry) => ({
          id: entry.id,
          action: entry.action,
          context: entry.context,
          timestamp: entry.timestamp,
          documentId: entry.documentId,
        })),
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportFormat: 'privacy-provenance-v1',
        includesAiHistory: turns.length > 0,
        includesAuditTrail: auditLog.length > 0,
      },
    };

    // Create ZIP file
    const tmpFile = join(tmpdir(), `export-${documentId}-${Date.now()}.zip`);
    const output = createWriteStream(tmpFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // Add document content
    archive.append(document.content || '', {
      name: `document.${document.content ? 'md' : 'txt'}`,
    });

    // Add provenance metadata
    archive.append(JSON.stringify(exportData, null, 2), {
      name: 'provenance.json',
    });

    // Add AI history
    if (turns.length > 0) {
      const aiHistory = {
        turnCount: turns.length,
        turns: turns.map((turn, idx) => ({
          index: idx,
          userMessage: turn.userMessage,
          assistantResponse: turn.assistantResponse,
          model: turn.model,
          createdAt: turn.createdAt,
          source: provenance.find((p) => p.turnId === turn.id)?.source || 'unknown',
        })),
      };
      archive.append(JSON.stringify(aiHistory, null, 2), {
        name: 'ai-history.json',
      });
    }

    // Add audit log
    if (auditLog.length > 0) {
      const log = auditLog
        .filter((entry) => entry.documentId === documentId || !entry.documentId)
        .map((entry) => ({
          timestamp: entry.timestamp,
          action: entry.action,
          context: entry.context,
        }));
      archive.append(JSON.stringify(log, null, 2), {
        name: 'audit-log.json',
      });
    }

    // Add README
    archive.append(
      `# Document Export with Provenance

This export contains your document with full privacy and audit information.

## Files Included
- document.md/txt - Your document content
- provenance.json - Full metadata about sources and processing
- ai-history.json - AI interactions and model information
- audit-log.json - Complete audit trail of changes

## Privacy Information
- Export format: Privacy-Provenance-v1
- Exported: ${new Date().toISOString()}
- Document: ${document.title}

## How to Use
1. Keep this export secure - it contains full audit trails
2. Import metadata into privacy dashboards or compliance tools
3. Archive for data retention and compliance purposes

For more information, see PRIVACY_ARCHITECTURE.md in the main documentation.
`,
      { name: 'README.md' }
    );

    await new Promise<void>((resolve, reject) => {
      archive.on('finish', () => resolve());
      archive.on('error', reject);
      archive.finalize().catch(reject);
    });

    // Read and send file
    const fileStream = createReadStream(tmpFile);

    return new NextResponse(fileStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="document-export-${document.id}-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error('[GET /api/documents/:id/export-with-provenance] Error:', error);
    return NextResponse.json(
      { message: 'Failed to export document with provenance' },
      { status: 500 }
    );
  }
}
