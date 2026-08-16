/**
 * Endpoint: GET /api/ai/privacy/policies
 *
 * Returns AI provider policies for transparency
 * Includes privacy ratings, retention periods, training usage, etc.
 *
 * Supports optional provider filtering:
 * - ?provider=claude - Get specific provider policy
 * - ?provider=claude,openai - Get multiple providers
 * - No parameter - Get all providers
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import {
  type AiProviderPolicy,
  createDefaultPolicyManager,
} from '@/lib/privacy';

export const runtime = 'nodejs';

interface ProviderPolicyResponse {
  policies: AiProviderPolicy[];
  providers: Array<{
    provider: string;
    displayName: string;
    privacyRating: number;
    summary: string;
    recommendation?: string;
  }>;
  recommendations: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const providerParam = searchParams.get('provider');
    const include_summary = searchParams.get('include_summary') !== 'false';
    const include_recommendations = searchParams.get('include_recommendations') !== 'false';

    // Initialize policy manager
    const policyManager = createDefaultPolicyManager();

    // Get providers to return
    let providers = policyManager.getAvailableProviders();

    if (providerParam) {
      const requested = providerParam.split(',').map((p) => p.trim());
      providers = providers.filter((p) => requested.includes(p.provider));
    }

    // Build response
    const policies: AiProviderPolicy[] = [];
    const providersData = providers.map((p) => {
      const policy = policyManager.getLatestPolicyForProvider(p.provider);
      if (policy) {
        policies.push(policy);
      }

      return {
        provider: p.provider,
        displayName: p.displayName,
        privacyRating: policyManager.getPrivacyRating(p.provider),
        ...(include_summary && {
          summary: policyManager.getPrivacySummary(p.provider),
        }),
      };
    });

    const response: ProviderPolicyResponse = {
      policies,
      providers: providersData,
      ...(include_recommendations && {
        recommendations: policyManager.getPrivacyRecommendations(),
      }),
    };

    // Cache for 1 hour (policies don't change frequently)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Policy fetch failed:', error);
    return NextResponse.json(
      { error: 'Policy fetch failed' },
      { status: 500 }
    );
  }
}
