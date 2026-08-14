/**
 * Phase 1 API: Sync Queue Management
 * POST: Process pending sync queue
 * GET: Get queue statistics
 */

import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { syncService } from '@/lib/sync';

export async function POST() {
  try {
    const session = await getRequiredSession();

    // Create and process a sync batch
    const batch = await syncService.createBatch(session.userId);

    if (batch.items.length === 0) {
      return NextResponse.json({
        message: 'No pending items to sync',
        succeeded: [],
        failed: [],
        stats: await syncService.getQueueStats(session.userId),
      });
    }

    const result = await syncService.processBatch(batch);

    return NextResponse.json({
      message: `Synced ${result.succeeded.length} items, ${result.failed.length} failed`,
      succeeded: result.succeeded,
      failed: result.failed,
      stats: await syncService.getQueueStats(session.userId),
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getRequiredSession();

    const stats = await syncService.getQueueStats(session.userId);

    return NextResponse.json({
      stats,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
