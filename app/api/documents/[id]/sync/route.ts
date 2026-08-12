import { and, desc, eq, gte, lte, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents, documentVersions, shares, syncMetadata } from '@/lib/db/schema';

interface SyncResponse {
  document: {
    id: string;
    title: string;
    content: Record<string, unknown>;
    wordCount: number;
    lastModifiedDevice: string;
    deviceVersion: number;
    updatedAt: string;
  };
  versions: Array<{
    id: string;
    content: Record<string, unknown>;
    deviceSource: string;
    deviceVersion: number;
    savedAt: string;
  }>;
  syncMetadata: {
    lastSyncedAt: string;
    localVersion: number;
    remoteVersion: number;
    pendingChanges: number;
    conflictStatus: string;
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const url = new URL(request.url);
    const since = url.searchParams.get('since');

    // Verify access
    const [doc] = await db
      .select({
        id: documents.id,
        ownerId: documents.ownerId,
        canEdit: shares.permission,
      })
      .from(documents)
      .leftJoin(shares, and(eq(shares.documentId, documents.id), eq(shares.sharedWith, session.userId)))
      .where(eq(documents.id, id));

    if (!doc || (doc.ownerId !== session.userId && doc.canEdit !== 'edit' && doc.canEdit !== 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get document with all data
    const [docData] = await db.select().from(documents).where(eq(documents.id, id));

    // Get versions since timestamp (if provided)
    let versionsQuery = db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id));

    if (since) {
      const sinceDate = new Date(since);
      versionsQuery = db
        .select()
        .from(documentVersions)
        .where(and(eq(documentVersions.documentId, id), gte(documentVersions.savedAt, sinceDate)));
    }

    const versions = await versionsQuery.orderBy(desc(documentVersions.savedAt));

    // Get or create sync metadata
    let metadata = await db.select().from(syncMetadata).where(eq(syncMetadata.documentId, id));

    if (metadata.length === 0) {
      // Create initial sync metadata
      await db.insert(syncMetadata).values({
        documentId: id,
        lastSyncedAt: new Date(),
        localVersion: docData.deviceVersion,
        remoteVersion: docData.deviceVersion,
        pendingChanges: 0,
        conflictStatus: 'none',
      });

      metadata = await db.select().from(syncMetadata).where(eq(syncMetadata.documentId, id));
    }

    const response: SyncResponse = {
      document: {
        id: docData.id,
        title: docData.title,
        content: docData.content,
        wordCount: docData.wordCount,
        lastModifiedDevice: docData.lastModifiedDevice,
        deviceVersion: docData.deviceVersion,
        updatedAt: docData.updatedAt.toISOString(),
      },
      versions: versions.map((v) => ({
        id: v.id,
        content: v.content,
        deviceSource: v.deviceSource,
        deviceVersion: v.deviceVersion,
        savedAt: v.savedAt.toISOString(),
      })),
      syncMetadata: {
        lastSyncedAt: metadata[0].lastSyncedAt.toISOString(),
        localVersion: metadata[0].localVersion,
        remoteVersion: metadata[0].remoteVersion,
        pendingChanges: metadata[0].pendingChanges,
        conflictStatus: metadata[0].conflictStatus,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface SyncRequest {
  content: Record<string, unknown>;
  title: string;
  wordCount: number;
  deviceId: string;
  deviceVersion: number;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const body = (await request.json()) as SyncRequest;

    // Verify write access
    const [doc] = await db
      .select({
        id: documents.id,
        ownerId: documents.ownerId,
        lastModifiedDevice: documents.lastModifiedDevice,
        deviceVersion: documents.deviceVersion,
        content: documents.content,
        canEdit: shares.permission,
      })
      .from(documents)
      .leftJoin(shares, and(eq(shares.documentId, documents.id), eq(shares.sharedWith, session.userId)))
      .where(eq(documents.id, id));

    if (!doc || (doc.ownerId !== session.userId && doc.canEdit !== 'edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deviceIdPrefix = body.deviceId.startsWith('android-') ? 'android' : 'web';

    // Update document with device tracking
    const [updated] = await db
      .update(documents)
      .set({
        title: body.title,
        content: body.content,
        wordCount: body.wordCount,
        lastModifiedDevice: deviceIdPrefix,
        deviceVersion: body.deviceVersion,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    // Update sync metadata
    const existingMetadata = await db
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.documentId, id));

    if (existingMetadata.length > 0) {
      await db
        .update(syncMetadata)
        .set({
          lastSyncedAt: new Date(),
          remoteVersion: body.deviceVersion,
          pendingChanges: 0,
          conflictStatus: 'none',
          updatedAt: new Date(),
        })
        .where(eq(syncMetadata.documentId, id));
    } else {
      await db.insert(syncMetadata).values({
        documentId: id,
        lastSyncedAt: new Date(),
        localVersion: body.deviceVersion,
        remoteVersion: body.deviceVersion,
        pendingChanges: 0,
        conflictStatus: 'none',
      });
    }

    // Create version entry for tracking device origin
    await db.insert(documentVersions).values({
      documentId: id,
      content: body.content,
      deviceSource: deviceIdPrefix,
      deviceVersion: body.deviceVersion,
    });

    return NextResponse.json({
      ok: true,
      document: updated,
      syncMetadata: {
        lastSyncedAt: new Date().toISOString(),
        remoteVersion: body.deviceVersion,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
