import { and, desc, eq, gte } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents, documentVersions, shares } from '@/lib/db/schema';

interface PullVersionsRequest {
  since?: string;
  limit?: number;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const body = (await request.json()) as PullVersionsRequest;
    const since = body.since;
    const limit = body.limit || 50;

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

    // Build query
    let query = db
      .select({
        id: documentVersions.id,
        content: documentVersions.content,
        deviceSource: documentVersions.deviceSource,
        deviceVersion: documentVersions.deviceVersion,
        savedAt: documentVersions.savedAt,
      })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id));

    if (since) {
      const sinceDate = new Date(since);
      query = db
        .select({
          id: documentVersions.id,
          content: documentVersions.content,
          deviceSource: documentVersions.deviceSource,
          deviceVersion: documentVersions.deviceVersion,
          savedAt: documentVersions.savedAt,
        })
        .from(documentVersions)
        .where(and(eq(documentVersions.documentId, id), gte(documentVersions.savedAt, sinceDate)));
    }

    const versions = await query.orderBy(desc(documentVersions.savedAt)).limit(limit);

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        content: v.content,
        deviceSource: v.deviceSource,
        deviceVersion: v.deviceVersion,
        savedAt: v.savedAt.toISOString(),
      })),
      count: versions.length,
      documentId: id,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
