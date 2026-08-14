import { NextResponse } from 'next/server';

import { buildPanelSystemPrompt } from '@/lib/ai/chat-prompts';
import { buildPanelContext, type InlineEditorSnapshot, type PanelTurn } from '@/lib/ai/context';
import { AiProviderFactory } from '@/lib/ai/providers/factory';
import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { aiSessions, userAiPreferences } from '@/lib/db/schema';
import { aiRateLimiter } from '@/lib/rate-limiter';
import { eq } from 'drizzle-orm';
import { streamChatWithTools } from '@/lib/ai/tools/chat-integration';

type ChatRequest = {
  message: string;
  snapshot: InlineEditorSnapshot & { fullText: string };
  documentId: string;
  history: PanelTurn[];
  enableTools?: boolean;
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
    const context = buildPanelContext(body.snapshot);

    // Get user's AI preferences
    let provider = AiProviderFactory.createFromEnv();
    let userPrefs: { preferredProvider: string; preferredModel?: string; customTemperature?: { toString(): string } | number | null; customMaxTokens?: number | null; ollamaUrl?: string | null; thinkingBudgetTokens?: number | null } | undefined;
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

    const { userId } = session;
    const { documentId, history, message } = body;
    const enableTools = body.enableTools ?? false;

    // Create response stream with tool support if enabled
    let responseStream: ReadableStream<Uint8Array>;

    if (enableTools) {
      // Use tool-enabled chat streaming
      responseStream = new ReadableStream({
        async start(controller) {
          try {
            // Stream tool-enabled chat responses
            let fullText = '';
            let assistantToolCalls = [];

            for await (const chunk of streamChatWithTools(provider, {
              messages,
              systemPrompt: buildPanelSystemPrompt(),
              maxTokens: 2048,
            }, {
              context: {
                userId,
                documentId,
                sessionId: `session-${Date.now()}`,
                requestId: request.headers.get('x-request-id') || `req-${Date.now()}`,
              },
              maxToolCalls: 10,
              maxToolLoops: 3,
            })) {
              if (chunk.type === 'delta' && chunk.content) {
                fullText += chunk.content;
                controller.enqueue(new TextEncoder().encode(chunk.content));
              } else if (chunk.type === 'tool-call' && chunk.toolCall) {
                // Encode tool call as JSON for client to handle
                controller.enqueue(new TextEncoder().encode(`\n[TOOL_CALL:${JSON.stringify(chunk.toolCall)}]\n`));
                assistantToolCalls.push(chunk.toolCall);
              } else if (chunk.type === 'tool-result') {
                // Encode tool result
                controller.enqueue(new TextEncoder().encode(`\n[TOOL_RESULT:${JSON.stringify(chunk.result)}]\n`));
              }
            }

            const assistantContent = fullText.trim();
            const updatedTurns: Array<{ role: string; content: string }> = [
              ...history.slice(-20),
              { role: 'user', content: message },
              { role: 'assistant', content: assistantContent },
            ];

            // Save to database (non-blocking)
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
              .catch((e) => {
                console.error('Failed to persist AI session:', e);
              });
          } catch (error) {
            controller.enqueue(new TextEncoder().encode(`\n[ERROR:${error instanceof Error ? error.message : String(error)}]\n`));
          } finally {
            controller.close();
          }
        },
      });
    } else {
      // Use standard chat without tools
      const stream = await provider.chat({
        messages,
        systemPrompt: buildPanelSystemPrompt(),
        maxTokens: 2048,
        thinkingBudgetTokens: userPrefs?.thinkingBudgetTokens ?? undefined,
      });

      // Process stream and store in database
      responseStream = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          let fullText = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = JSON.parse(new TextDecoder().decode(new Uint8Array([...Buffer.from(JSON.stringify(value))]))) as {
                type: string;
                content?: string;
                error?: string;
              };

              if (chunk.type === 'delta' && chunk.content) {
                fullText += chunk.content;
                controller.enqueue(new TextEncoder().encode(chunk.content));
              } else if (chunk.type === 'error') {
                throw new Error(chunk.error || 'Unknown streaming error');
              }
            }

            const assistantContent = fullText.trim();
            const updatedTurns: Array<{ role: string; content: string }> = [
              ...history.slice(-20),
              { role: 'user', content: message },
              { role: 'assistant', content: assistantContent },
            ];

            // Save to database (non-blocking)
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
              .catch((e) => {
                console.error('Failed to persist AI session:', e);
              });
          } finally {
            reader.releaseLock();
            controller.close();
          }
        },
      });
    }

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error('Chat endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

    const { userId } = session;
    const { documentId, history, message } = body;

    // Process stream and store in database
    const newStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        let fullText = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = JSON.parse(new TextDecoder().decode(new Uint8Array([...Buffer.from(JSON.stringify(value))]))) as {
              type: string;
              content?: string;
              error?: string;
            };

            if (chunk.type === 'delta' && chunk.content) {
              fullText += chunk.content;
              controller.enqueue(new TextEncoder().encode(chunk.content));
            } else if (chunk.type === 'error') {
              throw new Error(chunk.error || 'Unknown streaming error');
            }
          }

          const assistantContent = fullText.trim();
          const updatedTurns: Array<{ role: string; content: string }> = [
            ...history.slice(-20),
            { role: 'user', content: message },
            { role: 'assistant', content: assistantContent },
          ];

          // Save to database (non-blocking)
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
            .catch((e) => {
              console.error('Failed to persist AI session:', e);
            });
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(newStream, {
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
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
