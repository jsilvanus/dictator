/**
 * Phase 4: Version Diff Endpoint
 * GET /api/documents/[id]/versions/diff?from=1&to=2
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { diffService,versionHistoryService } from '@/lib/sync';

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

    // Get query parameters
    const url = new URL(request.url);
    const fromVersion = parseInt(url.searchParams.get('from') || '0');
    const toVersion = parseInt(url.searchParams.get('to') || '1');
    const format = url.searchParams.get('format') || 'json';

    // Get snapshots
    const [fromSnapshot, toSnapshot] = await Promise.all([
      versionHistoryService.getSnapshot(id, fromVersion),
      versionHistoryService.getSnapshot(id, toVersion),
    ]);

    if (!fromSnapshot || fromSnapshot.length === 0 || !toSnapshot || toSnapshot.length === 0) {
      return NextResponse.json({ error: 'One or both versions not found' }, { status: 404 });
    }

    // Convert snapshots to text for comparison
    const fromText = JSON.stringify(fromSnapshot[0].snapshotData, null, 2);
    const toText = JSON.stringify(toSnapshot[0].snapshotData, null, 2);

    // Generate diff
    const diff = diffService.generateDiff(fromText, toText);
    const similarity = diffService.calculateSimilarity(fromText, toText);

    if (format === 'unified') {
      return new Response(diff.unifiedDiff, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json({
      ok: true,
      documentId: id,
      from: fromVersion,
      to: toVersion,
      similarity,
      diff: {
        additions: diff.additions.slice(0, 50), // Limit output
        deletions: diff.deletions.slice(0, 50),
        modifications: diff.modifications.slice(0, 50),
      },
      unifiedDiff: diff.unifiedDiff,
    });
  } catch (error) {
    console.error('Error generating diff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
