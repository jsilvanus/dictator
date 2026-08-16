import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'editor']);
export const sharePermissionEnum = pgEnum('share_permission', ['read', 'edit']);
export const aiSessionModeEnum = pgEnum('ai_session_mode', ['inline', 'panel']);
export const syncConflictStatusEnum = pgEnum('sync_conflict_status', ['none', 'resolved', 'unresolved']);
export const aiProviderEnum = pgEnum('ai_provider', ['claude', 'openai', 'ollama', 'openai-compatible', 'dictator']);
export const toolPermissionModeEnum = pgEnum('tool_permission_mode', ['once', 'per-document', 'always']);
export const toolTypeEnum = pgEnum('tool_type', ['http', 'mcp']);

// Privacy & Provenance Enums
export const aiContentSourceEnum = pgEnum('ai_content_source', ['human-dictated', 'human-written', 'ai-generated', 'ai-modified']);
export const aiRequestScopeEnum = pgEnum('ai_request_scope', ['full-document', 'selected-text', 'context-snippet']);
export const deletionStatusEnum = pgEnum('deletion_status', ['pending', 'processing', 'completed', 'failed']);
export const deletionMethodEnum = pgEnum('deletion_method', ['soft-delete', 'hard-delete', 'anonymize']);
export const dataProcessingPurposeEnum = pgEnum('data_processing_purpose', ['model-training', 'service-improvement', 'user-support', 'compliance', 'security']);
export const backupInclusionPolicyEnum = pgEnum('backup_inclusion_policy', ['never', 'local-only', 'encrypted-cloud', 'unencrypted-cloud']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull().default('editor'),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  title: text('title').notNull().default('Untitled'),
  content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
  wordCount: integer('word_count').notNull().default(0),
  lastModifiedDevice: text('last_modified_device').notNull().default('web'),
  deviceVersion: bigint('device_version', { mode: 'number' }).notNull().default(1),
  systemPromptOverride: text('system_prompt_override'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  content: jsonb('content').$type<Record<string, unknown>>().notNull(),
  deviceSource: text('device_source').notNull().default('web'),
  deviceVersion: bigint('device_version', { mode: 'number' }).notNull().default(1),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
});

export const shares = pgTable('shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  sharedBy: uuid('shared_by')
    .notNull()
    .references(() => users.id),
  sharedWith: uuid('shared_with').references(() => users.id),
  token: text('token').unique(),
  permission: sharePermissionEnum('permission').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiSessions = pgTable(
  'ai_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    mode: aiSessionModeEnum('mode').notNull(),
    turns: jsonb('turns').$type<Array<{ role: string; content: string }>>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('ai_sessions_doc_user_mode').on(t.documentId, t.userId, t.mode)],
);

