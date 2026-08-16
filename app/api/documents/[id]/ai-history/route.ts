/**
 * GET /api/documents/:id/ai-history
 *
 * Fetch complete AI turn history with provenance metadata for a document
 * Used by both web UI (AiHistoryPanel) and Android (AIHistoryScreen)
 *
 * Query parameters:
 * - limit: number of turns to fetch (default: 50)
 * - offset: pagination offset (default: 0)
 */

import { and, eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { aiSessions, aiTurnProvenance, documents } from '@/lib/db/schema';

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const documentId = (await params).id;

    // Verify user owns the document
    const doc = await db
      .select({ id: documents.id })
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

    // Get AI sessions for this document
    const sessions = await db
      .select()
      .from(aiSessions)
      .where(
        and(
          eq(aiSessions.documentId, documentId),
          eq(aiSessions.userId, session.user.id)
        )
      );

    if (sessions.length === 0) {
      return NextResponse.json({
        turns: [],
        total: 0,
        limit,
        offset,
      });
    }

    const sessionIds = sessions.map(s => s.id);

    // Get provenance data for all turns in these sessions
    const provenance = await db
      .select()
      .from(aiTurnProvenance)
      .where(
        sessionIds.length > 0
          ? inArray(aiTurnProvenance.aiSessionId, sessionIds)
          : undefined
      );

    // Map turns from sessions with provenance data
    const turnsWithProvenance = sessions.flatMap(session => {
      const turns = (session.turns || []) as Array<{ id?: string; role: string; content: string; createdAt?: number }>;
      return turns.map((turn, index) => {
        const prov = provenance.find(p => p.aiSessionId === session.id && p.turnId === (turn.id || `${session.id}-${index}`));
        return {
          sessionId: session.id,
          turnIndex: index,
          userMessage: turn.role === 'user' ? turn.content : '',
          assistantResponse: turn.role === 'assistant' ? turn.content : '',
          provenance: prov ? {
            source: prov.source,
            confidence: prov.confidence,
            contentScope: prov.contentScope,
            device: prov.device,
            reviewedAt: prov.reviewedAt,
            thinkingBudgetTokens: prov.thinkingBudgetTokens,
            createdAt: prov.createdAt,
          } : null,
        };
      });
    })
    .sort((a, b) => {
      const aTime = a.provenance?.createdAt?.getTime() || 0;
      const bTime = b.provenance?.createdAt?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(offset, offset + limit);

    return NextResponse.json({
      turns: turnsWithProvenance,
      total: turnsWithProvenance.length,
      limit,
      offset,
      documentId,
    });
  } catch (error) {
    console.error('[GET /api/documents/:id/ai-history] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI history' },
      { status: 500 }
    );
  }
}
