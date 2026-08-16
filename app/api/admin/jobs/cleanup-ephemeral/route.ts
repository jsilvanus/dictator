/**
 * POST/GET /api/admin/jobs/cleanup-ephemeral
 *
 * Triggers the ephemeral AI request cleanup job
 * Can be called by:
 * - Cron jobs (via scheduled HTTP requests with X-Cron-Secret header)
 * - Admin dashboard
 * - Background job queue
 *
 * Authentication:
 * - X-Cron-Secret header for automated cron jobs
 * - Admin user role for manual triggers
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { cleanupEphemeralRequestsImproved } from '@/lib/jobs/cleanupEphemeralRequests';

/**
 * Verify cron secret header
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = request.headers.get('X-Cron-Secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.warn('CRON_SECRET not configured in environment');
    return false;
  }

  return cronSecret === expectedSecret;
}

/**
 * POST /api/admin/jobs/cleanup-ephemeral
 * Trigger cleanup job
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const isCron = verifyCronSecret(request);

    if (!isCron) {
      // Check if user is admin
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          { message: 'Unauthorized' },
          { status: 401 }
        );
      }

      // TODO: Verify user is admin
      // if (!isUserAdmin(session.user.id)) {
      //   return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      // }
    }

    // Run cleanup job
    const result = await cleanupEphemeralRequestsImproved();

    return NextResponse.json(
      {
        success: result.errors.length === 0,
        message: 'Cleanup job completed',
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[POST /api/admin/jobs/cleanup-ephemeral] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to run cleanup job',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/jobs/cleanup-ephemeral
 * Health check / manual trigger via GET
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const isCron = verifyCronSecret(request);

    if (!isCron) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { message: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Run cleanup job
    const result = await cleanupEphemeralRequestsImproved();

    return NextResponse.json(
      {
        success: result.errors.length === 0,
        message: 'Cleanup job completed',
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/admin/jobs/cleanup-ephemeral] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to run cleanup job',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