export const syncMetadata = pgTable('sync_metadata', {
  documentId: uuid('document_id')
    .notNull()
    .primaryKey()
    .references(() => documents.id, { onDelete: 'cascade' }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).defaultNow().notNull(),
  localVersion: bigint('local_version', { mode: 'number' }).notNull().default(1),
  remoteVersion: bigint('remote_version', { mode: 'number' }).notNull().default(1),
  pendingChanges: integer('pending_changes').notNull().default(0),
  conflictStatus: syncConflictStatusEnum('conflict_status').notNull().default('none'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pendingSyncQueue = pgTable('pending_sync_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  deviceId: text('device_id').notNull(),
  changeData: jsonb('change_data').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('pending'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentConflicts = pgTable('document_conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  baseVersion: jsonb('base_version').$type<Record<string, unknown>>().notNull(),
  androidVersion: jsonb('android_version').$type<Record<string, unknown>>().notNull(),
  webVersion: jsonb('web_version').$type<Record<string, unknown>>().notNull(),
  resolvedVersion: jsonb('resolved_version').$type<Record<string, unknown>>(),
  status: text('status').notNull().default('unresolved'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// Phase 4: Comprehensive Versioning
export const documentVersionSnapshots = pgTable('document_version_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: bigint('version_number', { mode: 'number' }).notNull(),
  snapshotData: jsonb('snapshot_data').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdByDevice: text('created_by_device').notNull().default('web'),
  tag: text('tag'),
  isCheckpoint: boolean('is_checkpoint').notNull().default(false),
}, (t) => [unique('document_version_snapshots_unique').on(t.documentId, t.versionNumber)]);

export const documentVersionMetadata = pgTable('document_version_metadata', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: bigint('version_number', { mode: 'number' }).notNull(),
  parentVersion: bigint('parent_version', { mode: 'number' }),
  changeSummary: text('change_summary'),
  wordCountChange: integer('word_count_change'),
  sizeBytes: integer('size_bytes'),
  isMajorVersion: boolean('is_major_version').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique('document_version_metadata_unique').on(t.documentId, t.versionNumber)]);

export const deviceVersionHistory = pgTable('device_version_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),
  deviceVersion: bigint('device_version', { mode: 'number' }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').notNull().default('synced'),
}, (t) => [unique('device_version_history_unique').on(t.documentId, t.deviceId, t.deviceVersion)]);

// Phase 5: Real-time Collaboration & Sync Optimization
export const syncActivityLog = pgTable('sync_activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),
  action: text('action').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const syncNotifications = pgTable('sync_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Phase 6: Advanced Versioning & Sync Orchestration
export const versionBranches = pgTable('version_branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  branchName: text('branch_name').notNull(),
  baseVersion: bigint('base_version', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  isMain: boolean('is_main').notNull().default(false),
}, (t) => [unique('version_branches_unique').on(t.documentId, t.branchName)]);

export const syncPerformanceMetrics = pgTable('sync_performance_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  syncTimeMs: integer('sync_time_ms').notNull(),
  dataSizeBytes: integer('data_size_bytes').notNull(),
  compressionRatio: numeric('compression_ratio', { precision: 5, scale: 2 }),
  success: boolean('success').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

// AI Provider Preferences
export const userAiPreferences = pgTable('user_ai_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  preferredProvider: aiProviderEnum('preferred_provider').notNull().default('claude'),
  preferredModel: text('preferred_model'),
  customTemperature: numeric('custom_temperature', { precision: 3, scale: 2 }),
  customMaxTokens: integer('custom_max_tokens'),
  ollamaUrl: text('ollama_url'),
  thinkingBudgetTokens: integer('thinking_budget_tokens'),
  systemPrompt: text('system_prompt'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tool Permissions
export const toolPermissions = pgTable(
  'tool_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    target: text('target').notNull(), // URL for HTTP, MCP name for MCP
    toolType: toolTypeEnum('tool_type').notNull(),
    mode: toolPermissionModeEnum('mode').notNull(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [unique('tool_permissions_unique').on(t.userId, t.target, t.toolType, t.documentId)],
);

// MCP Servers
export const mcpServers = pgTable(
  'mcp_servers',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    transportType: text('transport_type').notNull().default('stdio'), // 'stdio', 'sse', 'http'
    serverCommand: text('server_command'), // For stdio transport
    serverArgs: text('server_args'), // JSON array, for stdio transport
    serverUrl: text('server_url'), // For HTTP/SSE transport
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique('mcp_servers_unique').on(t.userId, t.name),
  ],
);

// ============================================================================
// Privacy & Data Protection Tables
// ============================================================================

/**
 * AI Provider Policies - Documents privacy policies for each AI provider
 * Tracks data handling, retention, training usage, and GDPR compliance
 */
export const aiProviderPolicies = pgTable(
  'ai_provider_policies',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    displayName: text('display_name').notNull(),
    dataRetentionDays: integer('data_retention_days'), // null = indefinite
    processingPurposes: jsonb('processing_purposes').$type<string[]>().notNull().default([]),
    processingLocations: jsonb('processing_locations').$type<string[]>().notNull().default([]),
    usesDataForTraining: boolean('uses_data_for_training').notNull().default(false),
    trainingOptOutAvailable: boolean('training_opt_out_available').notNull().default(false),
    privacyPolicyUrl: text('privacy_policy_url').default(''),
    gdprCompliant: boolean('gdpr_compliant').notNull().default(false),
    notes: text('notes').default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('ai_provider_policies_provider_date').on(t.provider, t.updatedAt)],
);

/**
 * AI Turn Provenance - Tracks source and metadata for each AI-assisted edit
 * Links to AI sessions to provide audit trail and disclosure information
 */
export const aiTurnProvenance = pgTable(
  'ai_turn_provenance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    aiSessionId: uuid('ai_session_id')
      .notNull()
      .references(() => aiSessions.id, { onDelete: 'cascade' }),
    turnId: text('turn_id').notNull(),
    source: aiContentSourceEnum('source').notNull(),
    confidence: numeric('confidence', { precision: 3, scale: 2 }), // 0-1 for AI content
    contentScope: aiRequestScopeEnum('content_scope'),
    policyId: text('policy_id').references(() => aiProviderPolicies.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    device: text('device').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    thinkingContent: text('thinking_content'),
    thinkingBudgetTokens: integer('thinking_budget_tokens'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('ai_turn_provenance_unique').on(t.aiSessionId, t.turnId)],
);

/**
 * User Privacy Settings - Track user's privacy preferences
 * Controls backup policies, telemetry, encryption preferences, etc.
 */
export const userPrivacySettings = pgTable(
  'user_privacy_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    backupInclusionPolicy: backupInclusionPolicyEnum('backup_inclusion_policy').notNull().default('local-only'),
    includeEncryptionKeysInBackup: boolean('include_encryption_keys_in_backup').notNull().default(false),
    encryptBackups: boolean('encrypt_backups').notNull().default(true),
    backupRetentionDays: integer('backup_retention_days'), // null = indefinite
    allowTelemetry: boolean('allow_telemetry').notNull().default(true),
    allowCrashReporting: boolean('allow_crash_reporting').notNull().default(true),
    enableSensitiveDataDetection: boolean('enable_sensitive_data_detection').notNull().default(true),
    requireExplicitAiApproval: boolean('require_explicit_ai_approval').notNull().default(false),
    defaultAiRequestScope: aiRequestScopeEnum('default_ai_request_scope').notNull().default('selected-text'),
    allowModelTraining: boolean('allow_model_training').notNull().default(false),
    /** Added by 0017; drives ephemeral AI-session cleanup. */
    aiSessionRetentionDays: integer('ai_session_retention_days').notNull().default(30),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
);

/**
 * Data Deletion Records - Audit trail for all data deletions
 * Tracks what was deleted, when, by whom, and status
 */
export const deletionRecords = pgTable(
  'deletion_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resourceType: text('resource_type').notNull(), // 'document', 'account', 'session', 'ai-history'
    resourceId: text('resource_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    status: deletionStatusEnum('status').notNull().default('pending'),
    method: deletionMethodEnum('method').notNull(),
    providerDeletions: jsonb('provider_deletions').$type<Array<{ provider: string; deletedAt?: number; status: string }>>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('deletion_records_resource').on(t.resourceType, t.resourceId, t.requestedAt)],
);

/**
 * Privacy Audit Log - Records all privacy-related events
 * Access to sensitive data, exports, policy changes, etc.
 */
export const privacyAuditLog = pgTable('privacy_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'data-export', 'privacy-policy-change', 'access-sensitive', etc.
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  ipAddress: text('ip_address'), // For security tracking
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  documents: many(documents),
  aiPreferences: one(userAiPreferences, {
    fields: [users.id],
    references: [userAiPreferences.userId],
  }),
  toolPermissions: many(toolPermissions),
  privacySettings: one(userPrivacySettings, {
    fields: [users.id],
    references: [userPrivacySettings.userId],
  }),
  deletionRecords: many(deletionRecords),
  privacyAuditLog: many(privacyAuditLog),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, {
    fields: [documents.ownerId],
    references: [users.id],
  }),
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  versions: many(documentVersions),
  syncMetadata: one(syncMetadata, {
    fields: [documents.id],
    references: [syncMetadata.documentId],
  }),
  pendingSyncs: many(pendingSyncQueue),
  conflicts: many(documentConflicts),
  versionSnapshots: many(documentVersionSnapshots),
  versionMetadata: many(documentVersionMetadata),
  deviceVersionHistory: many(deviceVersionHistory),
  syncActivityLogs: many(syncActivityLog),
  syncNotifications: many(syncNotifications),
  versionBranches: many(versionBranches),
  performanceMetrics: many(syncPerformanceMetrics),
}));

export const syncMetadataRelations = relations(syncMetadata, ({ one }) => ({
  document: one(documents, {
    fields: [syncMetadata.documentId],
    references: [documents.id],
  }),
}));

export const pendingSyncQueueRelations = relations(pendingSyncQueue, ({ one }) => ({
  document: one(documents, {
    fields: [pendingSyncQueue.documentId],
    references: [documents.id],
  }),
}));

export const documentConflictsRelations = relations(documentConflicts, ({ one }) => ({
  document: one(documents, {
    fields: [documentConflicts.documentId],
    references: [documents.id],
  }),
}));

// Phase 4 relations
export const documentVersionSnapshotsRelations = relations(documentVersionSnapshots, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersionSnapshots.documentId],
    references: [documents.id],
  }),
}));

export const documentVersionMetadataRelations = relations(documentVersionMetadata, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersionMetadata.documentId],
    references: [documents.id],
  }),
}));

