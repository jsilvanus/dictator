/**
 * Phase 4: Version Tag Endpoint
 * POST /api/documents/[id]/versions/[versionNumber]/tag
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { versionHistoryService } from '@/lib/sync';

interface TagRequest {
  tag: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionNumber: string }> }
) {
  try {
    const session = await getRequiredSession();
    const { id, versionNumber } = await params;
    const version = parseInt(versionNumber);
    const body = (await request.json()) as TagRequest;

    if (!body.tag || body.tag.trim().length === 0) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }

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

    // Tag the version
    await versionHistoryService.tagSnapshot(id, version, body.tag);

    return NextResponse.json({
      ok: true,
      message: `Successfully tagged version ${version}`,
      documentId: id,
      versionNumber: version,
      tag: body.tag,
    });
  } catch (error) {
    console.error('Error tagging version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
