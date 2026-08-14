import { getPolicyManager } from '@/lib/privacy/ProviderPolicyManager';
import type { AiProviderPolicy } from '@/lib/privacy/types';

import { AiChatRequest, AiInlineRequest, AiProvider, AiResponse, AiStreamChunk, ModelProvider } from './types';

/**
 * Base abstract class for AI providers
 * Provides common functionality and defines required methods
 * Includes privacy policy metadata and data handling
 */
export abstract class BaseAiProvider implements AiProvider {
  protected model: string;
  protected temperature: number;
  protected maxTokens: number;

  constructor(
    model: string = 'default',
    temperature: number = 0.7,
    maxTokens: number = 2048
  ) {
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  /**
   * Subclasses must implement the actual API call logic
   */
  abstract askInline(request: AiInlineRequest): Promise<AiResponse>;

  /**
   * Subclasses must implement streaming chat logic
   */
  abstract chat(request: AiChatRequest): Promise<ReadableStream<AiStreamChunk>>;

  /**
   * Subclasses must implement configuration check
   */
  abstract isConfigured(): boolean;

  /**
   * Get the configured model name
   */
  getModelName(): string {
    return this.model;
  }

  /**
   * Subclasses must implement provider type
   */
  abstract getProviderType(): ModelProvider;

  /**
   * Get privacy policy for this provider
   * Subclasses can override to provide custom policies
   */
  getPrivacyPolicy(): AiProviderPolicy | null {
    const policyManager = getPolicyManager();
    return policyManager.getLatestPolicyForProvider(this.getProviderType());
  }

  /**
   * Get privacy rating for this provider (0-100)
   * Higher = more privacy-friendly
   */
  getPrivacyRating(): number {
    const policyManager = getPolicyManager();
    return policyManager.getPrivacyRating(this.getProviderType());
  }

  /**
   * Get human-readable privacy summary for this provider
   */
  getPrivacySummary(): string {
    const policyManager = getPolicyManager();
    return policyManager.getPrivacySummary(this.getProviderType());
  }

  /**
   * Check if this provider uses data for model training
   */
  usesDataForTraining(): boolean {
    const policy = this.getPrivacyPolicy();
    return policy?.usesDataForTraining ?? false;
  }

  /**
   * Check if user can opt out of model training for this provider
   */
  supportsTrainingOptOut(): boolean {
    const policy = this.getPrivacyPolicy();
    return policy?.trainingOptOutAvailable ?? false;
  }

  /**
   * Check if this provider processes data on-device only
   */
  isLocalProcessing(): boolean {
    const policy = this.getPrivacyPolicy();
    return policy?.processingLocations.includes('on-device') ?? false;
  }

  /**
   * Get data retention period in days (null = indefinite)
   */
  getDataRetentionDays(): number | null {
    const policy = this.getPrivacyPolicy();
    return policy?.dataRetentionDays ?? null;
  }

  /**
   * Check if GDPR compliant
   */
  isGdprCompliant(): boolean {
    const policy = this.getPrivacyPolicy();
    return policy?.gdprCompliant ?? false;
  }

  /**
   * Helper to set configuration parameters
   */
  protected setConfig(temperature?: number, maxTokens?: number): void {
    if (temperature !== undefined) {
      this.temperature = Math.max(0, Math.min(2, temperature));
    }
    if (maxTokens !== undefined) {
      this.maxTokens = Math.max(1, maxTokens);
    }
  }

  /**
   * Helper to merge request parameters with provider defaults
   */
  protected mergeRequestParams(request: AiInlineRequest | AiChatRequest) {
    return {
      temperature: (request as any).temperature ?? this.temperature,
      maxTokens: (request as any).maxTokens ?? this.maxTokens,
    };
  }

  /**
   * Helper to create error stream
   */
  protected createErrorStream(error: string): ReadableStream<AiStreamChunk> {
    return new ReadableStream({
      start(controller) {
        controller.enqueue({
          type: 'error',
          error,
        });
        controller.close();
      },
    });
  }

  /**
   * Helper to create simple complete stream
   */
  protected createCompleteStream(content: string): ReadableStream<AiStreamChunk> {
    return new ReadableStream({
      start(controller) {
        controller.enqueue({
          type: 'delta',
          content,
        });
        controller.enqueue({
          type: 'complete',
        });
        controller.close();
      },
    });
  }
}