export const deviceVersionHistoryRelations = relations(deviceVersionHistory, ({ one }) => ({
  document: one(documents, {
    fields: [deviceVersionHistory.documentId],
    references: [documents.id],
  }),
}));

// Phase 5 relations
export const syncActivityLogRelations = relations(syncActivityLog, ({ one }) => ({
  user: one(users, {
    fields: [syncActivityLog.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [syncActivityLog.documentId],
    references: [documents.id],
  }),
}));

export const syncNotificationsRelations = relations(syncNotifications, ({ one }) => ({
  user: one(users, {
    fields: [syncNotifications.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [syncNotifications.documentId],
    references: [documents.id],
  }),
}));

// Phase 6 relations
export const versionBranchesRelations = relations(versionBranches, ({ one }) => ({
  document: one(documents, {
    fields: [versionBranches.documentId],
    references: [documents.id],
  }),
}));

export const syncPerformanceMetricsRelations = relations(syncPerformanceMetrics, ({ one }) => ({
  document: one(documents, {
    fields: [syncPerformanceMetrics.documentId],
    references: [documents.id],
  }),
}));

export const userAiPreferencesRelations = relations(userAiPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userAiPreferences.userId],
    references: [users.id],
  }),
}));

export const toolPermissionsRelations = relations(toolPermissions, ({ one }) => ({
  user: one(users, {
    fields: [toolPermissions.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [toolPermissions.documentId],
    references: [documents.id],
  }),
}));

// Privacy Relations
export const aiTurnProvenanceRelations = relations(aiTurnProvenance, ({ one }) => ({
  aiSession: one(aiSessions, {
    fields: [aiTurnProvenance.aiSessionId],
    references: [aiSessions.id],
  }),
  policy: one(aiProviderPolicies, {
    fields: [aiTurnProvenance.policyId],
    references: [aiProviderPolicies.id],
  }),
  user: one(users, {
    fields: [aiTurnProvenance.userId],
    references: [users.id],
  }),
}));

export const userPrivacySettingsRelations = relations(userPrivacySettings, ({ one }) => ({
  user: one(users, {
    fields: [userPrivacySettings.userId],
    references: [users.id],
  }),
}));

export const deletionRecordsRelations = relations(deletionRecords, ({ one }) => ({
  user: one(users, {
    fields: [deletionRecords.userId],
    references: [users.id],
  }),
}));

export const privacyAuditLogRelations = relations(privacyAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [privacyAuditLog.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [privacyAuditLog.documentId],
    references: [documents.id],
  }),
}));


