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

export * from './ProviderPolicyManager';
export * from './SensitiveDataDetector';
export * from './TelemetryService';
export * from './types';
// export * from './EncryptedStorage'; // Coming in Phase 2

// Re-exports for convenience
export {
  type AiProviderPolicy,
  createDefaultPolicyManager,
  getPolicyManager,
  initializePolicyManager,
  ProviderPolicyManager,
} from './ProviderPolicyManager';
export {
  createDefaultDetector,
  type DetectedSensitiveData,
  getSensitiveDataWarning,
  scanForSensitiveData,
  SensitiveDataDetector,
  type SensitiveDataScanResult,
} from './SensitiveDataDetector';
export {
  getTelemetryService,
  initializeTelemetry,
  type TelemetryConfig,
  type TelemetryEvent,
  type TelemetryEventMetrics,
  type TelemetryEventType,
} from './TelemetryService';
export {
  type AiContentSource,
  type AiRequestPolicy,
  type AiRequestScope,
  type AiTurnProvenance,
  type BackupInclusionPolicy,
  type BackupPolicy,
  type ContentScope,
  type DataProcessingPurpose,
  type DeletionRecord,
  type SensitiveDataType,
} from './types';
