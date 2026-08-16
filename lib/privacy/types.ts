/**
 * Privacy and Data Protection Types
 * Defines core types for privacy policy, telemetry, and provenance tracking
 */

// ============================================================================
// AI Provider Policy Types
// ============================================================================

export type DataProcessingPurpose = 
  | 'model-training'
  | 'service-improvement'
  | 'user-support'
  | 'compliance'
  | 'security';

export type DataGeographicLocation =
  | 'us'
  | 'eu'
  | 'uk'
  | 'ca'
  | 'au'
  | 'on-device'
  | 'other';

export interface AiProviderPolicy {
  /** Unique identifier for this policy version */
  id: string;
  
  /** Provider name (e.g., 'claude', 'openai') */
  provider: string;
  
  /** Provider name for display */
  displayName: string;
  
  /** Data retention period in days (null = indefinite) */
  dataRetentionDays: number | null;
  
  /** Processing purposes */
  processingPurposes: DataProcessingPurpose[];
  
  /** Geographic processing locations */
  processingLocations: DataGeographicLocation[];
  
  /** Whether user content is used for model training */
  usesDataForTraining: boolean;
  
  /** Whether user can opt-out of model training */
  trainingOptOutAvailable: boolean;
  
  /** Public privacy policy URL */
  privacyPolicyUrl: string;
  
  /** Whether this provider has explicit GDPR compliance */
  gdprCompliant: boolean;
  
  /** Custom notes or warnings */
  notes: string;
  
  /** Policy creation timestamp */
  createdAt: number;
  
  /** Policy last updated timestamp */
  updatedAt: number;
}

// ============================================================================
// AI Request Provenance & Policy Types
// ============================================================================

export type AiContentSource = 
  | 'human-dictated'
  | 'human-written'
  | 'ai-generated'
  | 'ai-modified';

export type AiRequestScope = 
  | 'full-document'
  | 'selected-text'
  | 'context-snippet';

export interface AiRequestPolicy {
  /** Which policy was in effect for this request */
  policyId: string;
  
  /** Provider name (snapshot) */
  provider: string;
  
  /** Should this request be deleted after completion */
  ephemeral: boolean;
  
  /** How long to retain this request (days, null = indefinite) */
  retentionDays: number | null;
  
  /** What scope of document was sent */
  contentScope: AiRequestScope;
  
  /** Whether full document context was included */
  includesFullDocument: boolean;
}

export interface AiTurnProvenance {
  /** Original content source before AI modification */
  source: AiContentSource;
  
  /** Confidence level for AI-generated content (0-1) */
  confidence?: number;
  
  /** Whether this turn was reviewed/accepted by user */
  reviewedAt?: number;
  
  /** Metadata about the AI request */
  requestPolicy?: AiRequestPolicy;
  
  /** Device that created this turn */
  device: string;
  
  /** Which user account made this change */
  userId: string;
}

// ============================================================================
// Telemetry Types
// ============================================================================

export type TelemetryEventType = 
  | 'document-edit'
  | 'document-create'
  | 'document-delete'
  | 'ai-request'
  | 'ai-response'
  | 'sync-completed'
  | 'sync-conflict'
  | 'voice-dictation'
  | 'export-document'
  | 'share-document'
  | 'user-login'
  | 'user-signup'
  | 'settings-change'
  | 'error';

export interface TelemetryEventMetrics {
  /** Duration in milliseconds */
  duration?: number;
  
  /** Number of tokens used (for AI operations) */
  tokenCount?: number;
  
  /** Items processed/synced count */
  itemCount?: number;
  
  /** File size in bytes */
  sizeBytes?: number;
  
  /** Custom numeric metrics */
  customMetrics?: Record<string, number>;
}

export interface TelemetryEvent {
  /** Event type identifier */
  type: TelemetryEventType;
  
  /** Pseudonymous user ID (HMAC-based, not username/email) */
  pseudonymousUserId: string;
  
  /** Operation being performed */
  operation: string;
  
  /** AI model used (if applicable) */
  model?: string;
  
  /** Metrics about the operation */
  metrics?: TelemetryEventMetrics;
  
  /** Error category (not full error message) */
  errorCategory?: string;
  
  /** Platform identifier */
  platform: 'web' | 'android' | 'ios';
  
  /** App version */
  appVersion: string;
  
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Sensitive Data Detection Types
// ============================================================================

export type SensitiveDataType = 
  | 'credit-card'
  | 'ssn'
  | 'phone'
  | 'email'
  | 'api-key'
  | 'password'
  | 'jwt-token'
  | 'auth-header'
  | 'private-key'
  | 'database-connection';

export interface DetectedSensitiveData {
  /** Type of sensitive data found */
  type: SensitiveDataType;
  
  /** Text snippet (truncated for safety) */
  snippet: string;
  
  /** Character position in text */
  position: number;
  
  /** Confidence level (0-1) */
  confidence: number;
}

export interface SensitiveDataScanResult {
  /** Whether any sensitive data was detected */
  hasSensitiveData: boolean;
  
