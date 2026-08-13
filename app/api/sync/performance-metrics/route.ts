/**
 * Phase 6: Sync Performance Metrics Endpoint
 * GET /api/sync/performance-metrics?document_id=... - Get performance metrics
 * POST /api/sync/performance-metrics - Record a metric
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { syncPerformanceService } from '@/lib/sync';

interface RecordMetricRequest {
  documentId: string;
  syncTimeMs: number;
  dataSizeBytes: number;
  success: boolean;
  compressionRatio?: number;
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as RecordMetricRequest;

    // Validate input
    if (
      !body.documentId ||
      body.syncTimeMs === undefined ||
      body.dataSizeBytes === undefined ||
      body.success === undefined
    ) {
      return NextResponse.json(
        { error: 'documentId, syncTimeMs, dataSizeBytes, and success are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const doc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, body.documentId))
      .limit(1);

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc[0].ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Record metric
    const metric = await syncPerformanceService.recordMetric(
      body.documentId,
      body.syncTimeMs,
      body.dataSizeBytes,
      body.success,
      body.compressionRatio
    );

    return NextResponse.json({
      ok: true,
      message: 'Metric recorded',
      metric: {
        id: metric.id,
        documentId: metric.documentId,
        syncTimeMs: metric.syncTimeMs,
        dataSizeBytes: metric.dataSizeBytes,
        compressionRatio: metric.compressionRatio,
        success: metric.success,
        timestamp: metric.timestamp.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error recording metric:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();

    // Get query parameters
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0');

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

    // Get metrics
    const { metrics, total } = await syncPerformanceService.getMetrics(
      documentId,
      limit,
      offset
    );

    // Get slowest and largest
    const slowest = await syncPerformanceService.getSlowestSyncs(documentId, 5);
    const largest = await syncPerformanceService.getLargestSyncs(documentId, 5);
    const failed = await syncPerformanceService.getFailedSyncs(documentId, 10);

    return NextResponse.json({
      ok: true,
      documentId,
      metrics: metrics.map((m) => ({
        id: m.id,
        syncTimeMs: m.syncTimeMs,
        dataSizeBytes: m.dataSizeBytes,
        compressionRatio: m.compressionRatio,
        success: m.success,
        timestamp: m.timestamp.toISOString(),
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      summary: {
        slowest: slowest.map((m) => ({ syncTimeMs: m.syncTimeMs, timestamp: m.timestamp })),
        largest: largest.map((m) => ({ dataSizeBytes: m.dataSizeBytes, timestamp: m.timestamp })),
        failed: failed.map((m) => ({ timestamp: m.timestamp, success: m.success })),
      },
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
