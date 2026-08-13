/**
 * Phase 5: Sync Schedule Endpoint
 * POST /api/sync/schedule - Configure sync schedule
 * GET /api/sync/schedule - Get sync schedules
 */

import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';

interface SyncScheduleRequest {
  documentId: string;
  intervalMinutes?: number;
  onFileChange?: boolean;
  batteryAware?: boolean;
  bandwidthLimit?: number;
}

export async function POST(request: Request) {
  try {
    await getRequiredSession(); // Permission check
    const body = (await request.json()) as SyncScheduleRequest;

    // Validate input
    if (!body.documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    if (body.intervalMinutes && body.intervalMinutes < 5) {
      return NextResponse.json(
        { error: 'Minimum sync interval is 5 minutes' },
        { status: 400 }
      );
    }

    // In a real implementation, this would:
    // 1. Validate the document ownership
    // 2. Store the schedule in a database
    // 3. Initialize any scheduled tasks

    return NextResponse.json({
      ok: true,
      message: 'Sync schedule configured',
      schedule: {
        documentId: body.documentId,
        intervalMinutes: body.intervalMinutes || 60,
        onFileChange: body.onFileChange ?? false,
        batteryAware: body.batteryAware ?? true,
        bandwidthLimit: body.bandwidthLimit,
      },
    });
  } catch (error) {
    console.error('Error configuring sync schedule:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_request: Request) {
  try {
    await getRequiredSession(); // Permission check

    // In a real implementation, this would fetch all configured schedules for the user

    return NextResponse.json({
      ok: true,
      schedules: [
        {
          documentId: 'placeholder-id',
          intervalMinutes: 60,
          onFileChange: false,
          batteryAware: true,
          bandwidthLimit: null,
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching sync schedules:', error);
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
