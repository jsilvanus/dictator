/**
 * Phase 2 API: Device Preferences
 * GET: Get current device preferences
 * PUT: Update device preferences
 */

/* eslint-disable simple-import-sort/imports */
import { NextResponse } from 'next/server';

import { conflictResolutionService, type DevicePreferences } from '@/lib/sync';
import { getRequiredSession } from '@/lib/auth/session';
/* eslint-enable simple-import-sort/imports */

export async function GET() {
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

export async function PUT(_request: Request) {
  try {
    const session = await getRequiredSession();
    const updates = (await _request.json()) as Partial<DevicePreferences>;

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
