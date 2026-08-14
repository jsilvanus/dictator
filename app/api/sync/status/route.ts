import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents, pendingSyncQueue, syncMetadata } from '@/lib/db/schema';

interface SyncStatusResponse {
  documents: Array<{
    documentId: string;
    title: string;
    lastSyncedAt: string;
    conflictStatus: string;
    pendingChanges: number;
    hasPendingSync: boolean;
  }>;
  totalPending: number;
}

export async function GET() {
  try {
    const session = await getRequiredSession();

    // Get all documents for user with sync metadata
    const userDocs = await db
      .select({
        documentId: documents.id,
        title: documents.title,
        lastSyncedAt: syncMetadata.lastSyncedAt,
        conflictStatus: syncMetadata.conflictStatus,
        pendingChanges: syncMetadata.pendingChanges,
      })
      .from(documents)
      .leftJoin(syncMetadata, eq(documents.id, syncMetadata.documentId))
      .where(eq(documents.ownerId, session.userId));

    // Get pending syncs
    const pendingSyncs = await db
      .select({ documentId: pendingSyncQueue.documentId })
      .from(pendingSyncQueue)
      .where(eq(pendingSyncQueue.userId, session.userId));

    const pendingSyncDocIds = new Set(pendingSyncs.map((p) => p.documentId));

    const response: SyncStatusResponse = {
      documents: userDocs.map((doc) => ({
        documentId: doc.documentId,
        title: doc.title,
        lastSyncedAt: doc.lastSyncedAt?.toISOString() || new Date().toISOString(),
        conflictStatus: doc.conflictStatus || 'none',
        pendingChanges: doc.pendingChanges || 0,
        hasPendingSync: pendingSyncDocIds.has(doc.documentId),
      })),
      totalPending: pendingSyncs.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
