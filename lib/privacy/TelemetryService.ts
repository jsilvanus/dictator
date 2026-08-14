/**
 * Privacy-Safe Telemetry Service
 * Provides privacy-preserving telemetry with pseudonymous user identification
 * and strict filtering of sensitive data
 */

import crypto from 'crypto';

import type { TelemetryEvent, TelemetryEventMetrics,TelemetryEventType } from './types';

/**
 * Configuration for telemetry service
 */
export interface TelemetryConfig {
  /** Secret key for HMAC-SHA256 pseudonymization (must be kept secure server-side) */
  serverSecret: string;
  
  /** Whether telemetry is enabled */
  enabled: boolean;
  
  /** Endpoint to send telemetry events to */
  endpoint: string;
  
  /** Batch size before sending events */
  batchSize?: number;
  
  /** Flush interval in milliseconds */
  flushIntervalMs?: number;
  
  /** Whether to log telemetry locally (for debugging) */
  debugLogging?: boolean;
}

/**
 * Privacy-safe telemetry service
 * Uses HMAC-SHA256 to create pseudonymous user IDs that cannot be reversed
 * Filters out sensitive data (documents, prompts, responses, usernames, emails)
 */
export class TelemetryService {
  private config: TelemetryConfig;
  private eventBatch: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private appVersion: string;

  constructor(config: TelemetryConfig, appVersion: string = '1.0.0') {
    this.config = config;
    this.appVersion = appVersion;
  }

  /**
   * Generate a pseudonymous user ID using HMAC-SHA256
   * This is deterministic (same input always produces same output)
   * but one-way (cannot be reversed to get original user ID)
   * 
   * @param canonicalUserId Original user ID, email, or other identifier
   * @returns Pseudonymous user ID suitable for telemetry
   */
  generatePseudonymousUserId(canonicalUserId: string): string {
    const hmac = crypto.createHmac('sha256', this.config.serverSecret);
    hmac.update(canonicalUserId);
    return `pseudo_${hmac.digest('hex').substring(0, 16)}`;
  }

  /**
   * Track a telemetry event
   * This method validates and filters the event before queuing
   */
  trackEvent(
    type: TelemetryEventType,
    pseudonymousUserId: string,
    operation: string,
    platform: 'web' | 'android' | 'ios',
    options?: {
      model?: string;
      metrics?: TelemetryEventMetrics;
      errorCategory?: string;
    }
  ): void {
    if (!this.config.enabled) {
      return;
    }

    // Validate pseudonymous user ID format
    if (!pseudonymousUserId.startsWith('pseudo_')) {
      console.warn('TelemetryService: pseudonymousUserId must be generated via generatePseudonymousUserId');
      return;
    }

    const event: TelemetryEvent = {
      type,
      pseudonymousUserId,
      operation,
      platform,
      appVersion: this.appVersion,
      timestamp: Date.now(),
      ...(options?.model && { model: options.model }),
      ...(options?.metrics && { metrics: options.metrics }),
      ...(options?.errorCategory && { errorCategory: options.errorCategory }),
    };

    // Validate event doesn't contain sensitive data
    this.validateEventSafety(event);

    if (this.config.debugLogging) {
      console.log('[Telemetry]', event);
    }

    this.eventBatch.push(event);

    // Auto-flush if batch size reached
    if (this.eventBatch.length >= (this.config.batchSize || 50)) {
      this.flush();
    } else if (!this.flushTimer) {
      // Schedule flush
      this.flushTimer = setTimeout(
        () => this.flush(),
        this.config.flushIntervalMs || 60000
      );
    }
  }

  /**
   * Track AI request event
   */
  trackAiRequest(
    pseudonymousUserId: string,
    platform: 'web' | 'android' | 'ios',
    model: string,
    tokenCount?: number,
    durationMs?: number
  ): void {
    this.trackEvent('ai-request', pseudonymousUserId, 'ai-request-sent', platform, {
      model,
      metrics: {
        ...(tokenCount && { tokenCount }),
        ...(durationMs && { duration: durationMs }),
      },
    });
  }

  /**
   * Track document operation
   */
  trackDocumentOperation(
    pseudonymousUserId: string,
    operation: 'create' | 'edit' | 'delete',
    platform: 'web' | 'android' | 'ios',
    characterCount?: number,
    durationMs?: number
  ): void {
    this.trackEvent(`document-${operation}`, pseudonymousUserId, `document-${operation}`, platform, {
      metrics: {
        ...(characterCount && { sizeBytes: characterCount }),
        ...(durationMs && { duration: durationMs }),
      },
    });
  }

  /**
   * Track sync operation
   */
  trackSyncCompleted(
    pseudonymousUserId: string,
    platform: 'web' | 'android' | 'ios',
    itemCount: number,
    durationMs: number
  ): void {
    this.trackEvent('sync-completed', pseudonymousUserId, 'sync-completed', platform, {
      metrics: {
        itemCount,
        duration: durationMs,
      },
    });
  }

  /**
   * Track voice dictation
   */
  trackVoiceDictation(
    pseudonymousUserId: string,
    platform: 'web' | 'android' | 'ios',
    characterCount: number,
    durationMs: number
  ): void {
    this.trackEvent('voice-dictation', pseudonymousUserId, 'voice-dictation', platform, {
      metrics: {
        sizeBytes: characterCount,
        duration: durationMs,
      },
    });
  }

  /**
   * Track error (without exposing error details)
   */
  trackError(
    pseudonymousUserId: string,
    platform: 'web' | 'android' | 'ios',
    errorCategory: string,
    operation: string
  ): void {
    this.trackEvent('error', pseudonymousUserId, operation, platform, {
      errorCategory,
    });
  }

  /**
   * Validate that event doesn't contain sensitive data
   * This is a safety check to prevent accidentally logging sensitive info
   */
  private validateEventSafety(event: TelemetryEvent): void {
    // Convert event to JSON string for inspection
    const eventStr = JSON.stringify(event);

    // Check for common sensitive data patterns
    const sensitivePatterns = [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /[Pp]assword\s*[:=]/g, // Password indicators
      /[Aa]pi[_-]?[Kk]ey\s*[:=]/g, // API key indicators
      /[Bb]earer\s+[\w-\.]+/g, // Auth tokens
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(eventStr)) {
        console.warn('TelemetryService: Event appears to contain sensitive data, filtering');
        // Don't send this event - sensitive data detected
        throw new Error('Telemetry event contains sensitive data');
      }
    }
  }

  /**
   * Flush all queued events to the endpoint
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.eventBatch.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventBatch];
    this.eventBatch = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        console.error(`Telemetry flush failed: ${response.status}`);
        // Re-queue events for retry
        this.eventBatch.unshift(...eventsToSend);
      }
    } catch (error) {
      console.error('Telemetry flush error:', error);
      // Re-queue events for retry
      this.eventBatch.unshift(...eventsToSend);
    }
  }

  /**
   * Gracefully shutdown telemetry service
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

/**
 * Global singleton instance (initialized on server startup)
 */
let globalTelemetryService: TelemetryService | null = null;

/**
 * Initialize global telemetry service
 */
export function initializeTelemetry(config: TelemetryConfig, appVersion?: string): TelemetryService {
  globalTelemetryService = new TelemetryService(config, appVersion);
  return globalTelemetryService;
}

/**
 * Get global telemetry service instance
 */
export function getTelemetryService(): TelemetryService | null {
  return globalTelemetryService;
}