// ---------------------------------------------------------------------------
// Paragraph-level provenance and C2PA storage.
//
// Created by drizzle/0015 and 0016 and reconciled with the query layer by
// drizzle/0017; these definitions follow the post-0017 columns. They were never
// mirrored here before, so every `import { paragraph_provenances } from
// '@/lib/db/schema'` resolved to nothing and the schema drift stayed invisible.
// ---------------------------------------------------------------------------

export const paragraph_provenances = pgTable(
  'paragraph_provenances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    paragraphId: text('paragraph_id').notNull(),
    /** Copy/paste lineage; nullable, added by 0017. */
    parentParagraphId: text('parent_paragraph_id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    currentContentHash: text('current_content_hash').notNull(),
    /** Cached plaintext at the current hash; nullable per 0015. */
    currentContent: text('current_content'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('paragraph_provenances_document_paragraph').on(t.documentId, t.paragraphId)],
);

export const paragraph_provenance_events = pgTable('paragraph_provenance_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  paragraphProvenanceId: uuid('paragraph_provenance_id')
    .notNull()
    .references(() => paragraph_provenances.id, { onDelete: 'cascade' }),
  /** Stable paragraph identifier, denormalised from the parent by 0017. */
  paragraphId: text('paragraph_id').notNull(),
  eventType: text('event_type').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  contentHash: text('content_hash').notNull(),
  contentHashAfterEvent: text('content_hash_after_event'),
  previousHash: text('previous_hash'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  description: text('description'),
  contentHashAlgorithm: text('content_hash_algorithm').default('sha256').notNull(),
  source: text('source').notNull(),
  /** 0-1 for AI-generated content. */
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  device: text('device').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  aiSessionId: uuid('ai_session_id').references(() => aiSessions.id),
  aiTurnId: text('ai_turn_id'),
  selectionScope: text('selection_scope'),
  originFromParagraphId: text('origin_from_paragraph_id'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const c2pa_manifests = pgTable('c2pa_manifests', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  format: text('format').notNull(),
  documentVersion: bigint('document_version', { mode: 'number' }).notNull(),
  manifestJson: jsonb('manifest_json').notNull(),
  contentHash: text('content_hash').notNull(),
  contentHashAlgorithm: text('content_hash_algorithm').default('sha256').notNull(),
  status: text('status').default('unsigned').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  signedByKeyId: text('signed_by_key_id'),
  signature: text('signature'),
  /** Renamed from created_by_user_id by 0017. */
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  errorMessage: text('error_message'),
  failedAt: timestamp('failed_at', { withTimezone: true }),
});

export const document_versions_with_provenance = pgTable('document_versions_with_provenance', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  documentVersion: bigint('document_version', { mode: 'number' }).notNull(),
  content: jsonb('content').notNull(),
  /** Array of ParagraphProvenance objects, per 0016. */
  paragraphProvenances: jsonb('paragraph_provenances').notNull(),
  contentHash: text('content_hash').notNull(),
  contentHashAlgorithm: text('content_hash_algorithm').default('sha256').notNull(),
  createdByDevice: text('created_by_device').notNull(),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const export_history = pgTable('export_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  /** Renamed from format by 0017. */
  exportFormat: text('export_format').notNull(),
  documentVersion: bigint('document_version', { mode: 'number' }).notNull(),
  includedParagraphs: integer('included_paragraphs').notNull(),
  includedAiTurns: integer('included_ai_turns').notNull(),
  hasC2paManifest: boolean('has_c2pa_manifest').default(false).notNull(),
  c2paManifestId: uuid('c2pa_manifest_id').references(() => c2pa_manifests.id),
  isSigned: boolean('is_signed').default(false).notNull(),
  filename: text('filename'),
  fileSizeBytes: integer('file_size_bytes'),
  /** Renamed from exported_by_user_id by 0017. */
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  exportedAt: timestamp('exported_at', { withTimezone: true }).defaultNow().notNull(),
});

export const searchVector = sql`to_tsvector('simple', coalesce(${documents.title}, ''))`;
