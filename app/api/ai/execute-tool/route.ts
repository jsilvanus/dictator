/**
 * API endpoint: POST /api/ai/execute-tool
 * Executes a tool call with permission checking and error handling
 */

import { NextResponse } from 'next/server';

import { ToolCall } from '@/lib/ai/providers/types';
import { getGlobalExecutor } from '@/lib/ai/tools/executor';
import { getRequiredSession } from '@/lib/auth/session';
import { aiRateLimiter } from '@/lib/rate-limiter';

type ExecuteToolRequest = {
  toolCall: ToolCall;
  documentId?: string;
};

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getRequiredSession();
    
    if (!session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Check rate limit
    const limiter = aiRateLimiter.check(session.userId);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
      );
    }

    // Parse request body
    const body = (await request.json()) as ExecuteToolRequest;

    if (!body.toolCall || !body.toolCall.name) {
      return NextResponse.json(
        { error: 'Invalid tool call: missing name' },
        { status: 400 },
      );
    }

    if (!body.toolCall.id) {
      return NextResponse.json(
        { error: 'Invalid tool call: missing id' },
        { status: 400 },
      );
    }

    // Execute tool
    const executor = getGlobalExecutor();
    const result = await executor.execute(body.toolCall, {
      userId: session.userId,
      documentId: body.documentId,
      sessionId: session.sessionId,
      requestId: request.headers.get('x-request-id') || `req-${Date.now()}`,
    });

    // Check for permission denied errors
    if (result.errorCode === 'permission_denied') {
      return NextResponse.json(
        {
          error: result.error || 'Permission denied',
          code: result.errorCode,
          target: result.target,
          toolCallId: result.toolCallId,
        },
        { status: 403 },
      );
    }

    // Return result
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to execute tool:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute tool',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
