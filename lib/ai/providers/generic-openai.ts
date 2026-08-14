import { BaseAiProvider } from './base';
import { AiChatRequest, AiInlineRequest, AiResponse, AiStreamChunk, ModelProvider, ToolCall } from './types';

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
      const body: Record<string, unknown> = {
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
      };

      // Add thinking support if requested and model supports it
      if (request.thinkingBudgetTokens && this.supportsExtendedThinking()) {
        body.thinking = {
          type: 'enabled',
          budget_tokens: request.thinkingBudgetTokens,
        };
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI-compatible API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string; thinking?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content ?? '';
      const thinking = data.choices?.[0]?.message?.thinking;

      return {
        content,
        thinking,
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
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | object }> = [];

      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      messages.push(...(request.messages as Array<{ role: 'user' | 'assistant'; content: string }>));

      const body: Record<string, unknown> = {
        model: this.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        messages,
        stream: true,
      };

      // Add tools if provided (OpenAI-compatible format)
      if (request.tools && request.tools.length > 0) {
        body.tools = request.tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        }));
      }

      // Add thinking support if requested and model supports it
      if (request.thinkingBudgetTokens && this.supportsExtendedThinking()) {
        body.thinking = {
          type: 'enabled',
          budget_tokens: request.thinkingBudgetTokens,
        };
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.apiKey,
        },
        body: JSON.stringify(body),
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
   * Handles text deltas, tool calls, and thinking blocks
   */
  private createStreamFromResponse(body: ReadableStream<Uint8Array>): ReadableStream<AiStreamChunk> {
    return new ReadableStream({
      async start(controller) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let toolCallBuffer: Record<string, { id: string; function?: { name: string; arguments: string } }> = {};

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
                    delta?: { 
                      content?: string;
                      thinking?: string;
                      tool_calls?: Array<{ index: number; id: string; function?: { name: string; arguments: string } }>;
                    };
                    finish_reason?: string | null;
                  }>;
                };

                const choice = event.choices?.[0];
                
                // Handle thinking delta
                if (choice?.delta?.thinking) {
                  controller.enqueue({
                    type: 'thinking-delta',
                    content: choice.delta.thinking,
                  });
                }

                // Handle text delta
                if (choice?.delta?.content) {
                  controller.enqueue({
                    type: 'delta',
                    content: choice.delta.content,
                  });
                }

                // Handle tool call deltas
                if (choice?.delta?.tool_calls) {
                  for (const toolCall of choice.delta.tool_calls) {
                    const idx = String(toolCall.index);
                    if (!toolCallBuffer[idx]) {
                      toolCallBuffer[idx] = { id: toolCall.id, function: { name: '', arguments: '' } };
                    }
                    if (toolCall.id) {
                      toolCallBuffer[idx].id = toolCall.id;
                    }
                    if (toolCall.function?.name) {
                      toolCallBuffer[idx].function!.name = toolCall.function.name;
                    }
                    if (toolCall.function?.arguments) {
                      toolCallBuffer[idx].function!.arguments = (toolCallBuffer[idx].function?.arguments ?? '') + toolCall.function.arguments;
                    }
                  }
                }

                // Handle completion - emit tool calls if any
                if (choice?.finish_reason && choice?.finish_reason !== null) {
                  // Emit any buffered tool calls
                  const toolCalls = Object.values(toolCallBuffer);
                  if (toolCalls.length > 0) {
                    for (const toolCall of toolCalls) {
                      const parsed = this.parseToolCalls([toolCall]);
                      for (const call of parsed) {
                        controller.enqueue({
                          type: 'tool-call',
                          toolCall: call,
                        });
                      }
                    }
                    toolCallBuffer = {};
                  }

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

  /**
   * Parse tool calls from OpenAI-compatible function_calls format
   */
  private parseToolCalls(toolCalls?: Array<{ id: string; function?: { name: string; arguments: string } }>): ToolCall[] {
    if (!toolCalls || toolCalls.length === 0) return [];
    
    return toolCalls
      .filter((call) => call.id && call.function?.name)
      .map((call) => ({
        id: call.id,
        name: call.function!.name,
        arguments: this.parseJsonArguments(call.function!.arguments),
      }));
  }

  /**
   * Safely parse JSON string arguments
   */
  private parseJsonArguments(jsonString: string): Record<string, unknown> {
    try {
      return JSON.parse(jsonString);
    } catch {
      return {};
    }
  }

  /**
   * Check if the model supports extended thinking
   * Models like o1, o1-preview, o3, etc. support extended thinking
   */
  private supportsExtendedThinking(): boolean {
    return this.model.includes('o1') || this.model.includes('o3');
  }
}

