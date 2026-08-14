/**
 * Phase 6: Version Branching Endpoint
 * POST /api/sync/branches - Create a branch
 * GET /api/sync/branches?document_id=... - List branches
 */

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { versionBranchingService } from '@/lib/sync';

interface CreateBranchRequest {
  documentId: string;
  branchName: string;
  baseVersion: number;
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as CreateBranchRequest;

    // Validate input
    if (!body.documentId || !body.branchName || !body.baseVersion) {
      return NextResponse.json(
        { error: 'documentId, branchName, and baseVersion are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const doc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, body.documentId))
      .limit(1);

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc[0].ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create branch
    const branch = await versionBranchingService.createBranch(
      body.documentId,
      body.branchName,
      body.baseVersion
    );

    return NextResponse.json({
      ok: true,
      message: 'Branch created successfully',
      branch: {
        id: branch.id,
        documentId: branch.documentId,
        branchName: branch.branchName,
        baseVersion: branch.baseVersion,
        isMain: branch.isMain,
        createdAt: branch.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();

    // Get query parameters
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');

    if (!documentId) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Verify ownership
    const doc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc || doc.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc[0].ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get branches
    const branches = await versionBranchingService.getBranches(documentId);

    return NextResponse.json({
      ok: true,
      documentId,
      branches: branches.map((b) => ({
        id: b.id,
        branchName: b.branchName,
        baseVersion: b.baseVersion,
        isMain: b.isMain,
        createdAt: b.createdAt.toISOString(),
      })),
      count: branches.length,
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
