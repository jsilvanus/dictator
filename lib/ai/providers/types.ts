/**
 * AI Provider abstraction types
 * Define the contract that all AI providers must implement
 */

export type ModelProvider = 'claude' | 'openai' | 'ollama' | 'openai-compatible' | 'dictator';

export type AiInlineRequest = {
  prompt: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Tool definition for function calling
 */
export type AiTool = {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
};

/**
 * Tool call invocation from AI
 */
export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

/**
 * Result of tool execution
 */
export type ToolResult = {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
  errorCode?: 'permission_denied' | 'rate_limited' | 'validation_failed' | 'execution_error';
  target?: string; // Target URL or MCP name for permission errors
};

export type AiChatRequest = {
  messages: Array<{ role: 'user' | 'assistant'; content: string; toolResults?: ToolResult[] }>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: AiTool[];
};

export type AiResponse = {
  content: string;
  stopReason?: string;
  toolCalls?: ToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
};

export type AiStreamChunk = {
  type: 'delta' | 'complete' | 'error' | 'tool-call';
  content?: string;
  error?: string;
  toolCall?: ToolCall;
};

export interface AiProvider {
  /**
   * Send an inline request to the AI provider
   */
  askInline(request: AiInlineRequest): Promise<AiResponse>;

  /**
   * Send a chat request with streaming support
   */
  chat(request: AiChatRequest): Promise<ReadableStream<AiStreamChunk>>;

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Get the model name
   */
  getModelName(): string;

  /**
   * Get provider type
   */
  getProviderType(): ModelProvider;
}

export type ProviderConfig = {
  type: ModelProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type UserAiPreferences = {
  userId: string;
  preferredProvider: ModelProvider;
  preferredModel?: string;
  customTemperature?: number;
  customMaxTokens?: number;
  ollamaUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};
