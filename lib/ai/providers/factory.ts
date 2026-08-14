import { ClaudeProvider } from './claude';
import { DictatorProvider } from './dictator';
import { GenericOpenAiProvider } from './generic-openai';
import { OllamaProvider } from './ollama';
import { OpenAiProvider } from './openai';
import { AiProvider, ModelProvider, ProviderConfig } from './types';

/**
 * AI Provider Factory
 * Creates and manages AI provider instances based on configuration
 */
export class AiProviderFactory {
  /**
   * Create a provider instance based on configuration
   */
  static createProvider(config: ProviderConfig): AiProvider {
    switch (config.type) {
      case 'claude':
        if (!config.apiKey) {
          throw new Error('Claude provider requires apiKey');
        }
        return new ClaudeProvider(config.apiKey, config.model || 'claude-sonnet-4-6');

      case 'openai':
        if (!config.apiKey) {
          throw new Error('OpenAI provider requires apiKey');
        }
        return new OpenAiProvider(config.apiKey, config.model || 'gpt-4o', config.baseUrl);

      case 'ollama':
        return new OllamaProvider(config.baseUrl || 'http://localhost:11434', config.model || 'mistral');

      case 'openai-compatible':
        if (!config.apiKey || !config.baseUrl) {
          throw new Error('Generic OpenAI provider requires both apiKey and baseUrl');
        }
        return new GenericOpenAiProvider(config.baseUrl, config.apiKey, config.model || 'gpt-3.5-turbo');

      case 'dictator':
        return new DictatorProvider(config.baseUrl, config.model);

      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }

  /**
   * Create provider from environment variables
   * Defaults to Claude if available
   */
  static createFromEnv(): AiProvider {
    // Try Claude first (default)
    if (process.env.ANTHROPIC_API_KEY) {
      return new ClaudeProvider(
        process.env.ANTHROPIC_API_KEY,
        process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'
      );
    }

    // Try OpenAI
    if (process.env.OPENAI_API_KEY) {
      return new OpenAiProvider(
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL || 'gpt-4o',
        process.env.OPENAI_BASE_URL
      );
    }

    // Try Ollama
    if (process.env.OLLAMA_BASE_URL || process.env.NODE_ENV === 'development') {
      return new OllamaProvider(
        process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        process.env.OLLAMA_MODEL || 'mistral'
      );
    }

    // Try generic OpenAI-compatible
    if (process.env.OPENAI_COMPATIBLE_BASE_URL && process.env.OPENAI_COMPATIBLE_API_KEY) {
      return new GenericOpenAiProvider(
        process.env.OPENAI_COMPATIBLE_BASE_URL,
        process.env.OPENAI_COMPATIBLE_API_KEY,
        process.env.OPENAI_COMPATIBLE_MODEL || 'gpt-3.5-turbo'
      );
    }

    throw new Error(
      'No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, OLLAMA_BASE_URL, or OPENAI_COMPATIBLE_BASE_URL environment variables.'
    );
  }

  /**
   * Create provider by type string
   */
  static createByType(type: ModelProvider, config: Partial<ProviderConfig> = {}): AiProvider {
    return this.createProvider({
      type,
      ...config,
    });
  }

  /**
   * Get available providers based on environment configuration
   */
  static getAvailableProviders(): Array<{
    type: ModelProvider;
    name: string;
    configured: boolean;
  }> {
    const providers: Array<{ type: ModelProvider; name: string; configured: boolean }> = [];

    // Check Claude
    providers.push({
      type: 'claude',
      name: 'Claude (Anthropic)',
      configured: !!process.env.ANTHROPIC_API_KEY,
    });

    // Check OpenAI
    providers.push({
      type: 'openai',
      name: 'OpenAI',
      configured: !!process.env.OPENAI_API_KEY,
    });

    // Check Ollama
    providers.push({
      type: 'ollama',
      name: 'Ollama (Self-hosted)',
      configured: !!process.env.OLLAMA_BASE_URL || process.env.NODE_ENV === 'development',
    });

    // Check Generic OpenAI-compatible
    providers.push({
      type: 'openai-compatible',
      name: 'OpenAI-Compatible',
      configured: !!(process.env.OPENAI_COMPATIBLE_BASE_URL && process.env.OPENAI_COMPATIBLE_API_KEY),
    });

    // Dictator service is always available as it's a public service
    providers.push({
      type: 'dictator',
      name: 'Dictator Service',
      configured: true,
    });

    return providers;
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (config.type) {
      case 'claude':
        if (!config.apiKey) errors.push('Claude provider requires apiKey');
        break;
      case 'openai':
        if (!config.apiKey) errors.push('OpenAI provider requires apiKey');
        break;
      case 'ollama':
        // Ollama doesn't require API key, optional baseUrl
        break;
      case 'openai-compatible':
        if (!config.apiKey) errors.push('OpenAI-compatible provider requires apiKey');
        if (!config.baseUrl) errors.push('OpenAI-compatible provider requires baseUrl');
        break;
      case 'dictator':
        // Dictator service is always valid
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
