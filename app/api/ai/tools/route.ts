/**
 * API endpoint: GET /api/ai/tools
 * Returns list of available tools with their schemas
 */

import { NextResponse } from 'next/server';
import { getGlobalRegistry } from '@/lib/ai/tools/registry';
import { getRequiredSession } from '@/lib/auth/session';

export async function GET() {
  try {
    // Verify user is authenticated
    const session = await getRequiredSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get all registered tools
    const registry = getGlobalRegistry();
    const tools = registry.getAllTools();

    return NextResponse.json({
      tools,
      count: tools.length,
      message: 'Available tools retrieved successfully',
    });
  } catch (error) {
    console.error('Failed to get tools:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve tools',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
