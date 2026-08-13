/**
 * Phase 4: Device Version Tracking Endpoint
 * GET /api/documents/[id]/device-versions
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

    // Get device sync status
    const deviceSyncStatus = await versionHistoryService.getDeviceSyncStatus(id);

    // Group by device
    const deviceMap = new Map();
    for (const record of deviceSyncStatus) {
      if (!deviceMap.has(record.deviceId)) {
        deviceMap.set(record.deviceId, []);
      }
      deviceMap.get(record.deviceId).push(record);
    }

    // Format response
    const devices = Array.from(deviceMap.entries()).map(([deviceId, versions]) => ({
      deviceId,
      type: deviceId.startsWith('android') ? 'android' : 'web',
      lastSyncedAt: versions[0]?.syncedAt.toISOString(),
      currentVersion: versions[0]?.deviceVersion || 0,
      status: versions[0]?.status || 'unknown',
      versionCount: versions.length,
      versions: versions.map((v) => ({
        versionNumber: v.deviceVersion,
        syncedAt: v.syncedAt.toISOString(),
        status: v.status,
      })),
    }));

    return NextResponse.json({
      ok: true,
      documentId: id,
      deviceCount: devices.length,
      devices,
      summary: {
        lastSync: devices.length > 0 
          ? devices.reduce((latest, d) => 
              new Date(d.lastSyncedAt || 0) > new Date(latest) ? d.lastSyncedAt : latest, 
              devices[0]?.lastSyncedAt || new Date().toISOString()
            )
          : null,
        synced: devices.filter((d) => d.status === 'synced').length,
        pending: devices.filter((d) => d.status === 'pending').length,
        conflicts: devices.filter((d) => d.status === 'conflict').length,
      },
    });
  } catch (error) {
    console.error('Error fetching device versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
