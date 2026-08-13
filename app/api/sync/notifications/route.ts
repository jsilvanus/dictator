/**
 * Phase 5: Sync Notifications Endpoint
 * GET /api/sync/notifications - Get user notifications
 * PUT /api/sync/notifications/[id] - Mark as read
 */

import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { syncNotificationService } from '@/lib/sync';

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();

    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const unreadOnly = url.searchParams.get('unread_only') === 'true';

    let result;
    if (unreadOnly) {
      result = await syncNotificationService.getUnreadNotifications(session.userId);
    } else {
      result = await syncNotificationService.getNotifications(session.userId, limit, offset);
    }

    const notifications = Array.isArray(result)
      ? result.slice(offset, offset + limit)
      : result.notifications;
    const total = Array.isArray(result) ? result.length : result.total;

    return NextResponse.json({
      ok: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        documentId: n.documentId,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      unreadCount: await syncNotificationService.getUnreadCount(session.userId),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
