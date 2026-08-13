/**
 * Phase 4: Version Timeline Endpoint
 * GET /api/documents/[id]/versions/timeline
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { versionHistoryService } from '@/lib/sync';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;

    // Verify ownership
    const doc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc[0].ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

    // Get version timeline
    const timeline = await versionHistoryService.getVersionTimeline(id, limit);

    // Format for visualization
    const formattedTimeline = timeline.map((v, index) => ({
      versionNumber: v.versionNumber,
      timestamp: v.timestamp.toISOString(),
      device: v.createdByDevice,
      summary: v.changeSummary || `Version ${v.versionNumber}`,
      tags: v.tags,
      order: index,
    }));

    return NextResponse.json({
      ok: true,
      documentId: id,
      title: doc[0].title,
      timeline: formattedTimeline,
      count: formattedTimeline.length,
      timeSpan: {
        start: formattedTimeline.length > 0 ? formattedTimeline[0].timestamp : null,
        end: formattedTimeline.length > 0 ? formattedTimeline[formattedTimeline.length - 1].timestamp : null,
      },
    });
  } catch (error) {
    console.error('Error fetching version timeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
