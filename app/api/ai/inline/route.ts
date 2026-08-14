import { NextResponse } from 'next/server';

import { buildInlineContext, type InlineEditorSnapshot } from '@/lib/ai/context';
import { type AiResponse, buildInlineSystemPrompt } from '@/lib/ai/prompts';
import type { AiSession } from '@/lib/ai/session';
import { AiProviderFactory } from '@/lib/ai/providers/factory';
import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { userAiPreferences, documents } from '@/lib/db/schema';
import { aiRateLimiter } from '@/lib/rate-limiter';
import { eq, and } from 'drizzle-orm';

type InlineRequest = {
  prompt: string;
  snapshot: InlineEditorSnapshot;
  session: AiSession;
  documentId?: string;
};

// Helper function to calculate approximate token count
function estimateTokenCount(text: string): number {
  // Rough approximation: ~4 characters per token (based on common tokenizers)
  return Math.ceil(text.length / 4);
}

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

    // Get user's AI preferences and document settings
    let provider = AiProviderFactory.createFromEnv();
    let userPrefs: any;
    let docSystemPromptOverride: string | null = null;

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

      // Get document-level system prompt override if it exists
      if (body.documentId) {
        const doc = await db.query.documents.findFirst({
          where: and(eq(documents.id, body.documentId), eq(documents.ownerId, session.userId)),
        });
        if (doc?.systemPromptOverride) {
          docSystemPromptOverride = doc.systemPromptOverride;
        }
      }
    } catch (e) {
      // Fall back to default provider if preference lookup fails
      console.error('Failed to load user AI preferences:', e);
    }

    // Determine which system prompt to use
    const effectiveSystemPrompt = docSystemPromptOverride || userPrefs?.systemPrompt || undefined;

    // Calculate context size for response header
    const contextSize = estimateTokenCount(JSON.stringify(context));

    // Use the selected provider for the request
    const aiResponse = await provider.askInline({
      prompt: JSON.stringify({
        prompt: body.prompt,
        context,
      }),
      context: buildInlineSystemPrompt(effectiveSystemPrompt),
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

    return NextResponse.json(parsed, {
      headers: {
        'X-Context-Size': String(contextSize),
      },
    });
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
