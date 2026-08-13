/**
 * Phase 5: Sync Notification Detail Endpoint
 * PUT /api/sync/notifications/[id] - Mark as read
 * DELETE /api/sync/notifications/[id] - Delete notification
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { syncNotifications } from '@/lib/db/schema';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getRequiredSession(); // Permission check
    const { id } = await params;

    // Mark as read
    await db
      .update(syncNotifications)
      .set({ read: true })
      .where(eq(syncNotifications.id, id));

    return NextResponse.json({
      ok: true,
      message: 'Notification marked as read',
      notificationId: id,
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getRequiredSession(); // Permission check
    const { id } = await params;

    // Delete notification
    await db.delete(syncNotifications).where(eq(syncNotifications.id, id));

    return NextResponse.json({
      ok: true,
      message: 'Notification deleted',
      notificationId: id,
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
