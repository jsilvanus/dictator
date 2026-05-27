import { NextResponse } from 'next/server';

import { buildPanelSystemPrompt } from '@/lib/ai/chat-prompts';
import { buildPanelContext, type InlineEditorSnapshot, type PanelTurn } from '@/lib/ai/context';
import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { aiSessions } from '@/lib/db/schema';
import { env } from '@/lib/env';
import { aiRateLimiter } from '@/lib/rate-limiter';

type ChatRequest = {
  message: string;
  snapshot: InlineEditorSnapshot & { fullText: string };
  documentId: string;
  history: PanelTurn[];
};

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const limiter = aiRateLimiter.check(session.userId);

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfter) } },
      );
    }

    const body = (await request.json()) as ChatRequest;
    const context = buildPanelContext(body.snapshot, body.history);

    const contextMessage = `[Document Context]\n${JSON.stringify({
      title: context.title,
      language: context.language,
      wordCount: context.wordCount,
      selection: context.selection,
      cursorParagraph: context.cursorParagraph,
      fullDocumentText: context.fullDocumentText,
    })}\n[/Document Context]`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: contextMessage },
      { role: 'assistant', content: "I've reviewed your document context. How can I help?" },
      ...body.history.slice(-20).map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
      { role: 'user', content: body.message },
    ];

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: buildPanelSystemPrompt(),
        messages,
        stream: true,
      }),
    });

    if (!anthropicResponse.ok || !anthropicResponse.body) {
      return NextResponse.json({ error: 'Chat AI request failed' }, { status: 502 });
    }

    const anthropicBody = anthropicResponse.body;
    const { userId } = session;
    const { documentId, history, message } = body;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicBody.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const event = JSON.parse(data) as {
                  type?: string;
                  delta?: { type?: string; text?: string };
                };
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  fullText += event.delta.text;
                  controller.enqueue(new TextEncoder().encode(event.delta.text));
                }
              } catch {
                // skip malformed SSE events
              }
            }
          }

          // Persist updated session after streaming completes
          const actionMatch = fullText.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
          const speech = fullText.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/, '').trim();
          const updatedTurns: Array<{ role: string; content: string }> = [
            ...history,
            { role: 'user', content: message },
            { role: 'assistant', content: speech },
          ];

          void db
            .insert(aiSessions)
            .values({
              documentId,
              userId,
              mode: 'panel',
              turns: updatedTurns,
            })
            .onConflictDoUpdate({
              target: [aiSessions.documentId, aiSessions.userId, aiSessions.mode],
              set: {
                turns: updatedTurns,
                updatedAt: new Date(),
              },
            })
            .catch(() => {
              // persistence failure is non-fatal
            });

          void actionMatch; // suppress unused variable warning
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
