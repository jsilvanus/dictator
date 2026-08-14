/**
 * Phase 5: Sync Activity Log Endpoint
 * GET /api/sync/activity-log - Get user activity log
 */

import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { syncNotificationService } from '@/lib/sync';

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();

    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const documentId = url.searchParams.get('document_id');

    let logs;
    let total = 0;

    if (documentId) {
      logs = await syncNotificationService.getDocumentActivityLog(documentId, limit);
      total = logs.length;
    } else {
      const result = await syncNotificationService.getActivityLog(session.userId, limit, offset);
      logs = result.logs;
      total = result.total;
    }

    return NextResponse.json({
      ok: true,
      activities: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        documentId: log.documentId,
        deviceId: log.deviceId,
        action: log.action,
        details: log.details,
        timestamp: log.timestamp.toISOString(),
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
