/**
 * Phase 2 API: Device Preferences
 * GET: Get current device preferences
 * PUT: Update device preferences
 */

import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { conflictResolutionService } from '@/lib/sync';
import type { DevicePreferences } from '@/lib/sync';

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();

    const prefs = await conflictResolutionService.getDevicePreferences(session.userId);

    return NextResponse.json({
      preferences: prefs,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getRequiredSession();
    const updates = (await request.json()) as Partial<DevicePreferences>;

    await conflictResolutionService.updateDevicePreferences(session.userId, updates);

    const prefs = await conflictResolutionService.getDevicePreferences(session.userId);

    return NextResponse.json({
      message: 'Preferences updated',
      preferences: prefs,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
