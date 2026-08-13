import { BaseAiProvider } from './base';
import { AiChatRequest, AiInlineRequest, AiResponse, AiStreamChunk, ModelProvider } from './types';

/**
 * Ollama Provider
 * Implements provider interface for Ollama (self-hosted, OpenAI-compatible)
 */
export class OllamaProvider extends BaseAiProvider {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'mistral') {
    super(model, 0.7, 2048);
    // Ensure no trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  isConfigured(): boolean {
    // Ollama is considered configured if we have a base URL
    // No API key needed for local deployment
    return !!this.baseUrl;
  }

  getProviderType(): ModelProvider {
    return 'ollama';
  }

  async askInline(request: AiInlineRequest): Promise<AiResponse> {
    if (!this.isConfigured()) {
      throw new Error('Ollama provider not configured: missing base URL');
    }

    const params = this.mergeRequestParams(request);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: request.prompt,
          system: request.context || 'You are a helpful AI assistant.',
          temperature: params.temperature,
          num_predict: params.maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        response?: string;
      };

      return {
        content: data.response ?? '',
      };
    } catch (error) {
      throw new Error(`Ollama API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async chat(request: AiChatRequest): Promise<ReadableStream<AiStreamChunk>> {
    if (!this.isConfigured()) {
      return this.createErrorStream('Ollama provider not configured: missing base URL');
    }

    const params = this.mergeRequestParams(request);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: params.temperature,
          num_predict: params.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return this.createErrorStream(`Ollama API error: ${response.status} - ${error}`);
      }

      return this.createStreamFromResponse(response.body!);
    } catch (error) {
      return this.createErrorStream(
        `Ollama chat request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert Ollama's JSON Lines stream format to our internal format
   */
  private createStreamFromResponse(body: ReadableStream<Uint8Array>): ReadableStream<AiStreamChunk> {
    return new ReadableStream({
      async start(controller) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                const event = JSON.parse(line) as {
                  message?: { content?: string };
                  done?: boolean;
                };

                if (event.message?.content) {
                  controller.enqueue({
                    type: 'delta',
                    content: event.message.content,
                  });
                }

                if (event.done) {
                  controller.enqueue({
                    type: 'complete',
                  });
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }

          // Process any remaining buffered data
          if (buffer.trim()) {
            try {
              const event = JSON.parse(buffer) as {
                message?: { content?: string };
                done?: boolean;
              };

              if (event.message?.content) {
                controller.enqueue({
                  type: 'delta',
                  content: event.message.content,
                });
              }

              if (event.done) {
                controller.enqueue({
                  type: 'complete',
                });
              }
            } catch {
              // Skip malformed JSON
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
