import { BaseAiProvider } from './base';
import { AiChatRequest, AiInlineRequest, AiResponse, AiStreamChunk, ModelProvider } from './types';

/**
 * OpenAI Provider
 * Implements provider interface for OpenAI's API
 */
export class OpenAiProvider extends BaseAiProvider {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string, model: string = 'gpt-4o', baseUrl?: string) {
    super(model, 0.7, 2048);
    this.apiKey = apiKey;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getProviderType(): ModelProvider {
    return 'openai';
  }

  async askInline(request: AiInlineRequest): Promise<AiResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI provider not configured: missing API key');
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
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
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
      throw new Error(`OpenAI API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async chat(request: AiChatRequest): Promise<ReadableStream<AiStreamChunk>> {
    if (!this.isConfigured()) {
      return this.createErrorStream('OpenAI provider not configured: missing API key');
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
        return this.createErrorStream(`OpenAI API error: ${response.status} - ${error}`);
      }

      return this.createStreamFromResponse(response.body!);
    } catch (error) {
      return this.createErrorStream(
        `OpenAI chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert OpenAI's SSE stream format to our internal format
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
