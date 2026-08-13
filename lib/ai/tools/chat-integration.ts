/**
 * Tool execution loop for AI chat
 * Handles multi-turn tool execution within a single chat request
 */

import { ToolCall, AiStreamChunk, AiChatRequest } from '@/lib/ai/providers/types';
import { AiProvider } from '@/lib/ai/providers/types';
import { getGlobalRegistry } from '@/lib/ai/tools/registry';
import { getGlobalExecutor } from '@/lib/ai/tools/executor';
import { ToolExecutionContext } from '@/lib/ai/tools/types';

/**
 * Options for tool execution in chat
 */
export interface ToolChatOptions {
  context: ToolExecutionContext;
  maxToolCalls?: number;
  maxToolLoops?: number;
}

/**
 * Result of tool-enabled chat
 */
export interface ToolChatResult {
  content: string;
  toolCalls: Array<{
    toolCall: ToolCall;
    result: {
      success: boolean;
      result?: unknown;
      error?: string;
      errorCode?: string;
      target?: string;
    };
  }>;
}

/**
 * Execute a chat request with tool support
 * Implements a tool-use loop that:
 * 1. Sends messages to AI provider
 * 2. If AI requests tool calls, execute them
 * 3. Inject results back into conversation
 * 4. Repeat until final response
 */
export async function executeChatWithTools(
  provider: AiProvider,
  request: AiChatRequest,
  options: ToolChatOptions,
): Promise<ToolChatResult> {
  const { context, maxToolCalls = 10, maxToolLoops = 3 } = options;
  const registry = getGlobalRegistry();
  const executor = getGlobalExecutor();
  const toolCalls: ToolChatResult['toolCalls'] = [];
  let loopCount = 0;
  let currentMessages = request.messages;

  while (loopCount < maxToolLoops) {
    loopCount++;

    // Get list of available tools
    const tools = registry.getAllTools();

    // Call AI provider with tool definitions
    const response = await provider.chat({
      ...request,
      messages: currentMessages,
      tools: tools.length > 0 ? tools : undefined,
    });

    // Read full response from stream
    let fullContent = '';
    let responseToolCalls: ToolCall[] = [];
    const reader = response.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = value as AiStreamChunk;

        if (chunk.type === 'delta' && chunk.content) {
          fullContent += chunk.content;
        } else if (chunk.type === 'tool-call' && chunk.toolCall) {
          responseToolCalls.push(chunk.toolCall);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // If no tool calls, we're done
    if (responseToolCalls.length === 0) {
      return {
        content: fullContent,
        toolCalls,
      };
    }

    // Check tool call limit
    if (toolCalls.length + responseToolCalls.length > maxToolCalls) {
      console.warn(`Tool call limit (${maxToolCalls}) exceeded, stopping execution`);
      return {
        content: fullContent,
        toolCalls,
      };
    }

    // Execute tool calls
    const results = [];
    for (const toolCall of responseToolCalls) {
      try {
        const result = await executor.execute(toolCall, context);
        results.push({
          toolCall,
          result,
        });
        toolCalls.push({
          toolCall,
          result,
        });
      } catch (error) {
        results.push({
          toolCall,
          result: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            errorCode: 'execution_error',
          },
        });
      }
    }

    // Build new message with assistant response and tool results
    currentMessages = [
      ...currentMessages,
      {
        role: 'assistant' as const,
        content: fullContent,
        toolResults: results.map((r) => ({
          toolCallId: r.toolCall.id,
          name: r.toolCall.name,
          result: r.result,
          error: r.result.error,
        })),
      },
    ];

    // Continue loop if there were tool calls
    // The AI will process the results and either make another response or call more tools
  }

  // If we hit the loop limit, return what we have
  return {
    content: 'Tool execution loop limit reached',
    toolCalls,
  };
}

/**
 * Stream-based tool-enabled chat
 * Yields chunks as they arrive, including tool-related chunks
 */
export async function* streamChatWithTools(
  provider: AiProvider,
  request: AiChatRequest,
  options: ToolChatOptions,
): AsyncGenerator<AiStreamChunk | { type: 'tool-result'; result: ToolCall }> {
  const { context, maxToolCalls = 10, maxToolLoops = 3 } = options;
  const registry = getGlobalRegistry();
  const executor = getGlobalExecutor();
  let loopCount = 0;
  let toolCallCount = 0;
  let currentMessages = request.messages;

  while (loopCount < maxToolLoops) {
    loopCount++;

    // Get list of available tools
    const tools = registry.getAllTools();

    // Call AI provider
    const response = await provider.chat({
      ...request,
      messages: currentMessages,
      tools: tools.length > 0 ? tools : undefined,
    });

    // Stream chunks from provider
    let fullContent = '';
    let toolCalls: ToolCall[] = [];
    const reader = response.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = value as AiStreamChunk;

        if (chunk.type === 'delta' && chunk.content) {
          fullContent += chunk.content;
          yield chunk;
        } else if (chunk.type === 'tool-call' && chunk.toolCall) {
          toolCalls.push(chunk.toolCall);
          yield chunk;
        } else {
          yield chunk;
        }
      }
    } finally {
      reader.releaseLock();
    }

    // If no tool calls, we're done
    if (toolCalls.length === 0) {
      return;
    }

    // Check limits
    toolCallCount += toolCalls.length;
    if (toolCallCount > maxToolCalls) {
      console.warn(`Tool call limit (${maxToolCalls}) exceeded, stopping execution`);
      return;
    }

    // Execute tools and collect results
    const toolResults = [];
    for (const toolCall of toolCalls) {
      try {
        const result = await executor.execute(toolCall, context);
        toolResults.push({
          toolCallId: toolCall.id,
          name: toolCall.name,
          result,
          error: result.error,
        });

        yield {
          type: 'tool-result' as const,
          result: toolCall,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toolResults.push({
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: {
            success: false,
            error: errorMessage,
            errorCode: 'execution_error',
          },
        });
      }
    }

    // Add to message history and continue loop
    currentMessages = [
      ...currentMessages,
      {
        role: 'assistant' as const,
        content: fullContent,
        toolResults,
      },
    ];
  }
}
