/**
 * GET /api/documents/:id/export
 *
 * Export a document with full AI provenance metadata in multiple formats
 *
 * Query parameters:
 * - format: 'json' | 'markdown' | 'csv' (default: 'json')
 * - include: 'content' | 'history' | 'audit' | 'all' (default: 'all')
 */

import { and, eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { aiSessions, aiTurnProvenance,documents } from '@/lib/db/schema';
import {
  type AiHistoryItem,
  type DocumentExportData,
  type ExportFormat,
  getExportFormat,
} from '@/lib/export/ExportFormats';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json') as ExportFormat;
    const include = (searchParams.get('include') || 'all');
    const documentId = (await params).id;

    // Validate format
    if (!['json', 'markdown', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format' },
        { status: 400 }
      );
    }

    // Fetch document
    const doc = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.ownerId, session.user.id)
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
    const aiHistory: AiHistoryItem[] = [];

    // Fetch AI history if requested
    if (include === 'all' || include === 'history') {
      const sessions = await db
        .select()
        .from(aiSessions)
        .where(
          and(
            eq(aiSessions.documentId, documentId),
            eq(aiSessions.userId, session.user.id)
          )
        );

      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const provenance = await db
          .select()
          .from(aiTurnProvenance)
          .where(
            sessionIds.length > 0
              ? inArray(aiTurnProvenance.aiSessionId, sessionIds)
              : undefined
          );

        // Map turns with provenance
        sessions.forEach(session => {
          const turns = (session.turns || []) as Array<{ id?: string; role: string; content: string; createdAt?: number }>;
          let userMessage = '';
          let assistantResponse = '';

          turns.forEach((turn, index) => {
            if (turn.role === 'user') {
              userMessage = turn.content;
            } else if (turn.role === 'assistant') {
              assistantResponse = turn.content;
              const turnId = turn.id || `${session.id}-${index}`;
              const prov = provenance.find(p => p.aiSessionId === session.id && p.turnId === turnId);

              aiHistory.push({
                sessionId: session.id,
                turnIndex: index,
                userMessage,
                assistantResponse,
                model: undefined,
                provider: undefined,
                provenance: prov ? {
                  source: prov.source,
                  confidence: prov.confidence
                    ? parseFloat(prov.confidence.toString())
                    : undefined,
                  contentScope: prov.contentScope ?? undefined,
                  device: prov.device,
                  reviewedAt: prov.reviewedAt?.getTime(),
                  thinkingBudgetTokens: prov.thinkingBudgetTokens || undefined,
                  createdAt: prov.createdAt.getTime(),
                } : null,
              });
            }
          });
        });
      }
    }

    // Prepare export data
    const exportData: DocumentExportData = {
      id: document.id,
      title: document.title,
      content: (document.content as any)?.toString?.() || '',
      wordCount: document.wordCount,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      aiHistory,
    };

    // Get export format handler
    const exportFormat = getExportFormat(format);

    // Generate export content
    const content = await exportFormat.export(exportData);

    // Return response
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, 'utf-8');

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': exportFormat.mimeType,
        'Content-Disposition': `attachment; filename="${exportFormat.getFilename(
          document.title
        )}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[GET /api/documents/:id/export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export document' },
      { status: 500 }
    );
  }
}
