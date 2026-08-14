/**
 * AI Provider Policy Manager
 * Manages privacy policies for AI providers and tracks which policy is active
 * for each AI request
 */

import type { AiProviderPolicy } from './types';

/**
 * Default privacy policies for well-known providers
 * These should be updated as provider policies change
 */
const DEFAULT_PROVIDER_POLICIES: Record<string, Omit<AiProviderPolicy, 'id' | 'createdAt' | 'updatedAt'>> = {
  claude: {
    provider: 'claude',
    displayName: 'Anthropic Claude',
    dataRetentionDays: 30,
    processingPurposes: ['service-improvement'],
    processingLocations: ['us'],
    usesDataForTraining: false,
    trainingOptOutAvailable: true,
    privacyPolicyUrl: 'https://www.anthropic.com/privacy',
    gdprCompliant: true,
    notes: 'Claude API provides privacy-conscious handling of data. Conversations are generally not used for training.',
  },

  openai: {
    provider: 'openai',
    displayName: 'OpenAI',
    dataRetentionDays: 30,
    processingPurposes: ['service-improvement', 'model-training'],
    processingLocations: ['us'],
    usesDataForTraining: true,
    trainingOptOutAvailable: true,
    privacyPolicyUrl: 'https://openai.com/privacy',
    gdprCompliant: true,
    notes: 'OpenAI uses API data for model improvement. You can opt out for your organization.',
  },

  ollama: {
    provider: 'ollama',
    displayName: 'Ollama (Local)',
    dataRetentionDays: null,
    processingPurposes: [],
    processingLocations: ['on-device'],
    usesDataForTraining: false,
    trainingOptOutAvailable: false,
    privacyPolicyUrl: '',
    gdprCompliant: true,
    notes: 'Ollama runs locally on your device. Data never leaves your machine.',
  },

  dictator: {
    provider: 'dictator',
    displayName: 'Dictator (Local Inference)',
    dataRetentionDays: null,
    processingPurposes: [],
    processingLocations: ['on-device'],
    usesDataForTraining: false,
    trainingOptOutAvailable: false,
    privacyPolicyUrl: '',
    gdprCompliant: true,
    notes: 'Dictator runs on your device. No data is transmitted to external services.',
  },

  'openai-compatible': {
    provider: 'openai-compatible',
    displayName: 'OpenAI-Compatible API',
    dataRetentionDays: null,
    processingPurposes: ['service-improvement'],
    processingLocations: ['other'],
    usesDataForTraining: false,
    trainingOptOutAvailable: false,
    privacyPolicyUrl: 'https://example.com/privacy',
    gdprCompliant: false,
    notes: 'Privacy policy depends on the specific API endpoint you configure.',
  },
};

/**
 * AI Provider Policy Manager
 */
export class ProviderPolicyManager {
  private policies: Map<string, AiProviderPolicy> = new Map();
  private activePolicy: AiProviderPolicy | null = null;

  constructor(customPolicies?: AiProviderPolicy[]) {
    this.initializeDefaultPolicies();
    if (customPolicies) {
      for (const policy of customPolicies) {
        this.policies.set(policy.id, policy);
      }
    }
  }

  /**
   * Initialize default policies from built-in definitions
   */
  private initializeDefaultPolicies(): void {
    const now = Date.now();
    for (const [provider, config] of Object.entries(DEFAULT_PROVIDER_POLICIES)) {
      const policy: AiProviderPolicy = {
        id: `policy-${provider}-${Math.floor(now / 1000)}`,
        createdAt: now,
        updatedAt: now,
        ...config,
      };
      this.policies.set(policy.id, policy);
    }
  }

  /**
   * Get policy by ID
   */
  getPolicyById(policyId: string): AiProviderPolicy | null {
    return this.policies.get(policyId) || null;
  }

  /**
   * Get latest policy for a provider
   */
  getLatestPolicyForProvider(provider: string): AiProviderPolicy | null {
    let latest: AiProviderPolicy | null = null;
    for (const policy of this.policies.values()) {
      if (policy.provider === provider) {
        if (!latest || policy.updatedAt > latest.updatedAt) {
          latest = policy;
        }
      }
    }
    return latest;
  }

  /**
   * Get all policies for a provider (versioned)
   */
  getPoliciesForProvider(provider: string): AiProviderPolicy[] {
    const results: AiProviderPolicy[] = [];
    for (const policy of this.policies.values()) {
      if (policy.provider === provider) {
        results.push(policy);
      }
    }
    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): Array<{ provider: string; displayName: string }> {
    const providers = new Map<string, string>();
    for (const policy of this.policies.values()) {
      if (!providers.has(policy.provider)) {
        providers.set(policy.provider, policy.displayName);
      }
    }
    return Array.from(providers.entries()).map(([provider, displayName]) => ({
      provider,
      displayName,
    }));
  }

