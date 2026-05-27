import { NextResponse } from 'next/server';

import { buildInlineContext, type InlineEditorSnapshot } from '@/lib/ai/context';
import { type AiResponse,buildInlineSystemPrompt } from '@/lib/ai/prompts';
import type { AiSession } from '@/lib/ai/session';
import { getRequiredSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { aiRateLimiter } from '@/lib/rate-limiter';

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

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        temperature: 0.2,
        system: buildInlineSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              prompt: body.prompt,
              context,
            }),
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      return NextResponse.json({ error: 'Inline AI request failed' }, { status: 502 });
    }

    const raw = (await anthropicResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = raw.content?.find((entry) => entry.type === 'text')?.text ?? '{}';
    let parsed: AiResponse;
    try {
      parsed = JSON.parse(text) as AiResponse;
    } catch {
      return NextResponse.json({ error: 'Inline AI returned malformed response' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
