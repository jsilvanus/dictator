/**
 * Dictator Privacy & Data Protection Module
 *
 * This module implements privacy-by-design principles throughout Dictator:
 * - Local-first data processing with optional cloud features
 * - Transparent AI provider policies
 * - Privacy-safe telemetry with pseudonymous user IDs
 * - Sensitive data detection and warnings
 * - Comprehensive audit trails and compliance tracking
 *
 * Core Components:
 * - TelemetryService: Privacy-safe event tracking (HMAC-pseudonymization)
 * - SensitiveDataDetector: PII/credential scanner
 * - ProviderPolicyManager: AI provider policy tracking and ratings
 * - EncryptedStorage: Encrypted data storage abstraction
 * - Types: Privacy-related type definitions
 */

export * from './types';
export * from './TelemetryService';
export * from './SensitiveDataDetector';
export * from './ProviderPolicyManager';
// export * from './EncryptedStorage'; // Coming in Phase 2

// Re-exports for convenience
export {
  getTelemetryService,
  initializeTelemetry,
  type TelemetryConfig,
  type TelemetryEvent,
  type TelemetryEventType,
  type TelemetryEventMetrics,
} from './TelemetryService';

export {
  createDefaultDetector,
  scanForSensitiveData,
  getSensitiveDataWarning,
  SensitiveDataDetector,
  type SensitiveDataScanResult,
  type DetectedSensitiveData,
} from './SensitiveDataDetector';

export {
  createDefaultPolicyManager,
  getPolicyManager,
  initializePolicyManager,
  ProviderPolicyManager,
  type AiProviderPolicy,
} from './ProviderPolicyManager';

export {
  type AiTurnProvenance,
  type AiContentSource,
  type AiRequestScope,
  type AiRequestPolicy,
  type DataProcessingPurpose,
  type SensitiveDataType,
  type BackupPolicy,
  type BackupInclusionPolicy,
  type DeletionRecord,
  type ContentScope,
} from './types';
