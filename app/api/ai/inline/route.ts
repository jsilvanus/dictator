import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { buildInlineContext, type InlineEditorSnapshot } from '@/lib/ai/context';
import { buildInlineSystemPrompt, type AiResponse } from '@/lib/ai/prompts';
import type { AiSession } from '@/lib/ai/session';
import { env } from '@/lib/env';

const REQUEST_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;

const rateLimit = new Map<string, { count: number; resetAt: number }>();

type InlineRequest = {
  prompt: string;
  snapshot: InlineEditorSnapshot;
  session: AiSession;
};

function applyRateLimit(userId: string) {
  const now = Date.now();
  const current = rateLimit.get(userId);

  if (!current || now >= current.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= REQUEST_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  rateLimit.set(userId, current);

  return { allowed: true, retryAfter: 0 };
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const limiter = applyRateLimit(session.userId);

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
    const parsed = JSON.parse(text) as AiResponse;

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
