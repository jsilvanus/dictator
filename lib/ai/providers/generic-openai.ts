import { BaseAiProvider } from './base';
import { AiChatRequest, AiInlineRequest, AiResponse, AiStreamChunk, ModelProvider } from './types';

/**
 * Generic OpenAI-Compatible Provider
 * Implements provider interface for any service that follows OpenAI's API format
 */
export class GenericOpenAiProvider extends BaseAiProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string, model: string = 'gpt-3.5-turbo') {
    super(model, 0.7, 2048);
    // Ensure no trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.baseUrl && !!this.apiKey;
  }

  getProviderType(): ModelProvider {
    return 'openai-compatible';
  }

  async askInline(request: AiInlineRequest): Promise<AiResponse> {
    if (!this.isConfigured()) {
      throw new Error('Generic OpenAI provider not configured: missing base URL or API key');
    }

    const params = this.mergeRequestParams(request);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `******
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages: [
            {
              role: 'system',
              content: request.context || 'You are a helpful AI assistant.',
            },
            {
              role: 'user',
              content: request.prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI-compatible API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content ?? '';

      return {
        content,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      throw new Error(
        `OpenAI-compatible API request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async chat(request: AiChatRequest): Promise<ReadableStream<AiStreamChunk>> {
    if (!this.isConfigured()) {
      return this.createErrorStream('Generic OpenAI provider not configured: missing base URL or API key');
    }

    const params = this.mergeRequestParams(request);

    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      messages.push(...(request.messages as Array<{ role: 'user' | 'assistant'; content: string }>));

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `******
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return this.createErrorStream(`OpenAI-compatible API error: ${response.status} - ${error}`);
      }

      return this.createStreamFromResponse(response.body!);
    } catch (error) {
      return this.createErrorStream(
        `OpenAI-compatible chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert OpenAI-compatible SSE stream format to our internal format
   */
  private createStreamFromResponse(body: ReadableStream<Uint8Array>): ReadableStream<AiStreamChunk> {
    return new ReadableStream({
      async start(controller) {
        const reader = body.getReader();
        const decoder = new TextDecoder();

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
              if (!data) continue;

              try {
                const event = JSON.parse(data) as {
                  choices?: Array<{
                    delta?: { content?: string };
                    finish_reason?: string | null;
                  }>;
                };

                const choice = event.choices?.[0];
                if (choice?.delta?.content) {
                  controller.enqueue({
                    type: 'delta',
                    content: choice.delta.content,
                  });
                }

                if (choice?.finish_reason !== null && choice?.finish_reason) {
                  controller.enqueue({
                    type: 'complete',
                  });
                }
              } catch {
                // Skip malformed SSE events
              }
            }
          }

          controller.enqueue({
            type: 'complete',
          });
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });
  }
}
