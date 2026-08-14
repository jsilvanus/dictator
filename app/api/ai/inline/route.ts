import { NextResponse } from 'next/server';

import { buildInlineContext, type InlineEditorSnapshot } from '@/lib/ai/context';
import { type AiResponse, buildInlineSystemPrompt } from '@/lib/ai/prompts';
import type { AiSession } from '@/lib/ai/session';
import { AiProviderFactory } from '@/lib/ai/providers/factory';
import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { userAiPreferences } from '@/lib/db/schema';
import { aiRateLimiter } from '@/lib/rate-limiter';
import { eq } from 'drizzle-orm';

type InlineRequest = {
  prompt: string;
  snapshot: InlineEditorSnapshot;
  session: AiSession;
};

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const limiter = aiRateLimiter.check(session.userId);

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(limiter.retryAfter),
          },
        },
      );
    }

    const body = (await request.json()) as InlineRequest;
    const context = buildInlineContext(body.snapshot, body.session);

    // Get user's AI preferences
    let provider = AiProviderFactory.createFromEnv();
    let userPrefs: any;
    try {
      userPrefs = await db.query.userAiPreferences.findFirst({
        where: eq(userAiPreferences.userId, session.userId),
      });

      if (userPrefs) {
        provider = AiProviderFactory.createByType(userPrefs.preferredProvider, {
          apiKey: process.env[`${userPrefs.preferredProvider.toUpperCase()}_API_KEY`],
          baseUrl: userPrefs.ollamaUrl || process.env[`${userPrefs.preferredProvider.toUpperCase()}_BASE_URL`],
          model: userPrefs.preferredModel,
          temperature: userPrefs.customTemperature ? Number(userPrefs.customTemperature) : undefined,
          maxTokens: userPrefs.customMaxTokens ?? undefined,
        });
      }
    } catch (e) {
      // Fall back to default provider if preference lookup fails
      console.error('Failed to load user AI preferences:', e);
    }

    // Use the selected provider for the request
    const aiResponse = await provider.askInline({
      prompt: JSON.stringify({
        prompt: body.prompt,
        context,
      }),
      context: buildInlineSystemPrompt(),
      temperature: 0.2,
      maxTokens: 800,
      thinkingBudgetTokens: userPrefs?.thinkingBudgetTokens ?? undefined,
    });

    // Parse and validate the response
    let parsed: AiResponse;
    try {
      parsed = JSON.parse(aiResponse.content) as AiResponse;
    } catch {
      return NextResponse.json({ error: 'AI returned malformed response' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
