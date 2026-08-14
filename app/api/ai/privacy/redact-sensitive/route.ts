/**
 * POST /api/ai/privacy/redact-sensitive
 *
 * Redacts detected sensitive data from content before sending to AI
 * Replaces patterns with placeholders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth/auth.config';
import { SensitiveDataDetector } from '@/lib/privacy/SensitiveDataDetector';

const MAX_CONTENT_SIZE = 1024 * 1024; // 1MB

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { content } = await request.json();

    // Validate input
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { message: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_SIZE) {
      return NextResponse.json(
        { message: 'Content exceeds maximum size (1MB)' },
        { status: 413 }
      );
    }

    // Scan for sensitive data
    const detector = new SensitiveDataDetector();
    const scanResults = detector.scan(content);

    // Redact if sensitive data found
    let redactedContent = content;
    if (scanResults.detectedData.length > 0) {
      redactedContent = detector.redact(content, {
        replacementStrategy: 'placeholder', // [CREDIT_CARD_REDACTED], [SSN_REDACTED], etc.
      });
    }

    // Track telemetry
    // TODO: Log redaction event with data types but not the content

    return NextResponse.json({
      redactedContent,
      hasSensitiveData: scanResults.detectedData.length > 0,
      redactedCount: scanResults.detectedData.length,
    });
  } catch (error) {
    console.error('[/api/ai/privacy/redact-sensitive] Error:', error);
    return NextResponse.json(
      { message: 'Failed to redact sensitive data' },
      { status: 500 }
    );
  }
}
