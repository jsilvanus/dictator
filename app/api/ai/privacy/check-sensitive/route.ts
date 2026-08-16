/**
 * Endpoint: POST /api/ai/privacy/check-sensitive
 *
 * Scans content for sensitive data before sending to AI provider
 * Returns detection results and warning message
 *
 * This is called client-side before AI requests to warn users about
 * potentially sensitive content (credit cards, SSN, API keys, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { createDefaultDetector, type SensitiveDataScanResult } from '@/lib/privacy';
import { getTelemetryService } from '@/lib/privacy/TelemetryService';

export const runtime = 'nodejs';

interface CheckSensitiveRequest {
  content: string;
  returnSnippets?: boolean; // Include actual snippets in response (default: false for safety)
}

interface CheckSensitiveResponse {
  hasSensitiveData: boolean;
  detectionCount: number;
  types: string[];
  warning: string | null;
  scanResult?: Partial<SensitiveDataScanResult>; // Only if returnSnippets=true
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CheckSensitiveRequest;

    // Validate input
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    if (body.content.length > 1000000) {
      return NextResponse.json(
        { error: 'Content too large (max 1MB)' },
        { status: 413 }
      );
    }

    // Scan for sensitive data
    const detector = createDefaultDetector();
    const scanResult = detector.scan(body.content);
    const warning = detector.getScanWarning(body.content);

    // Get unique types
    const types = Array.from(new Set(scanResult.detected.map((d) => d.type)));

    // Track event
    const telemetry = getTelemetryService();
    if (telemetry && session.user?.email) {
      const pseudonymousId = telemetry.generatePseudonymousUserId(session.user.email);
      telemetry.trackEvent(
        'ai-request',
        pseudonymousId,
        'sensitive-data-scan',
        'web',
        {
          metrics: {
            customMetrics: {
              sensitiveDataCount: scanResult.detected.length,
            },
          },
        }
      );
    }

    // Build response
    const response: CheckSensitiveResponse = {
      hasSensitiveData: scanResult.hasSensitiveData,
      detectionCount: scanResult.detected.length,
      types,
      warning,
    };

    // Only include snippets if explicitly requested
    if (body.returnSnippets) {
      response.scanResult = {
        hasSensitiveData: scanResult.hasSensitiveData,
        detected: scanResult.detected,
        scannedAt: scanResult.scannedAt,
        scannerVersion: scanResult.scannerVersion,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Privacy check failed:', error);
    return NextResponse.json(
      { error: 'Privacy check failed' },
      { status: 500 }
    );
  }
}
