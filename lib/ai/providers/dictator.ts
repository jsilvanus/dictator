import { AiChatRequest, AiInlineRequest, AiProvider, AiResponse, AiStreamChunk, ToolCall } from './types';

/**
 * Dictator Service AI Provider
 * Connects to the Dictator-hosted AI service backend
 * Supports tool calling via the Dictator API
 */
export class DictatorProvider implements AiProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'https://ai.dictator.dev', model: string = 'dictator-ai-default') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async askInline(request: AiInlineRequest): Promise<AiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/inline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          context: request.context,
          temperature: request.temperature ?? 0.7,
          maxTokens: request.maxTokens ?? 2048,
          thinkingBudgetTokens: request.thinkingBudgetTokens,
          model: this.model,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(`Dictator AI error: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = (await response.json()) as {
        content?: string;
        stopReason?: string;
        thinking?: string;
        toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
        usage?: { inputTokens: number; outputTokens: number };
      };

      return {
        content: data.content || '',
        stopReason: data.stopReason,
        thinking: data.thinking,
        toolCalls: data.toolCalls,
        usage: data.usage,
      };
    } catch (error) {
      throw new Error(`Dictator provider error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async chat(request: AiChatRequest): Promise<ReadableStream<AiStreamChunk>> {
    return new ReadableStream(async (controller) => {
      try {
        const response = await fetch(`${this.baseUrl}/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: request.messages,
            systemPrompt: request.systemPrompt,
            temperature: request.temperature ?? 0.7,
            maxTokens: request.maxTokens ?? 2048,
            thinkingBudgetTokens: request.thinkingBudgetTokens,
            model: this.model,
            tools: request.tools,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
          controller.enqueue({
            type: 'error',
            error: `Dictator AI error: ${response.statusText}`,
          });
          controller.close();
          return;
        }

        if (!response.body) {
          controller.enqueue({
            type: 'error',
            error: 'No response body from Dictator AI service',
          });
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue({
              type: 'complete',
            });
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as {
                  content?: string;
                  thinking?: string;
                  toolCall?: { id: string; name: string; arguments: Record<string, unknown> };
                };

                if (data.thinking) {
                  controller.enqueue({
                    type: 'thinking-delta',
                    content: data.thinking,
                  });
                }

                if (data.content) {
                  controller.enqueue({
                    type: 'delta',
                    content: data.content,
                  });
                }

                if (data.toolCall) {
                  controller.enqueue({
                    type: 'tool-call',
                    toolCall: data.toolCall,
                  });
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } catch (error) {
        controller.enqueue({
          type: 'error',
          error: `Dictator provider error: ${error instanceof Error ? error.message : String(error)}`,
        });
        controller.close();
      }
    });
  }

  isConfigured(): boolean {
    // Dictator provider is always configured as it uses a public service
    return true;
  }

  getModelName(): string {
    return this.model;
  }

  getProviderType() {
    return 'dictator' as const;
  }
}

