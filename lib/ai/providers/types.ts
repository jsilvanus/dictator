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

export type AiChatRequest = {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
};

export type AiResponse = {
  content: string;
  stopReason?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
};

export type AiStreamChunk = {
  type: 'delta' | 'complete' | 'error';
  content?: string;
  error?: string;
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
