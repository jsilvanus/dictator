/**
 * Phase 2 API: Resolve Individual Conflict
 * GET: Get conflict details
 * PUT: Resolve conflict (manual, device priority, or 3-way merge)
 */

import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { conflictResolutionService } from '@/lib/sync';

interface ResolveConflictRequest {
  strategy: 'manual' | 'device-priority' | '3way-merge';
  resolvedContent?: Record<string, unknown>;
  androidPriority?: number;
  webPriority?: number;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;

    const history = await conflictResolutionService.getConflictHistory(id, 1);

    if (!history.length) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    return NextResponse.json({
      conflict: history[0],
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const body = (await request.json()) as ResolveConflictRequest;

    let resolved;

    if (body.strategy === 'manual' && body.resolvedContent) {
      // Manual resolution with user-provided content
      resolved = await conflictResolutionService.resolveConflictManually(id, body.resolvedContent);
    } else if (body.strategy === 'device-priority' && body.androidPriority !== undefined && body.webPriority !== undefined) {
      // Resolution based on device priority
      resolved = await conflictResolutionService.resolveConflictByDevicePriority(id, body.androidPriority, body.webPriority);
    } else if (body.strategy === '3way-merge') {
      // Get the conflict and perform 3-way merge
      const history = await conflictResolutionService.getConflictHistory(id, 1);
      if (!history.length) {
        return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
      }

      const conflict = history[0];
      const mergeResult = conflictResolutionService.perform3WayMerge(conflict.baseVersion, conflict.androidVersion, conflict.webVersion);

      if (mergeResult.resolved) {
        resolved = await conflictResolutionService.resolveConflictManually(id, mergeResult.content);
      } else {
        return NextResponse.json(
          {
            error: 'Cannot auto-resolve conflict with 3-way merge',
            conflicts: mergeResult.conflicts,
            mergeContent: mergeResult.content,
          },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        {
          error: 'Invalid resolution strategy or missing required parameters',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: 'Conflict resolved',
      conflict: resolved,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
