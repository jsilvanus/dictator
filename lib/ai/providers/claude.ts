import { BaseAiProvider } from './base';
import { AiChatRequest, AiInlineRequest, AiResponse, AiStreamChunk, ModelProvider, ToolCall } from './types';

/**
 * Claude/Anthropic AI Provider
 * Implements provider interface for Anthropic's Claude API
 * Supports tool calling via tool_use content blocks
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
      const body: Record<string, unknown> = {
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
      };

      // Add budget_tokens if thinking is enabled
      if (request.thinkingBudgetTokens) {
        body.thinking = {
          type: 'enabled',
          budget_tokens: request.thinkingBudgetTokens,
        };
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        content?: Array<{ type: string; text?: string; thinking?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      const textContent = data.content?.find((c) => c.type === 'text')?.text ?? '';
      const thinkingContent = data.content?.find((c) => c.type === 'thinking')?.thinking;
      const toolCalls = this.parseToolCalls(data.content ?? []);

      return {
        content: textContent,
        thinking: thinkingContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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
      // Convert tools to Anthropic format if provided
      const tools = request.tools
        ? request.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
          }))
        : undefined;

      const body: Record<string, unknown> = {
        model: this.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        system: request.systemPrompt,
        messages: request.messages,
        tools,
        stream: true,
      };

      // Add budget_tokens if thinking is enabled
      if (request.thinkingBudgetTokens) {
        body.thinking = {
          type: 'enabled',
          budget_tokens: request.thinkingBudgetTokens,
        };
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
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
   * Parse tool_use content blocks from Anthropic response
   * @param content - Array of content blocks from Anthropic API
   * @returns Array of ToolCall objects
   */
  private parseToolCalls(content: Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown> }>): ToolCall[] {
    return content
      .filter((block) => block.type === 'tool_use')
      .map((block) => ({
        id: block.id ?? `tool-${Date.now()}`,
        name: block.name ?? 'unknown',
        arguments: block.input ?? {},
      }));
  }

  /**
   * Convert Anthropic's SSE stream format to our internal format
   */
  private createStreamFromResponse(body: ReadableStream<Uint8Array>): ReadableStream<AiStreamChunk> {
    return new ReadableStream({
      async start(controller) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        const contentBlocks: Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string; thinking?: string }> = [];
        let currentToolInput: Record<string, unknown> = {};

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
                  index?: number;
                  delta?: { type?: string; text?: string; thinking?: string; input?: Record<string, unknown> };
                  content_block?: { type?: string; id?: string; name?: string };
                };

                // Handle content block start
                if (event.type === 'content_block_start' && event.content_block) {
                  const blockType = event.content_block.type;
                  if (blockType === 'text') {
                    contentBlocks.push({ type: 'text', text: '' });
                  } else if (blockType === 'thinking') {
                    contentBlocks.push({ type: 'thinking', thinking: '' });
                  } else if (blockType === 'tool_use') {
                    currentToolInput = {};
                    contentBlocks.push({
                      type: 'tool_use',
                      id: event.content_block.id,
                      name: event.content_block.name,
                      input: currentToolInput,
                    });
                  }
                }

                // Handle thinking delta
                if (event.type === 'content_block_delta' && event.delta?.type === 'thinking_delta') {
                  const lastBlock = contentBlocks[contentBlocks.length - 1];
                  if (lastBlock && lastBlock.type === 'thinking') {
                    lastBlock.thinking = (lastBlock.thinking ?? '') + (event.delta.thinking ?? '');
                  }
                  controller.enqueue({
                    type: 'thinking-delta',
                    content: event.delta.thinking,
                  });
                }

                // Handle text delta
                if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                  const lastBlock = contentBlocks[contentBlocks.length - 1];
                  if (lastBlock && lastBlock.type === 'text') {
                    lastBlock.text = (lastBlock.text ?? '') + (event.delta.text ?? '');
                  }
                  controller.enqueue({
                    type: 'delta',
                    content: event.delta.text,
                  });
                }

                // Handle tool input delta
                if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
                  const lastBlock = contentBlocks[contentBlocks.length - 1];
                  if (lastBlock && lastBlock.type === 'tool_use') {
                    // Note: Anthropic sends tool input as JSON string deltas
                    // This is a simplified implementation
                    if (event.delta.input) {
                      Object.assign(currentToolInput, event.delta.input);
                    }
                  }
                }
              } catch {
                // Skip malformed SSE events
              }
            }
          }

          // Extract and emit tool calls if any
          const toolCalls = contentBlocks
            .filter((block) => block.type === 'tool_use')
            .map((block) => ({
              id: block.id ?? `tool-${Date.now()}`,
              name: block.name ?? 'unknown',
              arguments: block.input ?? {},
            }));

          if (toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              controller.enqueue({
                type: 'tool-call',
                toolCall,
              });
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

