import { BaseAiProvider } from './base';
import { AiChatRequest, AiInlineRequest, AiResponse, AiStreamChunk, ModelProvider } from './types';

/**
 * Claude/Anthropic AI Provider
 * Implements provider interface for Anthropic's Claude API
 */
export class ClaudeProvider extends BaseAiProvider {
  private apiKey: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-6') {
    super(model, 0.2, 800);
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getProviderType(): ModelProvider {
    return 'claude';
  }

  async askInline(request: AiInlineRequest): Promise<AiResponse> {
    if (!this.isConfigured()) {
      throw new Error('Claude provider not configured: missing API key');
    }

    const params = this.mergeRequestParams(request);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          system: request.context || 'You are a helpful AI assistant.',
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      const textContent = data.content?.find((c) => c.type === 'text')?.text ?? '';

      return {
        content: textContent,
        usage: {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
        },
      };
    } catch (error) {
      throw new Error(`Claude API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async chat(request: AiChatRequest): Promise<ReadableStream<AiStreamChunk>> {
    if (!this.isConfigured()) {
      return this.createErrorStream('Claude provider not configured: missing API key');
    }

    const params = this.mergeRequestParams(request);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          system: request.systemPrompt,
          messages: request.messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return this.createErrorStream(`Claude API error: ${response.status} - ${error}`);
      }

      return this.createStreamFromResponse(response.body!);
    } catch (error) {
      return this.createErrorStream(
        `Claude chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert Anthropic's SSE stream format to our internal format
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

              try {
                const event = JSON.parse(data) as {
                  type?: string;
                  delta?: { type?: string; text?: string };
                };

                if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                  controller.enqueue({
                    type: 'delta',
                    content: event.delta.text,
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