  /**
   * Add or update a policy
   */
  upsertPolicy(policy: AiProviderPolicy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Get privacy rating for a provider (0-100)
   * Higher = more privacy-friendly
   */
  getPrivacyRating(provider: string): number {
    const policy = this.getLatestPolicyForProvider(provider);
    if (!policy) {
      return 0;
    }

    let rating = 50; // Base score

    // Local processing gets high score
    if (policy.processingLocations.includes('on-device')) {
      rating = 95;
    } else {
      // Non-training data usage
      if (!policy.usesDataForTraining) {
        rating += 30;
      } else if (policy.trainingOptOutAvailable) {
        rating += 20;
      }

      // GDPR compliance
      if (policy.gdprCompliant) {
        rating += 15;
      }

      // Data retention
      if (policy.dataRetentionDays !== null) {
        if (policy.dataRetentionDays <= 30) {
          rating += 10;
        }
      }
    }

    return Math.min(100, Math.max(0, rating));
  }

  /**
   * Get privacy summary for a provider (human-readable)
   */
  getPrivacySummary(provider: string): string {
    const policy = this.getLatestPolicyForProvider(provider);
    if (!policy) {
      return 'Policy information not available';
    }

    const parts: string[] = [];

    if (policy.processingLocations.includes('on-device')) {
      parts.push('✅ Processes data locally on your device');
    } else {
      parts.push(`📍 Processes data in: ${policy.processingLocations.join(', ')}`);
    }

    if (!policy.usesDataForTraining) {
      parts.push('✅ Does not use data for model training');
    } else if (policy.trainingOptOutAvailable) {
      parts.push('⚠️  Uses data for training (but you can opt-out)');
    } else {
      parts.push('⚠️  Uses data for model training');
    }

    if (policy.dataRetentionDays !== null) {
      parts.push(`🗑️  Retains data for ${policy.dataRetentionDays} days`);
    } else if (!policy.processingLocations.includes('on-device')) {
      parts.push('📦 Data retention period not specified');
    }

    if (policy.gdprCompliant) {
      parts.push('✅ GDPR compliant');
    }

    return parts.join('\n');
  }

  /**
   * Validate if a provider can be used for a specific use case
   */
  validateForUseCase(
    provider: string,
    requiresTrainingOptOut: boolean = false,
    requiresGdprCompliance: boolean = false
  ): { valid: boolean; reason?: string } {
    const policy = this.getLatestPolicyForProvider(provider);
    if (!policy) {
      return { valid: false, reason: 'Provider policy not found' };
    }

    if (requiresTrainingOptOut && policy.usesDataForTraining && !policy.trainingOptOutAvailable) {
      return { valid: false, reason: 'Provider uses data for training and does not support opt-out' };
    }

    if (requiresGdprCompliance && !policy.gdprCompliant) {
      return { valid: false, reason: 'Provider is not GDPR compliant' };
    }

    return { valid: true };
  }

  /**
   * Get recommendations for best privacy practices
   */
  getPrivacyRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check if any local providers are available
    const localProviders = this.getAvailableProviders().filter(
      (p) => this.getLatestPolicyForProvider(p.provider)?.processingLocations.includes('on-device')
    );

    if (localProviders.length > 0) {
      recommendations.push(
        `💡 For maximum privacy, consider using local providers: ${localProviders.map((p) => p.displayName).join(', ')}`
      );
    }

    // Check for training-avoiding providers
    const noTrainingProviders = this.getAvailableProviders().filter((p) => {
      const policy = this.getLatestPolicyForProvider(p.provider);
      return policy && !policy.usesDataForTraining;
    });

    if (noTrainingProviders.length > 0) {
      recommendations.push(
        `💡 Providers that don't use data for training: ${noTrainingProviders.map((p) => p.displayName).join(', ')}`
      );
    }

    // General recommendations
    recommendations.push('💡 Review AI data policies in Settings before sending sensitive content');
    recommendations.push('💡 Use "Selected Text Only" mode when possible instead of full document');
    recommendations.push('💡 Enable sensitive data detection warnings');

    return recommendations;
  }
}

/**
 * Create default policy manager with built-in policies
 */
export function createDefaultPolicyManager(): ProviderPolicyManager {
  return new ProviderPolicyManager();
}

/**
 * Global singleton instance
 */
let globalPolicyManager: ProviderPolicyManager | null = null;

/**
 * Initialize global policy manager
 */
export function initializePolicyManager(customPolicies?: AiProviderPolicy[]): ProviderPolicyManager {
  globalPolicyManager = new ProviderPolicyManager(customPolicies);
  return globalPolicyManager;
}

/**
 * Get global policy manager instance
 */
export function getPolicyManager(): ProviderPolicyManager {
  if (!globalPolicyManager) {
    globalPolicyManager = createDefaultPolicyManager();
  }
  return globalPolicyManager;
}