  /** List of detected sensitive data */
  detected: DetectedSensitiveData[];
  
  /** Timestamp of scan */
  scannedAt: number;
  
  /** Scanner version used */
  scannerVersion: string;
}

// ============================================================================
// Encrypted Storage Types
// ============================================================================

export interface EncryptionKeyMetadata {
  /** Key identifier */
  id: string;
  
  /** Key algorithm (e.g., 'AES-256-GCM') */
  algorithm: string;
  
  /** When key was created */
  createdAt: number;
  
  /** When key expires (null = never) */
  expiresAt: number | null;
  
  /** Key rotation policy identifier */
  rotationPolicyId?: string;
}

export interface EncryptedStorageOptions {
  /** Use platform-native encryption (Android Keystore, etc.) */
  useNativeEncryption?: boolean;
  
  /** Encryption algorithm to use */
  algorithm?: string;
  
  /** Automatically rotate keys after N days */
  keyRotationDays?: number;
  
  /** Whether to encrypt backup */
  encryptBackup?: boolean;
}

// ============================================================================
// Backup & Deletion Types
// ============================================================================

export type BackupInclusionPolicy = 
  | 'never'
  | 'local-only'
  | 'encrypted-cloud'
  | 'unencrypted-cloud';

export interface BackupPolicy {
  /** What to include in backups */
  inclusionPolicy: BackupInclusionPolicy;
  
  /** Whether encryption keys are included */
  includeEncryptionKeys: boolean;
  
  /** Whether to encrypt backups */
  encryptBackups: boolean;
  
  /** Backup retention days (null = indefinite) */
  retentionDays: number | null;
}

export interface DeletionRecord {
  /** What was deleted */
  resourceType: 'document' | 'account' | 'session' | 'ai-history';
  
  /** Resource ID */
  resourceId: string;
  
  /** Who requested deletion */
  requestedBy: string;
  
  /** When deletion was requested */
  requestedAt: number;
  
  /** When deletion was completed */
  completedAt: number | null;
  
  /** Deletion status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** Deletion method (e.g., 'soft-delete', 'hard-delete', 'anonymize') */
  method: string;
  
  /** Any related cloud provider deletions */
  providerDeletions?: Array<{
    provider: string;
    deletedAt?: number;
    status: 'pending' | 'completed' | 'failed';
  }>;
}

// ============================================================================
// Content Scope Selection Types
// ============================================================================

export interface ContentScope {
  /** Type of content being sent */
  type: 'full-document' | 'selected-text' | 'context-only';
  
  /** Character count of content being sent */
  characterCount: number;
  
  /** Whether the full document is being sent */
  isFullDocument: boolean;
  
  /** Start and end positions for selected text (if applicable) */
  selection?: {
    start: number;
    end: number;
  };
  
  /** Context lines around selection (if applicable) */
  contextLines?: number;
}

// ============================================================================
// Selection & Cursor Permission Types
// ============================================================================

export type PermissionScope = 'model' | 'user' | 'document';
export type PermissionGrantedBy = 'voice' | 'ui';

export interface SelectionPermission {
  /** Unique permission ID */
  id: string;
  
  /** User who granted the permission */
  userId: string;
  
  /** Document ID (nullable for user-scoped permissions) */
  documentId?: string;
  
  /** Type of PII or sensitive data */
  piiType: SensitiveDataType;
  
  /** Scope of permission */
  scope: PermissionScope;
  
  /** Whether permission was granted via voice or UI */
  grantedBy: PermissionGrantedBy;
  
  /** When permission was granted */
  grantedAt: number;
  
  /** When permission expires (null = no expiry) */
  expiresAt?: number;
  
  /** Model this permission was granted for (if model-scoped) */
  modelId?: string;
}

export interface PiiDetectionResult {
  /** Whether PII was detected */
  hasPII: boolean;
  
  /** Types of PII found */
  types: SensitiveDataType[];
  
  /** Overall confidence (0-1) */
  confidence: number;
  
  /** Individual detections with positions and confidence */
  chunks: Array<{
    type: SensitiveDataType;
    text: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
  }>;
}

/**
 * A user's privacy preferences.
 *
 * Mirrors the user_privacy_settings table. Matches the schema created by
 * drizzle/0009_privacy_architecture.sql and extended by drizzle/0017.
 */
export interface UserPrivacySettings {
  id?: string;
  userId: string;
  telemetryEnabled: boolean;
  crashReportsEnabled: boolean;
  sensitiveDataDetectionEnabled: boolean;
  warnBeforeSendingToCloud: boolean;
  allowDataForTraining: boolean;
  backupEncryptionRequired: boolean;
  autoDeleteAiSessions: boolean;
  /** Days an AI session is kept before the cleanup job removes it. */
  aiSessionRetentionDays: number;
  preferLocalProcessing: boolean;
  encryptLocalStorage: boolean;
  createdAt?: number;
  updatedAt?: number;
}
