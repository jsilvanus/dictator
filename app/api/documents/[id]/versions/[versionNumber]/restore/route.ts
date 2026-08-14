/**
 * Phase 4: Version Restore Endpoint
 * POST /api/documents/[id]/versions/[versionNumber]/restore
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { recoveryService, versionHistoryService } from '@/lib/sync';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionNumber: string }> }
) {
  try {
    const session = await getRequiredSession();
    const { id, versionNumber } = await params;
    const version = parseInt(versionNumber);

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

    // Restore to the version
    const restoredSnapshot = await recoveryService.restoreToVersion(id, version);

    // Record the restoration in version history
    await versionHistoryService.recordVersionMetadata(
      id,
      version + 1,
      version,
      `Restored from version ${version}`,
      0,
      JSON.stringify(restoredSnapshot.snapshotData).length,
      false
    );

    return NextResponse.json({
      ok: true,
      message: `Successfully restored document to version ${version}`,
      documentId: id,
      restoredVersionNumber: version,
      content: restoredSnapshot.snapshotData,
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    if (error instanceof Error && error.message.includes('No snapshot found')) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
