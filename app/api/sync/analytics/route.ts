/**
 * Phase 6: Sync Analytics Endpoint
 * GET /api/sync/analytics?document_id=... - Get sync analytics
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { syncPerformanceService } from '@/lib/sync';

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();

    // Get query parameters
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');
    const period = (url.searchParams.get('period') || 'day') as 'hour' | 'day' | 'week' | 'month';

    if (!documentId) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Verify ownership
    const doc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc[0].ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get analytics
    const analytics = await syncPerformanceService.getAnalytics(documentId, period);
    const trends = await syncPerformanceService.getPerformanceTrends(documentId, 'day');
    const recommendations = await syncPerformanceService.getBandwidthRecommendations(documentId);
    const compressionRec = await syncPerformanceService.getCompressionRecommendation(documentId);

    return NextResponse.json({
      ok: true,
      documentId,
      analytics: {
        ...analytics,
        successRate: await syncPerformanceService.getSuccessRate(documentId),
      },
      trends: trends.slice(-30), // Last 30 days
      recommendations: {
        bandwidth: recommendations,
        compression: compressionRec,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
