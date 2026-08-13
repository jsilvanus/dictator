/**
 * Phase 2 API: Conflict Management
 * GET: List unresolved conflicts
 * POST: Detect conflict for a document
 */

import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { conflictResolutionService } from '@/lib/sync';

interface DetectConflictRequest {
  documentId: string;
  androidVersion: Record<string, unknown>;
  webVersion: Record<string, unknown>;
}

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();

    const conflicts = await conflictResolutionService.getUnresolvedConflicts(session.userId);

    return NextResponse.json({
      conflicts,
      count: conflicts.length,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as DetectConflictRequest;

    const conflict = await conflictResolutionService.detectConflict(body.documentId, body.androidVersion, body.webVersion);

    if (!conflict) {
      return NextResponse.json({
        message: 'No conflict detected',
        conflict: null,
      });
    }

    return NextResponse.json({
      message: 'Conflict detected',
      conflict,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
